/**
 * Title: Asking for chip suggestions drawn from this game's own notes
 *
 * Purpose: Before showing the row of suggested-question chips for the game currently being
 * played, the plugin can ask the back end for chip text drawn from that game's own notes (its
 * entry in the plugin's knowledge base), rather than only the fixed set built into the plugin.
 * This file makes that request and turns whatever comes back into a clean list of chips the
 * carousel can use, dropping anything that arrives without real text or a category.
 *
 * Used for: the preset carousel's per-session suggestions on the Main tab.
 *
 * Solves: without this, the carousel could either break on an unexpected shape from the back
 * end, or show duplicate or blank chips when the notes for a game overlap or are incomplete.
 *
 * Does not: decide which chips actually get shown or in what order — that is
 * `sessionRagComposer`'s own mixing logic. This file only fetches and cleans the list of
 * candidates it chooses from.
 *
 * Gotchas:
 *   - A request that fails outright (a timeout, the back end being unreachable) and a request
 *     that succeeds but says "not available right now" (the knowledge base being off, a game
 *     with no notes, a notes file that failed to read) are handled differently on purpose: the
 *     second is only logged quietly as a warning, since it is an expected, common case; the
 *     first is logged as an error, since something actually failed. Either way, the carousel
 *     falls back to its fixed set of chips.
 */
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS, formatDeckyRpcError } from "./deckyCall";
import type { SessionRagChipCandidate } from "../features/preset-carousel/sessionRagComposer";

type SessionRagChipCandidatesRpcResult = {
  ok?: boolean;
  reason?: string;
  candidates?: Array<{
    text?: string;
    category?: string;
    prefer_ask_mode?: string | null;
    domain?: string;
  }>;
};

function normalizeCandidate(raw: {
  text?: string;
  category?: string;
  prefer_ask_mode?: string | null;
  domain?: string;
}): SessionRagChipCandidate | null {
  const text = typeof raw?.text === "string" ? raw.text.trim() : "";
  const category = typeof raw?.category === "string" ? raw.category.trim() : "";
  if (!text || !category) {
    return null;
  }
  const prefer = raw?.prefer_ask_mode;
  const preferAskMode =
    prefer === "speed" || prefer === "strategy" || prefer === "expert" ? prefer : undefined;
  return {
    text,
    category,
    ...(preferAskMode ? { preferAskMode } : {}),
    ...(typeof raw?.domain === "string" && raw.domain ? { domain: raw.domain } : {}),
  };
}

export async function fetchSessionRagChipCandidates(args: {
  appId: string;
  appName: string;
  shortcutName?: string;
}): Promise<SessionRagChipCandidate[]> {
  try {
    const result = await callDeckyWithTimeout<
      [string, string, string],
      SessionRagChipCandidatesRpcResult
    >(
      "get_session_rag_chip_candidates",
      [args.appId, args.appName, args.shortcutName ?? ""],
      DECKY_RPC_TIMEOUT_MS,
    );
    if (!result?.ok || !Array.isArray(result.candidates)) {
      console.warn(
        "[bonsAI] get_session_rag_chip_candidates returned no usable candidates; falling back to static preset chips.",
        result?.reason ?? "no reason given"
      );
      return [];
    }
    const out: SessionRagChipCandidate[] = [];
    const seen = new Set<string>();
    for (const raw of result.candidates) {
      const normalized = normalizeCandidate(raw);
      if (!normalized || seen.has(normalized.text)) {
        continue;
      }
      seen.add(normalized.text);
      out.push(normalized);
    }
    return out;
  } catch (e) {
    // The RPC reports KB-off, a missing corpus and a corpus read failure as
    // {ok: false} rather than by rejecting, so reaching here means the call
    // itself failed (timeout, backend down). The carousel falls back to static
    // seeds either way; log so the failure is visible on-device.
    console.error(
      "[bonsAI] get_session_rag_chip_candidates failed; session RAG preset chips unavailable:",
      formatDeckyRpcError(e)
    );
    return [];
  }
}
