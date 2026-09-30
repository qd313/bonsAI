/**
 * Title: Install Ollama, Update AI & models, Tier 1 and Tier 2 open the download notice itself
 *
 * Purpose: Pin that every Ollama setup button opens one box, and that box is the download notice
 * (downloadNotice.tsx): it names ollama.com for Ollama itself (size not known) and
 * registry.ollama.ai for the models with the same rough size the old box showed; it keeps the old
 * box's title and action label while downloads are on, is the "Turn on internet downloads?"
 * question while they are off, and opens with the ring on "Not now". On the Deck (plan72-F-DL)
 * "Update AI & models" opened the older "Update Ollama and models?" box instead, with the ring on
 * "Start update" and no site or size. A declined box starts nothing -- no setup, and no switch to
 * the Tier 2 model policy either.
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  answer: false,
  calls: [] as { notices: unknown; opts: Record<string, unknown> | undefined }[],
  modals: 0,
}));
vi.mock("../features/downloads/downloadNotice", () => ({
  confirmDownload: async (notices: unknown, opts?: Record<string, unknown>) => {
    hoisted.calls.push({ notices, opts });
    return hoisted.answer;
  },
}));
vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  return {
    ...stubs,
    showModal: () => {
      hoisted.modals += 1;
      return { Close: () => {} };
    },
  };
});

import { useLocalOllamaSetupFlow } from "./useLocalOllamaSetupFlow";
import { getRpcCallLog, resetFakeDeckyRpc } from "../test-harness/fakeDeckyRpc";

function flow(onApplyTier2MultimodalPolicy = vi.fn()) {
  const { result } = renderHook(() =>
    useLocalOllamaSetupFlow({
      ollamaLocalOnDeck: false,
      localSetupStatus: null,
      setLocalSetupStatus: () => {},
      localSetupBusy: false,
      setupAutoTestRanRef: { current: false },
      lastCompletedSetupProfileRef: { current: "" },
      onApplyTier2MultimodalPolicy,
      onBeforeDeckyModal: () => {},
      onCompleteDeckyModalClose: (close) => close(),
      onTestConnectionRef: { current: async () => {} },
    })
  );
  return result.current;
}

const setupCalls = () => getRpcCallLog().filter((c) => c.method === "start_local_ollama_setup");
const settle = () => act(() => new Promise((r) => setTimeout(r, 0)));

beforeEach(() => {
  resetFakeDeckyRpc();
  hoisted.answer = false;
  hoisted.calls = [];
  hoisted.modals = 0;
});

describe("Ollama setup buttons open the download notice", () => {
  it("Update AI & models: one box, the notice, naming both sites; declined starts nothing", async () => {
    const f = flow();
    act(() => f.openLocalSetupConfirm("update_installed", "ollama-local-setup"));
    await settle();
    expect(hoisted.modals).toBe(0); // no older box of its own
    expect(hoisted.calls).toHaveLength(1);
    expect(hoisted.calls[0].notices).toEqual([
      { site: "https://ollama.com", what: "the latest Ollama", size: null },
      { site: "https://registry.ollama.ai", what: "fresh copies of every model already installed", size: null },
    ]);
    expect(hoisted.calls[0].opts).toMatchObject({
      always: true,
      title: "Update Ollama and models?",
      actionLabel: "Start update",
    });
    expect(setupCalls()).toHaveLength(0);
  });

  it("Tier 1: names both sites with the old box's size", async () => {
    const f = flow();
    act(() => f.openLocalSetupConfirm("tier1_essentials", "ollama-local-setup"));
    await settle();
    expect(hoisted.calls[0].notices).toEqual([
      { site: "https://ollama.com", what: "Ollama, if it is not installed yet", size: null },
      { site: "https://registry.ollama.ai", what: "qwen2.5vl:3b", size: "about 3–4 GiB" },
    ]);
    expect(hoisted.calls[0].opts).toMatchObject({ always: true, actionLabel: "Install Tier 1 essentials" });
  });

  it("Tier 2: declined box does not switch the model policy either", async () => {
    const applyPolicy = vi.fn();
    const f = flow(applyPolicy);
    act(() => f.openLocalSetupConfirm("tier2_multimodal", "ollama-local-setup"));
    await settle();
    expect(hoisted.calls[0].opts).toMatchObject({ always: true, actionLabel: "Install Tier 2 multimodal" });
    expect(applyPolicy).not.toHaveBeenCalled();
    expect(setupCalls()).toHaveLength(0);
  });

  it("accepted box starts the setup", async () => {
    hoisted.answer = true;
    const f = flow();
    act(() => f.openLocalSetupConfirm("update_installed", "ollama-local-setup"));
    await settle();
    expect(setupCalls()).toHaveLength(1);
  });
});
