/**
 * Title: Preset chip button
 *
 * Purpose: The chip button itself, shared by fade, static and carousel mode (decode mode draws
 * its own button around the same badges and scrolling text — see DecodePresetChipButton in
 * MainTabPresetAnimatedChips.tsx): the scrolling prompt text, the pinned Test/Tip badges before
 * it, the [beta] tag, and the click handler that fills the Ask box.
 *
 * Used for: MainTabPresetAnimatedChipsInner and MainTabPresetSidewaysCarousel, both in
 * src/components/MainTabPresetAnimatedChips.tsx.
 *
 * Solves: One badge-drawing function (PresetChipLeadingBadges) shared by every label so the "is
 * this chip pinned/note-sourced" check and "does its badge draw" check cannot drift apart again —
 * see the comment on PresetChipLeadingBadges for the bug that happened when decode mode kept its
 * own copy.
 *
 * Does not: Decide the D-pad wiring or the focus container — see presetRowFocusNav in the same
 * folder.
 */
import React, { useLayoutEffect, useRef, useState } from "react";
import { Button, Marquee, type MarqueeProps } from "@decky/ui";
import type { AskModeId } from "../../data/askMode";
import type { PresetPrompt } from "../../data/presets";
import {
  PRESET_CHIP_HEIGHT_PX,
  PRESET_MARQUEE_DELAY_S,
  PRESET_MARQUEE_FADE_LENGTH,
  PRESET_MARQUEE_SPEED,
  presetScrollPlan,
} from "./presetRowLayout";
import { joinPresetWithRunningGame } from "../../utils/joinPresetWithRunningGame";

/**
 * Steam's own scrolling label, with the plugin's one set of scroll settings (presetRowLayout.ts).
 * Shared by the suggestion chips and the chat row's chat name, so the two always scroll at the same
 * speed with the same pause before they start and at the end. Draws `fallback` instead when Decky
 * could not find the Marquee in Steam's bundle.
 */
export function SteamMarqueeText({
  text,
  className,
  fallback,
}: {
  text: string;
  className: string;
  fallback: React.ReactNode;
}) {
  const MarqueeComponent: React.FC<MarqueeProps> | undefined = Marquee;
  if (!MarqueeComponent) return <>{fallback}</>;
  return (
    <MarqueeComponent
      key={text}
      play
      speed={PRESET_MARQUEE_SPEED}
      delay={PRESET_MARQUEE_DELAY_S}
      fadeLength={PRESET_MARQUEE_FADE_LENGTH}
      resetOnPause
      className={className}
    >
      {text}
    </MarqueeComponent>
  );
}

type ScrollPhase = "waiting" | "scrolling" | "end";

/**
 * The words of a chip, scrolled sideways when they are too long for it. The chip's own scroll rather
 * than Steam's Marquee, because the Marquee has no stop at the end: its scroll cannot be told to stand
 * still for a moment once the last words are in view, and that is what the maintainer asked for
 * (2026-10-02). The overflow is still decided on the live element, never from a predicted width: the
 * words' width and the room are read off the two elements after they are laid out (and again when the
 * room changes), as the roadmap's marquee item insists.
 *
 * The time line is presetScrollPlan (presetRowLayout.ts), the same one the chip's stay time reads:
 * the words wait at the left edge, scroll to the end at the set speed, and then stay where they are.
 * Nothing moves again, so the pause lasts for as long as the chip stays, and the stay time always
 * holds it for at least the pause. Words that fit are left alone, so the chip can centre them.
 * `data-scroll-phase` says where the line has got to: fits, waiting, scrolling or end.
 */
