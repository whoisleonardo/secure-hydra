import { registerEvent } from "../register-event";
import { GameShop } from "@types";
import { launchGameInVM } from "@main/helpers";

const openGameInVM = async (
  _event: Electron.IpcMainInvokeEvent,
  shop: GameShop,
  objectId: string,
  executablePath: string,
  launchOptions?: string | null
) => {
  await launchGameInVM({ shop, objectId, executablePath, launchOptions });
};

registerEvent("openGameInVM", openGameInVM);
