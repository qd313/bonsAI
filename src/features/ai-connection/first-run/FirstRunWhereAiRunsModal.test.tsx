/**
 * Title: The first-time setup popup, pressed as a person presses it
 *
 * Purpose: Plan 105, lane D3 (board 5, tab 4, round 4 B). The real popup is drawn with Steam's ring modelled and
 * pressed with the D-pad and A the way Steam calls the handlers, and what a person sees and what reaches the back
 * end are read: the first screen's words (the checklist with sizes and sites, the switch in the Permissions tab's
 * words, three buttons, the beta line, and nothing of the old boxes); each tick box and the total; the shortest
 * way (Up, A, Down, A: four presses) saving the real permission and starting the starter set; grey OK moving the
 * ring to the switch and doing nothing else; a left-out piece sent as left out and kept for later offers; OK never
 * starting the engine-only setup however early it is pressed (the old "Checking…" trap); B and Not now changing
 * nothing; the parental lock; and the PC screen.
 *
 * Does not: prove the ring or the box's height on the Deck (the walk test and the fit test go further; the Deck
 * driver measures the real box in Steam's font).
 */
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => (await import("./firstRunPopupTestKit")).deckyUiForFirstRunPopup());

import { FIRST_RUN_POPUP_WORDS, FirstRunWhereAiRunsModal } from "./FirstRunWhereAiRunsModal";
import { boxes, popupHost, press, pressB, resetBoxes, ringName } from "./firstRunPopupTestKit";
import { permissionBridge } from "./firstRunTestBridge";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../../../test-harness/fakeDeckyRpc";
import { markSettingsLoaded, resetSettingsLoadedSignalForTests } from "../../settings/settingsLoadedSignal";
import { readStarterLeftOut } from "../../models/starterSetLeftOut";
import { setDownloadPermissionBridge } from "../../downloads/downloadNotice";

const SWITCH = "Internet downloads";
const NOTE = "Note-search model nomic-embed-text";
const SPEECH = "Speech models tiny.en and base.en";
const VOICE = "Voice engine (whisper.cpp)";

const calls = (method: string) => getRpcCallLog().filter((c) => c.method === method);
const text = () => document.body.textContent ?? "";
const settle = () => act(async () => void (await new Promise((r) => setTimeout(r, 0))));
const total = () => document.querySelector("[data-bonsai-first-run-total]")?.textContent;
const checked = (name: string) => screen.getByRole("switch", { name }).getAttribute("aria-checked");

async function open(over = {}) {
  const onClose = vi.fn();
  const host = popupHost(over);
  const view = render(<FirstRunWhereAiRunsModal host={host} onClose={onClose} />);
  await waitFor(() => expect(ringName()).toBe(FIRST_RUN_POPUP_WORDS.notNow));
  return { view, onClose, host };
}

async function step(key: Parameters<typeof press>[0]): Promise<string> {
  await act(async () => {
    press(key);
  });
  await settle();
  return ringName();
}

beforeEach(() => {
  resetFakeDeckyRpc();
  resetBoxes();
  resetSettingsLoadedSignalForTests();
  markSettingsLoaded();
  window.localStorage.clear();
  setDownloadPermissionBridge(null);
});

describe("the first screen, as drawn", () => {
  it("shows the checklist with every size and site, the switch in the Permissions tab's words, three buttons and the beta line", async () => {
    permissionBridge(false);
    await open();
    expect(text()).toContain(FIRST_RUN_POPUP_WORDS.title);
    for (const words of [
      "AI engine (Ollama)about 1.5 GB · neededollama.com",
      "Answer model gemma4:e2b-it-qatabout 4.3 GB · neededregistry.ollama.ai",
      `${NOTE}about 270 MB · for the knowledge baseregistry.ollama.ai`,
      `${SPEECH}about 230 MB · for voice input, ticks with the row belowhuggingface.co`,
      `${VOICE}about 500 MB · its build fetches compilers from its own package serversghcr.io`,
      "Internet downloadsLets bonsAI download Ollama, models and the knowledge library. Off: nothing downloads.",
      "OK, install on this DeckUse the AI on my PCNot now",
      FIRST_RUN_POPUP_WORDS.beta,
    ]) {
      expect(text()).toContain(words);
    }
    expect(total()).toBe("about 6.9 GB in all");
    expect(checked(SWITCH)).toBe("false");
    // Nothing of the old boxes: no Beta Notice, no Start-with-the-Deck or microphone switch, no "Checking…".
    expect(text()).not.toMatch(/Beta Notice|Start the AI with the Deck|microphone|Checking/);
  });

  it("the two locked rows are not stops; the three others are, and the speech models and the voice engine tick together", async () => {
    permissionBridge(false);
    await open();
    expect(screen.queryByRole("switch", { name: "AI engine (Ollama)" })).toBeNull();
    expect(screen.queryByRole("switch", { name: "Answer model gemma4:e2b-it-qat" })).toBeNull();
    expect([await step("onMoveUp"), await step("onMoveUp")]).toEqual([SWITCH, VOICE]);
    await step("onOKButton");
    expect([checked(SPEECH), checked(VOICE)]).toEqual(["false", "false"]);
    expect(total()).toBe("about 6.1 GB in all");
    expect(await step("onMoveUp")).toBe(SPEECH);
    await step("onOKButton");
    expect([checked(SPEECH), checked(VOICE)]).toEqual(["true", "true"]);
    expect(await step("onMoveUp")).toBe(NOTE);
    await step("onOKButton");
    expect(total()).toBe("about 6.6 GB in all");
    await step("onMoveDown");
    await step("onOKButton");
    expect(total()).toBe("about 5.8 GB in all");
  });
});

