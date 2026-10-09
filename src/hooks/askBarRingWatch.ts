/**
 * Title: Ask bar ring watch
 * Purpose: A short window, started by the caller, in which the plugin watches where Steam's ring is
 *          and hands it to the question box the first time it lands somewhere the person did not
 *          choose to put it.
 * Used for: useAskBarInitialRingClaim.ts, which starts a window on a fresh build of the plugin, when
 *           Quick Access is shown again, and when the plugin's pane is shown again after another
 *           Quick Access tab.
 * Solves: Plan 81. After a tab switch the ring came back on Decky's own back arrow; after a fresh
 *         close-and-open it came back on the plugin's own tab bar, 3 of 3 times
 *         (plan81-P81-TAB-SWITCH-RING-reopen.json). The plugin's one-time claim at mount cannot see
 *         either: the plugin stays mounted across these, and on a rebuild Steam (through the hidden
 *         tab-button catcher) can park the ring on the tab bar before the claim looks, and the claim
 *         yields to "something already owns it". The tab bar is a plugin control, so "a plugin
 *         control holds it" cannot mean "the person put it there" for the first moments of a window.
 *
 * What counts, while a window is open (every 100 ms, from the gamepad-aware ring owner):
 *   - nothing owns it                         -> take it to the question box
 *   - Decky's header or back arrow (inside Steam's Quick Access pane, outside the plugin) -> take it
 *   - the plugin's tab bar, in the first few seconds only (nobody has had time to put it there)
 *     -> take it
 *   - any other plugin control                -> the window ends, nothing is touched
 *   - the tab icon column, or anywhere outside the pane -> leave it, the person may be choosing a tab
 * "The plugin" is bonsAI's own box and bonsAI's own title view in Decky's bar (plan 84: the chat's
 * name, and the tab bar once it moves up there). Only Decky's own parts of that bar count as Decky's.
 * The window also ends after a take (once the ring is seen on a plugin control, or after a few
 * takes), when a box (modal) is open, when the page turns hidden, and when its time is up. After it
 * ends nothing is done until the caller starts the next one, so a person who walks Up to the back
 * arrow or the tab bar on purpose is never pulled back.
 *
 * Does not: Decide when a window starts. It moves the ring only through the nav registry
 * (`takeNavFocus`), never a plain `focus()`.
 */
import { peekModalReturnFocus } from "../features/plugin-shell/modalReturnFocusRegistry";
import { takeNavFocus } from "../utils/navFocusRegistry";
import { uiGamepadFocusElement } from "../utils/uiDocument";

const WINDOW_MS = 10000;
/* Polling, because a gamepad move is not shown to fire a focus event on the panel page. */
const POLL_MS = 100;
/* How long after the window starts a ring on the plugin's own tab bar still counts as unplaced. */
const TAB_BAR_CLAIM_MS = 3000;
/* A take that does not stick (the ring reads somewhere else a moment later) may be repeated this often. */
const MAX_TAKES = 3;
/* Steam's own id on the tab pane that holds the plugin (measured in dozens of focus paths, all under
   `#quickaccess_content_999`); class names there are scrambled, the id prefix is not. */
const QAM_PANE_SELECTOR = '[id^="quickaccess_content_"]';

export type RingWatch = { start: () => void; stop: () => void };

export function createRingWatch(doc: Document, scope: HTMLElement): RingWatch {
  let armed = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let startedAt = 0;
  let takes = 0;

  const stop = () => {
    armed = false;
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = undefined;
  };

  const tick = () => {
    timeoutId = undefined;
    if (!armed) return;
    const age = Date.now() - startedAt;
    if (age >= WINDOW_MS || doc.visibilityState !== "visible") return stop();
    if (peekModalReturnFocus() !== null) return stop(); // a box is open: the ring is its business
    const holder = uiGamepadFocusElement();
    let take = !holder || holder === doc.body; // nothing owns it
    if (!take && holder) {
      // Asking whose control this is, not looking for something to focus.
      // focus-patterns-allow: telling bonsAI's own title view in Decky's bar from Decky's own parts.
      const inTitleView = holder.closest(".bonsai-chat-title") !== null;
      if (inTitleView || scope.contains(holder)) {
        // Asking whose control this is, not looking for something to focus.
        // focus-patterns-allow: telling the tab bar from other plugin controls by ownership.
        const onTabBar = holder.closest(".bonsai-tab-bar") !== null;
        if (!onTabBar) return stop(); // a plugin control has it, the question box after a take
        take = age < TAB_BAR_CLAIM_MS;
      } else {
        // Inside Steam's Quick Access pane but outside the plugin: Decky's header and back arrow.
        // The tab icon column is outside the pane, so it falls through to "keep watching".
        // focus-patterns-allow: asking which pane the ring is in, not finding a target to focus.
        take = scope.closest(QAM_PANE_SELECTOR)?.contains(holder) === true;
      }
    }
    if (take && takes < MAX_TAKES && takeNavFocus("unified-input")) takes += 1;
    timeoutId = setTimeout(tick, POLL_MS);
  };

  return {
    stop,
    start: () => {
      stop();
      armed = true;
      startedAt = Date.now();
      takes = 0;
      timeoutId = setTimeout(tick, POLL_MS);
    },
  };
}
