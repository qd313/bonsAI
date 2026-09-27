/**
 * Title: The model picker asks the download notice before it pulls
 *
 * Purpose: Pin that both picker downloads -- "Pull selected" and a typed model name -- wait for
 * the download notice (downloadNotice.tsx) and start nothing when it is declined: not the pull,
 * and not the registry name check either, which already reaches registry.ollama.ai. The notice
 * names registry.ollama.ai, the models, and the size from the bundled catalog when every model
 * has one.
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PullModelEntry } from "../data/pullModelCatalog";

const hoisted = vi.hoisted(() => ({
  answer: false,
  notices: [] as unknown[],
  calls: [] as string[],
}));

vi.mock("../features/downloads/downloadNotice", () => ({
  confirmDownload: async (n: unknown) => {
    hoisted.notices.push(n);
    return hoisted.answer;
  },
}));
vi.mock("../utils/deckyCall", () => ({
  DECKY_RPC_TIMEOUT_MS: 1000,
  formatDeckyRpcError: String,
  callDeckyWithTimeout: async (method: string) => {
    hoisted.calls.push(method);
    return method === "pull_ollama_models" ? { accepted: true } : { source: "offline", tags: {} };
  },
}));
vi.mock("@decky/api", () => ({ toaster: { toast: () => {} } }));

import { usePullModelSubmitSelected } from "./usePullModelSubmitSelected";
import { usePullModelCustomTagPull } from "./usePullModelCustomTagPull";

const CATALOG = [
  { tag: "qwen2.5vl:3b", sizeGb: 3.2, licenseClass: "foss" },
  { tag: "llava:7b", sizeGb: 4.7, licenseClass: "foss" },
] as unknown as PullModelEntry[];

function submitHook(tags: string[]) {
  return renderHook(() =>
    usePullModelSubmitSelected({
      selectedTags: new Set(tags),
      modelPolicyTier: "open_weight",
      mergedCatalog: CATALOG,
      completeNestedModalClose: (c) => c(),
      onPullAccepted: () => {},
      setPullBusy: () => {},
      openWeightTierConfirmedRef: { current: new Set() },
    })
  ).result.current;
}

function customHook(tag: string) {
  return renderHook(() =>
    usePullModelCustomTagPull({
      customTagInput: tag,
      customPullBusy: false,
      pullBusy: false,
      onPullAccepted: () => {},
      focusCustomTagChip: () => true,
      setCustomPullBusy: () => {},
      setCustomTagInput: () => {},
      setCustomTagEntryOpen: () => {},
      focusAfterRedraw: () => {},
    })
  ).result.current;
}

beforeEach(() => {
  hoisted.answer = false;
  hoisted.notices = [];
  hoisted.calls = [];
});

describe("Pull selected", () => {
  it("declined notice: nothing reaches the registry and nothing pulls", async () => {
    const hook = submitHook(["qwen2.5vl:3b", "llava:7b"]);
    await act(() => hook.onPullSelected());
    expect(hoisted.notices).toEqual([
      [{ site: "https://registry.ollama.ai", what: "qwen2.5vl:3b, llava:7b", size: "about 7.9 GB" }],
    ]);
    expect(hoisted.calls).toEqual([]);
  });

  it("accepted notice: pulls", async () => {
    hoisted.answer = true;
    const hook = submitHook(["qwen2.5vl:3b"]);
    await act(() => hook.onPullSelected());
    expect(hoisted.calls).toContain("pull_ollama_models");
  });

  it("a model with no size in the catalog makes the size unknown rather than a guess", async () => {
    const hook = submitHook(["qwen2.5vl:3b", "mystery:1b"]);
    await act(() => hook.onPullSelected());
    expect((hoisted.notices[0] as { size: string | null }[])[0].size).toBeNull();
  });
});

describe("typed model name", () => {
  it("declined notice: nothing pulls", async () => {
    const hook = customHook("mistral:7b");
    await act(() => hook.onPullCustomTag());
    expect(hoisted.notices).toEqual([[{ site: "https://registry.ollama.ai", what: "mistral:7b", size: null }]]);
    expect(hoisted.calls).toEqual([]);
  });

  it("accepted notice: pulls", async () => {
    hoisted.answer = true;
    const hook = customHook("mistral:7b");
    await act(() => hook.onPullCustomTag());
    expect(hoisted.calls).toEqual(["pull_ollama_models"]);
  });
});
