/**
 * Title: Up from a suggestion chip, now that Save chat to Desktop has left the chat
 *
 * Purpose: Plan 72 moved Save chat to Desktop out from under the last answer and into the chat
 * row as a save icon. The chips' Up used to try that row first; it must now go straight to what sat
 * above it -- the permission rows when they show, else the newest answer's own controls, else the
 * stop above the chat (the chat row until plan 84 step 5 removed it; the tab bar since) -- and never
 * aim at the removed stop.
 *
 * Does not: Press anything on the Deck. The names the chips may hand the ring to are a closed
 * list (NavFocusId); the old "save-chat-desktop" is no longer on it, so a leftover call to it
 * would not type-check at all.
 */
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { usePresetRowNav } from "./presetRowFocusNav";
import * as navFocusRegistry from "../../utils/navFocusRegistry";

vi.mock("@decky/ui", async () => import("../../test-harness/fakeDeckyUi"));

afterEach(() => {
  vi.restoreAllMocks();
  navFocusRegistry.resetNavFocusRegistry();
  document.body.innerHTML = "";
});

function upFromChip(): boolean {
  const { result } = renderHook(() => usePresetRowNav(1));
  return (result.current.handlersFor(0, 1).onMoveUp as () => boolean)();
}
const holder = () => ({ current: { TakeFocus: vi.fn(() => true) } });

describe("Up from a suggestion chip", () => {
  it("goes first to the ban-lookup row when it shows", () => {
    const spy = vi.spyOn(navFocusRegistry, "takeNavFocus");
    const deny = holder();
    navFocusRegistry.registerNavFocus("chat-perm-hint-deny", deny);
    expect(upFromChip()).toBe(true);
    expect(deny.current.TakeFocus).toHaveBeenCalledWith(true);
    // Nothing is tried before the permission rows any more.
    expect(spy.mock.calls[0]?.[0]).toBe("chat-perm-hint-deny");
  });

  it("goes to the troubleshooting hint when that is the only permission row", () => {
    const hint = holder();
    navFocusRegistry.registerNavFocus("chat-perm-hint-troubleshoot", hint);
    expect(upFromChip()).toBe(true);
    expect(hint.current.TakeFocus).toHaveBeenCalledWith(true);
  });

  it("with no permission row and no answer, lands on the tab bar above the chat (the saved-chats row is gone)", () => {
    const spy = vi.spyOn(navFocusRegistry, "takeNavFocus");
    const slotRow = holder();
    navFocusRegistry.registerNavFocus("tab-bar", slotRow);
    expect(upFromChip()).toBe(true);
    expect(slotRow.current.TakeFocus).toHaveBeenCalledWith(true);
    expect(spy.mock.calls.map((c) => c[0])).not.toContain("save-chat-desktop");
  });
});
