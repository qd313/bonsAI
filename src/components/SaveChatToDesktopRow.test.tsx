/**
 * Title: Up from a suggestion chip stops on "Save chat to Desktop"
 * Purpose: Pin the fix for the plan 70 finding (docs/test-evidence/plan70-SMOKE-C.json and the
 *          PERMS-CLEAN-06 walk): Save chat to Desktop sits right above the chips, but nothing let
 *          the chips' Up reach it, so Up stepped over it to the permission rows or the answer.
 * Used for: SaveChatToDesktopRow.tsx and the chip row's Up (usePresetRowNav).
 * Does not: Prove the fix on the Deck (see the commit for the check it owes).
 */
import { render, renderHook, screen, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SaveChatToDesktopRow, upFromSaveChat } from "./SaveChatToDesktopRow";
import { usePresetRowNav } from "../features/preset-carousel/presetRowFocusNav";
import * as navFocusRegistry from "../utils/navFocusRegistry";

vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

afterEach(() => {
  navFocusRegistry.resetNavFocusRegistry();
  document.body.innerHTML = "";
});

function upFromChip(): boolean {
  const { result } = renderHook(() => usePresetRowNav(1));
  return (result.current.handlersFor(0, 1).onMoveUp as () => boolean)();
}

describe("Save chat to Desktop as a stop above the chips", () => {
  it("registers its row as a Steam nav target while it is on screen", () => {
    const spy = vi.spyOn(navFocusRegistry, "registerNavFocus");
    const { unmount } = render(<SaveChatToDesktopRow enabled onOpen={() => {}} />);
    const calls = spy.mock.calls.filter(([id]) => id === "save-chat-desktop");
    expect(calls.length).toBe(1);
    const holder = calls[0]![1] as { current: unknown };
    holder.current = { TakeFocus: () => true };
    expect(navFocusRegistry.takeNavFocus("save-chat-desktop")).toBe(true);
    unmount();
    expect(navFocusRegistry.takeNavFocus("save-chat-desktop")).toBe(false);
    spy.mockRestore();
  });

  /* The Deck's shape: the pane (88-766) with the dock at 600, the row drawn inside it. */
  function rowInPane(rowTop: number) {
    const pane = document.createElement("div");
    pane.className = "_TabContentsScroll";
    Object.defineProperty(pane, "scrollHeight", { value: 1500, configurable: true });
    Object.defineProperty(pane, "clientHeight", { value: 678, configurable: true });
    pane.getBoundingClientRect = () => ({ top: 88, bottom: 766 }) as DOMRect;
    const dock = document.createElement("div");
    dock.className = "bonsai-main-tab-dock";
    dock.getBoundingClientRect = () => ({ top: 600, bottom: 766 }) as DOMRect;
    const host = document.createElement("div");
    pane.append(host, dock);
    document.body.appendChild(pane);
    const view = render(<SaveChatToDesktopRow enabled onOpen={() => {}} />, { container: host });
    const row = host.querySelector<HTMLElement>(".bonsai-save-chat-desktop-row")!;
    row.getBoundingClientRect = () => ({ top: rowTop, bottom: rowTop + 38 }) as DOMRect;
    return { pane, view };
  }

  it("is the first stop Up from a chip reaches, ahead of the permission rows", () => {
    rowInPane(540);
    const save = { current: { TakeFocus: vi.fn(() => true) } };
    const deny = { current: { TakeFocus: vi.fn(() => true) } };
    navFocusRegistry.registerNavFocus("save-chat-desktop", save);
    navFocusRegistry.registerNavFocus("chat-perm-hint-deny", deny);
    expect(upFromChip()).toBe(true);
    expect(save.current.TakeFocus).toHaveBeenCalledWith(true);
    expect(deny.current.TakeFocus).not.toHaveBeenCalled();
  });

  /*
   * plan70-R-R3-try2.json (3 times over a running game): Up from the chip put the ring on Save chat
   * while it sat behind the dock, 0% visible, then 33%. A row behind the dock is not a stop for the
   * chips' Up; the ring goes on to the next row up instead.
   */
  it("is skipped while it sits behind the dock, and Up goes on to the next row up", () => {
    rowInPane(610);
    const save = { current: { TakeFocus: vi.fn(() => true) } };
    const deny = { current: { TakeFocus: vi.fn(() => true) } };
    navFocusRegistry.registerNavFocus("save-chat-desktop", save);
    navFocusRegistry.registerNavFocus("chat-perm-hint-deny", deny);
    expect(upFromChip()).toBe(true);
    expect(save.current.TakeFocus).not.toHaveBeenCalled();
    expect(deny.current.TakeFocus).toHaveBeenCalledWith(true);
  });

  /*
   * Same run: from Save chat, Up did nothing. With no permission row above it, Up is left to Steam
   * (as before the row was registered) rather than claimed by a hop that did not move the ring.
   */
  it("Up from it hands a row above through Steam's transfer, or leaves the move to Steam", () => {
    /* An answer on screen with a notes block: the old fallback's plain focus() landed here. */
    const slot = document.createElement("div");
    slot.className = "bonsai-chat-turn-slot";
    const notes = document.createElement("div");
    notes.className = "bonsai-kb-notes-block Panel Focusable";
    slot.appendChild(notes);
    document.body.appendChild(slot);
    const hint = { current: { TakeFocus: vi.fn(() => true) } };
    expect(upFromSaveChat()).toBe(false);
    expect(document.activeElement).not.toBe(notes);
    navFocusRegistry.registerNavFocus("chat-perm-hint-troubleshoot", hint);
    expect(upFromSaveChat()).toBe(true);
    expect(hint.current.TakeFocus).toHaveBeenCalledWith(true);
  });

  it("still opens the save dialog on A", () => {
    const onOpen = vi.fn();
    render(<SaveChatToDesktopRow enabled onOpen={onOpen} />);
    fireEvent.click(screen.getByText("Save chat to Desktop"));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
