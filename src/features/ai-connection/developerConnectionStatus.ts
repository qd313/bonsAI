/**
 * Title: The last connection test's result, as the Developer tab reads it
 *
 * Purpose: The one type for what the Developer tab needs from the last Ollama connection test: whether the host
 * answered, its version and models, and (for the loaded-models words in Diagnostics) which models are in memory
 * and how much of each sits in GPU-visible memory.
 *
 * Used for: DeveloperTab.tsx (re-exported from there for its other users), developerRowsDiagnostics.tsx.
 *
 * Solves: Keeping the type in a file of its own so the Developer section files can read it without importing the
 * tab that imports them (an import cycle the ratchet counts).
 *
 * Does not: Run a connection test or hold any value.
 */
export type DeveloperConnectionStatus = {
  reachable: boolean;
  version?: string;
  models?: string[];
  ps_loaded?: Array<{
    name: string;
    size_bytes: number;
    size_vram_bytes: number;
    vram_weight_share_pct_appx: number | null;
  }>;
  error?: string;
  recovery_attempted?: boolean;
};
