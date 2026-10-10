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
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, Focusable } from "@decky/ui";
import type { PresetPrompt } from "../data/presets";
import type { AskModeId } from "../data/askMode";
import { MainTabPresetAnimatedChips } from "./MainTabPresetAnimatedChips";
import { DetailsSlot } from "../features/details-slot/DetailsSlot";
import { PRESET_CHIP_HEIGHT_PX } from "../features/preset-carousel/presetRowLayout";
import { chipRowExitUp } from "../features/preset-carousel/presetRowFocusNav";
import { registerNavFocus, unregisterNavFocus, type NavRefHolder } from "../utils/navFocusRegistry";
import { takeChipSlotFocus } from "../features/details-slot/detailsSlotStore";
import { registerInjectChipNav, takeInjectChipFocus, unregisterInjectChipNav } from "./injectChipNav";
import { joinPresetWithRunningGame } from "../utils/joinPresetWithRunningGame";
import {
  registerModalReturnFocusOwner,
  rememberModalReturnFocus,
} from "../features/plugin-shell/modalReturnFocusRegistry";

/**
 * The help chip's own focus container. The chip sits alone in the row, so it needs the same two things the
 * suggestion chips' container gives them: a nav node registered as "preset-carousel", so the ring is carried
 * to it by Steam's transfer (a plain focus() moves the DOM's focus only; the stand-in's D-pad went past the
 * chip to the tab bar, plan87-S-S1-HELP-CHIP.json), and the row's moves: Up to the stop above the chat,
 * Down to the question box, Left and Right held so the ring does not leave the plugin.
 */
function HelpChipRoot(props: { focusUnifiedTextField: () => boolean; children: React.ReactNode }) {
  const navRef = useRef<NavRefHolder["current"]>(null);
  useEffect(() => {
    registerNavFocus("preset-carousel", navRef);
    return () => unregisterNavFocus("preset-carousel", navRef);
  }, []);
  return (
    <Focusable
      {...({
        navRef,
        onMoveUp: () => chipRowExitUp(),
        onMoveDown: () => props.focusUnifiedTextField() === true,
        onMoveLeft: () => true,
        onMoveRight: () => true,
      } as Record<string, unknown>)}
    >
      {props.children}
    </Focusable>
  );
}

/**
 * The AI's own suggestion chip's container, the help chip's twin (see `HelpChipRoot`). It sits below the
 * suggestion chips, nearest the question box, so Up from the box lands here first and Down from the
 * chips lands here before the box. Up goes on to the chips (or the Show details line holding their
 * place), Down to the question box, Left and Right are held. Without its own container Steam's ring
 * went past the chip both ways and it could only be tapped.
 */
function InjectChipRoot(props: { focusUnifiedTextField: () => boolean; children: React.ReactNode }) {
  const navRef = useRef<NavRefHolder["current"]>(null);
  useEffect(() => {
    registerInjectChipNav(navRef);
    return () => unregisterInjectChipNav(navRef);
  }, []);
  return (
    <Focusable
      {...({
        navRef,
        onMoveUp: () => takeChipSlotFocus() || chipRowExitUp(),
        onMoveDown: () => props.focusUnifiedTextField() === true,
        onMoveLeft: () => true,
        onMoveRight: () => true,
      } as Record<string, unknown>)}
    >
      {props.children}
    </Focusable>
  );
}

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
 *    suggestions and animation settings, inside DetailsSlot(), which swaps in
 *    the answer's Show details line while that line is out of sight.
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
  const injectChipShown = Boolean(presetCarouselInject?.text?.trim());
  /*
   * Down out of the row above the inject chip: onto the chip when it shows, else the question box. The
   * help chip, the suggestion chips and the Show details line all use it, so the chip is a stop on the
   * way down as it is on the way up.
   */
  const leaveRowDown = useCallback((): boolean => {
    if (injectChipShown && takeInjectChipFocus()) return true;
    return focusUnifiedTextField();
  }, [injectChipShown, focusUnifiedTextField]);
  const showInjectPlaceholder =
    isAsking && hadInjectChipRef.current && !presetCarouselInject?.text?.trim();

  /*
   * Every chip mode's walk restarts from the new chips because a completed Ask reseeds
   * `suggestedPrompts` with new text -- `seedsKeyFrom` changes, so the mode's own effect restarts.
   * A pinned QA batch breaks that: it always resolves to its first three entries verbatim
   * (data/presets.ts's `applyTempFrozenCarousel`), so the text never changes and the effect never
   * restarts. That mattered most while the walk stopped after one minute (chips 6-10 of ten never
   * came into view, D58 #3, KB-ANSWER-02; the minute was dropped in plan 72). This token is
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
         * looks for this chip before the carousel), and the chips' rotation timers do not run
         * while the help chip is up.
         */
        <HelpChipRoot focusUnifiedTextField={leaveRowDown}>
          <Button
            className="bonsai-preset-glass bonsai-preset-help-chip"
            ref={(el: HTMLElement | null) => registerModalReturnFocusOwner("plugin-help", el)}
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
        </HelpChipRoot>
      ) : (
        /* While an answer's own Show details line is out of sight, it takes the chips' place. */
        <DetailsSlot focusUnifiedTextField={leaveRowDown}>
          <MainTabPresetAnimatedChips
            seeds={suggestedPrompts}
            setUnifiedInput={setUnifiedInput}
            fadeAnimationEnabled={presetChipAnimation === "fade"}
            animationMode={presetChipAnimation}
            onPreferAskMode={onPresetPreferAskMode}
            onCarouselExitDown={leaveRowDown}
            useLocalKnowledgeBase={useLocalKnowledgeBase}
            askRestartToken={askRestartToken}
            holdStill={isAsking}
            presetSingleChip={presetSingleChip}
          />
        </DetailsSlot>
      )}
      {presetCarouselInject?.text?.trim() ? (
        <InjectChipRoot focusUnifiedTextField={focusUnifiedTextField}>
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
        </InjectChipRoot>
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
