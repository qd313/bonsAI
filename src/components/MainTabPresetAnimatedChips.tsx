/**
 * Title: Preset animated chips
 *
 * Purpose: Draws the row of suggestion chips above the Ask bar, in whichever
 * of four styles the settings picked: fade (one chip fades out as the next
 * fades in), carousel (chips slide in sideways from the right, like a
 * ticker), static (a plain swap, no animation), or decode (each new chip's
 * text scrambles into place, letter by letter). Every mode ends up drawing
 * the same row of chip buttons — only how a new chip arrives differs. A
 * prompt too long for its chip also scrolls sideways on its own, through
 * Steam's own Marquee, independently of which of the four styles is active.
 *
 * Used for: MainTabPresetRow, whenever the chip-animation setting is not
 * showing the plain "How to use bonsAI" help chip instead.
 *
 * Solves: Keeps four fairly involved animation systems sharing the same
 * D-pad wiring and the same chip button, so a change to how a chip looks or
 * behaves is one change, not four.
 *
 * Does not: Decide what the suggested prompts actually say, or remember
 * which one was picked — the caller's setUnifiedInput fills the question box,
 * and the presets data file supplies the text.
 *
 * How it works:
 * 1. Every mode shares two building blocks: PresetRowFocusRoot, the focus
 *    container Steam treats as this row's own navigation boundary, and
 *    usePresetRowNav(), the D-pad graph for whichever chips are showing —
 *    Left and Right move between chips in the row with a plain focus() call
 *    since that is a same-container move, while Up and Down hand the ring
 *    across the row's own boundary through a registered handover.
 * 2. Fade and static modes swap each slot's chip on its own timer, staggered
 *    per slot so the chips do not all change at once — fade eases the old
 *    chip out and the new one in, static swaps instantly.
 * 3. Carousel mode keeps a running history of chips and slides a
 *    several-chips-wide window across it, appending a new one from the right
 *    as it advances (the state machine for this lives in carouselState.ts).
 * 4. Decode mode reveals a new chip's text character by character, with the
 *    not-yet-revealed tail showing scrambling placeholder glyphs and a
 *    blinking caret at the boundary. Its reveal loop runs on a single shared
 *    animation frame rather than React state, so a churning chip does not
 *    force a re-render on every frame.
 * 5. Every mode keeps changing chips for as long as the row is mounted (the
 *    maintainer's call, plan 72; until then they rested one minute after
 *    mounting). They hold while an answer is written or Steam's ring is on the
 *    row (usePresetRowNav's rowHeld). Closing the Quick Access panel or leaving
 *    the Main tab unmounts the row, and the effect cleanups stop every timer.
 * 6. MainTabPresetAnimatedChipsInner is the actual component: it reads which
 *    mode is active and runs the matching logic above, wrapped in
 *    React.memo with a hand-written comparator instead of the default one —
 *    see the Gotchas below for why that comparator needs care.
 *
 * Gotchas:
 * - presetChipsPropsEqual() is a hand-maintained list of every prop this
 *   component reads. A new prop added to this component without also adding
 *   it there does not fail the build and does not fail a test — the
 *   component would simply keep ignoring that prop's changes, exactly as
 *   the warning comment above that function says.
 * - The shared focus container needs both the flow-children="horizontal"
 *   hint and its own registered Up/Down handovers: Steam treats a Focusable
 *   as a column by default, and the hint alone was not enough to change that
 *   on its own, measured on device.
 *
 * Split across files (plan 65): the decode-text maths, the fade/stagger timings and
 * normalizeThreeSeeds, the plain chip button and its badges, PresetRowFocusRoot/usePresetRowNav,
 * and decode mode's own chip row now live in src/features/preset-carousel/ (presetChipDecodeText,
 * presetChipShared, presetChipButton, presetRowFocusNav, presetDecodeSlots). This file re-exports
 * the few names the test file still imports by the old path.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  frozenTestChipsActive,
  getRandomPresetExcluding,
  type PresetPrompt,
} from "../data/presets";
import {
  advanceCarouselFocus,
  buildInitialCarouselState,
  CAROUSEL_HISTORY_MAX,
  CAROUSEL_MANUAL_PAUSE_MS,
  CAROUSEL_SLIDE_MS,
  carouselWindowStart,
  mergeContextualSeeds,
  nextFrozenHistoryEntry,
  seedsKeyFrom,
} from "../features/preset-carousel/carouselState";
import { pickCarouselAppend } from "../features/preset-carousel/carouselNextChip";
import {
  effectivePresetVisibleSlots,
  presetHoldMs,
  presetTurnMs,
} from "../features/preset-carousel/presetRowLayout";
import { presetPace } from "../features/preset-carousel/presetPace";
import { makeChangeSpacer } from "../features/preset-carousel/changeSpacing";
import {
  nextSlotPreset,
  startSlotRotation,
  type SlotRotation,
} from "../features/preset-carousel/presetSlotRotation";
import { PresetChipButton } from "../features/preset-carousel/presetChipButton";
import { PresetRowFocusRoot, usePresetRowNav } from "../features/preset-carousel/presetRowFocusNav";
import { MainTabPresetDecodeSlots } from "../features/preset-carousel/presetDecodeSlots";
import { elementHasFocus } from "../utils/uiDocument";
import { composeDecodeText, PRESET_DECODE_CARET_CHAR } from "../features/preset-carousel/presetChipDecodeText";
import {
  type MainTabPresetAnimatedChipsProps,
  normalizeThreeSeeds,
  prefersReducedMotion,
  type SlotFade,
  slotStaggerMs,
} from "../features/preset-carousel/presetChipShared";

// Re-exported so MainTabPresetAnimatedChips.test.tsx's existing imports (and this file's own
// public prop type) keep working unchanged; the real definitions now live in presetRowFocusNav.tsx
// / presetChipDecodeText.ts / presetChipShared.ts alongside the rest of the row's D-pad wiring,
// decode maths and shared row timings/prop contract, respectively. MainTabPresetAnimatedChipsProps
// moved to presetChipShared.ts specifically so presetDecodeSlots.tsx (which needs the type) does
// not have to import it back from this file, which imports presetDecodeSlots.tsx itself.
export { usePresetRowNav };
export { composeDecodeText, PRESET_DECODE_CARET_CHAR };
export type { MainTabPresetAnimatedChipsProps };

/**
 * Sideways carousel: the history (up to CAROUSEL_HISTORY_MAX) runs left to right and the row is a
 * PRESET_VISIBLE_SLOTS-wide window on it. Auto-advance appends a chip that slides in from the
 * right; the D-pad walks Left/Right, and Left at the left edge pulls an earlier chip back into view.
 */
