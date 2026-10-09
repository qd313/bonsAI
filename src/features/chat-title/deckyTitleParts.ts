/**
 * Title: Decky's own parts beside bonsAI's title view
 *
 * Purpose: bonsAI's title view (the chat's name, ChatTitleView.tsx) is drawn by Decky inside Decky's own
 * title bar, next to Decky's back arrow. A few things bonsAI does need to know where that arrow is: the
 * ring must never be left on it by accident (one A there closes bonsAI). This file remembers bonsAI's own
 * title root and finds Decky's parts from it by structure, never by Decky's class names, which Steam
 * scrambles at build time (design-language.md, rule 5).
 *
 * The shape, read from Decky Loader's TitleView.tsx and PluginView.tsx (2026-10-08) and measured on the
 * Deck the same day (plan 84 test B, and the focus paths in the test evidence):
 *
 *     Decky's own Quick Access page        id "quickaccess_content_<n>" (999 for Decky's tab)
 *       Decky's plugin box                 its first child is the title bar
 *         Decky's title bar                the back arrow (a button), then bonsAI's view
 *         Decky's gap                      its first child is bonsAI's box (.bonsai-scope)
 *
 * A pinned Quick Tab (plan 66) draws the title bar with no arrow, so bonsAI's view is its only child.
 *
 * Used for: chatNameNav.ts (a landing on the arrow after a box closes is taken back to the name) and
 * deckyHeaderShape.ts (plan 84 step 6 reshapes these parts, and changes nothing unless every one of them
 * is where this file expects it).
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

/** Decky's parts around bonsAI's view, each found by structure from bonsAI's own title root. */
export type DeckyHeaderParts = {
  /** Decky's title bar. */
  title: HTMLElement;
  /** Decky's back arrow; null in a bar drawn without one (a pinned Quick Tab). */
  arrow: HTMLElement | null;
  /** bonsAI's own title view root. */
  view: HTMLElement;
  /** Decky's box holding the title bar and the plugin. */
  box: HTMLElement;
  /** Decky's gap under its title bar, holding bonsAI's box. */
  gap: HTMLElement;
  /** bonsAI's own box. */
  scope: HTMLElement;
  /** Decky's own Quick Access page. Steam's shared container is its parent, and is never one of these. */
  page: HTMLElement;
};

/** Decky's own Quick Access page carries Steam's id for a Quick Access tab's content. */
const DECKY_PAGE_ID = /^quickaccess_content_\d+$/;

/**
 * In: nothing; reads from bonsAI's title root. Out: every one of Decky's parts, or null when any of them is
 * not where the shape above puts it (a Decky or Steam update, or bonsAI's box not drawn yet). Every check is
 * structural: who is whose parent and first child, the page's id, and bonsAI's own class on its box.
 */
export function deckyHeaderParts(): DeckyHeaderParts | null {
  const view = titleRoot;
  const title = view?.parentElement ?? null;
  const box = title?.parentElement ?? null;
  if (!view || !title || !box || box.firstElementChild !== title) return null;
  const arrow = deckyBackArrow();
  if (title.children.length !== (arrow ? 2 : 1) || title.lastElementChild !== view) return null;
  const gap = (title.nextElementSibling as HTMLElement | null) ?? null;
  const scope = (gap?.firstElementChild as HTMLElement | null) ?? null;
  if (!gap || !scope || !scope.classList.contains("bonsai-scope")) return null;
  const page = box.parentElement;
  if (!page || !DECKY_PAGE_ID.test(page.id)) return null;
  return { title, arrow, view, box, gap, scope, page };
}

/** Test-only reset. */
export function resetDeckyTitleParts(): void {
  titleRoot = null;
}
