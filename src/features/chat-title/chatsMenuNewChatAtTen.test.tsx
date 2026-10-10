/**
 * Title: New chat at ten chats asks which chat to drop (plan 87 F2)
 * Purpose: Pin what the Deck check looks at, on the real Main tab and the real name in Decky's bar: with
 *          fewer than ten chats, New chat in the chats menu makes a chat at once and no box opens; with
 *          ten, it opens the "You have 10 chats" picker instead and makes nothing; a pick opens the
 *          Delete chat? box for that chat with Cancel as its first button (where Steam puts the ring);
 *          Delete calls the delete and then the create, in that order, and closes both boxes; Cancel and B,
 *          in the picker or the box, call neither. The ring goes back to the chat's name from both boxes.
 * Used for: ChatsMenu.tsx, useStartNewChat.tsx, ChatSlotPickerModal.tsx, useChatSlotDeleteConfirm.tsx.
 * Does not: Open a real Steam box, so where the ring lands as the boxes close is the Deck row's job
 *           (chatsMenuBoxReturn.test.tsx covers the return once the registry has the name).
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";

type Handlers = Record<string, ((...args: unknown[]) => unknown) | undefined>;
type NavEl = HTMLElement & { __nav?: Handlers };

const hoisted = vi.hoisted(() => ({ modals: [] as React.ReactElement[], closed: 0 }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const Base = stubs.Focusable;
  const KEPT = ["onMoveUp", "onMoveDown", "onMoveLeft", "onMoveRight", "onOKButton", "onCancelButton"];
  const NavFocusable = React.forwardRef<HTMLDivElement, Record<string, unknown>>(function NavFocusable(props, ref) {
    const nav: Handlers = {};
    for (const k of KEPT) nav[k] = props[k] as Handlers[string];
    const { navRef } = props as { navRef?: { current: unknown } };
    const setRef = (el: HTMLDivElement | null) => {
      if (el) {
        (el as NavEl).__nav = nav;
        el.setAttribute("tabindex", "0");
        if (navRef) navRef.current = { TakeFocus: () => (el.focus(), true) };
      }
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
    };
    return <Base {...props} ref={setRef} />;
  });
  return {
    ...stubs,
    Focusable: NavFocusable,
    showModal: (el: React.ReactElement) => {
      hoisted.modals.push(el);
      return {
        Close: () => {
          hoisted.closed += 1;
        },
      };
    },
  };
});

import { ChatTitleView } from "./ChatTitleView";
import { resetChatTitleStore, setChatTitleTab } from "./chatTitleStore";
import { resetChatNameNav } from "./chatNameNav";
import { chatRow, MainTabHarness, newMainTabCalls, type MainTabCalls } from "./chatTitleTestFixtures";
import { ChatSlotDeleteModal } from "../chat-slots/ChatSlotDeleteModal";
import { ChatSlotPickerModal } from "../chat-slots/ChatSlotPickerModal";
import { clearModalReturnFocus, peekModalReturnFocus } from "../plugin-shell/modalReturnFocusRegistry";

let calls: MainTabCalls;
/** Every delete and create call, in the order the Main tab made them. */
let order: string[];

const chatsOf = (n: number) => Array.from({ length: n }, (_, i) => chatRow(`c${i}`, `Chat number ${i}`, 1000 - i));

const nameEl = (title: HTMLElement) => title.querySelector<HTMLElement>(".bonsai-chat-title__name") as NavEl;
const newChatButton = (main: HTMLElement) =>
  main.querySelector<HTMLElement>(".bonsai-chats-menu__action--new") as NavEl;

function mount(chatCount: number, deleteResult = true) {
  setChatTitleTab("main");
  const title = render(<ChatTitleView />);
  const main = render(
    <MainTabHarness
      calls={calls}
      startOn="c0"
      overrides={{
        chatSlotSummaries: chatsOf(chatCount),
        onChatSlotCreate: async () => {
          order.push("create");
        },
        onChatSlotDelete: async (id: string) => {
          order.push(`delete ${id}`);
          return deleteResult;
        },
        onCompleteNestedDeckyModalClose: (close: () => void) => close(),
      }}
    />,
  );
  return { title: title.container, main: main.container };
}

async function settle(ms = 30) {
  await act(async () => new Promise((r) => setTimeout(r, ms)));
}

async function pressA(el: NavEl) {
  await act(async () => {
    el.__nav!.onOKButton!();
  });
  await settle();
}

/** The menu opened, then A on New chat. */
async function pressNewChat(chatCount: number, deleteResult = true) {
  const { title, main } = mount(chatCount, deleteResult);
  await pressA(nameEl(title));
  await pressA(newChatButton(main));
}

