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

export function isDownNavigationKey(key: string): boolean {
  return key === "ArrowDown" || key === "Down" || key === "DPadDown" || key === "GamepadDPadDown";
}

export function isUpNavigationKey(key: string): boolean {
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

/** Find a visible focusable descendant to support controller-first keyboard navigation. */
export function getFocusableWithin(selector: string): HTMLElement | null {
  const root = document.querySelector(selector) as HTMLElement | null;
  if (!root) return null;
  const candidate = root.matches("[tabindex],button,a,input,select,textarea")
    ? root
    : (root.querySelector("[tabindex],button,a,input,select,textarea") as HTMLElement | null);
  return candidate;
}
