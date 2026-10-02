/**
 * Title: The AI models box's try-order places
 * Purpose: Pins what the box's Text / Pictures switch and place buttons rest on: which computer's
 *          models get a place, that a move is saved to disk at once (and into the session snapshot
 *          Decky restores from), that a move starts from the order on disk now, and the refusals the
 *          old order screens showed.
 * Used for: `useTryOrderPlaces.ts`, as the Browse screen (`PullModelsModal.tsx`) uses it.
 * Solves: The old order screens kept their own copy of this logic (connection test, fresh read of the
 *         saved order, save plus snapshot patch); folding them into the box must keep every one of
 *         those rules, which `useRoutingOrderModal.test.tsx` pinned for the old screens.
 * Does not: Draw anything or walk the D-pad; `PullModelsModal.tryOrder.test.tsx` does both.
 */
import { act, render, waitFor } from "@testing-library/react";
import { toaster } from "@decky/api";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  placeCountHidden,
  resolveOrderTag,
  useTryOrderPlaces,
  type TryOrderHost,
  type TryOrderPlaces,
} from "./useTryOrderPlaces";
import type { BonsaiSettings, BonsaiSettingsSnapshotInput } from "../../data/bonsaiSettingsSchema";
import {
  captureBonsaiSessionForModal,
  clearBonsaiSessionSurvival,
  consumeBonsaiSessionAfterRemount,
  type BonsaiSessionSurvivalSnapshot,
} from "../../utils/bonsaiSessionSurvival";
import { defaultSettingsFixture } from "../../test-harness/rpcFixtures";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";

const DECK_HOST: TryOrderHost = {
  ollamaLocalOnDeck: true,
  ollamaIp: "",
  textModelRoutingOrder: [],
  visionModelRoutingOrder: [],
  modelAllowHighVramFallbacks: true,
};
const PC_HOST: TryOrderHost = { ...DECK_HOST, ollamaLocalOnDeck: false, ollamaIp: "192.168.1.20" };

function sessionWithOrders(text: string[], vision: string[]): BonsaiSessionSurvivalSnapshot {
  return {
    currentTab: "ollama",
    settingsSnapshot: { textModelRoutingOrder: text, visionModelRoutingOrder: vision } as unknown as BonsaiSettingsSnapshotInput,
  } as unknown as BonsaiSessionSurvivalSnapshot;
}

type ProbeArgs = { host?: TryOrderHost; deckInstalled?: string[]; deckLoading?: boolean; refreshKey?: string | null };

/** Renders the hook and hands back its latest value. */
function mountPlaces(args: ProbeArgs = {}) {
  const box: { latest: TryOrderPlaces | null } = { latest: null };
  function Probe(p: ProbeArgs) {
    box.latest = useTryOrderPlaces({
      host: p.host,
      deckInstalled: new Set(p.deckInstalled ?? []),
      deckLoading: p.deckLoading ?? false,
      refreshKey: p.refreshKey ?? null,
    });
    return null;
  }
  const view = render(<Probe {...args} />);
  return { box, rerender: (next: ProbeArgs) => view.rerender(<Probe {...next} />) };
}

const savedBody = () => getRpcCallLog().filter((c) => c.method === "save_settings").map((c) => c.args[0] as Partial<BonsaiSettings>);

beforeEach(() => {
  resetFakeDeckyRpc();
  clearBonsaiSessionSurvival();
  vi.mocked(toaster.toast).mockClear();
  setRpcHandler("load_settings", () => defaultSettingsFixture());
});

