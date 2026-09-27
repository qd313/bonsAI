/**
 * Title: Installing or updating Ollama asks the download notice first
 *
 * Purpose: Pin that after the existing "Install Tier 1 / Tier 2 / Update" box is accepted, the
 * download notice (downloadNotice.tsx) is asked before anything starts, and a declined notice
 * starts nothing -- no setup, and no switch to the Tier 2 model policy either. The notice names
 * ollama.com for Ollama itself (size not known) and registry.ollama.ai for the models, with the
 * same rough size the Install box already shows.
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  answer: false,
  notices: [] as unknown[],
  modal: null as { props: Record<string, unknown> } | null,
}));
vi.mock("../features/downloads/downloadNotice", () => ({
  confirmDownload: async (n: unknown) => {
    hoisted.notices.push(n);
    return hoisted.answer;
  },
}));
vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  return {
    ...stubs,
    showModal: (content: unknown) => {
      hoisted.modal = content as { props: Record<string, unknown> };
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
  hoisted.notices = [];
  hoisted.modal = null;
});

describe("Ollama setup download notice", () => {
  it("Tier 1: declined notice starts nothing, and names both sites", async () => {
    const f = flow();
    act(() => f.openLocalSetupConfirm("tier1_essentials"));
    act(() => (hoisted.modal!.props.onOK as () => void)());
    await settle();
    expect(hoisted.notices).toEqual([
      [
        { site: "https://ollama.com", what: "Ollama, if it is not installed yet", size: null },
        { site: "https://registry.ollama.ai", what: "qwen2.5vl:3b", size: "about 3–4 GiB" },
      ],
    ]);
    expect(setupCalls()).toHaveLength(0);
  });

  it("Tier 2: declined notice does not switch the model policy either", async () => {
    const applyPolicy = vi.fn();
    const f = flow(applyPolicy);
    act(() => f.openLocalSetupConfirm("tier2_multimodal"));
    act(() => (hoisted.modal!.props.onOK as () => void)());
    await settle();
    expect(applyPolicy).not.toHaveBeenCalled();
    expect(setupCalls()).toHaveLength(0);
  });

  it("Update: names the latest Ollama and fresh copies of installed models, sizes unknown", async () => {
    const f = flow();
    act(() => f.openLocalSetupConfirm("update_installed"));
    act(() => (hoisted.modal!.props.onOK as () => void)());
    await settle();
    expect(hoisted.notices).toEqual([
      [
        { site: "https://ollama.com", what: "the latest Ollama", size: null },
        { site: "https://registry.ollama.ai", what: "fresh copies of every model already installed", size: null },
      ],
    ]);
  });

  it("accepted notice starts the setup", async () => {
    hoisted.answer = true;
    const f = flow();
    act(() => f.openLocalSetupConfirm("tier1_essentials"));
    act(() => (hoisted.modal!.props.onOK as () => void)());
    await settle();
    expect(setupCalls()).toHaveLength(1);
  });
});
