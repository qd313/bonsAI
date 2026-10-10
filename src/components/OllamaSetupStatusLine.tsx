/**
 * Title: The line under Update AI & models and Install Ollama
 *
 * Purpose: Shows what the local Ollama setup run is doing, in place on the Ollama tab with no box:
 * while it runs, one line that changes (the stage, or the model being downloaded with its newest
 * progress); when it ends, one line with the result (the sentence the back end wrote, which names the
 * version now answering) or the reason it failed or was cancelled, in plain words.
 *
 * Used for: OllamaWhereAiRunsSection, directly under the Cancel row of the "Local Ollama setup" block.
 *
 * Solves: Update and Install used to open a download box and then showed only a bare stage word; the
 * maintainer asked (plan 87, call 2) for the run to be seen right on the tab. Everything here is read
 * from the setup status the back end keeps (polled by useLocalOllamaSetupFlow), never from this
 * component's own memory, because closing a Decky box rebuilds the tab and in-memory state is lost.
 *
 * Does not: take the ring. Every element here is plain text; the Cancel button and the Update button
 * above it are the only stops.
 */
import type { LocalOllamaSetupStatus } from "./OllamaWhereAiRunsSection.types";

const SUCCESS_TEXT = "#86efac";

/** Backticks in the back end's error text are for a terminal, not for a person. */
function plainWords(text: string): string {
  return text.replace(/`+/g, "");
}

/** In: the setup status the back end keeps, the stage wording for a run in progress, and whether one is running. Out: the lines to draw under the buttons. */
export function OllamaSetupStatusLine({
  status,
  stageLine,
  busy,
}: {
  status: LocalOllamaSetupStatus | null;
  stageLine: string;
  busy: boolean;
}) {
  const logLines = status?.log_tail ?? [];
  const ended = status != null && status.phase !== "running" && status.phase !== "idle";
  const failed = status?.phase === "failed" || status?.phase === "cancelled";
  const doneLine = status?.phase === "done" && !(status.error ?? "").trim() ? ((status.result_line ?? "").trim() || "Done.") : "";

  if (!status || (!busy && !ended && logLines.length === 0)) {
    return (
      <div className="bonsai-prose" style={{ fontSize: 10, color: "#6b7c90", userSelect: "none" }}>
        Install the official daemon, restart the service if needed, then pull models. Prefer stable Wi‑Fi.
      </div>
    );
  }
  return (
    <>
      {status.phase === "running" ? (
        <div className="bonsai-settings-bleed" style={{ fontSize: 11, color: "#9ce7ff", lineHeight: 1.4 }} aria-live="polite">
          {stageLine}
        </div>
      ) : null}
      {doneLine ? (
        <div
          className="bonsai-prose bonsai-settings-bleed"
          style={{ fontSize: 11, color: SUCCESS_TEXT, lineHeight: 1.35 }}
          aria-live="polite"
        >
          {doneLine}
        </div>
      ) : null}
      {failed && status.error ? (
        <div
          className="bonsai-prose bonsai-settings-bleed"
          style={{ fontSize: 11, color: "tomato", lineHeight: 1.35, whiteSpace: "pre-wrap" }}
          aria-live="polite"
        >
          {status.phase === "cancelled" ? plainWords(status.error) : `Failed: ${plainWords(status.error)}`}
        </div>
      ) : null}
      {logLines.length > 0 ? (
        <pre
          className="bonsai-settings-bleed"
          style={{
            margin: 0,
            width: "100%",
            boxSizing: "border-box",
            maxHeight: 200,
            overflowY: "auto",
            fontFamily: "Consolas, 'Liberation Mono', monospace",
            fontSize: 10,
            lineHeight: 1.35,
            color: "#aab8ca",
            background: "rgba(8,14,22,0.85)",
            border: "1px solid rgba(72,98,124,0.35)",
            borderRadius: 4,
            padding: "8px 10px",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
          aria-label="Local Ollama setup log"
        >
          {logLines.join("\n")}
        </pre>
      ) : busy ? (
        <div className="bonsai-prose" style={{ fontSize: 10, color: "#6b7c90", userSelect: "none" }}>
          Setup is running. The line above changes as it goes; a first-time install can take a few minutes.
        </div>
      ) : null}
    </>
  );
}
