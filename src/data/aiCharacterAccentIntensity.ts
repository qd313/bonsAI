/**
 * Accent intensity for AI character roleplay (system prompt modulation).
 * Keep IDs in sync with backend `VALID_ACCENT_INTENSITY_IDS` in `backend/services/ai_character_service.py`.
 */
export type AiCharacterAccentIntensityId = "subtle" | "balanced" | "heavy" | "unleashed";

export const AI_CHARACTER_ACCENT_INTENSITY_IDS: readonly AiCharacterAccentIntensityId[] = [
  "subtle",
  "balanced",
  "heavy",
  "unleashed",
] as const;

export const DEFAULT_AI_CHARACTER_ACCENT_INTENSITY: AiCharacterAccentIntensityId = "balanced";

export type AiCharacterAccentIntensityOption = {
  id: AiCharacterAccentIntensityId;
  /** Short chip label (Doom-difficulty inspired tone). */
  shortLabel: string;
  /** One-line description for settings helper text. */
  description: string;
};

export const AI_CHARACTER_ACCENT_INTENSITY_OPTIONS: readonly AiCharacterAccentIntensityOption[] = [
  {
    id: "subtle",
    shortLabel: "Too Young",
    description:
      "I'm Too Young to Die — light seasoning: clear explanations, only occasional voice color.",
  },
  {
    id: "balanced",
    shortLabel: "Hurt Plenty",
    description:
      "Hurt Me Plenty — default strength: accent, rhythm, and attitude without burying the answer.",
  },
  {
    id: "heavy",
    shortLabel: "Ultra",
    description:
      "Ultra-Violence — pronounced dialect, idiom, and rhythm; facts and JSON stay exact.",
  },
  {
    id: "unleashed",
    shortLabel: "Nightmare",
    description:
      "Nightmare — maximum theatrical voice; still factually correct and JSON-safe.",
  },
];
