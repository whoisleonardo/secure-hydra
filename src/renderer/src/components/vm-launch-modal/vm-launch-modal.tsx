import { AlertIcon, ShieldIcon, ZapIcon } from "@primer/octicons-react";
import { useTranslation } from "react-i18next";
import cn from "classnames";

import { Button } from "../button/button";
import { Modal } from "../modal/modal";

import "./vm-launch-modal.scss";

export interface VMLaunchModalProps {
  visible: boolean;
  onClose: () => void;
  onLaunchInVM: () => void;
  onLaunchOnHost: () => void;
  isHeavyGame: boolean;
  gameName: string;
}

export function VMLaunchModal({
  visible,
  onClose,
  onLaunchInVM,
  onLaunchOnHost,
  isHeavyGame,
  gameName,
}: Readonly<VMLaunchModalProps>) {
  const { t } = useTranslation("game_details");

  return (
    <Modal
      visible={visible}
      title={t("vm_modal_title")}
      description={gameName || undefined}
      onClose={onClose}
    >
      <div className="vm-launch-modal">
        {isHeavyGame && (
          <div className="vm-launch-modal__warning">
            <AlertIcon size={20} className="vm-launch-modal__warning-icon" />
            <span>{t("vm_heavy_game_warning")}</span>
          </div>
        )}

        <div className="vm-launch-modal__options">
          <Button
            theme="outline"
            className="vm-launch-modal__option"
            onClick={onLaunchInVM}
          >
            <ShieldIcon size={24} />
            <span className="vm-launch-modal__option-label">
              {t("play_in_vm")}
            </span>
            <span className="vm-launch-modal__option-description">
              Isolado, mais seguro
            </span>
          </Button>

          <Button
            theme={isHeavyGame ? "primary" : "outline"}
            className={cn("vm-launch-modal__option", {
              "vm-launch-modal__option--recommended": isHeavyGame,
            })}
            onClick={onLaunchOnHost}
          >
            <ZapIcon size={24} />
            <span className="vm-launch-modal__option-label">
              {t("play_on_host")}
            </span>
            <span className="vm-launch-modal__option-description">
              Performance máxima
            </span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
