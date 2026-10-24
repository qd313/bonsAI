/**
 * Title: Stream scroll pin hook
 * Purpose: Follow the end of the transcript while tokens arrive, and hold position once the user
 *          scrolls up to read something behind it.
 * Used for: MainTab chat transcript anchor during background Ask streaming.
 * Solves: Auto-scroll fighting manual scroll-up during long replies, and its mirror image — text
 *         arriving below the fold with nothing bringing it into view. "The fold" is the top of the
 *         bottom-pinned dock, not the pane's bottom edge — see visibleBottom.
 * Does not: Find scroll containers — see chatPanelScroll.findTabContentsScroll.
 */
import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { findTabContentsScroll } from "../../../shared/dpad/chatPanelScroll";
import { liftAboveDock } from "../../../shared/dpad/useDockClearanceOnFocus";

/** How far the end of the transcript may sit below the fold and still count as "being watched". */
const FOLLOW_SLACK_PX = 48;

/** A scroll position within this many pixels of one we set is treated as our own. */
const SELF_SCROLL_EPSILON_PX = 1;

/** The bottom-pinned preset/Ask dock, which covers the foot of the pane while content overflows. */
const DOCK_SELECTOR = ".bonsai-main-tab-dock";

/**
 * How long after an Ask ends the hook keeps an eye on the ring.
 *
 * These passes used to deliver the answer's TAIL into view, because the slot reload after the
 * finish rebuilt the transcript and threw the pane back to 0 (measured 2026-08-31). Since plan 93
 * the reload keeps the live turn's own elements (useLiveTurnTwin.ts), so nothing is thrown back,
 * and the tail delivery was itself the jump the maintainer reported: on the Deck 2026-10-13
 * (plan93-M4-ANSWER-FINISH.json) the pane sat at 0 for the whole 50 s answer and then jumped
 * 1,264.7 px to the end 0.26 s after the finish. The maintainer's pick: at the finish the view does
 * not move. What is left is one narrow case: the ring is on a control in the chat and that control
 * is wholly out of view (a rebuild the twin could not prevent), and then only that control comes back.
 */
const DELIVERY_WINDOW_MS = 1200;

/** When those passes run, counted from the commit that ended the Ask. */
const DELIVERY_PASS_DELAYS_MS = [300, 900];

/**
 * The lowest point a reader can actually see inside the scroll pane.
 *
 * The Ask dock is `position: sticky; bottom: 0`, so whenever the content overflows it sits ON TOP
 * of the bottom ~245px of the pane. Measuring the fold at the pane's own bottom edge therefore
 * called the tail "in view" while it was behind the preset chips, and the follow stopped a dock's
 * height short of the end of the answer — which on device 2026-08-30 looked exactly like a long
 * reply being cut off mid-sentence. At the pane's maximum scroll the dock is back in normal flow
 * below the transcript, where its top is past the tail anyway, so the same expression is right in
 * both regimes and needs no special case.
 */
function visibleBottom(scroll: HTMLElement): number {
  const paneBottom = scroll.getBoundingClientRect().bottom;
  const dock = scroll.querySelector<HTMLElement>(DOCK_SELECTOR);
  if (!dock) return paneBottom;
  return Math.min(paneBottom, dock.getBoundingClientRect().top);
}

/** Steam puts this class on the one element holding the gamepad ring. */
const RING_SELECTOR = ".gpfocus";

/**
 * The element holding the gamepad ring when it sits on something that scrolls with the chat — the
 * transcript, or whatever scrolls above it — rather than on the dock. Null otherwise.
 *
 * Following the tail then scrolls the very control the person is on out of sight, and the D-pad's
 * own scrolls rarely take a pin, because a step near the end leaves the tail inside the slack.
 * Measured on device 2026-09-18 (plan61-QA-FREE-PLAY-01-streaming.json): six of eight stops on a
 * walk during a streaming answer were focused but off screen. The ring and not
 * `document.activeElement`, because the two disagree on the Deck and the ring is what a person sees.
 *
 * Anything above the transcript counts too: it scrolls away with it. On the Deck 2026-09-23 (plan
 * 64) a ring on the saved-chats row (since deleted) was carried off the top of the pane, from 14 to -183px, while the
 * answer below it grew. Only the dock is excluded: it is pinned to the bottom, so a ring on Ask or
 * Stop stays visible and still lets the follow run.
 */
