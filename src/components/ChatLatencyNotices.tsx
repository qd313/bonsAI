/**
 * Title: The chat's slow-answer and tuning notices
 *
 * Purpose: The three short yellow lines under a chat's reply area: "Slow (>Ns): ensure Ollama uses your
 * GPU" while an answer is still being written, "Ns (>Ns): prefer GPU for Ollama" once a finished answer
 * took too long, and the line saying which tuning the answer was run with. Moved out of
 * MainTabChatTranscript.tsx unchanged, so that file stays under its size limit (plan 89).
 *
 * Used for: MainTabChatTranscript.tsx, in the same place the three lines always sat.
 *
 * Solves: Nothing new. Plain text rows: no buttons, no focus stops, no move handlers.
 *
 * Does not: Decide when an answer is slow (the caller's latency limit does) or work out the tuning
 * text (formatAppliedTuningBannerText does).
 */
import { PanelSectionRow } from "@decky/ui";
import { textPx } from "../styles/sections/textPx";

export type ChatLatencyNoticesProps = {
  isAsking: boolean;
  showSlowWarning: boolean;
  isStreamingPreview: boolean;
  latencyWarningSeconds: number;
  showEmptySlotPreview: boolean;
  elapsedSeconds: number | null;
  appliedTuningBannerText: string | null;
};

export function ChatLatencyNotices({
  isAsking,
  showSlowWarning,
  isStreamingPreview,
  latencyWarningSeconds,
  showEmptySlotPreview,
  elapsedSeconds,
  appliedTuningBannerText,
}: ChatLatencyNoticesProps) {
  return (
    <>
      {isAsking && showSlowWarning && !isStreamingPreview && (
        <PanelSectionRow>
          <div className="bonsai-chat-status-line" style={{ color: "#f2cf84", fontSize: textPx(12), padding: "6px 0", lineHeight: 1.35 }}>
            Slow (&gt;{latencyWarningSeconds}s): ensure <strong>Ollama</strong> uses your <strong>GPU</strong>, not{" "}
            <strong>CPU</strong>.
          </div>
        </PanelSectionRow>
      )}
      {!showEmptySlotPreview && !isAsking && elapsedSeconds != null && elapsedSeconds > latencyWarningSeconds && (
        <PanelSectionRow>
          <div style={{ color: "#f2cf84", fontSize: textPx(12), lineHeight: 1.35 }}>
            {elapsedSeconds}s (&gt;{latencyWarningSeconds}s): prefer <strong>GPU</strong> for <strong>Ollama</strong>, not{" "}
            <strong>CPU</strong>.
          </div>
        </PanelSectionRow>
      )}
      {!showEmptySlotPreview && appliedTuningBannerText && (
        <PanelSectionRow>
          <div style={{ color: "#f2cf84", fontSize: textPx(12), lineHeight: 1.35 }}>{appliedTuningBannerText}</div>
        </PanelSectionRow>
      )}
    </>
  );
}
