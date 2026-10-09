/**
 * Title: The Main tab tells Decky's bar which chat is open
 * Purpose: Pin what the chat's name in Decky's bar says for each state of the chat list (plan 84 step
 *          5): the open chat's name and "chat n of m" in the saved-chats row's own order, "New chat"
 *          and "not saved yet" for the new-chat spot or a chat nobody has asked anything in, and the
 *          unread and still-writing marks. The last test mounts the real Main tab and the real title
 *          view as two separate React roots, as Decky does, and reads the words on the name row.
 * Used for: useChatTitlePublisher.ts, MainTab.tsx, ChatTitleView.tsx.
 * Does not: Switch chats (useChatTriggerSwitch.test.tsx and the menu's tests do).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

vi.mock("@decky/ui", async () => import("../../test-harness/fakeDeckyUi"));

import { MainTab } from "../../components/MainTab";
import { ChatTitleView } from "./ChatTitleView";
import { baseMainTabProps, chatRow as row, FIVE_CHATS as FIVE } from "./chatTitleTestFixtures";
import { getChatTitleState, resetChatTitleStore, setChatTitleTab } from "./chatTitleStore";
import { buildChatTitleChat, type ChatTitleSource } from "./useChatTitlePublisher";

function source(over: Partial<ChatTitleSource> = {}): ChatTitleSource {
  return {
    summaries: FIVE,
    activeSlotId: "b",
    atCreate: false,
    generatingSlotId: null,
    unreadSlotIds: new Set(),
    answerInFlight: false,
    transcriptEmpty: false,
    ...over,
  };
}

beforeEach(() => {
  resetChatTitleStore();
});
afterEach(() => {
  cleanup();
});

describe("what the name row says", () => {
  it("names the open chat and its place, newest first: the second of five", () => {
    const c = buildChatTitleChat(source())!;
    expect(c).toMatchObject({ name: "Boss help", place: 2, count: 5, unsaved: false });
  });

  it("the new-chat spot reads New chat, not saved yet", () => {
    expect(buildChatTitleChat(source({ atCreate: true }))).toMatchObject({ name: "New chat", place: 0, unsaved: true });
  });

  it("no chat open at all (a fresh install) is the new-chat spot too", () => {
    expect(buildChatTitleChat(source({ activeSlotId: null, summaries: [] }))).toMatchObject({
      name: "New chat",
      place: 0,
      count: 0,
      unsaved: true,
    });
  });

  it("a chat made with New chat and nothing asked yet is not saved yet; once asked, it is chat n of m", () => {
    const list = [row("n", "New chat"), ...FIVE];
    expect(buildChatTitleChat(source({ summaries: list, activeSlotId: "n", transcriptEmpty: true }))).toMatchObject({
      name: "New chat",
      place: 1,
      unsaved: true,
    });
    expect(buildChatTitleChat(source({ summaries: list, activeSlotId: "n", transcriptEmpty: false }))!.unsaved).toBe(false);
  });

  it("an empty chat someone renamed is kept, so it is not 'not saved yet'", () => {
    const list = [row("n", "Raid night"), ...FIVE];
    expect(buildChatTitleChat(source({ summaries: list, activeSlotId: "n", transcriptEmpty: true }))!.unsaved).toBe(false);
  });

  it("waits for the list rather than calling a saved chat New chat while the list loads", () => {
    expect(buildChatTitleChat(source({ summaries: [], activeSlotId: "b" }))).toBeNull();
  });

  it("marks unread and still-writing chats, still writing winning, and the current one", () => {
    const c = buildChatTitleChat(source({ generatingSlotId: "c", unreadSlotIds: new Set(["c", "d"]) }))!;
    const marks = Object.fromEntries(c.chats.map((r) => [r.id, `${r.current ? "current " : ""}${r.writing ? "writing" : ""}${r.unread ? "unread" : ""}`.trim()]));
    expect(marks).toEqual({ a: "", b: "current", c: "writing", d: "unread", e: "" });
  });
});

describe("the real Main tab and the real title view, in two separate trees", () => {
  it("Decky's bar shows the open chat's name and 'chat 3 of 5' while the Main tab is drawn", () => {
    setChatTitleTab("main");
    const title = render(<ChatTitleView />);
    const main = render(<MainTab {...baseMainTabProps()} activeChatSlotId="c" />);
    expect(title.container.querySelector(".bonsai-chat-title__words")?.textContent).toBe("Battery life");
    expect(title.container.querySelector(".bonsai-chat-title__count")?.textContent).toBe("chat 3 of 5");
    main.unmount();
    expect(getChatTitleState().chat).toBeNull();
    expect(title.container.querySelector(".bonsai-chat-title__wordmark")).not.toBeNull();
  });
});
