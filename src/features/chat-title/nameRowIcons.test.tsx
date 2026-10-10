/**
 * Title: The + and the delete icon on the chat's name row (plan 87 F5)
 * Purpose: Pin the Deck check for F5 at the level it looks at: both icons drawn on the row with spoken names,
 *          Left and Right from the name reaching them (Steam's transfer, the ring on exactly one stop, no
 *          stop visited twice), A on the + making a new chat (F2's shared rule, so the picker at ten chats),
 *          A on the delete icon opening the usual Delete chat? box for the open chat, B from each icon
 *          returning the ring to the name, the ring's way back after the box closes (the delete icon after
 *          Cancel, the name after Delete, and still right when the title bar is drawn again in between),
 *          and the row's width: the back arrow the same size, the name between the icons and never under
 *          the delete icon. Decky's real-shaped title bar and the real Main tab are two trees, as on the
 *          Deck, and Steam's ring moves only by Steam's own transfer (test-harness/steamRing.tsx).
 * Used for: ChatRowIcons.tsx, chatRowIconNav.ts, chatRowActions.ts, useChatRowActions.ts, ChatTitleView.tsx,
 *           chatTitleStyles.ts.
 * Does not: Model Steam's scroll: the name row sits in Decky's fixed title bar, above the scrolling pane,
 *           so nothing scrolls under a step here. Does not prove when Steam lands the ring as a box closes;
 *           both orders are tested, as in chatsMenuBoxReturn.test.tsx.
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";

const hoisted = vi.hoisted(() => ({ modals: [] as React.ReactElement[] }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../test-harness/steamRing");
  return {
    ...stubs,
    Focusable: SteamRingFocusable,
    showModal: (el: React.ReactElement) => {
      hoisted.modals.push(el);
      return { Close: () => undefined };
    },
  };
});

import { ChatTitleView } from "./ChatTitleView";
import { resetChatTitleStore, setChatTitleTab } from "./chatTitleStore";
import { resetChatNameNav } from "./chatNameNav";
import { resetChatRowIconNav } from "./chatRowIconNav";
import { resetChatRowActions } from "./chatRowActions";
import { resetDeckyTitleParts } from "./deckyTitleParts";
import { ICON_SLOT_PX, NAME_LINE_FURNITURE_PX } from "./chatTitleStyles";
import { layoutTitleBar } from "./titleBarFlexModel";
import { chatRow, MainTabHarness, newMainTabCalls, type MainTabCalls } from "./chatTitleTestFixtures";
import type { MainTabProps } from "../../components/MainTab";
import { putSteamRingOn, steamRingHolder, type SteamEl } from "../../test-harness/steamRing";
import { resetNavFocusRegistry } from "../../utils/navFocusRegistry";
import { useBonsaiPluginShell } from "../../hooks/useBonsaiPluginShell";
import { buildInitialSessionSnapshot } from "../plugin-shell/initialSessionSnapshot";
import { clearModalReturnFocus, resetModalReturnFocusRegistry } from "../plugin-shell/modalReturnFocusRegistry";
import { ChatSlotDeleteModal } from "../chat-slots/ChatSlotDeleteModal";
import { ChatSlotPickerModal } from "../chat-slots/ChatSlotPickerModal";

let calls: MainTabCalls;
let finishBoxClose: ((close: () => void) => void) | null = null;

/** The real Main tab, handed the plugin shell's own box-close path, as index.tsx hands it. */
function ShellMainTab({ startOn, extra }: { startOn: string | null; extra?: Partial<MainTabProps> }) {
  const shell = useBonsaiPluginShell({ getSessionSnapshot: buildInitialSessionSnapshot });
  finishBoxClose = shell.finalizeShowModalAndRestoreActiveTab;
  return (
    <MainTabHarness
      calls={calls}
      startOn={startOn}
      overrides={{
        onBeforeNestedDeckyModal: shell.captureSessionBeforeModal,
        onCompleteNestedDeckyModalClose: shell.finalizeShowModalAndRestoreActiveTab,
        ...extra,
      }}
    />
  );
}

/** Decky's title bar as Decky Loader's TitleView draws it: its back arrow, then bonsAI's view. */
function TitleBar() {
  return (
    <div data-testid="decky-title">
      <button className="DialogButton" aria-label="Back">
        &larr;
      </button>
      <ChatTitleView />
    </div>
  );
}

