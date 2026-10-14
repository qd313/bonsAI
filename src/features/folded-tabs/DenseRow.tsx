/**
 * Title: One line per setting in a folded tab
 *
 * Purpose: The one-line shape of a row inside an open folded section (plan 91 § 2b): the setting's
 * name and its switch, choice buttons, slider or button, and nothing else. The longer text that used
 * to sit under the name or in a help line above or below rides on the row instead, for the help strip
 * at the bottom of the panel to show while the ring is on it.
 *
 * Used for: the Ollama tab's rows now, the Settings and Developer tabs' next. `DenseSwitchRow` for a
 * switch; `DenseRow` with kind "choice", "slider" or "button" around a control the tab draws itself.
 *
 * Solves: Three tabs needing the same row shape and the same way of handing their text to the strip,
 * written once. A switch is Steam's own ToggleField, kept whole so its ring, its A and its touch stay
 * Steam's, with no description: Steam draws a description itself under the label, so leaving it out
 * is what makes the row one line (plan 91 § 7). Sliders keep the shared slider builders
 * (DeckFocusSlider), with the ring on the knob as plan 82 set it.
 *
 * Does not: Wire any D-pad move of its own; a switch passes the moves it is handed straight to Steam's
 * row. Does not draw the strip (TabHelpStrip) or decide where the text shows.
 */
import React from "react";
import { ToggleField } from "@decky/ui";

import { scaledSteamWords } from "../../components/scaledSteamWords";
import { helpAttributes } from "./useHelpStrip";

export type DenseRowKind = "switch" | "choice" | "slider" | "button";

export type DenseRowProps = {
  kind: DenseRowKind;
  /** The setting's name, shown in bold at the start of the strip. */
  label: string;
  /** The longer text, word for word as the row used to show it; none for a row without one. */
  help?: string;
  hostRef?: React.Ref<HTMLDivElement>;
  children?: React.ReactNode;
};

/** The row's outer element: its one-line class, and its text for the strip. */
export function DenseRow({ kind, label, help, hostRef, children }: DenseRowProps): React.ReactElement {
  return (
    <div ref={hostRef} className={`bonsai-dense-row bonsai-dense-row--${kind}`} {...helpAttributes(label, help)}>
      {children}
    </div>
  );
}

export type DenseSwitchRowProps = {
  label: string;
  help?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Steam move handlers for the row (onMoveUp, onMoveDown), passed to the ToggleField. */
  nav?: Record<string, unknown>;
  hostRef?: React.Ref<HTMLDivElement>;
  /** A live status line under the switch (not help text), e.g. "Set up and answering questions." */
  children?: React.ReactNode;
};

/**
 * A switch: Steam's ToggleField with no description, its text on the row for the strip. The name is handed to
 * Steam as a scaled element (16, Steam's own size) so it follows Text size; the plain `label` stays on the row.
 */
export function DenseSwitchRow({
  label,
  help,
  checked,
  onChange,
  disabled,
  nav,
  hostRef,
  children,
}: DenseSwitchRowProps): React.ReactElement {
  return (
    <DenseRow kind="switch" label={label} help={help} hostRef={hostRef}>
      <ToggleField label={scaledSteamWords(label, 16)} checked={checked} disabled={disabled} onChange={onChange} {...(nav ?? {})} />
      {children}
    </DenseRow>
  );
}
