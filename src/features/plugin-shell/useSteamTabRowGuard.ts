/**
 * Title: Keeping Steam's own tab row hidden, and saying so when it was not
 *
 * Purpose: The plugin still mounts Steam's tab row (LB badge, the tab icons, RB badge) inside its
 * box, because Steam reads the shoulder buttons through it, and hides it with one style rule
 * (section-1.ts, the "Plan 30 (D44)" block). With a game running, after a pop-up or a touch, a big
 * second strip has been seen over the top of the chat three times in six weeks; the scoping note
 * (docs/audit/plan96-scope-ghost-tab-bar.md) reads it as that row showing because the rule stopped
 * hiding it, for one of three reasons it lists. This guard checks the row on every change to the
 * page around it and on every touch and focus move; when the row is not `display: none` it sets
 * that inline and writes one line to the plugin log carrying the page read the note needs to tell
 * the three reasons apart.
 *
 * Used for: plan 97 lane L15. Drawn as `SteamTabRowGuard` next to `HiddenTabHeaderTrap` in
 * index.tsx, inside the same keyed group, so it comes and goes with the tabs root.
 *
 * Narrow on purpose: it acts only on a direct child of Steam's tab panel (the element that holds
 * the tab body) that holds one of the plugin's own title icons and does not hold the body. It never
 * climbs past that panel, never treats the tabs root itself as the panel, and does nothing while
 * the body is missing (Steam mid-rebuild). `display: none` is the measured-safe state: Steam keeps
 * handling LB/RB with the row hidden that way (TAB-BAR-W1a, with and without a game).
 *
 * Does not: change the style rule (plan 97 consult 2 keeps that out until this log names the
 * failing condition), move the ring, or touch anything outside the tabs root. Nothing here calls
 * `focus()`.
 *
 * The log line's tag is `tabBar.steamRowShown`. Its fields: `why` (what set the check off),
 * `display` (the row's computed display before the fix), `ruleMatches` (whether the section-1 rule
 * matches the row), `imgBadges` / `textBadges` (bumper badges drawn as labelled images or as text),
 * `rows` (how many such rows the panel has), `expectedBox` (the panel is the tabs root's direct
 * `.Panel.Focusable` child, the path the rule is written for), `position`, `h` (the row's drawn
 * height), `plugBoxes` (how many plugin boxes are on the page) and `n` (this mount's count).
 * Candidate 1 reads ruleMatches false; candidate 2 expectedBox false or plugBoxes above 1;
 * candidate 3 ruleMatches true with display not none.
 */
import { useEffect } from "react";

import { callDeckyWithTimeout } from "../../shared/deckyCall";
import { getUiDocument } from "../../shared/dpad/uiDocument";

/** The section-1 hiding rule's selector, word for word (a test checks the stylesheet still has it). */
export const STEAM_TAB_ROW_HIDE_SELECTOR =
  '.bonsai-scope .bonsai-decky-tabs-root > .Panel.Focusable > div:has(.bonsai-tab-title-leaf):has(img[aria-label]):not(:has([class*="TabContentsScroll"]))';

export const STEAM_TAB_ROW_LOG_TAG = "tabBar.steamRowShown";

const LEAF = ".bonsai-tab-title-leaf";
const BODY = '[class*="TabContentsScroll"]';
/** A mount writes at most this many lines, so a row Steam keeps rebuilding cannot flood the log. */
const MAX_LOG_LINES = 10;
const BADGE_TEXT = /^(L1|R1|LB|RB)$/;

function safeMatches(el: Element, selector: string): boolean | null {
  try {
    return el.matches(selector);
  } catch {
    return null;
  }
}

/** Steam's tab panel and its rows that hold our title icons, or null when it is not safe to act. */
function findSteamTabRows(root: Element): { panel: Element; rows: Element[] } | null {
  const body = root.querySelector(BODY);
  if (!body) return null;
  let panel: Element | null = body.parentElement;
  while (panel && panel !== root && !panel.querySelector(LEAF)) panel = panel.parentElement;
  if (!panel || panel === root || !root.contains(panel)) return null;
  const rows = Array.from(panel.children).filter((c) => !!c.querySelector(LEAF) && !c.querySelector(BODY));
  return { panel, rows };
}

/**
 * One check. Hides every row that is not `display: none` and returns the fields logged for the first
 * one; returns null when nothing had to be done.
 */
function enforceSteamTabRowHidden(doc: Document, why: string): Record<string, unknown> | null {
  const root = doc.querySelector(".bonsai-decky-tabs-root");
  if (!root) return null;
  const found = findSteamTabRows(root);
  if (!found) return null;
  const view = doc.defaultView;
  let read: Record<string, unknown> | null = null;
  for (const row of found.rows) {
    const style = view ? view.getComputedStyle(row) : null;
    const display = style?.display ?? "";
    if (display === "none") continue;
    if (!read) {
      const textBadges = Array.from(row.querySelectorAll("*")).filter(
        (e) => e.children.length === 0 && BADGE_TEXT.test((e.textContent ?? "").trim())
      ).length;
      read = {
        why,
        display,
        ruleMatches: safeMatches(row, STEAM_TAB_ROW_HIDE_SELECTOR),
        imgBadges: row.querySelectorAll("img[aria-label]").length,
        textBadges,
        rows: found.rows.length,
        expectedBox: found.panel.parentElement === root && found.panel.matches(".Panel.Focusable"),
        position: style?.position ?? "",
        h: Math.round(row.getBoundingClientRect().height),
        plugBoxes: doc.querySelectorAll(".bonsai-scope").length,
      };
    }
    (row as HTMLElement).style.setProperty("display", "none", "important");
  }
  return read;
}

function useSteamTabRowGuard(): void {
  useEffect(() => {
    const doc = getUiDocument();
    const root = doc.querySelector(".bonsai-decky-tabs-root");
    if (!root) return;
    let lines = 0;
    const check = (why: string) => {
      const read = enforceSteamTabRowHidden(doc, why);
      if (!read || lines >= MAX_LOG_LINES) return;
      lines += 1;
      callDeckyWithTimeout("dbg_fe_log", [STEAM_TAB_ROW_LOG_TAG, { ...read, n: lines }]).catch(() => {});
    };
    check("mount");

    // Changes inside the tab body (a streaming answer, the ring moving) cannot bring the row back,
    // and checking on each would cost a style read per frame, so only changes outside it count.
    const observer =
      typeof MutationObserver === "undefined"
        ? null
        : new MutationObserver((records) => {
            const body = root.querySelector(BODY);
            if (records.some((r) => !body || !body.contains(r.target))) check("page");
          });
    observer?.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });
    const onTouch = () => check("touch");
    const onFocus = () => check("focus");
    const onPress = () => check("press");
    doc.addEventListener("pointerdown", onTouch, true);
    doc.addEventListener("touchstart", onTouch, true);
    doc.addEventListener("focusin", onFocus, true);
    doc.addEventListener("vgp_onbuttondown", onPress, true);
    return () => {
      observer?.disconnect();
      doc.removeEventListener("pointerdown", onTouch, true);
      doc.removeEventListener("touchstart", onTouch, true);
      doc.removeEventListener("focusin", onFocus, true);
      doc.removeEventListener("vgp_onbuttondown", onPress, true);
    };
  }, []);
}

/** The guard as a component that draws nothing, for index.tsx to place beside the tabs root. */
export function SteamTabRowGuard(): null {
  useSteamTabRowGuard();
  return null;
}