const lastModal = () => hoisted.modals.at(-1)!;
const buttonsOf = (el: React.ReactElement) =>
  Array.from(render(el).container.querySelectorAll("button")).map((b) => b as HTMLButtonElement);

beforeEach(() => {
  resetChatTitleStore();
  resetChatNameNav();
  clearModalReturnFocus();
  calls = newMainTabCalls();
  order = [];
  hoisted.modals = [];
  hoisted.closed = 0;
});
afterEach(() => cleanup());

describe("New chat in the chats menu, below ten chats", () => {
  it("makes the chat at once and opens no box", async () => {
    await pressNewChat(9);
    expect(order).toEqual(["create"]);
    expect(hoisted.modals).toHaveLength(0);
  });
});

describe("New chat in the chats menu, at ten chats", () => {
  it("opens the picker, and makes nothing and deletes nothing", async () => {
    await pressNewChat(10);
    expect(lastModal().type).toBe(ChatSlotPickerModal);
    expect(order).toEqual([]);
    expect(hoisted.modals).toHaveLength(1);
  });

  it("lists the ten chats newest first, with the names the chats menu shows, and Cancel last", async () => {
    await pressNewChat(10);
    const labels = buttonsOf(lastModal()).map((b) => b.textContent ?? "");
    expect(labels).toHaveLength(11);
    expect(labels[0]).toContain("Chat number 0");
    expect(labels[9]).toContain("Chat number 9");
    expect(labels[10]).toBe("Cancel");
  });

  it("asks for the ring back on the chat's name when the picker closes", async () => {
    await pressNewChat(10);
    expect(peekModalReturnFocus()).toBe("chat-slot-rename");
  });

  it("a pick opens the Delete chat? box for that chat, Cancel first, and deletes nothing yet", async () => {
    await pressNewChat(10);
    fireEvent.click(buttonsOf(lastModal())[3]!);
    expect(hoisted.modals).toHaveLength(2);
    expect(lastModal().type).toBe(ChatSlotDeleteModal);
    expect((lastModal().props as { label: string }).label).toBe("Chat number 3");
    expect(buttonsOf(lastModal()).map((b) => b.textContent)).toEqual(["Cancel", "Delete"]);
    expect(order).toEqual([]);
  });

  it("Delete in the box deletes the picked chat, then makes the new chat, then closes both boxes", async () => {
    await pressNewChat(10);
    fireEvent.click(buttonsOf(lastModal())[3]!);
    const box = buttonsOf(lastModal());
    await act(async () => {
      fireEvent.click(box[1]!);
      await new Promise((r) => setTimeout(r, 200));
    });
    expect(order).toEqual(["delete c3", "create"]);
    expect(hoisted.closed).toBe(2);
  });

  it("Cancel in the box keeps all ten: neither call is made, and both boxes close", async () => {
    await pressNewChat(10);
    fireEvent.click(buttonsOf(lastModal())[3]!);
    const box = buttonsOf(lastModal());
    await act(async () => {
      fireEvent.click(box[0]!);
    });
    await settle(150);
    expect(order).toEqual([]);
    expect(hoisted.closed).toBe(2);
  });

  it("B in the box keeps all ten: neither call is made", async () => {
    await pressNewChat(10);
    fireEvent.click(buttonsOf(lastModal())[3]!);
    await act(async () => {
      (lastModal().props as { onKeep: () => void }).onKeep();
    });
    await settle(150);
    expect(order).toEqual([]);
    expect(hoisted.closed).toBe(2);
  });

  it("B in the picker keeps all ten: neither call is made, and no Delete chat? box opens", async () => {
    await pressNewChat(10);
    await act(async () => {
      (lastModal().props as { onCancel: () => void }).onCancel();
    });
    expect(order).toEqual([]);
    expect(hoisted.modals).toHaveLength(1);
    expect(hoisted.closed).toBe(1);
  });

  it("Cancel in the picker keeps all ten too", async () => {
    await pressNewChat(10);
    fireEvent.click(buttonsOf(lastModal())[10]!);
    expect(order).toEqual([]);
    expect(hoisted.modals).toHaveLength(1);
    expect(hoisted.closed).toBe(1);
  });

  it("does not make a chat when the delete did not go through", async () => {
    await pressNewChat(10, false);
    fireEvent.click(buttonsOf(lastModal())[3]!);
    const box = buttonsOf(lastModal());
    await act(async () => {
      fireEvent.click(box[1]!);
      await new Promise((r) => setTimeout(r, 200));
    });
    expect(order).toEqual(["delete c3"]);
  });
});
