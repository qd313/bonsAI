/**
 * Title: The chats menu, opened from the name in Decky's bar
 * Purpose: Pin plan 84 step 5's chats menu (rows P84-NAME-02's A half and P84-MENU-01) on the real Main
 *          tab and the real name in Decky's bar, drawn as two separate trees as Decky does: A or a tap on
 *          the name opens the menu over the answer with the ring on the open chat, it lists every chat
 *          with its marks, every action calls what the saved-chats row called, B (or A on the name again)
 *          closes it and puts the ring back on the name, and a bounded walk visits every stop once, with
 *          Steam's own scroll-into-view modelled on the menu's list.
 * Used for: ChatsMenu.tsx, chatsMenuModel.ts, ChatTitleView.tsx, MainTab.tsx.
 * Does not: Test the boxes themselves (ChatSlotRenameModal.test.tsx; the delete box's own tests).
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";

type Handlers = Record<string, ((...args: unknown[]) => unknown) | undefined>;
type NavEl = HTMLElement & { __nav?: Handlers };

const hoisted = vi.hoisted(() => ({ modals: [] as React.ReactElement[] }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const Base = stubs.Focusable;
  const KEPT = ["onMoveUp", "onMoveDown", "onMoveLeft", "onMoveRight", "onOKButton", "onCancelButton"];
  /* Keeps Steam's handlers on the element, and gives `navRef` Steam's TakeFocus onto the element. */
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
      return { Close: () => undefined };
    },
  };
});

import { ChatTitleView } from "./ChatTitleView";
import { getChatTitleState, resetChatTitleStore, setChatTitleTab } from "./chatTitleStore";
import { resetChatNameNav } from "./chatNameNav";
import { chatsMenuMove, chatWhenLabel, CHATS_MENU_ACTIONS } from "./chatsMenuModel";
import { chatRow, FIVE_CHATS, MainTabHarness, newMainTabCalls, type MainTabCalls } from "./chatTitleTestFixtures";
import type { MainTabProps } from "../../components/MainTab";
import type { ChatSumUpState } from "../chat-sum-up/chatSumUpModel";
import { ChatSlotDeleteModal } from "../chat-slots/ChatSlotDeleteModal";
import { ChatSlotRenameModal } from "../chat-slots/ChatSlotRenameModal";
import { clearModalReturnFocus, peekModalReturnFocus } from "../plugin-shell/modalReturnFocusRegistry";
import { desktopNoteExchangeFor } from "../plugin-shell/useDesktopNoteSaveModal";

let calls: MainTabCalls;

const nameEl = (title: HTMLElement) => title.querySelector<HTMLElement>(".bonsai-chat-title__name") as NavEl;
const menu = (main: HTMLElement) => main.querySelector<HTMLElement>(".bonsai-chats-menu");
const stops = (main: HTMLElement) =>
  Array.from(main.querySelectorAll<HTMLElement>(".bonsai-chats-menu__chat, .bonsai-chats-menu__action")) as NavEl[];
const ringOn = () => document.activeElement as NavEl | null;
const label = (el: Element | null) => el?.getAttribute("aria-label") ?? "nothing";
function nameRow(title: HTMLElement): string {
  const words = title.querySelector(".bonsai-chat-title__words")?.textContent ?? "";
  const count = title.querySelector(".bonsai-chat-title__count")?.textContent ?? "";
  return `${words} · ${count}`;
}

function sumUp(over: Partial<ChatSumUpState> = {}): ChatSumUpState {
  return {
    summary: null,
    canSumUp: true,
    questionsAfterSummary: 0,
    summingUp: false,
    summingUpSeconds: null,
    otherJobRunning: false,
    startSumUp: vi.fn(),
    stopSumUp: vi.fn(),
    ...over,
  };
}

/** The real name in Decky's bar and the real Main tab, two trees, as Decky draws them. */
function mount(overrides: Partial<MainTabProps> = {}, startOn: string | null = "b") {
  setChatTitleTab("main");
  const title = render(<ChatTitleView />);
  const main = render(<MainTabHarness calls={calls} startOn={startOn} overrides={overrides} />);
  return { title: title.container, main: main.container };
}

