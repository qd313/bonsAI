/**
 * Title: Preset decode-mode chip row
 *
 * Purpose: The row component that drives decode mode (MainTabPresetDecodeSlots) -- the "Ghost in the
 * Shell" reveal where each chip's text scrambles into place, letter by letter, behind a blinking
 * caret. The chip button it draws is DecodePresetChipButton, in presetDecodeChipButton.tsx.
 *
 * Used for: MainTabPresetAnimatedChipsInner in src/components/MainTabPresetAnimatedChips.tsx,
 * when the chip-animation setting is "decode".
 *
 * Solves: Runs the reveal on a single shared requestAnimationFrame loop, writing straight to each
 * label's text through refs rather than React state, so a churning chip does not force a
 * re-render on every frame (measured cost on Deck hardware). The caret has its own span, so it can
 * be drawn in the accent colour while the letters keep theirs.
 *
 * Does not: Compute the reveal text itself -- see presetChipDecodeText.ts for the pure
 * lock-boundary/churn maths this row's effect calls into. Also does not own
 * MainTabPresetAnimatedChipsProps -- that type lives in presetChipShared.ts, not in the component
 * file, so importing it here does not create an import cycle (the component file imports this
 * file, to render decode mode).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { PresetPrompt } from "../../data/presets";
import { DecodePresetChipButton, type DecodeLabelNodes, type DecodeLabelRefs, type DecodeLabelPart } from "./presetDecodeChipButton";
import { PresetRowFocusRoot, usePresetRowNav } from "./presetRowFocusNav";
import { effectivePresetVisibleSlots, presetTurnMs } from "./presetRowLayout";
import { makeChangeSpacer } from "./changeSpacing";
import { nextSlotPreset, startSlotRotation, type SlotRotation } from "./presetSlotRotation";
import { seedsKeyFrom } from "./carouselState";
import {
  composeDecodeParts,
  decodeHoldMs,
  type DecodeSlotAnim,
  type DecodeTextParts,
  makeDecodeChurn,
  PRESET_DECODE_CARET_BLINK_MS,
  PRESET_DECODE_CHAR_MS,
  PRESET_DECODE_CHURN_REFRESH_MS,
} from "./presetChipDecodeText";
import {
  type MainTabPresetAnimatedChipsProps,
  normalizeThreeSeeds,
  prefersReducedMotion,
  slotStaggerMs,
} from "./presetChipShared";

/** How often a reduced-motion chip held by `rowHeld` checks whether it may change yet. */
const PRESET_DECODE_HOLD_RECHECK_MS = 500;


/**
 * Writes one frame of a reveal into a label's spans. It runs only when the old single whole-label
 * write ran -- a lock advance, a churn refresh or a blink, never every frame -- and a part that did
 * not change is not written: a blink touches the caret alone, a churn refresh the tail (and the
 * caret only if it blinked too). Plan 69's frame-rate lesson is that what costs frames is how often
 * and how much of the panel changes, and neither grows here: the label is redrawn on the same ticks
 * as before, one chip-sized box, still with no React render.
 */
function paintDecodeLabel(nodes: DecodeLabelNodes | undefined, parts: DecodeTextParts): void {
  if (!nodes) return;
  for (const part of ["locked", "caret", "tail"] as const) {
    const el = nodes[part];
    if (el && el.textContent !== parts[part]) el.textContent = parts[part];
  }
}


/**
 * Ghost in the Shell title-sequence reveal: each chip arrives as a full-width block of scrambled
 * glyphs (reserving the prompt's final character width from frame 0, so the chip never reflows)
 * that lock into the real prompt left to right behind a blinking block caret, then hold and move
 * to the next prompt.
 *
 * Per-slot animation state lives in a plain object inside the effect closure (`DecodeSlotAnim`),
 * not React state, and a single shared `requestAnimationFrame` loop drives every slot, writing
 * straight to each label's three spans through refs (`paintDecodeLabel`). `slots` and `resolved`
 * React state still exist, but only change once per prompt cycle (when a prompt begins and when it
 * settles) — that's the frequency a Button's onClick closure, the beta badge and the scrolling
 * label need, not per-frame.
 */
