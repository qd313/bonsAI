/**
 * Title: How big each first-time download is, as looked up on 2026-11-16
 *
 * Purpose: The five things a first setup on the Deck can download, each with its size as a named
 * constant, the date it was read and where it was read from (plan 105, § 12), and the one way a
 * total of them is written. Every size is rounded ("about 1.5 GB") so an ordinary new release does
 * not make it wrong.
 *
 * Used for: the first-time setup's checklist (first-run/firstRunChecklist.tsx), the starter set's box
 * (models/localOllamaStarterSet.tsx) and the download notices' sizes (downloadSites.ts).
 *
 * Solves: The first popup said "about 4.6 GB" for Ollama and the starter models, and the starter box
 * "about 4.5 GiB in all": both were the models alone, about 1.5 GB short, because Ollama's own size
 * was not known to the code (plan 105, § 12, found 2026-11-16).
 *
 * Does not: Measure anything while the plugin runs, or know a size of something not listed here (the
 * knowledge library's size is only known once its list file is fetched).
 */

/** One download: its size in MB, for adding up, and the rounded words a person reads. */
export type DownloadSize = { mb: number; label: string };

/**
 * Ollama itself: the file the Deck fetches, ollama-linux-amd64.tar.zst, was 1,371 to 1,474 MiB over
 * its last 11 releases (0.40.6 to 0.40.16), 1,442 on average (Ollama's release page on GitHub, read
 * 2026-11-16). It unpacks to 2.4 GB on the Deck.
 */
export const OLLAMA_DOWNLOAD_SIZE: DownloadSize = { mb: 1510, label: "about 1.5 GB" };

/** The answer model gemma4:e2b-it-qat: 4,336 MB on Ollama's own model site (read 2026-11-16). */
export const ANSWER_MODEL_DOWNLOAD_SIZE: DownloadSize = { mb: 4336, label: "about 4.3 GB" };

/** The note-search model nomic-embed-text: 274 MB on Ollama's own model site (read 2026-11-16). */
export const NOTE_SEARCH_MODEL_DOWNLOAD_SIZE: DownloadSize = { mb: 274, label: "about 270 MB" };

/**
 * The speech models tiny.en and base.en: 78 and 148 MB, the plugin's own figure
 * (voice_model_download_service.py, VOICE_STT_MODEL_SPECS), not measured again on 2026-11-16.
 */
export const SPEECH_MODELS_DOWNLOAD_SIZE: DownloadSize = { mb: 230, label: "about 230 MB" };

/**
 * The voice engine's build image, the exact version voice_engine_build_service.py pins: 503 MB on
 * its publisher's page on ghcr.io (read 2026-11-16). The build then fetches its compilers too.
 */
export const VOICE_ENGINE_DOWNLOAD_SIZE: DownloadSize = { mb: 503, label: "about 500 MB" };

/** A size in the same rounded words as the constants: "about 6.9 GB", "about 270 MB". */
export function aboutSize(mb: number): string {
  return mb >= 1000 ? `about ${(mb / 1000).toFixed(1)} GB` : `about ${Math.round(mb / 10) * 10} MB`;
}

/** The total of some of the downloads above, in the same rounded words. */
export function totalDownloadSize(sizes: readonly DownloadSize[]): string {
  return aboutSize(sizes.reduce((sum, s) => sum + s.mb, 0));
}
