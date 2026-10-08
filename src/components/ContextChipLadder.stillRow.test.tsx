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
/* Document-space y of the ladder's top: 260 on screen at START_SCROLL. */
const LADDER_DOC_TOP = 260 - PANE_TOP + START_SCROLL;
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

const SNAPSHOT = { context_chips: LABELS.map(chip) } as unknown as TransparencySnapshot;

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

function mountScene(): Scene {
  const pane = document.createElement("div");
  pane.className = "_TabContentsScroll";
  Object.defineProperty(pane, "scrollHeight", { value: 4000, configurable: true });
  Object.defineProperty(pane, "clientHeight", { value: PANE_BOTTOM - PANE_TOP, configurable: true });
  pane.scrollTop = START_SCROLL;
  pane.getBoundingClientRect = () => ({ top: PANE_TOP, bottom: PANE_BOTTOM }) as DOMRect;
  const dock = document.createElement("div");
  dock.className = "bonsai-main-tab-dock";
  dock.getBoundingClientRect = () => ({ top: DOCK_TOP, bottom: PANE_BOTTOM }) as DOMRect;
  pane.appendChild(dock);
  document.body.appendChild(pane);

  const host = document.createElement("div");
  pane.appendChild(host);
  const onLeave = vi.fn(() => true);
  const { container } = render(<ContextChipLadder snapshot={SNAPSHOT} onMoveDownFromLadder={onLeave} />, {
    container: host,
  });
  const ladder = container.querySelector(".bonsai-chip-ladder") as HTMLElement;
  const chips = [...container.querySelectorAll<HTMLElement>(".bonsai-chip-ladder-chip")];

  const rowDocTop = LADDER_DOC_TOP + CAPTION_H + 6;
  const bodyDocTop = rowDocTop + ROW_H + GAP;
  const bodyHeight = () => BODY_H[openLabel(ladder)] ?? 0;
  const box = (docTop: number, height: number) => () =>
    ({ top: screenY(pane, docTop), bottom: screenY(pane, docTop) + height, height }) as DOMRect;
  ladder.getBoundingClientRect = () =>
    box(LADDER_DOC_TOP, bodyDocTop - LADDER_DOC_TOP + bodyHeight())();
  for (const c of chips) c.getBoundingClientRect = box(rowDocTop, 24);
  const body = ladder.lastElementChild as HTMLElement;
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

/** One Down press on the chip holding the ring, then everything that was queued settles. */
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
