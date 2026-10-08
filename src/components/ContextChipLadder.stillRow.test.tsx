/**
 * Title: Walking Show details' chips leaves the answer where it is
 * Purpose: Pin the fixes for the maintainer's report of 2026-10-08 (screen recording of an answer
 *          with seven chips under "This answer"): (1) the answer kept scrolling about a second
 *          after the ring had left the chips for the question box; (2) the chip row moved on screen
 *          with every press, because each step scrolled the pane to clear the new panel's bottom
 *          from the dock; (3) a panel taller than the room on screen could not be read to its end,
 *          because Down off the last chip left the answer at once.
 * Used for: ContextChipLadder.tsx, using chatPanelScroll.ts.
 * Solves: Gives the pane a layout the way the Deck draws it: every box reads its place from the
 *         pane's scrollTop, and the panel under the chips is as tall as the open chip's body, so a
 *         step that opens a taller or shorter body changes what is drawn under the row exactly as it
 *         does on the Deck. The checks read positions (the row's top edge, the pane's scrollTop),
 *         not only where the ring is.
 * Does not: Prove the real Steam scroller behaves this way: the Deck check does (a step with the row
 *           measured before and after, and a wait past one second after the ring leaves).
 */
import React from "react";
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ContextChipLadder } from "./ContextChipLadder";
import type { ContextChip, TransparencySnapshot } from "../utils/inputTransparency";
import { resetUiDocument } from "../utils/uiDocument";

const hoisted = vi.hoisted(() => ({
  focusableProps: [] as Array<Record<string, unknown>>,
}));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const RealFocusable = stubs.Focusable;
  const CapturingFocusable = React.forwardRef<HTMLDivElement, Record<string, unknown>>(
    function CapturingFocusable(props, ref) {
      hoisted.focusableProps.push(props);
      return <RealFocusable {...props} ref={ref} />;
    }
  );
  return { ...stubs, Focusable: CapturingFocusable };
});

const OPEN_CHIP = "bonsai-chip-ladder-chip bonsai-chip-ladder-chip--active";

/* Where the Deck draws things (docs/test-evidence/plan72-Z-FREEPLAY.json: dock top 586). */
const PANE_TOP = 88;
const PANE_BOTTOM = 766;
const DOCK_TOP = 586;
const START_SCROLL = 1200;
/* Where the ladder's top sits on screen at START_SCROLL, unless a test says otherwise. */
const LADDER_SCREEN_TOP = 260;
const CAPTION_H = 16;
const ROW_H = 60;
const GAP = 8;

/* The open chip's body height, by label: short ones, a tall one, and one taller than the room. */
const BODY_H: Record<string, number> = {
  "Reply style": 40,
  "Thinking": 60,
  "Game context": 300,
  "Spoiler risk": 50,
  "Developer details": 450,
};
const LABELS = Object.keys(BODY_H);

function chip(label: string, i: number): ContextChip {
  return {
    id: `chip-${i}`,
    rank: i + 1,
    label,
    attached: true,
    tier_class: "",
    body: { title: label, paths: [], bullets: [] },
  };
}

function snapshotOf(labels: string[]): TransparencySnapshot {
  return { context_chips: labels.map(chip) } as unknown as TransparencySnapshot;
}

type Scene = {
  pane: HTMLElement;
  ladder: HTMLElement;
  chips: HTMLElement[];
  onLeave: ReturnType<typeof vi.fn>;
};

function openLabel(ladder: HTMLElement): string {
  return ladder.querySelector(".bonsai-chip-ladder-chip--active")?.textContent ?? "";
}

function screenY(pane: HTMLElement, docY: number): number {
  return PANE_TOP + docY - pane.scrollTop;
}

type SceneOptions = {
  ladderScreenTop?: number;
  labels?: string[];
  /** The pane's total scroll height; the default leaves far more room than any test scrolls. */
  scrollHeight?: number;
  /**
   * The Deck's pane: its scroll height is the open panel's height plus the held block after it
   * plus `base`, and its scrollTop is clamped to what that allows, the way the browser clamps it
   * (on the next read after the content shrank). Measured 2026-10-08: scroll heights 1060, 882,
   * 1080 for the first, second and last chip, a client height of 678.
   */
  deckPane?: { base: number; bodies: Record<string, number> };
  startScroll?: number;
};