describe("the shortest way to the first question", () => {
  it("Up, A, Down, A: the switch saves the real permission, Down lands on OK, OK starts the starter set and closes", async () => {
    const setCapabilities = permissionBridge(false);
    const { onClose } = await open();
    expect(await step("onMoveUp")).toBe(SWITCH);
    await step("onOKButton");
    expect(checked(SWITCH)).toBe("true");
    const saves = calls("save_settings");
    expect(saves.map((c) => (c.args[0] as { capabilities?: { internet_downloads?: boolean } }).capabilities?.internet_downloads)).toEqual([true]);
    expect(setCapabilities).toHaveBeenLastCalledWith(expect.objectContaining({ internet_downloads: true }));
    expect(await step("onMoveDown")).toBe(FIRST_RUN_POPUP_WORDS.ok);
    await step("onOKButton");
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(calls("start_local_ollama_setup").map((c) => c.args[0])).toEqual([{ profile: "tier1_essentials", leave_out: [] }]);
    // OK comes after the save: the back end has the permission before the start reaches it.
    const order = getRpcCallLog().map((c) => c.method).filter((m) => m === "save_settings" || m === "start_local_ollama_setup");
    expect(order).toEqual(["save_settings", "start_local_ollama_setup"]);
    expect(boxes).toHaveLength(0);
  });

  it("a piece left unticked is sent as left out and kept for the later offers", async () => {
    permissionBridge(true);
    const { onClose } = await open();
    for (let i = 0; i < 4; i++) await step("onMoveUp");
    expect(ringName()).toBe(NOTE);
    await step("onOKButton");
    for (let i = 0; i < 4; i++) await step("onMoveDown");
    expect(ringName()).toBe(FIRST_RUN_POPUP_WORDS.ok);
    await step("onOKButton");
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(calls("start_local_ollama_setup").map((c) => c.args[0])).toEqual([{ profile: "tier1_essentials", leave_out: ["note_search"] }]);
    expect(readStarterLeftOut()).toEqual(["note_search"]);
  });

  it("OK never starts the engine-only setup, however early it is pressed: there is no check to wait for", async () => {
    permissionBridge(true);
    setRpcHandler("test_ollama_connection", () => new Promise(() => {}));
    setRpcHandler("get_local_ollama_setup_status", () => new Promise(() => {}));
    render(<FirstRunWhereAiRunsModal host={popupHost()} onClose={vi.fn()} />);
    await act(async () => void screen.getByLabelText(FIRST_RUN_POPUP_WORDS.ok).click());
    await settle();
    expect(calls("start_local_ollama_setup").map((c) => (c.args[0] as { profile: string }).profile)).toEqual(["tier1_essentials"]);
    expect(boxes).toHaveLength(0);
  });
});

