/**
 * Title: The Strategy checklist's steps as places Steam can send the ring
 *
 * Purpose: One nav node per checklist step, so the answer's Down chain and the rating row's Up chain can
 * put Steam's ring on the first or the last step through Steam's own transfer, not a plain focus().
 *
 * Used for: StrategyChecklistPanel.tsx (each step's wrapper hands its holder to Steam as `navRef`) and
 * liveTurnFocusGraph.ts (`focusStrategyChecklistToggle` takes a step through it first).
 *
 * Solves: Plan 96 block D (workshop:test-evidence/plan96-P96-F4-TICK.json): once the steps became buttons,
 * the chain's plain focus() onto the first one moved the page's focus while Steam's ring stayed on the
 * answer, so no step could ever be reached or ticked with the controller. Same cure as the strategy
 * choice buttons and the About links: a transfer onto the step's own node.
 *
 * Does not: Draw the steps or tick them; it holds the nodes and moves the ring.
 */
import { refocusPanelWindowIfLost, type NavRefHolder } from "./navFocusRegistry";

const holders: NavRefHolder[] = [];
let drawnSteps = 0;

/** The holder a step hands Steam as its `navRef`; made on first ask and kept, so re-renders reuse it. */
export function strategyChecklistStepNav(index: number): NavRefHolder {
  while (holders.length <= index) holders.push({ current: null });
  return holders[index];
}

/** How many steps the panel drew last; "last" below means this one. Zero when no checklist is drawn. */
export function setStrategyChecklistStepCount(count: number): void {
  drawnSteps = Math.max(0, count);
}

/** Steam's transfer onto the first or the last drawn step. False when none is drawn or Steam declined. */
export function takeStrategyChecklistStep(which: "first" | "last"): boolean {
  if (drawnSteps <= 0) return false;
  const node = holders[which === "first" ? 0 : drawnSteps - 1]?.current;
  if (!node || typeof node.TakeFocus !== "function") return false;
  refocusPanelWindowIfLost();
  try {
    return node.TakeFocus(true) !== false;
  } catch {
    return false;
  }
}

/** For tests: forget the drawn count and empty every holder. */
export function resetStrategyChecklistNavForTests(): void {
  drawnSteps = 0;
  holders.forEach((h) => {
    h.current = null;
  });
}
