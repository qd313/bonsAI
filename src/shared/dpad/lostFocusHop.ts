/**
 * Title: The plugin's own D-pad hops, while the panel's page has lost the browser's focus
 *
 * Purpose: One place for the hops the plugin makes itself from the question box, its strip, the question's
 * row and a Settings section line, so each one can tell whether Steam's ring followed it and write that to
 * the plugin log when the panel's page is on screen without the browser's focus.
 *
 * Used for: useMainTabAskBarFocus.ts (Down, Left and Right from the question box), AskStripSendButtons.tsx
 * (the strip's own hops), buildTurnHeaderElement.tsx (Down from the question onto Show reasoning) and
 * useSettingsTabFocus.ts (Down from a section line into its open section).
 *
 * Solves: Plan 97 block B (workshop:test-evidence/plan97-P97-B-FREEZE-2.json and
 * plan97-P97-B-AFTER-POPUP-FOCUS.json): after a Steam box or the menu closing, the panel's page sometimes
 * comes back without the browser's focus (the page reads that it has no focus; about one in three with a game up)
 * and nothing wins it back. In that state a plain `focus()` moves the page's own focus but sends no focus
 * event, so Steam's ring stays where it was, while the handler still told Steam the press was handled: the
 * press is dead. Every dead press in those readings was such a plain hop; every press that moved was
 * Steam's own or a transfer onto a registered node. Before this file nothing recorded the state, so a
 * freeze was only ever seen by someone watching.
 *
 * Does not: Win the browser's focus back (navFocusRegistry's `refocusPanelWindowIfLost` asks, and the
 * readings show the window often refuses). Does not search the page for a target: every caller hands in
 * its own element.
 *
 * How it works:
 * 1. `panelLacksFocus()` reads the state: the panel's own page on screen without the browser's focus.
 * 2. `plainHop(el, hop)` focuses `el` the way the caller always has. With the page's focus present it
 *    reports the hop landed, exactly as before. Without it, it reads whether Steam's ring is now on `el`
 *    and writes one line to the plugin log with the tag `LOST_FOCUS_HOP_LOG_TAG`.
 * 3. `noteLostFocusHop(hop, via, el)` writes the same line for a hop made another way (Steam's transfer),
 *    so a log read after a freeze shows every hop the plugin made while the page lacked focus.
 */
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS } from "../deckyCall";
import { uiWindowMissingFocus } from "./uiDocument";

/** The plugin log's tag for these lines: `[FE] dpad.lostFocusHop {...}` in the Deck's plugin log. */
export const LOST_FOCUS_HOP_LOG_TAG = "dpad.lostFocusHop";

/** How a hop was made: a plain `focus()`, or Steam's own transfer onto a registered node. */
type HopVia = "plain" | "transfer";

/** True while the panel's page is on screen without the browser's focus (uiDocument.ts, `uiWindowMissingFocus`). */
export function panelLacksFocus(): boolean {
  return uiWindowMissingFocus() !== null;
}

/**
 * Is Steam's ring on `el`, or inside it? Strict, unlike `elementHasGamepadFocus`: with no ring anywhere
 * the answer is no, because in the lost-focus state the page's own focus is exactly what cannot be trusted.
 */
function ringIsOn(el: HTMLElement | null | undefined): boolean {
  if (!el) return false;
  // Reading Steam's ring marker is the measurement itself, not a search for a target.
  // focus-patterns-allow: observing the gamepad ring, not searching for a target.
  const ring = el.ownerDocument?.querySelector<HTMLElement>(".gpfocus") ?? null;
  return Boolean(ring && (ring === el || el.contains(ring)));
}

/** A short name for the element the ring is on, for the log line: its label, or its tag. */
function ringName(el: HTMLElement | null | undefined): string {
  // focus-patterns-allow: observing the gamepad ring for the log line, not searching for a target.
  const ring = el?.ownerDocument?.querySelector<HTMLElement>(".gpfocus") ?? null;
  if (!ring) return "none";
  return (ring.getAttribute("aria-label") ?? ring.tagName.toLowerCase()).slice(0, 60);
}

/**
 * One line into the Deck's plugin log, only while the page lacks focus. Never throws: a log that fails
 * must not cost the press.
 */
export function noteLostFocusHop(hop: string, via: HopVia, el: HTMLElement | null | undefined): void {
  const followed = ringIsOn(el);
  void callDeckyWithTimeout<[string, Record<string, unknown>], unknown>(
    "dbg_fe_log",
    [LOST_FOCUS_HOP_LOG_TAG, { hop, via, followed, ring: ringName(el) }],
    DECKY_RPC_TIMEOUT_MS,
  ).catch(() => {});
}

/**
 * In: the element to hop to, a short name for the hop (for the log), and how to focus it (a caller's own
 *     focus that plans a scroll first, say); a plain `focus()` by default.
 * Out: true, as every caller has always reported a plain hop.
 * Can go wrong: while the page lacks focus the ring may not follow; the log line says so.
 */
export function plainHop(el: HTMLElement, hop: string, focus: () => void = () => el.focus()): boolean {
  const lost = panelLacksFocus();
  focus();
  if (lost) noteLostFocusHop(hop, "plain", el);
  return true;
}
