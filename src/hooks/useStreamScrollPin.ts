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
import { findTabContentsScroll } from "../utils/chatPanelScroll";
import { liftAboveDock } from "./useDockClearanceOnFocus";

/** How far the end of the transcript may sit below the fold and still count as "being watched". */
const FOLLOW_SLACK_PX = 48;

/** A scroll position within this many pixels of one we set is treated as our own. */
const SELF_SCROLL_EPSILON_PX = 1;

/** The bottom-pinned preset/Ask dock, which covers the foot of the pane while content overflows. */
const DOCK_SELECTOR = ".bonsai-main-tab-dock";

/**
 * How long after an Ask ends the hook keeps delivering the answer's tail into view.
 *
 * The completion poll disables the follow and lands the final text in the SAME React commit
 * (useBonsaiAskOrchestration sets both under one batch), and the slot reload that follows rebuilds
 * the transcript with the pane back at 0 — so every scroll taken while streaming is thrown away
 * about 50ms after the last token. Measured on device 2026-08-31: pane at scrollTop 0 with 366px
 * of answer below the fold, every run. The window covers that rebuild plus the markdown/glossary
 * layout that finishes over the following frames.
 */
const DELIVERY_WINDOW_MS = 1200;

/** When the delivery passes run, counted from the commit that ended the Ask. */
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
 * transcript, or the chat slot row above it — rather than on the dock. Null otherwise.
 *
 * Following the tail then scrolls the very control the person is on out of sight, and the D-pad's
 * own scrolls rarely take a pin, because a step near the end leaves the tail inside the slack.
 * Measured on device 2026-09-18 (plan61-QA-FREE-PLAY-01-streaming.json): six of eight stops on a
 * walk during a streaming answer were focused but off screen. The ring and not
 * `document.activeElement`, because the two disagree on the Deck and the ring is what a person sees.
 *
 * The chat slot row counts too: it scrolls away with the transcript. On the Deck 2026-09-23 (plan
 * 64) a ring on the chat row was carried off the top of the pane, from 14 to -183px, while the
 * answer below it grew. Only the dock is excluded: it is pinned to the bottom, so a ring on Ask or
 * Stop stays visible and still lets the follow run.
 */
function ringOnScrollingContent(scroll: HTMLElement): HTMLElement | null {
  const ring = scroll.querySelector<HTMLElement>(RING_SELECTOR);
  if (!ring) return null;
  const dock = scroll.querySelector<HTMLElement>(DOCK_SELECTOR);
  return dock && dock.contains(ring) ? null : ring;
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
 * case hold exactly where they left off. After the Ask ends, keep delivering for a short window so
 * the slot-reload rebuild cannot leave the answer below the fold.
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

  /*
   * Computed during render, consumed by the effects of this same commit: the commit where enabled
   * flips false is ALSO the commit where the final answer text lands, so the effects below must
   * treat it as one more active pass rather than returning early.
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
      if (ring) {
        if (enabled) return;
        /*
         * A delivery pass with the ring on the chat, not the dock, brings the ring's own control
         * back, not the answer's end. The passes exist to undo the slot rebuild's jump to the top,
         * and for a person walking the reply that jump strands the control they are on. Delivering the
         * tail instead threw it off screen: on the Deck 2026-09-23 (plan 64), Down 0.8s after an
         * answer finished put the ring on "40 earlier" and the 900ms pass then scrolled to the end
         * of the answer, leaving the ring 656px above the pane. "nearest" leaves a control that is
         * already in view where it is; the lift takes it out from behind the dock.
         */
        ring.scrollIntoView({ block: "nearest", behavior: "auto" });
        liftAboveDock(ring);
        selfWroteTopRef.current = scroll.scrollTop;
        return;
      }

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

    follow();

    if (enabled) {
      /*
       * The text prop is not a reliable signal that the ANSWER has finished laying out. On the
       * commit where it lands, the bubble is often still short — markdown, spoiler fences and
       * glossary chips expand it over the frames that follow — so the one pass above can measure a
       * pane that does not overflow yet and never run again, because nothing changes the prop
       * afterwards. Watching the anchor closes that gap for free while the height is steady.
       */
      if (typeof ResizeObserver === "undefined") return;
      let raf = 0;
      const ro = new ResizeObserver(() => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(follow);
      });
      ro.observe(anchor);
      return () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
      };
    }

    /*
     * Delivery passes, timed rather than observed: the slot reload's own expand-turn
     * scrollIntoView fires one animation frame after its commit, and whichever scroll runs LAST
     * wins against Steam's scroller — so the passes are placed after it, not raced against it via
     * a ResizeObserver that would also keep firing on unrelated layout for as long as it lived.
     * Idempotent by construction: each pass scrolls only if the tail is still below the fold and
     * the user has not pinned.
     */
    const timers = DELIVERY_PASS_DELAYS_MS.map((ms) => window.setTimeout(follow, ms));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [anchorRef, enabled, streamText]);

  /* Declared last so every effect in this commit still sees the PREVIOUS commit's value. */
  useLayoutEffect(() => {
    wasEnabledRef.current = enabled;
  });
}
