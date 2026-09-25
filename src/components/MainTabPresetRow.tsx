/**
 * Title: Main tab preset row
 *
 * Purpose: The row of suggestion chips sitting right above the Ask bar. Tap
 * one and its text drops straight into the question box. Until a person
 * dismisses it, this row shows a single "How to use bonsAI" help chip instead
 * of suggestions; after that it hands over to the animated preset chips, and
 * it can also show one extra chip: a hint offering to fold the running game
 * into the question, or a suggestion the AI itself put forward.
 *
 * Used for: MainTab, in the row directly above the Ask bar.
 *
 * Solves: Keeps which preset animation is picked and which Ask mode is
 * preferred wired up in one place instead of crowding the main screen file,
 * and gives the help chip the whole row to itself rather than stacking it
 * above the chips — the row stays the same height either way.
 *
 * Does not: Own the chips' own animation timing — see MainTabPresetAnimatedChips().
 * The suggestion text itself comes from the presets data file, not from here.
 */
import React, { useEffect, useRef, useState } from "react";
import { Button } from "@decky/ui";
import type { PresetPrompt } from "../data/presets";
import type { AskModeId } from "../data/askMode";
import { MainTabPresetAnimatedChips } from "./MainTabPresetAnimatedChips";
import { PRESET_CHIP_HEIGHT_PX } from "../features/preset-carousel/presetRowLayout";
import { joinPresetWithRunningGame } from "../utils/joinPresetWithRunningGame";
import {
  registerModalReturnFocusOwner,
  rememberModalReturnFocus,
} from "../features/plugin-shell/modalReturnFocusRegistry";

export type MainTabPresetRowProps = {
  suggestedPrompts: PresetPrompt[];
  showPluginHelpChip: boolean;
  onOpenPluginHelp: () => void;
  presetChipAnimation?: "fade" | "carousel" | "static" | "decode";
  setUnifiedInput: React.Dispatch<React.SetStateAction<string>>;
  onPresetPreferAskMode?: (mode: AskModeId) => void;
  presetCarouselInject?: { text: string } | null;
  isAsking: boolean;
  focusUnifiedTextField: () => boolean;
  presetCarouselHostRef: React.RefObject<HTMLDivElement | null>;
  useLocalKnowledgeBase?: boolean;
  /** "One suggestion chip" setting: the row shows one chip with the whole column. Off by default. */
  presetSingleChip?: boolean;
};

/*
 * In: the current list of suggested prompts, whether the help chip should
 * still be showing, which animation style is chosen for the chips, whether an
 * Ask is in flight, and the callbacks that fill in the question box and move
 * focus into it.
 * Out: the row itself — either the help chip, or the animated chips — plus,
 * when the game surfaced one, an extra chip for a running-game hint or an AI
 * suggestion.
 * What can go wrong: see the long comment on askRestartToken below for a bug
 * this file already worked around once, where a repeated set of suggestions
 * left several chips unreachable.
 *
 * 1. Remember whether an agent-suggestion chip was recently on screen, so a
 *    placeholder can hold its spot while a new answer is still arriving and
 *    the layout does not jump around underneath it.
 * 2. Track a restart token that bumps every time asking finishes, so the
 *    chips' rotation timer restarts even when the new suggestions happen to
 *    read exactly the same as the old ones.
 * 3. Draw the row's host element. Inside it: the help chip while it has not
 *    been dismissed, otherwise MainTabPresetAnimatedChips() with the current
 *    suggestions and animation settings.
 * 4. After that: an extra chip if the game handed one in, a same-sized blank
 *    placeholder while one is expected but not here yet, or nothing.
 */