function ringOnScrollingContent(scroll: HTMLElement): HTMLElement | null {
  const ring = scroll.querySelector<HTMLElement>(RING_SELECTOR);
  if (!ring) return null;
  const dock = scroll.querySelector<HTMLElement>(DOCK_SELECTOR);
  return dock && dock.contains(ring) ? null : ring;
}

/** Whether no part of `el` can be seen in the pane: wholly above it, or wholly at or below the fold. */
function whollyOutOfView(el: HTMLElement, scroll: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  return r.bottom <= scroll.getBoundingClientRect().top || r.top >= visibleBottom(scroll);
}

/**
 * Whether the user is still looking at the end of the transcript.
 *
 * Measured against the anchor rather than the panel's scroll maximum, which is what this used to
 * ask. The panel extends past the transcript — the session context strip and Save chat live below
 * it — so "within 48px of the panel bottom" is false the moment the newest text is on screen but
 * those rows are not. With nothing following, that only cost a stale pin; with following it would
 * latch the pin one frame after the first follow and stop the whole thing dead.
 */
function transcriptTailIsInView(anchor: HTMLElement, scroll: HTMLElement): boolean {
  const overshoot = anchor.getBoundingClientRect().bottom - visibleBottom(scroll);
  return overshoot <= FOLLOW_SLACK_PX;
}

/**
 * While tokens stream in, keep the newest text on screen — unless the user has scrolled up, in which
 * case hold exactly where they left off. When the Ask ends the view stays where it is (plan 93): for
 * a short window the hook only brings back a control the ring is on that is wholly out of view.
 *
 * HOW it scrolls matters more than when: assigning `scrollTop` on Steam's TabContentsScroll is a
 * no-op on device. Steam's own scroller re-asserts its recorded position around every commit, so a
 * direct write is erased before paint — measured on device 2026-08-31, three hundred consecutive
 * follow passes each wrote top+165px and each read back the value it started from, while the pane
 * crept downward only by exactly the content growth per frame. `scrollIntoView` is the one mover
 * Steam's scroller adopts (same trace: the expand-turn scrollIntoView visibly moved the pane), so
 * every scroll here goes through it, with `scroll-margin-bottom` standing in for "align to the
 * fold instead of the covered pane bottom".
 *
 * Both halves are driven by the same scroll listener, so touch and D-pad behave identically: the
 * D-pad's own panel steps set `scrollTop`, which fires `scroll` like a swipe does. Stepping down
 * through the answer therefore pins, and stepping to the bottom resumes the follow, without the
 * navigation code knowing this hook exists. A step that lands near the end takes no pin, though,
 * so the follow also holds while the gamepad ring is on the chat above the dock
 * (ringOnScrollingContent).
 */
