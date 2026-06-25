import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertIcon,
  CheckCircleIcon,
  DownloadIcon,
  ShieldIcon,
} from "@primer/octicons-react";

import { Button, TextField } from "@renderer/components";
import { ClassicsSpinner } from "@renderer/components/classics-spinner/classics-spinner";

import "./vm-onboarding.scss";

type OnboardingStep = "detect" | "sandbox" | "virtualbox" | "none" | "complete";

const SANDBOX_LABEL = "Windows Sandbox";
const VIRTUALBOX_LABEL = "VirtualBox";
const DEFAULT_VM_NAME = "HydraGameSandbox";
const VIRTUALBOX_DOWNLOAD_URL = "https://www.virtualbox.org/wiki/Downloads";

export default function VMOnboarding() {
  const { t } = useTranslation("game_details");
  const navigate = useNavigate();

  const [step, setStep] = useState<OnboardingStep>("detect");
  const [vmName, setVmName] = useState(DEFAULT_VM_NAME);
  const [isEnablingSandbox, setIsEnablingSandbox] = useState(false);
  const [sandboxError, setSandboxError] = useState<string | null>(null);

  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stepFromBackend = useCallback((label: string): OnboardingStep => {
    if (label === SANDBOX_LABEL) return "sandbox";
    if (label === VIRTUALBOX_LABEL) return "virtualbox";
    return "none";
  }, []);

  const detectBackend = useCallback(async () => {
    const label = await window.electron.getVMBackend();
    setStep(stepFromBackend(label));
  }, [stepFromBackend]);

  useEffect(() => {
    detectBackend();

    return () => {
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    };
  }, [detectBackend]);

  const completeSetup = async (options?: {
    skipVM?: boolean;
    vmName?: string;
  }) => {
    await window.electron.completeVMSetup(options);
    setStep("complete");
  };

  const handleEnableSandbox = async () => {
    setSandboxError(null);
    setIsEnablingSandbox(true);

    const result = await window.electron.enableWindowsSandbox();

    if (!result.success) {
      setIsEnablingSandbox(false);
      setSandboxError(result.error ?? t("vm_skip_warning"));
      return;
    }

    const startedAt = Date.now();

    const poll = async () => {
      const label = await window.electron.getVMBackend(true);

      if (label === SANDBOX_LABEL) {
        setIsEnablingSandbox(false);
        setStep("sandbox");
        return;
      }

      if (Date.now() - startedAt > 30000) {
        setIsEnablingSandbox(false);
        setSandboxError(t("vm_skip_warning"));
        return;
      }

      pollTimeoutRef.current = setTimeout(poll, 3000);
    };

    pollTimeoutRef.current = setTimeout(poll, 3000);
  };

  const renderDetect = () => (
    <div className="vm-onboarding__step">
      <ClassicsSpinner size={48} />
      <h1 className="vm-onboarding__title">{t("vm_setup_title")}</h1>
    </div>
  );

  const renderSandbox = () => (
    <div className="vm-onboarding__step">
      <CheckCircleIcon size={48} className="vm-onboarding__icon--success" />
      <h1 className="vm-onboarding__title">
        Windows Sandbox detectado! Nenhuma instalação necessária.
      </h1>
      <Button theme="primary" onClick={() => completeSetup()}>
        Concluir configuração
      </Button>
    </div>
  );

  const renderVirtualBox = () => (
    <div className="vm-onboarding__step">
      <CheckCircleIcon size={48} className="vm-onboarding__icon--success" />
      <h1 className="vm-onboarding__title">VirtualBox detectado!</h1>
      <TextField
        label="Nome da VM"
        value={vmName}
        onChange={(event) => setVmName(event.target.value)}
      />
      <p className="vm-onboarding__hint">
        Certifique-se de que a VM está criada com esse nome no VirtualBox
      </p>
      <Button theme="primary" onClick={() => completeSetup({ vmName })}>
        Concluir configuração
      </Button>
    </div>
  );

  const renderNone = () => (
    <div className="vm-onboarding__step">
      <AlertIcon size={48} className="vm-onboarding__icon--warning" />
      <h1 className="vm-onboarding__title">
        Nenhuma VM encontrada. Escolha uma opção:
      </h1>

      {sandboxError && <p className="vm-onboarding__error">{sandboxError}</p>}

      <div className="vm-onboarding__options">
        <Button
          theme="primary"
          disabled={isEnablingSandbox}
          onClick={handleEnableSandbox}
        >
          {isEnablingSandbox ? (
            <ClassicsSpinner size={16} />
          ) : (
            <ShieldIcon size={16} />
          )}
          Ativar Windows Sandbox
        </Button>

        <Button
          theme="outline"
          onClick={() => window.electron.openExternal(VIRTUALBOX_DOWNLOAD_URL)}
        >
          <DownloadIcon size={16} />
          Baixar VirtualBox
        </Button>

        <Button theme="dark" onClick={() => completeSetup({ skipVM: true })}>
          Pular (não recomendado)
        </Button>
      </div>
    </div>
  );

  const renderComplete = () => (
    <div className="vm-onboarding__step">
      <CheckCircleIcon size={48} className="vm-onboarding__icon--success" />
      <h1 className="vm-onboarding__title">{t("vm_setup_complete")}</h1>
      <Button theme="primary" onClick={() => navigate("/")}>
        Começar
      </Button>
    </div>
  );

  const renderStep = () => {
    switch (step) {
      case "sandbox":
        return renderSandbox();
      case "virtualbox":
        return renderVirtualBox();
      case "none":
        return renderNone();
      case "complete":
        return renderComplete();
      default:
        return renderDetect();
    }
  };

  return <div className="vm-onboarding">{renderStep()}</div>;
}
