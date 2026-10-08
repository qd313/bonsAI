/**
 * Title: Turning "what went into this answer" into the row of chips the player sees
 *
 * Purpose: The Show details panel shows what went into an AI answer as a row of small labelled chips
 * — one for each file, note, or piece of context the AI actually used. The back end hands over that
 * information as a plain list; this file puts the list in the right reading order, and decides whether the
 * Show details entry point should even appear for a given reply (some replies used nothing worth
 * showing). It also picks the chip's colour based on how the licence for what it used is classed —
 * free and open, openly available but not fully free, or neither — and flags a chip that carries a
 * credit to a licensed source so it can be marked with its own distinct colour instead.
 *
 * Used for: the reply transparency strip on the main tab, and the Show details entry points that open
 * it.
 *
 * Solves: gives one place that always orders the chips the same way, and always decides
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

/** What the credit block says in place of the sources while they would give a spoiler away. */
export const SPOILER_HIDDEN_CREDITS_TEXT = "Sources hidden — open the notes to see them";

/**
 * How Show details draws one turn's credit line when that turn has a spoiler-protected note (a boss
 * or enemy the question never named). Worked out per turn by kbCreditsView
 * (buildKbNotesBlockElement.tsx), which owns the notes block this follows:
 * - `hidden`: the protected note is in the turn's "From the notes" block and the block is still
 *   closed -- the whole credit line gives way to SPOILER_HIDDEN_CREDITS_TEXT until the person opens
 *   the block (maintainer's call, 2026-09-27).
 * - `renames`: protected notes the answer never used, so no block will ever show them -- their name
 *   in the credit line becomes the block's own neutral title ("Boss note (spoiler)"), so nothing
 *   leaks and nothing points at a block that is not there. Keyed by note name.
 */
export type CreditsView = { hidden: boolean; renames: Record<string, string> };

/** Every turn with nothing protected, and every turn with spoiler covers off. */
export const CREDITS_SHOWN: CreditsView = { hidden: false, renames: {} };

/**
 * One credited card's label under a CreditsView. A card is titled "<game> — <note name>"
 * (kb_attached_notes.py builds the same key) or, for a note with no game, just the name; either
 * way only the name part is swapped.
 */
export function creditCardLabel(card: string, view: CreditsView): string {
  for (const [name, neutral] of Object.entries(view.renames)) {
    if (card === name) return neutral;
    const tail = ` — ${name}`;
    if (card.endsWith(tail)) return `${card.slice(0, -tail.length)} — ${neutral}`;
  }
  return card;
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
