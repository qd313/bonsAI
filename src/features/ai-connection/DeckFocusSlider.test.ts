import { describe, expect, it, vi } from "vitest";
import { buildDeckThumbNavHandlers, type DeckFocusSliderThumbNavProps } from "./DeckFocusSlider";

function makeNav(overrides: Partial<DeckFocusSliderThumbNavProps> = {}) {
  const onMoveLeft = vi.fn(() => true);
  const onMoveRight = vi.fn(() => true);
  const nav: DeckFocusSliderThumbNavProps = {
    onMoveLeft,
    onMoveRight,
    ...overrides,
  };
  return { nav, onMoveLeft, onMoveRight };
}

/*
 * Found on device 2026-09-03 (ONBUTTONDOWN-AUDIT-01): Left on the Reply style, keep-alive and
 * custom-timeout sliders stepped the value once and then let Steam's own navigation carry that same
 * press out of the plugin onto the Quick Access rail. The step used to run from `onButtonDown`,
 * whose return value never consumes a direction the way a `Focusable` move handler does. These pin
 * the step to `onMoveLeft`/`onMoveRight`, which Steam does treat as claimed when it returns true, and
 * check that `onButtonDown` no longer carries a second stepping path for the same press.
 */
describe("Deck slider thumb D-pad handlers", () => {
  it("Left steps the value exactly once and claims the move", () => {
    const { nav, onMoveLeft } = makeNav();
    const handlers = buildDeckThumbNavHandlers(nav);
    expect((handlers.onMoveLeft as () => boolean)()).toBe(true);
    expect(onMoveLeft).toHaveBeenCalledTimes(1);
  });

  it("Right steps the value exactly once and claims the move", () => {
    const { nav, onMoveRight } = makeNav();
    const handlers = buildDeckThumbNavHandlers(nav);
    expect((handlers.onMoveRight as () => boolean)()).toBe(true);
    expect(onMoveRight).toHaveBeenCalledTimes(1);
  });

  it("claims the move even when the caller's handler returns void", () => {
    const onMoveLeft = vi.fn((): boolean | void => undefined);
    const onMoveRight = vi.fn((): boolean | void => undefined);
    const handlers = buildDeckThumbNavHandlers({ onMoveLeft, onMoveRight });
    expect((handlers.onMoveLeft as () => boolean)()).toBe(true);
    expect((handlers.onMoveRight as () => boolean)()).toBe(true);
  });

  it("wires no onButtonDown handler, so a single press cannot step the value twice", () => {
    const { nav } = makeNav();
    const handlers = buildDeckThumbNavHandlers(nav);
    expect(handlers.onButtonDown).toBeUndefined();
  });

  it("Up/Down pass through the optional handlers and default to letting Steam decide", () => {
    const { nav } = makeNav();
    const bare = buildDeckThumbNavHandlers(nav);
    expect((bare.onMoveUp as () => boolean)()).toBe(false);
    expect((bare.onMoveDown as () => boolean)()).toBe(false);

    const onMoveUp = vi.fn(() => true);
    const onMoveDown = vi.fn(() => true);
    const withVertical = buildDeckThumbNavHandlers({ ...nav, onMoveUp, onMoveDown });
    expect((withVertical.onMoveUp as () => boolean)()).toBe(true);
    expect((withVertical.onMoveDown as () => boolean)()).toBe(true);
    expect(onMoveUp).toHaveBeenCalledTimes(1);
    expect(onMoveDown).toHaveBeenCalledTimes(1);
  });
});