function MainTabPresetSidewaysCarousel(
  props: Omit<MainTabPresetAnimatedChipsProps, "fadeAnimationEnabled" | "animationMode">,
) {
  const {
    seeds,
    setUnifiedInput,
    onPreferAskMode,
    onCarouselExitDown,
    useLocalKnowledgeBase = false,
    askRestartToken,
    presetSingleChip = false,
  } = props;
  const samplerOptions = { useLocalKnowledgeBase };
  const seedsKey = seedsKeyFrom(seeds);
  const reducedMotion = prefersReducedMotion();
  const visibleSlots = effectivePresetVisibleSlots(presetSingleChip);
  const contextualRef = useRef(normalizeThreeSeeds(seeds, samplerOptions));
  contextualRef.current = normalizeThreeSeeds(seeds, samplerOptions);

  const [{ history, focusIndex }, setCarousel] = useState(() =>
    buildInitialCarouselState(normalizeThreeSeeds(seeds, samplerOptions)),
  );

  const carouselRef = useRef({ history, focusIndex });
  carouselRef.current = { history, focusIndex };
  const gameRoundRef = useRef<readonly string[]>([]);
  const autoPausedUntilRef = useRef(0);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const pauseAuto = useCallback(() => {
    autoPausedUntilRef.current = performance.now() + CAROUSEL_MANUAL_PAUSE_MS;
  }, []);

  /*
   * Only the chips inside the window are focus stops. The rest are rendered (so the slide has
   * something to slide to) but not focusable, for two reasons measured on device 2026-09-01: Steam
   * enters a container through its first focusable child, and with the oldest history chip — clipped
   * off to the left — in that role, a fresh panel's Down from the strip skipped the row for the Ask
   * field; and a focusable chip nobody can see is exactly the shape of the "ring on a hidden control"
   * bugs this repo keeps finding. Left at the window's edge instead asks for the earlier chip
   * (`requestFocus`): the window slides, the chip becomes a stop, and the effect below puts the ring
   * on it.
   */
  const windowStart = carouselWindowStart(focusIndex, visibleSlots);
  const inWindow = useCallback(
    (i: number) => i >= windowStart && i < windowStart + visibleSlots,
    [windowStart, visibleSlots],
  );
  const pendingFocusRef = useRef<number | null>(null);
  /*
   * A second trigger for the pending-focus effect below, alongside `focusIndex`. Needed because
   * `advanceAtEnd` (right at the last chip, pulling in the next frozen entry) can leave
   * `focusIndex`'s *number* unchanged: once history is already at CAROUSEL_HISTORY_MAX, appending
   * trims the oldest entry off the front, so the newly-pulled chip lands at the same index the
   * departing one held. Chips are keyed by text (`${i}-${preset.text}`), so React still remounts a
   * fresh, unfocused DOM node there — an effect keyed only on `focusIndex` would never notice.
   */
  const [focusRequestTick, setFocusRequestTick] = useState(0);
  const requestFocus = useCallback(
    (i: number): boolean => {
      pendingFocusRef.current = i;
      pauseAuto();
      setCarousel((prev) => (i >= 0 && i < prev.history.length ? { ...prev, focusIndex: i } : prev));
      setFocusRequestTick((t) => t + 1);
      return true;
    },
    [pauseAuto],
  );
  const advanceAtEnd = useCallback((): boolean => {
    // Right at the last chip normally just claims the move (presetRowNav) so Steam's own idea of
    // "past it" -- the Quick Access rail -- never fires. A pinned QA batch longer than the row is
    // the one case with a real "next" waiting: the auto-advance timer alone cannot be relied
    // on to pull it in, because auto-advance stands down entirely while a chip has focus, and
    // walking a pinned batch by hand is exactly that (D58 #3). The normal carousel has no such
    // fixed list to pull from ahead of the timer, so this stays scoped to a frozen batch.
    if (!frozenTestChipsActive()) return false;
    const next = nextFrozenHistoryEntry(history);
    if (!next) return false;
    const targetIndex = Math.min(history.length + 1, CAROUSEL_HISTORY_MAX) - 1;
    pendingFocusRef.current = targetIndex;
    pauseAuto();
    setCarousel((prev) => advanceCarouselFocus(prev.history, prev.focusIndex, next));
    setFocusRequestTick((t) => t + 1);
    return true;
  }, [history, pauseAuto]);
  const nav = usePresetRowNav(CAROUSEL_HISTORY_MAX, onCarouselExitDown, {
    isFocusable: inWindow,
    requestFocus,
    advanceAtEnd,
  });
  const { focusChip } = nav;
  useEffect(() => {
    const pending = pendingFocusRef.current;
    if (pending === null) return;
    pendingFocusRef.current = null;
    focusChip(pending);
  }, [focusRequestTick, focusChip]);
  /*
   * Entering from outside lands on the marked chip, so the blue marker and the white ring agree.
   * Deferred a tick on purpose: this runs inside Steam's own focus event, and a `focus()` issued
   * there moved `activeElement` while the ring stayed on the chip Steam had picked (measured
   * 2026-09-01, runs/PRESET-ONE-LINE-03-carousel-fresh-mount.json step 1). One tick later the
   * transfer is complete and an in-container `focus()` moves the ring like any other.
   */
  const focusIndexRef = useRef(focusIndex);
  focusIndexRef.current = focusIndex;
  const onEnterFromOutside = useCallback(() => {
    window.setTimeout(() => {
      const target = focusIndexRef.current;
      if (!elementHasFocus(viewportRef.current)) return;
      focusChip(target);
    }, 0);
  }, [focusChip]);

  useEffect(() => {
    setCarousel((prev) => mergeContextualSeeds(prev.history, contextualRef.current, prev.focusIndex));
  }, [seedsKey]);

  useEffect(() => {
    // No auto-advance at all while an answer is being written (holdStill, plan 70 helper S): the
    // panel is busy and a chip sliding under the ring can take a press meant for another. History
    // is state, not this effect's, so standing the ticker down here moves nothing on screen.
    if (props.holdStill) return;
    let cancelled = false;
    let timeoutId = 0;

    // Each chip stays one turn at the pace for this many chips (the rule the other styles use), and
    // with two chips showing a new one slides in every half turn.
    const stepAfter = (chip = carouselRef.current.history[carouselRef.current.focusIndex]) =>
      presetTurnMs(chip?.text ?? "", visibleSlots) / visibleSlots;
    const tick = () => {
      if (cancelled) return;
      if (performance.now() < autoPausedUntilRef.current) {
        timeoutId = window.setTimeout(tick, stepAfter());
        return;
      }
      /* Never auto-advance while the user is browsing the carousel: focusIndex follows DOM
         focus, so moving it under the user would desync the white Steam ring from the blue chip. */
      if (elementHasFocus(viewportRef.current) || nav.rowHeld()) {
        timeoutId = window.setTimeout(tick, stepAfter());
        return;
      }

      // The same next-chip rule as the other three styles (nextChipRule.ts), read off the state the
      // last render drew; moving along chips already dealt needs no pick.
      const { history: shown, focusIndex: at } = carouselRef.current;
      const append = pickCarouselAppend(shown, at, visibleSlots, gameRoundRef.current, (exclude) =>
        getRandomPresetExcluding(new Set(exclude), samplerOptions),
      );
      if (append) gameRoundRef.current = append.gameRound;
      setCarousel((prev) =>
        advanceCarouselFocus(prev.history, prev.focusIndex, append?.next ?? prev.history[prev.focusIndex]!),
      );

      timeoutId = window.setTimeout(tick, stepAfter(append?.next ?? shown[at + 1]));
    };

    timeoutId = window.setTimeout(tick, stepAfter());
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
    // askRestartToken restarts the ticker on every completed Ask (D58 #3), independently of
    // seedsKey: a pinned QA batch always reseeds to the same three chips, so seedsKey alone never
    // signals that an Ask happened. Restarting only this effect (not the whole carousel) restarts
    // the step timer without touching history or focus, unlike fade/static/decode's full restart --
    // the carousel has a persistent, browsable history worth keeping across an Ask; the other
    // modes have no such state to preserve. visibleSlots restarts it too, so a mid-session flip of
    // the one-chip setting reads the new window size on the next tick instead of the one captured
    // when auto-advance last started.
  }, [seedsKey, useLocalKnowledgeBase, askRestartToken, visibleSlots, props.holdStill]);

  /**
   * Focus model: the Steam DOM focus (white ring) is the single source of truth. Every chip is
   * focusable; D-pad moves between them natively, and each chip's onFocus syncs `focusIndex`
   * (blue highlight + window position) to itself. The previous design moved `focusIndex` via
   * parent handlers without moving DOM focus, which left the white ring one chip behind the blue
   * one — the "two outlines, the white one actually selects" confusion.
   *
   * Chips outside the window are not focus stops; Left at the window's edge goes through
   * `requestFocus`, which slides the window first and focuses the chip once it is a stop.
   */
  const onChipFocus = useCallback(
    (i: number) => {
      pauseAuto();
      setCarousel((prev) => (prev.focusIndex === i ? prev : { ...prev, focusIndex: i }));
    },
    [pauseAuto],
  );

  return (
    <PresetRowFocusRoot className="bonsai-preset-carousel-root" onEnterFromOutside={onEnterFromOutside}>
      <div className="bonsai-preset-carousel-viewport" ref={viewportRef}>
        <div
          className="bonsai-preset-carousel-track"
          style={{
            /* The slide distance is a CSS calc on this index (section-4), never a measured px. */
            ["--bonsai-preset-window-start" as string]: String(windowStart),
            /* How many chips share the row's width, per the same calc. Falls back to
               PRESET_VISIBLE_SLOTS in the CSS itself when unset. */
            ["--bonsai-preset-visible-slots" as string]: String(visibleSlots),
            transition: `transform ${CAROUSEL_SLIDE_MS}ms ease-in-out`,
          }}
        >
          {history.map((preset, i) => {
            const isFocus = i === focusIndex;
            const dimmed = !isFocus;
            const visible = inWindow(i);
            return (
              <div
                key={`${i}-${preset.text}`}
                className={
                  "bonsai-preset-carousel-slot" +
                  (isFocus ? " bonsai-preset-carousel-slot--focus" : "")
                }
                data-bonsai-preset-visible={visible ? "true" : "false"}
                /* React onFocus delegates focusin (bubbles): fires when the inner chip Button
                   gains Steam focus. @decky/ui Button doesn't expose onFocus itself. */
                onFocus={() => onChipFocus(i)}
              >
                <PresetChipButton
                  preset={preset}
                  setUnifiedInput={setUnifiedInput}
                  onPreferAskMode={onPreferAskMode}
                  scroll={!reducedMotion}
                  dimmed={dimmed}
                  focusable={visible}
                  buttonRef={nav.setButtonRef[i]}
                  navHandlers={nav.handlersFor(i, history.length)}
                  blockedEdge={nav.isBlockedEdge(i)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </PresetRowFocusRoot>
  );
}

/** How often a fade-mode chip holding the ring checks whether it may fade out yet. */
const PRESET_RING_HOLD_RECHECK_MS = 500;

/**
 * PRESET_VISIBLE_SLOTS preset suggestion chips with independent fade in/out cycles — or, in static
 * mode, plain swaps. Hold time after each appearance scales with prompt length and is never shorter
 * than one full scroll of the label; fade durations are fixed. No new cycle starts while rowHeld();
 * otherwise the row keeps changing for as long as it is mounted.
 */
function MainTabPresetAnimatedChipsInner(props: MainTabPresetAnimatedChipsProps) {
  const {
    seeds,
    setUnifiedInput,
    fadeAnimationEnabled = true,
    animationMode = "fade",
    onPreferAskMode,
    onCarouselExitDown,
    useLocalKnowledgeBase = false,
    askRestartToken,
    presetSingleChip = false,
  } = props;
  const samplerOptions = { useLocalKnowledgeBase };
  if (animationMode === "carousel") {
    return (
      <MainTabPresetSidewaysCarousel
        seeds={seeds}
        setUnifiedInput={setUnifiedInput}
        onPreferAskMode={onPreferAskMode}
        onCarouselExitDown={onCarouselExitDown}
        useLocalKnowledgeBase={useLocalKnowledgeBase}
        askRestartToken={askRestartToken}
        holdStill={props.holdStill}
        presetSingleChip={presetSingleChip}
      />
    );
  }
  if (animationMode === "decode") {
    return (
      <MainTabPresetDecodeSlots
        seeds={seeds}
        setUnifiedInput={setUnifiedInput}
        onPreferAskMode={onPreferAskMode}
        onCarouselExitDown={onCarouselExitDown}
        useLocalKnowledgeBase={useLocalKnowledgeBase}
        askRestartToken={askRestartToken}
        holdStill={props.holdStill}
        presetSingleChip={presetSingleChip}
      />
    );
  }
  const staticMode = animationMode === "static" || !fadeAnimationEnabled;
  const seedsKey = seedsKeyFrom(seeds);
  const reducedMotion = prefersReducedMotion();
  const slotCount = effectivePresetVisibleSlots(presetSingleChip);
  const pace = presetPace(slotCount);
  const { rowHeld, ...nav } = usePresetRowNav(slotCount, onCarouselExitDown, { holdStill: props.holdStill });

  const [slots, setSlots] = useState<PresetPrompt[]>(() =>
    normalizeThreeSeeds(seeds, samplerOptions).slice(0, slotCount),
  );
  const [slotFade, setSlotFade] = useState<SlotFade[]>(() =>
    Array.from({ length: slotCount }, () =>
      staticMode ? { opacity: 1, transitionMs: 0 } : { opacity: 0, transitionMs: pace.fadeInMs },
    ),
  );
  const slotsRef = useRef(slots);
  slotsRef.current = slots;

  useEffect(() => {
    const initial = normalizeThreeSeeds(seeds, samplerOptions);
    const started = startSlotRotation(initial, slotCount);
    let rotation: SlotRotation = started.rotation;
    const first = started.first;
    slotsRef.current = first;
    setSlots(first);

    const timeouts: number[] = [];
    let cancelled = false;

    /** Only gate starting a *new* cycle after a full fade-out; never abort mid fade/hold. */
    const mayStartNextCycle = (): boolean => !cancelled;

    const pushTimeout = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        if (cancelled) return;
        fn();
      }, ms);
      timeouts.push(id);
    };

    const spacer = makeChangeSpacer(); // two spots never change at the same moment
    const visibleTexts = () => new Set(slotsRef.current.map((s) => s.text));
    const pickNext = (current: PresetPrompt): PresetPrompt => {
      const step = nextSlotPreset(current, visibleTexts(), rotation, samplerOptions);
      rotation = step.rotation;
      return step.next;
    };
    const showInSlot = (slotIndex: number, prompt: PresetPrompt) => {
      const next = [...slotsRef.current];
      next[slotIndex] = prompt;
      slotsRef.current = next;
      setSlots(next);
    };
    const setFadeFor = (slotIndex: number, fade: SlotFade) => {
      setSlotFade((prev) => prev.map((f, j) => (j === slotIndex ? fade : f)));
    };

    if (staticMode) {
      setSlotFade(Array.from({ length: slotCount }, () => ({ opacity: 1, transitionMs: 0 })));
      const loopStatic = (slotIndex: number, prompt: PresetPrompt, wait = spacer.delay(slotIndex, Date.now(), presetTurnMs(prompt.text, slotCount))) => {
        pushTimeout(() => {
          if (!mayStartNextCycle()) return;
          // Held (rowHeld): keep this question and look again shortly.
          if (rowHeld()) return loopStatic(slotIndex, prompt, PRESET_RING_HOLD_RECHECK_MS);
          const next = pickNext(prompt);
          showInSlot(slotIndex, next);
          loopStatic(slotIndex, next);
        }, wait);
      };
      first.forEach((prompt, i) => loopStatic(i, prompt));
      return () => {
        cancelled = true;
        timeouts.forEach((id) => window.clearTimeout(id));
      };
    }

    setSlotFade(
      Array.from({ length: slotCount }, () => ({ opacity: 0, transitionMs: pace.fadeInMs })),
    );

    const runSlot = (slotIndex: number) => {
      const loop = (prompt: PresetPrompt, firstDelay: number) => {
        showInSlot(slotIndex, prompt);
        setFadeFor(slotIndex, { opacity: 0, transitionMs: pace.fadeOutMs });

        pushTimeout(() => {
          setFadeFor(slotIndex, { opacity: 1, transitionMs: pace.fadeInMs });

          pushTimeout(() => {
            /*
             * A chip holding the ring does not fade out: a fading chip stops being a focus stop,
             * so Steam dropped the ring with nothing to take it (plan70-PRESET-ONE-LINE-03.json,
             * 7.6 s after the ring landed). It waits, and fades once the ring has left the row
             * and no answer is being written (rowHeld).
             */
            const fadeOut = () => {
              if (rowHeld()) {
                pushTimeout(fadeOut, PRESET_RING_HOLD_RECHECK_MS);
                return;
              }
              setFadeFor(slotIndex, { opacity: 0, transitionMs: pace.fadeOutMs });

              pushTimeout(() => {
                if (!mayStartNextCycle()) return;
                loop(pickNext(prompt), 0);
              }, pace.fadeOutMs);
            };
            pushTimeout(fadeOut, spacer.delayBefore(slotIndex, Date.now(), presetHoldMs(prompt.text, slotCount), pace.fadeOutMs));
          }, pace.fadeInMs);
        }, firstDelay);
      };
      loop(first[slotIndex]!, slotStaggerMs(slotIndex));
    };

    first.forEach((_, i) => runSlot(i));

    return () => {
      cancelled = true;
      timeouts.forEach((id) => window.clearTimeout(id));
    };
    // askRestartToken restarts this whole effect on every completed Ask (D58 #3) even when
    // seedsKey is unchanged, which is exactly what happens under a pinned QA batch: it always
    // resolves to the same three chips, so seedsKey alone never signals that an Ask happened.
  }, [seedsKey, seeds, staticMode, useLocalKnowledgeBase, slotCount, askRestartToken, rowHeld]);

  return (
    <PresetRowFocusRoot className="bonsai-preset-across">
      {slots.map((p, i) => {
        const slotOpacity = slotFade[i]?.opacity ?? 0;
        const presetInteractive = staticMode || slotOpacity > 0;
        return (
          <div
            key={`preset-slot-${i}`}
            className="bonsai-preset-carousel-slot"
            data-bonsai-preset-visible={presetInteractive ? "true" : "false"}
            style={{
              opacity: slotOpacity,
              transition: `opacity ${slotFade[i]?.transitionMs ?? pace.fadeInMs}ms ease-in-out`,
            }}
          >
            {/* No key of its own: one button per slot, only its words change -- decode mode's
                shape. Keyed by its text, a swap destroyed the button holding the ring and nothing
                took it over (plan70-PRESET-ONE-LINE-03.json, static and fade). */}
            <PresetChipButton
              preset={p}
              setUnifiedInput={setUnifiedInput}
              onPreferAskMode={onPreferAskMode}
              scroll={!reducedMotion}
              focusable={presetInteractive}
              buttonRef={nav.setButtonRef[i]}
              navHandlers={nav.handlersFor(i, slots.length)}
              blockedEdge={nav.isBlockedEdge(i)}
            />
          </div>
        );
      })}
    </PresetRowFocusRoot>
  );
}

/**
 * ANY NEW PROP MUST BE ADDED HERE, and to the `useMemo` deps in
 * `features/plugin-shell/tabs/useMainTabPayload.tsx`.
 *
 * This list is hand-maintained and nothing type-checks it against the props type.
 * A prop missing here does not fail `tsc` and does not fail a test — the component
 * simply never re-renders when that prop changes, so a feature threaded down from
 * settings appears to do nothing on device with no error anywhere. The step 11
 * friction test ranked this among the highest costs in the repo for exactly that
 * reason: the failure is silent and the gate is invisible from the call site.
 */
function presetChipsPropsEqual(
  prev: MainTabPresetAnimatedChipsProps,
  next: MainTabPresetAnimatedChipsProps,
): boolean {
  return (
    seedsKeyFrom(prev.seeds) === seedsKeyFrom(next.seeds) &&
    prev.animationMode === next.animationMode &&
    prev.fadeAnimationEnabled === next.fadeAnimationEnabled &&
    prev.onPreferAskMode === next.onPreferAskMode &&
    prev.onCarouselExitDown === next.onCarouselExitDown &&
    prev.useLocalKnowledgeBase === next.useLocalKnowledgeBase &&
    prev.askRestartToken === next.askRestartToken &&
    prev.holdStill === next.holdStill &&
    prev.presetSingleChip === next.presetSingleChip
  );
}

export const MainTabPresetAnimatedChips = React.memo(MainTabPresetAnimatedChipsInner, presetChipsPropsEqual);
