/**
 * Title: Reading the open reasoning block with the D-pad
 *
 * Purpose: The open Show reasoning block is often taller than the screen. It is a stop of its own, and
 * while the ring sits on it each Down or Up scrolls it by about one screen, so a person reads all of it,
 * the same way a tall answer is read. This file holds the measuring and scrolling for that; it moves the
 * ring only for the hand-off between the line and the block, never into or out of the answer.
 *
 * Used for: buildReasoningFoldElement.tsx, whose line and block call these from their own Steam move
 * handlers (onMoveDown / onMoveUp) and from the block's focus event.
 *
 * Solves: one Down from the Hide reasoning line used to go straight into the answer, and the panel
 * moved 555 px in one press with the ring never on any of the reasoning (the Deck, plan 82,
 * docs/test-evidence/plan82-M5-REASONING-SCROLL.json); Up did the same backwards.
 *
 * Does not: decide what Down does after the block (the transcript passes that in: into the answer),
 * nor touch the answer's own walk (answerBubbleNavigation.ts). It reuses that walk's geometry helpers
 * so a landing on the block is placed by the same rules as a landing on an answer section.
 *
 * How it works:
 *
 *     Hide reasoning · 18 s     Down: the ring onto the block          (`enterReasoningBlock()`)
 *     ┌ the block ─────────┐    landing: its top under the header, or
 *     │                    │    its end at the dock coming from below  (`placeReasoningBlockOnLanding()`)
 *     │  ...               │    Down/Up on it: scroll one band less a little overlap, never past
 *     │                    │    its own edge                           (`stepReasoningBlock()`)
 *     └────────────────────┘    an edge already in the band: the press leaves the block
 *     the answer                Up out of the block: back on the line, on screen (`showLineInBand()`)
 *
 * Gotchas:
 *   - Where the ring came from is read off the geometry, not remembered: going Down the block's top is
 *     on screen just under the line, going Up its end is on screen just over the answer. Steam's own
 *     move from the answer's first section lands here (the block is the stop drawn right above the
 *     answer in the turn's column) and fires the same focus event our own hop does.
 *   - A scroll-only press leaves the ring where it is, as on a tall answer section; Steam does not pull
 *     a focused element back on a press its handler claimed (the Deck, plan 76: a word stayed 300 px off
 *     screen with the ring on it), and the block always overlaps the band after a step.
 *   - Only an element's own nav node and a plain focus between siblings move the ring here: the line and
 *     the block are siblings in the same turn column (AGENTS.md, "The Steam Deck focus graph").
 */
import { findScrollablePanel, panelScrollMax, readableBottomOf } from "./chatPanelScroll";
import {
  CUT_TOLERANCE_PX,
  bandHeightOf,
  revealBelowDock,
  revealSectionInBand,
  settleUpLanding,
} from "./answerBubbleBandGeometry";
import { refocusPanelWindowIfLost } from "./navFocusRegistry";
import { elementHasFocus } from "./uiDocument";

/** The object Steam assigns to a Focusable's `navRef`. */
export type ReasoningNavHolder = { current: { TakeFocus?: (gamepad?: boolean) => unknown } | null };

/**
 * How much of the last screenful stays in view after a step: about two lines of the block's text
 * (11 px type at 1.4 line height), so the eye has a line to pick the reading up from.
 */
const READING_OVERLAP_PX = 32;

/** An edge within this of the band's own edge is already read (the answer walk's own slack). */
const EDGE_SLACK_PX = 4;

/** One press's scroll on the block: the band less the overlap, and never less than half the band. */
function readingStepOf(scroll: HTMLElement): number {
  const band = bandHeightOf(scroll);
  return Math.max(Math.round(band / 2), band - READING_OVERLAP_PX);
}

/**
 * Feature: Down from the Hide reasoning line puts the ring on the open block.
 * In: the block's element and its nav holder. Out: true when the ring landed on it.
 *
 * Steam's own transfer first (the block's nav node), then a plain focus, which is enough between two
 * siblings of one column; the did-it-land check decides. The landing is placed by the block's focus
 * event (`placeReasoningBlockOnLanding()`), the same one Steam's own move from below fires.
 */
export function enterReasoningBlock(block: HTMLElement | null, nav: ReasoningNavHolder): boolean {
  if (!block || !block.isConnected) return false;
  refocusPanelWindowIfLost();
  try {
    nav.current?.TakeFocus?.(true);
  } catch {
    /* the focus and the check below decide */
  }
  if (!elementHasFocus(block)) block.focus({ preventScroll: true });
  return elementHasFocus(block);
}

/**
 * Feature: the block a press just landed on can be read from the end the ring came in by.
 * In: the block. Out: true when the panel moved.
 *
 * A block that fits the band is brought wholly into it, like an answer section. A taller one whose top
 * is on screen (the ring came down from the line) has its top brought under the header; one whose end
 * is on screen or above the dock (the ring came up from the answer) has its end brought to the dock. A
 * block that already fills the band, both edges off it, is left alone: the ring is on text either way.
 */
export function placeReasoningBlockOnLanding(block: HTMLElement): boolean {
  const scroll = findScrollablePanel(block);
  if (!scroll) return false;
  const before = scroll.scrollTop;
  const rect = block.getBoundingClientRect();
  if (rect.bottom - rect.top <= bandHeightOf(scroll)) {
    revealBelowDock(block, scroll);
    revealSectionInBand(block, scroll);
  } else if (rect.top >= scroll.getBoundingClientRect().top - CUT_TOLERANCE_PX) {
    revealBelowDock(block, scroll); // for a block taller than the band: its top to the header, no further
  } else if (rect.bottom <= readableBottomOf(scroll) + EDGE_SLACK_PX) {
    settleUpLanding(block, scroll); // its end to the dock
  }
  return scroll.scrollTop !== before;
}

/**
 * Feature: Down or Up with the ring on the block reads the next screenful of it.
 * In: the block and the direction. Out: true when the panel moved, false when the block's edge that
 * way is already inside the band (the press then leaves the block).
 *
 * The step is `readingStepOf()`, cut short at the block's own edge, so the last step stops with its end
 * on the dock going Down, or its top on the header going Up, and the next press leaves.
 */
export function stepReasoningBlock(block: HTMLElement | null, dir: "down" | "up"): boolean {
  if (!block) return false;
  const scroll = findScrollablePanel(block);
  if (!scroll) return false;
  const rect = block.getBoundingClientRect();
  const rest = dir === "down" ? rect.bottom - readableBottomOf(scroll) : scroll.getBoundingClientRect().top - rect.top;
  if (rest <= EDGE_SLACK_PX) return false;
  const step = Math.min(rest, readingStepOf(scroll));
  const before = scroll.scrollTop;
  scroll.scrollTop = Math.max(0, Math.min(panelScrollMax(scroll), before + (dir === "down" ? step : -step)));
  return scroll.scrollTop !== before;
}

/**
 * Feature: the line the ring comes back to from the block (Up at its top, or B) is on screen.
 * In: the line. Out: true when the ring is on it.
 *
 * A plain focus: the line and the block are siblings in one column. When the line sits above the
 * header, as it does whenever the block has been read past its top, its top is brought just under it.
 */
export function showLineInBand(line: HTMLElement | null): boolean {
  if (!line || !line.isConnected) return false;
  if (!elementHasFocus(line)) line.focus({ preventScroll: true });
  if (!elementHasFocus(line)) return false;
  const scroll = findScrollablePanel(line);
  if (scroll) {
    revealSectionInBand(line, scroll);
    revealBelowDock(line, scroll);
  }
  return true;
}
