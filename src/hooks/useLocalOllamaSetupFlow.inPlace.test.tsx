/**
 * Title: Install Ollama and Update AI & models start at once, with no box in between
 *
 * Purpose: Pin plan 87 (bug B14, the maintainer's call 2). Pressing Update AI & models used to open the
 * download notice (plan72-F-DL) and start only after "Start update"; now it starts the setup run at
 * once, shows the run on the tab, and opens no box at all. The only box left on this path is the
 * starter-models question for a Deck with no models (OllamaWhereAiRunsSection.starterOffer.test.tsx).
 * A refused start (downloads off, kids lock) is handed to the tab as a failed line, not a toast.
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({ confirms: 0, modals: 0 }));
vi.mock("../features/downloads/downloadNotice", () => ({
  confirmDownload: async () => {
    hoisted.confirms += 1;
    return false;
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
import type { LocalOllamaSetupStatus } from "../components/OllamaWhereAiRunsSection.types";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../test-harness/fakeDeckyRpc";

function flow(setStatus: (s: LocalOllamaSetupStatus | null) => void = () => {}) {
  const { result } = renderHook(() =>
    useLocalOllamaSetupFlow({
      ollamaLocalOnDeck: false,
      localSetupStatus: null,
      setLocalSetupStatus: setStatus,
      localSetupBusy: false,
      setupAutoTestRanRef: { current: false },
      lastCompletedSetupProfileRef: { current: "" },
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
  hoisted.confirms = 0;
  hoisted.modals = 0;
});

describe("Install Ollama and Update AI & models run in place", () => {
  it("Update AI & models starts the setup at once and asks nothing", async () => {
    setRpcHandler("start_local_ollama_setup", () => ({ accepted: true }));
    const f = flow();
    act(() => f.runLocalSetupInPlace("update_installed", "ollama-local-setup"));
    await settle();
    expect(setupCalls()).toHaveLength(1);
    expect(hoisted.confirms).toBe(0);
    expect(hoisted.modals).toBe(0);
  });

  it("the tab hears a running status first, before the back end has answered", async () => {
    setRpcHandler("start_local_ollama_setup", () => ({ accepted: true }));
    const heard: Array<LocalOllamaSetupStatus | null> = [];
    const f = flow((s) => heard.push(s));
    act(() => f.runLocalSetupInPlace("update_installed", "ollama-local-setup"));
    await settle();
    expect(heard.filter(Boolean)[0]).toMatchObject({ phase: "running" });
  });

  it("a refused start reaches the tab as a failed line with the reason", async () => {
    setRpcHandler("start_local_ollama_setup", () => ({ accepted: false, reason: "Internet downloads are off." }));
    const heard: Array<LocalOllamaSetupStatus | null> = [];
    const f = flow((s) => heard.push(s));
    act(() => f.runLocalSetupInPlace("update_installed", "ollama-local-setup"));
    await settle();
    expect(heard[heard.length - 1]).toMatchObject({ phase: "failed", error: "Internet downloads are off." });
    expect(hoisted.modals).toBe(0);
  });

  it("the status line has a word for the restart step", () => {
    const f = flow();
    expect(
      f.formatLocalSetupStageLine({ phase: "running", stage: "restart", profile: "update_installed" })
    ).toContain("Restarting Ollama");
  });
});
