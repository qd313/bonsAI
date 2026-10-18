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
 * So after a shoulder switch the tab's first section line takes the ring (Steam's own transfer onto the line's nav
 * node) unless it is there already. Not only when the ring is on nothing: on 2026-10-12 (plan92-P92-FOLD-SWITCH)
 * Steam itself put the ring on the LAST line, inside the tab, twice. A ring Steam placed on arrival is not the
 * person's, so it is put on the first line at every look until the person presses something on a section line
 * (notePersonPress); from then on it is theirs and is never moved. The first line, not the tab bar: it is what Steam does
 * on every other tab (the ring lands in the content, not on the bar), it is always on screen with the page at its
 * top, and Down from it walks the tab. A bar press is not given this: the person is on the bar and stays there.
 *
 * Does not: Decide that a switch happened; the caller does. Does not touch a tab with no fold line (Main,
 * Settings until it is folded): their pane is left as Steam keeps it. Does not keep dragging the page: it tries
 * at once, after one frame and at 80 ms, because the tab may not be drawn yet or Steam may put its place back
 * a moment later, and then lets go so a person scrolling is never fought. The ring is looked at once more at
 * 250 ms.
 */
import { findTabContentsScroll } from "../../shared/dpad/chatPanelScroll";
import { getUiDocument } from "../../shared/dpad/uiDocument";
import { takeNavFocus } from "../../shared/dpad/navFocusRegistry";
import { takeFoldLine } from "./FoldedSection";
import { personPressCount } from "./foldedTabsStore";

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

/** Unless the ring is on the first section line already, the first section line takes it. */
function putRingOnFirstLine(tab: string): void {
  const body = foldedBody(tab);
  if (!body) return;
  const line = body.querySelector("[data-bonsai-fold-line]");
  if (!line || getUiDocument().querySelector(".gpfocus") === line) return;
  takeFoldLine(tab, line.getAttribute("data-bonsai-fold-line") ?? "");
}

/**
 * A switch made from the floating button leaves the ring on that button, which is hidden with its tab. Onto a tab
 * that is not folded (nothing here places the ring), the tab bar takes it, unless the ring is somewhere real.
 */
function putRingOnBarIfLost(): void {
  const holder = getUiDocument().querySelector(".gpfocus");
  if (holder && holder.isConnected && !holder.closest(".bonsai-fold-dock")) return;
  takeNavFocus("tab-bar");
}

/**
 * Put the folded tab's page at its top now and a moment later, and (`ring`, after a shoulder switch) the ring on
 * its first line; `barIfNotFolded` (the switch came from the floating button) sends the ring to the tab bar
 * instead when the tab is not folded. Returns the call that cancels the later looks.
 */
export function scheduleFoldedTabArrival(
  tab: string,
  opts: { ring?: boolean; barIfNotFolded?: boolean } = {},
): () => void {
  const pressesAtSwitch = personPressCount();
  const look = (ms: number) => {
    if (ms <= LAST_PAGE_LOOK_MS) putPageAtTop(tab);
    if (!opts.ring || personPressCount() !== pressesAtSwitch) return;
    if (foldedBody(tab)) putRingOnFirstLine(tab);
    else if (opts.barIfNotFolded && ms === LATER_LOOKS_MS[LATER_LOOKS_MS.length - 1]) putRingOnBarIfLost();
  };
  look(0);
  const timers = LATER_LOOKS_MS.map((ms) => setTimeout(() => look(ms), ms));
  return () => timers.forEach((t) => clearTimeout(t));
}
