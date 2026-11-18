/**
 * Title: The bar at the bottom of the panel: a running download, with its Cancel, while its card is out of sight
 *
 * Purpose: One bar, 56 px, under everything at the very bottom of bonsAI's panel, on every tab (plan 105, board 5
 * tab 2, round 2 "Elsewhere", with B's rule): the job's title, what it is doing, a thin progress line, and Cancel.
 * It shows only while the job's card cannot be seen: its section folded shut, the card scrolled off, or another tab
 * (runningJobs.ts keeps which cards are in sight). The card never shrinks for it. With two jobs out of sight it
 * shows the newest and a "2 jobs" chip; A on the chip switches. When a job ends out of sight the bar says how it
 * ended for a few seconds (a failure stays until its card is seen), with no button.
 *
 * Used for: index.tsx draws it once, as the last child of bonsAI's tabs box. Lane D4b's jobs use it unchanged.
 *
 * Solves: Where the bar sits without covering anything. It is part of the tabs box's column, not drawn over it: the
 * stylesheet takes its height off Steam's scroll pane while it shows (jobLook.ts), so the pane, the Main tab's
 * question box and a folded tab's help strip (whose place is measured from the pane's bottom, TabHelpStrip.tsx) all
 * sit above it, and Steam's own scroll keeps the ring clear of it.
 *
 * Focus: the bar is outside Steam's pane, so every way onto it is a transfer onto a registered node: Down from a
 * folded tab's floating Open all button (`takeJobBar`), landing on Cancel. On the bar: Left from Cancel goes to the
 * "2 jobs" chip and Right from the chip back to Cancel; Left at the bar's left end (the chip, or Cancel alone) holds
 * twice and the third Left in a row goes out to Steam's menu (leftEdge.ts, plan 105 lane C5); Up and B go back to
 * where the ring came from; Down holds still; LB and RB switch tabs as from anywhere; X cancels the job shown. When the bar's Cancel goes away under the
 * ring (the job ended, or its card came into sight), the ring goes back to where it came from; with that gone, to
 * the tab's own first stop (the question box on Main), then the tab bar: never on nothing. The "2 jobs" chip goes the
 * same way: when it leaves under the ring (one of the two jobs ended, or its card came back) the ring goes to Cancel,
 * and if the bar goes with it, the way Cancel's own hand-over goes.
 *
 * Does not: Poll or start a job, or decide when a card is in sight (JobCard.tsx does).
 */
import React, { useEffect, useRef } from "react";
import { Button, Focusable } from "@decky/ui";

import { registerNavFocus, takeNavFocus, unregisterNavFocus, type NavFocusId, type NavRefHolder } from "../../shared/dpad/navFocusRegistry";
import { shoulderSwitchFromPress } from "../../shared/dpad/shoulderSwitch";
import { leftAtEdge } from "../../shared/dpad/leftEdge";
import { useHandRingOnGone } from "../../shared/dpad/useHandRingOnGone";
import { FOCUS_RING_BTN_CLASS } from "../../styles/settingsGlassButton";
import { cancelJob, cancelJobFromX, jobTitle, switchBarJob, useBarView, type BarView } from "./runningJobs";

/** Where the ring came onto the bar from, for Up, B and the bar going away. */
let cameFrom: NavFocusId | null = null;
/** The active tab, read off the tabs box the bar sits in, for the way back when `cameFrom` is gone. */
let activeTabOf: () => string = () => "";

/** Down onto the bar from `from` (a folded tab's Open all button): true when the bar is there and took the ring. */
export function takeJobBar(from: NavFocusId): boolean {
  if (!takeNavFocus("job-bar")) return false;
  cameFrom = from;
  return true;
}

/** Back off the bar: where the ring came from, else the tab's first stop, else the tab bar. */
function leaveBar(): boolean {
  if (cameFrom && takeNavFocus(cameFrom)) return true;
  const tab = activeTabOf();
  if (tab && takeNavFocus(tab === "main" ? "unified-input" : `tab-body:${tab}`)) return true;
  return takeNavFocus("tab-bar");
}

/** A Focusable's B: back off the bar, and the press is the bar's (B would otherwise be Decky's and leave the tab). */
function backOnB(e: unknown): void {
  leaveBar();
  (e as { preventDefault?: () => void })?.preventDefault?.();
}

/** X on the bar: cancel the job it shows. */
function cancelOnX(e: unknown): void {
  if (cancelJobFromX()) (e as { preventDefault?: () => void })?.preventDefault?.();
}

