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
 * It also tells runningJobs.ts whether it is in sight (`useJobFaceInSight`): its top row wholly inside Steam's
 * scroll pane and above the tab's help strip. The bar at the bottom of the panel (JobBar.tsx) shows the job only
 * while its card is not in sight: its section folded shut (the card is not drawn), scrolled off, or another tab.
 * After the job, the line under its buttons that says how it ended is its face: the owner hands that line to the
 * same hook, and the bar's result goes once the person can read it there.
 *
 * Does not: Decide where the ring goes. Cancel is the card's one stop, a Decky Button inside a Focusable that holds
 * the moves its owner hands in (Up, Down) and a Steam node (`cancelNavRef`) the owner transfers the ring onto; Left
 * and Right hold still, so the ring never leaves the card sideways. A press on Cancel goes through `cancelJob`,
 * which ignores one in the first half second (a double press on the starting button cannot start and cancel at once).
 */
import React, { useLayoutEffect, useRef } from "react";
import { Button, Focusable } from "@decky/ui";

import { findTabContentsScroll } from "../../shared/dpad/chatPanelScroll";
import { FOCUS_RING_BTN_CLASS } from "../../styles/settingsGlassButton";
import { cancelJob, noteJobCardSeen, type RunningJob } from "./runningJobs";

/**
 * Is `face` (the card's Cancel, on its top row) wholly on screen: inside Steam's scroll pane, and above the help
 * strip's dock where the tab has one? A card drawn outside any pane (a test drawing it alone) counts as in sight.
 */
function inSight(face: HTMLElement): boolean {
  const pane = findTabContentsScroll(face);
  if (!pane) return true;
  const r = face.getBoundingClientRect();
  if (!r.height) return false;
  const p = pane.getBoundingClientRect();
  // Reading the dock's edge is a measurement, not a hop: nothing here moves the ring.
  const dock = pane.closest(".bonsai-decky-tabs-root")?.querySelector<HTMLElement>(":scope > .bonsai-fold-dock");
  const d = dock?.getBoundingClientRect();
  const bottom = d && d.height > 0 ? Math.min(p.bottom, d.top) : p.bottom;
  return r.top >= p.top - 0.5 && r.bottom <= bottom + 0.5;
}

/**
 * Keep runningJobs.ts told whether job `id`'s face (its card's top row, or after the job the line saying how it
 * ended) is in sight: now, on every scroll or resize of the pane, and "no" once it goes.
 */
export function useJobFaceInSight(id: string, faceRef: React.RefObject<HTMLElement | null>): void {
  useLayoutEffect(() => {
    const face = faceRef.current;
    if (!face) return;
    const pane = findTabContentsScroll(face);
    let frame = 0;
    const look = () => {
      frame = 0;
      noteJobCardSeen(id, face.isConnected && inSight(face));
    };
    const soon = () => {
      if (!frame) frame = window.setTimeout(look, 16);
    };
    look();
    pane?.addEventListener("scroll", soon, { passive: true });
    const watch = pane && typeof ResizeObserver !== "undefined" ? new ResizeObserver(soon) : null;
    if (pane) watch?.observe(pane);
    return () => {
      pane?.removeEventListener("scroll", soon);
      watch?.disconnect();
      if (frame) window.clearTimeout(frame);
      noteJobCardSeen(id, false);
    };
  }, [id, faceRef]);
}

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
  const faceRef = useRef<HTMLButtonElement | null>(null);
  useJobFaceInSight(job.id, faceRef);
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
            ref={(el: HTMLDivElement | null) => {
              faceRef.current = el as HTMLButtonElement | null;
              cancelButtonRef?.(el as HTMLButtonElement | null);
            }}
            className={`${FOCUS_RING_BTN_CLASS} bonsai-job-cancel`}
            data-stopping={stopping ? "true" : "false"}
            onClick={() => void cancelJob(job.id)}
            aria-label={cancelLabel}
          >
            {stopping ? "Stopping" : "Cancel"}
            {stopping ? null : (
              <i className="bonsai-job-key" aria-hidden="true">
                X
              </i>
            )}
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
