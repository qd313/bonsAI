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
 * And past the first mount (plan 81): the plugin stays mounted across a tab switch (Steam only hides
 * the pane, width 0, no visibility event) and, on the Deck, across a close-and-open too. The ring
 * came back on Decky's back arrow after a tab switch (6 of 6) and on the plugin's own tab bar after a
 * fresh open (3 of 3). So a short watch window starts when the pane is shown again, when the page
 * turns visible, and on a fresh build's first mount; askBarRingWatch.ts says what it does with the
 * ring and what it leaves alone (a person resting on the tab icons, or walking Up on purpose).
 *
 * Does not: Take any argument or hand anything back -- every value it needs
 * is either a literal ("unified-input") or an imported utility, and it acts
 * only through Steam's own nav registry, never a plain focus() call on a
 * control. The one other thing it ever asks for is the panel window's focus.
 */
import { useEffect } from "react";

import { createRingWatch } from "./askBarRingWatch";
import { refocusPanelWindowIfLost, takeNavFocus } from "../utils/navFocusRegistry";
import { getUiDocument, uiGamepadFocusElement } from "../utils/uiDocument";

/* The reopen half: first check a beat after the page turns visible (Steam gets the first go at
   focusing its own window), then a couple more a beat apart while it is still missing. */
const REOPEN_BEAT_MS = 150;
const REOPEN_MAX_ASKS = 3;

/* Scope elements a mount has already seen: tells a fresh build of the plugin from a rebuilt tab. */
const scopesSeen = new WeakSet<Element>();

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
   * The ring watch (plan 81): see askBarRingWatch.ts for what a window does. Three things start one.
   * The pane's own size going from hidden to shown (a return from another Quick Access tab: hidden
   * is a box of width or height 0; the observer comes from the panel's own window, because one made
   * in SharedJSContext is not driven by the other page's frames). The panel's page turning visible
   * (a fresh close-and-open). And the first mount of a fresh build of the plugin -- told by its scope
   * element never having been seen before, so a Main tab rebuilt after a tab switch inside the same
   * build starts nothing and a person's ring on the tab bar is left alone.
   */
  useEffect(() => {
    const doc = getUiDocument();
    // Looking up the plugin's own root to watch it, not a focus target: nothing here is focused.
    // focus-patterns-allow: finding the plugin's root to observe its size and compare ring places.
    const scope = doc.querySelector<HTMLElement>(".bonsai-scope");
    if (!scope) return;
    const watch = createRingWatch(doc, scope);

    const onVisibilityChange = () => {
      if (doc.visibilityState === "visible") watch.start();
      else watch.stop();
    };
    doc.addEventListener("visibilitychange", onVisibilityChange);

    const fresh = !scopesSeen.has(scope);
    scopesSeen.add(scope);
    if (fresh && doc.visibilityState === "visible") watch.start();

    const Observer = doc.defaultView?.ResizeObserver ?? globalThis.ResizeObserver;
    let observer: ResizeObserver | undefined;
    if (typeof Observer === "function") {
      let wasHidden = false;
      observer = new Observer((entries) => {
        const box = entries[entries.length - 1]?.contentRect;
        if (!box) return;
        if (box.width === 0 || box.height === 0) {
          wasHidden = true;
          watch.stop();
        } else if (wasHidden) {
          wasHidden = false;
          watch.start();
        } // else: the first reading, or an ordinary resize while shown
      });
      observer.observe(scope);
    }
    return () => {
      doc.removeEventListener("visibilitychange", onVisibilityChange);
      observer?.disconnect();
      watch.stop();
    };
  }, []);
}
