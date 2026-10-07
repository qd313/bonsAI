/**
 * Title: Ask bar press hand-offs
 *
 * Purpose: What the Ask button and the Stop button do with the D-pad ring once pressed. A press of
 * Ask fires the question and hands the ring on (to the question box after a send, back to Ask
 * itself when the box was empty); a press of Stop cancels the answer and hands the ring to the
 * question box.
 *
 * Used for: MainTabUnifiedAskBar.tsx's Ask button and its Stop button.
 *
 * Solves: Without a hand-off the ring was left on nothing (Ask) or on a control that changed its
 * meaning under it (Stop turning back into the microphone). Kept out of the component body so the
 * bar stays under its size limit.
 *
 * Does not: Decide whether a question can be sent (onAskOllama does), or draw either button.
 *
 * How it works:
 * 1. handleAskPress: ignore the press while an answer is running; fire onAskOllama; then take the
 *    ring to the question box through Steam's own transfer if there was a question, else keep it
 *    on Ask.
 * 2. handleStopPress: cancel, then take the ring to the question box.
 */
import { useCallback } from "react";

import { takeNavFocus } from "../utils/navFocusRegistry";

export function useAskBarPressHandlers(args: {
  isAsking: boolean;
  unifiedInput: string;
  onAskOllama: () => void | Promise<void>;
  onCancelAsk: () => void;
  focusAskPrimary: () => boolean;
}) {
  const { isAsking, unifiedInput, onAskOllama, onCancelAsk, focusAskPrimary } = args;

  /*
   * Every press of the Ask button used to leave nothing highlighted, with a real question and an
   * empty box alike (measured 2026-09-05, four times). The cause lives outside this file: onAskOllama
   * (useBonsaiAskOrchestration.ts) blurs whatever the page's own focus happens to be sitting on
   * before it even checks whether there is a question to send -- dismissing the on-screen keyboard
   * is bound to activeElement, not to whether this press did anything. Nothing downstream then
   * claims the ring, so it drops to nothing, and the next D-pad press has to place it again -- on a
   * fresh panel, that placing press lands on Decky's own back arrow above the plugin.
   *
   * Fixed at the press itself rather than in the orchestration hook: hand the ring on to somewhere
   * sensible right after firing the ask, through Steam's own transfer. A send moves it to the
   * question box, since a person may want to type a follow-up right away. An empty-box press never
   * sends anything, so the ring simply goes back to this same button -- a plain focus() here is
   * safe because it is not crossing a container, it is the button reclaiming itself.
   */
  const handleAskPress = useCallback(() => {
    if (isAsking) return;
    const hadQuestion = unifiedInput.trim().length > 0;
    void onAskOllama();
    if (hadQuestion) {
      takeNavFocus("unified-input");
    } else {
      focusAskPrimary();
    }
  }, [isAsking, unifiedInput, onAskOllama, focusAskPrimary]);

  /*
   * Stop hands the ring to the question box, like a send does. Measured on the Deck 2026-09-27
   * (plan 72, docs/test-evidence/plan72-A2-STOP-RING-try1..3.json): Stop and Voice input are the
   * same corner button, so React keeps the one element when the answer ends and the ring stayed on
   * it, now reading "Voice input" -- the very next A turned the microphone on, 3 tries of 3. The
   * box is where a person goes next after cutting an answer short (a new or reworded question).
   */
  const handleStopPress = useCallback(() => {
    onCancelAsk();
    takeNavFocus("unified-input");
  }, [onCancelAsk]);

  return { handleAskPress, handleStopPress };
}
