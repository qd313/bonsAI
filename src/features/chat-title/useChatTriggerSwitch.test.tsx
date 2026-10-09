/**
 * Title: LT and RT switch chats from anywhere on the Main tab
 * Purpose: Pin plan 84 step 5's LT and RT (row P84-NAME-02's LT/RT half) the way the Deck delivers them:
 *          a `vgp_onbuttondown` event with button 7 or 8, heard at the panel's document wherever the
 *          ring is (measured 2026-10-08, plan 84 test A). The real Main tab and the real name in
 *          Decky's bar are drawn as two separate trees, and the test reads the name row's words.
 * Used for: useChatTriggerSwitch.ts, useChatSwitchActions.ts, focusNavigation.ts's trigger helpers.
 * Does not: Open the chats menu (ChatsMenu.test.tsx).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";

const hoisted = vi.hoisted(() => ({ takes: [] as string[] }));

vi.mock("@decky/ui", async () => import("../../test-harness/fakeDeckyUi"));
vi.mock("../../utils/navFocusRegistry", async (orig) => {
  const real = await orig<typeof import("../../utils/navFocusRegistry")>();
  return {
    ...real,
    takeNavFocus: (id: string) => {
      hoisted.takes.push(id);
      return true;
    },
  };
});

import { ChatTitleView } from "./ChatTitleView";
import { resetChatTitleStore, setChatTitleTab, setChatsMenuOpen } from "./chatTitleStore";
import { chatSwitchStep } from "./useChatSwitchActions";
import { MainTabHarness, newMainTabCalls, type MainTabCalls } from "./chatTitleTestFixtures";
import {
  clearModalReturnFocus,
  rememberModalReturnFocus,
} from "../plugin-shell/modalReturnFocusRegistry";

const LT = 7;
const RT = 8;

/** One trigger press as the Deck sends it: on the element the ring is on, heard at the document. */
async function press(button: number, on: Element = document.body): Promise<void> {
  await act(async () => {
    on.dispatchEvent(new CustomEvent("vgp_onbuttondown", { detail: { button }, bubbles: true }));
  });
}

function nameRow(title: HTMLElement): string {
  const words = title.querySelector(".bonsai-chat-title__words")?.textContent ?? "";
  const count = title.querySelector(".bonsai-chat-title__count")?.textContent ?? "";
  return `${words} · ${count}`;
}

let calls: MainTabCalls;

function mount(startOn: string | null = "b") {
  setChatTitleTab("main");
  const title = render(<ChatTitleView />);
  const main = render(<MainTabHarness calls={calls} startOn={startOn} />);
  return { title: title.container, main: main.container };
}

beforeEach(() => {
  resetChatTitleStore();
  clearModalReturnFocus();
  calls = newMainTabCalls();
  hoisted.takes = [];
});
afterEach(() => {
  cleanup();
  document.querySelectorAll(".gpfocus").forEach((el) => el.remove());
});

describe("the old row's order", () => {
  it("steps one place each way and stops at both ends, never wrapping", () => {
    expect(chatSwitchStep(2, 5, 1)).toBe(3);
    expect(chatSwitchStep(2, 5, -1)).toBe(1);
    expect(chatSwitchStep(0, 5, -1)).toBeNull();
    expect(chatSwitchStep(5, 5, 1)).toBeNull();
    expect(chatSwitchStep(1, 5, -1)).toBe(0);
  });
});

