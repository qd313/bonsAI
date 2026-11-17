/**
 * Title: Preset animated chips
 *
 * Purpose: Draws the row of suggestion chips above the Ask bar, in one of two
 * looks: decode (each new chip's text scrambles into place, letter by letter),
 * or static (a plain swap, no animation, for people whose system asks for less
 * motion). Both end up drawing the same row of chip buttons -- only how a new
 * chip arrives differs. A prompt too long for its chip also scrolls sideways on
 * its own, independently of which look is active.
 *
 * Used for: MainTabPresetRow, whenever it is not showing the plain "How to use
 * bonsAI" help chip instead. The row picks static when the system asks for less
 * motion and decode otherwise; there is no setting (plan 105 removed the fade
 * and sideways-carousel styles and the Developer tab's picker).
 *
 * Solves: Keeps two chip-arrival looks sharing the same D-pad wiring and the
 * same chip button, so a change to how a chip looks or behaves is one change,
 * not two.
 *
 * Does not: Decide what the suggested prompts actually say, or remember
 * which one was picked -- the caller's setUnifiedInput fills the question box,
 * and the presets data file supplies the text.
 *
 * How it works:
 * 1. Both looks share two building blocks: PresetRowFocusRoot, the focus
 *    container Steam treats as this row's own navigation boundary, and
 *    usePresetRowNav(), the D-pad graph for whichever chips are showing --
 *    Left and Right move between chips in the row with a plain focus() call
 *    since that is a same-container move, while Up and Down hand the ring
 *    across the row's own boundary through a registered handover.
 * 2. Static look: each slot's chip is swapped on its own timer, staggered per
 *    slot so the chips do not all change at once, instantly.
 * 3. Decode look (presetDecodeSlots.tsx): a new chip's text is revealed
 *    character by character, with the not-yet-revealed tail showing scrambling
 *    placeholder glyphs and a blinking caret at the boundary. Its reveal loop
 *    runs on a single shared animation frame rather than React state, so a
 *    churning chip does not force a re-render on every frame.
 * 4. Both keep changing chips for as long as the row is mounted (the
 *    maintainer's call, plan 72). They hold while an answer is written or
 *    Steam's ring is on the row (usePresetRowNav's rowHeld). Closing the Quick
 *    Access panel or leaving the Main tab unmounts the row, and the effect
 *    cleanups stop every timer.
 * 5. MainTabPresetAnimatedChipsInner is the actual component: it reads which
 *    look is active and runs the matching logic above, wrapped in React.memo
 *    with a hand-written comparator instead of the default one -- see the
 *    Gotchas below for why that comparator needs care.
 *
 * Gotchas:
 * - presetChipsPropsEqual() is a hand-maintained list of every prop this
 *   component reads. A new prop added to this component without also adding
 *   it there does not fail the build and does not fail a test -- the
 *   component would simply keep ignoring that prop's changes, exactly as
 *   the warning comment above that function says.
 * - The shared focus container needs both the flow-children="horizontal"
 *   hint and its own registered Up/Down handovers: Steam treats a Focusable
 *   as a column by default, and the hint alone was not enough to change that
 *   on its own, measured on device.
 *
 * Split across files (plan 65): the decode-text maths, the stagger timings and
 * normalizeThreeSeeds, the plain chip button and its badges, PresetRowFocusRoot/usePresetRowNav,
 * and decode mode's own chip row live in src/features/preset-carousel/ (presetChipDecodeText,
 * presetChipShared, presetChipButton, presetRowFocusNav, presetDecodeSlots). This file re-exports
 * the few names the test file still imports by the old path.
 */
import React, { useEffect, useRef, useState } from "react";
import { type PresetPrompt } from "./presets";
import { seedsKeyFrom } from "./presetChipShared";
import { effectivePresetVisibleSlots, presetTurnMs } from "./presetRowLayout";
import { makeChangeSpacer } from "./changeSpacing";
import { armLeave, makeChipStayBoard } from "./presetChipStay";
import { nextSlotPreset, startSlotRotation, type SlotRotation } from "./presetSlotRotation";
import { PresetChipButton } from "./presetChipButton";
import { PresetRowFocusRoot, usePresetRowNav } from "./presetRowFocusNav";
import { MainTabPresetDecodeSlots } from "./presetDecodeSlots";
import { usePresetChipWiden } from "./usePresetChipWiden";
import { composeDecodeText, PRESET_DECODE_CARET_CHAR } from "./presetChipDecodeText";
import {
  type MainTabPresetAnimatedChipsProps,
  normalizeThreeSeeds,
  prefersReducedMotion,
} from "./presetChipShared";

// Re-exported so MainTabPresetAnimatedChips.test.tsx's existing imports (and this file's own
// public prop type) keep working unchanged; the real definitions now live in presetRowFocusNav.tsx
// / presetChipDecodeText.ts / presetChipShared.ts alongside the rest of the row's D-pad wiring,
// decode maths and shared row timings/prop contract, respectively. MainTabPresetAnimatedChipsProps
// moved to presetChipShared.ts specifically so presetDecodeSlots.tsx (which needs the type) does
// not have to import it back from this file, which imports presetDecodeSlots.tsx itself.
export { usePresetRowNav };
export { composeDecodeText, PRESET_DECODE_CARET_CHAR };
export type { MainTabPresetAnimatedChipsProps };

/** How often a static-look chip holding the ring checks whether it may change yet. */
const PRESET_RING_HOLD_RECHECK_MS = 500;

