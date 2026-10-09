/**
 * Title: After a box opened from the chats menu closes, the ring is on the chat's name
 * Purpose: Pin the fix for what the Deck showed on 2026-10-08: Rename chat, then B in the rename box, and
 *          the ring landed on Decky's back arrow beside the name (one A there closes bonsAI), not on the
 *          name. The test sits where the Deck check looks: Decky's real-shaped title bar (its back arrow,
 *          then bonsAI's title view) and the real Main tab as two trees, the plugin shell's own box-close
 *          path, and Steam's ring modelled so that only Steam's own transfer moves it
 *          (test-harness/steamRing.tsx). When the box closes, Steam puts the ring on the back arrow, as
 *          the Deck measured; the question is where it is once the shell's return has run. Covers Rename,
 *          Delete and Save to Desktop note, and a landing on the arrow that comes after the return.
 * Used for: ChatsMenu.tsx, chatNameNav.ts, modalReturnFocusRegistry.ts, useBonsaiPluginShell.ts.
 * Does not: Prove when Steam itself lands the ring as the box closes; only the Deck shows that, so both
 *           orders (before the return, and after it) are tested.
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
import { resetDeckyTitleParts } from "./deckyTitleParts";
import { MainTabHarness, newMainTabCalls, type MainTabCalls } from "./chatTitleTestFixtures";
import { putSteamRingOn, steamRingHolder, type SteamEl } from "../../test-harness/steamRing";
import { useBonsaiPluginShell } from "../../hooks/useBonsaiPluginShell";
import { buildInitialSessionSnapshot } from "../plugin-shell/initialSessionSnapshot";
import { clearModalReturnFocus, resetModalReturnFocusRegistry } from "../plugin-shell/modalReturnFocusRegistry";
import { ChatSlotRenameModal } from "../chat-slots/ChatSlotRenameModal";
import { ChatSlotDeleteModal } from "../chat-slots/ChatSlotDeleteModal";

let calls: MainTabCalls;
let finishBoxClose: ((close: () => void) => void) | null = null;

/** The real Main tab, handed the plugin shell's own box-close path, as index.tsx hands it. */
function ShellMainTab({ onOpenDesktopNoteSave }: { onOpenDesktopNoteSave?: () => void }) {
  const shell = useBonsaiPluginShell({ getSessionSnapshot: buildInitialSessionSnapshot });
  finishBoxClose = shell.finalizeShowModalAndRestoreActiveTab;
  return (
    <MainTabHarness
      calls={calls}
      overrides={{
        onBeforeNestedDeckyModal: shell.captureSessionBeforeModal,
        onCompleteNestedDeckyModalClose: shell.finalizeShowModalAndRestoreActiveTab,
        canSaveDesktopNote: true,
        onOpenDesktopNoteSave,
      }}
    />
  );
}

/** Decky's title bar as Decky Loader's TitleView draws it: its back arrow, then bonsAI's view. */
function mount(onOpenDesktopNoteSave?: () => void) {
  setChatTitleTab("main");
  const title = render(
    <div data-testid="decky-title">
      <button className="DialogButton" aria-label="Back">
        &larr;
      </button>
      <ChatTitleView />
    </div>,
  );
  const main = render(<ShellMainTab onOpenDesktopNoteSave={onOpenDesktopNoteSave} />);
  const name = title.container.querySelector<HTMLElement>(".bonsai-chat-title__name") as SteamEl;
  const arrow = title.container.querySelector<HTMLElement>("button.DialogButton")!;
  return { name, arrow, main: main.container };
}

const advance = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
};

async function pressA(el: SteamEl) {
  await act(async () => {
    el.__nav!.onOKButton!();
  });
  await advance(700);
}

const action = (main: HTMLElement, id: string) =>
  main.querySelector<HTMLElement>(`.bonsai-chats-menu__action--${id}`) as SteamEl;

const where = (name: HTMLElement, arrow: HTMLElement) => {
  const ring = steamRingHolder();
  return ring === name ? "the chat's name" : ring === arrow ? "Decky's back arrow" : (ring?.getAttribute("aria-label") ?? "nothing");
};

beforeEach(() => {
  vi.useFakeTimers();
  resetChatTitleStore();
  resetChatNameNav();
  resetDeckyTitleParts();
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

/** Opens the chats menu from the name and presses A on one of its actions. */
async function runAction(name: SteamEl, main: HTMLElement, id: string) {
  await pressA(name);
  await pressA(action(main, id));
}

describe("the ring after a box opened from the chats menu closes", () => {
  it("Rename chat, then B in the box: the ring is on the chat's name, not on Decky's back arrow", async () => {
    const { name, arrow, main } = mount();
    await runAction(name, main, "rename");
    const box = hoisted.modals.at(-1)!;
    expect(box.type).toBe(ChatSlotRenameModal);
    putSteamRingOn(null); // the box has the ring
    act(() => (box.props as { onCancel: () => void }).onCancel());
    putSteamRingOn(arrow); // the box closes: Steam lands the ring on the back arrow (Deck, 2026-10-08)
    await advance(1500);
    expect(where(name, arrow)).toBe("the chat's name");
  });

  it("Delete chat, then Cancel: the ring is on the chat's name", async () => {
    const { name, arrow, main } = mount();
    await runAction(name, main, "delete");
    const box = hoisted.modals.at(-1)!;
    expect(box.type).toBe(ChatSlotDeleteModal);
    putSteamRingOn(null);
    act(() => (box.props as { onKeep: () => void }).onKeep());
    putSteamRingOn(arrow);
    await advance(1500);
    expect(where(name, arrow)).toBe("the chat's name");
  });

  it("Save to Desktop note, then the save window closes: the ring is on the chat's name", async () => {
    const { name, arrow, main } = mount(() => undefined);
    await runAction(name, main, "save");
    putSteamRingOn(null);
    act(() => finishBoxClose!(() => undefined));
    putSteamRingOn(arrow);
    await advance(1500);
    expect(where(name, arrow)).toBe("the chat's name");
  });

  it("a landing on the back arrow that comes after the return is taken back to the name", async () => {
    const { name, arrow, main } = mount();
    await runAction(name, main, "rename");
    const box = hoisted.modals.at(-1)!;
    putSteamRingOn(null);
    act(() => (box.props as { onCancel: () => void }).onCancel());
    await advance(150); // the shell's return has run: the ring is on the name
    expect(where(name, arrow)).toBe("the chat's name");
    putSteamRingOn(arrow); // Steam's own landing, a moment later
    await advance(400);
    expect(where(name, arrow)).toBe("the chat's name");
  });

  it("a person who walks Left onto the back arrow on purpose, later, is left there", async () => {
    const { name, arrow, main } = mount();
    await runAction(name, main, "rename");
    const box = hoisted.modals.at(-1)!;
    putSteamRingOn(null);
    act(() => (box.props as { onCancel: () => void }).onCancel());
    await advance(3000);
    putSteamRingOn(arrow);
    await advance(2000);
    expect(where(name, arrow)).toBe("Decky's back arrow");
  });
});
