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
 * 5. Whatever mode is running, all of them stop scheduling new cycles a
 *    fixed time after mounting or after the prompts are reseeded — an
 *    animation already in progress still finishes, then the row simply
 *    rests until it remounts.
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
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Focusable, Marquee, type MarqueeProps } from "@decky/ui";
import type { AskModeId } from "../data/askMode";
import {
  frozenTestChipsActive,
  getRandomPresetExcluding,
  getRandomPresets,
  type PresetPrompt,
  type PresetSamplerOptions,
} from "../data/presets";
import {
  advanceCarouselFocus,
  buildInitialCarouselState,
  CAROUSEL_HISTORY_MAX,
  CAROUSEL_MANUAL_PAUSE_MS,
  CAROUSEL_SLIDE_MS,
  CAROUSEL_STEP_MS,
  carouselWindowStart,
  mergeContextualSeeds,
  nextFrozenHistoryEntry,
  seedsKeyFrom,
  visibleWindowTexts,
} from "../features/preset-carousel/carouselState";
import { pickCarouselChipWithSessionRag } from "../features/preset-carousel/composePresetSeedsWithSessionRag";
import {
  effectivePresetVisibleSlots,
  PRESET_CHIP_BLOCKED_EDGE_FLASH_MS,
  PRESET_CHIP_HEIGHT_PX,
  PRESET_MARQUEE_DELAY_S,
  PRESET_MARQUEE_FADE_LENGTH,
  PRESET_MARQUEE_SPEED,
  presetHoldMs,
} from "../features/preset-carousel/presetRowLayout";
import {
  nextSlotPreset,
  startSlotRotation,
  type SlotRotation,
} from "../features/preset-carousel/presetSlotRotation";
import { joinPresetWithRunningGame } from "../utils/joinPresetWithRunningGame";
import { buildChipNavHandlers } from "../features/preset-carousel/presetRowNav";
import { registerNavFocus, unregisterNavFocus, takeNavFocus, type NavRefHolder } from "../utils/navFocusRegistry";
import { elementHasFocus } from "../utils/uiDocument";

/*
 * Fade timings for chips side by side: while one chip fades, the other is still there, so a slow
 * out and a quicker in read as a calm swap rather than an empty row. They were cut to 500/500 while
 * the row was one chip (2026-08-31) because that chip left the row blank for three seconds per
 * cycle; restored 2026-09-01 with the second chip.
 */
/** Fade-in duration (ms); must match the slot wrapper transition when opacity increases. */
const PRESET_CAROUSEL_FADE_IN_MS = 1000;
/** Fade-out duration (ms); must match the slot wrapper transition when opacity decreases. */
const PRESET_CAROUSEL_FADE_OUT_MS = 2000;
/** Carousel schedules new preset cycles for this long after mount/re-seed; in-flight fades still complete, then no more swaps until remount. */
export const PRESET_CAROUSEL_ACTIVE_MS = 60_000;
/** Stagger each slot's first appearance so the chips never move in lockstep. */
const PRESET_SLOT_STAGGER_MS: readonly number[] = [750, 1300, 1700];
function slotStaggerMs(slotIndex: number): number {
  return PRESET_SLOT_STAGGER_MS[slotIndex] ?? PRESET_SLOT_STAGGER_MS[PRESET_SLOT_STAGGER_MS.length - 1]!;
}

/** Milliseconds between locked characters in decode mode (must feel close to live answer streaming). */
const PRESET_DECODE_CHAR_MS = 42;
/**
 * How often the still-churning glyphs reshuffle, ms. Throttled well below frame rate on purpose:
 * the reveal loop runs one shared `requestAnimationFrame` per tick across the slots, but only
 * writes to the DOM on this cadence (or on a lock advance / caret blink) so a churning chip does
 * not repaint every 16ms frame on Deck hardware.
 */
