/**
 * Title: How strong the AI character's accent is
 *
 * Purpose: When the AI character voice is turned on, Settings has a row of
 * four choices for how far to lean into it: Light, Default, Strong, and
 * Wild. This file is the list of those four choices, the id saved for each
 * one, and the short label and one-line description shown for each in the
 * popover that lets the user pick.
 *
 * Used for: the character row in Settings, and the popover it opens to make
 * the pick. Also read by the settings clean-up file, so a saved choice that
 * is not one of the four falls back to Default.
 *
 * Solves: the four choices have to be spelled exactly the same way here and
 * on the computer or Deck running the AI, or a saved pick from one side
 * would not be recognised on the other. This is the one place the four ids
 * are written down on this side.
 *
 * Does not: change how strong the accent actually sounds. The choice is just
 * a word sent along with the question; the AI's own instructions (on the
 * computer or Deck, not here) are what turn "Wild" into an actual change in
 * how the reply is written.
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
