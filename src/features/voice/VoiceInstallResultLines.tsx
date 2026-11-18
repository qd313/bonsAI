/**
 * Title: The lines under the voice install button
 *
 * Purpose: What the Voice input section says under its install button when no install is running (board 5, tab 2,
 * round 2 "Elsewhere": `b5t2Zone2`): that the last install was cancelled, or why it failed, and, always, the sites the
 * install comes from. While an install runs it is not drawn: the job card shows the run.
 *
 * Used for: VoiceInputSettingsSection.tsx, in its own row under the install button.
 *
 * Solves: The section showed the installer's error in red inside its status paragraph and never said where the install
 * comes from. It is also the job's "face" once the install is over: the bar at the bottom of the panel (which says how
 * an install ended while its card was out of sight, and keeps a failure) goes once a person can read the same words
 * here (downloads/JobCard.tsx, `useJobFaceInSight`).
 *
 * Does not: take the ring. Everything here is plain text.
 */
import React, { useRef } from "react";

import { useJobFaceInSight } from "../downloads/JobCard";
import { textPx } from "../../styles/textPx";
import { VOICE_INSTALL_JOB, VOICE_INSTALL_SITES } from "./voiceInstallJob";

export type VoiceInstallResultLinesProps = {
  /** The last install ended in "cancelled". */
  cancelled: boolean;
  /** The back end's reason the last install failed, or "". */
  errorText: string;
};

export function VoiceInstallResultLines({ cancelled, errorText }: VoiceInstallResultLinesProps): React.ReactElement {
  const ref = useRef<HTMLDivElement | null>(null);
  useJobFaceInSight(VOICE_INSTALL_JOB, ref);
  return (
    <div ref={ref} className="bonsai-settings-bleed" style={{ display: "flex", flexDirection: "column", gap: 2, userSelect: "none" }}>
      {cancelled ? (
        <div style={{ fontSize: textPx(11), lineHeight: 1.35, color: "#9fb7d5" }} aria-live="polite">
          Install cancelled. Press Install voice engine to start again.
        </div>
      ) : null}
      {errorText ? (
        <div style={{ fontSize: textPx(11), lineHeight: 1.35, color: "#f87171" }} aria-live="polite">
          {errorText}
        </div>
      ) : null}
      <div style={{ fontSize: textPx(10), lineHeight: 1.35, color: "#6b7c90" }}>{VOICE_INSTALL_SITES}</div>
    </div>
  );
}
