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
    shortLabel: "Light",
    description: "Occasional personality; answers stay plain.",
  },
  {
    id: "balanced",
    shortLabel: "Default",
    description: "Balanced voice without burying facts.",
  },
  {
    id: "heavy",
    shortLabel: "Strong",
    description: "Strong dialect; brief tangents OK, then a clear answer.",
  },
  {
    id: "unleashed",
    shortLabel: "Wild",
    description: "Most expressive; ends with a short plain recap.",
  },
];
