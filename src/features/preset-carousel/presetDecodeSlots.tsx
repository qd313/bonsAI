/**
 * Title: Preset decode-mode chip row
 *
 * Purpose: Decode mode's chip button (DecodePresetChipButton) and the row component that drives
 * it (MainTabPresetDecodeSlots) -- the "Ghost in the Shell" reveal where each chip's text
 * scrambles into place, letter by letter, behind a blinking caret.
 *
 * Used for: MainTabPresetAnimatedChipsInner in src/components/MainTabPresetAnimatedChips.tsx,
 * when the chip-animation setting is "decode".
 *
 * Solves: Runs the reveal on a single shared requestAnimationFrame loop, writing straight to each
 * label's textContent through a ref rather than React state, so a churning chip does not force a
 * re-render on every frame (measured cost on Deck hardware).
 *
 * Does not: Compute the reveal text itself -- see presetChipDecodeText.ts for the pure
 * lock-boundary/churn maths this row's effect calls into. Also does not own
 * MainTabPresetAnimatedChipsProps -- that type lives in presetChipShared.ts, not in the component
 * file, so importing it here does not create an import cycle (the component file imports this
 * file, to render decode mode).
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@decky/ui";
import type { AskModeId } from "../../data/askMode";
import type { PresetPrompt } from "../../data/presets";
import { PresetChipLeadingBadges, PresetChipText } from "./presetChipButton";
import { PresetRowFocusRoot, usePresetRowNav } from "./presetRowFocusNav";
import { effectivePresetVisibleSlots, PRESET_CHIP_HEIGHT_PX, presetHoldMs } from "./presetRowLayout";
import { nextSlotPreset, startSlotRotation, type SlotRotation } from "./presetSlotRotation";
import { seedsKeyFrom } from "./carouselState";
import { joinPresetWithRunningGame } from "../../utils/joinPresetWithRunningGame";
import {
  composeDecodeText,
  type DecodeSlotAnim,
  makeDecodeChurn,
  PRESET_DECODE_CARET_BLINK_MS,
  PRESET_DECODE_CHAR_MS,
  PRESET_DECODE_CHURN_REFRESH_MS,
} from "./presetChipDecodeText";
import {
  type MainTabPresetAnimatedChipsProps,
  normalizeThreeSeeds,
  PRESET_CAROUSEL_ACTIVE_MS,
  prefersReducedMotion,
  slotStaggerMs,
} from "./presetChipShared";

/**
 * The label's text is owned by the reveal effect below while the prompt is still churning, written
 * straight to the churn span's `textContent` via `setLabelRef` — never through React state. The JSX
 * child there is only what paints during a slot's stagger delay, before its first `begin` call;
 * every frame after that bypasses React entirely, which is the point of the rewrite (see the module
 * header comment on frame cost). Once the prompt has resolved the churn span is replaced by the
 * ordinary label, so Steam's Marquee measures settled text, never a mid-churn frame.
 */
function DecodePresetChipButton(props: {
  preset: PresetPrompt;
  resolved: boolean;
  scroll: boolean;
  setLabelRef: (el: HTMLSpanElement | null) => void;
  setUnifiedInput: React.Dispatch<React.SetStateAction<string>>;
  onPreferAskMode?: (mode: AskModeId) => void;
  buttonRef?: (el: HTMLElement | null) => void;
  navHandlers?: Record<string, unknown>;
  /** The chip row just claimed a Left/Right press without moving anywhere -- ran out of chips. */
  blockedEdge?: boolean;
}) {
  const {
    preset: p,
    resolved,
    scroll,
    setLabelRef,
    setUnifiedInput,
    onPreferAskMode,
    buttonRef,
    navHandlers,
    blockedEdge,
  } = props;
  return (
    <Button
      className={
        "bonsai-preset-glass bonsai-preset-glass--decode" +
        (blockedEdge ? " bonsai-preset-chip-blocked-edge" : "")
      }
      ref={buttonRef}
      {...(navHandlers ?? {})}
      focusable
      onClick={() => {
        // Always the real prompt, never whatever is mid-churn on screen — the text is known from
        // frame 0, so there is no "partial" to accidentally submit.
        setUnifiedInput(joinPresetWithRunningGame(p.text));
        if (p.preferAskMode && onPreferAskMode) {
          onPreferAskMode(p.preferAskMode);
        }
      }}
      style={{
        width: "100%",
        minHeight: PRESET_CHIP_HEIGHT_PX,
        fontSize: 12,
        // Same normal chip-text colour PresetChipButton uses below (never the accent): the label
        // used to be tinted `--bonsai-ui-accent-toned` by a CSS rule in section-4.ts, which made a
        // decode chip's words read in the same colour family as its Tip dot -- the dot is the only
        // thing meant to carry the accent (maintainer bug report, 2026-09-19). Set inline, not left
        // to the Button's own default, so it reads the same as every other animation mode.
        color: "#c4d3e2",
      }}
    >
      <span className="bonsai-preset-chip-label">
        {/* Shared with every other animation mode (PresetChipLeadingBadges, above) -- decode used
            to draw its own copy of just the Test badge and never picked up the Tip one when it
            was added later, which is exactly how CHIP-BUTTON-09 happened (a real, note-sourced
            chip with ragTip=true whose dot never drew in decode mode). One function now, not two
            copies that can go out of sync again. */}
        <PresetChipLeadingBadges p={p} />
        {resolved ? (
          <PresetChipText text={p.text} scroll={scroll} />
        ) : (
          <span className="bonsai-preset-chip-text bonsai-preset-chip-text--churn" ref={setLabelRef}>
            {" "}
          </span>
        )}
        {p.beta ? (
          <span
            style={{
              marginLeft: 6,
              fontSize: 10,
              fontStyle: "italic",
              color: "var(--bonsai-ui-accent-toned, #5b9e7e)",
              fontWeight: 600,
            }}
          >
            [beta]
          </span>
        ) : null}
      </span>
    </Button>
  );
}

