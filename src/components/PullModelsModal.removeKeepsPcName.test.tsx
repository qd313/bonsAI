/**
 * Title: Removing a model through the AI models box asks the screen's PC about it, twice
 *
 * Purpose: Pins the sequence the Deck ran in plan 81 (docs/test-evidence/plan81-P81-REMOVE-KEEPS-PC-PLACE.json).
 * The PC address was typed and tested on the Ollama tab, then "Run AI on this Deck" was switched back
 * on, so the address lives only in the screen's own storage. A row's "Remove from Deck" then "Remove
 * model" sends `delete_ollama_model`, and the box refreshes its list right after. Both calls must carry
 * the saved PC address: the back end drops a saved try-order name that this Deck no longer holds unless
 * a PC it was told about still has it, and the refresh used to be sent without the address, so it dropped
 * the name the removal had just kept.
 *
 * Used for: `PullModelsModal.tsx` through `usePullModelDeleteConfirm.tsx` and
 * `usePullModelCatalogRefresh.ts`.
 *
 * Does not: run the back end; tests/test_remove_then_refresh_keeps_pc_name.py reads the saved order
 * back from a settings file with the same two calls.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configure, fireEvent, render, waitFor } from "@testing-library/react";

configure({ asyncUtilTimeout: 10000 });

const hoisted = vi.hoisted(() => ({
  shown: [] as Array<{ props: Record<string, (() => void) | string | undefined> }>,
}));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  return {
    ...stubs,
    showModal: (el: unknown) => {
      hoisted.shown.push(el as { props: Record<string, (() => void) | string | undefined> });
      return { Close: () => {}, Update: () => {} };
    },
  };
});

import { PullModelsModal } from "./PullModelsModal";
import { IP_STORAGE_KEY } from "../data/storageKeys";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../test-harness/fakeDeckyRpc";
import { defaultSettingsFixture } from "../test-harness/rpcFixtures";

const PC_ADDRESS = "192.168.86.27:11434";
const DECK_MODELS = ["qwen2.5:3b", "nomic-embed-text:latest", "gemma4:e2b-it-qat"];

beforeEach(() => {
  hoisted.shown = [];
  resetFakeDeckyRpc();
  window.localStorage.setItem(IP_STORAGE_KEY, PC_ADDRESS);
  setRpcHandler("load_settings", () => defaultSettingsFixture());
  setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.34.1", models: DECK_MODELS }));
});

afterEach(() => {
  window.localStorage.removeItem(IP_STORAGE_KEY);
  document.body.innerHTML = "";
});

async function removeQwenFromTheBox(): Promise<void> {
  const { container } = render(
    <PullModelsModal activeRoutingTag={null} onCancel={() => {}} onPullAccepted={() => {}} embedded />,
  );
  const row = await waitFor(() => {
    const r = Array.from(container.querySelectorAll<HTMLElement>(".bonsai-pullmodels-table-row--data")).find(
      (x) => x.querySelector(".bonsai-pullmodels-tag-name-text")?.textContent?.trim() === "qwen2.5:3b",
    );
    if (!r) throw new Error("no qwen2.5:3b row");
    return r;
  });
  fireEvent.click(row.querySelector<HTMLButtonElement>(".bonsai-pullmodels-delete-btn")!);
  const box = hoisted.shown[hoisted.shown.length - 1]!.props;
  expect(box.strTitle).toBe("Remove qwen2.5:3b from the Deck?");
  (box.onMiddleButton as () => void)();
  await waitFor(() => expect(getRpcCallLog().some((c) => c.method === "delete_ollama_model")).toBe(true));
}

describe("Remove from Deck, then the refresh the box runs right after", () => {
  it("sends the saved PC address with the removal", async () => {
    await removeQwenFromTheBox();
    const del = getRpcCallLog().find((c) => c.method === "delete_ollama_model")!;
    expect(del.args).toEqual(["qwen2.5:3b", PC_ADDRESS]);
  });

  it("sends the same address with every models-list look after the removal, so the back end keeps the PC's name", async () => {
    await removeQwenFromTheBox();
    // The refresh after a successful removal is the call that dropped the name on the Deck.
    await waitFor(() => {
      const log = getRpcCallLog();
      const at = log.findIndex((c) => c.method === "delete_ollama_model");
      expect(log.slice(at).some((c) => c.method === "fetch_ollama_catalog_metadata")).toBe(true);
    });
    const log = getRpcCallLog();
    const at = log.findIndex((c) => c.method === "delete_ollama_model");
    for (const call of log.slice(at).filter((c) => c.method === "fetch_ollama_catalog_metadata")) {
      expect(call.args[1]).toBe(PC_ADDRESS);
    }
  });

  it("looks the same way when the box first opens, before anything is removed", async () => {
    render(<PullModelsModal activeRoutingTag={null} onCancel={() => {}} onPullAccepted={() => {}} embedded />);
    await waitFor(() => expect(getRpcCallLog().some((c) => c.method === "fetch_ollama_catalog_metadata")).toBe(true));
    for (const call of getRpcCallLog().filter((c) => c.method === "fetch_ollama_catalog_metadata")) {
      expect(call.args[1]).toBe(PC_ADDRESS);
    }
  });
});
