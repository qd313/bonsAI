/**
 * Title: The Show details chips inside a scrolling pane, in the Deck's numbers
 *
 * Purpose: Test helper for the chip-grid walk tests (plan 87 F3). Gives a rendered ContextChipLadder the
 *          layout the Deck draws: the chips wrapped in drawn order (their CSS `order`) into rows of the
 *          measured width, 24.4 px tall and 6 px apart; the open chip's details box under the whole grid at
 *          the height measured for that chip; the held block after it; and a pane whose scroll height follows
 *          all of that, so the browser's clamp of a too-far scroll happens here as it does on the Deck.
 *          After every press, Steam's own glide to the chip that took focus runs (deckAnswerWalk.ts's three
 *          rules) and then the plugin's lift off the dock, as on the Deck.
 * Used for: ContextChipLadder.gridWalk.test.tsx and the other chip-ladder tests that need positions.
 * Does not: Render anything (the test renders the ladder into `host`), or know Steam's real scroll rule; it
 *           models the same three rules the answer walks run under. A smooth scroll request lands at once,
 *           and is counted in `smoothScrolls`.
 *
 * Numbers by default are the monitor run of 2026-10-09 (docs/test-evidence/plan87-M3-CHIPS.json): page 766
 * tall, the dock's suggestion row at 658.4, the ladder's content 108.9 px above the pane's end.
 */
import { liftForFocus } from "../hooks/useDockClearanceOnFocus";
import { steamGlide, steamScrollIntoView, type SteamScrollRule } from "./deckAnswerWalk";

/** The caption ("Chip N of M", 14.8 tall) and its 6 px margin above the grid. */
const CAPTION_PX = 20.8;
/** The gap between chips across and down, and between the grid and the details box. */
const CHIP_GAP = 6;
const GRID_TO_BOX = 8;

export interface ChipLadderPaneOptions {
  paneTop?: number;
  paneBottom?: number;
  dockTop?: number;
  /** The ladder's top in the pane's content (its screen y with the pane scrolled to 0). */
  ladderDocTop: number;
  /** Content after the ladder, to the end of the pane's content (the dock among it). */
  below?: number;
  scrollTop?: number;
  /** The grid's width: the chips wrap at this. */
  rowWidth?: number;
  chipHeight?: number;
  /** Each chip's measured width, by its label. */
  chipWidths: Record<string, number>;
  /** The details box's height, by the open chip's label. */
  boxHeights: Record<string, number>;
  rule?: SteamScrollRule;
  steamTopMargin?: boolean;
  /** The plugin's lift off the dock after every landing (on unless false). */
  dockLift?: boolean;
  /** Added to the open box's height while set: a box that measures taller than it settles at. */
  boxExtra?: { px: number };
}

export type ScreenBox = { top: number; bottom: number; left: number; right: number };

