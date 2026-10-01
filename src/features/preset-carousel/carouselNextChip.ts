/**
 * Title: The carousel's next chip
 * Purpose: When the sliding carousel's auto-advance reaches the end of its history, choose the chip it
 *          appends, by the same rule as the other three chip styles (nextChipRule.ts).
 * Used for: MainTabPresetSidewaysCarousel's tick.
 * Solves: The carousel used to have a rule of its own (a 30 in 100 roll for the game's chips) while
 *         fade, plain and decode used another that never dealt the game's chips again; one rule now.
 * Does not: Move the focus or touch the history; it only names the chip to append and the updated
 *           round of the game's chips already shown.
 */
import type { PresetPrompt } from "../../data/presets";
import { getSessionRagCarouselCandidates, pickNextChipWithSessionRag } from "./composePresetSeedsWithSessionRag";
import { isGameCandidate } from "./sessionRagComposer";

export type CarouselAppend = { next: PresetPrompt; gameRound: readonly string[] };

/**
 * The chip to append after `history[focusIndex]`, or null when focus is not at the end (then the
 * advance only moves along chips already dealt, in order).
 *
 * The window is `visibleSlots` wide with the focused chip at its right edge. With one chip showing, the
 * focused chip is the one leaving and its kind sets the kind of the next. With two, the older chip
 * leaves and the focused chip stays, so the focused chip's kind decides.
 */
export function pickCarouselAppend(
  history: readonly PresetPrompt[],
  focusIndex: number,
  visibleSlots: number,
  gameRound: readonly string[],
  drawGeneral: (exclude: ReadonlySet<string>) => PresetPrompt,
  rule?: { random?: () => number },
): CarouselAppend | null {
  if (history.length === 0 || focusIndex < history.length - 1) return null;
  const focused = history[focusIndex]!;
  const candidates = getSessionRagCarouselCandidates();
  const gameTexts = new Set(candidates.filter(isGameCandidate).map((c) => c.text));
  const isGame = (p: PresetPrompt) => p.ragTip === true || gameTexts.has(p.text);
  const shown = history.slice(0, focusIndex + 1).filter(isGame).map((p) => p.text);
  const round = [...gameRound.filter((t) => !shown.includes(t)), ...shown];
  const single = visibleSlots <= 1;
  const pick = pickNextChipWithSessionRag({
    current: single ? focused : (history[focusIndex - 1] ?? null),
    staying: single ? new Set<string>() : new Set([focused.text]),
    anchorIsGame: isGame(focused),
    queue: [],
    gameRound: round,
    avoid: new Set(history.map((p) => p.text)),
    drawGeneral,
    ...rule,
  });
  return { next: pick.next, gameRound: pick.gameRound };
}