function mountScene({
  ladderScreenTop = LADDER_SCREEN_TOP,
  labels = LABELS,
  scrollHeight = 4000,
  deckPane,
  startScroll = START_SCROLL,
}: SceneOptions = {}): Scene {
  const LADDER_DOC_TOP = ladderScreenTop - PANE_TOP + startScroll;
  const pane = document.createElement("div");
  pane.className = "_TabContentsScroll";
  const clientHeight = PANE_BOTTOM - PANE_TOP;
  Object.defineProperty(pane, "clientHeight", { value: clientHeight, configurable: true });
  if (deckPane) {
    let top = startScroll;
    const openPanel = () => deckPane.bodies[pane.querySelector(".bonsai-chip-ladder-chip--active")?.textContent ?? ""] ?? 0;
    const held = () => parseFloat((pane.querySelector(".bonsai-chip-ladder-hold") as HTMLElement | null)?.style.height || "0");
    const total = () => deckPane.base + openPanel() + held();
    const max = () => Math.max(0, total() - clientHeight);
    Object.defineProperty(pane, "scrollHeight", {
      configurable: true,
      get() {
        top = Math.min(top, max());
        return total();
      },
    });
    Object.defineProperty(pane, "scrollTop", {
      configurable: true,
      get() {
        top = Math.min(top, max());
        return top;
      },
      set(value: number) {
        top = Math.max(0, Math.min(value, max()));
      },
    });
  } else {
    Object.defineProperty(pane, "scrollHeight", { value: scrollHeight, configurable: true });
    pane.scrollTop = startScroll;
  }
  pane.getBoundingClientRect = () => ({ top: PANE_TOP, bottom: PANE_BOTTOM }) as DOMRect;
  const dock = document.createElement("div");
  dock.className = "bonsai-main-tab-dock";
  dock.getBoundingClientRect = () => ({ top: DOCK_TOP, bottom: PANE_BOTTOM }) as DOMRect;
  pane.appendChild(dock);
  document.body.appendChild(pane);

  const host = document.createElement("div");
  pane.appendChild(host);
  const onLeave = vi.fn(() => true);
  const { container } = render(<ContextChipLadder snapshot={snapshotOf(labels)} onMoveDownFromLadder={onLeave} />, {
    container: host,
  });
  const ladder = container.querySelector(".bonsai-chip-ladder") as HTMLElement;
  const chips = [...container.querySelectorAll<HTMLElement>(".bonsai-chip-ladder-chip")];

  const rowDocTop = LADDER_DOC_TOP + CAPTION_H + 6;
  const bodyDocTop = rowDocTop + ROW_H + GAP;
  const bodyHeight = () => (deckPane?.bodies ?? BODY_H)[openLabel(ladder)] ?? 0;
  const box = (docTop: number, height: number) => () =>
    ({ top: screenY(pane, docTop), bottom: screenY(pane, docTop) + height, height }) as DOMRect;
  ladder.getBoundingClientRect = () =>
    box(LADDER_DOC_TOP, bodyDocTop - LADDER_DOC_TOP + bodyHeight())();
  for (const c of chips) c.getBoundingClientRect = box(rowDocTop, 24);
  chips[0]!.parentElement!.getBoundingClientRect = box(rowDocTop, ROW_H);
  const body = ladder.querySelector(".bonsai-chip-ladder-hold")!.previousElementSibling as HTMLElement;
  body.getBoundingClientRect = () => box(bodyDocTop, bodyHeight())();
  return { pane, ladder, chips, onLeave };
}

function openChipProps(): Record<string, unknown> {
  const matches = hoisted.focusableProps.filter((p) => p.className === OPEN_CHIP);
  return matches[matches.length - 1]!;
}

/** The ring arrives on the first chip, as Down from the tabs row above does. */
function ringArrives(scene: Scene): void {
  scene.chips[0]!.setAttribute("tabindex", "-1");
  act(() => {
    scene.chips[0]!.focus();
  });
  act(() => {
    vi.runAllTimers();
  });
}

/** One Down press on the chip holding the ring. */
function pressDown(): boolean {
  let claimed = false;
  act(() => {
    claimed = Boolean((openChipProps().onMoveDown as () => boolean)());
  });
  return claimed;
}