function mount(startOn: string | null = "b", extra?: Partial<MainTabProps>) {
  setChatTitleTab("main");
  const title = render(<TitleBar />);
  const main = render(<ShellMainTab startOn={startOn} extra={extra} />);
  return { title, main };
}

const q = (c: HTMLElement, sel: string) => c.querySelector<HTMLElement>(sel) as SteamEl;
const plus = (c: HTMLElement) => q(c, ".bonsai-chat-title__icon--new");
const bin = (c: HTMLElement) => q(c, ".bonsai-chat-title__icon--delete");
const nameOf = (c: HTMLElement) => q(c, ".bonsai-chat-title__name");
const arrowOf = (c: HTMLElement) => q(c, "button.DialogButton");

const advance = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
};

/** What a person would say the ring is on. */
function where(c: HTMLElement): string {
  const ring = steamRingHolder();
  if (ring === plus(c)) return "+";
  if (ring === nameOf(c)) return "name";
  if (ring === bin(c)) return "delete";
  if (ring === arrowOf(c)) return "Decky's back arrow";
  return ring?.getAttribute("aria-label") ?? "nothing";
}

/** One D-pad press on a stop, as Steam delivers it: the move handler. True when the stop claimed it. */
function press(el: SteamEl, move: "onMoveLeft" | "onMoveRight" | "onMoveUp" | "onMoveDown"): boolean | undefined {
  let handled: unknown;
  act(() => {
    handled = el.__nav![move]?.();
  });
  return handled === undefined ? undefined : Boolean(handled);
}

/** B on a stop; returns whether the press was kept from Decky's own back-out. */
function pressB(el: SteamEl): boolean {
  let prevented = false;
  act(() => {
    el.__nav!.onCancelButton!({ preventDefault: () => (prevented = true) });
  });
  return prevented;
}

