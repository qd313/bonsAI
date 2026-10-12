/**
 * Title: Arriving on a folded tab after a real tab switch
 *
 * Purpose: Once a person has switched to a folded tab (the bar, LB or RB, Y), put the page at its top so the
 * whole tab, and its first section line, is in view; and, when Steam's own shoulder switch brought them in, make
 * sure the ring is on something that exists: the first section line.
 *
 * Used for: useBonsaiPluginShell, which alone knows a switch from a popup closing and the tab being rebuilt.
 *
 * Solves: Steam keeps the pane that holds a tab where it was. Measured on the Deck's own screen 2026-10-12
 * (plan92-P92-FOLD-KEEPS-PLACE): the Ollama tab scrolled 408 px down, LB then RB, came back 330 px down with its
 * first line off screen. With every section closed on arrival (foldedTabsStore.closeAllFoldedSections) the tab
 * is short, and it should be seen from its top.
 *
 * The ring: Steam brings the ring back to the control it was last on in that tab. Every section is closed on
 * arrival, so that control is gone, and the ring could be left on nothing or on the tab it came from. On the
 * Deck the ring came back to a "Terse mode" toggle deep in Reply style, and went to "Retry same prompt" on Main.
 * So after a shoulder switch, if the ring is not on anything inside the tab's body, the tab's first section line
 * takes it (Steam's own transfer onto the line's nav node). The first line, not the tab bar: it is what Steam does
 * on every other tab (the ring lands in the content, not on the bar), it is always on screen with the page at its
 * top, and Down from it walks the tab. A bar press is not given this: the person is on the bar and stays there.
 *
 * Does not: Decide that a switch happened; the caller does. Does not touch a tab with no fold line (Main,
 * Settings until it is folded): their pane is left as Steam keeps it. Does not keep dragging the page: it tries
 * at once, after one frame and at 80 ms, because the tab may not be drawn yet or Steam may put its place back
 * a moment later, and then lets go so a person scrolling is never fought. The ring is looked at once more at
 * 250 ms, and only moved while it is on nothing inside the tab, so a person who has already moved is never pulled.
 */
import { findTabContentsScroll } from "../../utils/chatPanelScroll";
import { getUiDocument } from "../../utils/uiDocument";
import { takeFoldLine } from "./FoldedSection";

/** When to look again after the switch: about one frame, then 80 ms (page and ring), then 250 ms (ring only). The first look is immediate. */
const LATER_LOOKS_MS = [16, 80, 250];
/** The last look that still moves the page. */
const LAST_PAGE_LOOK_MS = 80;

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

/** If the ring is on nothing inside the tab's body (lost, or left on the tab it came from), the first section line takes it. */
function keepRingInTab(tab: string): void {
  const body = foldedBody(tab);
  if (!body) return;
  const holder = getUiDocument().querySelector(".gpfocus");
  if (holder && body.contains(holder)) return;
  const first = body.querySelector("[data-bonsai-fold-line]")?.getAttribute("data-bonsai-fold-line");
  if (first) takeFoldLine(tab, first);
}

/**
 * Put the folded tab's page at its top now and a moment later, and (`ring`, after Steam's shoulder switch) see
 * that the ring is inside it; returns the call that cancels the later looks.
 */
export function scheduleFoldedTabArrival(tab: string, opts: { ring?: boolean } = {}): () => void {
  const look = (ms: number) => {
    if (ms <= LAST_PAGE_LOOK_MS) putPageAtTop(tab);
    if (opts.ring) keepRingInTab(tab);
  };
  look(0);
  const timers = LATER_LOOKS_MS.map((ms) => setTimeout(() => look(ms), ms));
  return () => timers.forEach((t) => clearTimeout(t));
}