function PresetChipScrollText({ text }: { text: string }) {
  const roomRef = useRef<HTMLSpanElement>(null);
  const wordsRef = useRef<HTMLSpanElement>(null);
  const [overflowPx, setOverflowPx] = useState(0);
  const [phase, setPhase] = useState<ScrollPhase>("waiting");

  useLayoutEffect(() => {
    const measure = () => {
      const room = roomRef.current;
      const words = wordsRef.current;
      if (!room || !words || room.clientWidth <= 0) return setOverflowPx(0);
      setOverflowPx(Math.max(0, Math.ceil(words.scrollWidth - room.clientWidth)));
    };
    measure();
    if (typeof ResizeObserver === "undefined" || !roomRef.current) return;
    const watcher = new ResizeObserver(measure);
    watcher.observe(roomRef.current);
    return () => watcher.disconnect();
  }, [text]);

  const plan = presetScrollPlan(overflowPx);
  const crawlMs = plan?.crawlMs;
  const delayMs = plan?.delayMs;
  useLayoutEffect(() => {
    setPhase("waiting");
    if (crawlMs === undefined || delayMs === undefined) return;
    const startScroll = window.setTimeout(() => setPhase("scrolling"), delayMs);
    const reachEnd = window.setTimeout(() => setPhase("end"), delayMs + crawlMs);
    return () => {
      window.clearTimeout(startScroll);
      window.clearTimeout(reachEnd);
    };
  }, [crawlMs, delayMs]);

  const shown = plan ? phase : "fits";
  // Steam's marquee faded the words at the edges; the same fade here, on the side the words leave.
  const fade = PRESET_MARQUEE_FADE_LENGTH;
  const mask =
    shown === "fits"
      ? undefined
      : shown === "waiting"
        ? `linear-gradient(to right, #000 calc(100% - ${fade}px), transparent)`
        : shown === "scrolling"
          ? `linear-gradient(to right, transparent, #000 ${fade}px, #000 calc(100% - ${fade}px), transparent)`
          : `linear-gradient(to right, transparent, #000 ${fade}px)`;
  return (
    <span
      ref={roomRef}
      className="bonsai-preset-chip-text bonsai-preset-chip-text--marquee"
      style={mask ? { WebkitMaskImage: mask, maskImage: mask } : undefined}
    >
      <span
        ref={wordsRef}
        className="bonsai-preset-chip-text-run"
        data-scroll-phase={shown}
        style={{
          transform: shown === "scrolling" || shown === "end" ? `translateX(-${overflowPx}px)` : "translateX(0px)",
          transition: shown === "scrolling" ? `transform ${plan!.crawlMs}ms linear` : "none",
        }}
      >
        {text}
      </span>
    </span>
  );
}

/**
 * The prompt text. A prompt longer than its chip scrolls its words sideways (PresetChipScrollText),
 * stands still at the end, and the chip leaves after that. Under reduced motion the label is cut off
 * with an ellipsis instead and nothing moves.
 */
export function PresetChipText({ text, scroll }: { text: string; scroll: boolean }) {
  if (!scroll) return <span className="bonsai-preset-chip-text">{text}</span>;
  return <PresetChipScrollText key={text} text={text} />;
}

/**
 * The Test and Tip badges, pinned before the prompt text -- shared by every animation mode's
 * label so the two checks that decide "is this chip pinned/note-sourced" and "does its badge
 * draw" can never drift apart again. Decode mode used to build its own label from scratch
 * (DecodePresetChipButton) and carried the Test badge over but not this one: a real, note-sourced
 * chip's `ragTip` flag was true, yet nothing in decode's JSX ever read it, so the dot never drew
 * even though the chip's words really did come from the game's own notes (CHIP-BUTTON-09, found
 * on the Deck with Half-Life 2 running, 2026-09-18). Both label components now render this same
 * function instead of their own copy of the badge markup.
 */
export function PresetChipLeadingBadges({ p }: { p: PresetPrompt }) {
  return (
    <>
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
    </>
  );
}

/**
 * Badges stay pinned at the left of the chip and only the prompt text scrolls: the Tip badge exists
 * to be seen at a glance (Phase 4 track 1), and a badge that scrolled away would defeat that.
 */
function PresetChipLabel({ p, scroll }: { p: PresetPrompt; scroll: boolean }) {
  return (
    <span className="bonsai-preset-chip-label">
      <PresetChipLeadingBadges p={p} />
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

export function PresetChipButton(props: {
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
