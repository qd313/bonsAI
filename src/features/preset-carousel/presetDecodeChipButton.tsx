/**
 * Title: Preset decode-mode chip button
 *
 * Purpose: Decode mode's chip button (DecodePresetChipButton): the same glass button, badges and
 * scrolling label as every other style. While the prompt is still being revealed the label's real
 * words are in it but hidden, and a scramble layer (three spans written straight from the reveal loop)
 * is drawn over them, so the chip is exactly as wide as its settled self from frame 0 and the slide is
 * one time line from the reveal to the end (plan 105 lane B3).
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
import type { AskModeId } from "../ask/bar/askMode";
import type { PresetPrompt } from "./presets";
import { PresetChipLeadingBadges, PresetChipText } from "./presetChipButton";
import { PRESET_CHIP_HEIGHT_PX } from "./presetRowLayout";
import type { DecodeTextParts } from "./presetChipDecodeText";
import type { ChipScrollListener } from "./presetChipStay";
import type { ChipNeedListener } from "./usePresetChipWiden";
import { joinPresetWithRunningGame } from "./joinPresetWithRunningGame";
import { textPx } from "../../styles/textPx";

/**
 * A churning label's three spans, one per part of `composeDecodeParts`: the locked letters, the
 * caret (in the accent colour, section-4.ts) and the still-churning tail.
 */
export type DecodeLabelPart = keyof DecodeTextParts;
export type DecodeLabelNodes = Record<DecodeLabelPart, HTMLSpanElement | null>;
export type DecodeLabelRefs = Record<DecodeLabelPart, (el: HTMLSpanElement | null) => void>;

/**
 * The scramble is owned by the reveal effect in presetDecodeSlots.tsx while the prompt is still churning,
 * written straight to the scramble layer's three parts via `labelRefs` — never through React state.
 * React renders those spans empty and never writes into them (it only empties them once the reveal is
 * over), so the effect's writes are never fought over; they are blank only during a slot's stagger
 * delay, before its first `begin` call. Every frame after that bypasses React entirely, which is the
 * point of the rewrite (see the module header comment on frame cost). The sliding label measures the
 * real words, which are in it from the first frame, never a mid-churn frame.
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
  /** Told how wide the settled chip must be to show every word (the row widens the chip under the ring). */
  onNeed?: ChipNeedListener;
  /** The first word and "...", while the chip beside it holds the row open (a settled chip only). */
  stub?: string | null;
  /** Counts how many times the row has started this slot's reveal; the slide starts over with each. */
  cycle?: number;
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
    onNeed,
    stub,
    cycle,
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
        fontSize: textPx(11),
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
        <PresetChipText
          text={p.text}
          scroll={scroll}
          onScrollPlan={onScrollPlan}
          onNeed={onNeed}
          stub={resolved ? stub : null}
          decode={{ refs: labelRefs, active: !resolved }}
          cycle={cycle}
        />
        {p.beta ? (
          <span
            style={{
              marginLeft: 6,
              fontSize: textPx(10),
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
