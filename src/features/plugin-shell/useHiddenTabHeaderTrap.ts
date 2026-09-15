/**
 * Title: Catching the ring when it lands on an invisible tab button
 *
 * Purpose: When Steam's own highlight ring lands on one of the tab bar's
 * hidden header buttons — buttons that still exist on the page but are not
 * shown — this hands the ring straight to the collapsed tab bar instead,
 * so the invisible button is never where the ring comes to rest.
 *
 * Used for: The collapsing tab bar (plan 30, week 4).
 *
 * Solves: Steam's own tab-header component keeps its buttons reachable by
 * the ring even while they are hidden from view — measured on the Deck on
 * 2026-09-02, under both ways of hiding them (see the two
 * runs/TAB-BAR-W1c-*.json recordings): pressing Down twice from a fresh
 * open landed the ring on the invisible Main tab button, and so did
 * pressing Up from the top of a tab. No setting on the component removes
 * them from being reachable. The already-known ways this can happen (Down
 * from the bar, Up from the top of a tab body, B routed through the cancel
 * handler) are each handled directly at their own spot; this file exists
 * to catch every way we do not already know about — a missed focus return
 * after a popup closes, or some future change on Steam's side.
 *
 * Two more ways were found on the Deck on 2026-09-03, both landing on a
 * hidden button without the one kind of change the earlier version of this
 * watcher looked for (see runs/CLEAR-CACHE-01-b-after-modal-back-to-main.json
 * and runs/CLEAR-CACHE-01-c-close-panel-for-remount.json):
 * - Closing the *Clear cache* confirmation rebuilds the whole plugin from
 *   scratch (see the onBeforeDeckyModal comment in index.tsx). The freshly
 *   built header can arrive already holding the ring, before this file's
 *   own watcher has even attached.
 * - The tab bar and its container share one identity that only changes
 *   when Settings' Apply changes the UI scale (verified by reading
 *   index.tsx around line 1537, not measured directly on device), so
 *   closing and reopening the Quick Access Menu does not rebuild either
 *   one, and this file's watcher stays attached the whole time. The
 *   leading idea, not yet confirmed on device, is that Steam's own
 *   tab-header component still rebuilds its buttons on a visibility
 *   change: a button born already holding the ring shows up to the
 *   watcher as "a new node appeared," never as "a property changed" — the
 *   only kind the older version looked for.
 * Fixed by checking, the instant this file's watcher turns on, whether
 * something already holds the ring, and by watching for new nodes
 * appearing as well as for class changes on nodes already there — this
 * covers the idea above and any other way a hidden button could arrive
 * already holding the ring, without needing that idea to be the confirmed
 * explanation.
 *
 * Does not: Decide where the ring should go. It only sends a landing on an
 * invisible button back to the bar, and only once the bar has registered
 * itself as ready to receive it. Nothing in this file calls the browser's
 * own `focus()` directly.
 *
 * A second bug, found on device 2026-09-04 (see
 * runs/TAB-BAR-11-a-after-suspend-resume-hidden-button.json): after the
 * Deck slept and woke back up, rebuilding the plugin, pressing Right moved
 * the ring from one hidden button to another and this file did not catch
 * it — even though checking the page directly at that moment showed every
 * condition it looks for was true. The cause was how the watcher checked
 * whether something was a real page element: it used a check,
 * `instanceof Element`, that only works for an element built in the same
 * realm (the same running copy of the page's scripting engine) as the
 * check itself. Every element this watcher is ever handed is built in the
 * Quick Access popup's own realm, while this file runs in a different one
 * — so that check was false for every single element it was ever handed,
 * and the watcher had quietly been doing nothing since it was written.
 * The passes recorded earlier came entirely from the already-known hops
 * (the bar's Down, each tab's Up, the cancel handler), never from this
 * file. Fixed by checking the shape of the thing instead of what built
 * it: whether it has the one property and the two methods this file
 * actually uses.
 */
import { useEffect } from "react";

import { bonsaiDebugLog } from "../../utils/bonsaiDebugIngest";
import { takeNavFocus } from "../../utils/navFocusRegistry";
import { getUiDocument } from "../../utils/uiDocument";

/**
 * Stands in for `instanceof Element`, which is false for a node from a different realm than this
 * module's own (see the header comment above). Checks the exact shape this file reads — an element
 * node with `classList` and `querySelector` — rather than a constructor identity that a cross-realm
 * node can never satisfy. Exported because `TabIndicatorBar.tsx`'s own `pointerdown` listener reads
 * `evt.target` from the same UI document and had the identical `instanceof Node` bug.
 */
export function isElementLike(value: unknown): value is Element {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { nodeType?: unknown; classList?: unknown; querySelector?: unknown };
  return (
    candidate.nodeType === 1 &&
    typeof candidate.querySelector === "function" &&
    !!candidate.classList &&
    typeof (candidate.classList as { contains?: unknown }).contains === "function"
  );
}

/**
 * Steam's tab button is the only element that can carry `gpfocus` AND contain one of our title
 * leaves: the leaf is what the plugin hands `Tabs` as each tab's title (tabTitles.tsx).
 */
function isHiddenTabButton(el: Element): boolean {
  return el.classList.contains("gpfocus") && !!el.querySelector(".bonsai-tab-title-leaf");
}

/** `el` itself, or whichever descendant currently holds the ring, if either is a hidden tab button. */
function findHiddenTabButton(el: Element): Element | null {
  if (isHiddenTabButton(el)) return el;
  const nested = el.querySelector(".gpfocus");
  return nested && isElementLike(nested) && isHiddenTabButton(nested) ? nested : null;
}

export function useHiddenTabHeaderTrap(onBounce?: (bounced: boolean) => void): void {
  useEffect(() => {
    if (typeof MutationObserver === "undefined") return;
    const doc = getUiDocument();
    const root = doc.querySelector(".bonsai-decky-tabs-root");
    if (!root) return;

    const bounce = () => {
      const bounced = takeNavFocus("tab-bar");
      bonsaiDebugLog("tabBar:trap", "ring on hidden tab button", "H3", { bounced });
      onBounce?.(bounced);
    };

    /*
      A landing that happens before this effect attaches leaves no mutation for the observer below
      to see: a node born already carrying `gpfocus` never fires an `attributes` record for it. Check
      what is already true the instant the trap turns on, not only what changes afterward.
    */
    if (findHiddenTabButton(root)) bounce();

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "childList") {
          for (const node of record.addedNodes) {
            if (isElementLike(node) && findHiddenTabButton(node)) {
              bounce();
              return;
            }
          }
          continue;
        }
        const target = record.target;
        if (isElementLike(target) && isHiddenTabButton(target)) {
          bounce();
          return;
        }
      }
    });
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class"],
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, [onBounce]);
}
