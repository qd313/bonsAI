/**
 * Title: Main tab Ask bar focus helpers
 *
 * Purpose: A set of "jump the ring to this control" functions for the parts
 * around the Ask bar: the question box, the paperclip, the character picture,
 * the row of suggestion chips, the Ask button, the mic, and the Ask-mode
 * button. Each one moves the D-pad's highlight to the named control and
 * reports back whether it actually landed there.
 *
 *     preset chip row
 *            ▲
 *            │ Up
 *            │
 *     avatar ─Right─► question box ─Right─► Ask-mode button
 *       │                  │
 *       │ Down             │ Down
 *       ▼                  ▼
 *     paperclip        the small Ask button at the right end of the box's own
 *       ▲              strip (plan 84), or Stop in the mic's place while an
 *       │ Left         answer is being written
 *       │
 *     question box
 *
 * (The mic button's jump function also serves the strip's own Left and Right,
 * which MainTabUnifiedAskBar.tsx wires; the whole strip is written down in
 * docs/focus-graph.md, "The ask box's strip (plan 84)".)
 *
 * Used for: MainTab's D-pad wiring, and cross-row navigation elsewhere in the
 * chat screen.
 *
 * Solves: Gives every caller one shared, tested way to find these controls,
 * instead of each one writing its own search through the page for them.
 *
 * Does not: Wire up the D-pad's own move handlers on each control — callers
 * take these functions and connect them to their own onMoveUp/onMoveDown/etc.
 */
import React, { useCallback, useMemo } from "react";

import { takeNavFocus } from "../utils/navFocusRegistry";
import { takeDetailsSlotLineFocus } from "../features/details-slot/detailsSlotStore";
import { elementHasGamepadFocus } from "../utils/uiDocument";

export type MainTabAskBarFocusRefs = {
  unifiedInputFieldLayerRef: React.Ref<HTMLDivElement>;
  attachActionHostRef: React.Ref<HTMLDivElement>;
  /** The small Ask button itself since plan 84 (it was the big Ask row's host); see focusAskPrimary. */
  askBarHostRef: React.Ref<HTMLElement>;
  presetCarouselHostRef: React.RefObject<HTMLDivElement | null>;
};

/*
 * In: the refs pointing at the Ask bar's controls, and whether the AI
 * character picture is even showing right now.
 * Out: one jump function per control, plus two ready-made bundles of them
 * (unifiedInputDeckNavHandlers, avatarDeckNavHandlers) that a caller can hand
 * straight to a control's own onMoveUp/onMoveDown/onMoveLeft/onMoveRight.
 * What can go wrong: a jump can simply fail to find its target — the control
 * is not mounted yet, or not showing — in which case the function returns
 * false and whoever asked for the jump falls back to its own next move.
 *
 * 1. focusUnifiedTextField() — into the question box. Tries Steam's own
 *    focus transfer first, then falls back to a plain DOM search for the
 *    frames before that transfer is ready, or for mouse and touch. See the
 *    Gotchas note above this comment for why the DOM path is a fallback and
 *    not the first choice.
 * 2. focusAttachPaperclip() — the paperclip button in the corner of the
 *    input.
 * 3. focusAiCharacterAvatar() — the character picture, when it is showing.
 * 4. focusFirstPresetChip() — up into the suggestion row above the Ask bar:
 *    the still-open help chip if there is one, otherwise the first suggestion
 *    chip, with the same take-Steam's-transfer-first approach as step 1.
 * 5. focusAskPrimary() — the small Ask button itself, through its own element
 *    (askBarHostRef holds the button since plan 84), never while it rests.
 * 6. focusMicOrStop() — the mic / stop button in the input's other corner.
 * 7. focusAskModeButton() — the button that opens the Ask-mode picker.
 * 8. Bundle the question box's four directions and the avatar's two
 *    directions into the two handler objects this hook returns, so a caller
 *    can wire a whole control's D-pad moves in one step.
 */