export function deckChipLadderPane(o: ChipLadderPaneOptions) {
  const paneTop = o.paneTop ?? 88;
  const paneBottom = o.paneBottom ?? 766;
  const dockTop = o.dockTop ?? 658.4;
  const below = o.below ?? 108.9;
  const rowWidth = o.rowWidth ?? 288;
  const chipH = o.chipHeight ?? 24.4;
  const clientHeight = paneBottom - paneTop;

  const pane = document.createElement("div");
  pane.className = "_TabContentsScroll";
  document.body.appendChild(pane);
  const host = document.createElement("div");
  pane.appendChild(host);
  const dock = document.createElement("div");
  dock.className = "bonsai-main-tab-dock";
  pane.appendChild(dock);

  let ladder: HTMLElement | null = null;
  const part = (selector: string) => ladder?.querySelector<HTMLElement>(selector) ?? null;
  const chips = () => [...(part(".bonsai-chip-ladder-grid")?.children ?? [])] as HTMLElement[];
  const openLabel = () => part(".bonsai-chip-ladder-chip--active")?.textContent ?? "";
  const heldPx = () => parseFloat(part(".bonsai-chip-ladder-hold")?.style.height || "0") || 0;
  const boxPx = () => (o.boxHeights[openLabel()] ?? 0) + (o.boxExtra?.px ?? 0);

  /* The browser's wrapping: chips in drawn order, a new row when the next one does not fit. */
  const layout = () => {
    const drawn = chips()
      .map((el, i) => ({ el, order: el.style.order === "" ? i : Number(el.style.order) }))
      .sort((a, b) => a.order - b.order);
    const at = new Map<HTMLElement, { x: number; row: number; w: number }>();
    let row = 0;
    let x = 0;
    drawn.forEach(({ el }, n) => {
      const w = Math.min(o.chipWidths[el.textContent ?? ""] ?? 80, rowWidth);
      if (n > 0 && x + CHIP_GAP + w > rowWidth + 0.5) {
        row += 1;
        x = 0;
      } else if (n > 0) x += CHIP_GAP;
      at.set(el, { x, row, w });
      x += w;
    });
    const rows = drawn.length ? row + 1 : 0;
    const gridTop = o.ladderDocTop + CAPTION_PX;
    const gridH = rows * chipH + Math.max(0, rows - 1) * CHIP_GAP;
    const boxTop = gridTop + gridH + GRID_TO_BOX;
    const holdTop = boxTop + boxPx();
    return { at, gridTop, gridH, boxTop, holdTop, end: holdTop + heldPx() };
  };

  let top = o.scrollTop ?? 0;
  const max = () => Math.max(0, layout().end + below - clientHeight);
  Object.defineProperty(pane, "clientHeight", { configurable: true, value: clientHeight });
  Object.defineProperty(pane, "scrollHeight", {
    configurable: true,
    get: () => {
      top = Math.min(top, max());
      return layout().end + below;
    },
  });
  Object.defineProperty(pane, "scrollTop", {
    configurable: true,
    get: () => {
      top = Math.min(top, max());
      return top;
    },
    set: (v: number) => {
      top = Math.max(0, Math.min(v, max()));
    },
  });
  const smoothScrolls: number[] = [];
  (pane as unknown as { scrollTo: (arg: ScrollToOptions) => void }).scrollTo = (arg: ScrollToOptions) => {
    if (arg.behavior === "smooth") smoothScrolls.push(arg.top ?? 0);
    pane.scrollTop = arg.top ?? pane.scrollTop;
  };

  const rect = (t: number, b: number, l = 0, r = rowWidth) =>
    ({ top: t, bottom: b, left: l, right: r, width: r - l, height: b - t, x: l, y: t, toJSON: () => ({}) }) as DOMRect;
  const screen = (docY: number) => paneTop + docY - pane.scrollTop;
  pane.getBoundingClientRect = () => rect(paneTop, paneBottom);
  dock.getBoundingClientRect = () => rect(dockTop, paneBottom);

  /** Put the Deck's layout on the rendered ladder's parts (call again after anything re-renders them). */
  const install = (root: HTMLElement) => {
    ladder = root;
    root.getBoundingClientRect = () => {
      const l = layout();
      return rect(screen(o.ladderDocTop), screen(l.end));
    };
    const grid = part(".bonsai-chip-ladder-grid");
    if (grid) {
      grid.getBoundingClientRect = () => {
        const l = layout();
        return rect(screen(l.gridTop), screen(l.gridTop + l.gridH));
      };
    }
    for (const chip of chips()) {
      chip.getBoundingClientRect = () => {
        const l = layout();
        const p = l.at.get(chip);
        if (!p) return rect(0, 0, 0, 0);
        const t = screen(l.gridTop + p.row * (chipH + CHIP_GAP));
        return rect(t, t + chipH, p.x, p.x + p.w);
      };
      chip.scrollIntoView = steamScrollIntoView(pane, chip, paneBottom);
    }
    const body = part(".bonsai-chip-body");
    if (body) {
      body.getBoundingClientRect = () => {
        const l = layout();
        return rect(screen(l.boxTop), screen(l.holdTop));
      };
    }
  };

  /* Steam's glide to the stop that took focus, then the plugin's lift, once the press is over. */
  let landed: HTMLElement | null = null;
  pane.addEventListener("focusin", (event) => {
    landed = event.target as HTMLElement;
  });
  const settle = () => {
    const el = landed;
    landed = null;
    if (!el || !ladder?.contains(el)) return;
    steamGlide(el, pane, o.rule, { paneTop, dockTop, steamTopMargin: o.steamTopMargin });
    if (o.dockLift ?? true) liftForFocus(el);
  };

  const box = (el: Element | null): ScreenBox => {
    const r = el?.getBoundingClientRect();
    return r ? { top: r.top, bottom: r.bottom, left: r.left, right: r.right } : { top: 0, bottom: 0, left: 0, right: 0 };
  };
  return {
    pane,
    host,
    install,
    settle,
    openLabel,
    smoothScrolls,
    paneTop,
    dockTop,
    /** Where the chip with this label is on screen. */
    chipBox: (label: string) => box(chips().find((c) => c.textContent === label) ?? null),
    /** The open chip's details box on screen. */
    detailsBox: () => box(part(".bonsai-chip-body")),
    /** The top edge of the grid's first row. */
    rowTop: () => box(part(".bonsai-chip-ladder-grid")).top,
    /** How many rows the chips wrapped into. */
    rowCount: () => new Set([...layout().at.values()].map((p) => p.row)).size,
  };
}
export type ChipLadderPane = ReturnType<typeof deckChipLadderPane>;
