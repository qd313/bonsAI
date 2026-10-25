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
 * never the lists kept for games; and the first-question rule the checklist note on screen names
 * (plan 96, F20): a new Strategy question clears the ticks, pressing a choice button does not.
 */
import { createElement } from "react";
import { render, renderHook, act, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Router } from "@decky/ui";
import {
  useBonsaiAskOrchestration,
  type UseBonsaiAskOrchestrationArgs,
} from "../ask/flow/useBonsaiAskOrchestration";
import { useStrategyChecklistSession } from "./useStrategyChecklistSession";
import { StrategyChecklistPanel } from "./StrategyChecklistPanel";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";
import { idleBackgroundStatusFixture } from "../../test-harness/rpcFixtures";
import type { BackgroundRequestStatus } from "../../types/backgroundAsk";

type SavedEntry = { title: string; items: { id: string; label: string }[]; checked_ids: string[]; revealed?: string[] };

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
    file[key(p.app_id)] = { title: p.title, items: p.items, checked_ids: p.checked_ids, revealed: p.revealed };
    return { ok: true };
  });
  setRpcHandler("clear_strategy_checklist_session", (appId: unknown) => {
    // Same rule as the back end after the fix: a blank id clears the no-game entry only.
    delete file[key(appId)];
    return { ok: true };
  });
  return file;
}

function finishedStatus(appId: string, appName: string, checklist = CHECKLIST): BackgroundRequestStatus {
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
    strategy_checklist: checklist,
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

describe("what clears the ticks when a question is asked (plan 96, F20)", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
    setRpcHandler("start_background_game_ai", () => ({ accepted: true, status: "pending", request_id: 70 }));
    setRpcHandler("get_background_game_ai_status", () => ({ ...idleBackgroundStatusFixture(), status: "pending" }));
  });

  async function ask(question: string) {
    const { result, unmount } = renderHook(() => useBonsaiAskOrchestration(makeArgs()));
    await wait(20);
    await act(async () => {
      void result.current.onAskOllama(question);
    });
    // Wait until the question has gone out: the clear, when there is one, comes before it.
    for (let i = 0; i < 40 && !getRpcCallLog().some((c) => c.method === "start_background_game_ai"); i += 1) {
      await wait(25);
    }
    unmount();
    return getRpcCallLog().filter((c) => c.method === "clear_strategy_checklist_session");
  }

  it("a new Strategy question clears the saved list", async () => {
    expect(await ask("How do I get past the first boss in Hades")).toHaveLength(1);
  });

  it("a press on a choice button does not", async () => {
    expect(await ask("[Strategy follow-up] I'm at: Dealing with the first boss's mechanics.")).toHaveLength(0);
  });
});

/*
 * Plan 100, lane R: the steps a player opened by hand on the route travel with the ticks. These mount the
 * real Ask hook and draw the real panel from its state, the way Quick Access does, press A on the steps,
 * close the panel and open it again, and read what is drawn (open or covered, ticked or not) and what the
 * saved file holds. Clear cache is modelled the way the back end does it: the game's whole entry goes, the
 * ticks and the shown steps together, and the player opens the panel again.
 */
describe("the route's shown steps travel with the ticks (plan 100, lane R)", () => {
  const originalMainRunningApp = Router.MainRunningApp;
  const APP = "367520";
  const ROUTE5 = {
    title: "To the False Knight",
    items: [1, 2, 3, 4, 5].map((n) => ({ id: String(n), label: `Step number ${n}` })),
  };

  beforeEach(() => {
    resetFakeDeckyRpc();
    (Router as { MainRunningApp: typeof Router.MainRunningApp }).MainRunningApp = {
      appid: Number(APP),
      display_name: "Hollow Knight",
    } as unknown as typeof Router.MainRunningApp;
  });
  afterEach(() => {
    (Router as { MainRunningApp: typeof Router.MainRunningApp }).MainRunningApp = originalMainRunningApp;
  });

  function Quick() {
    const ask = useBonsaiAskOrchestration(makeArgs());
    return ask.strategyChecklist
      ? createElement(StrategyChecklistPanel, {
          checklist: ask.strategyChecklist,
          onToggle: ask.onStrategyChecklistToggle,
        })
      : null;
  }

  /** Opens Quick Access: a fresh mount of the hook and the panel it draws. */
  async function open() {
    const view = render(createElement(Quick));
    await wait(600);
    const stops = () => Array.from(view.container.querySelectorAll<HTMLElement>(".bonsai-strategy-checklist-step"));
    return {
      ...view,
      stops,
      kinds: () => stops().map((s) => s.getAttribute("data-route-stop")),
      ticked: () => stops().map((s) => s.getAttribute("aria-checked") === "true"),
      press: (n: number) => act(() => void fireEvent.click(stops()[n - 1])),
    };
  }

  function route5Answer() {
    setRpcHandler("get_background_game_ai_status", () => finishedStatus(APP, "Hollow Knight", ROUTE5));
  }

  it("tick step 1 and show step 3: both are saved, and a reopened panel draws 1 ticked and 3 open", async () => {
    const file = installFakeFile({}, 80);
    route5Answer();
    const first = await open();
    expect(first.kinds()).toEqual(["open", "covered", "covered", "covered", "covered"]);
    first.press(1);
    expect(first.kinds()).toEqual(["open", "open", "covered", "covered", "covered"]);
    first.press(3);
    expect(first.kinds()).toEqual(["open", "open", "open", "covered", "covered"]);
    await wait(450);
    expect(file[APP]?.checked_ids).toEqual(["1"]);
    expect(file[APP]?.revealed).toEqual(["3"]);
    first.unmount();

    const again = await open();
    expect(again.kinds()).toEqual(["open", "open", "open", "covered", "covered"]);
    expect(again.ticked()).toEqual([true, false, false, false, false]);
  });

  it("after Clear cache and a reopen, 1 is unticked and 3 is covered again", async () => {
    const file = installFakeFile({}, 80);
    route5Answer();
    const first = await open();
    first.press(1);
    first.press(3);
    await wait(450);
    expect(file[APP]?.revealed).toEqual(["3"]);
    first.unmount();

    // Clear cache: the back end drops the game's whole entry, the ticks and the shown steps together.
    delete file[APP];

    const again = await open();
    expect(again.kinds()).toEqual(["open", "covered", "covered", "covered", "covered"]);
    expect(again.ticked()).toEqual([false, false, false, false, false]);
  });

  it("a saved entry with no revealed list draws every later step covered", async () => {
    installFakeFile({ [APP]: { ...ROUTE5, checked_ids: [] } }, 80);
    route5Answer();
    const view = await open();
    expect(view.kinds()).toEqual(["open", "covered", "covered", "covered", "covered"]);
  });

  it("a saved entry with a shown step draws it open", async () => {
    installFakeFile({ [APP]: { ...ROUTE5, checked_ids: [], revealed: ["2"] } }, 80);
    route5Answer();
    const view = await open();
    expect(view.kinds()).toEqual(["open", "open", "covered", "covered", "covered"]);
  });
});
