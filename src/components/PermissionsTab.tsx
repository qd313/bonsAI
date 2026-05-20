import React from "react";
import { PanelSection, PanelSectionRow, ToggleField, showModal, ConfirmModal } from "@decky/ui";
import type { BonsaiCapabilities } from "../utils/settingsAndResponse";
import { PermissionsTabModelPolicyPanel } from "./PermissionsTabModelPolicyPanel";
import type { ModelPolicyTierId } from "../data/modelPolicy";

type Props = {
  capabilities: BonsaiCapabilities;
  setCapabilities: React.Dispatch<React.SetStateAction<BonsaiCapabilities>>;
  /** Turn hardware control on, persist to disk immediately (Decky can remount the panel when the modal closes). */
  onConfirmEnableHardwareControl: () => void;
  modelPolicyTier: ModelPolicyTierId;
  onCommitModelPolicyTier: (t: ModelPolicyTierId) => void | Promise<void>;
  modelPolicyNonFossUnlocked: boolean;
  /** Call before any `showModal` from this tab so the active tab restores after close. */
  onBeforeDeckyModal: () => void;
  /** After modal dismiss; pass `() => handle.Close()`. */
  onCompleteDeckyModalClose: (close: () => void) => void;
};

const ROWS: {
  key: keyof BonsaiCapabilities;
  title: string;
  description: string;
}[] = [
  {
    key: "filesystem_write",
    title: "Save files to Desktop",
    description: "Notes, logs, and exports under Desktop/bonsAI_logs. Off blocks those writes.",
  },
  {
    key: "hardware_control",
    title: "Adjust power limits (beta)",
    description: "AI may suggest TDP and GPU clock changes. Off keeps responses read-only.",
  },
  {
    key: "steam_web_api",
    title: "Steam ban lookup",
    description: "For the bonsai:vac-check command. API key lives in Developer → Integrations.",
  },
  {
    key: "external_navigation",
    title: "Open web links",
    description: "GitHub, docs, and Steam settings links from the plugin.",
  },
];

const HARDWARE_DISCLAIMER_BODY =
  "We have put guardrails in place to reduce obviously unsafe TDP and GPU clock settings for Steam Deck, " +
  "but this feature is still very beta. Models can be wrong, and the plugin can apply power changes " +
  "from AI text when you enable this. Use at your own risk!\n\n" +
  "We are not responsible if you follow an AI suggestion and something goes wrong, including if you " +
  "damage or stress your hardware or lose data. Only turn this on if you accept that.";

function gameContextReadEnabled(caps: BonsaiCapabilities): boolean {
  return caps.media_library_access && caps.steam_logs_read;
}

/**
 * Central place for capability toggles. Uses Decky `ToggleField` for Steam QAM-style switches.
 * Defaults for new installs are off; legacy settings without this block are grandfathered on the backend until saved here.
 * Enabling **Hardware control** always shows a confirmation modal (every time) before the toggle turns on.
 */
export const PermissionsTab: React.FC<Props> = ({
  capabilities,
  setCapabilities,
  onConfirmEnableHardwareControl,
  modelPolicyTier,
  onCommitModelPolicyTier,
  modelPolicyNonFossUnlocked,
  onBeforeDeckyModal,
  onCompleteDeckyModalClose,
}) => (
  <>
  <PanelSection title="Permissions">
    <PanelSectionRow>
      <div className="bonsai-settings-bleed" style={{ fontSize: 12, color: "#9fb7d5", lineHeight: 1.45, marginBottom: 4 }}>
        High-impact actions stay off until you enable them here. AI requests on your home network are not
        gated by these toggles. Which models the plugin may try is set under <strong>AI model choice</strong> below.
      </div>
    </PanelSectionRow>
    <PanelSectionRow>
      <div className="bonsai-settings-bleed" style={{ width: "100%" }}>
        <ToggleField
          label="Read game & screenshot context"
          description="Lets bonsAI attach Steam screenshots and read local game/Proton logs for troubleshooting. One permission for both."
          checked={gameContextReadEnabled(capabilities)}
          onChange={(checked) => {
            setCapabilities((prev) => ({
              ...prev,
              media_library_access: checked,
              steam_logs_read: checked,
            }));
          }}
        />
      </div>
    </PanelSectionRow>
    {ROWS.map((row) => (
      <PanelSectionRow key={row.key}>
        {row.key === "hardware_control" ? (
          <div className="bonsai-settings-bleed" style={{ width: "100%" }}>
            <ToggleField
              label={row.title}
              description={row.description}
              checked={capabilities.hardware_control}
              onChange={(checked) => {
                if (checked) {
                  onBeforeDeckyModal();
                  const handle = showModal(
                    <ConfirmModal
                      strTitle="Hardware control — beta risk"
                      strDescription={
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 10,
                            textAlign: "left",
                            maxWidth: "100%",
                            maxHeight: "min(70vh, 420px)",
                            overflowY: "auto",
                          }}
                        >
                          <div
                            className="bonsai-permissions-hardware-disclaimer"
                            style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.4, color: "#dce8f4" }}
                          >
                            {HARDWARE_DISCLAIMER_BODY}
                          </div>
                        </div>
                      }
                      strOKButtonText="I understand — enable"
                      strCancelButtonText="Cancel"
                      onOK={() => {
                        onConfirmEnableHardwareControl();
                        onCompleteDeckyModalClose(() => handle.Close());
                      }}
                      onCancel={() => onCompleteDeckyModalClose(() => handle.Close())}
                    />
                  );
                } else {
                  setCapabilities((prev) => ({ ...prev, hardware_control: false }));
                }
              }}
            />
          </div>
        ) : (
          <div className="bonsai-settings-bleed" style={{ width: "100%" }}>
            <ToggleField
              label={row.title}
              description={row.description}
              checked={capabilities[row.key]}
              onChange={(checked) => setCapabilities((prev) => ({ ...prev, [row.key]: checked }))}
            />
          </div>
        )}
      </PanelSectionRow>
    ))}
  </PanelSection>
  <PermissionsTabModelPolicyPanel
    modelPolicyTier={modelPolicyTier}
    onCommitModelPolicyTier={onCommitModelPolicyTier}
    modelPolicyNonFossUnlocked={modelPolicyNonFossUnlocked}
    onBeforeDeckyModal={onBeforeDeckyModal}
    onCompleteDeckyModalClose={onCompleteDeckyModalClose}
  />
  </>
);
