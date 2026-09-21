/**
 * Title: Where to put the D-pad after a popup closes
 *
 * Purpose: When a person opens a full-screen popup — the character picker,
 * the models hub, and so on — and then closes it, this is what sends the
 * D-pad's focus ring back to the exact button that opened it, instead of
 * leaving it wherever Steam happens to land.
 *
 * Used for: Every popup opened from the plugin's main screen: help,
 * save-to-desktop, the character picker, the models hub, chat rename, the
 * tab bar, and the two Settings data-clearing confirmations.
 *
 * Solves: Closing a popup used to put a person back on the right tab but
 * not on the button they had pressed, so they had to walk the whole panel
 * again with the D-pad to find where they were.
 *
 * Does not: Decide which tab is showing — useBonsaiPluginShell owns that.
 * This only owns the one button focus lands on once a tab is showing.
 *
 * A button has to register itself here while it is on screen, rather than
 * this file going looking for it, because searching the page directly for
 * "whatever is focused" is unreliable on the Deck and can land focus
 * somewhere wrong (see the Decky focus-graph rule in AGENTS.md). If the
 * button that opened a popup is not on screen by the time the popup
 * closes, focus is simply left where it is — nothing else happens.
 */
import { elementHasGamepadFocus } from "../../utils/uiDocument";

/** One id per control that can open a modal. Two entry points to the same modal need two ids. */
export type ModalReturnFocusId =
  | "plugin-help"
  | "desktop-note-save"
  | "character-picker-settings"
  | "ollama-models-hub"
  | "chat-slot-rename"
  /** The collapsing tab bar (plan 30): where a picker's return lands when its opener is gone. */
  | "tab-bar"
  /** Settings -> Data's two confirm-modal openers (plan 32 bug 4). */
  | "settings-clear-cache"
  | "settings-clear-all-data"
  /** The Session context strip's own Clear button (plan 56 D105). */
  | "session-context-clear"
  /**
   * The Session tab's own Clear button, folded into a turn's Show details panel (plan 62 3c) —
   * a distinct id from "session-context-clear" above (the still-present standalone strip) so the
   * two do not fight over one registry entry while both can be on screen at once, before the
   * standalone strip is removed.
   */
  | "session-tab-clear"
  /** Ollama tab's two "Set ... model try order..." openers (plan 55 bug B2). */
  | "ollama-text-try-order"
  | "ollama-vision-try-order"
  /** The Thinking row's one-time notice (plan 57 bug D): its own container, since any of the
   *  row's four buttons can be the one that opened the popup. */
  | "ollama-thinking-effort";

const owners = new Map<ModalReturnFocusId, HTMLElement>();
let pendingReturn: ModalReturnFocusId | null = null;

/**
 * In: an id naming which button this is, and the button's own element (or
 * null, which is how a ref callback reports "this unmounted").
 * Out: nothing — it just remembers or forgets the button.
 * Can go wrong: nothing — a button registering itself twice just replaces
 * the earlier entry.
 */
export function registerModalReturnFocusOwner(id: ModalReturnFocusId, el: HTMLElement | null): void {
  if (el) owners.set(id, el);
  else owners.delete(id);
}

/**
 * In: which button is about to open a popup.
 * Out: nothing — remembers the id for whichever restore call happens once
 * the popup closes.
 * Can go wrong: nothing. Called by the button's own tap handler, so which
 * button opened the popup is always known for certain rather than guessed.
 */
export function rememberModalReturnFocus(id: ModalReturnFocusId): void {
  pendingReturn = id;
}

/**
 * In: nothing.
 * Out: nothing — forgets whichever button was remembered.
 * Can go wrong: nothing.
 */
export function clearModalReturnFocus(): void {
  pendingReturn = null;
}

/**
 * In: nothing.
 * Out: the remembered button's id, or null if none is remembered.
 * Can go wrong: nothing — read-only, does not consume the value.
 */
export function peekModalReturnFocus(): ModalReturnFocusId | null {
  return pendingReturn;
}

/**
 * In: nothing — reads whichever button was remembered.
 * Out: true if the D-pad ring actually landed on that button, false if
 * there was nothing remembered or the button is not on screen right now.
 * Can go wrong: the remembered id is cleared either way, on success or
 * failure — a close that cannot restore focus must not leave the id
 * armed for some later, unrelated popup close to pick up by accident.
 */
export function restoreModalReturnFocus(): boolean {
  const id = pendingReturn;
  pendingReturn = null;
  if (!id) return false;
  return focusOwnerById(id);
}

