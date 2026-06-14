import { call } from "@decky/api";
import { bonsaiDebugLog } from "./bonsaiDebugIngest";

const DEBUG_SESSION_ID = "e214c4";

/**
 * Debug probes: always write to on-device HUD ring; mirror to Deck plugin log via dbg_fe_log RPC
 * (works on remote Deck without a PC ingest tunnel).
 */
export function debugSessionLog(
  location: string,
  message: string,
  hypothesisId: string,
  data?: Record<string, unknown>
): void {
  const payload = {
    sessionId: DEBUG_SESSION_ID,
    location,
    message,
    hypothesisId,
    data,
    timestamp: Date.now(),
  };
  bonsaiDebugLog(location, message, hypothesisId, data);
  // #region agent log
  try {
    void call("dbg_fe_log", `${location} | ${message}`, payload).catch(() => {});
  } catch {
    /* ignore */
  }
  // #endregion
}
