/**
 * Title: Model try-order modal save wiring
 * Purpose: Pin that saving a try order also updates the session snapshot Decky's remount restores,
 *          so the order that was just written to disk is not overwritten by the old one.
 * Used for: the 2026-09-06 Deck finding — the settings file held the new order at 00:44:20.383 and
 *           the old empty one 0.6s later, so setting an order looked like it did nothing.
 * Solves: `showModal` closes the modal by remounting Content; the restore re-hydrates settings from
 *         the snapshot captured *before* the modal opened, and the debounced save then writes that
 *         stale value back. `useOllamaModelsHubModal` and `useCharacterPickerModal` already patch
 *         the snapshot after their saves; this opener was the third and did not.
 * Does not: Render the picker. The harness's `showModal` discards its argument
 *           (src/test-harness/fakeDeckyUi.tsx), so this file captures the element and calls the
 *           `onSave` prop directly — which is the same function the Done button calls.
 */
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useRoutingOrderModal, type UseRoutingOrderModalArgs } from "./useRoutingOrderModal";
import type { ModelRoutingOrderKind } from "../../components/ModelRoutingOrderModal";
import type { BonsaiSettings, BonsaiSettingsSnapshotInput } from "../../data/bonsaiSettingsSchema";
import {
  captureBonsaiSessionForModal,
  clearBonsaiSessionSurvival,
  consumeBonsaiSessionAfterRemount,
  type BonsaiSessionSurvivalSnapshot,
} from "../../utils/bonsaiSessionSurvival";
import { defaultSettingsFixture } from "../../test-harness/rpcFixtures";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";

const hoisted = vi.hoisted(() => ({ captured: null as { props: Record<string, unknown> } | null, shown: 0 }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  return {
    ...stubs,
    showModal: (content: unknown) => {
      hoisted.captured = content as { props: Record<string, unknown> };
      hoisted.shown += 1;
      return { Close: () => {} };
    },
  };
});

/**
 * Only `settingsSnapshot` is read on the path under test; the survival module treats the rest of the
 * snapshot as opaque and spreads it. Building all forty-odd session fields here would say nothing
 * extra, so the shape is asserted at its own boundary in `bonsaiSessionSurvival.test.ts`.
 */
function pendingSessionWithOrders(
  text: string[],
  vision: string[],
): BonsaiSessionSurvivalSnapshot {
  return {
    currentTab: "ollama",
    settingsSnapshot: {
      textModelRoutingOrder: text,
      visionModelRoutingOrder: vision,
    } as unknown as BonsaiSettingsSnapshotInput,
  } as unknown as BonsaiSessionSurvivalSnapshot;
}

function buildArgs(overrides: Partial<UseRoutingOrderModalArgs> = {}): UseRoutingOrderModalArgs {
  return {
    ollamaLocalOnDeck: true,
    ollamaIp: "",
    textModelRoutingOrder: [],
    visionModelRoutingOrder: [],
    setTextModelRoutingOrder: () => {},
    setVisionModelRoutingOrder: () => {},
    catalogByTag: new Map(),
    modelPolicyTier: "open_weight",
    modelPolicyNonFossUnlocked: false,
    modelAllowHighVramFallbacks: false,
    setLastConnectionStatus: () => {},
    captureSessionBeforeModal: () => {},
    finalizeShowModalAndRestoreActiveTab: (close: () => void) => close(),
    pauseDebouncedSettingsSave: async () => {},
    buildSettingsPayload: (patch: Partial<BonsaiSettings>) =>
      ({ text_model_routing_order: [], vision_model_routing_order: [], ...patch }) as BonsaiSettings,
    hydrateFromSettings: () => {},
    ...overrides,
  };
}

async function openPickerAndSave(
  kind: ModelRoutingOrderKind,
  order: string[],
  overrides: Partial<UseRoutingOrderModalArgs> = {},
): Promise<void> {
  let open: ((kind: ModelRoutingOrderKind) => Promise<void>) | null = null;
  function Probe() {
    open = useRoutingOrderModal(buildArgs(overrides));
    return null;
  }
  render(<Probe />);
  await open!(kind);
  const onSave = hoisted.captured?.props.onSave as (o: string[]) => Promise<void>;
  expect(typeof onSave).toBe("function");
  await onSave(order);
}

