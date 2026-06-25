import { registerEvent } from "../register-event";
import { getVMBackendLabel } from "@main/services";

const getVMBackend = async (
  _event: Electron.IpcMainInvokeEvent,
  forceRefresh = false
): Promise<string> => {
  return getVMBackendLabel(forceRefresh);
};

registerEvent("getVMBackend", getVMBackend);
