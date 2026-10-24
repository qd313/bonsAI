/**
 * Title: Giving the ring back to a model's Remove control after its box closes
 *
 * Purpose: In the AI models screen, a row's Remove from Deck control opens the "Remove <model> from the
 * Deck?" box. When that box closes with Cancel or B, the ring must be back on the same row's Remove
 * control. On the Deck (plan93-P93-M9-CONFIRM-BOXES-after.json, build 0ef34f82) it landed on the next row's
 * pull tick box instead, twice, because that control is not a stop Steam would choose by itself (it is
 * reached by our own row moves) and nothing handed the ring back. This remembers which model's control
 * opened the box and, after the box closes, gives the ring back to it a few times over the next second,
 * since Steam places the ring on its own moments after a box closes.
 *
 * Used for: PullModelsModal.tsx (each row registers its Remove control under its model name),
 * usePullModelDeleteConfirm.tsx (remembers the row when the box opens, restores on Cancel and B).
 *
 * Solves: Closing a Decky box rebuilds what is behind it (docs/lessons-learned.md), so a memory kept in a
 * component is lost. Both the memory (a model name) and the controls (looked up by that name when needed)
 * live here, outside every component, so a screen that was unmounted and drawn again while the box was
 * open still gets its ring back, on the new control.
 *
 * Does not: move the ring on a confirmed removal (the row is about to go), or search the page for the
 * control: each row hands its own control in. The move is a plain focus between siblings of the list,
 * the same move the row's own Left and Right make; when the ring has strayed outside the list the caller's
 * `enterList` (Steam's own transfer) runs first.
 */
import { elementHasGamepadFocus } from "../../../shared/dpad/uiDocument";

const controls = new Map<string, HTMLElement>();
let pendingTag: string | null = null;
let runId = 0;

/** Rows call this from their Remove control's ref: the element, or null when it unmounts. */
export function registerRemoveControl(tag: string, el: HTMLElement | null): void {
  if (el) controls.set(tag, el);
  else controls.delete(tag);
}

/** The box for this model is about to open. */
export function rememberRemoveReturn(tag: string): void {
  pendingTag = tag;
  runId += 1;
}

/** Forget the row (a confirmed removal, or a test reset). Pending attempts stop. */
export function clearRemoveReturn(): void {
  pendingTag = null;
  runId += 1;
}

/** Milliseconds after the box closes at which the ring is checked and, if it is elsewhere, given back. */
const CHECK_AT_MS = [80, 220, 450, 800];

/**
 * In: how to put the ring on a control (the screen's own row move, which also scrolls it into view), and
 * optionally how to bring the ring back into the list first (Steam's transfer onto the list's node).
 * Out: nothing. Checks a few times, because Steam moves the ring itself a moment after a box closes, and
 * each check gives the ring back only if the remembered control does not have it. Stops early if another
 * box was remembered or the row was cleared meanwhile.
 */
export function restoreRemoveReturn(
  focusControl: (el: HTMLElement) => void,
  enterList?: () => boolean,
): void {
  const tag = pendingTag;
  if (!tag) return;
  const mine = runId;
  CHECK_AT_MS.forEach((ms, i) => {
    window.setTimeout(() => {
      if (runId !== mine || pendingTag !== tag) return;
      const el = controls.get(tag);
      if (el?.isConnected && !elementHasGamepadFocus(el)) {
        try {
          focusControl(el);
          if (!elementHasGamepadFocus(el) && enterList?.()) focusControl(el);
        } catch {
          /* a failed move leaves the ring where Steam put it */
        }
      }
      if (i === CHECK_AT_MS.length - 1 && runId === mine) pendingTag = null;
    }, ms);
  });
}

/** Test-only reset. */
export function resetRemoveReturnForTests(): void {
  controls.clear();
  pendingTag = null;
  runId += 1;
}
