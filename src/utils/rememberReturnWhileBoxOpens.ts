/**
 * Title: Remember which button opened a download notice, only if a box really opens
 *
 * Purpose: A button that asks the download notice (downloadNotice.tsx) before it downloads wants the
 * ring back on itself once the notice's box closes (closing a Decky box rebuilds the tab, and the ring
 * lands on the tab bar). The shell does that for any button that told it "it was me" when pressed
 * (modalReturnFocusRegistry.ts). But the notice does not always open a box: with downloads on and the
 * site already seen it says yes at once, and with the kids lock on it says no at once. A "it was me"
 * note armed for a box that never opened would sit there and pull the ring to this button on some
 * later, unrelated box close. This arms the note, waits for the answer, and takes the note back when
 * the answer came too fast for a person to have given it.
 *
 * Used for: KnowledgeBaseSection.tsx's Update and Pull nomic-embed-text buttons.
 *
 * Does not: move the ring; the shell's restore does, after the box closes.
 */
import {
  clearModalReturnFocus,
  peekModalReturnFocus,
  rememberModalReturnFocus,
  type ModalReturnFocusId,
} from "../features/plugin-shell/modalReturnFocusRegistry";

/** A box a person answers takes far longer than this; an answer sooner means no box was shown. */
const NO_BOX_ANSWER_MS = 50;

/**
 * In: the button's return id, the notice call (which resolves true when the download may start), and
 * where the ring should go when the answer is yes (the pressed button may be about to disable itself;
 * defaults to the same id).
 * Out: the notice's own answer, unchanged.
 */
export function rememberReturnWhileBoxOpens(
  id: ModalReturnFocusId,
  ask: () => Promise<boolean>,
  idWhenYes: ModalReturnFocusId = id,
): Promise<boolean> {
  rememberModalReturnFocus(id);
  const asked = Date.now();
  return ask().then((go) => {
    if (Date.now() - asked < NO_BOX_ANSWER_MS) {
      // No box was shown; take the note back, unless something else has replaced it meanwhile.
      if (peekModalReturnFocus() === id) clearModalReturnFocus();
    } else if (go && peekModalReturnFocus() === id) {
      // This runs before the shell's restore (it starts a beat after the box closes). If the answer
      // came later (the notice first had to save the permission) the restore has already used the
      // note up, and arming another now would only leave it stale.
      rememberModalReturnFocus(idWhenYes);
    }
    return go;
  });
}