const PRESET_DECODE_CHURN_REFRESH_MS = 55;
/** Caret blink period, ms. */
const PRESET_DECODE_CARET_BLINK_MS = 450;
/** Block caret glyph, drawn inline at the lock boundary rather than as a separate CSS ::after. */
export const PRESET_DECODE_CARET_CHAR = "▋";

/**
 * Churn glyph pool for the still-scrambling tail: printable ASCII plus half-width katakana
 * (U+FF66-U+FF9D). Both render half-width. Full-width CJK would not — the chip label reserves
 * its width from frame 0 at the prompt's final character count, so a double-width churn glyph
 * would push a long prompt into the ellipsis mid-animation and undo the whole point of the rewrite.
 */
const PRESET_DECODE_GLYPH_POOL: string = (() => {
  let pool = "";
  for (let code = 0x21; code <= 0x7e; code += 1) pool += String.fromCharCode(code);
  for (let code = 0xff66; code <= 0xff9d; code += 1) pool += String.fromCharCode(code);
  return pool;
})();

function randomDecodeGlyph(): string {
  return PRESET_DECODE_GLYPH_POOL[Math.floor(Math.random() * PRESET_DECODE_GLYPH_POOL.length)]!;
}

function makeDecodeChurn(length: number): string[] {
  return Array.from({ length }, randomDecodeGlyph);
}

/**
 * Composes what the label should show right now: locked (real) characters up to `revealedCount`,
 * then a boundary position that alternates between the caret glyph and the churning glyph beneath
 * it (never an *extra* character — that would grow the string past the reserved width), then the
 * rest of the still-churning tail. Once `revealedCount` reaches the prompt length the caller
 * should just render `text` directly; this always returns a string of exactly `text.length`.
 */
export function composeDecodeText(
  text: string,
  revealedCount: number,
  churn: readonly string[],
  caretOn: boolean,
): string {
  if (revealedCount >= text.length) return text;
  const prefix = text.slice(0, revealedCount);
  const boundaryChar = caretOn ? PRESET_DECODE_CARET_CHAR : (churn[revealedCount] ?? " ");
  const tail = churn.slice(revealedCount + 1).join("");
  return prefix + boundaryChar + tail;
}

/** Per-slot decode animation state, owned by the reveal effect's closure — never React state, so a
 *  lock advance or churn refresh never triggers a re-render. See `MainTabPresetDecodeSlots`. */
type DecodeSlotAnim = {
  prompt: PresetPrompt;
  /** `performance.now()` when this prompt's reveal began. */
  startAt: number;
  churn: string[];
  /** Avoids redundant DOM writes: skip repainting when neither the lock boundary, a churn
   *  refresh, nor the caret blink changed anything since the last tick. */
  lastRevealedCount: number;
  resolved: boolean;
  /** Valid once `resolved`: when to start the next prompt's reveal. */
  holdEndAt: number;
};

type SlotFade = { opacity: number; transitionMs: number };

/**
 * Three contextual seeds still arrive from upstream (and a frozen QA batch is applied at count
 * 3), even though PRESET_VISIBLE_SLOTS show at a time — the slot rotation queues the rest.
 */
function normalizeThreeSeeds(
  seeds: PresetPrompt[],
  samplerOptions?: PresetSamplerOptions,
): [PresetPrompt, PresetPrompt, PresetPrompt] {
  const fallback = getRandomPresets(3, samplerOptions);
  return [
    seeds[0] ?? fallback[0]!,
    seeds[1] ?? fallback[1]!,
    seeds[2] ?? fallback[2]!,
  ];
}

type PresetChipAnimationMode = "fade" | "carousel" | "static" | "decode";