beforeEach(() => {
  vi.useFakeTimers();
  resetChatTitleStore();
  resetChatNameNav();
  resetChatRowIconNav();
  resetChatRowActions();
  resetDeckyTitleParts();
  resetNavFocusRegistry();
  resetModalReturnFocusRegistry();
  clearModalReturnFocus();
  calls = newMainTabCalls();
  hoisted.modals = [];
  finishBoxClose = null;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("both icons are on the name row, with spoken names and no words", () => {
  it("draws a + before the name and a delete icon after it, named New chat and Delete chat", () => {
    const { title } = mount();
    const c = title.container;
    const row = Array.from(q(c, ".bonsai-chat-title__row").children);
    const stops = row.filter((el) => el.matches(".bonsai-chat-title__icon, .bonsai-chat-title__name"));
    expect(stops).toEqual([plus(c), nameOf(c), bin(c)]);
    expect(plus(c).getAttribute("aria-label")).toBe("New chat");
    expect(bin(c).getAttribute("aria-label")).toBe("Delete chat");
    expect(plus(c).textContent).toBe("");
    expect(bin(c).textContent).toBe("");
    expect(plus(c).querySelector("svg")).not.toBeNull();
    expect(bin(c).querySelector("svg")).not.toBeNull();
  });

  it("a chat the menu could not delete (the new-chat spot) greys the delete icon but keeps it a stop", () => {
    const { title } = mount(null);
    expect(bin(title.container).getAttribute("data-off")).toBe("true");
    expect(plus(title.container).getAttribute("data-off")).toBeNull();
  });
});

describe("Left and Right from the name reach the icons, one stop at a time", () => {
  it("walks + -> name -> delete and back by Steam's transfer, each stop once, holding at the ends", () => {
    const { title } = mount();
    const c = title.container;
    putSteamRingOn(nameOf(c));
    const seen: string[] = [where(c)];

    expect(press(nameOf(c), "onMoveLeft")).toBe(true);
    seen.push(where(c));
    expect(press(plus(c), "onMoveRight")).toBe(true);
    seen.push(where(c));
    expect(press(nameOf(c), "onMoveRight")).toBe(true);
    seen.push(where(c));
    /* Right from the delete icon holds: claimed, nothing moves. */
    expect(press(bin(c), "onMoveRight")).toBe(true);
    expect(where(c)).toBe("delete");
    expect(press(bin(c), "onMoveLeft")).toBe(true);
    seen.push(where(c));

    expect(seen).toEqual(["name", "+", "name", "delete", "name"]);
    /* Left from the + is Steam's own: it reaches Decky's back arrow, nothing of ours claims it. */
    expect(plus(c).__nav!.onMoveLeft).toBeUndefined();
  });

  it("one sweep left to right and back visits each of the three stops once, in order", () => {
    const { title } = mount();
    const c = title.container;
    putSteamRingOn(plus(c));
    const sweep: string[] = [where(c)];
    press(plus(c), "onMoveRight");
    sweep.push(where(c));
    press(nameOf(c), "onMoveRight");
    sweep.push(where(c));
    expect(new Set(sweep).size).toBe(3);
    expect(sweep).toEqual(["+", "name", "delete"]);
    const back: string[] = [];
    press(bin(c), "onMoveLeft");
    back.push(where(c));
    press(nameOf(c), "onMoveLeft");
    back.push(where(c));
    expect(back).toEqual(["name", "+"]);
  });

  it("every stop is a real stop for Steam: it carries focusable and its own transfer", () => {
    const { title } = mount();
    const c = title.container;
    for (const el of [plus(c), bin(c)]) {
      expect(el.getAttribute("tabindex")).toBe("0");
      expect(el.__nav!.onOKButton).toBeTypeOf("function");
      expect(el.__nav!.onButtonDown).toBeTypeOf("function");
    }
  });
});

describe("Steam's own marker survives the icon redrawing", () => {
  it("the ring marker stays on the icon after its ring look is drawn (React must not rewrite the class)", () => {
    const { title } = mount();
    const c = title.container;
    act(() => putSteamRingOn(bin(c)));
    expect(bin(c).getAttribute("data-ring")).toBe("true");
    expect(bin(c).classList.contains("gpfocus")).toBe(true);
    act(() => putSteamRingOn(plus(c)));
    expect(bin(c).getAttribute("data-ring")).toBeNull();
    expect(plus(c).classList.contains("gpfocus")).toBe(true);
  });
});

describe("A on each icon does its job", () => {
  it("A on the + makes a new chat, and leaves the ring where it was", async () => {
    const { title } = mount();
    const c = title.container;
    putSteamRingOn(plus(c));
    await act(async () => plus(c).__nav!.onOKButton!());
    expect(calls.created).toBe(1);
    expect(hoisted.modals).toHaveLength(0);
    expect(where(c)).toBe("+");
  });

  it("at ten chats A on the + opens the same picker the menu's New chat does, and makes no chat yet", async () => {
    const ten = Array.from({ length: 10 }, (_, i) => chatRow(`s${i}`, `Chat ${i}`, 100 - i));
    const { title } = mount("s3", { chatSlotSummaries: ten });
    const c = title.container;
    putSteamRingOn(plus(c));
    await act(async () => plus(c).__nav!.onOKButton!());
    expect(hoisted.modals.at(-1)!.type).toBe(ChatSlotPickerModal);
    expect(calls.created).toBe(0);
    expect(calls.deleted).toEqual([]);
  });

  it("A on the delete icon opens the Delete chat? box for the open chat, and deletes nothing yet", async () => {
    const { title } = mount();
    const c = title.container;
    putSteamRingOn(bin(c));
    await act(async () => bin(c).__nav!.onOKButton!());
    const box = hoisted.modals.at(-1)!;
    expect(box.type).toBe(ChatSlotDeleteModal);
    expect((box.props as { label: string }).label).toBe("Boss help");
    expect(calls.deleted).toEqual([]);
    expect(calls.created).toBe(0);
  });

  it("A on a greyed delete icon (the new-chat spot) does nothing", async () => {
    const { title } = mount(null);
    const c = title.container;
    await act(async () => bin(c).__nav!.onOKButton!());
    expect(hoisted.modals).toHaveLength(0);
    expect(calls.deleted).toEqual([]);
  });

  it("a tap does the same as A, once", async () => {
    const { title } = mount();
    const c = title.container;
    await act(async () => plus(c).click());
    expect(calls.created).toBe(1);
  });
});

describe("B on either icon returns the ring to the name", () => {
  it("B on the + and on the delete icon each land on the name and keep Decky from backing out", () => {
    const { title } = mount();
    const c = title.container;
    putSteamRingOn(plus(c));
    expect(pressB(plus(c))).toBe(true);
    expect(where(c)).toBe("name");
    putSteamRingOn(bin(c));
    expect(pressB(bin(c))).toBe(true);
    expect(where(c)).toBe("name");
  });
});

describe("the ring after the Delete chat? box opened from the delete icon closes", () => {
  async function openBox(c: HTMLElement) {
    putSteamRingOn(bin(c));
    await act(async () => bin(c).__nav!.onOKButton!());
    putSteamRingOn(null); // the box has the ring (on Cancel)
    return hoisted.modals.at(-1)!;
  }

  it("Cancel: the ring is back on the delete icon, not on Decky's back arrow, and nothing is deleted", async () => {
    const { title } = mount();
    const c = title.container;
    const box = await openBox(c);
    act(() => (box.props as { onKeep: () => void }).onKeep());
    putSteamRingOn(arrowOf(c)); // the box closes: Steam lands the ring on the back arrow (Deck, 2026-10-08)
    await advance(1500);
    expect(where(c)).toBe("delete");
    expect(calls.deleted).toEqual([]);
  });

  it("Cancel: a landing on the back arrow that comes after the return is taken back to the delete icon", async () => {
    const { title } = mount();
    const c = title.container;
    const box = await openBox(c);
    act(() => (box.props as { onKeep: () => void }).onKeep());
    await advance(150);
    expect(where(c)).toBe("delete");
    putSteamRingOn(arrowOf(c));
    await advance(400);
    expect(where(c)).toBe("delete");
  });

  it("Delete: the chat goes and the ring is on the name", async () => {
    const { title } = mount();
    const c = title.container;
    const box = await openBox(c);
    act(() => (box.props as { onDelete: () => void }).onDelete());
    /* The box stays up until the delete is done, then closes: Steam lands the ring as it goes. */
    await act(async () => {});
    putSteamRingOn(arrowOf(c));
    await advance(1500);
    expect(calls.deleted).toEqual(["b"]);
    expect(where(c)).toBe("name");
  });

  it("Cancel still returns to the delete icon when the title bar is drawn again between open and close", async () => {
    const first = mount();
    const box = await openBox(first.title.container);
    /* Closing a Decky box rebuilds what is behind it: the note must not live in the component. */
    first.title.unmount();
    const again = render(<TitleBar />);
    const c = again.container;
    act(() => (box.props as { onKeep: () => void }).onKeep());
    putSteamRingOn(arrowOf(c));
    await advance(1500);
    expect(where(c)).toBe("delete");
    expect(finishBoxClose).not.toBeNull();
  });
});

describe("the row's width, at 300 points with Decky's 40-point back arrow", () => {
  const LETTER_PX = 6.4;
  const SHORT = "wheatley fight";
  const LONG = "How do I beat the boss in the Soul Sanctum in Hollow Knight?";
  function barFor(name: string) {
    const { title } = mount();
    const css = title.container.querySelector("style")!.textContent ?? "";
    cleanup();
    return layoutTitleBar(css, name.length * LETTER_PX + NAME_LINE_FURNITURE_PX, 50, ICON_SLOT_PX);
  }

  it("the back arrow is 40 with a 14-letter name and with a 60-letter name, icons and all", () => {
    expect(barFor(SHORT).arrow).toBe(40);
    expect(barFor(LONG).arrow).toBe(40);
  });

  it("the name's box starts right after the + and, when long, runs to the delete icon but never under it", () => {
    const short = barFor(SHORT);
    const long = barFor(LONG);
    const plusEnd = 16 + 40 + 10 + ICON_SLOT_PX;
    expect(short.nameStart).toBe(plusEnd);
    expect(long.nameStart).toBe(plusEnd);
    expect(long.nameEnd).toBeLessThanOrEqual(long.deleteStart + 0.001);
    expect(long.nameEnd).toBeGreaterThan(long.deleteStart - 1);
    /* Further right than before the icons (the name's box ended at x 234 on the Deck with a long name). */
    expect(long.nameEnd).toBeGreaterThan(234);
  });

  it("a short name stays centred on the panel's centre line", () => {
    const short = barFor(SHORT);
    expect(Math.abs((short.nameStart + short.nameEnd) / 2 - 150)).toBeLessThanOrEqual(1);
  });

  it("about 20 characters still fit once the icons are there: at least 139 points of room for the words", () => {
    const long = barFor(LONG);
    expect(long.name - NAME_LINE_FURNITURE_PX).toBeGreaterThanOrEqual(139);
  });
});
