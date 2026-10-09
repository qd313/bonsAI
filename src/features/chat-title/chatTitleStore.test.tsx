/**
 * Title: The chat title store, read from a separate React tree
 * Purpose: Pin plan 84 step 5's shared store. Decky draws the plugin's title view outside bonsAI's own
 *          box, so it reads the open chat through this store. These tests mount a reader and a writer
 *          as two separate React roots, as Decky does, in both orders, and take each away on its own.
 * Used for: chatTitleStore.ts.
 * Does not: Draw the real name row (ChatTitleView.test.tsx does).
 */
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, render } from "@testing-library/react";

import {
  clearChatTitle,
  getChatTitleState,
  publishChatTitle,
  resetChatTitleStore,
  setChatTitleTab,
  setChatsMenuOpen,
  subscribeChatTitle,
  useChatTitleState,
  useChatTitleValue,
  type ChatTitleActions,
  type ChatTitleChat,
} from "./chatTitleStore";

const CHAT: ChatTitleChat = {
  name: "Boss help",
  place: 2,
  count: 5,
  unsaved: false,
  answerInFlight: false,
  chats: [],
};
const ACTIONS: ChatTitleActions = { previous: () => {}, next: () => {}, takeFirstStop: () => false };

/** Stands in for Decky's title view: its own root, reading only the store. */
function Reader() {
  const s = useChatTitleState();
  return <span data-testid="reader">{s.tab === "main" && s.chat ? `${s.chat.name} · ${s.chat.place}/${s.chat.count}` : "bonsAI"}</span>;
}

/** Stands in for the Main tab: writes on mount, clears on unmount, under its own owner. */
function Writer({ chat = CHAT }: { chat?: ChatTitleChat }) {
  useEffect(() => {
    const me = {};
    publishChatTitle(me, chat, ACTIONS);
    return () => clearChatTitle(me);
  }, [chat]);
  return null;
}

beforeEach(() => {
  resetChatTitleStore();
});
afterEach(() => {
  cleanup();
});

describe("the chat title store, title view and Main tab in separate trees", () => {
  it("title view first: shows the wordmark, then the chat once the Main tab publishes", () => {
    const title = render(<Reader />);
    expect(title.getByTestId("reader").textContent).toBe("bonsAI");
    act(() => setChatTitleTab("main"));
    render(<Writer />);
    expect(title.getByTestId("reader").textContent).toBe("Boss help · 2/5");
  });

  it("Main tab first: the title view mounting later reads the chat straight away", () => {
    act(() => setChatTitleTab("main"));
    render(<Writer />);
    const title = render(<Reader />);
    expect(title.getByTestId("reader").textContent).toBe("Boss help · 2/5");
  });

  it("the title view unmounting on its own leaves the chat for the next one", () => {
    act(() => setChatTitleTab("main"));
    render(<Writer />);
    const first = render(<Reader />);
    first.unmount();
    expect(getChatTitleState().chat?.name).toBe("Boss help");
    const second = render(<Reader />);
    expect(second.getByTestId("reader").textContent).toBe("Boss help · 2/5");
  });

  it("the Main tab unmounting takes its chat and actions away, and the title view falls back", () => {
    act(() => setChatTitleTab("main"));
    const main = render(<Writer />);
    const title = render(<Reader />);
    act(() => main.unmount());
    expect(getChatTitleState().chat).toBeNull();
    expect(getChatTitleState().actions).toBeNull();
    expect(title.getByTestId("reader").textContent).toBe("bonsAI");
  });

  it("an old Main tab copy's clean-up does not wipe what a new copy just wrote", () => {
    const oldCopy = {};
    const newCopy = {};
    publishChatTitle(oldCopy, CHAT, ACTIONS);
    publishChatTitle(newCopy, { ...CHAT, name: "Battery life" }, ACTIONS);
    clearChatTitle(oldCopy);
    expect(getChatTitleState().chat?.name).toBe("Battery life");
  });

  it("other tabs show the wordmark even with a chat published", () => {
    act(() => setChatTitleTab("main"));
    render(<Writer />);
    const title = render(<Reader />);
    act(() => setChatTitleTab("settings"));
    expect(title.getByTestId("reader").textContent).toBe("bonsAI");
  });
});

describe("what changes, and what does not", () => {
  it("a publish that changes nothing does not wake the readers", () => {
    const me = {};
    publishChatTitle(me, CHAT, ACTIONS);
    let woken = 0;
    const stop = subscribeChatTitle(() => {
      woken += 1;
    });
    publishChatTitle(me, { ...CHAT, chats: [] }, ACTIONS);
    expect(woken).toBe(0);
    publishChatTitle(me, { ...CHAT, place: 3 }, ACTIONS);
    expect(woken).toBe(1);
    stop();
  });

  it("a reader of one value redraws only when that value changes", () => {
    let draws = 0;
    function MenuFlag() {
      draws += 1;
      return <span>{String(useChatTitleValue((s) => s.menuOpen))}</span>;
    }
    act(() => setChatTitleTab("main"));
    render(<MenuFlag />);
    const before = draws;
    act(() => publishChatTitle({}, CHAT, ACTIONS));
    expect(draws).toBe(before);
    act(() => setChatsMenuOpen(true));
    expect(draws).toBe(before + 1);
  });

  it("the menu opens only on the Main tab with a chat, and closes when the tab changes", () => {
    setChatsMenuOpen(true);
    expect(getChatTitleState().menuOpen).toBe(false);
    setChatTitleTab("main");
    setChatsMenuOpen(true);
    expect(getChatTitleState().menuOpen).toBe(false);
    publishChatTitle({}, CHAT, ACTIONS);
    setChatsMenuOpen(true);
    expect(getChatTitleState().menuOpen).toBe(true);
    setChatTitleTab("about");
    expect(getChatTitleState().menuOpen).toBe(false);
  });
});