beforeEach(() => {
  hoisted.focusableProps = [];
  vi.useFakeTimers();
  resetUiDocument();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("the answer stops scrolling once the ring has left the chips", () => {
  it("does not scroll the pane in the second after the ring moves to the question box", () => {
    const scene = mountScene();
    ringArrives(scene);
    pressDown();
    pressDown();
    expect(openLabel(scene.ladder)).toBe("Game context");

    /* The ring leaves: the question box takes focus a moment after the last press. */
    const box = document.createElement("textarea");
    document.body.appendChild(box);
    act(() => {
      box.focus();
    });
    const scrollWhenItLeft = scene.pane.scrollTop;
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(scene.pane.scrollTop).toBe(scrollWhenItLeft);
  });
});

/** The top edge of the chip row, which is also where every chip sits. */
function rowTop(scene: Scene): number {
  return scene.chips[0]!.getBoundingClientRect().top;
}

function settle(): void {
  act(() => {
    vi.runAllTimers();
  });
}

describe("the chip row holds still while the panel under it changes height", () => {
  it("keeps the row's top edge in the same place through a walk down every chip and back up", () => {
    const scene = mountScene();
    ringArrives(scene);
    const start = rowTop(scene);
    const seen: Array<[string, number]> = [[openLabel(scene.ladder), start]];

    for (let i = 0; i < LABELS.length - 1; i += 1) {
      pressDown();
      settle();
      seen.push([openLabel(scene.ladder), rowTop(scene)]);
    }
    for (let i = 0; i < LABELS.length - 1; i += 1) {
      act(() => {
        (openChipProps().onMoveUp as () => boolean)();
      });
      settle();
      seen.push([openLabel(scene.ladder), rowTop(scene)]);
    }

    expect(seen.map(([label]) => label)).toEqual([...LABELS, ...LABELS.slice(0, -1).reverse()]);
    expect(seen.map(([, top]) => top)).toEqual(seen.map(() => start));
  });

  it("does not move the row when a press comes before the arrival's own passes have run", () => {
    const scene = mountScene();
    scene.chips[0]!.setAttribute("tabindex", "-1");
    act(() => {
      scene.chips[0]!.focus();
    });
    const start = rowTop(scene);
    pressDown();
    pressDown();
    settle();

    expect(openLabel(scene.ladder)).toBe("Game context");
    expect(rowTop(scene)).toBe(start);
  });

  it("scrolls once on arrival to leave room under the row for a panel, then holds still", () => {
    const scene = mountScene({ ladderScreenTop: 430 });
    expect(rowTop(scene)).toBe(452);
    ringArrives(scene);
    const arrived = rowTop(scene);

    /* A short panel fitted without any scroll; the row still gives up the room a typical one needs. */
    expect(arrived).toBeLessThan(452);
    expect(arrived + ROW_H + 150).toBeLessThanOrEqual(DOCK_TOP);
    for (let i = 0; i < LABELS.length - 1; i += 1) {
      pressDown();
      settle();
      expect(rowTop(scene)).toBe(arrived);
    }
  });
});

/** Down presses until the open chip is the last one. */
function walkToLastChip(scene: Scene): void {
  for (let i = 0; i < scene.chips.length - 1; i += 1) pressDown();
  settle();
}

describe("a panel taller than the room can be read to its end before Down leaves the answer", () => {
  it("scrolls the end of the last chip's panel above the dock on the first Down, and leaves on the second", () => {
    const scene = mountScene();
    ringArrives(scene);
    walkToLastChip(scene);
    expect(openLabel(scene.ladder)).toBe("Developer details");
    const body = scene.ladder.querySelector(".bonsai-chip-ladder-hold")!.previousElementSibling as HTMLElement;
    expect(body.getBoundingClientRect().bottom).toBeGreaterThan(DOCK_TOP);

    expect(pressDown()).toBe(true);
    settle();
    expect(scene.onLeave).not.toHaveBeenCalled();
    expect(body.getBoundingClientRect().bottom).toBeLessThanOrEqual(DOCK_TOP);

    pressDown();
    expect(scene.onLeave).toHaveBeenCalledTimes(1);
  });

  it("leaves at once when the last chip's panel already fits", () => {
    const scene = mountScene({ labels: ["Reply style", "Thinking"] });
    ringArrives(scene);
    pressDown();
    settle();
    expect(openLabel(scene.ladder)).toBe("Thinking");

    pressDown();
    expect(scene.onLeave).toHaveBeenCalledTimes(1);
  });

  it("leaves at once when the pane has no scroll left to give", () => {
    const scene = mountScene({ scrollHeight: START_SCROLL + (PANE_BOTTOM - PANE_TOP) });
    ringArrives(scene);
    walkToLastChip(scene);

    pressDown();
    expect(scene.onLeave).toHaveBeenCalledTimes(1);
  });

  it("brings the chip row back into view when Up steps off the end after reading it", () => {
    const scene = mountScene();
    ringArrives(scene);
    walkToLastChip(scene);
    pressDown();
    settle();
    expect(scene.chips[0]!.getBoundingClientRect().top).toBeLessThan(PANE_TOP);

    act(() => {
      (openChipProps().onMoveUp as () => boolean)();
    });
    settle();

    expect(openLabel(scene.ladder)).toBe("Spoiler risk");
    expect(scene.chips[0]!.getBoundingClientRect().top).toBeGreaterThanOrEqual(PANE_TOP);
    expect(scene.chips[0]!.getBoundingClientRect().bottom).toBeLessThanOrEqual(DOCK_TOP);
  });
});

/* The seven chips of the Deck recording, with panel heights that give its measured scroll heights. */
const DECK_LABELS = [
  "Keyword + meaning",
  "KB: 14 sections",
  "Reply style: balanced",
  "Thinking",
  "Spoiler risk: med",
  "Routed model",
  "Developer details",
];
const DECK_PANE = {
  base: 760,
  bodies: {
    "Keyword + meaning": 300,
    "KB: 14 sections": 122,
    "Reply style: balanced": 122,
    "Thinking": 153,
    "Spoiler risk: med": 201,
    "Routed model": 122,
    "Developer details": 320,
  },
};
/* Scrolled this far, the second chip's panel (scroll height 882) cannot keep the position: 882 - 678. */
const SECOND_CHIP_MAX_SCROLL = 204;

function deckScene(startScroll: number) {
  return mountScene({
    labels: DECK_LABELS,
    deckPane: DECK_PANE,
    startScroll,
    ladderScreenTop: 239.5,
  });
}

function heldHeight(scene: Scene): number {
  return parseFloat((scene.ladder.querySelector(".bonsai-chip-ladder-hold") as HTMLElement).style.height || "0");
}

describe("a step to a shorter panel does not pull the pane back under its scroll", () => {
  it("entering the chips near the pane's end, the first step to a shorter panel leaves the row and the scroll alone", () => {
    const scene = deckScene(334.4);
    ringArrives(scene);
    const row = rowTop(scene);
    const scroll = scene.pane.scrollTop;
    expect(scroll).toBeGreaterThan(SECOND_CHIP_MAX_SCROLL);

    pressDown();
    settle();

    expect(openLabel(scene.ladder)).toBe("KB: 14 sections");
    expect(scene.pane.scrollTop).toBe(scroll);
    expect(rowTop(scene)).toBe(row);
  });

  it("after reading Developer details to its end, Up to a shorter panel leaves the row and the scroll alone", () => {
    const scene = deckScene(334.4);
    ringArrives(scene);
    walkToLastChip(scene);
    pressDown();
    settle();
    expect(scene.onLeave).not.toHaveBeenCalled();
    const row = rowTop(scene);
    const scroll = scene.pane.scrollTop;
    expect(scroll).toBeGreaterThan(SECOND_CHIP_MAX_SCROLL);

    act(() => {
      (openChipProps().onMoveUp as () => boolean)();
    });
    settle();

    expect(openLabel(scene.ladder)).toBe("Routed model");
    expect(scene.pane.scrollTop).toBe(scroll);
    expect(rowTop(scene)).toBe(row);
  });

  it("keeps the row still through a whole walk down and back up from the pane's end", () => {
    const scene = deckScene(334.4);
    ringArrives(scene);
    const row = rowTop(scene);
    const scroll = scene.pane.scrollTop;
    for (let i = 0; i < DECK_LABELS.length - 1; i += 1) {
      pressDown();
      settle();
      expect([rowTop(scene), scene.pane.scrollTop]).toEqual([row, scroll]);
    }
    for (let i = 0; i < DECK_LABELS.length - 1; i += 1) {
      act(() => {
        (openChipProps().onMoveUp as () => boolean)();
      });
      settle();
      expect([rowTop(scene), scene.pane.scrollTop]).toEqual([row, scroll]);
    }
  });

  it("leaves no gap when the pane is not near its end", () => {
    const scene = deckScene(0);
    ringArrives(scene);
    for (let i = 0; i < DECK_LABELS.length - 1; i += 1) {
      pressDown();
      settle();
      expect(heldHeight(scene)).toBe(0);
    }
  });

  it("gives the held height back at the next step once the person has scrolled up", () => {
    const scene = deckScene(334.4);
    ringArrives(scene);
    pressDown();
    settle();
    expect(heldHeight(scene)).toBeGreaterThan(0);

    /* Back within what the shorter panel allows, with the row still on screen. */
    scene.pane.scrollTop = SECOND_CHIP_MAX_SCROLL - 4;
    pressDown();
    settle();

    expect(heldHeight(scene)).toBe(0);
    expect(scene.pane.scrollTop).toBe(SECOND_CHIP_MAX_SCROLL - 4);
  });

  it("still does not scroll in the second after the ring leaves, with the held height in place", () => {
    const scene = deckScene(334.4);
    ringArrives(scene);
    pressDown();
    settle();
    expect(heldHeight(scene)).toBeGreaterThan(0);

    const box = document.createElement("textarea");
    document.body.appendChild(box);
    act(() => {
      box.focus();
    });
    const scroll = scene.pane.scrollTop;
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(scene.pane.scrollTop).toBe(scroll);
  });
});