describe("useRoutingOrderModal", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
    clearBonsaiSessionSurvival();
    hoisted.captured = null;
    hoisted.shown = 0;
    setRpcHandler("test_ollama_connection", () => ({
      reachable: true,
      version: "0.5.0",
      models: ["gemma4:e2b-it-qat", "qwen3.5:4b", "qwen2.5:1.5b"],
    }));
  });

  it("sends the new text order to save_settings", async () => {
    await openPickerAndSave("text", ["qwen3.5:4b", "gemma4:e2b-it-qat"]);
    const save = getRpcCallLog().find((c) => c.method === "save_settings");
    expect((save?.args[0] as BonsaiSettings).text_model_routing_order).toEqual([
      "qwen3.5:4b",
      "gemma4:e2b-it-qat",
    ]);
  });

  it("updates the pre-modal session snapshot so the remount restore cannot revert the text order", async () => {
    captureBonsaiSessionForModal(pendingSessionWithOrders([], []));
    await openPickerAndSave("text", ["qwen3.5:4b", "gemma4:e2b-it-qat"]);
    expect(consumeBonsaiSessionAfterRemount()?.settingsSnapshot.textModelRoutingOrder).toEqual([
      "qwen3.5:4b",
      "gemma4:e2b-it-qat",
    ]);
  });

  it("updates the pre-modal session snapshot for the vision order, and leaves the text one alone", async () => {
    captureBonsaiSessionForModal(pendingSessionWithOrders(["gemma4:e2b-it-qat"], []));
    await openPickerAndSave("vision", ["qwen3.5:4b"]);
    const restored = consumeBonsaiSessionAfterRemount()?.settingsSnapshot;
    expect(restored?.visionModelRoutingOrder).toEqual(["qwen3.5:4b"]);
    expect(restored?.textModelRoutingOrder).toEqual(["gemma4:e2b-it-qat"]);
  });

  it("does not offer a note-search model as a choice in the picker", async () => {
    setRpcHandler("test_ollama_connection", () => ({
      reachable: true,
      version: "0.5.0",
      models: ["gemma4:e2b-it-qat", "nomic-embed-text:latest"],
    }));
    let open: ((kind: ModelRoutingOrderKind) => Promise<void>) | null = null;
    function Probe() {
      open = useRoutingOrderModal(buildArgs());
      return null;
    }
    render(<Probe />);
    await open!("text");
    expect(hoisted.captured?.props.installedTags).toEqual(["gemma4:e2b-it-qat"]);
  });

  it("never saves a note-search model into the answer order", async () => {
    await openPickerAndSave("text", ["nomic-embed-text:latest", "gemma4:e2b-it-qat"]);
    const save = getRpcCallLog().find((c) => c.method === "save_settings");
    expect((save?.args[0] as BonsaiSettings).text_model_routing_order).toEqual(["gemma4:e2b-it-qat"]);
  });

  /*
   * Plan 78 round 3: the popup used to start from the screen's own copy of the order, which is
   * stale after the models screen's "Use for Ask" or a back-end clean-up changed it on disk. It
   * reads the order fresh as it opens, and falls back to the screen's copy when that read fails
   * or takes longer than its short limit.
   */
  describe("the order the popup starts from", () => {
    async function openOnly(overrides: Partial<UseRoutingOrderModalArgs> = {}, presses = 1): Promise<void> {
      let open: ((kind: ModelRoutingOrderKind) => Promise<void>) | null = null;
      function Probe() {
        open = useRoutingOrderModal(buildArgs(overrides));
        return null;
      }
      render(<Probe />);
      await Promise.all(Array.from({ length: presses }, () => open!("text")));
    }

    it("starts from what disk holds, not the screen's older copy", async () => {
      setRpcHandler("load_settings", () => ({
        ...defaultSettingsFixture(),
        text_model_routing_order: ["gemma4:e2b-it-qat"],
      }));
      await openOnly({ textModelRoutingOrder: [] });
      expect(hoisted.captured?.props.savedOrder).toEqual(["gemma4:e2b-it-qat"]);
    });

    it("starts from the screen's copy when the read fails", async () => {
      setRpcHandler("load_settings", () => {
        throw new Error("backend down");
      });
      await openOnly({ textModelRoutingOrder: ["from-the-screen"] });
      expect(hoisted.captured?.props.savedOrder).toEqual(["from-the-screen"]);
    });

    it("does not wait longer than the read's limit when the read hangs", async () => {
      vi.useFakeTimers();
      try {
        setRpcHandler("load_settings", () => new Promise(() => {}));
        const opening = openOnly({ textModelRoutingOrder: ["from-the-screen"] });
        await vi.advanceTimersByTimeAsync(2000);
        await opening;
        expect(hoisted.captured?.props.savedOrder).toEqual(["from-the-screen"]);
      } finally {
        vi.useRealTimers();
      }
    });

    it("a second press while the first is still opening does not open a second popup", async () => {
      await openOnly({}, 2);
      expect(hoisted.shown).toBe(1);
    });
  });
});
