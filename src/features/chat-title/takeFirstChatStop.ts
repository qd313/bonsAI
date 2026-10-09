/**
 * Title: The ring onto the chat's first stop, from above the chat
 *
 * Purpose: Where Down goes when it enters the chat from above it: today from the tab bar on the Main tab
 * (index.tsx, `tabBarExitDown`), and after plan 84 step 6 from the chat's name. The saved-chats row used
 * to sit between the two and owned this move; with the row gone (plan 84 step 5) the move lands on the
 * first stop of the chat itself, or on the question box when the chat is empty.
 *
 * The first stop, in order of what can be there:
 *   1. the "N earlier" line, when older questions are folded behind it (always the first stop then);
 *   2. the first question's text (never its Retry, plan 79);
 *   3. the open question's text, when the first question is a closed row with no text stop of its own
 *      (an older question: only the newest carries Retry and a text stop), one row lower;
 *   4. the newest question's row while it is closed (an older one open, "newest-closed-question");
 *   5. the question box: an empty chat, the new-chat spot, or nothing above found.
 *
 * Used for: MainTab.tsx (as the chat title store's `takeFirstStop` action), read by index.tsx.
 *
 * Solves: Steam's own Down from above the chat lands on Steam's hidden tab buttons (the hidden-header
 * trap then throws the ring back to the tab bar, so the press does nothing), so the move is never left to
 * Steam. Every hop is Steam's own transfer onto a registered nav node, never a plain focus().
 *
 * Does not: Reach a closed older question's row by name. Nothing registers one; case 3 lands one row lower
 * instead, and Up from there reaches the row above (questionMoveUpOut).
 */
import { takeOpenQuestionText } from "../../utils/buildTurnHeaderElement";
import { takeEarlierLine } from "../../utils/chatTranscriptNavHelpers";
import { takeNavFocus } from "../../utils/navFocusRegistry";

export type FirstChatStopSource = {
  /** The first turn drawn in the transcript (the first saved turn, or "live" when only the live turn shows). */
  firstTurnId: string;
  /** The turn that is open ("live" or a saved turn's id), if any. */
  openTurnId: string | null | undefined;
  /** Nothing in the chat to land on: an empty chat, or the new-chat spot. */
  chatEmpty: boolean;
};

export function takeFirstChatStop({ firstTurnId, openTurnId, chatEmpty }: FirstChatStopSource): boolean {
  if (chatEmpty) return takeNavFocus("unified-input");
  return (
    takeEarlierLine() ||
    takeOpenQuestionText(firstTurnId) ||
    (openTurnId && openTurnId !== firstTurnId ? takeOpenQuestionText(openTurnId) : false) ||
    takeNavFocus("newest-closed-question") ||
    takeNavFocus("unified-input")
  );
}
