/**
 * Title: Preset row layout
 * Purpose: The numbers that shape the suggestion row — how many chips sit across it, their height
 *          and gap, and the scrolling-label settings — plus the hold and turn lengths of a chip at the
 *          pace for one chip or two (presetPace.ts), with the estimate of what a scrolling label needs (the row replaces a long chip by the chip's own
 *          measured time line instead, presetChipStay.ts; the estimate stands in until the chip has
 *          reported, and for a chip that does not scroll).
 * Used for: MainTabPresetAnimatedChips, carouselState (window size), sessionRagComposer (which slot
 *           the corpus guarantee converts), section-4 styles.
 * Solves: One place for "two across" (D43, 2026-09-01) so the composer, the carousel window and the
 *         row never disagree about what is on screen.
 * Does not: Measure anything — widths come from CSS (design-language rule 4). The character estimate
 *           here only sizes a hold time; the fit check that decides whether a label scrolls is made
 *           by Steam's Marquee on the live element.
 */
import { holdMsForPresetText } from "./presets";
import { presetPace } from "./presetPace";

/**
 * Chips side by side in the row. The drawing (major-redesign.md § 2.3) has three; the maintainer
 * chose two on 2026-09-01 (D43) because three left ~12 characters per chip on the 300px column and
 * two leave ~20 — enough to recognise most suggestions without waiting for them to scroll.
 */
export const PRESET_VISIBLE_SLOTS = 2;

/**
 * The row's actual visible-slot count for this render: 1 when the "one suggestion chip" setting
 * is on, otherwise `PRESET_VISIBLE_SLOTS`. `PRESET_VISIBLE_SLOTS` keeps meaning "the shipped
 * default" — carouselState.test.ts pins it at exactly 2 — and every call site that currently
 * reads the constant directly should read this instead, so the setting overrides at the point of
 * use rather than by changing what the default means.
 */
export function effectivePresetVisibleSlots(singleChip: boolean): number {
  return singleChip ? 1 : PRESET_VISIBLE_SLOTS;
}
/** Chip height, per the drawing (was 34 when the row was one chip). */
export const PRESET_CHIP_HEIGHT_PX = 26;
/** Space between the chips. From the design boards of 2026-09-16 (plan 60, board B): widened from
 * 4 so the two chips stop reading as one slab. */
export const PRESET_CHIP_GAP_PX = 6;
/** Set explicitly so the label room is known by construction rather than by Steam's button default. */
export const PRESET_CHIP_SIDE_PADDING_PX = 8;

/**
 * How long the "ran out of chips" edge glow stays on screen (roadmap `[chips]` ★★, filed
 * 2026-09-04). One `usePresetRowNav` state clears the cue after this many ms so a second press at
 * the same edge always starts the glow fresh rather than extending a still-running one. The CSS
 * transition in section-4.ts ramps in over a fraction of this window — see the comment there.
 */
export const PRESET_CHIP_BLOCKED_EDGE_FLASH_MS = 320;

/*
 * Scroll settings. "Slow and calm" per the maintainer (2026-09-01). The units are Steam's Marquee and
 * undocumented (measured on device: about one pixel a second per unit); calibrated on device (row
 * PRESET-ONE-LINE-04) and only ever changed here. The suggestion chips' own scroller
 * (PresetChipScrollText) and the chat's name in Decky's bar (ChatNameWords.tsx, plan 84 step 5) both
 * read them through `presetScrollPlan`, so a chip label and a chat name move alike. Speed lowered 20%,
 * 25 to 20, by the maintainer's call in plan 72 (2026-09-27); the pause before the start is unchanged.
 */
export const PRESET_MARQUEE_SPEED = 20;
export const PRESET_MARQUEE_DELAY_S = 1.5;
export const PRESET_MARQUEE_FADE_LENGTH = 8;
/**
 * How long the chat name's slide stands still at the end of its words (ChatNameWords.tsx reads it
 * through `plan.pauseMs`). 1.5 s on purpose: it is the same wait the words make at the start
 * (PRESET_MARQUEE_DELAY_S), so the beginning and the end of a slide feel alike. The suggestion chips
 * stand for PRESET_CHIP_READ_PAUSE_MS instead, since they read their words twice.
 */
export const PRESET_CHIP_END_PAUSE_MS = 1500;
/**
 * How long a long suggestion chip stands still each time its words reach their end (plan 96 F22, the
 * maintainer, 2026-10-18: "stop for a second"). It happens twice, once after each pass, and the chip
 * may leave only after the second one.
 */
export const PRESET_CHIP_READ_PAUSE_MS = 1000;
/** How long the words take to jump back to their start between the two passes: quick, but eased. */
export const PRESET_CHIP_SNAP_BACK_MS = 400;