describe("which computer's models get a place", () => {
  it("is off without a host: no places, no switch to draw", () => {
    const { box } = mountPlaces({ host: undefined, deckInstalled: ["a:1b"] });
    expect(box.latest!.status).toBe("off");
  });

  it("uses the Deck's own models when the AI runs on the Deck, and asks no other computer", async () => {
    const { box } = mountPlaces({ host: DECK_HOST, deckInstalled: ["gemma4:e2b-it-qat", "qwen3.5:4b", "nomic-embed-text:latest"] });
    await waitFor(() => expect(box.latest!.status).toBe("ready"));
    // A note-search model can never answer, so it gets no place.
    expect(box.latest!.placeOf("nomic-embed-text:latest")).toBeNull();
    expect(box.latest!.placeOf("gemma4:e2b-it-qat")).toBe(1);
    expect(box.latest!.placeOf("qwen3.5:4b")).toBe(2);
    expect(getRpcCallLog().filter((c) => c.method === "test_ollama_connection")).toHaveLength(0);
  });

  it("with the AI on a PC, the places belong to the PC's models, not the Deck's", async () => {
    setRpcHandler("test_ollama_connection", () => ({ reachable: true, models: ["qwen3:14b", "gemma4:e2b-it-qat"] }));
    const { box } = mountPlaces({ host: PC_HOST, deckInstalled: ["qwen3.5:4b", "gemma4:e2b-it-qat"] });
    await waitFor(() => expect(box.latest!.status).toBe("ready"));
    const asked = getRpcCallLog().find((c) => c.method === "test_ollama_connection");
    expect(asked?.args[0]).toBe("192.168.1.20");
    expect(box.latest!.placeOf("qwen3.5:4b")).toBeNull(); // on the Deck only: cannot be tried
    expect(box.latest!.placeOf("gemma4:e2b-it-qat")).toBe(1);
    expect(box.latest!.placeOf("qwen3:14b")).toBe(2);
  });

  it("Pictures lists only models that can read pictures", async () => {
    const { box } = mountPlaces({ host: DECK_HOST, deckInstalled: ["qwen2.5vl:3b", "gemma4:e2b-it-qat", "qwen2.5:7b"] });
    await waitFor(() => expect(box.latest!.status).toBe("ready"));
    expect(box.latest!.placeOf("qwen2.5:7b")).not.toBeNull();
    act(() => box.latest!.setKind("vision"));
    expect(box.latest!.kind).toBe("vision");
    expect(box.latest!.placeOf("qwen2.5:7b")).toBeNull();
    expect(box.latest!.placeOf("qwen2.5vl:3b")).toBe(1);
  });
});

describe("the refusals the old order screens made, now inside the box", () => {
  it("no PC address and the AI not on the Deck: says so, no places", async () => {
    const { box } = mountPlaces({ host: { ...PC_HOST, ollamaIp: "  " } });
    await waitFor(() => expect(box.latest!.status).toBe("refused"));
    expect(box.latest!.refusal).toMatch(/PC address/);
    expect(getRpcCallLog().filter((c) => c.method === "test_ollama_connection")).toHaveLength(0);
  });

  it("a PC that cannot be reached: says why", async () => {
    setRpcHandler("test_ollama_connection", () => {
      throw new Error("no route to host");
    });
    const { box } = mountPlaces({ host: PC_HOST });
    await waitFor(() => expect(box.latest!.status).toBe("refused"));
    expect(box.latest!.refusal).toMatch(/Could not list models/);
  });

  it("no installed model: says to pull one", async () => {
    const { box } = mountPlaces({ host: DECK_HOST, deckInstalled: ["nomic-embed-text:latest"] });
    await waitFor(() => expect(box.latest!.status).toBe("refused"));
    expect(box.latest!.refusal).toMatch(/No installed models/);
  });

  it("waits while the Deck is still listing its models", () => {
    const { box } = mountPlaces({ host: DECK_HOST, deckLoading: true });
    expect(box.latest!.status).toBe("loading");
  });
});