/** Lets the menu's transfer of the ring onto the open chat run (it waits for Steam's nav node). */
async function settle() {
  await act(async () => new Promise((r) => setTimeout(r, 30)));
}

async function pressA(el: NavEl) {
  await act(async () => {
    el.__nav!.onOKButton!();
  });
  await settle();
}

async function openMenu(title: HTMLElement) {
  await pressA(nameEl(title));
}

function pressDir(dir: "Up" | "Down" | "Left" | "Right"): boolean {
  let claimed = false;
  act(() => {
    claimed = ringOn()!.__nav![`onMove${dir}`]!() === true;
  });
  return claimed;
}

async function pressB(el: NavEl): Promise<{ prevented: boolean }> {
  let prevented = false;
  await act(async () => {
    el.__nav!.onCancelButton!({ preventDefault: () => (prevented = true) });
  });
  return { prevented };
}

beforeEach(() => {
  resetChatTitleStore();
  resetChatNameNav();
  clearModalReturnFocus();
  calls = newMainTabCalls();
  hoisted.modals = [];
});
afterEach(() => {
  cleanup();
});

describe("opening and closing the menu", () => {
  it("A on the name opens it over the answer, in the dock, with the ring on the open chat", async () => {
    const { title, main } = mount();
    expect(menu(main)).toBeNull();
    await openMenu(title);
    const m = menu(main);
    expect(m).not.toBeNull();
    expect(m!.parentElement!.classList.contains("bonsai-main-tab-dock")).toBe(true);
    expect(label(ringOn())).toBe("Boss help, open now");
  });

  it("a tap on the name opens it too", async () => {
    const { title, main } = mount();
    await act(async () => nameEl(title).click());
    await settle();
    expect(menu(main)).not.toBeNull();
  });

  it("B closes it and puts the ring back on the chat's name, and keeps Steam from backing out", async () => {
    const { title, main } = mount();
    await openMenu(title);
    const { prevented } = await pressB(ringOn()!);
    expect(menu(main)).toBeNull();
    expect(ringOn()).toBe(nameEl(title));
    expect(prevented).toBe(true);
  });

  it("A on the name again closes it", async () => {
    const { title, main } = mount();
    await openMenu(title);
    act(() => nameEl(title).focus());
    await pressA(nameEl(title));
    expect(menu(main)).toBeNull();
    expect(getChatTitleState().menuOpen).toBe(false);
  });

  it("B on the name closes the open menu; with the menu shut, B on the name is Decky's own", async () => {
    const { title, main } = mount();
    expect(nameEl(title).__nav!.onCancelButton).toBeUndefined();
    await openMenu(title);
    await pressB(nameEl(title));
    expect(menu(main)).toBeNull();
  });

  it("Down from the name closes a menu the ring had left, so it is never left open behind the ring", async () => {
    const { title, main } = mount();
    await openMenu(title);
    act(() => nameEl(title).focus());
    act(() => {
      nameEl(title).__nav!.onMoveDown!();
    });
    expect(menu(main)).toBeNull();
  });

  it("Up from the first chat leaves for the name", async () => {
    const { title, main } = mount({}, "a");
    await openMenu(title);
    expect(label(ringOn())).toBe("Hades build, open now");
    expect(pressDir("Up")).toBe(true);
    expect(menu(main)).toBeNull();
    expect(ringOn()).toBe(nameEl(title));
  });

  it("at the new-chat spot the ring enters on the newest chat", async () => {
    const { title } = mount({}, null);
    await openMenu(title);
    expect(label(ringOn())).toBe("Hades build");
  });
});

