/**
 * Title: The job card: one running download where its buttons were, with Cancel at its top right
 *
 * Purpose: While a long job runs, the buttons that start it give way to this one card (plan 105, board 5 tab 2,
 * round 2 B and "Elsewhere"): what is downloading, how far, how fast, the sites it comes from, and Cancel. It is
 * 110 px tall in every state (jobLook.ts adds the parts up), so nothing below it moves while it runs.
 *
 * Used for: OllamaWhereAiRunsSection.tsx (Install / Update) now; lane D4b puts the knowledge library's download and
 * the voice install on it. Any job: the card reads a `RunningJob` from runningJobs.ts and knows nothing else.
 *
 * Solves: Cancel used to be a red button on a row of its own under greyed buttons, with a box of raw installer lines
 * below; the maintainer picked one card instead (board 5, tab 2, round 2, "Let's go with this one").
 *
 * Does not: Decide where the ring goes. Cancel is the card's one stop, a Decky Button inside a Focusable that holds
 * the moves its owner hands in (Up, Down) and a Steam node (`cancelNavRef`) the owner transfers the ring onto; Left
 * and Right hold still, so the ring never leaves the card sideways. A press on Cancel goes through `cancelJob`,
 * which ignores one in the first half second (a double press on the starting button cannot start and cancel at once).
 */
import React from "react";
import { Button, Focusable } from "@decky/ui";

import { FOCUS_RING_BTN_CLASS } from "../../styles/settingsGlassButton";
import { cancelJob, type RunningJob } from "./runningJobs";

export type JobCardProps = {
  job: RunningJob;
  /** Cancel's name for a screen reader and the tests ("Cancel local Ollama setup"). */
  cancelLabel: string;
  /** Steam fills this with Cancel's own node, so the owner's moves onto it are a transfer. */
  cancelNavRef: { current: unknown };
  onMoveUp: () => boolean;
  onMoveDown: () => boolean;
  /** A ref on Cancel's Focusable (the owner's ring hand-off when the card goes, useHandRingOnGone). */
  cancelRowRef?: (el: HTMLElement | null) => void;
  /** Cancel's button element, for the owner's own focus when a transfer did not land the ring. */
  cancelButtonRef?: (el: HTMLButtonElement | null) => void;
  /** The help strip's attributes for Cancel's row (helpAttributes), if the tab has a strip. */
  help?: Record<string, string | undefined>;
};

/** The card. The fill's width is the job's fraction; with no fraction the bar shows moving stripes. */
export function JobCard({
  job,
  cancelLabel,
  cancelNavRef,
  onMoveUp,
  onMoveDown,
  cancelRowRef,
  cancelButtonRef,
  help,
}: JobCardProps): React.ReactElement {
  const { face, stopping } = job;
  const fraction = face.fraction === null ? null : Math.max(0, Math.min(1, face.fraction));
  return (
    <div className="bonsai-job-card" data-bonsai-job-card={job.id} aria-live="polite">
      <div className="bonsai-job-card__head">
        <span className="bonsai-job-card__title">{stopping ? face.stoppingTitle : face.title}</span>
        <Focusable
          ref={cancelRowRef}
          className="bonsai-job-cancel-host"
          {...help}
          {...({
            navRef: cancelNavRef,
            onMoveUp,
            onMoveDown,
            onMoveLeft: () => true,
            onMoveRight: () => true,
          } as Record<string, unknown>)}
        >
          <Button
            ref={(el: HTMLDivElement | null) => cancelButtonRef?.(el as HTMLButtonElement | null)}
            className={`${FOCUS_RING_BTN_CLASS} bonsai-job-cancel`}
            data-stopping={stopping ? "true" : "false"}
            onClick={() => void cancelJob(job.id)}
            aria-label={cancelLabel}
          >
            {stopping ? "Stopping" : "Cancel"}
          </Button>
        </Focusable>
      </div>
      <div className="bonsai-job-progress" aria-hidden="true">
        <span
          className="bonsai-job-progress__fill"
          data-moving={fraction === null ? "true" : "false"}
          style={fraction === null ? undefined : { width: `${Math.round(fraction * 1000) / 10}%` }}
        />
      </div>
      <div className="bonsai-job-card__zone">
        <div className="bonsai-job-card__line bonsai-job-card__line--now">{face.line1}</div>
        <div className="bonsai-job-card__line bonsai-job-card__line--far">{face.line2}</div>
        <div className="bonsai-job-card__line bonsai-job-card__line--sites">{face.sites}</div>
      </div>
    </div>
  );
}