export function useStreamScrollPin(
  anchorRef: RefObject<HTMLElement | null>,
  streamText: string,
  enabled: boolean
): void {
  const pinnedTopRef = useRef<number | null>(null);
  /** The last scrollTop this hook set, so its own scrolls are not read as the user's. */
  const selfWroteTopRef = useRef<number | null>(null);
  /** Content height at the previous scroll event, to tell a clamp from a deliberate scroll. */
  const lastScrollHeightRef = useRef(0);
  /** Whether the previous commit had the follow enabled — catches the commit that ends an Ask. */
  const wasEnabledRef = useRef(false);
  /** Wall-clock end of the post-Ask delivery window; 0 when no delivery is owed. */
  const deliverUntilRef = useRef(0);
  /** The latest pass, for the observer below to call; set by the follow effect each commit. */
  const followRef = useRef<() => void>(() => {});
  /** True while the observer below is the one following the stream, so commits need not. */
  const observerFollowsRef = useRef(false);

  /*
   * Computed during render, consumed by the effects of this same commit: the commit where enabled
   * flips false is ALSO the commit where the final answer text lands, so the effects below run one
   * more pass then (a ring pass only, since plan 93) rather than returning early.
   */
  const justEnded = wasEnabledRef.current && !enabled;

  /*
   * Reset on every transition, including *into* streaming: a pin taken during the previous answer —
   * or by the `expandedTurnKey` scrollIntoView that fires as a turn opens — would otherwise survive
   * into this one and freeze the view before a single token had arrived.
   *
   * A layout effect declared above the follow, so that on the commit where streaming begins the
   * reset has already happened. As a passive effect it ran *after* the first follow of the answer,
   * which is one commit too late — and it also wiped the position that follow had just recorded,
   * making the very next scroll event look like the user's.
   */
  useLayoutEffect(() => {
    pinnedTopRef.current = null;
  }, [anchorRef, enabled]);

  /*
   * While an answer streams, one observer on the transcript does the following, for the whole
   * answer. It fires after the browser has laid the page out and only when the transcript's
   * height changed -- a new line, not every letter -- so reading the tail's position there is
   * free. Following from the commit instead, on every step of the reveal, read positions in the
   * middle of React's commit and forced the whole panel to be laid out early each time: profiled on
   * the Deck 2026-09-24 with a game running (workshop:scripts/probe_deck_cpu_profile.py --callers
   * getBoundingClientRect), those reads were the largest single cost while answer text appeared.
   * It also used to be rebuilt on every commit and to defer each pass to the next frame, by which
   * time React had changed the page again. Declared before the follow effect, so on the commit
   * where streaming starts the follow already knows the observer has it. A runtime with no
   * ResizeObserver (the test runner) keeps following from every commit, as before.
   */
  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!enabled || !anchor || typeof ResizeObserver === "undefined") return;
    observerFollowsRef.current = true;
    const ro = new ResizeObserver(() => followRef.current());
    ro.observe(anchor);
    return () => {
      observerFollowsRef.current = false;
      ro.disconnect();
    };
  }, [anchorRef, enabled]);

  useEffect(() => {
    if (!enabled && !justEnded) return;

    const anchor = anchorRef.current;
    const scroll = findTabContentsScroll(anchor);
    if (!anchor || !scroll) return;

    lastScrollHeightRef.current = scroll.scrollHeight;

    const onScroll = () => {
      const top = scroll.scrollTop;
      /*
       * A CLAMP, not the user. Submitting an Ask replaces a long transcript with one short turn,
       * so the content collapses and the browser clamps scrollTop down to fit — which arrives as
       * an ordinary scroll event at a position nobody chose. Reading that as "the user scrolled
       * up" pinned the view at 0 for the whole answer, and every later pass then re-asserted 0.
       *
       * It is the normal path, not an edge case: reaching the ASK button by D-pad scrolls the pane
       * on the way down, so the clamp is guaranteed. Measured on device 2026-08-30 - three long
       * replies in a row settled with 872 to 1240px of scroll range and scrollTop still 0.
       */
      const shrank =
        lastScrollHeightRef.current > 0 && scroll.scrollHeight < lastScrollHeightRef.current;
      lastScrollHeightRef.current = scroll.scrollHeight;
      /*
       * Our own scroll, arriving late. `scroll` events are asynchronous, so by the time one lands
       * the reveal has usually added more text and the tail is below the fold again — reading that
       * as "the user scrolled up" pins the view at the position we just set and the follow never
       * runs again. That is the freeze this guard exists for: it looks exactly like following that
       * works and then stops a paragraph short.
       */
      if (
        selfWroteTopRef.current !== null &&
        Math.abs(top - selfWroteTopRef.current) <= SELF_SCROLL_EPSILON_PX
      ) {
        return;
      }
      /* The user has taken over, so the position we remember is no longer a useful comparison —
         keeping it would make a later scroll that happens to land there look like ours. */
      selfWroteTopRef.current = null;
      if (shrank) return;
      /*
       * Inside the delivery window the pane is being yanked around by the post-Ask slot reload —
       * Steam lands it back at 0 as the transcript is rebuilt — and none of that is the user.
       * Taking a pin from it would freeze the view at the top, which is the exact failure the
       * delivery exists to prevent. The cost is that a real scroll in the first second after an
       * answer does not pin; the pass at the end of the window brings the tail back and the user
       * scrolls again from there.
       */
      if (Date.now() < deliverUntilRef.current) return;
      pinnedTopRef.current = transcriptTailIsInView(anchor, scroll) ? null : top;
    };

    scroll.addEventListener("scroll", onScroll, { passive: true });
    return () => scroll.removeEventListener("scroll", onScroll);
  }, [anchorRef, enabled]);

  /*
   * Layout effect, not effect: the reveal commits text every animation frame, and adjusting the
   * scroll after paint shows one frame of the new text below the fold before it snaps up.
   */
  useLayoutEffect(() => {
    if (enabled) {
      deliverUntilRef.current = 0;
    } else if (justEnded) {
      deliverUntilRef.current = Date.now() + DELIVERY_WINDOW_MS;
    }
    const delivering = !enabled && Date.now() < deliverUntilRef.current;
    if (!enabled && !delivering) return;

    const anchor = anchorRef.current;
    const scroll = findTabContentsScroll(anchor);
    if (!anchor || !scroll) return;

    const tailBelowFold = () => anchor.getBoundingClientRect().bottom - visibleBottom(scroll);

    const follow = () => {
      if (pinnedTopRef.current != null) {
        /* The user's position. Steam's scroller recorded it when they scrolled, so unlike a
           position of our own choosing it does not need re-asserting — holding here means only
           "do not scroll". */
        return;
      }
      const ring = ringOnScrollingContent(scroll);
      if (!enabled) {
        /*
         * After the finish the tail is never delivered (plan 93: the view does not move). Only a
         * ring stranded wholly out of view on a control in the chat is brought back, "nearest", the
         * lift taking it out from behind the dock -- never the answer's end, which on the Deck
         * 2026-09-23 (plan 64) left a ring on "40 earlier" 656 px above the pane. A ring on the dock,
         * or on something already in view, moves nothing.
         */
        if (ring && whollyOutOfView(ring, scroll)) {
          ring.scrollIntoView({ block: "nearest", behavior: "auto" });
          liftAboveDock(ring);
          selfWroteTopRef.current = scroll.scrollTop;
        }
        return;
      }
      if (ring) return;

      const overshoot = tailBelowFold();
      if (overshoot <= 0) return;

      /*
       * "End of the anchor at the fold", said in the only vocabulary scrollIntoView has: it aligns
       * to the pane's bottom edge, which the dock covers, and scroll-margin-bottom is the knob
       * that moves that target up by the covered strip. Recomputed every pass because the strip is
       * ~245px while the dock overlays and 0 once the pane is at max scroll with the dock back in
       * normal flow.
       */
      const covered = scroll.getBoundingClientRect().bottom - visibleBottom(scroll);
      anchor.style.scrollMarginBottom = `${Math.max(0, Math.ceil(covered))}px`;
      anchor.scrollIntoView({ block: "end", behavior: "auto" });
      selfWroteTopRef.current = scroll.scrollTop;
    };

    followRef.current = follow;
    /*
     * While streaming, the observer above follows: it also catches the frames after a commit in
     * which markdown, spoiler fences and glossary chips expand the bubble, which the text prop
     * alone never signalled. Without an observer, follow from this commit.
     */
    if (enabled && observerFollowsRef.current) return;
    follow();

    if (enabled) return;

    /*
     * The ring passes after the finish, timed rather than observed: a rebuild the live turn's
     * twin could not prevent (useLiveTurnTwin.ts) lands over the following frames, and a
     * ResizeObserver would keep firing on unrelated layout for as long as it lived. Idempotent by
     * construction: a pass moves the pane only for a ring wholly out of view (see `follow`).
     */
    const timers = DELIVERY_PASS_DELAYS_MS.map((ms) => window.setTimeout(follow, ms));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [anchorRef, enabled, streamText]);

  /* Declared last so every effect in this commit still sees the PREVIOUS commit's value. */
  useLayoutEffect(() => {
    wasEnabledRef.current = enabled;
  });
}
