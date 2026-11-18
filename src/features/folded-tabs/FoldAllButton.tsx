/**
 * Title: The floating Open all / Close all button of a folded tab
 *
 * Purpose: A small button in the bottom-right corner of a folded tab, above the help strip when it
 * shows (plan 91 § 2b, round 3 option C), on a band of the panel's colour across the tab's width so
 * it never sits over a row's words (plan 93; foldedTabs.ts draws the band). It reads "⊞ Open all"
 * while any section is closed and "⊟ Close all" once every section is open; A on it opens or closes
 * every section at once.
 *
 * Used for: TabHelpStrip's corner, on the Ollama tab now and the Settings and Developer tabs next.
 *
 * Solves: Opening or closing a whole tab without walking to each line. The D-pad rules:
 *   Right from any section line puts the ring here (FoldedSection's line does it), and so does Down
 *   from the tab's end: the last section's line, or its last control while it is open (plan 93).
 *   A opens or closes every section and keeps the ring here.
 *   Up, Left or B put the ring back on the section line it came from; Up after Down from the tab's end,
 *   with that last section open, goes on into it from below, onto its last control (plan 106 F1: on the
 *   Deck Up landed on the line and skipped the section's own controls). Right holds still. Down goes on to the
 *   bar at the bottom of the panel while a download's card is out of sight (downloads/JobBar.tsx, plan 105 D4),
 *   and holds still otherwise: the button is then the tab's last stop, and Down going back up would walk in a circle.
 * The section it came from is the last one the ring landed in, kept in foldedTabsStore, so it
 * survives a rebuild of the tab. Every move to and from here is Steam's own transfer onto a registered
 * nav node, never a plain focus() across containers: this button is drawn outside the tab's scroll
 * pane (TabHelpStrip says why).
 *
 * Does not: Look different from the tab's other plain buttons. It IS one: the same class and the same
 * style object as the AI models button (FOCUS_RING_BTN_CLASS, SETTINGS_GLASS_BTN), so its fill, text
 * and ring match by construction; only its size is smaller. A dark plate behind it, the panel's own
 * colour, the same as the band it sits on.
 */
import React, { useEffect, useRef, useSyncExternalStore } from "react";
import { Button, Focusable } from "@decky/ui";

import { registerNavFocus, unregisterNavFocus, type NavRefHolder } from "../../shared/dpad/navFocusRegistry";
import { FOCUS_RING_BTN_CLASS, SETTINGS_GLASS_BTN } from "../../styles/settingsGlassButton";
import { textPx } from "../../styles/textPx";
import { FOLD_ALL_HEIGHT_PX } from "./foldedTabs";
import {
  allSectionsOpen,
  foldAllCameFromEnd,
  foldSectionToReturnTo,
  foldedTabsVersion,
  isSectionOpen,
  setAllSections,
  subscribeFoldedTabs,
} from "./foldedTabsStore";
import { chainIds, foldAllNavId, takeFoldLine, type FoldChainSection } from "./FoldedSection";
import { shoulderSwitchFromPress } from "../../shared/dpad/shoulderSwitch";
import { takeJobBar } from "../downloads/JobBar";

const FOLD_ALL_OPEN_LABEL = "Open all";
const FOLD_ALL_CLOSE_LABEL = "Close all";

export type FoldAllButtonProps = {
  tab: string;
  /** The tab's sections in order, as its FoldedSections have them: Up uses the last one's way in from below. */
  chain: readonly FoldChainSection[];
};

/** The section the ring came from (the first when it came from none). */
function sectionToReturnTo(tab: string, sections: readonly string[]): string {
  const section = foldSectionToReturnTo(tab);
  return section && sections.includes(section) ? section : sections[0] ?? "";
}

/**
 * Up from the button: back to the line the ring came from, and, when it came Down from the tab's end with that last
 * section open, on into it from below, onto the control Down left. First Steam's own transfer onto the line, which is
 * inside the tab's column; then the section's own way in from below, a plain hop between siblings of that one column,
 * the same hop Up from the line under an open section makes (FoldedSection). Should that hop not land, the ring stays
 * on the line.
 */
function upFromButton(tab: string, chain: readonly FoldChainSection[]): void {
  const sections = chainIds(chain);
  const section = sectionToReturnTo(tab, sections);
  const intoSection = foldAllCameFromEnd(tab) && isSectionOpen(tab, sections, section);
  if (!takeFoldLine(tab, section) || !intoSection) return;
  chain.find((s) => s.id === section)?.enterFromBottom?.();
}

/** The button and its registered node: A opens or closes every section; the moves are the ones the header lists. */
export function FoldAllButton({ tab, chain }: FoldAllButtonProps): React.ReactElement {
  useSyncExternalStore(subscribeFoldedTabs, foldedTabsVersion);
  const sections = chainIds(chain);
  const allOpen = allSectionsOpen(tab, sections);
  const navRef = useRef<NavRefHolder["current"]>(null);
  useEffect(() => {
    const key = foldAllNavId(tab);
    registerNavFocus(key, navRef);
    return () => unregisterNavFocus(key, navRef);
  }, [tab]);

  const back = (): boolean => {
    takeFoldLine(tab, sectionToReturnTo(tab, sections));
    return true;
  };

  return (
    <Focusable
      className="bonsai-fold-all-host"
      data-bonsai-fold-all={tab}
      {...({
        navRef,
        onMoveUp: () => {
          upFromButton(tab, chain);
          return true;
        },
        onMoveDown: () => takeJobBar(foldAllNavId(tab)) || true,
        onMoveLeft: back,
        onMoveRight: () => true,
        /* LB and RB switch tabs from here as from anywhere: the dock is outside Steam's own Tabs, which never sees them. */
        onButtonDown: shoulderSwitchFromPress,
        /* B goes back too. Claimed always: B is otherwise Decky's, and would leave the tab. */
        onCancelButton: (e: unknown) => {
          back();
          (e as { preventDefault?: () => void })?.preventDefault?.();
        },
      } as Record<string, unknown>)}
    >
      <Button
        className={`${FOCUS_RING_BTN_CLASS} bonsai-fold-all`}
        onClick={() => setAllSections(tab, sections, !allOpen)}
        aria-label={allOpen ? "Close all sections" : "Open all sections"}
        style={{
          ...SETTINGS_GLASS_BTN,
          minHeight: FOLD_ALL_HEIGHT_PX,
          height: FOLD_ALL_HEIGHT_PX,
          padding: "0 10px 0 8px",
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          whiteSpace: "nowrap",
        }}
      >
        <span className="bonsai-fold-all__icon" aria-hidden="true" style={{ fontSize: textPx(13) }}>
          {allOpen ? "⊟" : "⊞"}
        </span>
        {allOpen ? FOLD_ALL_CLOSE_LABEL : FOLD_ALL_OPEN_LABEL}
      </Button>
    </Focusable>
  );
}
