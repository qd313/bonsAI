/**
 * Title: Focus navigation key helpers
 * Purpose: Normalize Deck/keyboard D-pad and stick direction keys for onMove and key handlers.
 * Used for: deckSliderMath, buildReplyActionsElement, and slider/button focus bridges.
 * Solves: Reliable left/right/up/down detection when Steam CEF leaves key empty or Unidentified.
 * Does not: Implement focus graphs — section parents wire onMove* using these predicates.
 */
import { getUiDocument } from "./uiDocument";
export function isRightNavigationKey(key: string): boolean {
  return key === "ArrowRight" || key === "Right" || key === "DPadRight" || key === "GamepadDPadRight";
}

export function isLeftNavigationKey(key: string): boolean {
  return key === "ArrowLeft" || key === "Left" || key === "DPadLeft" || key === "GamepadDPadLeft";
}

/**
 * Steam/CEF often leaves `key` empty or "Unidentified" for gamepad D-pad; `code` still matches W3C values.
 */
export function isRightNavigationEvent(ev: Pick<KeyboardEvent, "key" | "code">): boolean {
  if (isRightNavigationKey(ev.key)) return true;
  const c = ev.code;
  return c === "ArrowRight" || c === "Numpad6";
}

export function isLeftNavigationEvent(ev: Pick<KeyboardEvent, "key" | "code">): boolean {
  if (isLeftNavigationKey(ev.key)) return true;
  const c = ev.code;
  return c === "ArrowLeft" || c === "Numpad4";
}

function isDownNavigationKey(key: string): boolean {
  return key === "ArrowDown" || key === "Down" || key === "DPadDown" || key === "GamepadDPadDown";
}

function isUpNavigationKey(key: string): boolean {
  return key === "ArrowUp" || key === "Up" || key === "DPadUp" || key === "GamepadDPadUp";
}

export function isDownNavigationEvent(ev: Pick<KeyboardEvent, "key" | "code">): boolean {
  if (isDownNavigationKey(ev.key)) return true;
  const c = ev.code;
  return c === "ArrowDown" || c === "Numpad2";
}

export function isUpNavigationEvent(ev: Pick<KeyboardEvent, "key" | "code">): boolean {
  if (isUpNavigationKey(ev.key)) return true;
  const c = ev.code;
  return c === "ArrowUp" || c === "Numpad8";
}

function isDownDeckButton(key: string): boolean {
  const lower = key.toLowerCase();
  return isDownNavigationKey(key) || key === "GamepadLeftStickDown" || lower.includes("down");
}

function isUpDeckButton(key: string): boolean {
  const lower = key.toLowerCase();
  return isUpNavigationKey(key) || key === "GamepadLeftStickUp" || lower.includes("up");
}

export function isDownDeckButtonEvent(button: unknown): boolean {
  return isDownDeckButton(String(button ?? ""));
}

export function isUpDeckButtonEvent(button: unknown): boolean {
  return isUpDeckButton(String(button ?? ""));
}

/*
 * `onButtonDown` does not receive a key string.
 *
 * Decky hands it a `GamepadEvent` — a `CustomEvent` whose `detail.button` is a numeric
 * `GamepadButton` (`@decky/ui`, `components/FooterLegend.d.ts`: `OK = 1`, `DIR_UP = 9`,
 * `DIR_DOWN = 10`). The predicates above stringify their argument, so a gamepad event arrives as
 * "[object CustomEvent]" and matches nothing. That is why the masked spoiler fence revealed itself
 * on D-pad Down: its handler tested for a direction, got false, and fell through to the reveal on
 * every button (reported on device 2026-08-04).
 *
 * The value is duplicated rather than imported so this stays a leaf module with no UI dependency —
 * the enum is a Steam input protocol, not a library detail.
 */
