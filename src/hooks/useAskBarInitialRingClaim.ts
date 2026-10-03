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
 * And on a return from another Quick Access tab (plan 81): switching tabs does not close the panel's
 * page and does not rebuild the plugin -- Steam only hides the plugin's pane (its width goes to 0)
 * and shows it again. No visibility event fires, so neither half above ran, and the ring came back
 * on Decky's own back arrow in 6 of 6 returns (plan81-P81-LOOK-QAM-TAB-SWITCH.json). So the plugin
 * watches its own pane's size: each hidden-to-shown change arms a short window (about 10 s). While
 * armed it watches where Steam's ring is. A ring resting on the tab icon column (outside the pane)
 * is left alone -- that person may be about to press Down or Right. The first time the ring lands
 * inside the same Quick Access pane but outside the plugin (Decky's back arrow), it goes to the
 * question box, once. A ring that lands on a plugin control just ends the window. After the window
 * ends nothing more happens until the next return, so walking Up to the back arrow on purpose is
 * never undone. A box (modal) being open, or the pane hiding again, also ends the window.
 *
 * Does not: Take any argument or hand anything back -- every value it needs
 * is either a literal ("unified-input") or an imported utility, and it acts
 * only through Steam's own nav registry, never a plain focus() call on a
 * control. The one other thing it ever asks for is the panel window's focus.
 */
import { useEffect } from "react";

import { peekModalReturnFocus } from "../features/plugin-shell/modalReturnFocusRegistry";
import { refocusPanelWindowIfLost, takeNavFocus } from "../utils/navFocusRegistry";
import { getUiDocument, uiGamepadFocusElement } from "../utils/uiDocument";

/* The reopen half: first check a beat after the page turns visible (Steam gets the first go at
   focusing its own window), then a couple more a beat apart while it is still missing. */
const REOPEN_BEAT_MS = 150;
const REOPEN_MAX_ASKS = 3;

/* The return half: how long a return keeps watching for the ring to enter the pane, and how often
   it looks. Polling, because a gamepad move is not shown to fire a focus event on the panel page. */
const RETURN_WINDOW_MS = 10000;
const RETURN_POLL_MS = 100;
/* Steam's own id on the tab pane that holds the plugin (measured in dozens of focus paths, all under
   `#quickaccess_content_999`); class names there are scrambled, the id prefix is not. */
const QAM_PANE_SELECTOR = '[id^="quickaccess_content_"]';

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

  /*
   * The tab-return half (plan 81). The observer only ARMS: hidden is a box of width or height 0,
   * shown is anything bigger, and only a hidden-then-shown change arms. The observer comes from the
   * panel's own window -- one made in SharedJSContext is not driven by the other page's frames.
   * While armed, a poll reads the gamepad-aware ring owner (see the header for what each place
   * means). With no Quick Access pane to compare against (desktop, tests without one) it never acts.
   */
  useEffect(() => {
    const doc = getUiDocument();
    // Observing the pane's size, not looking for a focus target: nothing here is focused or moved.
    // focus-patterns-allow: observing the pane's size to learn when Steam shows it again.
    const scope = doc.querySelector<HTMLElement>(".bonsai-scope");
    const Observer = doc.defaultView?.ResizeObserver ?? globalThis.ResizeObserver;
    if (!scope || typeof Observer !== "function") return;

    let wasHidden = false;
    let armed = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let windowEndsAt = 0;
    const disarm = () => {
      armed = false;
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = undefined;
    };
    const watch = () => {
      timeoutId = undefined;
      if (!armed) return;
      if (Date.now() >= windowEndsAt || doc.visibilityState !== "visible") return disarm();
      if (peekModalReturnFocus() !== null) return disarm(); // a box is open: the ring is its business
      const holder = uiGamepadFocusElement();
      if (holder && holder !== doc.body) {
        if (scope.contains(holder)) return disarm(); // a plugin control has it
        // The same Quick Access pane, outside the plugin: Decky's own header and back arrow.
        // Anywhere else (the tab icon column) the person is still choosing a tab: keep watching.
        // focus-patterns-allow: asking which pane the ring is in, not finding a target to focus.
        const pane = scope.closest(QAM_PANE_SELECTOR);
        if (pane?.contains(holder) && takeNavFocus("unified-input")) return disarm();
      }
      timeoutId = setTimeout(watch, RETURN_POLL_MS);
    };
    const observer = new Observer((entries) => {
      const box = entries[entries.length - 1]?.contentRect;
      if (!box) return;
      const hidden = box.width === 0 || box.height === 0;
      if (hidden) {
        wasHidden = true;
        disarm();
        return;
      }
      if (!wasHidden) return; // first reading, or an ordinary resize while shown
      wasHidden = false;
      disarm();
      armed = true;
      windowEndsAt = Date.now() + RETURN_WINDOW_MS;
      timeoutId = setTimeout(watch, RETURN_POLL_MS);
    });
    observer.observe(scope);
    return () => {
      observer.disconnect();
      disarm();
    };
  }, []);
}
