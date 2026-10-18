/**
 * How it works: the Strategy checklist across a close and reopen of the panel (plan 96, F4).
 *
 * On the Deck a person ticked a step, closed Quick Access, opened it again, and every step was
 * unticked and the saved list file held no ticks (plan 94 block 5, twice). These tests stand in
 * for the saved file with a small in-memory copy that behaves like the back end's file (one entry
 * per game, one shared entry for "no game"), mount the Ask hook fresh the way a reopen does, and
 * check the two things the person looks at: the ticks on screen and the ticks in the saved file.
 *
 * The disk read is made slower than the "last finished answer" read, which is the order the Deck
 * produced: the answer lands first, the saved ticks a moment later.
 *
 * Also checked here: leaving Strategy mode with no game running clears only the no-game list,
 * never the lists kept for games.
 */
import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Router } from "@decky/ui";
import {
  useBonsaiAskOrchestration,
  type UseBonsaiAskOrchestrationArgs,
} from "../ask/flow/useBonsaiAskOrchestration";
import { useStrategyChecklistSession } from "./useStrategyChecklistSession";
import { resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";
import { idleBackgroundStatusFixture } from "../../test-harness/rpcFixtures";
import type { BackgroundRequestStatus } from "../../types/backgroundAsk";

type SavedEntry = { title: string; items: { id: string; label: string }[]; checked_ids: string[] };

const CHECKLIST = {
  title: "Managing Heat and Weapon Choice",
  items: [
    { id: "1", label: "Engage in combat to build heat levels" },
    { id: "2", label: "Try the Stygian Blade" },
    { id: "3", label: "Use a Boon that adds dash" },
  ],
};

/** The saved list file: one entry per game, and the "no game" entry under a blank id. */
function installFakeFile(initial: Record<string, SavedEntry> = {}, diskReadDelayMs = 0) {
  const file: Record<string, SavedEntry> = { ...initial };
  const key = (appId: unknown) => String(appId ?? "").trim() || "__none__";
  setRpcHandler("get_strategy_checklist_session", async (appId: unknown) => {
    if (diskReadDelayMs > 0) await new Promise((r) => setTimeout(r, diskReadDelayMs));
    const e = file[key(appId)];
    return e ? { app_id: String(appId ?? ""), ...e } : null;
  });
  setRpcHandler("save_strategy_checklist_session", (payload: unknown) => {
    const p = payload as { app_id?: string } & SavedEntry;
    file[key(p.app_id)] = { title: p.title, items: p.items, checked_ids: p.checked_ids };
    return { ok: true };
  });
  setRpcHandler("clear_strategy_checklist_session", (appId: unknown) => {
    // Same rule as the back end after the fix: a blank id clears the no-game entry only.
    delete file[key(appId)];
    return { ok: true };
  });
  return file;
}

function finishedStatus(appId: string, appName: string): BackgroundRequestStatus {
  return {
    ...idleBackgroundStatusFixture(),
    status: "completed",
    success: true,
    request_id: 61,
    question: "How do I get past the first boss in Hades",
    response: "Keep your heat up and learn the boss's moves.",
    app_id: appId,
    app_context: appId ? "active" : "none",
    app_name: appName,
    strategy_checklist: CHECKLIST,
    ask_mode: "strategy",
  };
}

function makeArgs(): UseBonsaiAskOrchestrationArgs {
  return {
    desktopDebugNoteAutoSave: false,
    filesystemWrite: false,
    strategySpoilerMaskingEnabled: false,
    askMode: "strategy",
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
    useLocalKnowledgeBase: false,
  } as UseBonsaiAskOrchestrationArgs;
}

async function wait(ms: number) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}

describe("the Strategy checklist after the panel is closed and opened again (plan 96, F4)", () => {
  const originalMainRunningApp = Router.MainRunningApp;

  function runningNow(app: { appid: number; display_name: string } | undefined) {
    (Router as { MainRunningApp: typeof Router.MainRunningApp }).MainRunningApp =
      app as unknown as typeof Router.MainRunningApp;
  }

  beforeEach(() => {
    resetFakeDeckyRpc();
  });
  afterEach(() => {
    (Router as { MainRunningApp: typeof Router.MainRunningApp }).MainRunningApp = originalMainRunningApp;
  });

  async function tickCloseReopen(appId: string, appName: string) {
    const file = installFakeFile({}, 80);
    setRpcHandler("get_background_game_ai_status", () => finishedStatus(appId, appName));

    // First open: the answer lands with its list, the person ticks step 1, the panel is closed.
    const first = renderHook(() => useBonsaiAskOrchestration(makeArgs()));
    await wait(150);
    act(() => first.result.current.onStrategyChecklistToggle("1", true));
    await wait(450);
    expect(file[appId || "__none__"]?.checked_ids).toEqual(["1"]);
    first.unmount();

    // Second open: a fresh hook, the saved file read is slower than the answer read.
    const second = renderHook(() => useBonsaiAskOrchestration(makeArgs()));
    await wait(600);
    return { file, second };
  }

  it("keeps the ticked step on screen and in the saved file with no game running", async () => {
    runningNow(undefined);
    const { file, second } = await tickCloseReopen("", "");

    expect(second.result.current.strategyChecklist?.checkedIds).toEqual(["1"]);
    expect(file["__none__"]?.checked_ids).toEqual(["1"]);
  });

  it("keeps the ticked step on screen and in the saved file with a game running", async () => {
    runningNow({ appid: 1145360, display_name: "Hades" });
    const { file, second } = await tickCloseReopen("1145360", "Hades");

    expect(second.result.current.strategyChecklist?.checkedIds).toEqual(["1"]);
    expect(file["1145360"]?.checked_ids).toEqual(["1"]);
  });

  it("still draws the list from the last answer when nothing was saved for it", async () => {
    runningNow(undefined);
    const file = installFakeFile({}, 80);
    setRpcHandler("get_background_game_ai_status", () => finishedStatus("", ""));

    const { result } = renderHook(() => useBonsaiAskOrchestration(makeArgs()));
    await wait(600);

    expect(result.current.strategyChecklist?.title).toBe(CHECKLIST.title);
    expect(result.current.strategyChecklist?.checkedIds).toEqual([]);
    expect(file["__none__"]?.checked_ids).toEqual([]);
  });
});

describe("leaving Strategy mode with no game running (plan 96, F4)", () => {
  const originalMainRunningApp = Router.MainRunningApp;

  beforeEach(() => {
    resetFakeDeckyRpc();
    (Router as { MainRunningApp: typeof Router.MainRunningApp }).MainRunningApp =
      undefined as unknown as typeof Router.MainRunningApp;
  });
  afterEach(() => {
    (Router as { MainRunningApp: typeof Router.MainRunningApp }).MainRunningApp = originalMainRunningApp;
  });

  it("asks for the no-game list to be cleared and leaves the lists kept for games", async () => {
    const entry: SavedEntry = { ...CHECKLIST, checked_ids: ["2"] };
    const file = installFakeFile({ "570": entry, __none__: entry });
    const clears: string[] = [];
    setRpcHandler("clear_strategy_checklist_session", (appId: unknown) => {
      clears.push(String(appId ?? ""));
      delete file[String(appId ?? "").trim() || "__none__"];
      return { ok: true };
    });

    const { rerender } = renderHook(({ mode }) => useStrategyChecklistSession(mode), {
      initialProps: { mode: "strategy" as "strategy" | "speed" },
    });
    await wait(50);
    rerender({ mode: "speed" });
    await wait(50);

    expect(clears).toEqual([""]);
    expect(file["570"]?.checked_ids).toEqual(["2"]);
  });
});