const DECK_BUTTON_OK = 1;
const DECK_BUTTON_CANCEL = 2;
const DECK_BUTTON_DIR_UP = 9;
const DECK_BUTTON_DIR_DOWN = 10;
const DECK_BUTTON_DIR_LEFT = 11;
const DECK_BUTTON_DIR_RIGHT = 12;
const DECK_BUTTON_BUMPER_LEFT = 5;
const DECK_BUTTON_BUMPER_RIGHT = 6;

/** The numeric button id, from whichever shape the caller was handed. */
function deckButtonId(button: unknown): number | null {
  if (typeof button === "number") return button;
  const detail = (button as { detail?: { button?: unknown } } | null | undefined)?.detail;
  if (detail && typeof detail.button === "number") return detail.button;
  return null;
}

/**
 * True only for A / OK.
 *
 * Gate anything that changes state on this rather than on "not a direction". `onButtonDown` fires
 * for *every* button, so a handler that does not whitelist will also act on B, the bumpers and the
 * stick clicks.
 */
export function isOkDeckButtonEvent(button: unknown): boolean {
  const id = deckButtonId(button);
  if (id !== null) return id === DECK_BUTTON_OK;
  const key = String(button ?? "").toLowerCase();
  return key === "enter" || key === "a" || key === "gamepada";
}

/** True only for B / Cancel (`GamepadButton.CANCEL` = 2 in @decky/ui's FooterLegend enum). */
export function isCancelDeckButtonEvent(button: unknown): boolean {
  const id = deckButtonId(button);
  if (id !== null) return id === DECK_BUTTON_CANCEL;
  const key = String(button ?? "").toLowerCase();
  return key === "escape" || key === "b" || key === "gamepadb";
}

export function isBumperLeftDeckEvent(button: unknown): boolean {
  const id = deckButtonId(button);
  return id === DECK_BUTTON_BUMPER_LEFT;
}

export function isBumperRightDeckEvent(button: unknown): boolean {
  const id = deckButtonId(button);
  return id === DECK_BUTTON_BUMPER_RIGHT;
}

/*
 * Direction predicates that understand a `GamepadEvent`.
 *
 * Deliberately separate from `isDownDeckButtonEvent` / `isUpDeckButtonEvent` above, which stay
 * string-only: those are wired into `onButtonDown` handlers that sit alongside an `onMoveDown`, and
 * teaching them to match events would make both fire for one press. Use these only where
 * `onButtonDown` is the sole handler for the direction.
 */
export function isDeckDirectionDownEvent(button: unknown): boolean {
  const id = deckButtonId(button);
  if (id !== null) return id === DECK_BUTTON_DIR_DOWN;
  return isDownDeckButtonEvent(button);
}

export function isDeckDirectionUpEvent(button: unknown): boolean {
  const id = deckButtonId(button);
  if (id !== null) return id === DECK_BUTTON_DIR_UP;
  return isUpDeckButtonEvent(button);
}

export function isDeckDirectionLeftEvent(button: unknown): boolean {
  const id = deckButtonId(button);
  if (id !== null) return id === DECK_BUTTON_DIR_LEFT;
  const key = String(button ?? "");
  return (
    isLeftNavigationKey(key) ||
    key === "GamepadLeftStickLeft" ||
    key.toLowerCase().includes("left")
  );
}

export function isDeckDirectionRightEvent(button: unknown): boolean {
  const id = deckButtonId(button);
  if (id !== null) return id === DECK_BUTTON_DIR_RIGHT;
  const key = String(button ?? "");
  return (
    isRightNavigationKey(key) ||
    key === "GamepadLeftStickRight" ||
    key.toLowerCase().includes("right")
  );
}

/** Find a visible focusable descendant to support controller-first keyboard navigation. */
export function getFocusableWithin(selector: string): HTMLElement | null {
  const root = getUiDocument().querySelector(selector) as HTMLElement | null;
  if (!root) return null;
  const candidate = root.matches("[tabindex],button,a,input,select,textarea")
    ? root
    : (root.querySelector("[tabindex],button,a,input,select,textarea") as HTMLElement | null);
  return candidate;
}
