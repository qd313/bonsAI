import type { PresetCarouselInjectPayload } from "../types/backgroundAsk";

export function normalizePresetCarouselInject(value: unknown): PresetCarouselInjectPayload | null {
  if (!value || typeof value !== "object") return null;
  const raw = (value as { text?: unknown }).text;
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  if (!text) return null;
  return { text };
}
