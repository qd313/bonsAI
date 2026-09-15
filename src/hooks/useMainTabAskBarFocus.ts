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
 *     paperclip        Ask (primary) button
 *       ▲
 *       │ Left
 *       │
 *     question box
 *
 * (The mic button also has a jump function here, but it is not one of the
 * edges this file wires up itself — it is handed back for another file to
 * connect where it needs it.)
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
import { elementHasGamepadFocus } from "../utils/uiDocument";

export type MainTabAskBarFocusRefs = {
  unifiedInputFieldLayerRef: React.Ref<HTMLDivElement>;
  attachActionHostRef: React.Ref<HTMLDivElement>;
  askBarHostRef: React.Ref<HTMLDivElement>;
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
 * 5. focusAskPrimary() — the Ask button itself.
 * 6. focusMicOrStop() — the mic / stop button in the input's other corner.
 * 7. focusAskModeButton() — the button that opens the Ask-mode picker.
 * 8. Bundle the question box's four directions and the avatar's two
 *    directions into the two handler objects this hook returns, so a caller
 *    can wire a whole control's D-pad moves in one step.
 */
export function useMainTabAskBarFocus(
  refs: MainTabAskBarFocusRefs,
  showAiCharacterChrome: boolean,
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
      help.focus();
      return elementHasGamepadFocus(help);
    }
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

  const focusAskPrimary = useCallback((): boolean => {
    const host =
      refs.askBarHostRef &&
      typeof refs.askBarHostRef === "object" &&
      "current" in refs.askBarHostRef
        ? (refs.askBarHostRef as React.RefObject<HTMLDivElement | null>).current
        : null;
    const btn = host?.querySelector<HTMLElement>("button.bonsai-ask-primary");
    if (!btn) return false;
    btn.focus();
    return true;
  }, [refs.askBarHostRef]);

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
        onMoveDown: () => focusAskPrimary(),
        onMoveRight: () => focusAskModeButton(),
      }) as Record<string, unknown>,
    [focusAskPrimary, focusAttachPaperclip, focusFirstPresetChip, focusAskModeButton],
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
