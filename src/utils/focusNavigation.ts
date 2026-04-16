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

/** Find a visible focusable descendant to support controller-first keyboard navigation. */
export function getFocusableWithin(selector: string): HTMLElement | null {
  const root = document.querySelector(selector) as HTMLElement | null;
  if (!root) return null;
  const candidate = root.matches("[tabindex],button,a,input,select,textarea")
    ? root
    : (root.querySelector("[tabindex],button,a,input,select,textarea") as HTMLElement | null);
  return candidate;
}
