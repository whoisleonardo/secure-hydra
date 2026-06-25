import { registerEvent } from "../register-event";
import type { UserPreferences } from "@types";
import { db, levelKeys } from "@main/level";

interface CompleteVMSetupOptions {
  skipVM?: boolean;
  vmName?: string;
}

const completeVMSetup = async (
  _event: Electron.IpcMainInvokeEvent,
  options?: CompleteVMSetupOptions
): Promise<void> => {
  const userPreferences = await db
    .get<string, UserPreferences | null>(levelKeys.userPreferences, {
      valueEncoding: "json",
    })
    .catch(() => null);

  const updatedPreferences: UserPreferences = {
    ...userPreferences,
    vmSetupComplete: true,
    skipVM: options?.skipVM ?? userPreferences?.skipVM,
    vmName: options?.vmName ?? userPreferences?.vmName,
  };

  await db.put<string, UserPreferences>(
    levelKeys.userPreferences,
    updatedPreferences,
    {
      valueEncoding: "json",
    }
  );
};

registerEvent("completeVMSetup", completeVMSetup);