describe("a place change saves at once", () => {
  it("swaps a model with its neighbour, writes the full order, and updates the session snapshot", async () => {
    captureBonsaiSessionForModal(sessionWithOrders([], []));
    const { box } = mountPlaces({ host: DECK_HOST, deckInstalled: ["gemma4:e2b-it-qat", "qwen3.5:4b", "qwen2.5vl:3b"] });
    await waitFor(() => expect(box.latest!.status).toBe("ready"));
    // The seed order puts qwen2.5vl:3b first, then gemma4:e2b-it-qat, then the rest.
    expect(box.latest!.placeOf("qwen2.5vl:3b")).toBe(1);
    await act(async () => {
      await box.latest!.move("gemma4:e2b-it-qat", -1);
    });
    expect(savedBody()).toEqual([{ text_model_routing_order: ["gemma4:e2b-it-qat", "qwen2.5vl:3b", "qwen3.5:4b"] }]);
    expect(box.latest!.placeOf("gemma4:e2b-it-qat")).toBe(1);
    expect(box.latest!.placeOf("qwen2.5vl:3b")).toBe(2);
    expect(consumeBonsaiSessionAfterRemount()?.settingsSnapshot.textModelRoutingOrder).toEqual([
      "gemma4:e2b-it-qat",
      "qwen2.5vl:3b",
      "qwen3.5:4b",
    ]);
  });

  it("moves the Pictures order on its own, and leaves the text order alone", async () => {
    const { box } = mountPlaces({ host: DECK_HOST, deckInstalled: ["qwen2.5vl:3b", "qwen3.5:4b"] });
    await waitFor(() => expect(box.latest!.status).toBe("ready"));
    act(() => box.latest!.setKind("vision"));
    await act(async () => {
      await box.latest!.move("qwen2.5vl:3b", 1);
    });
    expect(savedBody()).toEqual([{ vision_model_routing_order: ["qwen3.5:4b", "qwen2.5vl:3b"] }]);
  });

  it("does nothing at the ends", async () => {
    const { box } = mountPlaces({ host: DECK_HOST, deckInstalled: ["qwen2.5vl:3b", "qwen3.5:4b"] });
    await waitFor(() => expect(box.latest!.status).toBe("ready"));
    await act(async () => {
      await box.latest!.move("qwen2.5vl:3b", -1);
    });
    expect(savedBody()).toEqual([]);
  });

  it("starts from the order on disk now, so a star pressed meanwhile is not undone", async () => {
    const { box } = mountPlaces({ host: DECK_HOST, deckInstalled: ["a:1b", "b:1b", "c:1b"] });
    await waitFor(() => expect(box.latest!.status).toBe("ready"));
    // "Use for Ask" put c first on disk after the box read the order.
    setRpcHandler("load_settings", () => ({ ...defaultSettingsFixture(), text_model_routing_order: ["c:1b", "a:1b", "b:1b"] }));
    await act(async () => {
      await box.latest!.move("b:1b", -1);
    });
    expect(savedBody()).toEqual([{ text_model_routing_order: ["c:1b", "b:1b", "a:1b"] }]);
  });

  it("two quick presses are applied one after the other", async () => {
    const disk: { order: string[] } = { order: [] };
    setRpcHandler("load_settings", () => ({ ...defaultSettingsFixture(), text_model_routing_order: disk.order }));
    setRpcHandler("save_settings", (patch) => {
      disk.order = (patch as { text_model_routing_order: string[] }).text_model_routing_order;
      return { ...defaultSettingsFixture(), text_model_routing_order: disk.order };
    });
    const { box } = mountPlaces({ host: DECK_HOST, deckInstalled: ["a:1b", "b:1b", "c:1b"] });
    await waitFor(() => expect(box.latest!.status).toBe("ready"));
    await act(async () => {
      await Promise.all([box.latest!.move("a:1b", 1), box.latest!.move("a:1b", 1)]);
    });
    expect(disk.order).toEqual(["b:1b", "c:1b", "a:1b"]);
  });

  it("a failed save says so and leaves the places as they were", async () => {
    setRpcHandler("save_settings", () => {
      throw new Error("disk full");
    });
    const { box } = mountPlaces({ host: DECK_HOST, deckInstalled: ["a:1b", "b:1b"] });
    await waitFor(() => expect(box.latest!.status).toBe("ready"));
    await act(async () => {
      await box.latest!.move("a:1b", 1);
    });
    expect(toaster.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Could not save the order" }));
    expect(box.latest!.placeOf("a:1b")).toBe(1);
  });

  it("Reset order goes back to automatic: saves an empty list", async () => {
    setRpcHandler("load_settings", () => ({ ...defaultSettingsFixture(), text_model_routing_order: ["b:1b", "a:1b"] }));
    const { box } = mountPlaces({ host: DECK_HOST, deckInstalled: ["a:1b", "b:1b"] });
    await waitFor(() => expect(box.latest!.status).toBe("ready"));
    await waitFor(() => expect(box.latest!.placeOf("b:1b")).toBe(1));
    expect(box.latest!.isAutomatic).toBe(false);
    await act(async () => {
      await box.latest!.reset();
    });
    expect(savedBody()).toEqual([{ text_model_routing_order: [] }]);
    expect(box.latest!.isAutomatic).toBe(true);
  });

  it("a saved order that still names a note-search model is saved clean by the next move", async () => {
    setRpcHandler("load_settings", () => ({
      ...defaultSettingsFixture(),
      text_model_routing_order: ["nomic-embed-text:latest", "a:1b", "b:1b"],
    }));
    const { box } = mountPlaces({ host: DECK_HOST, deckInstalled: ["a:1b", "b:1b", "nomic-embed-text:latest"] });
    await waitFor(() => expect(box.latest!.status).toBe("ready"));
    await waitFor(() => expect(box.latest!.order).toEqual(["a:1b", "b:1b"]));
    await act(async () => {
      await box.latest!.move("a:1b", 1);
    });
    expect(savedBody()).toEqual([{ text_model_routing_order: ["b:1b", "a:1b"] }]);
  });

  it("a move after Reset saves the new order as a list, not automatic", async () => {
    setRpcHandler("load_settings", () => ({ ...defaultSettingsFixture(), text_model_routing_order: ["b:1b", "a:1b"] }));
    const { box } = mountPlaces({ host: DECK_HOST, deckInstalled: ["a:1b", "b:1b"] });
    await waitFor(() => expect(box.latest!.placeOf("b:1b")).toBe(1));
    await act(async () => {
      await box.latest!.reset();
    });
    setRpcHandler("load_settings", () => defaultSettingsFixture()); // disk now holds the empty list
    await act(async () => {
      await box.latest!.move("a:1b", 1);
    });
    expect(savedBody()).toEqual([
      { text_model_routing_order: [] },
      { text_model_routing_order: ["b:1b", "a:1b"] },
    ]);
  });

  it("opening the box and switching between Text and Pictures writes nothing", async () => {
    const { box } = mountPlaces({ host: DECK_HOST, deckInstalled: ["qwen2.5vl:3b", "qwen3.5:4b"] });
    await waitFor(() => expect(box.latest!.status).toBe("ready"));
    act(() => box.latest!.setKind("vision"));
    act(() => box.latest!.setKind("text"));
    expect(savedBody()).toEqual([]);
  });

  it("Reset order does nothing when the order is already automatic", async () => {
    const { box } = mountPlaces({ host: DECK_HOST, deckInstalled: ["a:1b", "b:1b"] });
    await waitFor(() => expect(box.latest!.status).toBe("ready"));
    await act(async () => {
      await box.latest!.reset();
    });
    expect(savedBody()).toEqual([]);
  });
});

/*
 * The old order screens started from the tab's own copy of the order when a fresh read of the settings
 * file failed or took too long (plan 78 round 3). The box does the same, for the places it first shows
 * and for the order a move starts from.
 */
describe("when the settings file cannot be read in time", () => {
  const HOST_WITH_ORDER: TryOrderHost = { ...DECK_HOST, textModelRoutingOrder: ["b:1b", "a:1b"] };

  it("the places start from the tab's copy when the read fails", async () => {
    setRpcHandler("load_settings", () => {
      throw new Error("backend down");
    });
    const { box } = mountPlaces({ host: HOST_WITH_ORDER, deckInstalled: ["a:1b", "b:1b"] });
    await waitFor(() => expect(box.latest!.status).toBe("ready"));
    expect(box.latest!.placeOf("b:1b")).toBe(1);
  });

  it("a move does not wait longer than the read's limit when the read hangs", async () => {
    setRpcHandler("load_settings", () => new Promise(() => {}));
    const { box } = mountPlaces({ host: HOST_WITH_ORDER, deckInstalled: ["a:1b", "b:1b"] });
    await waitFor(() => expect(box.latest!.status).toBe("ready"));
    vi.useFakeTimers();
    try {
      const moving = box.latest!.move("b:1b", 1);
      await vi.advanceTimersByTimeAsync(2000);
      await moving;
    } finally {
      vi.useRealTimers();
    }
    expect(savedBody()).toEqual([{ text_model_routing_order: ["a:1b", "b:1b"] }]);
  });
});

describe("a star pressed in the box moves the places", () => {
  it("reads the order again when the starred model changes", async () => {
    const { box, rerender } = mountPlaces({ host: DECK_HOST, deckInstalled: ["a:1b", "b:1b"], refreshKey: null });
    await waitFor(() => expect(box.latest!.status).toBe("ready"));
    expect(box.latest!.placeOf("a:1b")).toBe(1);
    setRpcHandler("load_settings", () => ({ ...defaultSettingsFixture(), text_model_routing_order: ["b:1b", "a:1b"] }));
    rerender({ host: DECK_HOST, deckInstalled: ["a:1b", "b:1b"], refreshKey: "b:1b" });
    await waitFor(() => expect(box.latest!.placeOf("b:1b")).toBe(1));
  });
});

describe("matching a table row to a place, and counting what the filters hide", () => {
  it("a catalog tag finds its installed name the way the table does", () => {
    expect(resolveOrderTag("gemma4:e2b", ["gemma4:e2b"])).toBe("gemma4:e2b");
    expect(resolveOrderTag("llama3", ["llama3:latest"])).toBe("llama3:latest");
    expect(resolveOrderTag("qwen3", ["qwen3:4b"])).toBe("qwen3:4b");
    expect(resolveOrderTag("qwen3.5:4b", ["qwen3:4b"])).toBeNull();
  });

  it("counts places no shown row owns", () => {
    const order = ["a:1b", "b:1b", "c:1b"];
    expect(placeCountHidden(order, ["a:1b", "c:1b"])).toBe(1);
    expect(placeCountHidden(order, [])).toBe(3);
    expect(placeCountHidden(order, ["a:1b", "b:1b", "c:1b"])).toBe(0);
  });
});
