/**
 * Title: The first-time setup's first screen fits the Deck's own screen
 *
 * Purpose: The picked drawing (board 5, tab 4, round 4 B) is 392 points with its frame, in a stand-in font. The
 * drawing was compared with 454 points (the screen less Steam's two bars), but Steam's popup layer also keeps 24 and
 * 24.5 points clear above and below a box (src/test-harness/deckPopupFit.ts, measured on the Deck), which leaves 403.5
 * with the frame and 351.5 for what the box draws. This lays the drawn first screen out from its own styles (the gap
 * between parts, the title's and the beta line's size and line height, the checklist's rule, header and five row
 * heights, the switch's height, the buttons' row) and checks the total against that room on Normal text and on Large
 * (the largest): about 11 points to spare on Normal. A box taller than the room would be slid up by Steam to show the
 * ring's button (Not now, at the bottom), and its title would go under Steam's top bar, as the starter box once did.
 *
 * Every line that is free to wrap (the title, the beta line, each row's name and small line) must fit on one line
 * at the box's width with room to spare: its letters are counted at 0.6 of their size each, wider than the stand-in
 * font's real average (0.48 to 0.53), so a line that passes here does not wrap in Steam's font either. A second line
 * would cost about 14 points against the 11 to spare.
 *
 * Does not: lay out real letters or know Steam's font or the real box width (the drawing's 574 points); the Deck
 * driver measures the real box in Steam's font before the change counts as done.
 */
import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => (await import("./firstRunPopupTestKit")).deckyUiForFirstRunPopup());

import { FirstRunWhereAiRunsModal } from "./FirstRunWhereAiRunsModal";
import { popupHost, ringName } from "./firstRunPopupTestKit";
import { permissionBridge } from "./firstRunTestBridge";
import { FIRST_RUN_BOX } from "./firstRunBoxLayout";
import { resetFakeDeckyRpc } from "../../../test-harness/fakeDeckyRpc";
import { DECK_POPUP_FRAME_PX, DECK_POPUP_ROOM } from "../../../test-harness/deckPopupFit";

/** What the box may draw inside its frame on the Deck's own screen. */
const DRAWN_ROOM = DECK_POPUP_ROOM - 2 * DECK_POPUP_FRAME_PX;

/** A size written through textPx ("calc(16px * var(--bonsai-text-scale, 1))") at a Text size step. */
const px = (css: string, scale = 1): number => {
  const m = /([\d.]+)px/.exec(css);
  if (!m) throw new Error(`no size in ${css}`);
  return Number(m[1]) * (/var\(/.test(css) ? scale : 1);
};
const part = (name: string) => document.querySelector<HTMLElement>(`[data-bonsai-first-run-part="${name}"]`)!;

/** The first screen's height, read off its drawn styles, at a Text size step. */
function drawnHeight(scale: number) {
  const box = document.querySelector<HTMLElement>('[data-bonsai-first-run-popup="first"]')!;
  const title = part("title");
  const checklist = part("checklist");
  const head = checklist.firstElementChild as HTMLElement;
  const rows = Array.from(checklist.children).slice(1) as HTMLElement[];
  const rowHeight = (row: HTMLElement) => px((row.querySelector("button") ?? row).style.height);
  const switchRow = part("switch").querySelector("button")!;
  const foot = part("foot");
  const beta = part("beta");
  const heights = {
    title: px(title.style.fontSize, scale) * Number(title.style.lineHeight),
    checklist:
      px(checklist.style.borderTop) +
      px(head.style.marginTop || head.style.margin.split(" ")[0]!) +
      px(head.style.height) +
      px(head.style.margin.split(" ")[2] ?? "0px") +
      rows.reduce((sum, r) => sum + rowHeight(r), 0),
    switch: px(switchRow.style.height),
    foot: px(foot.style.marginTop) + px(foot.style.height),
    beta: px(beta.style.fontSize, scale) * Number(beta.style.lineHeight),
    gaps: px(box.style.gap) * (box.children.length - 1),
    rows: rows.length,
  };
  const total = heights.title + heights.checklist + heights.switch + heights.foot + heights.beta + heights.gaps;
  return { ...heights, total };
}

beforeEach(async () => {
  resetFakeDeckyRpc();
  permissionBridge(false);
  render(<FirstRunWhereAiRunsModal host={popupHost()} onClose={vi.fn()} />);
  await waitFor(() => expect(ringName()).toBe("Not now"));
});

afterEach(() => {
  document.body.innerHTML = "";
});

/** A line's widest likely width: every letter at 0.6 of its size (the stand-in font averages 0.48 to 0.53). */
const widest = (text: string, sizePx: number) => text.length * sizePx * 0.6;

describe("no line on the first screen can wrap at the box's width", () => {
  for (const scale of [1, 1.15]) {
    it(`the title and the beta line, each one line, on ${scale === 1 ? "Normal" : "Large"} text`, () => {
      for (const name of ["title", "beta"]) {
        const el = part(name);
        expect(widest(el.textContent ?? "", px(el.style.fontSize, scale)), name).toBeLessThanOrEqual(FIRST_RUN_BOX.contentWidthPx);
      }
    });
  }

  it("each row's name and its size line, beside its tick box and its site, on Normal text", () => {
    const rows = Array.from(part("checklist").children).slice(1) as HTMLElement[];
    expect(rows).toHaveLength(5);
    for (const row of rows) {
      const cells = (row.querySelector("button") ?? row).children;
      const nameCell = cells[1] as HTMLElement;
      const small = nameCell.querySelector("small") as HTMLElement;
      const tag = cells[2] as HTMLElement;
      const tagWidth = widest(tag.textContent ?? "", px(tag.style.fontSize)) + 18;
      const room = FIRST_RUN_BOX.contentWidthPx - 30 - 2 * 10 - tagWidth;
      const name = (nameCell.firstChild?.textContent ?? "").trim();
      expect(widest(name, px(nameCell.style.fontSize)), name).toBeLessThanOrEqual(room);
      expect(widest(small.textContent ?? "", px(small.style.fontSize)), small.textContent ?? "").toBeLessThanOrEqual(room);
    }
  });
});

describe("the first screen on the Deck's own screen", () => {
  it("is drawn at the picked drawing's sizes: title 23.2, checklist 205, switch 40, buttons 34, beta line 14.2, four gaps of 6", () => {
    const h = drawnHeight(1);
    expect(h.rows).toBe(FIRST_RUN_BOX.rows);
    expect(h.title).toBeCloseTo(23.2, 5);
    expect(h.checklist).toBe(205);
    expect(h.switch).toBe(40);
    expect(h.foot).toBe(34);
    expect(h.beta).toBeCloseTo(14.175, 5);
    expect(h.gaps).toBe(24);
  });

  it("fits the 351.5 points Steam leaves inside a popup's frame on Normal text, with about 11 to spare", () => {
    expect(DRAWN_ROOM).toBe(351.5);
    const h = drawnHeight(1);
    expect(h.total).toBeCloseTo(340.375, 5);
    expect(DRAWN_ROOM - h.total).toBeGreaterThanOrEqual(11);
  });

  it("still fits on Large text, the largest step: only the words grow, never the rows", () => {
    const h = drawnHeight(1.15);
    expect(h.switch).toBe(40);
    expect(h.checklist).toBe(205);
    expect(h.total).toBeLessThanOrEqual(DRAWN_ROOM);
  });
});
