/**
 * Title: Modal return-focus registry
 * Purpose: Send D-pad focus back to the control that opened a fullscreen picker, once it closes.
 * Used for: The four shell modals — plugin help, desktop-note save, character picker, models hub.
 * Solves: Closing a picker restored the tab but not the focused control, so the user re-walked the panel.
 * Does not: Own the tab restore (useBonsaiPluginShell) or general D-pad graphs (focus-graph rules).
 *
 * Registry rather than a DOM query on purpose: `AGENTS.md (Decky focus graph)` forbids
 * reaching for focus targets with `querySelector` / `document.activeElement`, because those miss
 * under Decky and land focus somewhere wrong. A control registers itself while mounted; if it is
 * not mounted when the modal closes, focus is left exactly where it is — today's behavior.
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
  | "settings-clear-all-data";

const owners = new Map<ModalReturnFocusId, HTMLElement>();
let pendingReturn: ModalReturnFocusId | null = null;

/** Ref callback: called with the element on mount and with null on unmount. */
export function registerModalReturnFocusOwner(id: ModalReturnFocusId, el: HTMLElement | null): void {
  if (el) owners.set(id, el);
  else owners.delete(id);
}

/** Called by the control's own onClick, so the opener is never guessed from the DOM. */
export function rememberModalReturnFocus(id: ModalReturnFocusId): void {
  pendingReturn = id;
}

export function clearModalReturnFocus(): void {
  pendingReturn = null;
}

export function peekModalReturnFocus(): ModalReturnFocusId | null {
  return pendingReturn;
}

/**
 * Focus the remembered control if it is mounted. Returns true when focus was claimed.
 *
 * Consumes the pending id either way: a modal close that cannot restore should not leave the id
 * armed for some later, unrelated close.
 */
export function restoreModalReturnFocus(): boolean {
  const id = pendingReturn;
  pendingReturn = null;
  if (!id) return false;
  return focusOwnerById(id);
}

/**
 * Retry the restore across a few frames before giving up.
 *
 * Measured on-device 2026-08-04: the desktop-note opener reported `claimed: false` because the
 * control had not re-registered yet — after a Content remount the tab body mounts on its own
 * schedule, and a single attempt one frame after the tab switch can land before the button exists.
 * Each attempt is cheap (a Map lookup), and the armed id survives until one succeeds or the
 * attempts run out, so a late-mounting control still gets its focus back.
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
 * Focus one target and say honestly whether Steam's ring followed.
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

/** Test-only reset. */
export function resetModalReturnFocusRegistry(): void {
  owners.clear();
  pendingReturn = null;
}