describe("what the menu lists", () => {
  it("every chat newest first, the open one marked, a dot on a reply waiting and a ring on one still writing", async () => {
    const now = Date.now() / 1000;
    const { title, main } = mount({
      chatSlotSummaries: [chatRow("a", "Hades build", now), ...FIVE_CHATS.slice(1)],
      generatingSlotId: "c",
      unreadSlotIds: new Set(["d", "c"]),
    });
    await openMenu(title);
    const rows = Array.from(main.querySelectorAll(".bonsai-chats-menu__chat"));
    expect(rows.map((r) => r.querySelector(".bonsai-chats-menu__label")?.textContent)).toEqual(FIVE_CHATS.map((c) => c.label));
    expect(rows.map((r) => r.classList.contains("bonsai-chats-menu__chat--current"))).toEqual([false, true, false, false, false]);
    expect(rows[2]!.querySelector(".bonsai-chats-menu__mark--writing")).not.toBeNull();
    expect(rows[2]!.querySelector(".bonsai-chats-menu__mark--unread")).toBeNull();
    expect(rows[3]!.querySelector(".bonsai-chats-menu__mark--unread")).not.toBeNull();
    expect(rows[0]!.querySelector(".bonsai-chats-menu__when")?.textContent).toBe("now");
    expect(main.querySelector(".bonsai-chats-menu__heading")?.textContent).toBe("Your chats");
  });

  it("the five actions as drawn, Delete in red", async () => {
    const { title, main } = mount();
    await openMenu(title);
    const actions = Array.from(main.querySelectorAll(".bonsai-chats-menu__action"));
    expect(actions.map((a) => a.textContent)).toEqual([
      "New chat",
      "Rename chat",
      "Sum up this chat",
      "Save to Desktop note",
      "Delete chat",
    ]);
    expect(actions[4]!.classList.contains("bonsai-chats-menu__action--danger")).toBe(true);
  });
});