/**
 * Ghost in the Shell title-sequence reveal: each chip arrives as a full-width block of scrambled
 * glyphs (reserving the prompt's final character width from frame 0, so the chip never reflows)
 * that lock into the real prompt left to right behind a blinking block caret, then hold and move
 * to the next prompt.
 *
 * Per-slot animation state lives in a plain object inside the effect closure (`DecodeSlotAnim`),
 * not React state, and a single shared `requestAnimationFrame` loop drives every slot, writing
 * straight to each label's `textContent` through a ref. `slots` and `resolved` React state still
 * exist, but only change once per prompt cycle (when a prompt begins and when it settles) — that's
 * the frequency a Button's onClick closure, the beta badge and the scrolling label need, not
 * per-frame.
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
    presetSingleChip = false,
  } = props;
  const samplerOptions = { useLocalKnowledgeBase };
  const seedsKey = seedsKeyFrom(seeds);
  const reducedMotion = prefersReducedMotion();
  const slotCount = effectivePresetVisibleSlots(presetSingleChip);
  const nav = usePresetRowNav(slotCount, onCarouselExitDown);

  const [slots, setSlots] = useState<PresetPrompt[]>(() =>
    normalizeThreeSeeds(seeds, samplerOptions).slice(0, slotCount),
  );
  /** Per slot: the reveal has settled, so the ordinary (scrolling) label may take over. */
  const [resolved, setResolved] = useState<boolean[]>(() => Array.from({ length: slotCount }, () => false));
  const slotsRef = useRef(slots);
  slotsRef.current = slots;

  const labelRefs = useRef<(HTMLSpanElement | null)[]>(Array.from({ length: slotCount }, () => null));
  /** Stable per-slot ref callbacks — an inline arrow per render would churn ref identity and
   *  briefly null the target between renders for no reason (`slots` only updates once a cycle). */
  const labelRefSetters = useMemo(
    () =>
      Array.from({ length: slotCount }, (_, i) => (el: HTMLSpanElement | null) => {
        labelRefs.current[i] = el;
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

    const sessionEnd = performance.now() + PRESET_CAROUSEL_ACTIVE_MS;
    let cancelled = false;
    const mayStartNextCycle = (): boolean => !cancelled && performance.now() < sessionEnd;

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
          pushTimeout(() => {
            if (!mayStartNextCycle()) return;
            runReduced(slotIndex, pickNext(prompt), 0);
          }, presetHoldMs(prompt.text));
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
      const el = labelRefs.current[slotIndex];
      if (el) el.textContent = composeDecodeText(prompt.text, 0, churn, true);
    };

    const process = (slotIndex: number, now: number, churnDue: boolean, blinkDue: boolean) => {
      const anim = state[slotIndex];
      if (!anim) return;

      if (anim.resolved) {
        if (now >= anim.holdEndAt && mayStartNextCycle()) {
          begin(slotIndex, pickNext(anim.prompt), now);
        }
        return;
      }

      const text = anim.prompt.text;
      const elapsed = now - anim.startAt;
      const revealedCount = Math.min(text.length, Math.floor(elapsed / PRESET_DECODE_CHAR_MS));

      if (revealedCount >= text.length) {
        anim.resolved = true;
        anim.holdEndAt = now + presetHoldMs(text);
        const el = labelRefs.current[slotIndex];
        if (el) el.textContent = text;
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
        const el = labelRefs.current[slotIndex];
        if (el) el.textContent = composeDecodeText(text, revealedCount, anim.churn, caretOn);
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
            setLabelRef={labelRefSetters[i]!}
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
