/**
 * Title: "N earlier" pill row Left-claim tests
 * Purpose: Pin the fix for roadmap "Left on the collapsed-history row throws the highlight out
 *          of the plugin" — the row must claim Left itself, or Steam's own "past the edge"
 *          navigation carries the D-pad ring out to the Quick Access rail.
 * Used for: MainTabChatTranscript.tsx's earlierPillLeftNavHandlers(), wired onto the
 *           "N earlier" row's Focusable alongside its existing onActivate/onOKButton.
 * Solves: Confirmed twice on device (docs/test-evidence/round35-BUG-left-from-earlier-pill-
 *         leaves-plugin.json and the retry file next to it): with the ring on the pill, Left
 *         handed it to Steam's Quick Access rail because nothing on the row consumed the press.
 *         Same shape as the Ollama sliders fixed 2026-09-04 (DeckFocusSlider.tsx) — claim the
 *         move on `onMoveLeft` itself, the handler Steam actually invokes for a D-pad press.
 * Does not: Prove the fix on-device. The Deck check this owes: with the ring on the "N earlier"
 *           row, press Left and confirm the ring stays on the row rather than leaving the panel.
 */
import { describe, expect, it } from "vitest";

import { earlierPillLeftNavHandlers } from "./MainTabChatTranscript";

describe('"N earlier" pill row claims Left', () => {
  it("reports the press handled on a real D-pad move (onMoveLeft, what Steam invokes)", () => {
    const handlers = earlierPillLeftNavHandlers();
    const onMoveLeft = handlers.onMoveLeft as () => boolean;
    expect(onMoveLeft()).toBe(true);
  });

  it("does not double-claim a GamepadEvent direction delivered to onButtonDown", () => {
    const handlers = earlierPillLeftNavHandlers();
    const onButtonDown = handlers.onButtonDown as (b: unknown) => boolean;
    expect(onButtonDown({ type: "gamepadbuttondown", detail: { button: 7 } })).toBe(false);
  });

  it("still claims a string-shaped Left press, which desktop keyboards deliver", () => {
    const handlers = earlierPillLeftNavHandlers();
    const onButtonDown = handlers.onButtonDown as (b: unknown) => boolean;
    expect(onButtonDown("ArrowLeft")).toBe(true);
  });

  it("leaves an unrelated button untouched", () => {
    const handlers = earlierPillLeftNavHandlers();
    const onButtonDown = handlers.onButtonDown as (b: unknown) => boolean;
    expect(onButtonDown("ArrowRight")).toBe(false);
  });
});
