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
 * readings show the window often refuses), and does not re-take a node before a plain hop: the readings
 * show a re-take does not rescue the next plain hop. Does not search the page for a target: every caller
 * hands in its own element.
 *
 * How it works:
 * 1. `panelLacksFocus()` reads the state: the panel's own page on screen without the browser's focus.
 * 2. `transferHop(id, hop)` is the first choice wherever the target has a registered nav node: Steam's
 *    own transfer, the one plugin-made move the Deck showed working with the page's focus gone.
 * 3. `plainHop(el, hop)` focuses `el` the way the caller always has. With the page's focus present it
 *    reports the hop landed, exactly as before. Without it, it reads whether Steam's ring is now on `el`
 *    and writes one line to the plugin log with the tag `LOST_FOCUS_HOP_LOG_TAG`. When the ring did not
 *    follow it puts the page's own focus back where it was and DECLINES the press (returns false), so the
 *    caller's handler returns false and Steam makes the move itself, which keeps the ring and the page's
 *    focus together. A caller with a fallback chain must not swallow that false (`|| true`).
 * 4. `noteLostFocusHop(hop, via, el)` writes the same line for a hop made another way, so a log read after
 *    a freeze shows every hop the plugin made while the page lacked focus.
 */
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS } from "../deckyCall";
import { takeNavFocus, type NavFocusId } from "./navFocusRegistry";
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
 * In: the registered nav node to hand the ring to, a short name for the hop, and the element it should land
 *     on (for the log line only).
 * Out: true when Steam took the transfer; false when the node is not registered or Steam refused, and the
 *     caller goes on to its next option.
 */
export function transferHop(id: NavFocusId, hop: string, landsOn?: () => HTMLElement | null): boolean {
  const lost = panelLacksFocus();
  if (!takeNavFocus(id)) return false;
  if (lost) noteLostFocusHop(hop, "transfer", landsOn?.() ?? null);
  return true;
}

/**
 * In: the element to hop to, a short name for the hop (for the log), and how to focus it (a caller's own
 *     focus that plans a scroll first, say); a plain `focus()` by default.
 * Out: true when the hop landed (always, while the page has its focus, as before); false when the page
 *     lacks focus and Steam's ring did not follow, so the press is declined and Steam moves on its own.
 * Can go wrong: a caller that turns the false into true makes the press dead again.
 */
export function plainHop(el: HTMLElement, hop: string, focus: () => void = () => el.focus()): boolean {
  const lost = panelLacksFocus();
  // focus-patterns-allow: remembering the page's own focus to put it back on a declined hop, not finding a target.
  const before = lost ? ((el.ownerDocument?.activeElement as HTMLElement | null) ?? null) : null;
  focus();
  if (!lost) return true;
  noteLostFocusHop(hop, "plain", el);
  if (ringIsOn(el)) return true;
  /* Declined: the page's focus goes back beside the ring, and Steam's own move carries both together. */
  if (before && before !== el && typeof before.focus === "function") {
    try {
      before.focus({ preventScroll: true });
    } catch {
      /* nothing to undo: Steam's own move sets the page's focus anyway */
    }
  }
  return false;
}
