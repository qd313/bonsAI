import { beforeEach, describe, expect, it } from "vitest";

import {
  getFocusableWithin,
  isDeckDirectionDownEvent,
  isDeckDirectionLeftEvent,
  isDeckDirectionRightEvent,
  isDeckDirectionUpEvent,
  isDownDeckButtonEvent,
  isOkDeckButtonEvent,
  isTriggerLeftDeckEvent,
  isTriggerRightDeckEvent,
  isUpDeckButtonEvent,
} from "./focusNavigation";
import { rememberUiDocument, resetUiDocument } from "./uiDocument";

/**
 * The shape Decky actually delivers to `onButtonDown`: a `GamepadEvent`, which is a `CustomEvent`
 * whose `detail.button` is a numeric `GamepadButton` (`@decky/ui`, `components/FooterLegend.d.ts`).
 */
function gamepadEvent(button: number): unknown {
  return { type: "gamepadbuttondown", detail: { button, source: 0 } };
}

const OK = 1;
const CANCEL = 2;
const DIR_UP = 9;
const DIR_DOWN = 10;
const DIR_LEFT = 11;
const DIR_RIGHT = 12;

describe("isOkDeckButtonEvent", () => {
  it("accepts A from a gamepad event", () => {
    expect(isOkDeckButtonEvent(gamepadEvent(OK))).toBe(true);
  });

  /*
   * The bug this exists for: D-pad Down on a masked spoiler revealed it. The handler tested "is this
   * a direction?" against a CustomEvent, which stringifies to "[object CustomEvent]" and matches no
   * direction, so every press fell through to the reveal.
   */
  it("rejects D-pad down, which used to reveal the spoiler", () => {
    expect(isOkDeckButtonEvent(gamepadEvent(DIR_DOWN))).toBe(false);
  });

  it("rejects D-pad up", () => {
    expect(isOkDeckButtonEvent(gamepadEvent(DIR_UP))).toBe(false);
  });

  it("rejects B, so cancel does not act like confirm", () => {
    expect(isOkDeckButtonEvent(gamepadEvent(CANCEL))).toBe(false);
  });

  it("accepts a bare button id", () => {
    expect(isOkDeckButtonEvent(OK)).toBe(true);
    expect(isOkDeckButtonEvent(DIR_DOWN)).toBe(false);
  });

  it("accepts the keyboard equivalents", () => {
    expect(isOkDeckButtonEvent("Enter")).toBe(true);
    expect(isOkDeckButtonEvent("ArrowDown")).toBe(false);
  });

  it("rejects null and undefined", () => {
    expect(isOkDeckButtonEvent(null)).toBe(false);
    expect(isOkDeckButtonEvent(undefined)).toBe(false);
  });

  /* A CustomEvent with no usable detail must not be read as a confirmation. */
  it("rejects an event without a numeric button", () => {
    expect(isOkDeckButtonEvent({ detail: {} })).toBe(false);
    expect(isOkDeckButtonEvent({})).toBe(false);
  });
});

describe("direction predicates parse key strings, not gamepad events", () => {
  it("matches the key strings they were written for", () => {
    expect(isDownDeckButtonEvent("ArrowDown")).toBe(true);
    expect(isUpDeckButtonEvent("GamepadDPadUp")).toBe(true);
  });

  /*
   * String-only helpers stay inert on gamepad events — use isDeckDirection*Event where
   * `onButtonDown` is the sole direction handler.
   */
  it("does not match a gamepad event (string helpers only)", () => {
    expect(isDownDeckButtonEvent(gamepadEvent(DIR_DOWN))).toBe(false);
    expect(isUpDeckButtonEvent(gamepadEvent(DIR_UP))).toBe(false);
  });
});

describe("isDeckDirection*Event", () => {
  it("reads direction ids from a gamepad event", () => {
    expect(isDeckDirectionDownEvent(gamepadEvent(DIR_DOWN))).toBe(true);
    expect(isDeckDirectionUpEvent(gamepadEvent(DIR_UP))).toBe(true);
    expect(isDeckDirectionLeftEvent(gamepadEvent(DIR_LEFT))).toBe(true);
    expect(isDeckDirectionRightEvent(gamepadEvent(DIR_RIGHT))).toBe(true);
  });

  it("rejects non-direction buttons", () => {
    expect(isDeckDirectionDownEvent(gamepadEvent(OK))).toBe(false);
    expect(isDeckDirectionLeftEvent(gamepadEvent(CANCEL))).toBe(false);
  });

  it("still accepts key-string fallbacks for tests and keyboard nav", () => {
    expect(isDeckDirectionDownEvent("ArrowDown")).toBe(true);
    expect(isDeckDirectionLeftEvent("ArrowLeft")).toBe(true);
  });
});

describe("getFocusableWithin", () => {
  beforeEach(() => {
    resetUiDocument();
  });

  it("queries the remembered UI document, not the global shell", () => {
    const doc = document.implementation.createHTMLDocument("qam");
    const host = doc.createElement("div");
    host.className = "bonsai-attachment-remove-target";
    const btn = doc.createElement("button");
    host.appendChild(btn);
    doc.body.appendChild(host);
    rememberUiDocument(host);

    expect(getFocusableWithin(".bonsai-attachment-remove-target")).toBe(btn);
    expect(document.querySelector(".bonsai-attachment-remove-target")).toBeNull();
  });
});

/*
 * Plan 84 step 5, test A (2026-10-08): L2 and R2 reach the plugin as buttons 7 (TRIGGER_LEFT) and 8
 * (TRIGGER_RIGHT), on the focused control's button-down and as `vgp_onbuttondown` at the panel's
 * document. Both shapes carry the number in `detail.button`.
 */
describe("the trigger predicates", () => {
  it("know LT as button 7 and RT as button 8, as an event or a bare number", () => {
    expect(isTriggerLeftDeckEvent(gamepadEvent(7))).toBe(true);
    expect(isTriggerRightDeckEvent(gamepadEvent(8))).toBe(true);
    expect(isTriggerLeftDeckEvent(7)).toBe(true);
    expect(isTriggerRightDeckEvent(8)).toBe(true);
  });

  it("say no to every other button, the bumpers (5, 6) included", () => {
    for (const button of [OK, CANCEL, 3, 4, 5, 6, DIR_UP, DIR_DOWN, DIR_LEFT, DIR_RIGHT]) {
      expect(isTriggerLeftDeckEvent(gamepadEvent(button))).toBe(false);
      expect(isTriggerRightDeckEvent(gamepadEvent(button))).toBe(false);
    }
    expect(isTriggerLeftDeckEvent(gamepadEvent(8))).toBe(false);
    expect(isTriggerRightDeckEvent(gamepadEvent(7))).toBe(false);
  });

  it("never match a key string: a trigger is never a keyboard key", () => {
    expect(isTriggerLeftDeckEvent("7")).toBe(false);
    expect(isTriggerRightDeckEvent("GamepadRightTrigger")).toBe(false);
  });
});
