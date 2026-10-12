/**
 * Title: A folded section: its one-line header, and its rows while it is open
 *
 * Purpose: One section of a folded tab (plan 91 § 2b). Folded, it is one line: its name, a short
 * summary of its values, and a chevron. A on the line opens it, A again closes it, and several can be
 * open at once. Open, its rows follow the line, one line per setting.
 *
 * Used for: the Ollama tab's five sections now, the Settings and Developer tabs next. A tab lists its
 * sections once, in order, as a chain (`FoldChainSection[]`), and wraps each in a FoldedSection.
 *
 * Solves: The line is a stop with its own D-pad moves, so the walk through a folded tab never depends
 * on Steam guessing which control lies below a line that changes height:
 *   Down from a line: into the section's first control when open, else the next line; on the last
 *     line, it holds still.
 *   Up from a line: the previous section's last control when that section is open, else its line;
 *     from the first line, the tab bar.
 *   Right from a line: the floating Open all button (FoldAllButton). Left is Steam's own.
 *   A (or a tap): open or close the section. The ring stays on the line.
 * Every one of these moves the ring through Steam's own transfer onto a registered nav node
 * (`takeNavFocus`), or through the section's own focus callbacks, which stay inside the tab body.
 * Whether a section is open lives in foldedTabsStore, so a Decky popup closing (which rebuilds the
 * tab) does not fold it shut.
 *
 * Does not: Draw the rows or wire them: the tab draws them inside, and a section's last control hands
 * Down to the next line itself (`foldLineBelow`). Does not scroll: the tab body's scroll plan sees a
 * line like any other stop.
 *
 * Gotchas: The line's class never changes; open or closed is a data attribute. Steam writes its own
 * focus marker (`gpfocus`) into the class attribute, and React rewriting it would wipe the ring.
 */
import React, { useEffect, useRef, useSyncExternalStore } from "react";
import { Focusable } from "@decky/ui";

import { registerNavFocus, takeNavFocus, unregisterNavFocus, type NavRefHolder } from "../../utils/navFocusRegistry";
import {
  foldedTabsVersion,
  isSectionOpen,
  notePersonPress,
  rememberFoldSection,
  subscribeFoldedTabs,
  toggleSection,
} from "./foldedTabsStore";
import { FOLD_SECTION_ATTR } from "./useHelpStrip";

/**
 * The column a folded tab's sections sit in: one Steam container that walks its children top to bottom.
 * Steam moves the ring between a container's own children only along that container's flow (a column
 * or a row); a container with no flow set does not hand a press on to the next child (the About tab's
 * link buttons, 2026-10-12 on the Deck). Every line, every control of an open section and the next
 * section's line are children of this column, in order, so a press nobody claims (Down from Test
 * connection or from the knowledge base's Download button, whose own handlers Decky's Button never
 * forwards) still goes to the next thing below. A tab wraps all its FoldedSections in one of these.
 */
export function FoldedColumn({ children }: { children?: React.ReactNode }): React.ReactElement {
  return (
    <Focusable className="bonsai-fold-column" flow-children="vertical">
      {children}
    </Focusable>
  );
}

/** One section of a folded tab, as the D-pad chain needs it. */
export interface FoldChainSection {
  id: string;
  /** Put the ring on the section's first control; false when it has none on screen. */
  enterFromTop?: () => boolean;
  /** Put the ring on the section's last control; false when it has none on screen. */
  enterFromBottom?: () => boolean;
}

/** The registered nav id of tab `tab`'s line for section `section`. */
function foldLineNavId(tab: string, section: string): `fold-line:${string}` {
  return `fold-line:${tab}:${section}`;
}

/** The registered nav id of tab `tab`'s floating Open all button. */
export function foldAllNavId(tab: string): `fold-all:${string}` {
  return `fold-all:${tab}`;
}

/** The ring onto a section's line, through Steam's own transfer. */
export function takeFoldLine(tab: string, section: string): boolean {
  return takeNavFocus(foldLineNavId(tab, section));
}

/** The section ids of a chain, in order: what the store keys the open set by. */
export function chainIds(chain: readonly FoldChainSection[]): string[] {
  return chain.map((s) => s.id);
}

/**
 * Down from the last control of section `section`: the next section's line, or (the last section)
 * hold still. Always claims the press, so Steam never carries it past the tab's end.
 */
export function foldLineBelow(tab: string, chain: readonly FoldChainSection[], section: string): boolean {
  const next = chain[chain.findIndex((s) => s.id === section) + 1];
  if (next) takeFoldLine(tab, next.id);
  return true;
}

export type FoldedSectionProps = {
  tab: string;
  chain: readonly FoldChainSection[];
  id: string;
  title: string;
  /** The section's values in one line (summarizeSection); "" for none. */
  summary: string;
  children?: React.ReactNode;
};

/**
 * One section: its line (a stop with the moves written above, A to open or close) and, while it is open,
 * its rows. The open state comes from foldedTabsStore, so it outlives a rebuilt tab.
 */
export function FoldedSection({ tab, chain, id, title, summary, children }: FoldedSectionProps): React.ReactElement {
  useSyncExternalStore(subscribeFoldedTabs, foldedTabsVersion);
  const ids = chainIds(chain);
  const open = isSectionOpen(tab, ids, id);
  const navRef = useRef<NavRefHolder["current"]>(null);
  useEffect(() => {
    const key = foldLineNavId(tab, id);
    registerNavFocus(key, navRef);
    return () => unregisterNavFocus(key, navRef);
  }, [tab, id]);

  const at = ids.indexOf(id);
  const moveDown = (): boolean => {
    notePersonPress();
    if (open && chain[at]?.enterFromTop?.()) return true;
    return foldLineBelow(tab, chain, id);
  };
  const moveUp = (): boolean => {
    notePersonPress();
    const prev = chain[at - 1];
    if (!prev) return takeNavFocus("tab-bar");
    if (isSectionOpen(tab, ids, prev.id) && prev.enterFromBottom?.()) return true;
    return takeFoldLine(tab, prev.id);
  };
  const toggle = () => {
    notePersonPress();
    toggleSection(tab, ids, id);
  };

  return (
    <div className="bonsai-fold-section" {...{ [FOLD_SECTION_ATTR]: id }} data-open={open ? "true" : "false"}>
      <Focusable
        className="bonsai-fold-line"
        data-bonsai-fold-line={id}
        data-open={open ? "true" : "false"}
        role="button"
        aria-expanded={open}
        /* "<name> section", so the line never shares its name with a control inside it (AI models). */
        aria-label={summary ? `${title} section: ${summary}` : `${title} section`}
        /* A, or a tap: onOKButton for A and onClick for a finger, never onActivate as well (Steam fires it for A too). */
        onOKButton={toggle}
        onClick={toggle}
        {...({
          navRef,
          /* Its children are words: without this Steam treats it as an empty container and skips it. */
          focusable: true,
          /* The line draws its own ring (foldedTabs.ts); Steam's frame would sit on top of it. */
          noFocusRing: true,
          onMoveDown: moveDown,
          onMoveUp: moveUp,
          onMoveRight: () => {
            notePersonPress();
            rememberFoldSection(tab, id);
            return takeNavFocus(foldAllNavId(tab));
          },
        } as Record<string, unknown>)}
      >
        <span className="bonsai-fold-line__name">{title}</span>
        <span className="bonsai-fold-line__summary">{summary}</span>
        <span className="bonsai-fold-line__chevron" aria-hidden="true">
          {open ? "▾" : "▸"}
        </span>
      </Focusable>
      {open ? <div className="bonsai-fold-body">{children}</div> : null}
    </div>
  );
}
