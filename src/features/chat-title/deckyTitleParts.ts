/**
 * Title: Decky's own parts beside bonsAI's title view
 *
 * Purpose: bonsAI's title view (the chat's name, ChatTitleView.tsx) is drawn by Decky inside Decky's own
 * title bar, next to Decky's back arrow. A few things bonsAI does need to know where that arrow is: the
 * ring must never be left on it by accident (one A there closes bonsAI). This file remembers bonsAI's own
 * title root and finds Decky's parts from it by structure, never by Decky's class names, which Steam
 * scrambles at build time (design-language.md, rule 5).
 *
 * The shape, read from Decky Loader's TitleView.tsx (2026-10-08) and measured on the Deck the same day:
 * Decky's title bar holds its back arrow (a `button`) first and bonsAI's view second. A pinned Quick Tab
 * (plan 66) draws the bar with no arrow, so bonsAI's view is the first child there.
 *
 * Used for: chatNameNav.ts (a landing on the arrow after a box closes is taken back to the name).
 *
 * Does not: Change anything of Decky's. Reading only.
 */

let titleRoot: HTMLElement | null = null;

/** bonsAI's title view root, from its ref callback (null on unmount). */
export function rememberChatTitleRoot(el: HTMLElement | null): void {
  titleRoot = el;
}

/**
 * Decky's back arrow: the first child of Decky's title bar, when that is a button and not bonsAI's own
 * view. Null when bonsAI's view is not drawn, or the bar has no arrow (a pinned Quick Tab), or the bar is
 * not the shape this file expects.
 */
export function deckyBackArrow(): HTMLElement | null {
  const title = titleRoot?.parentElement ?? null;
  const first = (title?.firstElementChild as HTMLElement | null) ?? null;
  if (!first || first === titleRoot) return null;
  return first.tagName === "BUTTON" ? first : null;
}

/** Test-only reset. */
export function resetDeckyTitleParts(): void {
  titleRoot = null;
}
