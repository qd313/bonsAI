/**
 * Title: What the first-time setup's card says about the run: how far, which sites, what was kept
 *
 * Purpose: The plain parts of the card on the Main chat (FirstRunSetupCard.tsx) that follow the run the first-time
 * setup started: the bar's share of the whole download (each piece weighted by its size, the piece downloading now by
 * the percent its own line shows), the sites the run reaches (only the pieces not left out), and, after a Stop, the
 * line "Stopped. Kept: … Not installed: …" read from the back end's record of each piece (starter_left_out.py).
 *
 * Used for: main-tab/FirstRunSetupCard.tsx.
 *
 * Solves: The brief's "keep a line saying what was left if a step is cancelled", and a bar that moves with the real
 * download rather than with the step count (the answer model is 4.3 of the 6.9 GB).
 *
 * Does not: Read the status itself or draw anything.
 */
import type { LocalOllamaSetupStatus } from "../ai-connection/OllamaWhereAiRunsSection.types";
import {
  ANSWER_MODEL_DOWNLOAD_SIZE,
  NOTE_SEARCH_MODEL_DOWNLOAD_SIZE,
  OLLAMA_DOWNLOAD_SIZE,
  SPEECH_MODELS_DOWNLOAD_SIZE,
  VOICE_ENGINE_DOWNLOAD_SIZE,
} from "../downloads/downloadSizes";
import { VOICE_BUILD_PACKAGE_SITES } from "../downloads/downloadSites";
import type { StarterLeftOut } from "../models/starterSetLeftOut";

type Piece = "ollama" | "answer" | "note_search" | "speech" | "voice";

/** `sites`: where the piece comes from. The voice engine's build also reaches its image's package servers. */
const PIECES: readonly { id: Piece; name: string; mb: number; sites: readonly string[] }[] = [
  { id: "ollama", name: "Ollama", mb: OLLAMA_DOWNLOAD_SIZE.mb, sites: ["ollama.com", "github.com"] },
  { id: "answer", name: "the answer model", mb: ANSWER_MODEL_DOWNLOAD_SIZE.mb, sites: ["registry.ollama.ai"] },
  { id: "note_search", name: "the note-search model", mb: NOTE_SEARCH_MODEL_DOWNLOAD_SIZE.mb, sites: ["registry.ollama.ai"] },
  { id: "speech", name: "the speech models", mb: SPEECH_MODELS_DOWNLOAD_SIZE.mb, sites: ["huggingface.co"] },
  { id: "voice", name: "the voice engine", mb: VOICE_ENGINE_DOWNLOAD_SIZE.mb, sites: ["ghcr.io", ...VOICE_BUILD_PACKAGE_SITES] },
];

const leftOutPiece = (id: Piece, leaveOut: readonly StarterLeftOut[]) =>
  (id === "note_search" && leaveOut.includes("note_search")) || ((id === "speech" || id === "voice") && leaveOut.includes("voice"));

function joinNames(names: string[]): string {
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : (names[0] ?? "");
}

/** The sites the run reaches, for the card's small print. */
export function setupSitesLine(leaveOut: readonly StarterLeftOut[]): string {
  const counted = PIECES.filter((p) => !leftOutPiece(p.id, leaveOut));
  const sites = [...new Set(counted.flatMap((p) => p.sites))];
  // The package servers are download networks that may hand a file on to another site: say so when the voice build runs.
  const handOff = counted.some((p) => p.id === "voice") ? ", and the sites they hand off to" : "";
  return `Stop works at any moment. Downloads come from ${joinNames(sites)}${handOff}.`;
}

/** Which piece is downloading now, from the run's stage and line. */
function pieceNow(st: LocalOllamaSetupStatus, pieces: Record<string, string>): Piece | null {
  if (st.stage === "install" || st.stage === "check" || st.stage === "restart" || st.stage === "service") return "ollama";
  if (st.stage !== "pull") return null;
  if (st.current_tag) return st.current_tag.startsWith("nomic-embed-text") ? "note_search" : "answer";
  return pieces.speech === "waiting" ? "speech" : pieces.voice === "waiting" ? "voice" : null;
}

/** The bar: how much of the whole download is done, 0 to 100. */
export function setupProgressPercent(st: LocalOllamaSetupStatus | null, leaveOut: readonly StarterLeftOut[]): number {
  if (!st) return 0;
  if (st.phase === "done") return 100;
  const pieces = st.starter_pieces ?? {};
  const counted = PIECES.filter((p) => !leftOutPiece(p.id, leaveOut));
  const total = counted.reduce((sum, p) => sum + p.mb, 0);
  const now = pieceNow(st, pieces);
  const share = /(\d{1,3})%/.exec(st.progress_text ?? "");
  const done = counted.reduce((sum, p) => {
    if (pieces[p.id] === "done") return sum + p.mb;
    if (p.id === now && share) return sum + (p.mb * Math.min(100, Number(share[1]))) / 100;
    return sum;
  }, 0);
  return Math.max(0, Math.min(99, Math.round((100 * done) / total)));
}

/** After a Stop: what was kept and what was not installed; just "Stopped." when the run kept no record. */
export function stoppedLine(st: LocalOllamaSetupStatus | null): string {
  const pieces = st?.starter_pieces;
  if (!pieces) return "Stopped.";
  const named = PIECES.filter((p) => pieces[p.id] && pieces[p.id] !== "left_out");
  const kept = named.filter((p) => pieces[p.id] === "done").map((p) => p.name);
  const rest = named.filter((p) => pieces[p.id] !== "done").map((p) => p.name);
  return `Stopped. Kept: ${kept.length ? joinNames(kept) : "nothing"}. Not installed: ${rest.length ? joinNames(rest) : "nothing"}.`;
}
