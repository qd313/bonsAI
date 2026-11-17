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

/**
 * How often, while an answer streams, the follow looks by itself in case the size observer below has
 * stayed quiet. On the Deck 2026-11-17 (plan 105, P105-M-ANSWER-FOLLOW) the page did not move at all
 * while an answer grew by 345 px with the ring on nothing in the chat; the observer is the only thing
 * that looks while streaming, so a look that never comes meant no follow for the whole answer.
 */
const FOLLOW_HEARTBEAT_MS = 400;

/** The bottom-pinned preset/Ask dock, which covers the foot of the pane while content overflows. */
const DOCK_SELECTOR = ".bonsai-main-tab-dock";

/**
 * How long after an Ask ends the hook keeps an eye on the ring and brings the answer's foot up.
 *
 * These passes used to deliver the answer's TAIL into view, because the slot reload after the
 * finish rebuilt the transcript and threw the pane back to 0 (measured 2026-08-31). Since plan 93
 * the reload keeps the live turn's own elements (useLiveTurnTwin.ts), so nothing is thrown back,
 * and the tail delivery was itself the jump the maintainer reported: on the Deck 2026-10-13
 * (plan93-M4-ANSWER-FINISH.json) the pane sat at 0 for the whole 50 s answer and then jumped
 * 1,264.7 px to the end 0.26 s after the finish. The maintainer's pick: at the finish the view does
 * not move by a page.
 *
 * Plan 105 (Deck 2026-11-17, plan105-P105-M-ANSWER-END.json) brought back one small piece of it. The
 * streaming follow keeps the newest line at the fold, and the "Was this helpful?" row, Show details
 * and the rest of the answer's foot are drawn only once the Ask ends, below where the follow left
 * the page: it stopped 96.6 px short (Hades) and 167.6 px short (Stardew), with the Helpful buttons
 * behind the dock or off screen, and the dock then held Show details where the chips belong. So when
 * the page was following (no pin, nothing moved by the person since the finish, the ring not on a
 * control in the chat) the foot comes up to the fold, by at most FINISH_DELIVERY_MAX_PX: a foot's
 * worth, never a page.
 */
const DELIVERY_WINDOW_MS = 1200;

/**
 * The most the foot of an answer is brought up at the finish. The rows under an answer are about
 * 120 to 170 px; the 1,264.7 px jump of plan 93 came from a page that never followed, and more than
 * this below the fold means exactly that, so the view stays where it is.
 */
