/**
 * Title: The model list's rows never hide behind its column-header row, going down or back up
 *
 * Purpose: Pins the Deck bug found 2026-10-02 (docs/test-evidence/plan79-P79-M9-MODELS-BOX-TOP.json):
 * in the AI models box, walking Down to the bottom and back Up left the list scrolled 41 px, so the
 * first model's row had 16 of its 35 px behind the sticky "PULL MODEL SIZE ..." header row. The
 * browser's scroll-into-view treats the sticky header as free space, so a row just under it counts as
 * "already visible" and nothing scrolls it out.
 *
 * Used for: `PullModelsModal.tsx` (the list, the row handlers) and the table rules in
 * `src/styles/sections/gamepadAndPullModels.ts`.
 *
 * How it models the Deck: the real stylesheet is put on the page, every row and the sticky header get
 * the box the Deck measured (header 26 px, rows 35 px, a list too short for all its rows) and follow the list's scrollTop,
 * and `scrollIntoView` does what the Deck's does for `block: "nearest"`: it ignores the sticky header
 * but honours the element's scroll-margin-top. The same scroll is also applied after every press to
 * whatever took the ring, as Steam does. The walk is bounded: each stop is visited once going down and
 * once coming back up.
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configure, render, waitFor } from "@testing-library/react";

configure({ asyncUtilTimeout: 10000 });

const hoisted = vi.hoisted(() => ({
  buttonProps: [] as Array<Record<string, unknown>>,
}));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const RealButton = stubs.Button;
  const CapturingButton = React.forwardRef<HTMLButtonElement, Record<string, unknown>>(
    function CapturingButton(props, ref) {
      React.useLayoutEffect(() => {
        hoisted.buttonProps.push(props);
      });
      return <RealButton {...props} ref={ref} />;
    }
  );
  return { ...stubs, Button: CapturingButton };
});

import { PullModelsModal } from "./PullModelsModal";
import { setRpcHandler } from "../test-harness/fakeDeckyRpc";
import { buildPullModelsStylesheet } from "../styles/sections/gamepadAndPullModels";

const LIST_TOP = 217;
const LIST_HEIGHT = 130; // short enough that four rows overflow, as the Deck's list did (it scrolled 41 px)
const HEADER_H = 26;
const ROW_H = 35;
const TITLE_H = 18;
const SLOT_INSET = 5.5;
const SLOT_H = 24;

const rect = (top: number, bottom: number) =>
  ({ top, bottom, left: 0, right: 0, width: 0, height: bottom - top, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;

/** Gives the list, its sticky header, its group titles, rows and their buttons the Deck's boxes. */
function layOutList(list: HTMLElement) {
  const header = list.querySelector<HTMLElement>(".bonsai-pullmodels-table-row--head")!;
  const items = Array.from(
    list.querySelectorAll<HTMLElement>(".bonsai-pullmodels-group-title, .bonsai-pullmodels-table-row--data")
  );
  const contentY = new Map<HTMLElement, number>();
  let y = HEADER_H;
  for (const el of items) {
    contentY.set(el, y);
    y += el.classList.contains("bonsai-pullmodels-group-title") ? TITLE_H : ROW_H;
  }
  const scrollHeight = y;
  Object.defineProperty(list, "clientHeight", { value: LIST_HEIGHT, configurable: true });
  Object.defineProperty(list, "scrollHeight", { value: scrollHeight, configurable: true });
  list.getBoundingClientRect = () => rect(LIST_TOP, LIST_TOP + LIST_HEIGHT);
  header.getBoundingClientRect = () => rect(LIST_TOP, LIST_TOP + HEADER_H); // sticky: never moves
  for (const el of items) {
    const top = () => LIST_TOP + contentY.get(el)! - list.scrollTop;
    el.getBoundingClientRect = () => rect(top(), top() + (el.classList.contains("bonsai-pullmodels-group-title") ? TITLE_H : ROW_H));
    if (el.classList.contains("bonsai-pullmodels-group-title")) continue;
    for (const btn of Array.from(el.querySelectorAll<HTMLElement>("button"))) {
      btn.getBoundingClientRect = () => rect(top() + SLOT_INSET, top() + SLOT_INSET + SLOT_H);
    }
  }
  return { header, scrollHeight };
}

/** The scroll-margin-top the page's own stylesheet gives this element, in px. */
function scrollMarginTop(el: HTMLElement): number {
  const value = window.getComputedStyle(el).getPropertyValue("scroll-margin-top");
  return parseFloat(value) || 0;
}

/** `scrollIntoView({block:"nearest"})` as the Deck does it: sticky header ignored, scroll-margin honoured. */
function steamNearest(list: HTMLElement, el: HTMLElement) {
  const r = el.getBoundingClientRect();
  const top = r.top - scrollMarginTop(el);
  const maxScroll = Math.max(0, list.scrollHeight - LIST_HEIGHT);
  if (top < LIST_TOP) list.scrollTop = Math.max(0, list.scrollTop - (LIST_TOP - top));
  else if (r.bottom > LIST_TOP + LIST_HEIGHT) {
    list.scrollTop = Math.min(maxScroll, list.scrollTop + (r.bottom - (LIST_TOP + LIST_HEIGHT)));
  }
}