describe("OK while the switch is off", () => {
  it("is grey: a press moves the ring to the switch and does nothing else", async () => {
    permissionBridge(false);
    const { onClose } = await open();
    expect(await step("onMoveLeft")).toBe(FIRST_RUN_POPUP_WORDS.pc);
    expect(await step("onMoveLeft")).toBe(FIRST_RUN_POPUP_WORDS.ok);
    expect(await step("onOKButton")).toBe(SWITCH);
    expect(calls("start_local_ollama_setup")).toHaveLength(0);
    expect(calls("save_settings")).toHaveLength(0);
    expect(onClose).not.toHaveBeenCalled();
    expect(checked(SWITCH)).toBe("false");
  });

  it("switched off and OK pressed before that save returns: OK is grey, nothing starts, the ring goes to the switch", async () => {
    permissionBridge(true);
    let release: (() => void) | null = null;
    setRpcHandler("save_settings", () => new Promise((r) => (release = () => r({}))));
    const { onClose } = await open();
    await step("onMoveUp");
    await step("onOKButton");
    expect(checked(SWITCH)).toBe("false");
    // Down then A while the off is still being saved: Down lands on Not now, and A on OK does nothing.
    expect(await step("onMoveDown")).toBe(FIRST_RUN_POPUP_WORDS.notNow);
    await act(async () => void screen.getByLabelText(FIRST_RUN_POPUP_WORDS.ok).click());
    await settle();
    expect(calls("start_local_ollama_setup")).toHaveLength(0);
    expect(onClose).not.toHaveBeenCalled();
    expect(ringName()).toBe(SWITCH);
    await act(async () => release?.());
    await settle();
    await act(async () => void screen.getByLabelText(FIRST_RUN_POPUP_WORDS.ok).click());
    await settle();
    expect(calls("start_local_ollama_setup")).toHaveLength(0);
    expect(checked(SWITCH)).toBe("false");
  });

  it("Down from the switch lands on Not now while it is off", async () => {
    permissionBridge(false);
    await open();
    await step("onMoveUp");
    expect(await step("onMoveDown")).toBe(FIRST_RUN_POPUP_WORDS.notNow);
  });

  it("a switch whose save fails goes back off with a message, and OK stays grey", async () => {
    permissionBridge(false);
    setRpcHandler("save_settings", () => {
      throw new Error("back end not answering");
    });
    await open();
    await step("onMoveUp");
    await step("onOKButton");
    await waitFor(() => expect(checked(SWITCH)).toBe("false"));
    expect(await step("onMoveDown")).toBe(FIRST_RUN_POPUP_WORDS.notNow);
    await step("onMoveLeft");
    await step("onMoveLeft");
    expect(await step("onOKButton")).toBe(SWITCH);
    expect(calls("start_local_ollama_setup")).toHaveLength(0);
  });

  it("under Steam's parental lock the switch says why and nothing is saved", async () => {
    permissionBridge(false, true);
    await open();
    expect(text()).toContain("Parental controls keep internet downloads off.");
    await step("onMoveUp");
    await step("onOKButton");
    expect(checked(SWITCH)).toBe("false");
    expect(calls("save_settings")).toHaveLength(0);
  });
});

describe("leaving the first screen", () => {
  it("Not now and B close it and change nothing; a switch turned on first stays on, as on the Permissions tab", async () => {
    permissionBridge(false);
    const first = await open();
    await step("onOKButton");
    expect(first.onClose).toHaveBeenCalledTimes(1);
    expect(getRpcCallLog().filter((c) => c.method !== "get_deck_ip")).toEqual([]);
    first.view.unmount();

    const second = await open();
    await step("onMoveUp");
    await step("onOKButton");
    pressB(second.view.container);
    expect(second.onClose).toHaveBeenCalledTimes(1);
    expect(calls("start_local_ollama_setup")).toHaveLength(0);
    expect(calls("save_settings")).toHaveLength(1);
    expect(readStarterLeftOut()).toEqual([]);
  });
});

describe("Use the AI on my PC", () => {
  it("opens the PC screen with the ring on Back; B and Back return to the first screen", async () => {
    permissionBridge(false);
    const { view } = await open();
    await step("onMoveLeft");
    await step("onOKButton");
    await waitFor(() => expect(ringName()).toBe("Back to the first screen"));
    expect(text()).toContain("Nothing is downloaded on this path. Back changes nothing.");
    expect(text()).toContain("This Deck's IP: 192.168.1.100");
    pressB(view.container);
    await waitFor(() => expect(ringName()).toBe(FIRST_RUN_POPUP_WORDS.notNow));
    expect(text()).toContain(FIRST_RUN_POPUP_WORDS.title);
  });

  it("a test that connects keeps the address, sets the AI to the PC, and turns the button into Ask your first question", async () => {
    permissionBridge(false);
    setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.40.6", models: ["qwen3:8b"] }));
    const { onClose, host } = await open({ ollamaIp: "192.168.1.20" });
    await step("onMoveLeft");
    await step("onOKButton");
    await waitFor(() => expect(ringName()).toBe("Back to the first screen"));
    await step("onMoveLeft");
    await step("onOKButton");
    await waitFor(() => expect(text()).toContain("Connected · Ollama v0.40.6 · 1 model"));
    expect(host.persistOllamaIp).toHaveBeenCalledWith("192.168.1.20");
    expect(host.saveSettingsNow).toHaveBeenCalledWith({ ollama_local_on_deck: false });
    expect(ringName()).toBe("Ask your first question: close this window");
    await step("onOKButton");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("OK after the AI was set to a PC puts it back on this Deck, saved, before the setup starts", async () => {
    permissionBridge(true);
    const order: string[] = [];
    const saveSettingsNow = vi.fn(async (patch: Record<string, unknown>) => {
      await new Promise((r) => setTimeout(r, 5));
      order.push(`saved ${JSON.stringify(patch)}`);
    });
    setRpcHandler("start_local_ollama_setup", () => (order.push("start"), { accepted: true }));
    const { onClose } = await open({ ollamaLocalOnDeck: false, saveSettingsNow });
    await act(async () => void screen.getByLabelText(FIRST_RUN_POPUP_WORDS.ok).click());
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(order).toEqual(['saved {"ollama_local_on_deck":true}', "start"]);
  });
});
