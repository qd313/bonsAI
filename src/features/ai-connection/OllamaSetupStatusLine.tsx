/**
 * Title: The lines under Update AI & models and Install Ollama
 *
 * Purpose: What the "Local Ollama setup" block says under its two buttons when no run is going (board 5, tab 2,
 * round 2: `b5t2Zone2`): the hint before any run, or the last run's result (the sentence the back end wrote, which
 * names the version now answering), the reason it failed, or that it was cancelled; and under that, always, the sites
 * the downloads come from. While a run goes it says nothing: the job card above shows the run.
 *
 * Used for: OllamaLocalSetupBlock.tsx, directly under the buttons (or the card).
 *
 * Solves: The maintainer asked to see a run on the tab (plan 87, call 2); plan 105 moved the moving line onto the job
 * card and took the box of raw installer lines off the tab (the plan's small question 2; the lines still go to the
 * plugin's log). Before, "Cancelled" was drawn red like a failure, and no line said where the downloads come from.
 * Everything here is read from the setup status the back end keeps, never from this component's own memory, because
 * closing a Decky box rebuilds the tab and in-memory state is lost.
 *
 * Does not: take the ring. Every element here is plain text.
 */
import type { CSSProperties, ReactElement } from "react";
import type { LocalOllamaSetupStatus } from "./OllamaWhereAiRunsSection.types";
import { DOWNLOADS_OFF_FAILED_LINE } from "../downloads/downloadNotice";
import { textPx } from "../../styles/textPx";

const SUCCESS_TEXT = "#86efac";
/** Where Install and Update download from (downloadSites.ts: OLLAMA_SITE and OLLAMA_REGISTRY_SITE). */
const SITES_LINE = "From ollama.com and registry.ollama.ai";
const LINE: CSSProperties = { fontSize: textPx(11), lineHeight: 1.35 };

/** Backticks in the back end's error text are for a terminal, not for a person. */
function plainWords(text: string): string {
  return text.replace(/`+/g, "");
}

/** The result line for a run that has ended, or null for none (no run yet, or still going). */
function resultLine(status: LocalOllamaSetupStatus | null): ReactElement | null {
  if (!status || status.phase === "running" || status.phase === "idle") return null;
  if (status.phase === "done" && !(status.error ?? "").trim()) {
    return (
      <div className="bonsai-prose bonsai-settings-bleed" style={{ ...LINE, color: SUCCESS_TEXT }} aria-live="polite">
        <span aria-hidden="true">✓ </span>
        <span>{(status.result_line ?? "").trim() || "Done."}</span>
      </div>
    );
  }
  if (!status.error) return null;
  const quiet = status.phase === "cancelled";
  return (
    <div
      className="bonsai-prose bonsai-settings-bleed"
      style={{ ...LINE, color: quiet ? "#9fb7d5" : "tomato", whiteSpace: "pre-wrap" }}
      aria-live="polite"
    >
      {quiet || status.error === DOWNLOADS_OFF_FAILED_LINE ? plainWords(status.error) : `Failed: ${plainWords(status.error)}`}
    </div>
  );
}

/** In: the setup status the back end keeps, and whether a run is going. Out: the lines under the buttons. */
export function OllamaSetupStatusLine({
  status,
  busy,
}: {
  status: LocalOllamaSetupStatus | null;
  busy: boolean;
}) {
  if (busy) return null;
  const result = resultLine(status);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, userSelect: "none" }}>
      {result ?? (
        <div className="bonsai-prose" style={{ fontSize: textPx(10), color: "#8fa0b4", lineHeight: 1.35 }}>
          Install the official daemon, restart the service if needed, then pull models. Prefer stable Wi‑Fi.
        </div>
      )}
      <div className="bonsai-prose" style={{ fontSize: textPx(10), color: "#6b7c90", lineHeight: 1.35 }}>
        {SITES_LINE}
      </div>
    </div>
  );
}
