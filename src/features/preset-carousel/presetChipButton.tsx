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
import React from "react";
import { Button, Marquee, type MarqueeProps } from "@decky/ui";
import type { AskModeId } from "../../data/askMode";
import type { PresetPrompt } from "../../data/presets";
import {
  PRESET_CHIP_HEIGHT_PX,
  PRESET_MARQUEE_DELAY_S,
  PRESET_MARQUEE_FADE_LENGTH,
  PRESET_MARQUEE_SPEED,
} from "./presetRowLayout";
import { joinPresetWithRunningGame } from "../../utils/joinPresetWithRunningGame";

/**
 * The prompt text. A prompt longer than its chip scrolls sideways through Steam's own Marquee —
 * the crawl the library uses for long game names — which decides "does this overflow" on the live
 * element, never from a predicted width (the roadmap's marquee item insists on that, with receipts).
 * Decky finds the component in Steam's bundle at runtime; when it is missing, and under reduced
 * motion, the label is cut off with an ellipsis instead.
 */
export function PresetChipText({ text, scroll }: { text: string; scroll: boolean }) {
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
