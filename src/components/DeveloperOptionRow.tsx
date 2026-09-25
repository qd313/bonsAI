/**
 * Title: Developer tab option row
 *
 * Purpose: One row of pill buttons on the Developer tab — a title, an
 * optional line describing the active choice, and a strip of buttons where
 * exactly one is highlighted. The Preset suggestions row was the first of
 * these; the streamed-answer scramble's "How letters settle" and "Scrambled
 * letter colour" rows are two more with the exact same look, so this is the
 * one place that button block is written instead of pasted a third and
 * fourth time.
 *
 * Used for: DeveloperTab.tsx's Preset suggestions row and its new Animations
 * section (how letters settle, how long each letter scrambles, scrambled
 * letter colour).
 *
 * Solves: Without this, every new button-row setting on the Developer tab
 * repeats the same style object and Focusable wiring by hand, which is how
 * a row's look and its D-pad behavior would slowly drift from the others.
 *
 * Does not: Own any state. It is handed the current value and calls back
 * when a button is pressed; the caller decides what happens next.
 *
 * How it works: A `PanelSectionRow` holding a title, an optional description
 * line, and one `Focusable flow-children="horizontal"` of Decky `Button`s —
 * the same shape Steam's D-pad already navigates correctly on the Tab
 * resume mode and App activity logging rows above it in DeveloperTab.tsx.
 * No move handlers, no `tabindex` edits, no `focus()` calls: Steam's default
 * horizontal flow inside the `Focusable` is what moves the ring between the
 * buttons, and vertical panel flow is what carries it to and from the row.
 */
import React from "react";
import { Button, Focusable, PanelSectionRow } from "@decky/ui";

export type DeveloperOptionRowOption<T extends string | number> = {
  value: T;
  label: string;
  /** Falls back to `label` when the button needs no fuller spoken description. */
  ariaLabel?: string;
};

export type DeveloperOptionRowProps<T extends string | number> = {
  title: string;
  /** One line under the title. Omit it for a row that needs no description (e.g. colour). */
  description?: string;
  options: ReadonlyArray<DeveloperOptionRowOption<T>>;
  activeValue: T;
  onSelect: (value: T) => void;
};

/**
 * In: a title, an optional one-line description, a fixed list of options, which value is active,
 * and a callback for pressing one.
 * Out: one `PanelSectionRow` with the title, the description (if given), and the button strip.
 * Can go wrong: nothing on its own. A hand-edited settings value that matches none of the options
 * simply lights no button — the intended look for an out-of-range value, not a bug to guard here.
 */
export function DeveloperOptionRow<T extends string | number>({
  title,
  description,
  options,
  activeValue,
  onSelect,
}: DeveloperOptionRowProps<T>): React.ReactElement {
  return (
    <PanelSectionRow>
      <div className="bonsai-settings-bleed" style={{ width: "100%" }}>
        <div style={{ color: "#d9d9d9", fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{title}</div>
        {description ? (
          <div
            className="bonsai-prose"
            style={{ fontSize: 11, color: "#9fb7d5", marginBottom: 6, lineHeight: 1.35 }}
          >
            {description}
          </div>
        ) : null}
        <Focusable flow-children="horizontal" style={{ display: "flex", gap: 6, width: "100%" }}>
          {options.map((option) => {
            const active = option.value === activeValue;
            return (
              <Button
                key={option.value}
                onClick={() => onSelect(option.value)}
                style={{
                  flex: 1,
                  minHeight: 32,
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 4,
                  border: active ? "1px solid rgba(56,189,248,0.55)" : "1px solid rgba(255,255,255,0.12)",
                  background: active
                    ? "linear-gradient(180deg, rgba(56,189,248,0.22) 0%, rgba(14,116,144,0.35) 100%)"
                    : "rgba(255,255,255,0.04)",
                  color: active ? "#e0f2fe" : "#9fb0c0",
                }}
                aria-label={option.ariaLabel ?? option.label}
              >
                {option.label}
              </Button>
            );
          })}
        </Focusable>
      </div>
    </PanelSectionRow>
  );
}
