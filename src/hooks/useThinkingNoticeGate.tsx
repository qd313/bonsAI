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
 *
 * Two device bugs fixed here (measured 2026-09-17, docs/test-evidence/plan57-REASONING-07.json):
 *
 * (a) The D-pad ring used to be sent back with a plain `focusBackOnto(sourceEl)` -- a direct
 *     reference to the pressed button, kept across the popup's lifetime. Decky remounts the
 *     plugin's whole screen when this kind of popup closes (see modalReturnFocusRegistry.ts),
 *     so that reference is a detached, unmounted node by the time the popup actually closes --
 *     focusing it is a no-op, which is why the ring landed on the tab strip instead. Fixed by
 *     using the same registry every other popup on this screen uses: `rememberModalReturnFocus`
 *     before the popup opens, and a registered owner the registry can find again after the
 *     remount.
 * (b) Accepting used to apply the change with a plain `setAskThinkEffort(next)` and nothing
 *     else. `onBeforeDeckyModal` (captureSessionBeforeModal) snapshots the whole session,
 *     including every setting, right before the popup opens -- before the person has chosen
 *     anything. Decky's remount restores settings from that snapshot in preference to a fresh
 *     read from disk (see `takeRestoredSettingsSnapshot` in usePluginSettings.ts), so the
 *     snapshot's still-Off value always won, no matter how fast the setting itself saved.
 *     `useRoutingOrderModal.ts` hit the identical bug for the model try-order pickers (2026-09-06)
 *     and fixed it by patching the pending snapshot right after applying the change, with
 *     `patchPendingSessionSettingsSnapshot`; this file does the same thing for the level chosen
 *     here.
 */
import { useCallback, useEffect, useRef } from "react";
import { showModal, ConfirmModal } from "@decky/ui";

import type { AskThinkEffortId } from "../data/askThinkEffort";
import { THINKING_NOTICE_STORAGE_KEY, type DeckyModalSurvivalHooks } from "./useDisclaimerAndLocalRuntimeGates";
import { rememberModalReturnFocus } from "../features/plugin-shell/modalReturnFocusRegistry";
import { patchPendingSessionSettingsSnapshot } from "../utils/bonsaiSessionSurvival";

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

export type ThinkingNoticeGateApi = {
  /**
   * Call this instead of the settings setter directly. The first time this moves the level off
   * Off on this device, it shows the notice and only applies the change if the person presses
   * "Show thinking". Every other change -- Brief/Balanced/Deep between each other, or moving back
   * to Off -- applies right away with no popup.
   */
  requestThinkingEffortChange: (next: AskThinkEffortId) => void;
};

/**
 * In: the level currently saved, the setter that actually saves a new one, and the same two modal
 * lifecycle hooks (`onBeforeDeckyModal`, `onCompleteDeckyModalClose`) the Ollama tab already
 * threads through every other confirm box it opens.
 * Out: a change requester to use in place of the raw setter.
 * Can go wrong: the return-focus registry entry ("ollama-thinking-effort") has to actually be
 * registered by the row for the ring to come back -- if the row is not on screen by the time the
 * popup closes, focus is simply left where it is, the same fallback every other registry entry has.
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
    (next: AskThinkEffortId) => {
      if (askThinkEffort !== "off" || next === "off" || hasAcceptedThinkingNotice()) {
        setAskThinkEffort(next);
        return;
      }
      modalHooksRef.current?.onBeforeDeckyModal();
      // Remembered before the popup opens, same as every other opener on this screen
      // (modalReturnFocusRegistry.ts) -- `onCompleteDeckyModalClose` below reads this back once
      // the remount has happened and the row exists again.
      rememberModalReturnFocus("ollama-thinking-effort");
      const handle = showModal(
        <ConfirmModal
          strTitle="bonsAI - Thinking"
          strDescription={THINKING_NOTICE_DESCRIPTION}
          strOKButtonText="Show thinking"
          strCancelButtonText="Keep it off"
          onOK={() => {
            markThinkingNoticeAccepted();
            setAskThinkEffort(next);
            // `onBeforeDeckyModal` already snapshotted the whole session -- including Thinking
            // still at Off -- before this popup ever opened. Decky's remount restores settings
            // from that snapshot in preference to a fresh disk read, so without this patch the
            // choice just made would be silently overwritten with the stale Off the moment the
            // popup closes. Same defect and same fix `useRoutingOrderModal.ts` uses for the
            // model try-order pickers.
            patchPendingSessionSettingsSnapshot({ askThinkEffort: next });
            modalHooksRef.current?.onCompleteDeckyModalClose(() => handle.Close());
          }}
          onCancel={() => {
            modalHooksRef.current?.onCompleteDeckyModalClose(() => handle.Close());
          }}
        />
      );
    },
    [askThinkEffort, setAskThinkEffort]
  );

  return { requestThinkingEffortChange };
}
