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
    shortLabel: "Too Young To Die",
    description:
      "I'm Too Young to Die — light seasoning: clear explanations, only occasional voice color.",
  },
  {
    id: "balanced",
    shortLabel: "Hurt Me Plenty",
    description:
      "Hurt Me Plenty — default strength: accent, rhythm, and attitude without burying the answer.",
  },
  {
    id: "heavy",
    shortLabel: "Ultra Violence",
    description:
      "Ultra-Violence — strong dialect and rhythm; you may take a brief in-character tangent, then snap back to a clear answer. Facts and JSON stay exact.",
  },
  {
    id: "unleashed",
    shortLabel: "Nightmare",
    description:
      "Nightmare — voice may wander into caricature and be hard to read for stretches, but you must snap back and finish with a short plain recap; JSON-safe.",
  },
];