export function MainTabPresetRow({
  suggestedPrompts,
  showPluginHelpChip,
  onOpenPluginHelp,
  presetChipAnimation = "fade",
  setUnifiedInput,
  onPresetPreferAskMode,
  presetCarouselInject = null,
  isAsking,
  focusUnifiedTextField,
  presetCarouselHostRef,
  useLocalKnowledgeBase = false,
  presetSingleChip = false,
}: MainTabPresetRowProps) {
  const hadInjectChipRef = useRef(false);
  useEffect(() => {
    if (presetCarouselInject?.text?.trim()) {
      hadInjectChipRef.current = true;
    }
  }, [presetCarouselInject]);
  useEffect(() => {
    if (!isAsking && !presetCarouselInject?.text?.trim()) {
      hadInjectChipRef.current = false;
    }
  }, [isAsking, presetCarouselInject]);
  const showInjectPlaceholder =
    isAsking && hadInjectChipRef.current && !presetCarouselInject?.text?.trim();

  /*
   * Every chip mode's 60-second walk (PRESET_CAROUSEL_ACTIVE_MS) stops scheduling new cycles that
   * long after it starts, and normally restarts because a completed Ask reseeds `suggestedPrompts`
   * with new text -- `seedsKeyFrom` changes, so the mode's own effect restarts. A pinned QA batch
   * breaks that: it always resolves to its first three entries verbatim (data/presets.ts's
   * `applyTempFrozenCarousel`), so the text never changes and the effect never restarts -- ten
   * chips pinned and chips 6-10 never came into view (D58 #3, KB-ANSWER-02). This token is
   * independent of the seed text, so it restarts the walk even when the reseed produced exactly
   * the same three chips. Bumped on the Ask *completing* (isAsking true -> false), which is when
   * useBonsaiAskOrchestration actually reseeds -- not on Ask start.
   */
  const wasAskingRef = useRef(isAsking);
  const [askRestartToken, setAskRestartToken] = useState(0);
  useEffect(() => {
    if (wasAskingRef.current && !isAsking) {
      setAskRestartToken((t) => t + 1);
    }
    wasAskingRef.current = isAsking;
  }, [isAsking]);

  return (
    <div
      ref={presetCarouselHostRef}
      className={
        "bonsai-full-bleed-row bonsai-preset-row-host" +
        (presetChipAnimation === "fade" ? " bonsai-preset-row-host--fade-anim" : "")
      }
      style={{ display: "grid", minWidth: 0, width: "100%", boxSizing: "border-box" }}
    >
      {showPluginHelpChip ? (
        /*
         * The help chip owns the row until it is dismissed; the suggestion chips mount only after
         * that. Two things follow: the Ask bar's Up press lands here first (useMainTabAskBarFocus
         * looks for this chip before the carousel), and the chips' 60-second rotation window is
         * not spent while the help chip is up.
         */
        <Button
          className="bonsai-preset-glass bonsai-preset-help-chip"
          ref={(el: HTMLElement | null) => registerModalReturnFocusOwner("plugin-help", el)}
          {...({
            onMoveDown: () => focusUnifiedTextField(),
          } as Record<string, unknown>)}
          onClick={() => {
            rememberModalReturnFocus("plugin-help");
            onOpenPluginHelp();
          }}
          style={{
            width: "100%",
            minHeight: PRESET_CHIP_HEIGHT_PX,
            fontSize: 12,
          }}
          aria-label="How to use bonsAI — open quick start"
        >
          How to use bonsAI
        </Button>
      ) : (
        <MainTabPresetAnimatedChips
          seeds={suggestedPrompts}
          setUnifiedInput={setUnifiedInput}
          fadeAnimationEnabled={presetChipAnimation === "fade"}
          animationMode={presetChipAnimation}
          onPreferAskMode={onPresetPreferAskMode}
          onCarouselExitDown={focusUnifiedTextField}
          useLocalKnowledgeBase={useLocalKnowledgeBase}
          askRestartToken={askRestartToken}
          presetSingleChip={presetSingleChip}
        />
      )}
      {presetCarouselInject?.text?.trim() ? (
        <Button
          className="bonsai-preset-glass bonsai-pyro-inject-chip"
          focusable
          onClick={() => {
            setUnifiedInput(joinPresetWithRunningGame(presetCarouselInject.text.trim()));
          }}
          style={{
            width: "100%",
            minHeight: PRESET_CHIP_HEIGHT_PX,
            fontSize: 12,
            color: "#c4d3e2",
          }}
          aria-label="Agent suggestion"
        >
          {presetCarouselInject.text.trim()}
        </Button>
      ) : showInjectPlaceholder ? (
        <div
          aria-hidden
          className="bonsai-preset-inject-placeholder"
          style={{ minHeight: PRESET_CHIP_HEIGHT_PX, visibility: "hidden" }}
        />
      ) : null}
    </div>
  );
}
