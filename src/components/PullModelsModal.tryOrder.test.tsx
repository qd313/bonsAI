/**
 * Title: The AI models box shows each installed model's place in the try order
 *
 * Purpose: Pins what a person sees and presses on the Deck in the AI models box (option C of the
 * fold, plan 79): a Text / Pictures switch under the Filters row, each installed model's row with
 * its place number and small up and down buttons, a change saved at once, the places belonging to
 * the PC when the AI runs on a PC, the refusal words the old order screens gave, and a D-pad walk of
 * the whole box both ways that never lands on a place button going up or down, never visits a stop
 * twice, and never reaches Remove except by a deliberate Right press along a row.
 *
 * Used for: `PullModelsModal.tsx` with `tryOrderHost`, through `PullModelsTryOrder.tsx` and
 * `useTryOrderPlaces.ts`.
 *
 * How it models the Deck: the real stylesheet is on the page and the list is laid out in the Deck's
 * numbers (`pullModelsListLayout.ts`), with Steam's scroll-into-view applied to whatever took the ring
 * after every press. The walk calls the move handlers the focused button carries, the way Steam does
 * on the device (it never delivers a DOM key for the D-pad), so a handler the button does not carry
 * is a press that does nothing here as it would there.
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configure, fireEvent, render, waitFor } from "@testing-library/react";

configure({ asyncUtilTimeout: 10000 });

const hoisted = vi.hoisted(() => ({ propsByEl: new WeakMap<Element, Record<string, unknown>>() }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const RealButton = stubs.Button;
  const CapturingButton = React.forwardRef<HTMLButtonElement, Record<string, unknown>>(
    function CapturingButton(props, ref) {
      const own = React.useRef<HTMLButtonElement | null>(null);
      React.useLayoutEffect(() => {
        if (own.current) hoisted.propsByEl.set(own.current, props);
      });
      return (
        <RealButton
          {...props}
          ref={(el: HTMLButtonElement | null) => {
            own.current = el;
            if (typeof ref === "function") ref(el);
            else if (ref) ref.current = el;
          }}
        />
      );
    }
  );
  return { ...stubs, Button: CapturingButton };
});

import { PullModelsModal } from "./PullModelsModal";
import type { TryOrderHost } from "../features/model-routing/useTryOrderPlaces";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../test-harness/fakeDeckyRpc";
import { defaultSettingsFixture } from "../test-harness/rpcFixtures";
import { buildPullModelsStylesheet } from "../styles/sections/gamepadAndPullModels";
import { LIST_HEIGHT, LIST_TOP, layOutList, steamNearest } from "../test-harness/pullModelsListLayout";

const DECK: TryOrderHost = { ollamaLocalOnDeck: true, ollamaIp: "", textModelRoutingOrder: [], visionModelRoutingOrder: [] };
const PC: TryOrderHost = { ...DECK, ollamaLocalOnDeck: false, ollamaIp: "192.168.1.20" };
const DECK_MODELS = ["qwen2.5vl:3b", "qwen3.5:4b", "gemma4:e2b-it-qat", "nomic-embed-text:latest"];

let styleEl: HTMLStyleElement;
const originalScroll = Element.prototype.scrollIntoView;

beforeEach(() => {
  resetFakeDeckyRpc();
  setRpcHandler("load_settings", () => defaultSettingsFixture());
  setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.5.0", models: DECK_MODELS }));
  styleEl = document.createElement("style");
  styleEl.textContent = buildPullModelsStylesheet();
  document.head.appendChild(styleEl);
});

afterEach(() => {
  Element.prototype.scrollIntoView = originalScroll;
  styleEl.remove();
  document.body.innerHTML = "";
});

function renderBox(host: TryOrderHost | undefined, props: Record<string, unknown> = {}) {
  return render(
    <PullModelsModal activeRoutingTag={null} onCancel={() => {}} onPullAccepted={() => {}} embedded tryOrderHost={host} {...props} />,
  );
}

const rowOf = (container: HTMLElement, tag: string): HTMLElement => {
  const row = Array.from(container.querySelectorAll<HTMLElement>(".bonsai-pullmodels-table-row--data")).find(
    (r) => r.querySelector(".bonsai-pullmodels-tag-name-text")?.textContent?.trim() === tag,
  );
  if (!row) throw new Error(`no row for ${tag}`);
  return row;
};
const placeOf = (container: HTMLElement, tag: string) =>
  rowOf(container, tag).querySelector(".bonsai-pullmodels-place-num")?.textContent ?? null;
const savedOrders = () =>
  getRpcCallLog()
    .filter((c) => c.method === "save_settings")
    .map((c) => c.args[0] as Record<string, unknown>);
const button = (container: HTMLElement, label: string) =>
  container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;

describe("what the box draws", () => {
  it("shows the switch and each installed model's place, and none for a note-search model", async () => {
    const { container } = renderBox(DECK);
    await waitFor(() => expect(placeOf(container, "qwen2.5vl:3b")).toBe("1"));
    expect(placeOf(container, "gemma4:e2b-it-qat")).toBe("2");
    expect(placeOf(container, "qwen3.5:4b")).toBe("3");
    expect(rowOf(container, "nomic-embed-text:latest").querySelector(".bonsai-pullmodels-place-num")).toBeNull();
    expect(button(container, "Try order for text questions").getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelector(".bonsai-pullmodels-table--try")).not.toBeNull();
    expect(container.textContent).toContain("A place change is saved at once; Cancel does not undo it.");
  });

  it("draws nothing of it when the box was not given a host", async () => {
    const { container } = renderBox(undefined);
    await waitFor(() => expect(container.querySelectorAll(".bonsai-pullmodels-slot--installed").length).toBeGreaterThan(2));
    expect(container.querySelector(".bonsai-pullmodels-tryorder")).toBeNull();
    expect(container.querySelector(".bonsai-pullmodels-place-num")).toBeNull();
    expect(container.querySelector(".bonsai-pullmodels-table--try")).toBeNull();
  });

  it("the Pictures switch shows the picture order: a model that cannot read pictures has no place", async () => {
    setRpcHandler("test_ollama_connection", () => ({ reachable: true, models: ["qwen2.5vl:3b", "qwen3:4b"] }));
    const { container } = renderBox(DECK, { initialFiltersOpen: false });
    await waitFor(() => expect(placeOf(container, "qwen3:4b")).not.toBeNull());
    fireEvent.click(button(container, "Try order for pictures questions"));
    await waitFor(() => expect(placeOf(container, "qwen3:4b")).toBeNull());
    expect(placeOf(container, "qwen2.5vl:3b")).toBe("1");
    expect(button(container, "Try order for pictures questions").getAttribute("aria-pressed")).toBe("true");
  });
});

describe("pressing a place button", () => {
  it("moves the model one place and the order on disk changes at once", async () => {
    const { container } = renderBox(DECK);
    await waitFor(() => expect(placeOf(container, "gemma4:e2b-it-qat")).toBe("2"));
    fireEvent.click(button(container, "Move gemma4:e2b-it-qat up"));
    await waitFor(() => expect(placeOf(container, "gemma4:e2b-it-qat")).toBe("1"));
    expect(placeOf(container, "qwen2.5vl:3b")).toBe("2");
    expect(savedOrders()).toEqual([{ text_model_routing_order: ["gemma4:e2b-it-qat", "qwen2.5vl:3b", "qwen3.5:4b"] }]);
  });

  it("A on the button (the Deck's OK path) moves it and stops there: nothing closes or removes", async () => {
    const { container } = renderBox(DECK);
    await waitFor(() => expect(placeOf(container, "qwen2.5vl:3b")).toBe("1"));
    const down = button(container, "Move qwen2.5vl:3b down");
    const stop = vi.fn();
    (hoisted.propsByEl.get(down)!.onOKButton as (e: unknown) => void)({ stopPropagation: stop });
    expect(stop).toHaveBeenCalled();
    await waitFor(() => expect(placeOf(container, "qwen2.5vl:3b")).toBe("2"));
    expect(getRpcCallLog().some((c) => c.method === "delete_ollama_model")).toBe(false);
  });

  it("a click inside the confirm box's form does not submit the form", async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    const { container } = render(
      <form onSubmit={onSubmit}>
        <PullModelsModal activeRoutingTag={null} onCancel={() => {}} onPullAccepted={() => {}} embedded tryOrderHost={DECK} />
      </form>,
    );
    await waitFor(() => expect(placeOf(container, "gemma4:e2b-it-qat")).toBe("2"));
    fireEvent.click(button(container, "Move gemma4:e2b-it-qat up"));
    await waitFor(() => expect(placeOf(container, "gemma4:e2b-it-qat")).toBe("1"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("the ring stays on the button that was pressed, even when that press takes it to the end", async () => {
    const { container } = renderBox(DECK);
    await waitFor(() => expect(placeOf(container, "gemma4:e2b-it-qat")).toBe("2"));
    const up = button(container, "Move gemma4:e2b-it-qat up");
    up.focus();
    fireEvent.click(up);
    await waitFor(() => expect(placeOf(container, "gemma4:e2b-it-qat")).toBe("1"));
    // Now first in the order, the button is dim but is the same element, still focusable, still holding the ring.
    expect(button(container, "Move gemma4:e2b-it-qat up")).toBe(up);
    expect(up.getAttribute("aria-disabled")).toBe("true");
    expect(up.hasAttribute("disabled")).toBe(false);
    expect(document.activeElement).toBe(up);
  });

  it("a press does not close the box or start a pull", async () => {
    const onCancel = vi.fn();
    const onPullAccepted = vi.fn();
    const { container } = renderBox(DECK, { onCancel, onPullAccepted });
    await waitFor(() => expect(placeOf(container, "gemma4:e2b-it-qat")).toBe("2"));
    fireEvent.click(button(container, "Move gemma4:e2b-it-qat up"));
    await waitFor(() => expect(placeOf(container, "gemma4:e2b-it-qat")).toBe("1"));
    expect(onCancel).not.toHaveBeenCalled();
    expect(onPullAccepted).not.toHaveBeenCalled();
    expect(getRpcCallLog().some((c) => c.method === "pull_ollama_models" || c.method === "delete_ollama_model")).toBe(false);
  });

  it("the Down button, the switch and Reset do not submit the confirm box's form either", async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    const { container } = render(
      <form onSubmit={onSubmit}>
        <PullModelsModal activeRoutingTag={null} onCancel={() => {}} onPullAccepted={() => {}} embedded tryOrderHost={DECK} />
      </form>,
    );
    await waitFor(() => expect(placeOf(container, "qwen2.5vl:3b")).toBe("1"));
    fireEvent.click(button(container, "Move qwen2.5vl:3b down"));
    await waitFor(() => expect(placeOf(container, "qwen2.5vl:3b")).toBe("2"));
    fireEvent.click(button(container, "Try order for pictures questions"));
    fireEvent.click(button(container, "Reset the try order to automatic"));
    await new Promise((r) => setTimeout(r, 30));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("opening the box and switching sides writes no order", async () => {
    const { container } = renderBox(DECK);
    await waitFor(() => expect(placeOf(container, "qwen2.5vl:3b")).toBe("1"));
    fireEvent.click(button(container, "Try order for pictures questions"));
    fireEvent.click(button(container, "Try order for text questions"));
    await new Promise((r) => setTimeout(r, 30));
    expect(savedOrders()).toEqual([]);
  });

  it("at the top or bottom of the order the button stays, dim, and does nothing", async () => {
    const { container } = renderBox(DECK);
    await waitFor(() => expect(placeOf(container, "qwen2.5vl:3b")).toBe("1"));
    const top = button(container, "Move qwen2.5vl:3b up");
    expect(top.getAttribute("aria-disabled")).toBe("true");
    expect(top.hasAttribute("disabled")).toBe(false); // still a place the ring can stand on
    fireEvent.click(top);
    await new Promise((r) => setTimeout(r, 30));
    expect(savedOrders()).toEqual([]);
  });

  it("Reset order puts the order back to automatic", async () => {
    setRpcHandler("load_settings", () => ({
      ...defaultSettingsFixture(),
      text_model_routing_order: ["gemma4:e2b-it-qat", "qwen2.5vl:3b", "qwen3.5:4b"],
    }));
    const { container } = renderBox(DECK);
    await waitFor(() => expect(placeOf(container, "gemma4:e2b-it-qat")).toBe("1"));
    fireEvent.click(button(container, "Reset the try order to automatic"));
    await waitFor(() => expect(savedOrders()).toEqual([{ text_model_routing_order: [] }]));
    await waitFor(() => expect(placeOf(container, "qwen2.5vl:3b")).toBe("1"));
  });

  it("a star pressed in the box moves the places too", async () => {
    const { container } = renderBox(DECK);
    await waitFor(() => expect(placeOf(container, "qwen3.5:4b")).toBe("3"));
    // "Use for Ask" puts the model first on disk; the box reads the order again.
    setRpcHandler("load_settings", () => ({
      ...defaultSettingsFixture(),
      text_model_routing_order: ["qwen3.5:4b", "qwen2.5vl:3b", "gemma4:e2b-it-qat"],
    }));
    fireEvent.click(button(container, "Use qwen3.5:4b for Ask"));
    await waitFor(() => expect(placeOf(container, "qwen3.5:4b")).toBe("1"));
  });
});

describe("the AI on a PC", () => {
  it("the places belong to the PC's models, not the Deck's", async () => {
    setRpcHandler("test_ollama_connection", (target) =>
      String(target).startsWith("192.168.1.20")
        ? { reachable: true, models: ["gemma4:e2b-it-qat", "qwen3.5:4b"] }
        : { reachable: true, models: DECK_MODELS },
    );
    const { container } = renderBox(PC);
    await waitFor(() => expect(placeOf(container, "gemma4:e2b-it-qat")).toBe("1"));
    expect(placeOf(container, "qwen3.5:4b")).toBe("2");
    // On the Deck but not on the PC: it cannot be tried, so it has no place to show.
    expect(placeOf(container, "qwen2.5vl:3b")).toBeNull();
    expect(container.textContent).toContain("These places are for the PC the AI runs on.");
    fireEvent.click(button(container, "Move qwen3.5:4b up"));
    await waitFor(() => expect(savedOrders()).toEqual([{ text_model_routing_order: ["qwen3.5:4b", "gemma4:e2b-it-qat"] }]));
  });
});

describe("what the old order screens refused, now said inside the box", () => {
  it("with no PC address", async () => {
    const { container } = renderBox({ ...PC, ollamaIp: "" });
    await waitFor(() => expect(container.textContent).toContain("Enter a PC address on the Ollama tab first"));
    expect(container.querySelector(".bonsai-pullmodels-place-num")).toBeNull();
  });

  it("when the PC cannot be reached", async () => {
    setRpcHandler("test_ollama_connection", (target) => {
      if (String(target).startsWith("192.168.1.20")) throw new Error("no route to host");
      return { reachable: true, models: DECK_MODELS };
    });
    const { container } = renderBox(PC);
    await waitFor(() => expect(container.textContent).toContain("Could not list models"));
  });

  it("when nothing that can answer is installed", async () => {
    setRpcHandler("test_ollama_connection", () => ({ reachable: true, models: ["nomic-embed-text:latest"] }));
    const { container } = renderBox(DECK);
    await waitFor(() => expect(container.textContent).toContain("No installed models"));
  });
});

describe("a model the filters hide", () => {
  it("keeps its place; the numbers skip it and one quiet line says how many", async () => {
    // gemma3:4b is open-weight: the default licence filter (open source only) hides its row.
    setRpcHandler("test_ollama_connection", () => ({
      reachable: true,
      models: ["gemma3:4b", "qwen2.5vl:3b", "gemma4:e2b-it-qat"],
    }));
    setRpcHandler("load_settings", () => ({
      ...defaultSettingsFixture(),
      text_model_routing_order: ["qwen2.5vl:3b", "gemma3:4b", "gemma4:e2b-it-qat"],
    }));
    const { container } = renderBox(DECK);
    await waitFor(() => expect(placeOf(container, "gemma4:e2b-it-qat")).toBe("3"));
    expect(placeOf(container, "qwen2.5vl:3b")).toBe("1");
    expect(container.textContent).toContain("1 model in the order is hidden by the filters.");
  });
});

describe("walking the box with the D-pad", () => {
  const labelOf = (el: Element) => el.getAttribute("aria-label") ?? el.textContent ?? "";
  const press = (name: string): boolean => {
    const el = document.activeElement as HTMLElement;
    const handler = hoisted.propsByEl.get(el)?.[name] as (() => boolean) | undefined;
    if (!handler) throw new Error(`${labelOf(el)} carries no ${name}`);
    const moved = handler();
    const now = document.activeElement as HTMLElement | null;
    const list = document.querySelector<HTMLElement>(".bonsai-pullmodels-list");
    if (now && list && list.contains(now)) steamNearest(list, now); // Steam scrolls what took the ring
    return moved;
  };

  it("goes Down switch, stars, never a place button or Remove, and back Up with no stop twice", async () => {
    const { container } = renderBox(DECK);
    await waitFor(() => expect(placeOf(container, "qwen2.5vl:3b")).toBe("1"));
    const list = container.querySelector<HTMLElement>(".bonsai-pullmodels-list")!;
    const { header } = layOutList(list);
    Element.prototype.scrollIntoView = function (this: Element) {
      if (list.contains(this)) steamNearest(list, this as HTMLElement);
    };
    const below = (el: Element, where: string) => {
      const row = el.closest(".bonsai-pullmodels-table-row--data");
      if (!row) return;
      expect(row.getBoundingClientRect().top, `${where}: row under the header`).toBeGreaterThanOrEqual(header.getBoundingClientRect().bottom);
      expect(el.getBoundingClientRect().bottom, `${where}: button in view`).toBeLessThanOrEqual(LIST_TOP + LIST_HEIGHT);
    };

    const filters = container.querySelector<HTMLButtonElement>(".bonsai-pullmodels-filters-button")!;
    filters.focus();
    // Down from Filters reaches the switch first, on the side that is on.
    expect(press("onMoveDown")).toBe(true);
    expect(labelOf(document.activeElement!)).toBe("Try order for text questions");
    const visited: Element[] = [document.activeElement!];
    for (let guard = 0; guard < 40; guard++) {
      if (!press("onMoveDown")) break;
      const el = document.activeElement!;
      expect(visited, `stop visited twice: ${labelOf(el)}`).not.toContain(el);
      expect(el.className, `Down landed on ${labelOf(el)}`).not.toMatch(/place-btn|delete-btn/);
      visited.push(el);
      below(el, `down at ${labelOf(el)}`);
    }
    // The switch plus the three answering models' stars and the note-search model's own star.
    expect(visited.length).toBe(1 + 4);
    expect(list.scrollTop).toBeGreaterThanOrEqual(0);

    const up: Element[] = [];
    for (let guard = 0; guard < 40; guard++) {
      const el = document.activeElement!;
      if (labelOf(el) === "Try order for text questions") break;
      expect(up, `stop visited twice on the way up: ${labelOf(el)}`).not.toContain(el);
      expect(el.className).not.toMatch(/place-btn|delete-btn/);
      up.push(el);
      expect(press("onMoveUp"), `Up from ${labelOf(el)} went nowhere`).toBe(true);
      below(document.activeElement!, `up at ${labelOf(el)}`);
    }
    expect(labelOf(document.activeElement!)).toBe("Try order for text questions");
    expect(up.length).toBe(visited.length - 1);
    expect(list.scrollTop).toBe(0);
    expect(press("onMoveUp")).toBe(true);
    expect(document.activeElement).toBe(filters);
  });

  it("along a row it walks star, up, down, Remove by Right and back by Left, and Up or Down from a place button is the row's own", async () => {
    const { container } = renderBox(DECK);
    await waitFor(() => expect(placeOf(container, "qwen2.5vl:3b")).toBe("1"));
    const list = container.querySelector<HTMLElement>(".bonsai-pullmodels-list")!;
    layOutList(list);
    Element.prototype.scrollIntoView = function (this: Element) {
      if (list.contains(this)) steamNearest(list, this as HTMLElement);
    };
    const row = rowOf(container, "gemma4:e2b-it-qat");
    row.querySelector<HTMLElement>(".bonsai-pullmodels-slot")!.focus();
    const walk = (dir: "onMoveRight" | "onMoveLeft") => {
      press(dir);
      return labelOf(document.activeElement!);
    };
    expect(walk("onMoveRight")).toBe("Move gemma4:e2b-it-qat up");
    expect(walk("onMoveRight")).toBe("Move gemma4:e2b-it-qat down");
    // Down from a place button goes to the next row's star, not along the row and not to Remove.
    press("onMoveDown");
    expect(document.activeElement?.className).toMatch(/bonsai-pullmodels-slot/);
    expect(document.activeElement).not.toBe(row.querySelector(".bonsai-pullmodels-slot"));
    rowOf(container, "gemma4:e2b-it-qat").querySelector<HTMLElement>(`button[aria-label="Move gemma4:e2b-it-qat down"]`)!.focus();
    expect(walk("onMoveRight")).toBe("Remove from Deck");
    expect(walk("onMoveLeft")).toBe("Move gemma4:e2b-it-qat down");
    expect(walk("onMoveLeft")).toBe("Move gemma4:e2b-it-qat up");
    expect(walk("onMoveLeft")).toMatch(/^(Use gemma4:e2b-it-qat for Ask|gemma4:e2b-it-qat is used for Ask)$/);
  });
});
