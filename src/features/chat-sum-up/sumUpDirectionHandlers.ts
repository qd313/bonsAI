/**
 * Title: Up and Down handlers for the Session tab's Sum up stops
 *
 * Purpose: The one set of Up/Down handlers every stop in the Sum up section shares: the button, the
 * summary card and the title offer's two buttons.
 *
 * Used for: SessionSumUpSection.tsx and SessionTitleOffer.tsx.
 *
 * Solves: On the Deck Steam calls a Focusable's `onMoveUp` / `onMoveDown`; the `onButtonDown` twin
 * only covers presses tests and desktop keyboards deliver, and it ignores a press unless this
 * stop really holds Steam's ring, so a press that belongs to another stop is never taken twice.
 *
 * Does not: Move anything itself. The two callbacks decide where the ring goes and say whether the
 * press was theirs (false leaves it to Steam's own navigation).
 */
import { isDeckDirectionDownEvent, isDeckDirectionUpEvent } from "../../utils/focusNavigation";
import { elementHasGamepadFocus } from "../../utils/uiDocument";

export function directionHandlers(
  el: () => HTMLElement | null,
  onUp: () => boolean,
  onDown: () => boolean,
): Record<string, unknown> {
  return {
    onMoveUp: () => onUp(),
    onMoveDown: () => onDown(),
    onButtonDown: (evt: unknown) => {
      const self = el();
      if (self && !elementHasGamepadFocus(self)) return false;
      if (isDeckDirectionUpEvent(evt)) return onUp();
      if (isDeckDirectionDownEvent(evt)) return onDown();
      return false;
    },
  };
}