export type MainTabPresetAnimatedChipsProps = {
  /** When upstream presets change (e.g. after ask), carousel re-seeds from this list. */
  seeds: PresetPrompt[];
  setUnifiedInput: React.Dispatch<React.SetStateAction<string>>;
  /** When false, chips stay fully opaque and prompts rotate after hold without opacity transitions. */
  fadeAnimationEnabled?: boolean;
  /** fade = opacity crossfade; carousel = sideways window on a history; static = no opacity animation; decode = Ghost in the Shell scramble-to-resolve reveal. */
  animationMode?: PresetChipAnimationMode;
  /** If a preset declares `preferAskMode`, apply it when the chip is chosen. */
  onPreferAskMode?: (mode: AskModeId) => void;
  /** D-pad Down from any chip hands the ring to the Ask field; returns whether it moved. */
  onCarouselExitDown?: () => boolean | void;
  /** When true, KB-advice static seeds are excluded from timer-driven re-samples. */
  useLocalKnowledgeBase?: boolean;
  /**
   * Bumped by MainTabPresetRow every time an Ask completes, so every mode's 60-second walk
   * restarts even when the reseed produced the exact same three seeds. A pinned QA batch always
   * returns its first three entries verbatim (`applyTempFrozenCarousel` in data/presets.ts), so
   * `seedsKeyFrom` cannot tell an Ask happened from this alone (D58 #3).
   */
  askRestartToken?: number;
  /**
   * "One suggestion chip" setting (roadmap `[chips]` ★★★): when true the row shows a single chip
   * with the whole column instead of `PRESET_VISIBLE_SLOTS` side by side. Off (two chips) is the
   * shipped default. See `effectivePresetVisibleSlots`.
   */
  presetSingleChip?: boolean;
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * The prompt text. A prompt longer than its chip scrolls sideways through Steam's own Marquee —
 * the crawl the library uses for long game names — which decides "does this overflow" on the live
 * element, never from a predicted width (the roadmap's marquee item insists on that, with receipts).
 * Decky finds the component in Steam's bundle at runtime; when it is missing, and under reduced
 * motion, the label is cut off with an ellipsis instead.
 */
function PresetChipText({ text, scroll }: { text: string; scroll: boolean }) {
  const MarqueeComponent: React.FC<MarqueeProps> | undefined = Marquee;
  if (scroll && MarqueeComponent) {
    return (
      <MarqueeComponent
        key={text}
        play
        speed={PRESET_MARQUEE_SPEED}
        delay={PRESET_MARQUEE_DELAY_S}
        fadeLength={PRESET_MARQUEE_FADE_LENGTH}
        resetOnPause
        className="bonsai-preset-chip-text bonsai-preset-chip-text--marquee"
      >
        {text}
      </MarqueeComponent>
    );
  }
  return <span className="bonsai-preset-chip-text">{text}</span>;
}

/**
 * Badges stay pinned at the left of the chip and only the prompt text scrolls: the Tip badge exists
 * to be seen at a glance (Phase 4 track 1), and a badge that scrolled away would defeat that.
 */
function PresetChipLabel({ p, scroll }: { p: PresetPrompt; scroll: boolean }) {
  return (
    <span className="bonsai-preset-chip-label">
      {p.testChip ? (
        <span
          className="bonsai-preset-chip-test-badge"
          style={{
            marginRight: 6,
            fontSize: 9,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            fontWeight: 700,
            // Deliberately not the accent colour the Tip badge uses. A frozen batch is a QA
            // state, and it has to be obvious at a glance that the carousel is not showing what
            // the plugin would have chosen.
            color: "#f0b232",
          }}
        >
          Test
        </span>
      ) : null}
      {p.ragTip ? (
        <span
          className="bonsai-preset-chip-tip-badge"
          aria-label="Tip"
          title="Tip"
          style={{
            width: 7,
            height: 7,
            borderRadius: 2,
            background: "var(--bonsai-ui-accent-badge, rgba(46, 135, 83, 0.8))",
            marginRight: 6,
            flex: "0 0 auto",
            display: "inline-block",
          }}
        />
      ) : null}
      <PresetChipText text={p.text} scroll={scroll} />
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
  );
}

function PresetChipButton(props: {
  preset: PresetPrompt;
  setUnifiedInput: React.Dispatch<React.SetStateAction<string>>;
  onPreferAskMode?: (mode: AskModeId) => void;
  scroll: boolean;
  dimmed?: boolean;
  focusable?: boolean;
  buttonRef?: (el: HTMLElement | null) => void;
  navHandlers?: Record<string, unknown>;
  /** The chip row just claimed a Left/Right press without moving anywhere -- ran out of chips. */
  blockedEdge?: boolean;
}) {
  const {
    preset: p,
    setUnifiedInput,
    onPreferAskMode,
    scroll,
    dimmed,
    focusable = true,
    buttonRef,
    navHandlers,
    blockedEdge,
  } = props;
  return (
    <Button
      className={"bonsai-preset-glass" + (blockedEdge ? " bonsai-preset-chip-blocked-edge" : "")}
      ref={buttonRef}
      {...(navHandlers ?? {})}
      focusable={focusable}
      onClick={() => {
        setUnifiedInput(joinPresetWithRunningGame(p.text));
        if (p.preferAskMode && onPreferAskMode) {
          onPreferAskMode(p.preferAskMode);
        }
      }}
      style={{
        width: "100%",
        minHeight: PRESET_CHIP_HEIGHT_PX,
        fontSize: 12,
        color: dimmed ? "#8fa3b8" : "#c4d3e2",
        opacity: dimmed ? 0.55 : 1,
        transform: dimmed ? "scale(0.96)" : "scale(1)",
        transition: "opacity 420ms ease, transform 420ms ease, color 420ms ease",
      }}
    >
      <PresetChipLabel p={p} scroll={scroll} />
    </Button>
  );
}

/**
 * The row's focus container, shared by every mode. Steam treats it as one navigation container;
 * the chips inside carry their own Left/Right/Up/Down handlers (`usePresetRowNav`), because the
 * `flow-children` hint on its own left Steam navigating the row as a column on device.
 *
 * `navRef` is what lets the Ask bar hand the ring up across that boundary. Steam populates it with
 * the container's nav node, which is the only supported way to move the gamepad ring between
 * containers — a plain `focus()` moves `activeElement` and leaves the ring where it was
 * (navFocusRegistry, measured 2026-08-04). That split is what put a ring on a chip while the D-pad
 * was really on the tab strip, found on device 2026-08-28. Before 2026-09-01 only carousel mode
 * registered; the other modes fell back to the plain `focus()` and inherited that bug.
 */
function PresetRowFocusRoot(props: {
  className: string;
  children: React.ReactNode;
  /**
   * Fires when the ring enters the row from outside it (the Ask field's Up, the strip's Down), not
   * on moves between chips. The carousel uses it to land on its marked chip: Steam enters a
   * container at its first focusable child, which is the older of the two on screen.
   */
  onEnterFromOutside?: () => void;
}) {
  const navRef = useRef<NavRefHolder["current"]>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    registerNavFocus("preset-carousel", navRef);
    return () => unregisterNavFocus("preset-carousel", navRef);
  }, []);
  const { onEnterFromOutside } = props;
  const onFocus = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      if (!onEnterFromOutside) return;
      const from = e.relatedTarget as Node | null;
      if (from && rootRef.current?.contains(from)) return;
      onEnterFromOutside();
    },
    [onEnterFromOutside],
  );
  return (
    <Focusable
      ref={rootRef}
      /* `navRef` is a real Steam Focusable prop that Decky's types omit — same gap as `onMoveDown`,
         so it goes through the cast the repo already uses for those (SessionContextStrip). */
      {...({ navRef } as Record<string, unknown>)}
      flow-children="horizontal"
      className={`bonsai-preset-carousel-focus-root ${props.className}`}
      onFocus={onFocus}
    >
      {props.children}
    </Focusable>
  );
}