/**
 * The static look: PRESET_VISIBLE_SLOTS chips that swap plainly, each on its own timer. Hold time after
 * each appearance scales with prompt length and is never shorter than one full scroll of the label (a
 * long chip is replaced one pause after its own words stop: presetChipStay.ts). No change starts while
 * rowHeld(); otherwise the row keeps changing for as long as it is mounted.
 */
function MainTabPresetPlainSlots(props: Omit<MainTabPresetAnimatedChipsProps, "animationMode">) {
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
  const slotCount = effectivePresetVisibleSlots(presetSingleChip);
  const { rowHeld, ...nav } = usePresetRowNav(slotCount, onCarouselExitDown, { holdStill: props.holdStill });

  const [slots, setSlots] = useState<PresetPrompt[]>(() =>
    normalizeThreeSeeds(seeds, samplerOptions).slice(0, slotCount),
  );
  const slotsRef = useRef(slots);
  slotsRef.current = slots;
  // What each long chip tells the row about its own scroll, so it is replaced one pause after its
  // words stop (presetChipStay.ts).
  const [stayBoard] = useState(makeChipStayBoard);
  // The chip with the ring takes the row while its words do not fit (usePresetChipWiden.ts).
  const widen = usePresetChipWiden(
    slots.map((s) => s.text),
    slotCount,
  );

  useEffect(() => {
    const initial = normalizeThreeSeeds(seeds, samplerOptions);
    const started = startSlotRotation(initial, slotCount);
    let rotation: SlotRotation = started.rotation;
    const first = started.first;
    slotsRef.current = first;
    setSlots(first);

    const timeouts: number[] = [];
    const standDown: (() => void)[] = [];
    let cancelled = false;

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

    const loopStatic = (slotIndex: number, prompt: PresetPrompt, recheckMs?: number) => {
      const swap = () => {
        if (!mayStartNextCycle()) return;
        // Held (rowHeld): keep this question and look again shortly.
        if (rowHeld()) return loopStatic(slotIndex, prompt, PRESET_RING_HOLD_RECHECK_MS);
        const next = pickNext(prompt);
        showInSlot(slotIndex, next);
        loopStatic(slotIndex, next);
      };
      if (recheckMs !== undefined) return pushTimeout(swap, recheckMs);
      // A long chip is swapped one pause after its words stop; any other after its turn.
      standDown.push(
        armLeave({
          board: stayBoard,
          spacer,
          slot: slotIndex,
          text: prompt.text,
          fallbackMs: presetTurnMs(prompt.text, slotCount),
          tailMs: 0,
          onLeave: swap,
        }),
      );
    };
    first.forEach((prompt, i) => loopStatic(i, prompt));
    return () => {
      cancelled = true;
      timeouts.forEach((id) => window.clearTimeout(id));
      standDown.forEach((stop) => stop());
    };
    // askRestartToken restarts this whole effect on every completed Ask (D58 #3) even when
    // seedsKey is unchanged, which is exactly what happens under a pinned QA batch: it always
    // resolves to the same three chips, so seedsKey alone never signals that an Ask happened.
  }, [seedsKey, seeds, useLocalKnowledgeBase, slotCount, askRestartToken, rowHeld, stayBoard]);

  return (
    <PresetRowFocusRoot className="bonsai-preset-across">
      {slots.map((p, i) => (
        <div
          key={`preset-slot-${i}`}
          className="bonsai-preset-carousel-slot"
          data-bonsai-preset-visible="true"
          ref={widen.slotRef(i)}
          style={widen.slotStyle(i)}
        >
          {/* No key of its own: one button per slot, only its words change -- decode mode's
              shape. Keyed by its text, a swap destroyed the button holding the ring and nothing
              took it over (plan70-PRESET-ONE-LINE-03.json, static and fade). */}
          <PresetChipButton
            preset={p}
            setUnifiedInput={setUnifiedInput}
            onPreferAskMode={onPreferAskMode}
            scroll={!reducedMotion}
            buttonRef={nav.setButtonRef[i]}
            navHandlers={{ ...nav.handlersFor(i, slots.length), ...widen.ringHandlers(i) }}
            blockedEdge={nav.isBlockedEdge(i)}
            onScrollPlan={(text, report) => stayBoard.report(i, text, report)}
            onNeed={widen.reportNeed(i)}
            stub={widen.stubFor(i)}
          />
        </div>
      ))}
    </PresetRowFocusRoot>
  );
}

/** Decode (the default) or the static look; see the header. */
function MainTabPresetAnimatedChipsInner(props: MainTabPresetAnimatedChipsProps) {
  const { animationMode = "decode", ...rest } = props;
  if (animationMode === "static") return <MainTabPresetPlainSlots {...rest} />;
  return (
    <MainTabPresetDecodeSlots
      seeds={rest.seeds}
      setUnifiedInput={rest.setUnifiedInput}
      onPreferAskMode={rest.onPreferAskMode}
      onCarouselExitDown={rest.onCarouselExitDown}
      useLocalKnowledgeBase={rest.useLocalKnowledgeBase}
      askRestartToken={rest.askRestartToken}
      holdStill={rest.holdStill}
      presetSingleChip={rest.presetSingleChip}
    />
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
    prev.onPreferAskMode === next.onPreferAskMode &&
    prev.onCarouselExitDown === next.onCarouselExitDown &&
    prev.useLocalKnowledgeBase === next.useLocalKnowledgeBase &&
    prev.askRestartToken === next.askRestartToken &&
    prev.holdStill === next.holdStill &&
    prev.presetSingleChip === next.presetSingleChip
  );
}

export const MainTabPresetAnimatedChips = React.memo(MainTabPresetAnimatedChipsInner, presetChipsPropsEqual);
