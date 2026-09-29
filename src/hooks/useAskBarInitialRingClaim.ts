/**
 * Title: Ask bar initial ring claim
 *
 * Purpose: On a fresh panel open, where nothing owns Steam's D-pad ring yet,
 * try a few times to place it on the question box rather than leave the
 * first press to land wherever Steam happens to put it.
 *
 * Used for: MainTabUnifiedAskBar.tsx, mounted once with the bar itself.
 *
 * Solves: "Opening the panel leaves nothing highlighted" -- measured
 * landing on Decky's own back arrow above the plugin rather than in it
 * (docs/test-evidence/round35-trap-attempt-1-after-b-reopen.json). AGENTS.md
 * calls this normal Steam behaviour and not ours to fix; the maintainer
 * asked for an attempt anyway, on the condition that it can never steal the
 * ring from something that already has it.
 *
 * Also, on a Quick Access reopen: the plugin stays mounted while Quick Access
 * is closed, so the claim above never runs again on a reopen. Over a running
 * game a reopen sometimes comes back without the browser's focus on the
 * panel's page, and from then on Steam's ring and the page's focus part ways
 * on the plugin's own in-row hops (plan 76, plan76-P76-TRAP-SPLIT.json). So a
 * reopen that is still without that focus a beat later asks the panel's own
 * window for it -- a few tries, then it gives up. A reopen that came back
 * with focus, the ordinary case, does nothing at all.
 *
 * Does not: Take any argument or hand anything back -- every value it needs
 * is either a literal ("unified-input") or an imported utility, and it acts
 * only through Steam's own nav registry, never a plain focus() call on a
 * control. The one other thing it ever asks for is the panel window's focus.
 */
import { useEffect } from "react";

import { refocusPanelWindowIfLost, takeNavFocus } from "../utils/navFocusRegistry";
import { getUiDocument, uiGamepadFocusElement } from "../utils/uiDocument";

/* The reopen half: first check a beat after the page turns visible (Steam gets the first go at
   focusing its own window), then a couple more a beat apart while it is still missing. */
const REOPEN_BEAT_MS = 150;
const REOPEN_MAX_ASKS = 3;

/*
 * In: nothing.
 * Out: nothing -- this only ever acts through Steam's nav registry.
 * What can go wrong: nothing it can detect from here; every attempt
 * re-checks ownership first, so the worst case is simply giving up after
 * MAX_ATTEMPTS rather than yanking the ring away from something that got
 * there first.
 *
 * Decky has not populated the text field's own nav node on the first render, so this retries a
 * few times a beat apart. Every attempt re-checks ownership first: `uiGamepadFocusElement()`
 * reads Steam's `.gpfocus` ring and falls back to `document.activeElement` only when there is no
 * ring at all, and `document.activeElement` is `document.body` when nothing has ever been
 * focused -- so "the gamepad-aware answer is still body" is the one honest way this file has to
 * ask "is anything home yet". The moment that stops being true -- Steam parked the ring
 * somewhere, or a person already moved it with a mouse -- this gives up rather than yanking the
 * ring away. Never a plain `focus()`: this is a hop into a different Steam nav container, the
 * same reason `focusUnifiedTextField` in MainTabUnifiedAskBar.tsx uses `takeNavFocus`.
 */
export function useAskBarInitialRingClaim() {
  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const MAX_ATTEMPTS = 20;
    const POLL_MS = 50;
    const tryClaim = () => {
      if (cancelled) return;
      attempts += 1;
      if (uiGamepadFocusElement() !== getUiDocument().body) return; // something already owns it
      if (takeNavFocus("unified-input")) return; // claimed
      if (attempts < MAX_ATTEMPTS) {
        timeoutId = setTimeout(tryClaim, POLL_MS);
      }
    };
    timeoutId = setTimeout(tryClaim, POLL_MS);
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  /*
   * The reopen half (plan 76). `refocusPanelWindowIfLost` re-reads visibility and focus on every
   * try, so a panel closed again, or a focus Steam has given back meanwhile, ends the tries with
   * nothing asked. Listening on the panel's own document: that is the page Quick Access shows and
   * hides; SharedJSContext's `document` never sees either.
   */
  useEffect(() => {
    const doc = getUiDocument();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let asks = 0;
    const tryRefocus = () => {
      timeoutId = undefined;
      if (!refocusPanelWindowIfLost()) return;
      asks += 1;
      if (asks < REOPEN_MAX_ASKS) timeoutId = setTimeout(tryRefocus, REOPEN_BEAT_MS);
    };
    const onVisibilityChange = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = undefined;
      asks = 0;
      if (doc.visibilityState === "visible") timeoutId = setTimeout(tryRefocus, REOPEN_BEAT_MS);
    };
    doc.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      doc.removeEventListener("visibilitychange", onVisibilityChange);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);
}