/**
 * The D-pad graph for the chips, the same shape as the Ask bar's buttons: each chip carries its own
 * Left/Right/Up/Down handlers, spread onto the Decky Button through the cast the repo uses for the
 * Steam props Decky's types omit. Steam treats a Focusable as a column unless told otherwise, and
 * the `flow-children="horizontal"` hint alone did not change that on device (2026-09-01): Left left
 * the plugin for the Quick Access rail and Down/Up walked between chips. Left/Right move DOM focus
 * between siblings of this one container, which is the one case a plain `focus()` is right for;
 * Down and Up hand the ring across a container boundary through the registered handovers.
 *
 * `maxCount` sizes the ref array once so the ref callbacks keep their identity across renders.
 */
export function usePresetRowNav(
  maxCount: number,
  exitDown?: () => boolean | void,
  options?: {
    /** False for a chip that is rendered but not a focus stop right now (a carousel chip outside the window). */
    isFocusable?: (index: number) => boolean;
    /** Bring a chip that is not a focus stop yet into the window; the caller focuses it once it is. */
    requestFocus?: (index: number) => boolean;
    /** Right at the last chip; see buildChipNavHandlers and carouselState.nextFrozenHistoryEntry. */
    advanceAtEnd?: () => boolean;
  },
) {
  const buttonRefs = useRef<(HTMLElement | null)[]>(Array.from({ length: maxCount }, () => null));
  const setButtonRef = useMemo(
    () =>
      Array.from({ length: maxCount }, (_, i) => (el: HTMLElement | null) => {
        buttonRefs.current[i] = el;
      }),
    [maxCount],
  );
  const isFocusable = options?.isFocusable;
  const requestFocus = options?.requestFocus;
  const advanceAtEnd = options?.advanceAtEnd;
  const focusChip = useCallback(
    (i: number): boolean => {
      if (isFocusable && !isFocusable(i)) return requestFocus ? requestFocus(i) : false;
      const el = buttonRefs.current[i];
      if (!el) return false;
      el.focus();
      return true;
    },
    [isFocusable, requestFocus],
  );
  /*
   * Which chip, if any, should show the "ran out of chips" edge cue right now (roadmap `[chips]`
   * ★★, filed 2026-09-04). `buildChipNavHandlers`' `onBlockedEdge` fires only on a Left/Right press
   * that was claimed *without moving anything* -- exactly the case that used to leave the screen
   * looking identical to a stall. A timeout clears it after PRESET_CHIP_BLOCKED_EDGE_FLASH_MS so a
   * second press at the same edge always restarts the cue rather than extending one already
   * running out.
   */
  const [blockedEdgeChip, setBlockedEdgeChip] = useState<{ index: number; token: number } | null>(null);
  const blockedEdgeTimeoutRef = useRef<number | null>(null);
  const flagBlockedEdge = useCallback((index: number) => {
    if (blockedEdgeTimeoutRef.current !== null) window.clearTimeout(blockedEdgeTimeoutRef.current);
    setBlockedEdgeChip((prev) => ({ index, token: (prev?.token ?? 0) + 1 }));
    blockedEdgeTimeoutRef.current = window.setTimeout(() => {
      setBlockedEdgeChip(null);
      blockedEdgeTimeoutRef.current = null;
    }, PRESET_CHIP_BLOCKED_EDGE_FLASH_MS);
  }, []);
  useEffect(
    () => () => {
      if (blockedEdgeTimeoutRef.current !== null) window.clearTimeout(blockedEdgeTimeoutRef.current);
    },
    [],
  );
  const handlersFor = useCallback(
    (index: number, count: number): Record<string, unknown> =>
      buildChipNavHandlers({
        index,
        count,
        focusChip,
        exitDown: () => exitDown?.() === true,
        // The session strip is the last stop above the dock whenever a reply is on screen; with
        // nothing registered (an empty chat), fall back to the always-mounted chat slot row
        // (ChatSlotRow.tsx) rather than let Steam's own navigation take over. D58 #2, measured
        // 2026-09-03: leaving that unclaimed made Steam's own multi-step fallback walk one chip
        // to the left per Up press -- four wasted presses before a fifth finally reached the slot
        // row (runs/PRESET-ROW-up-from-chips-probe.json). Trying both here, in order, claims the
        // move on the first press instead.
        exitUp: () => takeNavFocus("session-context-strip") || takeNavFocus("chat-slot-row"),
        advanceAtEnd,
        onBlockedEdge: () => flagBlockedEdge(index),
      }) as unknown as Record<string, unknown>,
    [focusChip, exitDown, advanceAtEnd, flagBlockedEdge],
  );
  /** True for the one chip that should carry the edge-cue class right now. */
  const isBlockedEdge = useCallback((index: number) => blockedEdgeChip?.index === index, [blockedEdgeChip]);
  return { setButtonRef, handlersFor, focusChip, isBlockedEdge };
}

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
        {p.testChip ? (
          // Same badge PresetChipLabel draws for every other animation mode (line ~284) --
          // decode drew its own label from scratch and never carried this over, so a pinned
          // QA batch showed no badge at all while the Deck's chip animation was set to decode
          // (docs/test-evidence/plan47-frozen-chip-findings.json, finding_1).
          <span
            className="bonsai-preset-chip-test-badge"
            style={{
              marginRight: 6,
              fontSize: 9,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontWeight: 700,
              color: "#f0b232",
            }}
          >
            Test
          </span>
        ) : null}
        {resolved ? (
          <PresetChipText text={p.text} scroll={scroll} />
        ) : (
          <span className="bonsai-preset-chip-text bonsai-preset-chip-text--churn" ref={setLabelRef}>
            {" "}
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
function MainTabPresetDecodeSlots(
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
    // the one case with a real "next" waiting: the 60s auto-advance timer alone cannot be relied
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
    const sessionEnd = performance.now() + PRESET_CAROUSEL_ACTIVE_MS;
    let cancelled = false;
    let timeoutId = 0;

    const tick = () => {
      if (cancelled || performance.now() >= sessionEnd) return;
      if (performance.now() < autoPausedUntilRef.current) {
        timeoutId = window.setTimeout(tick, CAROUSEL_STEP_MS);
        return;
      }
      /* Never auto-advance while the user is browsing the carousel: focusIndex follows DOM
         focus, so moving it under the user would desync the white Steam ring from the blue chip. */
      if (elementHasFocus(viewportRef.current)) {
        timeoutId = window.setTimeout(tick, CAROUSEL_STEP_MS);
        return;
      }

      setCarousel((prev) => {
        const texts = new Set(prev.history.map((s) => s.text));
        // Rotation has to be able to draw corpus chips, not only static presets: the session-RAG
        // mix is applied when the carousel is seeded, so replenishing from the static pool alone
        // carried every corpus chip out of the window within about four ticks, permanently.
        const nextPreset = pickCarouselChipWithSessionRag({
          historyTexts: texts,
          visibleTexts: visibleWindowTexts(prev.history, prev.focusIndex, visibleSlots),
          staticFallback: () => getRandomPresetExcluding(texts, samplerOptions),
        });
        const advanced = advanceCarouselFocus(prev.history, prev.focusIndex, nextPreset);
        return advanced;
      });

      timeoutId = window.setTimeout(tick, CAROUSEL_STEP_MS);
    };

    timeoutId = window.setTimeout(tick, CAROUSEL_STEP_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
    // askRestartToken restarts the 60s window on every completed Ask (D58 #3), independently of
    // seedsKey: a pinned QA batch always reseeds to the same three chips, so seedsKey alone never
    // signals that an Ask happened. Restarting only this effect (not the whole carousel) extends
    // the deadline without touching history or focus, unlike fade/static/decode's full restart --
    // the carousel has a persistent, browsable history worth keeping across an Ask; the other
    // modes have no such state to preserve. visibleSlots restarts it too, so a mid-session flip of
    // the one-chip setting reads the new window size on the next tick instead of the one captured
    // when auto-advance last started.
  }, [seedsKey, useLocalKnowledgeBase, askRestartToken, visibleSlots]);

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

/**
 * PRESET_VISIBLE_SLOTS preset suggestion chips with independent fade in/out cycles — or, in static
 * mode, plain swaps. Hold time after each appearance scales with prompt length and is never shorter
 * than one full scroll of the label; fade durations are fixed. After `PRESET_CAROUSEL_ACTIVE_MS` no
 * new cycles start; any fade already in progress runs to completion, then the row rests until
 * remount.
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
        presetSingleChip={presetSingleChip}
      />
    );
  }
  const staticMode = animationMode === "static" || !fadeAnimationEnabled;
  const seedsKey = seedsKeyFrom(seeds);
  const reducedMotion = prefersReducedMotion();
  const slotCount = effectivePresetVisibleSlots(presetSingleChip);
  const nav = usePresetRowNav(slotCount, onCarouselExitDown);

  const [slots, setSlots] = useState<PresetPrompt[]>(() =>
    normalizeThreeSeeds(seeds, samplerOptions).slice(0, slotCount),
  );
  const [slotFade, setSlotFade] = useState<SlotFade[]>(() =>
    Array.from({ length: slotCount }, () =>
      staticMode ? { opacity: 1, transitionMs: 0 } : { opacity: 0, transitionMs: PRESET_CAROUSEL_FADE_IN_MS },
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

    const sessionEnd = performance.now() + PRESET_CAROUSEL_ACTIVE_MS;
    const timeouts: number[] = [];
    let cancelled = false;

    /** Only gate starting a *new* cycle after a full fade-out; never abort mid fade/hold. */
    const mayStartNextCycle = (): boolean => !cancelled && performance.now() < sessionEnd;

    const pushTimeout = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        if (cancelled) return;
        fn();
      }, ms);
      timeouts.push(id);
    };

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
      const loopStatic = (slotIndex: number, prompt: PresetPrompt) => {
        pushTimeout(() => {
          if (!mayStartNextCycle()) return;
          const next = pickNext(prompt);
          showInSlot(slotIndex, next);
          loopStatic(slotIndex, next);
        }, presetHoldMs(prompt.text));
      };
      first.forEach((prompt, i) => loopStatic(i, prompt));
      return () => {
        cancelled = true;
        timeouts.forEach((id) => window.clearTimeout(id));
      };
    }

    setSlotFade(
      Array.from({ length: slotCount }, () => ({ opacity: 0, transitionMs: PRESET_CAROUSEL_FADE_IN_MS })),
    );

    const runSlot = (slotIndex: number) => {
      const loop = (prompt: PresetPrompt, firstDelay: number) => {
        showInSlot(slotIndex, prompt);
        setFadeFor(slotIndex, { opacity: 0, transitionMs: PRESET_CAROUSEL_FADE_OUT_MS });

        pushTimeout(() => {
          setFadeFor(slotIndex, { opacity: 1, transitionMs: PRESET_CAROUSEL_FADE_IN_MS });

          pushTimeout(() => {
            pushTimeout(() => {
              setFadeFor(slotIndex, { opacity: 0, transitionMs: PRESET_CAROUSEL_FADE_OUT_MS });

              pushTimeout(() => {
                if (!mayStartNextCycle()) return;
                loop(pickNext(prompt), 0);
              }, PRESET_CAROUSEL_FADE_OUT_MS);
            }, presetHoldMs(prompt.text));
          }, PRESET_CAROUSEL_FADE_IN_MS);
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
  }, [seedsKey, seeds, staticMode, useLocalKnowledgeBase, slotCount, askRestartToken]);

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
              transition: `opacity ${slotFade[i]?.transitionMs ?? PRESET_CAROUSEL_FADE_IN_MS}ms ease-in-out`,
            }}
          >
            <PresetChipButton
              key={`${i}-${p.text}`}
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
    prev.presetSingleChip === next.presetSingleChip
  );
}

export const MainTabPresetAnimatedChips = React.memo(MainTabPresetAnimatedChipsInner, presetChipsPropsEqual);
