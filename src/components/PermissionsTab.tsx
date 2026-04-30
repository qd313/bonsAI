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
  /** Opens README model policy (same gating as About external links). */
  onReadModelPolicy?: () => void;
  modelPolicyTier: ModelPolicyTierId;
  onSelectModelPolicyTier: (t: ModelPolicyTierId) => void;
  setModelPolicyNonFossUnlocked: (v: boolean) => void;
  modelPolicyNonFossUnlocked: boolean;
  setModelAllowHighVramFallbacks: (v: boolean) => void;
  modelAllowHighVramFallbacks: boolean;
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
    title: "Filesystem writes",
    description:
      "Saving debug notes to Desktop/BonsAI_notes and similar exports. Off blocks those writes.",
  },
  {
    key: "hardware_control",
    title: "Hardware control",
    description:
      "Applying TDP and GPU clock suggestions from AI output (sysfs / privileged helpers). Off keeps responses read-only.",
  },
  {
    key: "media_library_access",
    title: "Media library access",
    description:
      "Listing and attaching Steam screenshots for vision prompts. Off blocks screenshot browse and attach.",
  },
  {
    key: "steam_logs_read",
    title: "Steam / Proton log read",
    description:
      "Reading bounded local Proton and Steam log excerpts for troubleshooting-style Asks when enabled in Settings. Off blocks log attachment.",
  },
  {
    key: "steam_web_api",
    title: "Steam Web API",
    description:
      "Outbound requests to Valve’s Steam Web API (e.g. bonsai:vac-check / GetPlayerBans). Your API key is stored in plugin settings. Off blocks those calls.",
  },
  {
    key: "external_navigation",
    title: "External and Steam navigation",
    description:
      "Opening GitHub/Ollama links in the browser and Steam Input deep links from Debug. Off blocks those actions.",
  },
];
const HARDWARE_DISCLAIMER_BODY =
  "We have put guardrails in place to reduce obviously unsafe TDP and GPU clock settings for Steam Deck, " +
  "but this feature is still very beta. Models can be wrong, and the plugin can apply power changes " +
  "from AI text when you enable this. Use at your own risk!\n\n" +
  "We are not responsible if you follow an AI suggestion and something goes wrong, including if you " +
  "damage or stress your hardware or lose data. Only turn this on if you accept that.";

/**
 * Central place for capability toggles. Uses Decky `ToggleField` for Steam QAM-style switches.
 * Defaults for new installs are off; legacy settings without this block are grandfathered on the backend until saved here.
 * Enabling **Hardware control** always shows a confirmation modal (every time) before the toggle turns on.
 */
export const PermissionsTab: React.FC<Props> = ({
  capabilities,
  setCapabilities,
  onConfirmEnableHardwareControl,
  onReadModelPolicy,
  modelPolicyTier,
  onSelectModelPolicyTier,
  setModelPolicyNonFossUnlocked,
  modelPolicyNonFossUnlocked,
  setModelAllowHighVramFallbacks,
  modelAllowHighVramFallbacks,
  onBeforeDeckyModal,
  onCompleteDeckyModalClose,
}) => (
  <>
  <PanelSection title="Permissions">
    <PanelSectionRow>
      <div className="bonsai-settings-bleed" style={{ fontSize: 12, color: "#9fb7d5", lineHeight: 1.45, marginBottom: 4 }}>
        High-impact actions stay off until you enable them here. Ollama requests on your LAN are not gated by
        these toggles. Which Ollama tag families the plugin may try is set under <strong>Model policy</strong> at
        the bottom of this tab.
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
                      strOKButtonText="I understand! Let 'er rip!"
                      strCancelButtonText="Cancel"
                      bAlertDialog
                      onOK={() => {
                        onConfirmEnableHardwareControl();
                        onCompleteDeckyModalClose(() => handle.Close());
                      }}
                      onCancel={() => {
                        onCompleteDeckyModalClose(() => handle.Close());
                      }}
                    />
                  );
                  return;
                }
                setCapabilities((prev) => ({ ...prev, hardware_control: false }));
              }}
            />
          </div>
        ) : (
          <div className="bonsai-settings-bleed" style={{ width: "100%" }}>
            <ToggleField
              label={row.title}
              description={row.description}
              checked={capabilities[row.key]}
              onChange={(checked) =>
                setCapabilities((prev) => ({ ...prev, [row.key]: checked }))
              }
            />
          </div>
        )}
      </PanelSectionRow>
    ))}
  </PanelSection>
  <PermissionsTabModelPolicyPanel
    modelPolicyTier={modelPolicyTier}
    modelPolicyNonFossUnlocked={modelPolicyNonFossUnlocked}
    modelAllowHighVramFallbacks={modelAllowHighVramFallbacks}
    onSelectModelPolicyTier={onSelectModelPolicyTier}
    setModelPolicyNonFossUnlocked={setModelPolicyNonFossUnlocked}
    setModelAllowHighVramFallbacks={setModelAllowHighVramFallbacks}
    onReadModelPolicy={onReadModelPolicy ?? (() => {})}
    onBeforeDeckyModal={onBeforeDeckyModal}
    onCompleteDeckyModalClose={onCompleteDeckyModalClose}
  />
  </>
);
