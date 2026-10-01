/**
 * Title: Preset row layout
 * Purpose: The numbers that shape the suggestion row — how many chips sit across it, their height
 *          and gap, and the scrolling-label settings — plus the hold and turn lengths of a chip at the
 *          pace for one chip or two (presetPace.ts), with the floor a scrolling label needs.
 * Used for: MainTabPresetAnimatedChips, carouselState (window size), sessionRagComposer (which slot
 *           the corpus guarantee converts), section-4 styles.
 * Solves: One place for "two across" (D43, 2026-09-01) so the composer, the carousel window and the
 *         row never disagree about what is on screen.
 * Does not: Measure anything — widths come from CSS (design-language rule 4). The character estimate
 *           here only sizes a hold time; the fit check that decides whether a label scrolls is made
 *           by Steam's Marquee on the live element.
 */
import { holdMsForPresetText } from "../../data/presets";
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
export const PRESET_CHIP_HEIGHT_PX = 30;
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
 * Steam Marquee settings. "Slow and calm" per the maintainer (2026-09-01). The units are Steam's and
 * undocumented; these are calibrated on device (row PRESET-ONE-LINE-04) and only ever change here.
 * The chat row's long chat name scrolls with these same settings (ChatSlotRow.tsx, through
 * SteamMarqueeText), so a chip label and a chat name always move alike. Speed lowered 20%, 25 to
 * 20, by the maintainer's call in plan 72 (2026-09-27); the pause before the start is unchanged.
 */
export const PRESET_MARQUEE_SPEED = 20;
export const PRESET_MARQUEE_DELAY_S = 1.5;
export const PRESET_MARQUEE_FADE_LENGTH = 8;
/** Pause after a label has scrolled to its end before a chip may rotate out. */
const PRESET_MARQUEE_END_PAUSE_MS = 1500;

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

/** How long a scrolling label needs to be read through once: delay, one crawl, a pause. */
function marqueeHoldFloorMs(text: string, chipCount: number): number {
  const overflowPx = Math.max(0, text.length * PRESET_LABEL_PX_PER_CHAR - labelRoomPx(chipCount));
  if (overflowPx === 0) return 0;
  return (
    PRESET_MARQUEE_DELAY_S * 1000 +
    (overflowPx / PRESET_MARQUEE_SPEED) * 1000 +
    PRESET_MARQUEE_END_PAUSE_MS
  );
}

/**
 * Hold time for a chip: the length-scaled hold at this chip count's pace (presetPace.ts), but never
 * shorter than one full scroll of a label too long for its chip.
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
