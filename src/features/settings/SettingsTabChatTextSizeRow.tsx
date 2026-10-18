/**
 * Title: Settings tab -- Text size row
 *
 * Purpose: The "Text size" choice in Settings: Small, Normal or Large, drawn as three buttons side
 * by side, the same shape as Screenshot quality. It sets how big the words are
 * everywhere in bonsAI: the tab bar, the chat's name, the chat itself, the chips, the question box and
 * every other tab (plan 89). Steam's own controls, whose size Steam sets, may not follow.
 *
 * Used for: SettingsTab, inside the folded "Text size" section (plan 91 § 2b, plan 92 T1). The words that
 * used to sit above the buttons ride on the row for the help strip at the bottom of the panel.
 *
 * Solves: Plan 87 call 3, widened by plan 89. A person who finds the words too small (or too big) on the
 * Deck's panel gets one plain row to fix it.
 *
 * Does not: Scale anything. The size is written to `--bonsai-text-scale` on the plugin's root
 * (src/shared/text-size/chatTextSize.ts) and every font size in the plugin reads it (src/styles/textPx.ts).
 *
 * Focus: one `Focusable` with `flow-children="horizontal"` holding three buttons (SettingsTabChoiceRow).
 * Left and Right are Steam's own and move the ring along the three, scrolling the page not at all (plan 89).
 * The row carries only Up and Down, handed in by the tab (`nav`) to go to its section's line and the next
 * line (see docs/focus-graph.md, "The Text size row").
 */
import React from "react";

import { CHAT_TEXT_SIZE_OPTIONS, type ChatTextSize } from "./bonsaiSettingsSchema";
import { CHAT_TEXT_SIZE_LABEL, SETTINGS_ROW_HELP } from "./settingsTabFolds";
import { bonsaiSettingRowNav } from "../search-tab/bonsaiSettingRowNav";
import { SettingsTabChoiceRow } from "./SettingsTabChoiceRow";

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
  /** Up (to the section's line) and Down (to the next line), on the row's Focusable. */
  nav?: Record<string, unknown>;
};

export const SettingsTabChatTextSizeRow: React.FC<SettingsTabChatTextSizeRowProps> = ({
  setting: { value: chatTextSize, set: setChatTextSize },
  nav,
}) => (
  <SettingsTabChoiceRow
    label="Text size"
    help={SETTINGS_ROW_HELP.textSize}
    options={CHAT_TEXT_SIZE_OPTIONS.map((size) => ({
      id: size,
      label: CHAT_TEXT_SIZE_LABEL[size],
      ariaLabel: `Set text size to ${CHAT_TEXT_SIZE_LABEL[size]}`,
    }))}
    value={chatTextSize}
    onPick={setChatTextSize}
    nav={{ ...nav, navRef: bonsaiSettingRowNav("text-size") }}
    rowProps={{ "data-bonsai-chat-text-size-row": "true" }}
  />
);
