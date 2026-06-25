import { registerEvent } from "../register-event";
import { GameShop } from "@types";
import { launchGame, launchGameInVM } from "@main/helpers";

const openGame = async (
  _event: Electron.IpcMainInvokeEvent,
  shop: GameShop,
  objectId: string,
  executablePath: string,
  launchOptions?: string | null,
  launchTarget: "host" | "vm" = "host"
) => {
  if (launchTarget === "vm") {
    await launchGameInVM({ shop, objectId, executablePath, launchOptions });
    return;
  }

  await launchGame({ shop, objectId, executablePath, launchOptions });
};

registerEvent("openGame", openGame);
