import { exec } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { registerEvent } from "../register-event";
import { logger } from "@main/services";

const execAsync = promisify(exec);

interface EnableWindowsSandboxResult {
  success: boolean;
  requiresRestart: boolean;
  error?: string;
}

const enableWindowsSandbox = async (
  _event: Electron.IpcMainInvokeEvent
): Promise<EnableWindowsSandboxResult> => {
  if (process.platform !== "win32") {
    return {
      success: false,
      requiresRestart: false,
      error: "Windows Sandbox só está disponível no Windows.",
    };
  }

  const resultFile = path.join(
    os.tmpdir(),
    `sandbox-enable-${Date.now()}.json`
  );

  // The elevated child runs the feature enable, captures RestartNeeded,
  // and writes a JSON result the parent can read after -Wait returns.
  const innerScript = [
    `$ErrorActionPreference = 'Stop'`,
    `try {`,
    `  $r = Enable-WindowsOptionalFeature -Online -FeatureName Containers-DisposableClientVM -All -NoRestart`,
    `  $out = @{ success = $true; requiresRestart = [bool]$r.RestartNeeded } | ConvertTo-Json`,
    `} catch {`,
    `  $out = @{ success = $false; requiresRestart = $false; error = $_.Exception.Message } | ConvertTo-Json`,
    `}`,
    `Set-Content -Path '${resultFile.replace(/\\/g, "\\\\")}' -Value $out -Encoding UTF8`,
  ].join("; ");

  // Base64-encode the inner script to avoid quote-escaping hell across the
  // Start-Process boundary.
  const encoded = Buffer.from(innerScript, "utf16le").toString("base64");

  const outerCommand =
    `Start-Process powershell -Verb RunAs -Wait -WindowStyle Hidden ` +
    `-ArgumentList '-NoProfile','-EncodedCommand','${encoded}'`;

  try {
    await execAsync(outerCommand, { shell: "powershell.exe" });

    if (!fs.existsSync(resultFile)) {
      // The elevated process didn't produce a result — most likely the
      // UAC prompt was declined.
      return {
        success: false,
        requiresRestart: false,
        error: "A elevação foi cancelada ou falhou.",
      };
    }

    const raw = fs.readFileSync(resultFile, "utf-8");
    try {
      fs.unlinkSync(resultFile);
    } catch {
      /* ignore */
    }

    const parsed = JSON.parse(raw) as EnableWindowsSandboxResult;
    return {
      success: parsed.success === true,
      requiresRestart: parsed.requiresRestart === true,
      error: parsed.error,
    };
  } catch (error) {
    logger.error("Failed to enable Windows Sandbox", error);
    try {
      fs.unlinkSync(resultFile);
    } catch {
      /* ignore */
    }
    return {
      success: false,
      requiresRestart: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

registerEvent("enableWindowsSandbox", enableWindowsSandbox);
