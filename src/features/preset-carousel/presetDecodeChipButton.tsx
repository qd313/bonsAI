/**
 * Title: Preset decode-mode chip button
 *
 * Purpose: Decode mode's chip button (DecodePresetChipButton): the same glass button, badges and
 * settled scrolling label as every other style, with a churn label (three spans written straight
 * from the reveal loop) while the prompt is still being revealed.
 *
 * Used for: MainTabPresetDecodeSlots in presetDecodeSlots.tsx, which owns the reveal loop.
 *
 * Solves: Keeps the row component under the file-size limit, and the button's markup apart from the
 * timers that drive it (moved out of presetDecodeSlots.tsx unchanged, plan 81 helper E).
 *
 * Does not: Time or write anything itself -- the label spans are written by the row's loop.
 */
import React from "react";
import { Button } from "@decky/ui";
import type { AskModeId } from "../../data/askMode";
import type { PresetPrompt } from "../../data/presets";
import { PresetChipLeadingBadges, PresetChipText } from "./presetChipButton";
import { PRESET_CHIP_HEIGHT_PX } from "./presetRowLayout";
import type { DecodeTextParts } from "./presetChipDecodeText";
import type { ChipScrollListener } from "./presetChipStay";
import { joinPresetWithRunningGame } from "../../utils/joinPresetWithRunningGame";

/**
 * A churning label's three spans, one per part of `composeDecodeParts`: the locked letters, the
 * caret (in the accent colour, section-4.ts) and the still-churning tail.
 */
export type DecodeLabelPart = keyof DecodeTextParts;
export type DecodeLabelNodes = Record<DecodeLabelPart, HTMLSpanElement | null>;
export type DecodeLabelRefs = Record<DecodeLabelPart, (el: HTMLSpanElement | null) => void>;

/**
 * The label's text is owned by the reveal effect below while the prompt is still churning, written
 * straight to the churn span's three parts via `labelRefs` — never through React state. React
 * renders those spans empty and never writes into them, so the effect's writes are never fought
 * over; they are blank only during a slot's stagger delay, before its first `begin` call. Every
 * frame after that bypasses React entirely, which is the point of the rewrite (see the module
 * header comment on frame cost). Once the prompt has resolved the churn span is replaced by the
 * ordinary label, so Steam's Marquee measures settled text, never a mid-churn frame.
 */
export function DecodePresetChipButton(props: {
  preset: PresetPrompt;
  resolved: boolean;
  scroll: boolean;
  labelRefs: DecodeLabelRefs;
  setUnifiedInput: React.Dispatch<React.SetStateAction<string>>;
  onPreferAskMode?: (mode: AskModeId) => void;
  buttonRef?: (el: HTMLElement | null) => void;
  navHandlers?: Record<string, unknown>;
  /** The chip row just claimed a Left/Right press without moving anywhere -- ran out of chips. */
  blockedEdge?: boolean;
  /** Told the settled label's scroll time line, so the row can replace the chip one pause after it. */
  onScrollPlan?: ChipScrollListener;
}) {
  const {
    preset: p,
    resolved,
    scroll,
    labelRefs,
    setUnifiedInput,
    onPreferAskMode,
    buttonRef,
    navHandlers,
    blockedEdge,
    onScrollPlan,
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
          <PresetChipText text={p.text} scroll={scroll} onScrollPlan={onScrollPlan} />
        ) : (
          <span className="bonsai-preset-chip-text bonsai-preset-chip-text--churn">
            <span ref={labelRefs.locked} />
            <span className="bonsai-preset-chip-caret" ref={labelRefs.caret} />
            <span ref={labelRefs.tail} />
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
