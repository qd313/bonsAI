/**
 * Title: The lines under the library's Download / Update and Remove buttons
 *
 * Purpose: What the Knowledge base section says under its two buttons when no download is running (board 5, tab 2,
 * round 2 "Elsewhere": `b5t2Zone2`): the last result (done, cancelled, or the reason it failed) and, always, the
 * sites the download comes from. While a download runs it is not drawn: the job card shows the run.
 *
 * Used for: KnowledgeBaseSection.tsx, in its own row under the buttons.
 *
 * Solves: The library said "Download cancelled" and the error inside its status paragraph and never said where the
 * download comes from. It is also the job's "face" once the download is over: the bar at the bottom of the panel
 * (which says how a download ended while its card was out of sight, and keeps a failure) goes once a person can read
 * the same words here (downloads/JobCard.tsx, `useJobFaceInSight`).
 *
 * Does not: take the ring. Everything here is plain text.
 */
import React, { useRef } from "react";

import { useJobFaceInSight } from "../downloads/JobCard";
import { textPx } from "../../styles/textPx";
import { KB_LIBRARY_JOB, KB_LIBRARY_SITES } from "./knowledgeLibraryJob";

export type KbLibraryResultLinesProps = {
  /** The last download ended in "cancelled". */
  cancelled: boolean;
  /** The last download finished and installed; the sentence to say ("Library updated."). */
  doneSentence: string | null;
  /** The back end's reason the last download failed, or "". */
  errorText: string;
};

export function KbLibraryResultLines({ cancelled, doneSentence, errorText }: KbLibraryResultLinesProps): React.ReactElement {
  const ref = useRef<HTMLDivElement | null>(null);
  useJobFaceInSight(KB_LIBRARY_JOB, ref);
  return (
    <div ref={ref} className="bonsai-prose bonsai-settings-bleed" style={{ display: "flex", flexDirection: "column", gap: 2, userSelect: "none" }}>
      {doneSentence ? (
        <div style={{ fontSize: textPx(11), lineHeight: 1.35, color: "#86efac" }} aria-live="polite">
          <span aria-hidden="true">✓ </span>
          {doneSentence}
        </div>
      ) : null}
      {cancelled ? (
        <div style={{ fontSize: textPx(11), lineHeight: 1.35, color: "#9fb7d5" }} aria-live="polite">
          Download cancelled. Nothing was installed — start it again whenever you like.
        </div>
      ) : null}
      {errorText ? (
        <div style={{ fontSize: textPx(11), lineHeight: 1.35, color: "#ff9b9b" }} aria-live="polite">
          {errorText}
        </div>
      ) : null}
      <div style={{ fontSize: textPx(10), lineHeight: 1.35, color: "#6b7c90" }}>{KB_LIBRARY_SITES}</div>
    </div>
  );
}