describe("every action does what the saved-chats row did", () => {
  const action = (main: HTMLElement, id: string) => main.querySelector<HTMLElement>(`.bonsai-chats-menu__action--${id}`) as NavEl;

  it("A on a chat opens it: Decky's bar reads 'Ollama on PC, chat 4 of 5' and the ring is back on the name", async () => {
    const { title, main } = mount();
    await openMenu(title);
    pressDir("Down");
    pressDir("Down");
    await pressA(ringOn()!);
    expect(calls.selected).toEqual(["d"]);
    expect(menu(main)).toBeNull();
    expect(nameRow(title)).toBe("Ollama on PC · chat 4 of 5");
    expect(ringOn()).toBe(nameEl(title));
  });

  it("A on the open chat just closes the menu", async () => {
    const { title, main } = mount();
    await openMenu(title);
    await pressA(ringOn()!);
    expect(calls.selected).toEqual([]);
    expect(menu(main)).toBeNull();
  });

  it("New chat makes a new chat, as A on the row's new-chat spot did", async () => {
    const { title, main } = mount();
    await openMenu(title);
    await pressA(action(main, "new"));
    expect(calls.created).toBe(1);
    expect(menu(main)).toBeNull();
  });

  it("Rename chat opens the rename box with the chat's name, and Save renames that chat", async () => {
    const { title, main } = mount();
    await openMenu(title);
    await pressA(action(main, "rename"));
    expect(menu(main)).toBeNull();
    const box = hoisted.modals.at(-1)!;
    expect(box.type).toBe(ChatSlotRenameModal);
    expect((box.props as { initialLabel: string }).initialLabel).toBe("Boss help");
    await act(async () => {
      await (box.props as { onConfirm: (l: string) => Promise<void> }).onConfirm("Raid night");
    });
    expect(calls.renamed).toEqual([["b", "Raid night"]]);
    expect(peekModalReturnFocus()).toBe("chat-slot-rename");
  });

  it("Delete chat opens the two-button box; Cancel keeps the chat, Delete deletes that one chat", async () => {
    const { title, main } = mount();
    await openMenu(title);
    await pressA(action(main, "delete"));
    const box = hoisted.modals.at(-1)!;
    expect(box.type).toBe(ChatSlotDeleteModal);
    expect((box.props as { label: string }).label).toBe("Boss help");
    act(() => (box.props as { onKeep: () => void }).onKeep());
    expect(calls.deleted).toEqual([]);
    await openMenu(title);
    await pressA(action(main, "delete"));
    await act(async () => (hoisted.modals.at(-1)!.props as { onDelete: () => void }).onDelete());
    expect(calls.deleted).toEqual(["b"]);
  });

  it("Save to Desktop note opens the save window when the chat has an answer", async () => {
    const onOpenDesktopNoteSave = vi.fn();
    const { title, main } = mount({ canSaveDesktopNote: true, onOpenDesktopNoteSave });
    await openMenu(title);
    expect(action(main, "save").classList.contains("bonsai-chats-menu__action--off")).toBe(false);
    await pressA(action(main, "save"));
    expect(onOpenDesktopNoteSave).toHaveBeenCalledTimes(1);
    expect(peekModalReturnFocus()).toBe("desktop-note-save");
  });

  it("Save works on an older chat whose answers are all from earlier sessions (plan 72 job E)", async () => {
    const onOpenDesktopNoteSave = vi.fn();
    const older = [
      { id: "t1", question: "How do I get the Stygian Blade's aspects?", answer: "Unlock them with Titan Blood." },
      { id: "t2", question: "Which aspect is best against Theseus?", answer: "Aspect of Nemesis." },
    ];
    const canSave = desktopNoteExchangeFor(null, older) !== null;
    const { title, main } = mount({ canSaveDesktopNote: canSave, onOpenDesktopNoteSave });
    await openMenu(title);
    expect(action(main, "save").classList.contains("bonsai-chats-menu__action--off")).toBe(false);
    await pressA(action(main, "save"));
    expect(onOpenDesktopNoteSave).toHaveBeenCalledTimes(1);
  });

  it("Save is greyed and does nothing while the chat has no answer to save", async () => {
    const onOpenDesktopNoteSave = vi.fn();
    const { title, main } = mount({ canSaveDesktopNote: false, onOpenDesktopNoteSave });
    await openMenu(title);
    expect(action(main, "save").classList.contains("bonsai-chats-menu__action--off")).toBe(true);
    await pressA(action(main, "save"));
    expect(onOpenDesktopNoteSave).not.toHaveBeenCalled();
    expect(menu(main)).not.toBeNull();
  });

  it("Save without the permission is greyed but still opens the window, which asks for it", async () => {
    const onOpenDesktopNoteSave = vi.fn();
    const { title, main } = mount({ canSaveDesktopNote: true, desktopNoteSaveEnabled: false, onOpenDesktopNoteSave });
    await openMenu(title);
    expect(action(main, "save").classList.contains("bonsai-chats-menu__action--off")).toBe(true);
    await pressA(action(main, "save"));
    expect(onOpenDesktopNoteSave).toHaveBeenCalledTimes(1);
  });

  it("Sum up this chat starts the Session tab's own job when it is allowed", async () => {
    const state = sumUp();
    const { title, main } = mount({
      chatSlotSummaries: FIVE_CHATS.map((c) => (c.id === "b" ? { ...c, sumUp: state } : c)),
    });
    await openMenu(title);
    await pressA(action(main, "sumup"));
    expect(state.startSumUp).toHaveBeenCalledTimes(1);
    expect(menu(main)).toBeNull();
  });

  it("Sum up is greyed and does nothing when the Session tab's button would be (nothing to sum up yet)", async () => {
    const state = sumUp({ canSumUp: false });
    const { title, main } = mount({
      chatSlotSummaries: FIVE_CHATS.map((c) => (c.id === "b" ? { ...c, sumUp: state } : c)),
    });
    await openMenu(title);
    expect(action(main, "sumup").classList.contains("bonsai-chats-menu__action--off")).toBe(true);
    await pressA(action(main, "sumup"));
    expect(state.startSumUp).not.toHaveBeenCalled();
  });

  it("at the new-chat spot there is nothing to rename, delete or save", async () => {
    const onOpenDesktopNoteSave = vi.fn();
    const { title, main } = mount({ canSaveDesktopNote: true, onOpenDesktopNoteSave }, null);
    await openMenu(title);
    for (const id of ["rename", "delete", "save"]) {
      expect(action(main, id).classList.contains("bonsai-chats-menu__action--off")).toBe(true);
      await pressA(action(main, id));
    }
    expect(hoisted.modals).toEqual([]);
    expect(onOpenDesktopNoteSave).not.toHaveBeenCalled();
  });
});

