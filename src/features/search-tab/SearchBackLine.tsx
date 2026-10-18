/**
 * Title: The "Back to where you were" line over a chat the Search tab jumped into
 *
 * Purpose: After A on a chat match, the chat opens on the question that matched. This is the one line drawn
 * above "N earlier" (or above the first question when the chat is short) while that jump is live: a small
 * outlined chip reading "‹ Back to where you were" (the drawing's `.s-back`, docs/demos/mockup-board/src/
 * 49-search.css). A on it goes back to the Search tab with the same word and game picked and the ring on the
 * match that was pressed. It is one stop: Down goes to "N earlier" (or the first question), Up to the stop above
 * the chat, Left and Right hold still.
 *
 * Used for: buildEarlierList.tsx, which draws it in the transcript while a jump is live (searchJumpStore.ts).
 *
 * Solves: Gives the jump a way back that is always the first stop under the tab bar, so a person who followed a
 * match into a long chat can return without walking the chat.
 *
 * Does not: Decide whether to show, switch tabs, or remember the match; the store does. It draws and hands the
 * ring on.
 */
import { useRef } from "react";
import { Focusable } from "@decky/ui";

import { isDeckDirectionLeftEvent, isDeckDirectionRightEvent, isDownDeckButtonEvent, isUpDeckButtonEvent } from "../../shared/dpad/focusNavigation";
import { takeAboveTheChat } from "../../shared/dpad/chatTranscriptNavHelpers";
import { textPx } from "../../styles/textPx";
import { registerBackLineEl, searchBackNav } from "./searchJumpStore";

const BACK_LINE_CSS = `
.bonsai-scope .bonsai-search-back-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin: 2px 0 6px;
}
.bonsai-scope .bonsai-search-back {
  font-size: ${textPx(10)};
  font-weight: 600;
  color: #a8b4c4;
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  white-space: nowrap;
}
`;

/**
 * The line's moves. `down` is where Down goes (the "N earlier" line, or the first question); Up is the stop
 * above the chat; Left and Right hold still, since a Right nobody claims would carry the ring out of the plugin
 * (the same rule the "N earlier" line keeps). The `onButtonDown` twin serves the string-shaped presses tests
 * and desktop keyboards deliver; it reads Up and Down by name only, so a real press (which also reaches
 * `onMoveUp` / `onMoveDown`) is never acted on twice.
 */
export function backLineNavHandlers(down: () => boolean): Record<string, unknown> {
  const up = () => takeAboveTheChat();
  const hold = () => true;
  return {
    navRef: searchBackNav,
    onMoveUp: up,
    onMoveDown: down,
    onMoveLeft: hold,
    onMoveRight: hold,
    onButtonDown: (button: unknown) => {
      if (isUpDeckButtonEvent(button)) return up();
      if (isDownDeckButtonEvent(button)) return down();
      return isDeckDirectionLeftEvent(button) || isDeckDirectionRightEvent(button);
    },
  };
}

export type SearchBackLineProps = {
  /** A: go back to the Search tab. */
  onBack: () => void;
  /** The move handlers (backLineNavHandlers). */
  nav: Record<string, unknown>;
};

export function SearchBackLine({ onBack, nav }: SearchBackLineProps) {
  const mounted = useRef<HTMLElement | null>(null);
  const noteMounted = (el: HTMLElement | null) => {
    registerBackLineEl(el, mounted.current);
    mounted.current = el;
  };
  return (
    <>
      <Focusable
        ref={noteMounted}
        className="bonsai-search-back-row"
        aria-label="Back to where you were, in the Search tab"
        onActivate={onBack}
        {...nav}
      >
        <span className="bonsai-search-back">‹ Back to where you were</span>
      </Focusable>
      <style>{BACK_LINE_CSS}</style>
    </>
  );
}
