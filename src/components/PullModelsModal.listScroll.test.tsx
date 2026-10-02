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
 * How it models the Deck: every row and the sticky header get the box the Deck measured (header 26 px,
 * rows 35 px, a list too short for all its rows) and follow the list's scrollTop. `scrollIntoView`
 * does what the Deck's did: the sticky header counts as free space, scroll-margin-top changed
 * nothing, and a row already partly inside the list is not scrolled at all (so the plugin itself
 * has to clear the header). The same scroll also runs after every press on whatever took the
 * ring, as Steam does. The walk is bounded: each stop is visited once going down and once coming back up.
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
import { LIST_HEIGHT, LIST_TOP, layOutList, steamNearest } from "../test-harness/pullModelsListLayout";

function latestByAriaLabel(label: string): Record<string, unknown> | undefined {
  const matches = hoisted.buttonProps.filter((p) => p["aria-label"] === label);
  return matches[matches.length - 1];
}

function latestByClassName(className: string): Record<string, unknown> | undefined {
  const matches = hoisted.buttonProps.filter((p) => p.className === className);
  return matches[matches.length - 1];
}

const original = Element.prototype.scrollIntoView;

beforeEach(() => {
  hoisted.buttonProps = [];
});

afterEach(() => {
  Element.prototype.scrollIntoView = original;
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
  it("puts the first model back under the header when Steam scrolls the list again just after the press", async () => {
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
    Element.prototype.scrollIntoView = function () {};
    list.scrollTop = 41.3; // the list as the walk down left it

    const second = latestByAriaLabel("Use qwen3.5:4b for Ask")!;
    const first = latestByAriaLabel("Use gemma4:e2b-it-qat for Ask")!;
    expect((first.onMoveDown as () => boolean)()).toBe(true); // ring on the second model
    expect((second.onMoveUp as () => boolean)()).toBe(true); // Up onto the first model
    const firstRow = () =>
      (document.activeElement as HTMLElement).closest<HTMLElement>(".bonsai-pullmodels-table-row--data")!.getBoundingClientRect();
    expect(firstRow().top).toBeGreaterThanOrEqual(header.getBoundingClientRect().bottom);

    list.scrollTop = 41.3; // Steam puts its own scroll back a moment after the press
    expect(firstRow().top).toBeLessThan(header.getBoundingClientRect().bottom);
    await waitFor(() => {
      expect(firstRow().top).toBeGreaterThanOrEqual(header.getBoundingClientRect().bottom);
    });
  });
});
