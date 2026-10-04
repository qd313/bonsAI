/**
 * Title: The troubleshooting hint's two buttons, and the walk through both permission rows
 * Purpose: Pin the fix for PERMS-CLEAN-06 and SMOKE-C (plan 70): the troubleshooting hint's Dismiss
 *          could not be reached with the D-pad (Right from its "Open Permissions" did nothing, twice),
 *          walking Up from the ban-lookup row skipped the hint, and walking Up from the suggestion
 *          chip skipped both permission rows for Show details.
 * Used for: chatTranscriptNavHelpers.ts (troubleshootHintRowNavHandlers, vacDenyRowMoveUp) and the
 *           chip row's Up (usePresetRowNav).
 * Does not: Prove the fix on the Deck. The check this owes is written in the commit.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

import { troubleshootHintRowNavHandlers, vacDenyRowMoveDown, vacDenyRowMoveUp } from "./chatTranscriptNavHelpers";
import { registerNavFocus, resetNavFocusRegistry } from "./navFocusRegistry";
import { usePresetRowNav } from "../features/preset-carousel/presetRowFocusNav";
import { resetDetailsSlotStore, setSlotShowsLine } from "../features/details-slot/detailsSlotStore";

function fakeNavHolder() {
  return { current: { TakeFocus: vi.fn(() => true) } };
}

function mountHintButtons() {
  const open = document.createElement("button");
  open.textContent = "Open Permissions";
  const dismiss = document.createElement("button");
  dismiss.textContent = "Dismiss";
  document.body.append(open, dismiss);
  return { open, dismiss, els: { current: [open, dismiss] as (HTMLElement | null)[] } };
}

beforeEach(() => {
  resetNavFocusRegistry();
  resetDetailsSlotStore();
});
afterEach(() => {
  document.body.innerHTML = "";
  resetNavFocusRegistry();
  resetDetailsSlotStore();
});

describe("the troubleshooting hint row's Left and Right", () => {
  it("Right from Open Permissions lands on Dismiss", () => {
    const { open, dismiss, els } = mountHintButtons();
    open.focus();
    const handlers = troubleshootHintRowNavHandlers(els);
    expect((handlers.onMoveRight as () => boolean)()).toBe(true);
    expect(document.activeElement).toBe(dismiss);
  });

  it("Left from Dismiss lands back on Open Permissions", () => {
    const { open, dismiss, els } = mountHintButtons();
    dismiss.focus();
    const handlers = troubleshootHintRowNavHandlers(els);
    expect((handlers.onMoveLeft as () => boolean)()).toBe(true);
    expect(document.activeElement).toBe(open);
  });

  it("holds still at either end instead of leaving the plugin", () => {
    const { open, dismiss, els } = mountHintButtons();
    const handlers = troubleshootHintRowNavHandlers(els);
    open.focus();
    expect((handlers.onMoveLeft as () => boolean)()).toBe(true);
    expect(document.activeElement).toBe(open);
    dismiss.focus();
    expect((handlers.onMoveRight as () => boolean)()).toBe(true);
    expect(document.activeElement).toBe(dismiss);
  });

  it("Down goes to the ban-lookup row under it when that row is showing", () => {
    const deny = fakeNavHolder();
    registerNavFocus("chat-perm-hint-deny", deny);
    const handlers = troubleshootHintRowNavHandlers(mountHintButtons().els);
    expect((handlers.onMoveDown as () => boolean)()).toBe(true);
    expect(deny.current.TakeFocus).toHaveBeenCalledWith(true);
  });

  it("Down with no ban-lookup row goes to the slot above the question box, the line while it holds the line", () => {
    const line = fakeNavHolder();
    const chips = fakeNavHolder();
    registerNavFocus("details-slot-line", line);
    registerNavFocus("preset-carousel", chips);
    setSlotShowsLine(true);
    const handlers = troubleshootHintRowNavHandlers(mountHintButtons().els);
    expect((handlers.onMoveDown as () => boolean)()).toBe(true);
    expect(line.current.TakeFocus).toHaveBeenCalledWith(true);
    expect(chips.current.TakeFocus).not.toHaveBeenCalled();
    setSlotShowsLine(false);
    expect((handlers.onMoveDown as () => boolean)()).toBe(true);
    expect(chips.current.TakeFocus).toHaveBeenCalledWith(true);
  });

  it("Down with nothing registered below leaves the move to Steam", () => {
    const handlers = troubleshootHintRowNavHandlers(mountHintButtons().els);
    expect((handlers.onMoveDown as () => boolean)()).toBe(false);
  });
});

describe("Down from the ban-lookup row", () => {
  it("takes the slot above the question box (the line while it holds the line, else the chips)", () => {
    const line = fakeNavHolder();
    const chips = fakeNavHolder();
    registerNavFocus("details-slot-line", line);
    registerNavFocus("preset-carousel", chips);
    setSlotShowsLine(true);
    expect(vacDenyRowMoveDown()).toBe(true);
    expect(line.current.TakeFocus).toHaveBeenCalledWith(true);
    expect(chips.current.TakeFocus).not.toHaveBeenCalled();
    setSlotShowsLine(false);
    expect(vacDenyRowMoveDown()).toBe(true);
    expect(chips.current.TakeFocus).toHaveBeenCalledWith(true);
  });

  it("with nothing registered below leaves the move to Steam", () => {
    expect(vacDenyRowMoveDown()).toBe(false);
  });
});

describe("Up from the ban-lookup row", () => {
  it("reaches the troubleshooting hint above it when that hint is showing", () => {
    const hint = fakeNavHolder();
    registerNavFocus("chat-perm-hint-troubleshoot", hint);
    expect(vacDenyRowMoveUp()).toBe(true);
    expect(hint.current.TakeFocus).toHaveBeenCalledWith(true);
  });
});

describe("Up from a suggestion chip", () => {
  function upFromChip(): boolean {
    const { result } = renderHook(() => usePresetRowNav(1));
    return (result.current.handlersFor(0, 1).onMoveUp as () => boolean)();
  }

  it("reaches the lowest permission row before the reply above it", () => {
    const reply = document.createElement("div");
    reply.className = "bonsai-chat-turn-slot";
    const notes = document.createElement("div");
    notes.className = "bonsai-kb-notes-block Panel Focusable";
    reply.appendChild(notes);
    document.body.appendChild(reply);
    const hint = fakeNavHolder();
    const deny = fakeNavHolder();
    registerNavFocus("chat-perm-hint-troubleshoot", hint);
    registerNavFocus("chat-perm-hint-deny", deny);

    expect(upFromChip()).toBe(true);
    expect(deny.current.TakeFocus).toHaveBeenCalledWith(true);
    expect(hint.current.TakeFocus).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(notes);
  });

  it("reaches the troubleshooting hint when it is the only permission row", () => {
    const hint = fakeNavHolder();
    registerNavFocus("chat-perm-hint-troubleshoot", hint);
    expect(upFromChip()).toBe(true);
    expect(hint.current.TakeFocus).toHaveBeenCalledWith(true);
  });
});
