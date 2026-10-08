/**
 * How it works: the Ask hook, checked at the desktop debug note save (plan 78, finding 6).
 *
 * In a developer build with "desktop debug note autosave" and "filesystem write" on, every finished
 * answer is appended to a note file on the computer. The hook keeps its own copy of those two
 * switches, and the copy starts at the defaults (both off) until the saved settings arrive. When
 * the panel is reopened and the answer had already finished, that answer is painted straight away,
 * before the settings arrive. These tests open the hook in exactly that order and check the one
 * thing a developer would see: whether the save call for the note is made for that answer, once.
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useBonsaiAskOrchestration,
  type UseBonsaiAskOrchestrationArgs,
} from "./useBonsaiAskOrchestration";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../test-harness/fakeDeckyRpc";
import { idleBackgroundStatusFixture } from "../test-harness/rpcFixtures";

type Switches = { autoSave: boolean; fsWrite: boolean; loaded: boolean };

function makeArgs(s: Switches): UseBonsaiAskOrchestrationArgs {
  return {
    desktopDebugNoteAutoSave: s.autoSave,
    filesystemWrite: s.fsWrite,
    settingsLoaded: s.loaded,
    strategySpoilerMaskingEnabled: false,
    askMode: "speed",
    unifiedInput: "",
    setUnifiedInput: vi.fn(),
    unifiedInputPersistenceMode: "no_persist",
    effectiveOllamaPcIp: "127.0.0.1:11434",
    selectedAttachment: null,
    setSelectedAttachment: vi.fn(),
    syncSettingsFromDisk: vi.fn(async () => undefined),
    unifiedInputFieldLayerRef: { current: null },
    unifiedInputHostRef: { current: null },
    setNavigationMessage: vi.fn(),
    saveIp: vi.fn(),
    persistSearchQuery: vi.fn(),
    useLocalKnowledgeBase: false,
  };
}

async function settle() {
  await act(async () => {
    for (let i = 0; i < 6; i += 1) await Promise.resolve();
  });
}

/** The note saves made for a finished answer (not the one made when a question is asked). */
function noteSavesForAnswers() {
  return getRpcCallLog().filter(
    (c) =>
      c.method === "append_desktop_chat_event" &&
      (c.args[0] as { event?: string } | undefined)?.event === "response",
  );
}

/** The panel opens with both switches still at their defaults and the answer already finished. */
async function openWithFinishedAnswer(initial: Switches, requestId = 31) {
  setRpcHandler("get_background_game_ai_status", () => ({
    ...idleBackgroundStatusFixture(),
    status: "completed",
    success: true,
    request_id: requestId,
    question: "how do i deal with the exploders",
    response: "Keep your distance and let them come to you.",
    app_id: "570",
    app_name: "Dota 2",
  }));
  setRpcHandler("append_desktop_chat_event", () => ({ success: true }));
  const hook = renderHook((s: Switches) => useBonsaiAskOrchestration(makeArgs(s)), { initialProps: initial });
  await settle();
  return hook;
}

const DEFAULTS: Switches = { autoSave: false, fsWrite: false, loaded: false };
const ON: Switches = { autoSave: true, fsWrite: true, loaded: true };

describe("a finished answer painted before the settings arrive (plan 78, finding 6)", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
    try {
      sessionStorage.clear();
    } catch {}
  });

  it("saves the desktop note for the answer once the settings load with both switches on", async () => {
    const hook = await openWithFinishedAnswer(DEFAULTS);
    expect(hook.result.current.lastExchange?.answer).toContain("Keep your distance");
    expect(noteSavesForAnswers()).toHaveLength(0);

    hook.rerender(ON);
    await settle();

    const saves = noteSavesForAnswers();
    expect(saves).toHaveLength(1);
    expect(saves[0].args[0]).toMatchObject({
      response_text: "Keep your distance and let them come to you.",
      question: "how do i deal with the exploders",
    });
  });

  it("saves it only once, however often the switches change afterwards", async () => {
    const hook = await openWithFinishedAnswer(DEFAULTS);
    hook.rerender(ON);
    await settle();
    hook.rerender({ ...ON, autoSave: false });
    hook.rerender(ON);
    await settle();

    expect(noteSavesForAnswers()).toHaveLength(1);
  });

  it("does not save that answer if the settings load with autosave off, even when it is turned on later", async () => {
    const hook = await openWithFinishedAnswer(DEFAULTS);
    hook.rerender({ autoSave: false, fsWrite: true, loaded: true });
    await settle();
    hook.rerender(ON);
    await settle();

    expect(noteSavesForAnswers()).toHaveLength(0);
  });

  it("still saves straight away when the settings were already loaded", async () => {
    await openWithFinishedAnswer(ON, 77);

    expect(noteSavesForAnswers()).toHaveLength(1);
  });
});