export function useMainTabAskBarFocus(
  refs: MainTabAskBarFocusRefs,
  showAiCharacterChrome: boolean,
  /**
   * True while a question is in flight. The Ask button greys out for that whole window (the
   * maintainer wants it visible, not gone), but a greyed control still doing nothing when the
   * D-pad lands on it is its own bug (measured 2026-09-05,
   * docs/test-evidence/round35-CHECK-stop-press.json: Down from the question box landed the ring
   * on it, then a second Down lost the ring entirely). `focusAskPrimary` and the box's own Down
   * edge both read this so the greyed button never takes the ring from a D-pad move.
   */
  isAskInFlight: boolean = false,
) {
  /**
   * Into the Ask text field from another container (a preset chip, the help chip, the avatar).
   *
   * Steam's own transfer first: the field registers its nav node as "unified-input". A plain
   * `focus()` across containers only moves `activeElement`; measured on device 2026-09-01, Down
   * from a preset chip on a freshly opened panel put the caret in the field while Steam bounced the
   * ring to the next chip in the row (runs/PRESET-ONE-LINE-03-carousel-fresh-mount.json, step 12).
   * The DOM fallback stays for the frames before Steam populates the ref and for mouse/touch, and
   * reports whether the ring actually followed, so a caller can let Steam take over when it did not.
   */
  const focusUnifiedTextField = useCallback((): boolean => {
    if (takeNavFocus("unified-input")) return true;
    const layer =
      refs.unifiedInputFieldLayerRef &&
      typeof refs.unifiedInputFieldLayerRef === "object" &&
      "current" in refs.unifiedInputFieldLayerRef
        ? (refs.unifiedInputFieldLayerRef as React.RefObject<HTMLDivElement | null>).current
        : null;
    const field = layer?.querySelector<HTMLTextAreaElement | HTMLInputElement>("textarea, input");
    if (!field) return false;
    field.focus();
    return elementHasGamepadFocus(field);
  }, [refs.unifiedInputFieldLayerRef]);

  const focusAttachPaperclip = useCallback((): boolean => {
    const host =
      refs.attachActionHostRef &&
      typeof refs.attachActionHostRef === "object" &&
      "current" in refs.attachActionHostRef
        ? (refs.attachActionHostRef as React.RefObject<HTMLDivElement | null>).current
        : null;
    const btn = host?.querySelector<HTMLElement>("button.bonsai-unified-input-corner-left");
    if (!btn) return false;
    btn.focus();
    return true;
  }, [refs.attachActionHostRef]);

  const focusAiCharacterAvatar = useCallback((): boolean => {
    if (!showAiCharacterChrome) return false;
    const layer =
      refs.unifiedInputFieldLayerRef &&
      typeof refs.unifiedInputFieldLayerRef === "object" &&
      "current" in refs.unifiedInputFieldLayerRef
        ? (refs.unifiedInputFieldLayerRef as React.RefObject<HTMLDivElement | null>).current
        : null;
    const avatar = layer?.querySelector<HTMLElement>(".bonsai-ai-character-avatar");
    if (!avatar) return false;
    avatar.focus();
    return true;
  }, [showAiCharacterChrome, refs.unifiedInputFieldLayerRef]);

  /**
   * Up from the Ask bar into the preset row.
   *
   * The carousel is its own `Focusable`, i.e. a separate navigation container, so a plain `focus()`
   * on a chip only moves `activeElement` — Steam's ring stays where it was. Found on device
   * 2026-08-28: the ring went to the tab strip while a chip carried the highlight, and A activated
   * the tab. `takeNavFocus` is Steam's own transfer and is the supported way across that boundary
   * (navFocusRegistry).
   *
   * The DOM ladder stays as the fallback for the frames before Decky has populated the nav ref, and
   * for mouse and touch where there is no ring to move at all. It now reports whether the ring
   * actually followed rather than whether the element existed — the same honesty fix
   * `modalReturnFocusRegistry` needed, and for the same reason.
   */
  const focusFirstPresetChip = useCallback((): boolean => {
    const host = refs.presetCarouselHostRef.current;
    const help = host?.querySelector<HTMLElement>("button.bonsai-preset-help-chip");
    if (help) {
      /* The help chip is in its own container (MainTabPresetRow.tsx): Steam's transfer first, as for the chips. */
      if (takeNavFocus("preset-carousel")) return true;
      help.focus();
      return elementHasGamepadFocus(help);
    }
    /* The Show details line, while it holds the chip's place (DetailsSlot.tsx); else the chips. */
    if (takeDetailsSlotLineFocus()) return true;
    if (takeNavFocus("preset-carousel")) return true;
    const btn =
      host?.querySelector<HTMLElement>(
        ".bonsai-preset-carousel-slot--focus button.bonsai-preset-glass",
      ) ??
      host?.querySelector<HTMLElement>(
        '.bonsai-preset-carousel-slot[data-bonsai-preset-visible="true"] button.bonsai-preset-glass',
      );
    if (!btn) return false;
    btn.focus();
    return elementHasGamepadFocus(btn);
  }, [refs.presetCarouselHostRef]);

  /*
   * The small Ask button in the box's own strip (plan 84). askBarHostRef is filled by the button itself
   * now, not a row around it, so this focuses that element directly instead of searching under a host.
   * A plain focus(): from the box this is the same hop the mode button took and the Deck showed working
   * (P82-BOX-DOWN-MODE-BUTTON), and inside the strip the stops are siblings of one row.
   */
  const focusAskPrimary = useCallback((): boolean => {
    // Resting while a question is in flight -- see the isAskInFlight doc comment above.
    if (isAskInFlight) return false;
    const btn =
      refs.askBarHostRef &&
      typeof refs.askBarHostRef === "object" &&
      "current" in refs.askBarHostRef
        ? (refs.askBarHostRef as React.RefObject<HTMLElement | null>).current
        : null;
    if (!btn) return false;
    btn.focus();
    return true;
  }, [refs.askBarHostRef, isAskInFlight]);

  const focusMicOrStop = useCallback((): boolean => {
    const host =
      refs.attachActionHostRef &&
      typeof refs.attachActionHostRef === "object" &&
      "current" in refs.attachActionHostRef
        ? (refs.attachActionHostRef as React.RefObject<HTMLDivElement | null>).current
        : null;
    const btn = host?.querySelector<HTMLElement>("button.bonsai-unified-input-corner-right");
    if (!btn) return false;
    btn.focus();
    return true;
  }, [refs.attachActionHostRef]);

  const focusAskModeButton = useCallback((): boolean => {
    const host =
      refs.attachActionHostRef &&
      typeof refs.attachActionHostRef === "object" &&
      "current" in refs.attachActionHostRef
        ? (refs.attachActionHostRef as React.RefObject<HTMLDivElement | null>).current
        : null;
    const btn = host?.querySelector<HTMLElement>("button.bonsai-ask-mode-trigger");
    if (!btn) return false;
    btn.focus();
    return true;
  }, [refs.attachActionHostRef]);

  const unifiedInputDeckNavHandlers = useMemo(
    () =>
      ({
        onMoveUp: () => focusFirstPresetChip(),
        onMoveLeft: () => focusAttachPaperclip(),
        onMoveDown: () => {
          /*
           * The box's Down since plan 84: the small Ask button sits in the strip right under the box,
           * so landing on it skips nothing (the maintainer's 2026-10-06 rule that sent Down to the
           * mode button was about the big Ask button below the strip; docs/focus-graph.md, "The ask
           * box's strip"). Down then A sends what was typed.
           *
           * The Ask button is greyed out while a question is in flight, so Down must not land the
           * ring on it. This used to swallow the press instead, which meant Down did nothing at
           * all for the whole time an answer took to arrive.
           *
           * Measured on the device 2026-09-20
           * (runs/plan62-ASKBAR-FOCUS-TRAP-reproduced-after-send.json): press Ask, the ring lands
           * on the emptied question box, and two Downs moved nothing. The moment the answer
           * landed, Down worked again
           * (runs/plan62-ASKBAR-FOCUS-TRAP-after-answer-finished.json). On a twenty-second answer
           * a dead Down reads exactly like being stuck, and it is very likely part of why the
           * "Down stops half way and the Ask button is out of reach" reports kept coming back --
           * during that window there is no Ask button to reach, only a Stop.
           *
           * The old comment said nothing else sat below. Something does: the Stop button, which
           * takes the microphone's place while asking, and which is the one control a person
           * actually wants then -- the same reasoning that keeps Retry live on a stopped answer.
           * So hand the ring to Stop, and only hold it still if even that is missing.
           */
          if (isAskInFlight) return focusMicOrStop() || true;
          return focusAskPrimary();
        },
        onMoveRight: () => focusAskModeButton(),
      }) as Record<string, unknown>,
    [
      focusAskPrimary,
      focusAttachPaperclip,
      focusFirstPresetChip,
      focusAskModeButton,
      focusMicOrStop,
      isAskInFlight,
    ],
  );

  const avatarDeckNavHandlers = useMemo(
    () =>
      ({
        onMoveRight: () => focusUnifiedTextField(),
        onMoveDown: () => focusAttachPaperclip(),
      }) as Record<string, unknown>,
    [focusAttachPaperclip, focusUnifiedTextField],
  );

  return {
    focusUnifiedTextField,
    focusAttachPaperclip,
    focusAiCharacterAvatar,
    focusFirstPresetChip,
    focusAskPrimary,
    focusMicOrStop,
    focusAskModeButton,
    unifiedInputDeckNavHandlers,
    avatarDeckNavHandlers,
  };
}
