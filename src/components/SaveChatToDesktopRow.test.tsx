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

import { SaveChatToDesktopRow } from "./SaveChatToDesktopRow";
import { usePresetRowNav } from "../features/preset-carousel/presetRowFocusNav";
import * as navFocusRegistry from "../utils/navFocusRegistry";

vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

afterEach(() => {
  navFocusRegistry.resetNavFocusRegistry();
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

  it("is the first stop Up from a chip reaches, ahead of the permission rows", () => {
    const save = { current: { TakeFocus: vi.fn(() => true) } };
    const deny = { current: { TakeFocus: vi.fn(() => true) } };
    navFocusRegistry.registerNavFocus("save-chat-desktop", save);
    navFocusRegistry.registerNavFocus("chat-perm-hint-deny", deny);
    expect(upFromChip()).toBe(true);
    expect(save.current.TakeFocus).toHaveBeenCalledWith(true);
    expect(deny.current.TakeFocus).not.toHaveBeenCalled();
  });

  it("still opens the save dialog on A", () => {
    const onOpen = vi.fn();
    render(<SaveChatToDesktopRow enabled onOpen={onOpen} />);
    fireEvent.click(screen.getByText("Save chat to Desktop"));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
