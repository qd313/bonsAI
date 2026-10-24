/**
 * Title: The Developer tab's rows: the list a section draws, and the row shapes it is made of
 *
 * Purpose: A folded section of the Developer tab (plan 91 § 2b, plan 92 lane T2) is a list of rows. Some
 * are stops the ring can land on, some are only words. This file draws such a list, hands the section's two
 * edges their D-pad moves (the first stop's Up goes to the section's line, the last stop's Down to the next
 * line), and keeps each stop's element so the section line can put the ring on the first or the last stop.
 * It also holds the two row shapes more than one section uses: a button row and a read-only line.
 *
 * Used for: DeveloperTab.tsx and the Developer section files (developerRowsDiagnostics.tsx,
 * developerRowsLogging.tsx, developerRowsAnimations.tsx).
 *
 * Solves: Rows come and go (the Clear button, the captured errors, the scramble rows), so which stop is the
 * first and which the last is only known when the list is drawn. Working it out here, from the rows
 * themselves, keeps every section from hand-counting its own edges.
 *
 * Does not: Wire any move between two rows of the same section: that is Steam's own step along the tab's
 * one column (FoldedColumn). Does not decide what a row says (developerTabFolds.ts) or what an edge move does
 * (useDeveloperTabFocus.ts hands it in).
 */
import React from "react";
import { ButtonItem, Focusable, PanelSectionRow } from "@decky/ui";

import { DenseRow } from "../folded-tabs/DenseRow";
import { FOCUS_RING_ITEM_HOST_CLASS } from "../../styles/settingsGlassButton";
import { textPx } from "../../styles/textPx";

/** The two moves only a section's first and last stops need; every other stop has none. */
export type EdgeNav = { onMoveUp?: () => boolean; onMoveDown?: () => boolean };

/** One row of a section: a stop the ring can land on, or only words. */
export type DevRow = {
  key: string;
  /** True for a row the ring lands on. */
  stop?: boolean;
  render: (nav: EdgeNav) => React.ReactNode;
};

/** How a section's edges leave it, and where its stops' elements are kept. */
export type SectionWiring = {
  /** Up from the first stop: the section's own line. */
  up: () => boolean;
  /** Down from the last stop: the next line. */
  down: () => boolean;
  /** The stops' elements, in order, kept for the section line to enter by. */
  hosts: React.MutableRefObject<(HTMLElement | null)[]>;
};

/** The section's rows in order, the edge moves on the first and last stop, the stops' elements remembered. */
export function SectionRows({ rows, wiring }: { rows: readonly DevRow[]; wiring: SectionWiring }): React.ReactElement {
  const stopCount = rows.filter((r) => r.stop).length;
  wiring.hosts.current.length = stopCount;
  let stopIndex = -1;
  return (
    <>
      {rows.map((row) => {
        if (!row.stop) return <div key={row.key}>{row.render({})}</div>;
        stopIndex += 1;
        const at = stopIndex;
        const nav: EdgeNav = {};
        if (at === 0) nav.onMoveUp = wiring.up;
        if (at === stopCount - 1) nav.onMoveDown = wiring.down;
        return (
          <div
            key={row.key}
            ref={(el) => {
              wiring.hosts.current[at] = el;
            }}
          >
            {row.render(nav)}
          </div>
        );
      })}
    </>
  );
}

/** A button that runs something: Steam's own button row, whose ring the plugin draws, with its words for the strip. */
export function DevButtonRow({
  label,
  help,
  nav,
  onClick,
  disabled,
  children,
}: {
  label: string;
  help?: string;
  nav: EdgeNav;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <PanelSectionRow>
      <DenseRow kind="button" label={label} help={help}>
        {/* The Focusable round the button is where the edge moves live: a Decky button keeps no move handler. */}
        <Focusable {...(nav as Record<string, unknown>)}>
          <div className={FOCUS_RING_ITEM_HOST_CLASS}>
            <ButtonItem layout="below" disabled={disabled} onClick={onClick}>
              {children}
            </ButtonItem>
          </div>
        </Focusable>
      </DenseRow>
    </PanelSectionRow>
  );
}

/** A stop that only shows a value (nothing to press): its name, its value, and its words in the strip. */
export function DevInfoStop({
  label,
  value,
  help,
  nav,
}: {
  label: string;
  value: string;
  help?: string;
  nav: EdgeNav;
}): React.ReactElement {
  return (
    <PanelSectionRow>
      <DenseRow kind="button" label={label} help={help}>
        <Focusable
          onActivate={() => {}}
          noFocusRing={false}
          {...({ focusable: true, ...nav } as Record<string, unknown>)}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            padding: "6px 8px",
            fontSize: textPx(12),
            color: "#d9d9d9",
          }}
        >
          <span style={{ fontWeight: 600 }}>{label}</span>
          <span style={{ color: "#9fb7d5" }}>{value}</span>
        </Focusable>
      </DenseRow>
    </PanelSectionRow>
  );
}

/** A grey line of words that is not a stop. */
export function DevNote({ children, size = 12 }: { children: React.ReactNode; size?: number }): React.ReactElement {
  return (
    <PanelSectionRow>
      <div className="bonsai-settings-bleed" style={{ fontSize: textPx(size), color: "#8b929a", lineHeight: 1.35 }}>
        {children}
      </div>
    </PanelSectionRow>
  );
}
