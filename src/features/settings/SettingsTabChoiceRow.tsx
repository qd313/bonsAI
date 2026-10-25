/**
 * Title: Settings tab -- a row of choice buttons, one line
 *
 * Purpose: The row Screenshot quality and Text size share (plan 91 § 2b, plan 92 T1): the
 * choices drawn as buttons side by side, the saved one lighter and marked `aria-pressed`, and nothing
 * else. The words that used to sit above the buttons ride on the row for the help strip at the bottom of
 * the panel (DenseRow), so the row is one line tall.
 *
 * Used for: SettingsTab (Screenshot quality), SettingsTabChatTextSizeRow (Text size).
 *
 * Solves: Rows built the same way, written once, with the same look and the same D-pad shape: one
 * `Focusable` with `flow-children="horizontal"` holding the buttons, so Steam's own Left and Right walk
 * them and no press is swallowed; the tab hands Up (to the section's line) and Down (to the next line)
 * in through `nav`.
 *
 * Does not: Decide the options, the words or which section the row sits in; the caller does.
 *
 * Gotchas: A row that must be entered on one button other than its first (the spoiler tier row enters on Default)
 * passes `entry`. Steam's ring can only be sent to a nav node, and a Decky Button does not give one, so each
 * button then sits in its own `Focusable` (the voice model row's shape, VoiceInputSettingsSection.tsx), and the
 * wrapper of the entry button hands its node out through `entry.navRef`. The wrapper and its button both draw
 * the plugin's white ring inside their edge (FOCUS_RING_WRAP_CLASS, FOCUS_RING_INSET_CLASS), so whichever of the
 * two Steam marks, a ring shows. Rows that pass no `entry` are unchanged.
 */
import React from "react";
import { Button, Focusable, PanelSectionRow } from "@decky/ui";

import { DenseRow } from "../folded-tabs/DenseRow";
import { FOCUS_RING_BTN_CLASS, FOCUS_RING_INSET_CLASS, FOCUS_RING_WRAP_CLASS } from "../../styles/settingsGlassButton";
import { textPx } from "../../styles/textPx";

export type SettingsChoiceOption<T extends string> = {
  id: T;
  /** The words on the button. */
  label: string;
  /** The button's accessible name; the label when none. */
  ariaLabel?: string;
};

export type SettingsTabChoiceRowProps<T extends string> = {
  /** The setting's name, shown in bold at the start of the strip. */
  label: string;
  /** The longer text for the strip, word for word as the row used to print it. */
  help?: string;
  options: readonly SettingsChoiceOption<T>[];
  value: T;
  onPick: (id: T) => void;
  /** Move handlers for the row (onMoveUp, onMoveDown), on its Focusable. */
  nav?: Record<string, unknown>;
  /** Extra attributes for the row's Focusable (a test or driver hook). */
  rowProps?: Record<string, string>;
  hostRef?: React.Ref<HTMLDivElement>;
  /**
   * The button the ring enters this row on, and the holder Steam fills with its nav node (see Gotchas above).
   * Its button carries `data-bonsai-choice-entry="true"`, which the tab's Up-into-the-section entry looks for.
   */
  entry?: { id: T; navRef: { current: unknown } };
};

/**
 * One line of choice buttons. Without `entry` the buttons sit straight inside the row's one Focusable; with it,
 * each button gets its own Focusable so Steam's ring can be sent to the entry button (see Gotchas above).
 */
export function SettingsTabChoiceRow<T extends string>({
  label,
  help,
  options,
  value,
  onPick,
  nav,
  rowProps,
  hostRef,
  entry,
}: SettingsTabChoiceRowProps<T>): React.ReactElement {
  return (
    <PanelSectionRow>
      <DenseRow kind="choice" label={label} help={help} hostRef={hostRef}>
        <div className="bonsai-settings-bleed" style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
          <Focusable
            flow-children="horizontal"
            style={{ display: "flex", gap: 6, width: "100%", minWidth: 0, maxWidth: "100%", alignItems: "stretch" }}
            {...(rowProps ?? {})}
            {...((nav ?? {}) as Record<string, unknown>)}
          >
            {options.map((option) => {
              const active = option.id === value;
              const isEntry = entry !== undefined && option.id === entry.id;
              const button = (
                <Button
                  className={entry ? `${FOCUS_RING_BTN_CLASS} ${FOCUS_RING_INSET_CLASS}` : FOCUS_RING_BTN_CLASS}
                  key={entry ? undefined : option.id}
                  onClick={() => onPick(option.id)}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    minHeight: 30,
                    fontSize: textPx(12),
                    fontWeight: 600,
                    padding: "3px 4px",
                    borderRadius: 4,
                    border: active ? "1px solid rgba(255,255,255,0.45)" : "1px solid rgba(255,255,255,0.12)",
                    background: active
                      ? "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.1) 100%)"
                      : "rgba(255,255,255,0.04)",
                    color: active ? "#f0f4f8" : "#9fb0c0",
                    boxShadow: active ? "inset 0 1px 0 rgba(255,255,255,0.15)" : "none",
                  }}
                  aria-label={option.ariaLabel ?? option.label}
                  aria-pressed={active}
                  {...(isEntry ? { "data-bonsai-choice-entry": "true" } : {})}
                >
                  {option.label}
                </Button>
              );
              if (!entry) return button;
              return (
                <Focusable
                  key={option.id}
                  className={FOCUS_RING_WRAP_CLASS}
                  style={{ flex: 1, minWidth: 0, display: "flex" }}
                  onOKButton={() => onPick(option.id)}
                  {...(isEntry ? ({ navRef: entry.navRef } as Record<string, unknown>) : {})}
                >
                  {button}
                </Focusable>
              );
            })}
          </Focusable>
        </div>
      </DenseRow>
    </PanelSectionRow>
  );
}
