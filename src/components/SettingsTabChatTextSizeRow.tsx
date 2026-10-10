/**
 * Title: Settings tab -- Text size row
 *
 * Purpose: The "Text size" choice in Settings: Small, Normal or Large, drawn as three buttons side
 * by side, the same shape as Screenshot quality and Voice replies. It sets how big the words in the
 * chat are (the questions, the answers and the Show details text); the tab bar, the chat's name,
 * the chips and Settings themselves never change with it.
 *
 * Used for: SettingsTab, right under Screenshot quality.
 *
 * Solves: Plan 87 call 3. A person who finds the chat's words too small (or too big) on the Deck's
 * panel gets one plain row to fix it, with no connection to the hidden UI scale section.
 *
 * Does not: Scale anything. The size is written to `--bonsai-chat-text-scale` on the plugin's root
 * (src/data/chatTextSize.ts) and the chat's own styles read it.
 *
 * Focus: one `Focusable` with `flow-children="horizontal"` holding three buttons; no move handler of
 * its own, so Steam's own Left/Right walk the three and its Up/Down leave to the rows above and below
 * (see docs/focus-graph.md, "The Text size row").
 */
import React from "react";
import { Button, Focusable, PanelSection, PanelSectionRow } from "@decky/ui";

import { CHAT_TEXT_SIZE_OPTIONS, type ChatTextSize } from "../data/bonsaiSettingsSchema";
import { FOCUS_RING_BTN_CLASS } from "../styles/settingsGlassButton";

const chatTextSizeLabel: Record<ChatTextSize, string> = {
  small: "Small",
  normal: "Normal",
  large: "Large",
};

/**
 * The saved choice and the way to change it, handed down as ONE prop. The main screen's hand-down to
 * its tabs is counted and may only shrink (scripts/ratchet.json, "shell_props_to_tabs"); a value and
 * its setter as two props would have pushed it over.
 */
export type ChatTextSizeSetting = {
  value: ChatTextSize;
  set: (v: ChatTextSize) => void;
};

export type SettingsTabChatTextSizeRowProps = {
  setting: ChatTextSizeSetting;
};

export const SettingsTabChatTextSizeRow: React.FC<SettingsTabChatTextSizeRowProps> = ({
  setting: { value: chatTextSize, set: setChatTextSize },
}) => (
  <PanelSection title="Text size">
    <PanelSectionRow>
      <div className="bonsai-prose-host bonsai-settings-bleed" style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
        <div className="bonsai-prose" style={{ fontSize: 11, color: "#9fb7d5", marginBottom: 8, lineHeight: 1.35 }}>
          How big the words in the chat are: your questions, the answers and the Show details text. The tabs and
          Settings stay the same.
        </div>
        <Focusable
          flow-children="horizontal"
          data-bonsai-chat-text-size-row="true"
          style={{ display: "flex", gap: 6, width: "100%", minWidth: 0, maxWidth: "100%", alignItems: "stretch" }}
        >
          {CHAT_TEXT_SIZE_OPTIONS.map((size) => {
            const active = size === chatTextSize;
            return (
              <Button
                className={FOCUS_RING_BTN_CLASS}
                key={size}
                onClick={() => setChatTextSize(size)}
                style={{
                  flex: 1,
                  minHeight: 36,
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "4px 4px",
                  borderRadius: 4,
                  border: active ? "1px solid rgba(255,255,255,0.45)" : "1px solid rgba(255,255,255,0.12)",
                  background: active
                    ? "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.1) 100%)"
                    : "rgba(255,255,255,0.04)",
                  color: active ? "#f0f4f8" : "#9fb0c0",
                  boxShadow: active ? "inset 0 1px 0 rgba(255,255,255,0.15)" : "none",
                }}
                aria-label={`Set text size to ${chatTextSizeLabel[size]}`}
                aria-pressed={active}
              >
                {chatTextSizeLabel[size]}
              </Button>
            );
          })}
        </Focusable>
      </div>
    </PanelSectionRow>
  </PanelSection>
);