describe("LT and RT on the Main tab", () => {
  it("RT opens the next chat: chat 2 of 5 becomes chat 3 of 5 in Decky's bar", async () => {
    const { title } = mount();
    expect(nameRow(title)).toBe("Boss help · chat 2 of 5");
    await press(RT);
    expect(calls.selected).toEqual(["c"]);
    expect(nameRow(title)).toBe("Battery life · chat 3 of 5");
  });

  it("LT opens the previous chat", async () => {
    const { title } = mount();
    await press(LT);
    expect(calls.selected).toEqual(["a"]);
    expect(nameRow(title)).toBe("Hades build · chat 1 of 5");
  });

  it("LT on the newest chat shows the new-chat spot without switching away; RT comes back without a reload", async () => {
    const { title, main } = mount("a");
    await press(LT);
    expect(calls.selected).toEqual([]);
    expect(nameRow(title)).toBe("New chat · not saved yet");
    expect(main.querySelector(".bonsai-chat-empty-state")).not.toBeNull();
    await press(LT);
    expect(nameRow(title)).toBe("New chat · not saved yet");
    await press(RT);
    expect(calls.selected).toEqual([]);
    expect(nameRow(title)).toBe("Hades build · chat 1 of 5");
  });

  it("leaves the new-chat spot as soon as the open chat changes (a chat made or picked elsewhere)", async () => {
    setChatTitleTab("main");
    const title = render(<ChatTitleView />);
    const main = render(<MainTabHarness calls={calls} startOn="a" />);
    await press(LT);
    expect(nameRow(title.container)).toBe("New chat · not saved yet");
    /* The first question from the spot makes a chat and opens it (useChatSlots' createSlot). */
    main.rerender(<MainTabHarness calls={calls} startOn="a" overrides={{ activeChatSlotId: "b" }} />);
    expect(nameRow(title.container)).toBe("Boss help · chat 2 of 5");
  });

  it("RT on the oldest chat does nothing", async () => {
    const { title } = mount("e");
    await press(RT);
    expect(calls.selected).toEqual([]);
    expect(nameRow(title)).toBe("Second boss, phase two strategy · chat 5 of 5");
  });

  it("works with the ring anywhere: in the Main tab, or on the name in Decky's bar", async () => {
    const { title, main } = mount();
    await press(RT, main.querySelector(".bonsai-main-tab-dock")!);
    await press(RT, title.querySelector(".bonsai-chat-title__name")!);
    expect(calls.selected).toEqual(["c", "d"]);
    expect(nameRow(title)).toBe("Ollama on PC · chat 4 of 5");
  });

  it("ignores every other button: A, B, the bumpers, the D-pad", async () => {
    const { title } = mount();
    for (const button of [1, 2, 3, 4, 5, 6, 9, 10, 11, 12]) await press(button);
    expect(calls.selected).toEqual([]);
    expect(nameRow(title)).toBe("Boss help · chat 2 of 5");
  });
});

describe("when LT and RT are refused", () => {
  it("while the chats menu is open", async () => {
    mount();
    act(() => setChatsMenuOpen(true));
    await press(RT);
    await press(LT);
    expect(calls.selected).toEqual([]);
  });

  it("while a box is open that asked for the ring back", async () => {
    mount();
    rememberModalReturnFocus("plugin-help");
    await press(RT);
    expect(calls.selected).toEqual([]);
  });

  it("on any other tab", async () => {
    mount();
    act(() => setChatTitleTab("settings"));
    await press(RT);
    expect(calls.selected).toEqual([]);
  });

  it("once the Main tab is gone, nothing is listening", async () => {
    setChatTitleTab("main");
    const main = render(<MainTabHarness calls={calls} />);
    main.unmount();
    await press(RT);
    expect(calls.selected).toEqual([]);
  });
});

describe("the ring after a switch", () => {
  const settle = () => act(async () => new Promise((r) => setTimeout(r, 200)));

  it("goes to the question box when the control it was on left with the old chat", async () => {
    setChatTitleTab("main");
    const answerStop = document.createElement("div");
    answerStop.className = "gpfocus";
    document.body.appendChild(answerStop);
    /* Switching chats replaces the chat on screen: the answer the ring was on goes with it. */
    render(<MainTabHarness calls={calls} overrides={{ onChatSlotSelect: async () => answerStop.remove() }} />);
    await press(RT, answerStop);
    await settle();
    expect(answerStop.isConnected).toBe(false);
    expect(hoisted.takes).toContain("unified-input");
  });

  it("stays put when the control it is on is still there (the name, the chips, the box)", async () => {
    const { title } = mount();
    title.querySelector(".bonsai-chat-title__name")!.classList.add("gpfocus");
    await press(RT);
    await settle();
    expect(hoisted.takes).not.toContain("unified-input");
  });
});
