import { spawn, exec } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { logger } from "./logger";

const execAsync = promisify(exec);

export type VMBackend = "windows-sandbox" | "virtualbox" | "none";

const VIRTUALBOX_VM_NAME = "HydraGameSandbox";
const SANDBOX_GUEST_SHARE = "C:\\GameShare";

let cachedBackend: VMBackend | null = null;

const getWindowsSandboxPath = (): string => {
  const systemRoot = process.env.SystemRoot ?? "C:\\Windows";
  return path.join(systemRoot, "System32", "WindowsSandbox.exe");
};

const isWindowsSandboxAvailable = (): boolean => {
  if (process.platform !== "win32") return false;
  try {
    return fs.existsSync(getWindowsSandboxPath());
  } catch {
    return false;
  }
};

const isVirtualBoxAvailable = async (): Promise<boolean> => {
  try {
    await execAsync("VBoxManage --version");
    return true;
  } catch {
    return false;
  }
};

/**
 * Detects the available VM backend. Priority: Windows Sandbox > VirtualBox > none.
 * The result is cached after the first call. Pass `forceRefresh` to re-detect
 * (e.g. while polling after enabling Windows Sandbox).
 */
export const detectVMBackend = async (
  forceRefresh = false
): Promise<VMBackend> => {
  if (!forceRefresh && cachedBackend !== null) return cachedBackend;

  if (isWindowsSandboxAvailable()) {
    cachedBackend = "windows-sandbox";
  } else if (await isVirtualBoxAvailable()) {
    cachedBackend = "virtualbox";
  } else {
    cachedBackend = "none";
  }

  logger.info("Detected VM backend", { backend: cachedBackend });

  return cachedBackend;
};

/**
 * Clears the cached VM backend so the next detection runs fresh.
 */
export const clearVMBackendCache = (): void => {
  cachedBackend = null;
};

/**
 * Returns a user-facing label for the detected VM backend.
 */
export const getVMBackendLabel = async (
  forceRefresh = false
): Promise<string> => {
  const backend = await detectVMBackend(forceRefresh);

  switch (backend) {
    case "windows-sandbox":
      return "Windows Sandbox";
    case "virtualbox":
      return "VirtualBox";
    default:
      return "Nenhuma VM disponível";
  }
};

export interface LaunchGameInVMOptions {
  executablePath: string;
  launchOptions?: string | null;
}

const escapeXml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

/**
 * Given an executable path, returns the game root folder to share and the
 * path of the exe relative to that root. Falls back to the exe's own folder.
 */
const resolveShareRootAndRelativeExe = (
  executablePath: string
): { shareRoot: string; relativeExe: string } => {
  const exeDir = path.dirname(executablePath);
  // Heuristic: if the exe sits in a common nested bin folder, share the parent.
  const lowerDir = exeDir.toLowerCase();
  const nestedMarkers = ["\\bin", "\\binaries", "\\win64", "\\win32", "\\x64"];
  const marker = nestedMarkers.find((m) => lowerDir.endsWith(m));
  const shareRoot = marker ? path.dirname(exeDir) : exeDir;
  const relativeExe = path.relative(shareRoot, executablePath);
  return { shareRoot, relativeExe };
};

const launchInWindowsSandbox = async (
  options: LaunchGameInVMOptions
): Promise<void> => {
  const { executablePath, launchOptions } = options;

  const { shareRoot, relativeExe } =
    resolveShareRootAndRelativeExe(executablePath);

  const guestExecutablePath = `${SANDBOX_GUEST_SHARE}\\${relativeExe}`;
  const command = launchOptions
    ? `${guestExecutablePath} ${launchOptions}`
    : guestExecutablePath;

  const wsbConfig = `<Configuration>
  <VGpu>Enable</VGpu>
  <Networking>Disable</Networking>
  <MappedFolders>
    <MappedFolder>
      <HostFolder>${escapeXml(shareRoot)}</HostFolder>
      <SandboxFolder>${SANDBOX_GUEST_SHARE}</SandboxFolder>
      <ReadOnly>true</ReadOnly>
    </MappedFolder>
  </MappedFolders>
  <LogonCommand>
    <Command>${escapeXml(command)}</Command>
  </LogonCommand>
</Configuration>`;

  const wsbPath = path.join(os.tmpdir(), `hydra-game-${Date.now()}.wsb`);
  fs.writeFileSync(wsbPath, wsbConfig, "utf-8");

  const processRef = spawn(getWindowsSandboxPath(), [wsbPath], {
    detached: true,
    stdio: "ignore",
  });

  processRef.on("error", (error) => {
    logger.error("Failed to launch game in Windows Sandbox", error);
  });

  processRef.unref();

  setTimeout(() => {
    try {
      fs.unlinkSync(wsbPath);
    } catch (error) {
      logger.warn("Failed to delete Windows Sandbox config file", {
        wsbPath,
        error,
      });
    }
  }, 5000);
};

