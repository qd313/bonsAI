/**
 * Title: Opening the AI models screen refreshes the note the plugin is rebuilt from
 * Purpose: Pin that the try orders the back end changed on its own (a finished download joining
 *          them, a removed model dropped) reach the note taken before this screen opened, so the
 *          plugin does not come back from it holding the older orders.
 * Used for: P78-ORDER-PRUNE, Deck 2026-10-01.
 */
import { renderHook, waitFor } from "@testing-library/react";
import { call } from "@decky/api";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { usePullModelOpenBookkeeping } from "./usePullModelOpenBookkeeping";
import type { BonsaiSettingsSnapshotInput } from "../data/bonsaiSettingsSchema";
import {
  captureBonsaiSessionForModal,
  clearBonsaiSessionSurvival,
  consumeBonsaiSessionAfterRemount,
  type BonsaiSessionSurvivalSnapshot,
} from "../utils/bonsaiSessionSurvival";
import { defaultSettingsFixture } from "../test-harness/rpcFixtures";
import { dispatchFakeRpc, getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../test-harness/fakeDeckyRpc";

describe("usePullModelOpenBookkeeping", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
    clearBonsaiSessionSurvival();
    vi.mocked(call).mockImplementation((method: string, ...args: unknown[]) =>
      dispatchFakeRpc(method, args) as ReturnType<typeof call>
    );
  });

  it("puts the orders disk holds now into the pre-popup note, and saves nothing", async () => {
    captureBonsaiSessionForModal({
      currentTab: "ollama",
      settingsSnapshot: {
        textModelRoutingOrder: ["old"],
        visionModelRoutingOrder: [],
        showOnscreenDebugHud: true,
      } as unknown as BonsaiSettingsSnapshotInput,
    } as unknown as BonsaiSessionSurvivalSnapshot);
    setRpcHandler("load_settings", () => ({
      ...defaultSettingsFixture(),
      text_model_routing_order: ["gemma4:e2b-it-qat"],
      vision_model_routing_order: ["qwen2.5vl:3b"],
    }));
    const setPinnedAskTag = vi.fn();

    renderHook(() =>
      usePullModelOpenBookkeeping({ installedTags: new Set<string>(), setPinnedAskTag, setPullRecord: () => {} }),
    );
    await waitFor(() => expect(setPinnedAskTag).toHaveBeenCalledWith("gemma4:e2b-it-qat"));

    const restored = consumeBonsaiSessionAfterRemount()?.settingsSnapshot;
    expect(restored?.textModelRoutingOrder).toEqual(["gemma4:e2b-it-qat"]);
    expect(restored?.visionModelRoutingOrder).toEqual(["qwen2.5vl:3b"]);
    expect((restored as unknown as { showOnscreenDebugHud: boolean }).showOnscreenDebugHud).toBe(true);
    expect(getRpcCallLog().filter((c) => c.method === "save_settings")).toHaveLength(0);
  });
});