export function MainTabPresetDecodeSlots(
  props: Omit<MainTabPresetAnimatedChipsProps, "fadeAnimationEnabled" | "animationMode">,
) {
  const {
    seeds,
    setUnifiedInput,
    onPreferAskMode,
    onCarouselExitDown,
    useLocalKnowledgeBase = false,
    askRestartToken,
    holdStill = false,
    presetSingleChip = false,
  } = props;
  const samplerOptions = { useLocalKnowledgeBase };
  const seedsKey = seedsKeyFrom(seeds);
  const reducedMotion = prefersReducedMotion();
  const slotCount = effectivePresetVisibleSlots(presetSingleChip);
  const nav = usePresetRowNav(slotCount, onCarouselExitDown, { holdStill });

  const [slots, setSlots] = useState<PresetPrompt[]>(() =>
    normalizeThreeSeeds(seeds, samplerOptions).slice(0, slotCount),
  );
  /** Per slot: the reveal has settled, so the ordinary (scrolling) label may take over. */
  const [resolved, setResolved] = useState<boolean[]>(() => Array.from({ length: slotCount }, () => false));
  const slotsRef = useRef(slots);
  slotsRef.current = slots;

  const labelRefs = useRef<DecodeLabelNodes[]>([]);
  /** Stable per-slot ref callbacks — an inline arrow per render would churn ref identity and
   *  briefly null the target between renders for no reason (`slots` only updates once a cycle). */
  const labelRefSetters = useMemo(
    () =>
      Array.from({ length: slotCount }, (_, i): DecodeLabelRefs => {
        const setPart = (part: DecodeLabelPart) => (el: HTMLSpanElement | null) => {
          const nodes = labelRefs.current[i] ?? { locked: null, caret: null, tail: null };
          nodes[part] = el;
          labelRefs.current[i] = nodes;
        };
        return { locked: setPart("locked"), caret: setPart("caret"), tail: setPart("tail") };
      }),
    [slotCount],
  );

  useEffect(() => {
    const initial = normalizeThreeSeeds(seeds, samplerOptions);
    const started = startSlotRotation(initial, slotCount);
    let rotation: SlotRotation = started.rotation;
    const first = started.first;
    slotsRef.current = first;
    setSlots(first);
    setResolved(Array.from({ length: slotCount }, () => false));

    let cancelled = false;
    const mayStartNextCycle = (): boolean => !cancelled;
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
    const markResolved = (slotIndex: number, value: boolean) => {
      setResolved((prev) => (prev[slotIndex] === value ? prev : prev.map((v, j) => (j === slotIndex ? value : v))));
    };

    const timeouts: number[] = [];
    const pushTimeout = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        if (cancelled) return;
        fn();
      }, ms);
      timeouts.push(id);
    };

    // prefers-reduced-motion: reduce — swap the text in instantly, no churn, no caret blink.
    // Each slot still keeps its own stagger before its first appearance (flavor shared with every
    // other mode, not part of the "churn" the rule is about); every swap after that is instant.
    if (reducedMotion) {
      const runReduced = (slotIndex: number, prompt: PresetPrompt, firstDelay: number) => {
        pushTimeout(() => {
          showInSlot(slotIndex, prompt);
          markResolved(slotIndex, true);
          const next = () => {
            if (!mayStartNextCycle()) return;
            if (nav.rowHeld()) {
              pushTimeout(next, PRESET_DECODE_HOLD_RECHECK_MS);
              return;
            }
            runReduced(slotIndex, pickNext(prompt), 0);
          };
          pushTimeout(next, spacer.delay(slotIndex, Date.now(), presetTurnMs(prompt.text, slotCount)));
        }, firstDelay);
      };
      first.forEach((prompt, i) => runReduced(i, prompt, slotStaggerMs(i)));
      return () => {
        cancelled = true;
        timeouts.forEach((id) => window.clearTimeout(id));
      };
    }

    // Full decode path. One shared rAF loop drives every slot; DOM writes are throttled to a lock
    // advance, a churn refresh, or a caret blink — not every frame. See the module header.
    const state: (DecodeSlotAnim | null)[] = Array.from({ length: slotCount }, () => null);
    let rafId = 0;
    let lastChurnRefresh = 0;
    let lastBlinkToggle = 0;
    let caretOn = true;

    const begin = (slotIndex: number, prompt: PresetPrompt, now: number) => {
      const churn = makeDecodeChurn(prompt.text.length);
      state[slotIndex] = { prompt, startAt: now, churn, lastRevealedCount: -1, resolved: false, holdEndAt: 0 };
      showInSlot(slotIndex, prompt);
      markResolved(slotIndex, false);
      // Frame 0: paint the full-length scramble immediately rather than waiting for the next rAF
      // tick. On a re-begin the churn span is remounting and the ref may still be null; the first
      // tick after React commits repaints it (lastRevealedCount starts at -1).
      paintDecodeLabel(labelRefs.current[slotIndex], composeDecodeParts(prompt.text, 0, churn, true));
    };

    const process = (slotIndex: number, now: number, churnDue: boolean, blinkDue: boolean) => {
      const anim = state[slotIndex];
      if (!anim) return;

      if (anim.resolved) {
        // rowHeld: an answer is being written or the ring is on the row; a reveal under way finishes.
        if (now >= anim.holdEndAt && mayStartNextCycle() && !nav.rowHeld()) {
          begin(slotIndex, pickNext(anim.prompt), now);
        }
        return;
      }

      const text = anim.prompt.text;
      const elapsed = now - anim.startAt;
      const revealedCount = Math.min(text.length, Math.floor(elapsed / PRESET_DECODE_CHAR_MS));

      if (revealedCount >= text.length) {
        anim.resolved = true;
        anim.holdEndAt = spacer.reserve(slotIndex, now + decodeHoldMs(text, slotCount));
        paintDecodeLabel(labelRefs.current[slotIndex], { locked: text, caret: "", tail: "" });
        // Hands the label to React: the churn span gives way to the ordinary label, which is where
        // Steam's Marquee measures the settled text and starts its crawl.
        markResolved(slotIndex, true);
        return;
      }

      if (churnDue) {
        anim.churn = makeDecodeChurn(text.length);
      }
      if (revealedCount !== anim.lastRevealedCount || churnDue || blinkDue) {
        anim.lastRevealedCount = revealedCount;
        paintDecodeLabel(labelRefs.current[slotIndex], composeDecodeParts(text, revealedCount, anim.churn, caretOn));
      }
    };

    const tick = (now: number) => {
      if (cancelled) return;
      const churnDue = now - lastChurnRefresh >= PRESET_DECODE_CHURN_REFRESH_MS;
      const blinkDue = now - lastBlinkToggle >= PRESET_DECODE_CARET_BLINK_MS;
      if (blinkDue) {
        caretOn = !caretOn;
        lastBlinkToggle = now;
      }
      for (let i = 0; i < slotCount; i++) process(i, now, churnDue, blinkDue);
      if (churnDue) lastChurnRefresh = now;
      rafId = window.requestAnimationFrame(tick);
    };

    first.forEach((prompt, i) => pushTimeout(() => begin(i, prompt, performance.now()), slotStaggerMs(i)));
    rafId = window.requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
      timeouts.forEach((id) => window.clearTimeout(id));
    };
    // askRestartToken restarts this whole effect on every completed Ask (D58 #3) even when
    // seedsKey is unchanged, which is exactly what happens under a pinned QA batch: it always
    // resolves to the same three chips, so seedsKey alone never signals that an Ask happened.
  }, [seedsKey, seeds, reducedMotion, useLocalKnowledgeBase, slotCount, askRestartToken]);

  return (
    <PresetRowFocusRoot className="bonsai-preset-across">
      {slots.map((p, i) => (
        <div
          key={`preset-decode-slot-${i}`}
          className="bonsai-preset-carousel-slot"
          data-bonsai-preset-visible="true"
        >
          <DecodePresetChipButton
            preset={p}
            resolved={resolved[i] ?? false}
            scroll={!reducedMotion}
            labelRefs={labelRefSetters[i]!}
            setUnifiedInput={setUnifiedInput}
            onPreferAskMode={onPreferAskMode}
            buttonRef={nav.setButtonRef[i]}
            navHandlers={nav.handlersFor(i, slots.length)}
            blockedEdge={nav.isBlockedEdge(i)}
          />
        </div>
      ))}
    </PresetRowFocusRoot>
  );
}