const getVBoxState = async (vmName: string): Promise<string | null> => {
  try {
    const { stdout } = await execAsync(
      `VBoxManage showvminfo "${vmName}" --machinereadable`
    );

    const match = stdout.match(/VMState="([^"]+)"/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

const launchInVirtualBox = async (
  options: LaunchGameInVMOptions
): Promise<void> => {
  const { executablePath, launchOptions } = options;
  const vmName = VIRTUALBOX_VM_NAME;

  const exists = (await getVBoxState(vmName)) !== null;
  if (!exists) {
    throw new Error(
      `A máquina virtual "${vmName}" não foi encontrada no VirtualBox. ` +
        `Crie uma VM com esse nome para jogar de forma isolada.`
    );
  }

  let state = await getVBoxState(vmName);

  if (state !== "running") {
    await execAsync(`VBoxManage startvm "${vmName}" --type headless`);

    const timeoutMs = 60000;
    const startedAt = Date.now();

    while (state !== "running") {
      if (Date.now() - startedAt > timeoutMs) {
        throw new Error(
          `Tempo esgotado ao iniciar a máquina virtual "${vmName}".`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
      state = await getVBoxState(vmName);
    }
  }

  const { shareRoot, relativeExe } =
    resolveShareRootAndRelativeExe(executablePath);
  const executableName = path.basename(executablePath);
  const shareName = "GameShare";

  try {
    await execAsync(
      `VBoxManage sharedfolder add "${vmName}" --name "${shareName}" ` +
        `--hostpath "${shareRoot}" --readonly --transient`
    );
  } catch (error) {
    logger.warn("Failed to add VirtualBox shared folder", { error });
  }

  const guestUser = process.env.VBOX_GUEST_USER ?? "hydra";
  const guestPass = process.env.VBOX_GUEST_PASS ?? "hydra";

  const guestExecutablePath = `\\\\vboxsvr\\${shareName}\\${relativeExe.replace(
    /\//g,
    "\\"
  )}`;

  const args = [
    "guestcontrol",
    `"${vmName}"`,
    "run",
    `--username "${guestUser}"`,
    `--password "${guestPass}"`,
    `--exe "${guestExecutablePath}"`,
  ];

  if (launchOptions) {
    args.push(`-- "${executableName}" ${launchOptions}`);
  }

  await execAsync(`VBoxManage ${args.join(" ")}`);
};

/**
 * Launches the given game executable inside an isolated VM using the detected
 * backend. Throws a descriptive error when no backend is available.
 */
export const launchGameInVM = async (
  options: LaunchGameInVMOptions
): Promise<void> => {
  const backend = await detectVMBackend();

  logger.info("Launching game in VM", {
    backend,
    executablePath: options.executablePath,
  });

  switch (backend) {
    case "windows-sandbox":
      return launchInWindowsSandbox(options);
    case "virtualbox":
      return launchInVirtualBox(options);
    default:
      throw new Error(
        "Nenhum ambiente de VM disponível. Ative o Windows Sandbox " +
          "(Ativar/Desativar recursos do Windows > Windows Sandbox) ou " +
          "instale o VirtualBox (https://www.virtualbox.org/wiki/Downloads) " +
          "para jogar de forma isolada."
      );
  }
};
