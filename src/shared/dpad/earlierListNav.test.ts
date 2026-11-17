/**
 * Title: One D-pad press acts once on the "N earlier" list's own stops (plan 105, lane A6)
 * Purpose: Steam hands every D-pad press to a Focusable's `onButtonDown` as well as to its move handler
 * (AGENTS.md, "Know which handler actually fires"). A twin in `onButtonDown` that matched Steam's own press would
 * act a second time: a game button would move the ring two buttons, and the "N earlier" line's flip would flip
 * the list and flip it back. These pin that the twins answer only string-shaped presses (tests, a desktop
 * keyboard) and that the move handlers carry the real press.
 * Used for: chatTranscriptNavHelpers.ts (`gameButtonNavHandlers`).
 * Does not: Draw anything; MainTabChatTranscript.earlierByGame.test.tsx walks the real transcript.
 */
import { describe, expect, it, vi } from "vitest";

import { gameButtonNavHandlers } from "./chatTranscriptNavHelpers";

/** Steam's own D-pad press as `onButtonDown` receives it: a GamepadEvent whose detail names the button. */
const STEAM_LEFT = { detail: { button: 11 } };
const STEAM_RIGHT = { detail: { button: 12 } };

function holders() {
  const node = () => ({ current: { TakeFocus: vi.fn(() => true) } });
  return { nav: node(), before: node(), after: node() };
}

describe("a game button's moves", () => {
  it("Left and Right move once, through the move handlers", () => {
    const h = holders();
    const moves = gameButtonNavHandlers({ ...h, up: () => true, down: () => true });
    expect((moves.onMoveLeft as () => boolean)()).toBe(true);
    expect((moves.onMoveRight as () => boolean)()).toBe(true);
    expect(h.before.current.TakeFocus).toHaveBeenCalledTimes(1);
    expect(h.after.current.TakeFocus).toHaveBeenCalledTimes(1);
  });

  it("Steam's own Left or Right reaching onButtonDown moves nothing, so one press is one step", () => {
    const h = holders();
    const moves = gameButtonNavHandlers({ ...h, up: () => true, down: () => true });
    const buttonDown = moves.onButtonDown as (b: unknown) => boolean;
    buttonDown(STEAM_LEFT);
    buttonDown(STEAM_RIGHT);
    expect(h.before.current.TakeFocus).not.toHaveBeenCalled();
    expect(h.after.current.TakeFocus).not.toHaveBeenCalled();
    /* A keyboard's arrow, which has no move handler behind it, still moves. */
    expect(buttonDown("ArrowLeft")).toBe(true);
    expect(h.before.current.TakeFocus).toHaveBeenCalledTimes(1);
  });

  it("at the ends Left and Right hold still and claim the press", () => {
    const moves = gameButtonNavHandlers({ nav: { current: null }, before: null, after: null, up: () => true, down: () => true });
    expect((moves.onMoveLeft as () => boolean)()).toBe(true);
    expect((moves.onMoveRight as () => boolean)()).toBe(true);
  });
});