/**
 * The time line of one long chip: wait, scroll to the end, stand, snap back, scroll to the end again,
 * stand. All in milliseconds, each moment counted from mounting.
 */
export interface PresetScrollPlan {
  /** Standing at the start before the words begin to move. */
  delayMs: number;
  /** One scroll, from the first word at the left edge to the last word at the right edge (both passes). */
  crawlMs: number;
  /** The chat name's stand at the end (PRESET_CHIP_END_PAUSE_MS); the chip stands `readPauseMs`. */
  pauseMs: number;
  /** The first time the words reach the end (delay plus scroll). */
  endMs: number;
  /** Standing still at the end, after each of the two passes. */
  readPauseMs: number;
  /** The jump back to the start. */
  snapBackMs: number;
  /** The moment the words begin to jump back (the first end plus a stand). */
  backAtMs: number;
  /** The moment the second pass begins (the jump back is over). */
  secondStartMs: number;
  /** The second time the words reach the end. */
  secondEndMs: number;
  /** The moment the chip may leave: the second end plus a stand. The whole "read twice" time. */
  stayMs: number;
}

/**
 * The time line for a label that overflows its room by `overflowPx`, or null when it fits. The
 * chip's scroller (PresetChipScrollText in presetChipButton.tsx) and the stay time below both read
 * this one function, so what is on screen and how long the chip stays cannot drift apart. The chat
 * name (ChatNameWords.tsx) reads only its first pass: delay, crawl, pause.
 */
export function presetScrollPlan(overflowPx: number): PresetScrollPlan | null {
  if (!(overflowPx > 0)) return null;
  const delayMs = PRESET_MARQUEE_DELAY_S * 1000;
  const crawlMs = (overflowPx / PRESET_MARQUEE_SPEED) * 1000;
  const endMs = delayMs + crawlMs;
  const readPauseMs = PRESET_CHIP_READ_PAUSE_MS;
  const snapBackMs = PRESET_CHIP_SNAP_BACK_MS;
  const backAtMs = endMs + readPauseMs;
  const secondStartMs = backAtMs + snapBackMs;
  const secondEndMs = secondStartMs + crawlMs;
  return {
    delayMs,
    crawlMs,
    pauseMs: PRESET_CHIP_END_PAUSE_MS,
    endMs,
    readPauseMs,
    snapBackMs,
    backAtMs,
    secondStartMs,
    secondEndMs,
    stayMs: secondEndMs + readPauseMs,
  };
}

/**
 * Device-measured 6.45 px per character at 12 px (PHASE4-CHIPS-01, 2026-08-29: 219.2 px for 34
 * characters, 379.8 px for 59). Used only to size a hold floor, where an over-estimate costs a
 * longer hold and nothing else.
 */
const PRESET_LABEL_PX_PER_CHAR = 6.45;
/** The chip column's width. Widths come from CSS; this only sizes a hold floor. */
const PRESET_COLUMN_PX = 300;

/**
 * The room for one chip's label: the column (less the gap between chips) shared by the chips
 * showing, minus the chip padding. One chip has ~284 px, two ~131 px. This used to assume two
 * even when one wide chip was showing, which held a one-chip label longer than it needed.
 */
function labelRoomPx(chipCount: number): number {
  const n = Math.max(1, chipCount);
  return (PRESET_COLUMN_PX - PRESET_CHIP_GAP_PX * (n - 1)) / n - 2 * PRESET_CHIP_SIDE_PADDING_PX;
}

/** How long a scrolling label needs to be read through twice: delay, two crawls, a snap back, two stands. */
function marqueeHoldFloorMs(text: string, chipCount: number): number {
  const overflowPx = text.length * PRESET_LABEL_PX_PER_CHAR - labelRoomPx(chipCount);
  return presetScrollPlan(overflowPx)?.stayMs ?? 0;
}

/**
 * Hold time for a chip: the length-scaled hold at this chip count's pace (presetPace.ts), but never
 * shorter than one full scroll of a label too long for its chip, worked out from a character count.
 * It is what the row waits when it has nothing better: a chip that scrolls tells the row its real time
 * line (presetChipStay.ts) and is replaced at the end of that instead.
 */
export function presetHoldMs(text: string, chipCount: number): number {
  return Math.max(holdMsForPresetText(text, presetPace(chipCount)), marqueeHoldFloorMs(text, chipCount));
}

/**
 * One whole turn of a chip: fade in, hold, fade out. Every chip style changes its chip once per
 * turn (the plain, decode and sliding styles have no fade of their own but take the same time), so
 * the four styles run at the same pace.
 */
export function presetTurnMs(text: string, chipCount: number): number {
  const pace = presetPace(chipCount);
  return pace.fadeInMs + presetHoldMs(text, chipCount) + pace.fadeOutMs;
}
