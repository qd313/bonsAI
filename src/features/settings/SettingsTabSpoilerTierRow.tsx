/**
 * Title: Settings tab -- spoiler tier row
 *
 * Purpose: The "How much to hide" choice in the Story spoilers section: Hide more, Default or Hide less, drawn as
 * three buttons side by side, the same shape as Text size. It sets how much a Strategy answer keeps covered
 * (and a Speed or Expert answer that uses a note): Hide more also covers bosses, endings and chapters in every game,
 * Default is the long-standing rule, Hide less covers nothing. Naming a boss in the question shows that one in
 * every tier.
 *
 * Used for: SettingsTab, inside the folded "Story spoilers (Strategy mode)" section, under the "Hide spoilers until
 * I tap" switch. The words that explain the three ride on the row for the help strip at the bottom of the panel.
 *
 * Solves: Plan 98, the spoiler tiers setting (D50): one spoiler rule did not fit everyone, and a person who wanted
 * nothing covered, or the bosses covered too, had no choice.
 *
 * Does not: Decide what the AI hides. The saved value reaches the prompt in the back end
 * (backend/spoilers/spoiler_title_profiles.py, apply_spoiler_tier).
 *
 * Focus: one `Focusable` with `flow-children="horizontal"` holding three buttons (SettingsTabChoiceRow). Left
 * and Right are Steam's own and move the ring along the three. The row carries only Down, handed in by the tab, to
 * leave the section for the next line; the switch above carries Up to the section's line, and the one step between
 * the two rows is Steam's own (see docs/focus-graph.md, "The Story spoilers tier row").
 */
import React from "react";

import { SPOILER_TIER_OPTIONS, type SpoilerTier } from "./bonsaiSettingsSchema";
import { SETTINGS_ROW_HELP, SPOILER_TIER_LABEL } from "./settingsTabFolds";
import { SettingsTabChoiceRow } from "./SettingsTabChoiceRow";

/**
 * The saved choice and the way to change it, handed down as ONE prop: the main screen's hand-down to its tabs is
 * counted and may only shrink (scripts/ratchet.json, "shell_props_to_tabs"), the same reason as Text size.
 */
export type SpoilerTierSetting = {
  value: SpoilerTier;
  set: (v: SpoilerTier) => void;
};

export type SettingsTabSpoilerTierRowProps = {
  setting: SpoilerTierSetting;
  /** Down (to the next line), on the row's Focusable. */
  nav?: Record<string, unknown>;
};

export const SettingsTabSpoilerTierRow: React.FC<SettingsTabSpoilerTierRowProps> = ({
  setting: { value: spoilerTier, set: setSpoilerTier },
  nav,
}) => (
  <SettingsTabChoiceRow
    label="How much to hide"
    help={SETTINGS_ROW_HELP.spoilerTier}
    options={SPOILER_TIER_OPTIONS.map((tier) => ({
      id: tier,
      label: SPOILER_TIER_LABEL[tier],
      ariaLabel: `Set spoiler tier to ${SPOILER_TIER_LABEL[tier]}`,
    }))}
    value={spoilerTier}
    onPick={setSpoilerTier}
    nav={nav}
    rowProps={{ "data-bonsai-spoiler-tier-row": "true" }}
  />
);
