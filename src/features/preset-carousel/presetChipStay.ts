/**
 * Title: How long a long chip stays, read off the chip itself
 * Purpose: A long chip scrolls its words to the end and stands still (PresetChipScrollText). This
 *          module carries that chip's real time line up to the row, so the row can replace the chip
 *          one pause after its words stop, instead of on the row's own beat.
 * Used for: The fade, plain and decode chip styles (MainTabPresetAnimatedChips.tsx,
 *           presetDecodeSlots.tsx); the chip reports through PresetChipButton's onScrollPlan.
 * Solves: The row timed a chip from a character count (presetHoldMs) and only used the scroll as a
 *         floor, so a long chip stood still 3 to 10 s after its words stopped (Deck, 2026-10-02,
 *         plan 79: the maintainer asked for about 1.5 s). The chip knows its real overflow, so the
 *         row now asks the chip.
 * Does not: Draw anything or move anything. A chip whose words fit reports nothing, and the row
 *           keeps the stay time it always had for it. The sliding (carousel) style does not report:
 *           its chips are re-created as the history trims, so it keeps its own beat.
 */
import type { ChangeSpacer } from "./changeSpacing";

/** One chip's scroll time line: when it began (Date.now clock) and how long until it may leave. */
export type ChipScrollReport = { startedAt: number; stayMs: number };

/** What a chip tells its row: for these words, the time line, or null when they fit (or are gone). */
export type ChipScrollListener = (text: string, report: ChipScrollReport | null) => void;

export type ChipStayBoard = {
  /** Called by the chip (through PresetChipButton) for the slot it sits in. */
  report: (slot: number, text: string, report: ChipScrollReport | null) => void;
  /** When the chip showing `text` in `slot` may leave (Date.now clock); null when it has no scroll. */
  leaveAt: (slot: number, text: string) => number | null;
  /** Hear every report; returns the way to stop hearing. */
  subscribe: (fn: (slot: number, text: string) => void) => () => void;
};

export function makeChipStayBoard(): ChipStayBoard {
  const records = new Map<number, { text: string; report: ChipScrollReport }>();
  const listeners = new Set<(slot: number, text: string) => void>();
  return {
    report(slot, text, report) {
      const known = records.get(slot);
      if (report) records.set(slot, { text, report });
      else if (known?.text === text) records.delete(slot);
      else return; // a chip that is gone says nothing about the one now in its place
      listeners.forEach((fn) => fn(slot, text));
    },
    leaveAt(slot, text) {
      const known = records.get(slot);
      return known && known.text === text ? known.report.startedAt + known.report.stayMs : null;
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

/**
 * Arms the moment a chip may leave and calls `onLeave` then. Until the chip has reported a scroll
 * (and for ever, when its words fit) that moment is `fallbackMs` from now, the stay time the row
 * always used; once the chip reports, it is exactly the end of its own time line. A report that
 * arrives later, or a changed one, moves the moment. `tailMs` is the fade-out between "leave" and the
 * swap (the swap is what the spacer keeps apart). Returns the way to stand it down.
 */
export function armLeave(args: {
  board: ChipStayBoard;
  spacer: ChangeSpacer;
  slot: number;
  text: string;
  fallbackMs: number;
  tailMs: number;
  onLeave: () => void;
}): () => void {
  const { board, spacer, slot, text, fallbackMs, tailMs, onLeave } = args;
  const fallbackAt = Date.now() + fallbackMs;
  let timer = 0;
  let over = false;
  const stop = () => {
    over = true;
    unsubscribe();
    window.clearTimeout(timer);
  };
  const leave = () => {
    if (over) return;
    stop();
    onLeave();
  };
  const place = () => {
    window.clearTimeout(timer);
    const now = Date.now();
    const measured = board.leaveAt(slot, text);
    if (measured !== null) {
      // The end of the chip's own time line: reserved now, so a chip on the row's beat gives way to it.
      timer = window.setTimeout(leave, spacer.delayBefore(slot, now, Math.max(0, measured - now), tailMs, true));
      return;
    }
    // No scroll known: leave on the row's beat, asking the spacer only when the time comes.
    timer = window.setTimeout(() => {
      if (over) return;
      const extraMs = spacer.delayBefore(slot, Date.now(), 0, tailMs);
      if (extraMs > 0) timer = window.setTimeout(leave, extraMs);
      else leave();
    }, Math.max(0, fallbackAt - now));
  };
  const unsubscribe = board.subscribe((s, t) => {
    if (!over && s === slot && t === text) place();
  });
  place();
  return stop;
}