function latestByAriaLabel(label: string): Record<string, unknown> | undefined {
  const matches = hoisted.buttonProps.filter((p) => p["aria-label"] === label);
  return matches[matches.length - 1];
}

function latestByClassName(className: string): Record<string, unknown> | undefined {
  const matches = hoisted.buttonProps.filter((p) => p.className === className);
  return matches[matches.length - 1];
}

let styleEl: HTMLStyleElement;
const original = Element.prototype.scrollIntoView;

beforeEach(() => {
  hoisted.buttonProps = [];
  styleEl = document.createElement("style");
  styleEl.textContent = buildPullModelsStylesheet();
  document.head.appendChild(styleEl);
});

afterEach(() => {
  Element.prototype.scrollIntoView = original;
  styleEl.remove();
  document.body.innerHTML = "";
});

describe("the model list under its sticky header row", () => {
  it("shows every row whole below the header on the way down, and is back at the top after the way up", async () => {
    setRpcHandler("test_ollama_connection", () => ({
      reachable: true,
      version: "0.5.0",
      models: ["gemma4:e2b-it-qat", "qwen3.5:4b", "qwen2.5vl:3b", "nomic-embed-text"],
    }));
    const { container } = render(
      <PullModelsModal activeRoutingTag={null} onCancel={() => {}} onPullAccepted={() => {}} embedded />
    );
    await waitFor(() => {
      expect(container.querySelectorAll(".bonsai-pullmodels-slot--installed").length).toBeGreaterThanOrEqual(4);
    });
    const list = container.querySelector<HTMLElement>(".bonsai-pullmodels-list")!;
    const { header } = layOutList(list);
    expect(list.querySelectorAll(".bonsai-pullmodels-table-row--data").length).toBeGreaterThanOrEqual(4);

    Element.prototype.scrollIntoView = function (this: Element) {
      if (list.contains(this)) steamNearest(list, this as HTMLElement);
    };
    // Steam also scrolls whatever took the ring, after the press that moved it.
    const steamScrollsFocused = () => {
      const el = document.activeElement as HTMLElement | null;
      if (el && list.contains(el)) steamNearest(list, el);
    };

    const rowOf = (el: Element) => el.closest<HTMLElement>(".bonsai-pullmodels-table-row--data")!;
    const assertRowBelowHeader = (el: Element, where: string) => {
      const row = rowOf(el).getBoundingClientRect();
      const headerBottom = header.getBoundingClientRect().bottom;
      expect(row.top, `${where}: row top ${row.top} vs header bottom ${headerBottom}`).toBeGreaterThanOrEqual(headerBottom);
      // The scroll keeps the button the ring is on in view (its row's padding may still sit below the edge).
      const slotBottom = el.getBoundingClientRect().bottom;
      expect(slotBottom, `${where}: button bottom`).toBeLessThanOrEqual(LIST_TOP + LIST_HEIGHT);
    };
    const labelOf = (el: Element) => el.getAttribute("aria-label") ?? "";

    // Down: Filters hands Down to the first row (the plugin's own handler); every row hands it on.
    const filters = latestByClassName("bonsai-pullmodels-filters-button")!;
    expect((filters.onMoveDown as () => boolean)()).toBe(true);
    steamScrollsFocused();
    const visited: string[] = [];
    for (let guard = 0; guard < 40; guard++) {
      const el = document.activeElement as HTMLElement;
      expect(visited, `stop visited twice: ${labelOf(el)}`).not.toContain(labelOf(el));
      visited.push(labelOf(el));
      assertRowBelowHeader(el, `down at ${labelOf(el)}`);
      const moved = (latestByAriaLabel(labelOf(el))!.onMoveDown as () => boolean)();
      if (!moved) break;
      steamScrollsFocused();
    }
    expect(visited.length).toBeGreaterThanOrEqual(4);
    // The list really did scroll on the way down (otherwise the walk proves nothing).
    expect(list.scrollTop).toBeGreaterThan(0);

    // Up: every stop back to the first row, then the Filters button above the list.
    const up: string[] = [];
    for (let guard = 0; guard < 40; guard++) {
      const el = document.activeElement as HTMLElement;
      if (el.classList.contains("bonsai-pullmodels-filters-button")) break;
      expect(up, `stop visited twice on the way up: ${labelOf(el)}`).not.toContain(labelOf(el));
      up.push(labelOf(el));
      assertRowBelowHeader(el, `up at ${labelOf(el)}`);
      const moved = (latestByAriaLabel(labelOf(el))!.onMoveUp as () => boolean)();
      expect(moved).toBe(true);
      steamScrollsFocused();
    }
    expect(document.activeElement?.classList.contains("bonsai-pullmodels-filters-button")).toBe(true);
    expect(up.length).toBe(visited.length);
    expect(list.scrollTop).toBe(0);
  });
});
