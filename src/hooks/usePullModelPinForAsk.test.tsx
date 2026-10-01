/**
 * Title: "Use for Ask" tells the screen what it saved
 * Purpose: Pin that choosing a model on the AI models screen leaves the plugin's own screen,
 *          and the "edit order" popup, knowing the new try order once that screen closes.
 * Used for: the Deck finding of 2026-10-01 (P78-ORDER-PRUNE): "Use for Ask" saved the new order
 *           straight to disk, but the screen is rebuilt from a note taken BEFORE the popup opened,
 *           so it came back holding the old order.
 * Does not: render the models screen; the hook is called the way PullModelsModal calls it.
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { call } from "@decky/api";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { usePullModelPinForAsk } from "./usePullModelPinForAsk";
import { usePluginSettings } from "./usePluginSettings";
import type { PullModelEntry } from "../data/pullModelCatalog";
import type { BonsaiSettingsSnapshotInput } from "../data/bonsaiSettingsSchema";
import {
  captureBonsaiSessionForModal,
  clearBonsaiSessionSurvival,
  consumeBonsaiSessionAfterRemount,
  type BonsaiSessionSurvivalSnapshot,
} from "../utils/bonsaiSessionSurvival";
import { defaultSettingsFixture } from "../test-harness/rpcFixtures";
import { dispatchFakeRpc, resetFakeDeckyRpc, setRpcHandler } from "../test-harness/fakeDeckyRpc";

/** Only `settingsSnapshot` is read on these paths; the survival module treats the rest as opaque. */
function pendingSessionWithOrders(text: string[], vision: string[]): BonsaiSessionSurvivalSnapshot {
  return {
    currentTab: "ollama",
    settingsSnapshot: {
      textModelRoutingOrder: text,
      visionModelRoutingOrder: vision,
    } as unknown as BonsaiSettingsSnapshotInput,
  } as unknown as BonsaiSessionSurvivalSnapshot;
}

describe("usePullModelPinForAsk", () => {
  let disk: Record<string, unknown>;

  beforeEach(() => {
    resetFakeDeckyRpc();
    clearBonsaiSessionSurvival();
    vi.mocked(call).mockImplementation((method: string, ...args: unknown[]) =>
      dispatchFakeRpc(method, args) as ReturnType<typeof call>
    );
    disk = { ...defaultSettingsFixture(), text_model_routing_order: [], vision_model_routing_order: [] };
    setRpcHandler("load_settings", () => disk);
    setRpcHandler("save_settings", (...args: unknown[]) => {
      disk = { ...disk, ...((args[0] as Record<string, unknown>) ?? {}) };
      return disk;
    });
  });

  async function pin(tag: string, entry: PullModelEntry | null = null) {
    const { result } = renderHook(() =>
      usePullModelPinForAsk({ pinBusyTag: null, setPinBusyTag: () => {}, setPinnedAskTag: () => {} }),
    );
    await act(async () => {
      await result.current.pinModelForAsk(entry, tag);
    });
  }

  it("writes the new order into the note the screen is rebuilt from", async () => {
    captureBonsaiSessionForModal(pendingSessionWithOrders([], []));
    await pin("gemma4:e2b-it-qat");
    expect(disk.text_model_routing_order).toEqual(["gemma4:e2b-it-qat"]);
    expect(consumeBonsaiSessionAfterRemount()?.settingsSnapshot.textModelRoutingOrder).toEqual([
      "gemma4:e2b-it-qat",
    ]);
  });

  it("writes the vision order too for a model that can read pictures, and leaves other fields alone", async () => {
    captureBonsaiSessionForModal(pendingSessionWithOrders(["old-text"], ["old-vision"]));
    disk.text_model_routing_order = ["old-text"];
    disk.vision_model_routing_order = ["old-vision"];
    await pin("qwen2.5vl:3b", { tags: ["vision"] } as unknown as PullModelEntry);
    const restored = consumeBonsaiSessionAfterRemount()?.settingsSnapshot;
    expect(restored?.textModelRoutingOrder).toEqual(["qwen2.5vl:3b", "old-text"]);
    expect(restored?.visionModelRoutingOrder).toEqual(["qwen2.5vl:3b", "old-vision"]);
  });

  it("after the models screen closes, the rebuilt settings screen holds the new order", async () => {
    // The screen opened with an empty order and a note was taken for the popup (a whole settings
    // copy, as the real note holds).
    const before = renderHook(() => usePluginSettings());
    await waitFor(() => expect(before.result.current.settingsLoaded).toBe(true));
    captureBonsaiSessionForModal({
      currentTab: "ollama",
      settingsSnapshot: before.result.current.settingsSnapshot,
    } as unknown as BonsaiSessionSurvivalSnapshot);
    before.unmount();

    await pin("gemma4:e2b-it-qat");

    // The popup closes: the screen is rebuilt, restores from the note, then loads from disk.
    consumeBonsaiSessionAfterRemount();
    const { result } = renderHook(() => usePluginSettings());
    await waitFor(() => expect(result.current.settingsLoaded).toBe(true));
    expect(result.current.textModelRoutingOrder).toEqual(["gemma4:e2b-it-qat"]);
  });
});
