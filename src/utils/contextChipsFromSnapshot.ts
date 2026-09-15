/**
 * Title: Turning "what went into this answer" into the row of chips the player sees
 *
 * Purpose: The Show details panel shows what went into an AI answer as a row of small labelled chips
 * — one for each file, note, or piece of context the AI actually used. The back end hands over that
 * information as a plain list; this file puts the list in the right reading order, works out which
 * chips fit in the visible window around the one the player has selected, and decides whether the
 * Show details entry point should even appear for a given reply (some replies used nothing worth
 * showing). It also picks the chip's colour based on how the licence for what it used is classed —
 * free and open, openly available but not fully free, or neither — and flags a chip that carries a
 * credit to a licensed source so it can be marked with its own distinct colour instead.
 *
 * Used for: the reply transparency strip on the main tab, and the Show details entry points that open
 * it.
 *
 * Solves: gives one place that always orders and windows the chips the same way, and always decides
 * "is there anything worth showing" the same way, instead of every place that displays them working
 * that out for itself.
 *
 * Does not: fetch the "what went into this answer" information from the back end — see the Ask status
 * call and the input-transparency types for that. This file only reshapes what already came back.
 */
import type {
  ChatSlotTurnTransparency,
  TransparencySnapshot,
  ContextChip,
  ContextChipAttribution
} from "./inputTransparency";

const CONTEXT_CHIP_WINDOW = 2;
/** When chip count is at or below this, show every pill (no sliding window). */
export const CONTEXT_CHIP_SHOW_ALL_MAX = 6;

/** Everything these helpers actually read off a snapshot — satisfied by a live-session
 *  TransparencySnapshot and by the trimmed ChatSlotTurnTransparency a restored slot turn carries. */
type ChipSource = Pick<TransparencySnapshot, "route" | "success" | "context_chips">;

export function chipsFromSnapshot(
  snapshot: TransparencySnapshot | ChatSlotTurnTransparency | ChipSource | null | undefined,
): ContextChip[] {
  if (!snapshot?.context_chips?.length) return [];
  return [...snapshot.context_chips].sort((a, b) => a.rank - b.rank);
}

/** True when transparency entry points (Show details, session strip, inline hint) should render. */
export function transparencyUiAvailable(
  snapshot: TransparencySnapshot | ChatSlotTurnTransparency | ChipSource | null | undefined,
): boolean {
  if (!snapshot?.route) return false;
  return chipsFromSnapshot(snapshot).length > 0 || snapshot.success === true;
}

export function windowRange(activeIndex: number, total: number, window = CONTEXT_CHIP_WINDOW) {
  const start = Math.max(0, activeIndex - window);
  const end = Math.min(total - 1, activeIndex + window);
  return { start, end };
}

export function chipBodyTitle(chip: ContextChip): string {
  return chip.body?.title || chip.label;
}

export function chipBodyBullets(chip: ContextChip): string[] {
  return chip.body?.bullets ?? [];
}

export function chipBodyPaths(chip: ContextChip): string[] {
  return chip.body?.paths ?? [];
}

export function chipDevJson(chip: ContextChip): unknown {
  return chip.body?.dev_json;
}

export function chipAttribution(chip: ContextChip): ContextChipAttribution[] {
  return chip.body?.attribution ?? [];
}

/**
 * True when this chip carries a licensed third-party credit.
 *
 * Kept off `tier_class`, which is the *model* licensing axis — its `open_weight` value already
 * paints amber, so reusing it would make a knowledge chip read as a model chip.
 */
export function chipHasAttribution(chip: ContextChip): boolean {
  return chipAttribution(chip).length > 0;
}

/** Warm parchment, distinct from every tier colour. Reads as a citation, not a warning. */
export const ATTRIBUTION_ACCENT = "rgba(214, 174, 116, 0.95)";
export const ATTRIBUTION_ACCENT_SOFT = "rgba(214, 174, 116, 0.14)";

export function tierBorderColor(tierClass: string): string {
  if (tierClass === "foss") return "rgba(74, 222, 128, 0.9)";
  if (tierClass === "open_weight") return "rgba(251, 146, 60, 0.92)";
  if (tierClass === "non_foss") return "rgba(248, 113, 113, 0.92)";
  return "rgba(58, 76, 96, 0.85)";
}

export function tierBackground(tierClass: string): string {
  if (tierClass === "foss") return "rgba(18, 48, 32, 0.92)";
  if (tierClass === "open_weight") return "rgba(52, 32, 14, 0.92)";
  if (tierClass === "non_foss") return "rgba(48, 20, 24, 0.92)";
  return "rgba(26, 34, 44, 0.88)";
}