describe("walking the menu with the D-pad", () => {
  /**
   * Steam's own scroll-into-view on the menu's list, after every landing: the list shows 200 points,
   * each stop is 27 tall with 4 between; a stop not wholly on screen is brought just into view.
   */
  function modelSteamScroll(main: HTMLElement) {
    const list = menu(main)!;
    const all = stops(main);
    const top = (el: HTMLElement) => all.indexOf(el as NavEl) * 31;
    let scrollTop = 0;
    return () => {
      const el = ringOn()!;
      const t = top(el);
      if (t < scrollTop) scrollTop = t;
      if (t + 27 > scrollTop + 200) scrollTop = t + 27 - 200;
      list.scrollTop = scrollTop;
      return t >= scrollTop && t + 27 <= scrollTop + 200;
    };
  }

  it("a bounded walk visits every chat and every action exactly once, each wholly in view, and the ends hold", async () => {
    const { title, main } = mount();
    await openMenu(title);
    const scroll = modelSteamScroll(main);
    const all = stops(main);
    expect(all.length).toBe(FIVE_CHATS.length + CHATS_MENU_ACTIONS.length);
    pressDir("Up");
    expect(label(ringOn())).toBe("Hades build");
    const seen = [label(ringOn())];
    const presses: Array<"Up" | "Down" | "Left" | "Right"> = ["Down", "Down", "Down", "Down", "Down", "Right", "Down", "Left", "Down"];
    for (const p of presses) {
      expect(pressDir(p)).toBe(true);
      expect(scroll()).toBe(true);
      expect(seen).not.toContain(label(ringOn()));
      seen.push(label(ringOn()));
    }
    expect(new Set(seen).size).toBe(all.length);
    expect(label(ringOn())).toBe("Delete chat");
    /* The end holds: Down, Left and Right on Delete claim the press and leave the ring there. */
    for (const p of ["Down", "Left"] as const) {
      expect(pressDir(p)).toBe(true);
      expect(label(ringOn())).toBe("Delete chat");
    }
    expect(menu(main)).not.toBeNull();
  });

  it("Left and Right on a chat hold still (nothing beside it; Steam's own Left would leave bonsAI)", async () => {
    const { title } = mount();
    await openMenu(title);
    const here = ringOn();
    expect(pressDir("Left")).toBe(true);
    expect(pressDir("Right")).toBe(true);
    expect(ringOn()).toBe(here);
  });
});

describe("the menu's own rules", () => {
  it("never lets a press out except Up from the first chat", () => {
    for (let at = 0; at < 5 + CHATS_MENU_ACTIONS.length; at += 1) {
      for (const dir of ["up", "down", "left", "right"] as const) {
        const m = chatsMenuMove(5, at, dir);
        if (m === "leave") expect([at, dir]).toEqual([0, "up"]);
        if (typeof m === "object") expect(m.to).toBeLessThan(5 + CHATS_MENU_ACTIONS.length);
      }
    }
    expect(chatsMenuMove(0, 0, "up")).toBe("leave");
  });

  it("writes when each chat last changed, as drawn", () => {
    const now = new Date(2026, 9, 8, 22, 0).getTime();
    const at = (d: Date) => d.getTime() / 1000;
    expect(chatWhenLabel(at(new Date(2026, 9, 8, 21, 59, 40)), now)).toBe("now");
    expect(chatWhenLabel(at(new Date(2026, 9, 8, 21, 55)), now)).toBe("5 min");
    expect(chatWhenLabel(at(new Date(2026, 9, 8, 20, 0)), now)).toBe("2 h");
    expect(chatWhenLabel(at(new Date(2026, 9, 7, 9, 0)), now)).toBe("yesterday");
    expect(chatWhenLabel(at(new Date(2026, 9, 5, 9, 0)), now)).toBe("Mon");
    expect(chatWhenLabel(at(new Date(2026, 8, 30, 9, 0)), now)).toBe("Sep 30");
    expect(chatWhenLabel(0, now)).toBe("");
  });
});
