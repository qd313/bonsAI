/**
 * Title: Y opens the Search tab from Main (plan 92, lane N3b)
 * Purpose: Pin the Deck check "from the question box on Main, Y opens Search" the way the Deck delivers Y: a
 *          `vgp_onbuttondown` event with button 4 heard at the panel's document wherever the ring is. Y on Main
 *          switches to the Search tab and asks for the ring on its find box; Y on any other tab does nothing; Y
 *          does nothing while the chats menu is open or a box that asked for the ring back is open; the other
 *          buttons (X, A, B, the bumpers, the triggers) are not touched; and the listener goes when the hook does.
 * Used for: useSearchShortcut.ts, focusNavigation.ts (isOptionsDeckButtonEvent), searchJumpStore.ts.
 * Does not: Cover Steam's on-screen keyboard (no signal exists to test against; see the hook's header).
 */
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getChatTitleState, publishChatTitle, resetChatTitleStore, setChatTitleTab, setChatsMenuOpen } from "../chats/title/chatTitleStore";
import { clearModalReturnFocus, rememberModalReturnFocus } from "../../shared/dpad/modalReturnFocusRegistry";
import { peekSearchArrival, registerSearchTabSwitch, resetSearchJump } from "./searchJumpStore";
import { useSearchShortcut } from "./useSearchShortcut";

function Harness({ tab }: { tab: string }): null {
  useSearchShortcut(tab);
  return null;
}

/** A button press as the Deck sends it: on the element the ring is on, heard at the document first. */
function press(button: number, on: Element = document.body): void {
  act(() => {
    on.dispatchEvent(new CustomEvent("vgp_onbuttondown", { detail: { button }, bubbles: true }));
  });
}

const Y = 4;
let switched: string[];

beforeEach(() => {
  resetSearchJump();
  resetChatTitleStore();
  clearModalReturnFocus();
  switched = [];
  registerSearchTabSwitch((id) => switched.push(id));
});
afterEach(cleanup);

describe("Y on the Main tab", () => {
  it("opens the Search tab, with the ring wanted on its find box, from wherever the ring is", () => {
    render(<Harness tab="main" />);
    const box = document.body.appendChild(document.createElement("textarea"));
    press(Y, box);
    expect(switched).toEqual(["search"]);
    expect(peekSearchArrival()).toBe("find");
  });

  it("does nothing on any other tab", () => {
    for (const tab of ["search", "about", "ollama", "settings", "permissions", "developer"]) {
      render(<Harness tab={tab} />);
      press(Y);
      cleanup();
    }
    expect(switched).toEqual([]);
  });

  it("follows the tab: Y does nothing after Main is left, and works again when it is back", () => {
    const view = render(<Harness tab="main" />);
    view.rerender(<Harness tab="about" />);
    press(Y);
    expect(switched).toEqual([]);
    view.rerender(<Harness tab="main" />);
    press(Y);
    expect(switched).toEqual(["search"]);
  });

  it("does nothing while the chats menu is open", () => {
    render(<Harness tab="main" />);
    /* The menu opens only on the Main tab, with a chat to show: the Main tab's own publication. */
    setChatTitleTab("main");
    publishChatTitle(
      {},
      { name: "Boss help", place: 1, count: 2, unsaved: false, answerInFlight: false, chats: [] },
      { previous: () => {}, next: () => {}, takeFirstStop: () => true },
    );
    setChatsMenuOpen(true);
    expect(getChatTitleState().menuOpen).toBe(true);
    press(Y);
    expect(switched).toEqual([]);
    setChatsMenuOpen(false);
    press(Y);
    expect(switched).toEqual(["search"]);
  });

  it("does nothing while a box that asked for the ring back is open (rename, save, the pickers)", () => {
    render(<Harness tab="main" />);
    rememberModalReturnFocus("plugin-help");
    press(Y);
    expect(switched).toEqual([]);
    clearModalReturnFocus();
    press(Y);
    expect(switched).toEqual(["search"]);
  });

  it("leaves every other button alone", () => {
    render(<Harness tab="main" />);
    for (const button of [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12]) press(button);
    expect(switched).toEqual([]);
    expect(peekSearchArrival()).toBeNull();
  });

  it("stops listening when the hook goes away", () => {
    const view = render(<Harness tab="main" />);
    view.unmount();
    press(Y);
    expect(switched).toEqual([]);
  });
});
