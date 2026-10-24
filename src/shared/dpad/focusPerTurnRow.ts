/**
 * Title: Focus a row from its own per-turn registry
 * Purpose: The one move shared by every per-turn row registry in the chat transcript (the "From
 * the notes" block, the details tabs row, the chip ladder) — given the map that registry keeps
 * from a turn key to that turn's own row element, put Steam's ring on it.
 * Used for: MainTabChatTranscript.tsx and buildKbNotesBlockElement.tsx's own per-turn registries;
 * its last step, `focusRowElement`, is shared with liveTurnFocusGraph.ts's `focusOwnBonsaiRow`.
 * Solves: Written once so it is not copied per registry — a second copy for the details-tabs row
 * is what pushed this repo's copy-pasted-lines count up by eleven on 2026-09-20.
 * Does not: Keep the rows themselves — each caller keeps its own `Map<string, HTMLElement>` and
 * only hands this function the map and the key to look up. The one thing registered here is a row's
 * own Steam nav node, by element (`registerRowNav`), so the shared last step can use Steam's transfer.
 *
 * Plan 97 (workshop:test-evidence/plan97-P97-L14-FREEZE.json): with the panel's page out of the
 * browser's focus, Up from a suggestion chip moved the page's focus onto the notes block by the plain
 * focus() below while Steam's ring stayed on the chip, every press. A row with its own nav node now takes
 * Steam's transfer first; a row without one is a plain hop that reports honestly (lostFocusHop.ts) and
 * says false when the ring did not follow, so the caller goes on or declines instead of claiming a dead press.
 */
import { elementHasFocus } from "./uiDocument";
import { noteLostFocusHop, panelLacksFocus, plainHop } from "./lostFocusHop";

type SteamNavHolder = { current: { TakeFocus?: (gamepad?: boolean) => unknown } | null | undefined };

/** A row's own Steam nav node, by the row's element: filled in by the row's ref, read by `focusRowElement`. */
const rowNavs = new WeakMap<HTMLElement, SteamNavHolder>();

/** Remember `holder` (the row's `navRef`) as the nav node of row `el`; a null element is ignored. */
export function registerRowNav(el: HTMLElement | null, holder: SteamNavHolder): void {
  if (el) rowNavs.set(el, holder);
}

/** Steam's transfer onto the row's own nav node; false when it has none or Steam refused. */
function takeRowNav(el: HTMLElement): boolean {
  const node = rowNavs.get(el)?.current;
  if (!node || typeof node.TakeFocus !== "function") return false;
  try {
    return node.TakeFocus(true) !== false;
  } catch {
    return false;
  }
}

/**
 * Focus a stop without scrolling, the shape every stop inside the answer has always used: give it
 * `tabindex="-1"` only when it has none (never overwrite Decky's), and fall back to a plain `focus()`.
 */
function focusNoScroll(el: HTMLElement): void {
  try {
    // focus-patterns-allow: only gives a stop with no tabindex one; moved here from the answer's three stop registries (plan 97).
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
  } catch {
    try {
      el.focus();
    } catch {
      /* a detached stop simply fails to claim focus; the check below says so */
    }
  }
}

/**
 * In: a stop inside the answer (a section, a hidden cover, an underlined word) and a short name for the
 *     log line.
 * Out: true only when focus landed. With the panel's page holding the browser's focus this is exactly the
 *     plain focus and check these stops always had: nothing changes. While the page lacks focus (plan 97,
 *     lostFocusHop.ts) a plain focus() leaves Steam's ring behind, so the stop's own nav node
 *     (`registerRowNav`) takes Steam's transfer first; a stop with no node is a plain hop that reports false
 *     unless the ring followed, and the walk goes on to its next choice or yields the press to Steam.
 */
export function focusStopHonestly(el: HTMLElement, hop: string): boolean {
  if (!panelLacksFocus()) {
    focusNoScroll(el);
    return elementHasFocus(el);
  }
  if (takeRowNav(el)) {
    noteLostFocusHop(hop, "transfer", el);
    focusNoScroll(el);
    return elementHasFocus(el);
  }
  return plainHop(el, hop, () => focusNoScroll(el)) && elementHasFocus(el);
}

/**
 * In: one per-turn registry (a plain `Map` from turn key to that turn's own row element) and the
 * turn key to look up.
 * Out: true only when Steam's ring actually landed on the row.
 *
 * The `tabindex` line ADDS focusability to a plain `div` that has none, which is the opposite of
 * the bug the focus-pattern checker's "tabindex-removal" rule is named for — it never touches a
 * row that already is a button, a link or a field, and it never takes focusability away. This row
 * is always a sibling of other reply-row controls inside the same turn container, so a plain
 * `.focus()` is the right tool here, not navFocusRegistry's `takeNavFocus` (AGENTS.md, "The Steam
 * Deck focus graph").
 */
export function focusPerTurnRow(registry: Map<string, HTMLElement>, turnKey: string): boolean {
  const el = registry.get(turnKey);
  if (!el) return false;
  return focusRowElement(el);
}

/**
 * In: one of bonsAI's own row elements, already found.
 * Out: true only when Steam's ring actually landed on it.
 *
 * The shared last step of `focusPerTurnRow` above and of `focusOwnBonsaiRow` in
 * liveTurnFocusGraph.ts: give a plain row `tabindex="-1"` if it has no focusability of its own,
 * focus it without scrolling, and report whether the ring really arrived. Each caller decides
 * first which element is safe to touch; this never looks further than the element it is given.
 */
export function focusRowElement(el: HTMLElement): boolean {
  if (!el.hasAttribute("tabindex") && !el.matches?.("button, a, input, select, textarea")) {
    el.setAttribute("tabindex", "-1");
  }
  const lost = panelLacksFocus();
  if (takeRowNav(el)) {
    if (lost) noteLostFocusHop("row", "transfer", el);
  } else {
    let threw = false;
    const landed = plainHop(el, "row", () => {
      try {
        el.focus({ preventScroll: true });
      } catch {
        threw = true;
      }
    });
    if (threw || !landed) return false;
    return elementHasFocus(el);
  }
  try {
    el.focus({ preventScroll: true });
  } catch {
    return false;
  }
  return elementHasFocus(el);
}
