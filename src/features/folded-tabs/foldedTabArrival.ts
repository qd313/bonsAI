/**
 * Title: Arriving on a folded tab after a real tab switch
 *
 * Purpose: Once a person has switched to a folded tab (the bar, LB or RB, Y), put the page at its top so the
 * whole tab, and its first section line, is in view.
 *
 * Used for: useBonsaiPluginShell, which alone knows a switch from a popup closing and the tab being rebuilt.
 *
 * Solves: Steam keeps the pane that holds a tab where it was. Measured on the Deck's own screen 2026-10-12
 * (plan92-P92-FOLD-KEEPS-PLACE): the Ollama tab scrolled 408 px down, LB then RB, came back 330 px down with its
 * first line off screen. With every section closed on arrival (foldedTabsStore.closeAllFoldedSections) the tab
 * is short, and it should be seen from its top.
 *
 * Does not: Decide that a switch happened; the caller does. Does not touch a tab with no fold line (Main,
 * Settings until it is folded): their pane is left as Steam keeps it. Does not keep dragging the page: it tries
 * at once, after one frame and at 80 ms, because the tab may not be drawn yet or Steam may put its place back
 * a moment later, and then lets go so a person scrolling is never fought.
 */
import { findTabContentsScroll } from "../../utils/chatPanelScroll";
import { getUiDocument } from "../../utils/uiDocument";

/** When to look again after the switch: about one frame, then 80 ms. The first look is immediate. */
const LATER_LOOKS_MS = [16, 80];

/** The folded tab's body in the plugin's page, or null while it is not drawn (or is not a folded tab). */
function foldedBody(tab: string): HTMLElement | null {
  const body = getUiDocument().querySelector<HTMLElement>(`[data-bonsai-tab-body="${tab}"]`);
  return body && body.querySelector("[data-bonsai-fold-line]") ? body : null;
}

function putPageAtTop(tab: string): void {
  const body = foldedBody(tab);
  if (!body) return;
  const pane = findTabContentsScroll(body);
  if (pane && pane.scrollTop > 0) pane.scrollTop = 0;
}

/** Put the folded tab's page at its top now and a moment later; returns the call that cancels the later looks. */
export function scheduleFoldedTabArrival(tab: string): () => void {
  putPageAtTop(tab);
  const timers = LATER_LOOKS_MS.map((ms) => setTimeout(() => putPageAtTop(tab), ms));
  return () => timers.forEach((t) => clearTimeout(t));
}
