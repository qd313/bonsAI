import React from "react";
import { PanelSection, PanelSectionRow, ToggleField } from "@decky/ui";
import type { BonsaiCapabilities } from "../utils/settingsAndResponse";

type Props = {
  capabilities: BonsaiCapabilities;
  setCapabilities: React.Dispatch<React.SetStateAction<BonsaiCapabilities>>;
  /** Opens README model policy (same gating as About external links). */
  onReadModelPolicy?: () => void;
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
    key: "external_navigation",
    title: "External and Steam navigation",
    description:
      "Opening GitHub/Ollama links in the browser and Steam Input deep links from Debug. Off blocks those actions.",
  },
];

/**
 * Central place for capability toggles. Uses Decky `ToggleField` for Steam QAM-style switches.
 * Defaults for new installs are off; legacy settings without this block are grandfathered on the backend until saved here.
 */
export const PermissionsTab: React.FC<Props> = ({ capabilities, setCapabilities, onReadModelPolicy }) => (
  <PanelSection title="Permissions">
    <PanelSectionRow>
      <div style={{ fontSize: 12, color: "#9fb7d5", lineHeight: 1.45, marginBottom: 4 }}>
        High-impact actions stay off until you enable them here. Ollama requests on your LAN are not gated by
        these toggles. Which Ollama model names the plugin may try is controlled separately under Settings → Model
        policy.
        {onReadModelPolicy ? (
          <>
            {" "}
            <button
              type="button"
              onClick={onReadModelPolicy}
              style={{
                color: "#7dd3fc",
                textDecoration: "underline",
                cursor: "pointer",
                background: "none",
                border: "none",
                padding: 0,
                font: "inherit",
              }}
            >
              Read model policy
            </button>
          </>
        ) : null}
      </div>
    </PanelSectionRow>
    {ROWS.map((row) => (
      <PanelSectionRow key={row.key}>
        <ToggleField
          label={row.title}
          description={row.description}
          checked={capabilities[row.key]}
          onChange={(checked) =>
            setCapabilities((prev) => ({ ...prev, [row.key]: checked }))
          }
        />
      </PanelSectionRow>
    ))}
  </PanelSection>
);