const FINISH_DELIVERY_MAX_PX = 400;

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
 * Following the tail all the way then scrolls the very control the person is on out of sight, and the D-pad's
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
function ringOnScrollingContent(scroll: HTMLElement, anchor: HTMLElement): HTMLElement | null {
  const ring = scroll.querySelector<HTMLElement>(RING_SELECTOR);
  if (!ring) return null;
  const dock = scroll.querySelector<HTMLElement>(DOCK_SELECTOR);
  if (dock && dock.contains(ring)) return null;
  /* A ring on a wrapper around the whole transcript is not a control the follow could carry out of
     sight: its top is the transcript's top, so "keep it in view" would forbid every scroll. */
  return ring.contains(anchor) || (dock && ring.contains(dock)) ? null : ring;
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
 * case hold exactly where they left off. When the Ask ends the view does not jump by a page (plan
 * 93): for a short window the hook brings back a control the ring is on that is wholly out of view,
 * or, with the ring not on the chat, brings up the answer's foot by a few hundred px at most (plan 105).
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
 * so while the gamepad ring is on the chat above the dock (ringOnScrollingContent) the follow goes
 * only as far as keeps the ring's top inside the pane.
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
  /** Where the pane stood at the finish, or after the last foot delivery: a scroll by the person since cancels the next one. */
  const finishTopRef = useRef<number | null>(null);
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
   * Reset on the way *into* streaming: a pin taken during the previous answer —
   * or by the `expandedTurnKey` scrollIntoView that fires as a turn opens — would otherwise survive
   * into this one and freeze the view before a single token had arrived.
   *
   * A layout effect declared above the follow, so that on the commit where streaming begins the
   * reset has already happened. As a passive effect it ran *after* the first follow of the answer,
   * which is one commit too late — and it also wiped the position that follow had just recorded,
   * making the very next scroll event look like the user's.
   */
  useLayoutEffect(() => {
    /* Not at the finish: a person who scrolled up to read keeps that pin, so the foot of the answer
       is not brought up from under them (plan 105). The next answer clears it as it begins. */
    if (enabled) pinnedTopRef.current = null;
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
    const heartbeat = window.setInterval(() => followRef.current(), FOLLOW_HEARTBEAT_MS);
    return () => {
      observerFollowsRef.current = false;
      ro.disconnect();
      window.clearInterval(heartbeat);
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
    if (enabled) finishTopRef.current = null;
    else if (justEnded) finishTopRef.current = scroll.scrollTop;

    const tailBelowFold = () => anchor.getBoundingClientRect().bottom - visibleBottom(scroll);

    const follow = () => {
      if (pinnedTopRef.current != null) {
        /* The user's position. Steam's scroller recorded it when they scrolled, so unlike a
           position of our own choosing it does not need re-asserting — holding here means only
           "do not scroll". */
        return;
      }
      const ring = ringOnScrollingContent(scroll, anchor);
      if (!enabled) {
        /*
         * After the finish. A ring stranded wholly out of view on a control in the chat is brought
         * back, "nearest", the lift taking it out from behind the dock -- never the answer's end,
         * which on the Deck 2026-09-23 (plan 64) left a ring on "40 earlier" 656 px above the pane.
         * A ring on a control in the chat that can be seen moves nothing either.
         */
        if (ring) {
          if (whollyOutOfView(ring, scroll)) {
            ring.scrollIntoView({ block: "nearest", behavior: "auto" });
            liftAboveDock(ring);
            selfWroteTopRef.current = scroll.scrollTop;
          }
          return;
        }
        /*
         * Otherwise the page was following, so the answer's foot (the rating row, Show details),
         * drawn only now, comes up to the fold -- unless the person has scrolled since the finish,
         * or the foot is further down than a foot can be (see FINISH_DELIVERY_MAX_PX).
         */
        const below = tailBelowFold();
        const moved =
          finishTopRef.current === null ||
          Math.abs(scroll.scrollTop - finishTopRef.current) > SELF_SCROLL_EPSILON_PX;
        if (below <= 0 || below > FINISH_DELIVERY_MAX_PX || moved) return;
        bringTailToFold(below, below);
        finishTopRef.current = scroll.scrollTop;
        return;
      }
      const overshoot = tailBelowFold();
      if (overshoot <= 0) return;
      /*
       * A ring on the writing answer (or anything else that scrolls with it) is followed only as far
       * as keeps the ring's top inside the pane: the newest line comes up to the fold while the
       * control the person is on stays where they can see it. Stopping the follow altogether for
       * as long as a ring sat there (the first version) left the page at the top for the whole
       * answer -- Deck 2026-11-17, plan105-P105-M-ANSWER-FOLLOW.json, ring on a term in the answer:
       * scrollTop 0 throughout, the newest line 235 px below the fold. When there is no room the ring
       * wins, as it did on 2026-09-18 and 2026-09-23.
       */
      const room = ring
        ? ring.getBoundingClientRect().top - scroll.getBoundingClientRect().top
        : overshoot;
      const step = Math.min(overshoot, room);
      if (step < 1) return;
      bringTailToFold(overshoot, step);
    };

    /**
     * Scroll the tail up by `step` of the `overshoot` it sits below the fold.
     *
     * "End of the anchor at the fold", said in the only vocabulary scrollIntoView has: it aligns
     * to the pane's bottom edge, which the dock covers, and scroll-margin-bottom is the knob
     * that moves that target up by the covered strip. Recomputed every pass because the strip is
     * ~245px while the dock overlays and 0 once the pane is at max scroll with the dock back in
     * normal flow.
     */
    const bringTailToFold = (overshoot: number, step: number) => {
      const covered = scroll.getBoundingClientRect().bottom - visibleBottom(scroll);
      /* A negative margin leaves the part of the tail the ring's room does not allow below the fold. */
      const leftBelow = Math.floor(overshoot - step);
      anchor.style.scrollMarginBottom = `${Math.max(0, Math.ceil(covered)) - leftBelow}px`;
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
