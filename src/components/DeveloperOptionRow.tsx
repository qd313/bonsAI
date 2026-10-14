/**
 * Title: Developer tab option row
 *
 * Purpose: One row of pill buttons on the Developer tab: a title and a strip of buttons where exactly one is
 * highlighted. The Preset suggestions row was the first of these; the streamed-answer scramble's "How letters
 * settle" and "Scrambled letter colour" rows are two more with the exact same look, so this is the one place
 * that button block is written instead of pasted a third and fourth time.
 *
 * Folded (plan 91 § 2b, plan 92 T2): drawn as one line, the title over the buttons and nothing else. The line
 * that says what the active choice does (`description`) is not drawn in the row: it rides on the row and shows
 * in the help strip at the bottom of the panel while the ring is on it. It is the description of the active
 * choice, so it changes with the pick (the strip watches the row and re-reads it). A row that passes
 * `optionHelp` also puts each option's own words on its button (plan 93 B15): the strip then describes the
 * option the ring is on as soon as the ring lands on it, not only the chosen one; the row's words show
 * when the ring is on the row but on none of the buttons.
 *
 * Used for: DeveloperTab.tsx's Tab to open on, App activity logging and Animations rows.
 *
 * Solves: Without this, every new button-row setting on the Developer tab repeats the same style object and
 * Focusable wiring by hand, which is how a row's look and its D-pad behavior would slowly drift from the others.
 *
 * Does not: Own any state. It is handed the current value and calls back when a button is pressed; the caller
 * decides what happens next.
 *
 * How it works: A `PanelSectionRow` holding a `DenseRow` (title, strip text) and one `Focusable
 * flow-children="horizontal"` of Decky `Button`s. Steam's horizontal flow inside the `Focusable` moves the ring
 * between the buttons. The only move handlers are the section's edge hand-offs (`nav`), put on that `Focusable`
 * because a Decky `Button` keeps no move handler: Up from the first stop of a section goes to the section's
 * line, Down from the last goes to the next line. Everything between is Steam's own step along the tab's column.
 */
import React from "react";
import { Button, Focusable, PanelSectionRow } from "@decky/ui";
import { DenseRow } from "../features/folded-tabs/DenseRow";
import { helpAttributes } from "../features/folded-tabs/useHelpStrip";
import { FOCUS_RING_BTN_CLASS } from "../styles/settingsGlassButton";
import { textPx } from "../styles/sections/textPx";
import type { EdgeNav } from "./developerRows";

export type DeveloperOptionRowOption<T extends string | number> = {
  value: T;
  label: string;
  /** Falls back to `label` when the button needs no fuller spoken description. */
  ariaLabel?: string;
};

export type DeveloperOptionRowProps<T extends string | number> = {
  title: string;
  /** The longer words for the help strip (what the active choice does). Omit it for a row that has none. */
  description?: string;
  options: ReadonlyArray<DeveloperOptionRowOption<T>>;
  activeValue: T;
  onSelect: (value: T) => void;
  /**
   * The strip words for one option, shown while the ring is on that option's button (the ring landing on it
   * is enough; no press). Omit it and every button falls back to the row's `description`.
   */
  optionHelp?: (value: T) => string | undefined;
  /** The section-edge hand-offs, when this row is the first or the last stop of its section. */
  nav?: EdgeNav;
};

/**
 * In: a title, the strip words, a fixed list of options, which value is active, a callback for pressing one,
 * and the edge moves when the row is at a section's edge.
 * Out: one `PanelSectionRow` with the title and the button strip.
 * Can go wrong: nothing on its own. A hand-edited settings value that matches none of the options
 * simply lights no button — the intended look for an out-of-range value, not a bug to guard here.
 */
export function DeveloperOptionRow<T extends string | number>({
  title,
  description,
  options,
  activeValue,
  onSelect,
  optionHelp,
  nav,
}: DeveloperOptionRowProps<T>): React.ReactElement {
  return (
    <PanelSectionRow>
      <DenseRow kind="choice" label={title} help={description}>
        <div className="bonsai-settings-bleed" style={{ width: "100%" }}>
          <div style={{ color: "#dcdedf", fontWeight: 600, fontSize: textPx(12), marginBottom: 3 }}>{title}</div>
          <Focusable
            flow-children="horizontal"
            style={{ display: "flex", gap: 6, width: "100%" }}
            {...((nav ?? {}) as Record<string, unknown>)}
          >
            {options.map((option) => {
              const active = option.value === activeValue;
              return (
                <Button
                  className={FOCUS_RING_BTN_CLASS}
                  key={option.value}
                  onClick={() => onSelect(option.value)}
                  style={{
                    flex: 1,
                    minHeight: 32,
                    fontSize: textPx(11),
                    fontWeight: 600,
                    borderRadius: 4,
                    border: active ? "1px solid rgba(56,189,248,0.55)" : "1px solid rgba(255,255,255,0.12)",
                    background: active
                      ? "linear-gradient(180deg, rgba(56,189,248,0.22) 0%, rgba(14,116,144,0.35) 100%)"
                      : "rgba(255,255,255,0.04)",
                    color: active ? "#e0f2fe" : "#9fb0c0",
                  }}
                  aria-label={option.ariaLabel ?? option.label}
                  {...(optionHelp ? helpAttributes(title, optionHelp(option.value) ?? description) : {})}
                >
                  {option.label}
                </Button>
              );
            })}
          </Focusable>
        </div>
      </DenseRow>
    </PanelSectionRow>
  );
}
