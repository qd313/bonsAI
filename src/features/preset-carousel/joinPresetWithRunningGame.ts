/**
 * Title: Preset text passthrough
 * Purpose: Preserves a single helper for preset chip inject into the Ask field.
 * Used for: Preset carousel and unified input preset injection on MainTab.
 * Solves: Stable import if preset wording rules change again.
 * Does not: Inject running game title — session game context is supplied separately.
 */
export function joinPresetWithRunningGame(presetText: string): string {
  return presetText;
}