/**
 * In: an optional callback to report what happened, and the delays (in
 * milliseconds) to wait between tries — three tries by default.
 * Out: nothing directly; the callback, if given, is told whether focus
 * landed and how many tries it took.
 * Can go wrong: if the button never mounts within the given tries, focus
 * is left wherever it is and the callback is told it failed.
 *
 * Retries the restore across a few frames before giving up, rather than
 * trying once. Measured on a real Deck: the save-to-desktop button's
 * opener reported failure because the button had not registered itself
 * yet — after the plugin's screen is rebuilt, its tabs mount on their own
 * schedule, and a single attempt right after switching tabs can run before
 * the button exists. Each try is cheap, so a button that is just slow to
 * mount still gets its focus back on a later try.
 */
export function restoreModalReturnFocusWithRetry(
  onResult?: (claimed: boolean, attempts: number) => void,
  delaysMs: number[] = [0, 120, 320],
): void {
  const id = pendingReturn;
  if (!id) {
    onResult?.(false, 0);
    return;
  }
  let index = 0;
  const attempt = () => {
    if (pendingReturn !== id) return; // something else armed or cleared it meanwhile
    // Keep trying while the ring has not actually moved, not just while the control is unmounted.
    // The old loop stopped the moment the owner appeared in the map and reported whatever the
    // first try returned — and since that return was always `true`, it always stopped at one.
    if (owners.has(id) && focusOwnerById(id)) {
      pendingReturn = null;
      onResult?.(true, index + 1);
      return;
    }
    index += 1;
    if (index >= delaysMs.length) {
      pendingReturn = null;
      onResult?.(false, index);
      return;
    }
    window.setTimeout(attempt, delaysMs[index]);
  };
  window.setTimeout(attempt, delaysMs[0]);
}

/**
 * In: the id of the button to focus.
 * Out: true only if Steam's own focus ring actually moved onto it, not
 * merely if the browser's idea of focus moved.
 * Can go wrong: a button that is not currently registered (unmounted, or
 * never registered) reports false immediately.
 *
 * Two things changed here on 2026-08-28, both of them rule violations that had been shipping since
 * this registry landed:
 *
 * 1. **It used to write `tabindex="-1"` onto all three targets, and never put it back.**
 *    `AGENTS.md (Decky focus graph)`: *"NEVER overwrite an existing `tabindex`... Decky sets
 *    `tabindex="0"` on the nodes it navigates; replacing it removes them from Steam's graph, so
 *    navigating onto a control is what stops it responding."* So every modal close quietly took
 *    its own opener out of the nav graph. That is the strongest available explanation for the
 *    models-hub and desktop-note openers landing focus on the tab strip instead.
 * 2. **It returned `true` whenever the element merely existed.** A plain `focus()` sets
 *    `activeElement` while `gpfocus` stays behind, so "claimed" meant nothing — which is why two
 *    on-device attempts at this bug both looked like they had worked. The check is now
 *    `elementHasGamepadFocus`, i.e. Steam's ring, not the DOM's idea of focus.
 *
 * A plain `focus()` is still the mechanism, and that is allowed: the rule bans it for crossing
 * navigation containers, and permits it within one. If the honest check shows it is not enough
 * here, the sanctioned fix is a `navRef` + `TakeFocus(true)` per
 * [navFocusRegistry.ts](../../utils/navFocusRegistry.ts) — but that needs each opener to expose a
 * nav node, so it is a bigger change and wants its own measurement first.
 */
function focusOwnerById(id: ModalReturnFocusId): boolean {
  const el = owners.get(id);
  if (!el) return false;

  // Same target ladder as replyStopRegistry: Decky's focusable Panel wrapper first, then the
  // native button, then the registered element itself.
  const panel = (
    el.matches?.(".Panel.Focusable") ? el : el.closest?.(".Panel.Focusable")
  ) as HTMLElement | null;
  const button = el.matches?.("button") ? el : (el.querySelector?.("button") as HTMLElement | null);
  const targets = [panel, button, el].filter(Boolean) as HTMLElement[];
  for (const target of targets) {
    try {
      target.focus({ preventScroll: true });
    } catch {
      try {
        target.focus();
      } catch {
        /* ignore */
      }
    }
    if (elementHasGamepadFocus(target)) return true;
  }
  return false;
}

/**
 * In: nothing.
 * Out: nothing — clears every registered button and any remembered id.
 * Can go wrong: nothing. Test-only reset, not called by the plugin itself.
 */
export function resetModalReturnFocusRegistry(): void {
  owners.clear();
  pendingReturn = null;
}
