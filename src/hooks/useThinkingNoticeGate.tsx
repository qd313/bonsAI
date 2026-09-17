/**
 * Title: The one-time notice before Thinking turns on
 *
 * Purpose: The Thinking row on the Ollama tab has four choices: Off, Brief,
 * Balanced, Deep (Off by default). The first time a person moves it off
 * Off, this shows a popup first: "Thinking shows on screen as it happens
 * and is not checked for spoilers. Show it?" Pressing "Show thinking"
 * applies the chosen level and remembers, in this device's own storage,
 * that the popup was seen -- it never shows again after that. Pressing
 * "Keep it off" leaves Thinking off, changes nothing else, and the popup
 * comes back the next time the row is moved off Off.
 *
 * Used for: OllamaTab, wrapping the Thinking row's own change handler.
 *
 * Solves: Without this, moving the row off Off applied instantly, with no
 * warning that the reasoning now appears on screen live and unmasked --
 * including in Strategy mode, where it can describe how a fight or a story
 * ends before a person has a chance to say they would rather not see that.
 * Copies the accept-once storage pattern `useDisclaimerAndLocalRuntimeGates.tsx`
 * already uses for the beta notice and the on-Deck AI notice, so all three
 * "seen it once" flags work the same way and live in the same kind of place.
 *
 * Does not: Decide what each level asks the model to do, or where the level
 * itself is saved -- see `askThinkEffort.ts` and the settings the Ollama tab
 * already owns. This file only decides whether to show the popup before a
 * change lands, and remembers that it has been shown.
 */
import { useCallback, useEffect, useRef } from "react";
import { showModal, ConfirmModal } from "@decky/ui";

import { elementHasGamepadFocus } from "../utils/uiDocument";
import type { AskThinkEffortId } from "../data/askThinkEffort";
import { THINKING_NOTICE_STORAGE_KEY, type DeckyModalSurvivalHooks } from "./useDisclaimerAndLocalRuntimeGates";

const THINKING_NOTICE_DESCRIPTION =
  "Thinking shows on screen as it happens and is not checked for spoilers. Show it?";

function hasAcceptedThinkingNotice(): boolean {
  try {
    return window.localStorage.getItem(THINKING_NOTICE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function markThinkingNoticeAccepted(): void {
  try {
    window.localStorage.setItem(THINKING_NOTICE_STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

/**
 * Moves Steam's own D-pad ring back onto a known element once the popup closes, either way. A
 * plain `focus()` alone does not reliably move Steam's ring across a modal boundary (AGENTS.md,
 * the Decky focus graph section) -- this checks with `elementHasGamepadFocus` and, only if that
 * first try has not landed yet, retries across a couple more frames, the same idea
 * `modalReturnFocusRegistry.ts` uses for every other popup on this plugin. No page search here:
 * the element is the actual button the person pressed, handed straight through from the click that
 * opened this popup (`OllamaThinkingEffortRow`'s `onChange`), never looked up afterward.
 */
function focusBackOnto(el: HTMLElement, retryDelaysMs: number[] = [120, 320]): void {
  let index = 0;
  const attempt = () => {
    try {
      el.focus({ preventScroll: true });
    } catch {
      try {
        el.focus();
      } catch {
        /* ignore */
      }
    }
    if (elementHasGamepadFocus(el)) return;
    if (index >= retryDelaysMs.length) return;
    const delay = retryDelaysMs[index];
    index += 1;
    window.setTimeout(attempt, delay);
  };
  attempt();
}

export type ThinkingNoticeGateApi = {
  /**
   * Call this instead of the settings setter directly. The first time this moves the level off
   * Off on this device, it shows the notice and only applies the change if the person presses
   * "Show thinking". Every other change -- Brief/Balanced/Deep between each other, or moving back
   * to Off -- applies right away with no popup. `sourceEl` is the button that was pressed, so a
   * closed popup can put the D-pad ring straight back on it.
   */
  requestThinkingEffortChange: (next: AskThinkEffortId, sourceEl: HTMLButtonElement) => void;
};

/**
 * In: the level currently saved, the setter that actually saves a new one, and the same two modal
 * lifecycle hooks (`onBeforeDeckyModal`, `onCompleteDeckyModalClose`) the Ollama tab already
 * threads through every other confirm box it opens.
 * Out: a change requester to use in place of the raw setter.
 * Can go wrong: nothing -- the button handed in at request time is always the real element the
 * person just pressed, so there is no "not registered yet" case to fall back from.
 */
export function useThinkingNoticeGate(
  askThinkEffort: AskThinkEffortId,
  setAskThinkEffort: (v: AskThinkEffortId) => void,
  modalHooks?: DeckyModalSurvivalHooks
): ThinkingNoticeGateApi {
  const modalHooksRef = useRef(modalHooks);
  useEffect(() => {
    modalHooksRef.current = modalHooks;
  }, [modalHooks]);

  const requestThinkingEffortChange = useCallback(
    (next: AskThinkEffortId, sourceEl: HTMLButtonElement) => {
      if (askThinkEffort !== "off" || next === "off" || hasAcceptedThinkingNotice()) {
        setAskThinkEffort(next);
        return;
      }
      modalHooksRef.current?.onBeforeDeckyModal();
      const handle = showModal(
        <ConfirmModal
          strTitle="bonsAI - Thinking"
          strDescription={THINKING_NOTICE_DESCRIPTION}
          strOKButtonText="Show thinking"
          strCancelButtonText="Keep it off"
          onOK={() => {
            markThinkingNoticeAccepted();
            setAskThinkEffort(next);
            modalHooksRef.current?.onCompleteDeckyModalClose(() => handle.Close());
            focusBackOnto(sourceEl);
          }}
          onCancel={() => {
            modalHooksRef.current?.onCompleteDeckyModalClose(() => handle.Close());
            focusBackOnto(sourceEl);
          }}
        />
      );
    },
    [askThinkEffort, setAskThinkEffort]
  );

  return { requestThinkingEffortChange };
}
