/**
 * Title: Turning a back-end "insert this chip" message into something the carousel can use
 *
 * Purpose: The row of suggested-question chips above the Ask box (the "preset carousel") can be
 * told by the back end to drop a specific chip of text into it — for example, after a background
 * check finishes and has something worth suggesting. That message comes from the back end
 * already loosely shaped, in a form TypeScript cannot fully trust; this file checks it actually
 * contains real text before handing it to the carousel, and returns nothing usable (`null`) if
 * it does not.
 *
 * Used for: `useBackgroundGameAi`'s handling of a finished background check, and the preset
 * carousel's inject flow.
 *
 * Solves: without this check, an empty or malformed message from the back end could try to
 * insert a blank or broken chip into the carousel.
 *
 * Does not: decide what goes into the carousel under normal conditions — that is
 * `composePresetSeedsWithSessionRag`, which composes chip suggestions from what the game and
 * session are about. This file only handles the special case of the back end asking for one
 * specific chip to be inserted.
 */
import type { PresetCarouselInjectPayload } from "../types/backgroundAsk";

export function normalizePresetCarouselInject(value: unknown): PresetCarouselInjectPayload | null {
  if (!value || typeof value !== "object") return null;
  const raw = (value as { text?: unknown }).text;
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  if (!text) return null;
  return { text };
}
