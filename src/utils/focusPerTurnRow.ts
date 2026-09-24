/**
 * Title: Focus a row from its own per-turn registry
 * Purpose: The one move shared by every per-turn row registry in the chat transcript (the "From
 * the notes" block, the details tabs row, the chip ladder) — given the map that registry keeps
 * from a turn key to that turn's own row element, put Steam's ring on it.
 * Used for: MainTabChatTranscript.tsx and buildKbNotesBlockElement.tsx's own per-turn registries;
 * its last step, `focusRowElement`, is shared with liveTurnFocusGraph.ts's `focusOwnBonsaiRow`.
 * Solves: Written once so it is not copied per registry — a second copy for the details-tabs row
 * is what pushed this repo's copy-pasted-lines count up by eleven on 2026-09-20.
 * Does not: Register anything itself — each caller keeps its own `Map<string, HTMLElement>` and
 * only hands this function the map and the key to look up.
 */
import { elementHasFocus } from "./uiDocument";

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
  try {
    el.focus({ preventScroll: true });
  } catch {
    return false;
  }
  return elementHasFocus(el);
}