/** The bar's parts for a running job: the title row (spinner, title, "2 jobs", Cancel), the facts line, the progress. */
function RunningBar({
  view,
  cancelGone,
  chipGone,
}: {
  view: BarView;
  cancelGone: (el: HTMLElement | null) => void;
  chipGone: (el: HTMLElement | null) => void;
}): React.ReactElement {
  const job = view.job!;
  const cancelNavRef = useRef<NavRefHolder["current"]>(null);
  const moreNavRef = useRef<NavRefHolder["current"]>(null);
  useEffect(() => {
    registerNavFocus("job-bar", cancelNavRef);
    registerNavFocus("job-bar-more", moreNavRef);
    return () => {
      unregisterNavFocus("job-bar", cancelNavRef);
      unregisterNavFocus("job-bar-more", moreNavRef);
    };
  }, []);
  const fraction = job.face.fraction === null ? null : Math.max(0, Math.min(1, job.face.fraction));
  const common = { onMoveUp: () => leaveBar() || true, onMoveDown: () => true, onCancelButton: backOnB, onButtonDown: shoulderSwitchFromPress, onSecondaryButton: cancelOnX };
  return (
    <>
      <div className="bonsai-job-bar__row">
        <span className="bonsai-job-bar__spin" aria-hidden="true" />
        <span className="bonsai-job-bar__title">{jobTitle(job)}</span>
        {view.count > 1 ? (
          <Focusable
            ref={chipGone}
            className="bonsai-job-bar__host"
            {...({ ...common, navRef: moreNavRef, onMoveLeft: (e: unknown) => leftAtEdge("job-bar", e), onMoveRight: () => takeNavFocus("job-bar") || true } as Record<string, unknown>)}
          >
            <Button className={`${FOCUS_RING_BTN_CLASS} bonsai-job-bar__more`} onClick={switchBarJob} aria-label="Show the other running job">
              {view.count} jobs
            </Button>
          </Focusable>
        ) : null}
        <Focusable
          ref={cancelGone}
          className="bonsai-job-bar__host"
          {...({
            ...common,
            navRef: cancelNavRef,
            onMoveLeft: (e: unknown) => (view.count > 1 && takeNavFocus("job-bar-more")) || leftAtEdge("job-bar", e),
            onMoveRight: () => true,
          } as Record<string, unknown>)}
        >
          <Button
            className={`${FOCUS_RING_BTN_CLASS} bonsai-job-cancel bonsai-job-cancel--bar`}
            data-stopping={job.stopping ? "true" : "false"}
            onClick={() => void cancelJob(job.id)}
            aria-label={`Cancel: ${job.face.title}`}
          >
            {job.stopping ? "Stopping" : "Cancel"}
            {job.stopping ? null : (
              <i className="bonsai-job-key" aria-hidden="true">
                X
              </i>
            )}
          </Button>
        </Focusable>
      </div>
      <div className="bonsai-job-bar__line">{job.face.barLine ?? job.face.line1}</div>
      <div className="bonsai-job-progress bonsai-job-progress--bar" aria-hidden="true">
        <span
          className="bonsai-job-progress__fill"
          data-moving={fraction === null ? "true" : "false"}
          style={fraction === null ? undefined : { width: `${Math.round(fraction * 1000) / 10}%` }}
        />
      </div>
    </>
  );
}

/** The bar, or nothing. See the header. */
export function JobBar(): React.ReactElement | null {
  const view = useBarView();
  const elRef = useRef<HTMLDivElement | null>(null);
  /* Here, not in the running bar: that part goes with its Cancel when the job ends, and the hand-off must outlive it. */
  const cancelGone = useHandRingOnGone(() => void leaveBar());
  /* The "2 jobs" chip goes when a job ends or its card comes back: a ring on it goes to Cancel, or off the bar with it. */
  const chipGone = useHandRingOnGone(() => void (takeNavFocus("job-bar") || leaveBar()));
  activeTabOf = () => elRef.current?.closest(".bonsai-decky-tabs-root")?.getAttribute("data-bonsai-active-tab") ?? "";
  if (!view.job && !view.result) return null;
  const tone = view.result?.tone ?? "run";
  return (
    <div ref={elRef} className="bonsai-job-bar" data-bonsai-job-bar={view.job?.id ?? view.result?.id} data-tone={tone} aria-live="polite">
      {view.job ? (
        <RunningBar view={view} cancelGone={cancelGone} chipGone={chipGone} />
      ) : (
        <>
          <div className="bonsai-job-bar__row">
            <span className="bonsai-job-bar__mark" aria-hidden="true">
              {tone === "ok" ? "✓" : "✕"}
            </span>
            <span className="bonsai-job-bar__title">{view.result!.title}</span>
          </div>
          <div className="bonsai-job-bar__line">{view.result!.sentence}</div>
        </>
      )}
    </div>
  );
}
