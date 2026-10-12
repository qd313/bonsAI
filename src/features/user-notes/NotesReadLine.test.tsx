/**
 * Title: The "Read N of your notes" line says how many notes an answer read and opens them
 * Purpose: Pin plan 92 lane N2's line: its three wordings and its absence, read from the turn's saved record;
 *          A opening the sheet and remembering which line did; the ring coming back to that line after the
 *          sheet closes, through an unmount and a mount (closing a Steam popup rebuilds the tab); and the four
 *          directions, each claimed.
 * Used for: NotesReadLine.tsx, userNotesStore.ts, UserNotesSheet.tsx (opened, not drawn).
 * Does not: Walk the line inside the real transcript; UserNotes.walk.test.tsx does.
 */
import React from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({ modals: [] as React.ReactElement[], closed: 0 }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../test-harness/steamRing");
  return {
    ...stubs,
    Focusable: SteamRingFocusable,
    showModal: (el: React.ReactElement) => {
      hoisted.modals.push(el);
      return { Close: () => void (hoisted.closed += 1) };
    },
  };
});

import { NotesReadLine, buildNotesReadLine, notesLineLabel, notesReadFromSnapshot } from "./NotesReadLine";
import { UserNotesSheet } from "./UserNotesSheet";
import { getUserNotesState, resetUserNotesStore, setNotesModalHooks } from "./userNotesStore";
import { putSteamRingOn, steamRingHolder, type SteamEl } from "../../test-harness/steamRing";
import { REPLY_STOP_ORDER, registerReplyStop } from "../../utils/replyStopRegistry";
import type { ChatSlotTurnTransparency } from "../../utils/inputTransparency";

const snap = (attached: number, off: number): ChatSlotTurnTransparency =>
  ({
    route: "ollama",
    success: true,
    user_notes_attached: Array.from({ length: attached }, (_, i) => ({ id: `n-${i}`, text: `note ${i}`, game_title: "Hollow Knight" })),
    user_notes_off_count: off,
  }) as ChatSlotTurnTransparency;

type Dir = "onMoveUp" | "onMoveDown" | "onMoveLeft" | "onMoveRight";

function press(dir: Dir): boolean {
  const holder = steamRingHolder() as SteamEl | null;
  let result = false;
  act(() => {
    result = holder?.__nav?.[dir]?.() === true;
  });
  return result;
}

beforeEach(() => {
  hoisted.modals.length = 0;
  hoisted.closed = 0;
  resetUserNotesStore();
  for (const id of REPLY_STOP_ORDER) registerReplyStop(id, null);
});
afterEach(() => cleanup());

describe("the line's words", () => {
  it("reads one note, two notes, and all off, from the saved record", () => {
    expect(notesLineLabel(notesReadFromSnapshot(snap(1, 0)))).toBe("Read 1 of your notes");
    expect(notesLineLabel(notesReadFromSnapshot(snap(2, 0)))).toBe("Read 2 of your notes");
    expect(notesLineLabel(notesReadFromSnapshot(snap(0, 2)))).toBe("Your notes are all off");
  });

  it("some read and some off still says how many were read", () => {
    expect(notesLineLabel(notesReadFromSnapshot(snap(1, 3)))).toBe("Read 1 of your notes");
  });

  it("is absent when nothing was read and nothing was off, and on a turn saved before notes existed", () => {
    expect(notesLineLabel(notesReadFromSnapshot(snap(0, 0)))).toBeNull();
    expect(buildNotesReadLine("t1", snap(0, 0))).toBeNull();
    expect(buildNotesReadLine("t1", { route: "ollama", success: true } as ChatSlotTurnTransparency)).toBeNull();
    expect(buildNotesReadLine("t1", null)).toBeNull();
    expect(buildNotesReadLine("t1", undefined)).toBeNull();
  });

  it("draws the words with the chevron", () => {
    const { container } = render(buildNotesReadLine("t1", snap(2, 0))!);
    expect(container.textContent).toBe("Read 2 of your notes▸");
    expect(container.querySelector(".bonsai-notes-line")).not.toBeNull();
  });
});

describe("opening the sheet", () => {
  it("A opens the sheet through the shell's hooks and remembers which line did", () => {
    const before = vi.fn();
    setNotesModalHooks({ before, complete: (close) => close() });
    const { container } = render(<NotesReadLine turnKey="t1" notes={{ read: 1, off: 0 }} />);
    act(() => (container.querySelector(".bonsai-notes-line") as SteamEl).__nav?.onOKButton?.());
    expect(before).toHaveBeenCalledTimes(1);
    expect(hoisted.modals).toHaveLength(1);
    expect(hoisted.modals[0]!.type).toBe(UserNotesSheet);
    expect(getUserNotesState().sheetOpenedFrom).toBe("t1");
    expect(getUserNotesState().sheetOpen).toBe(true);
  });

  it("when the sheet closes and the tab is rebuilt, the ring returns to the line that opened it", async () => {
    setNotesModalHooks({ complete: (close) => close() });
    const first = render(<NotesReadLine turnKey="t1" notes={{ read: 1, off: 0 }} />);
    putSteamRingOn(first.container.querySelector(".bonsai-notes-line"));
    act(() => (first.container.querySelector(".bonsai-notes-line") as SteamEl).__nav?.onOKButton?.());

    /* The popup is open and the tab behind it is rebuilt: the old line is gone and the ring with it. */
    first.unmount();
    act(() => (hoisted.modals[0]!.props as { onClose: () => void }).onClose());
    expect(hoisted.closed).toBe(1);
    expect(steamRingHolder()).toBeNull();

    const second = render(<NotesReadLine turnKey="t1" notes={{ read: 1, off: 0 }} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 120));
    });
    expect(steamRingHolder()).toBe(second.container.querySelector(".bonsai-notes-line"));
    expect(getUserNotesState().sheetOpenedFrom).toBeNull();
  });

  it("another turn's line does not take the ring", async () => {
    setNotesModalHooks({ complete: (close) => close() });
    const first = render(<NotesReadLine turnKey="t1" notes={{ read: 1, off: 0 }} />);
    act(() => (first.container.querySelector(".bonsai-notes-line") as SteamEl).__nav?.onOKButton?.());
    first.unmount();
    act(() => (hoisted.modals[0]!.props as { onClose: () => void }).onClose());
    render(<NotesReadLine turnKey="t2" notes={{ read: 1, off: 0 }} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 120));
    });
    expect(steamRingHolder()).toBeNull();
    expect(getUserNotesState().sheetOpenedFrom).toBe("t1");
  });

  it("does not grab the ring while the sheet is still open", async () => {
    setNotesModalHooks({ complete: (close) => close() });
    const first = render(<NotesReadLine turnKey="t1" notes={{ read: 1, off: 0 }} />);
    act(() => (first.container.querySelector(".bonsai-notes-line") as SteamEl).__nav?.onOKButton?.());
    first.unmount();
    render(<NotesReadLine turnKey="t1" notes={{ read: 1, off: 0 }} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 120));
    });
    expect(steamRingHolder()).toBeNull();
  });
});

describe("the D-pad on the line", () => {
  it("claims all four directions; Left and Right hold still", () => {
    const { container } = render(<NotesReadLine turnKey="t1" notes={{ read: 1, off: 0 }} />);
    const line = container.querySelector<SteamEl>(".bonsai-notes-line")!;
    putSteamRingOn(line);
    expect(press("onMoveLeft")).toBe(true);
    expect(press("onMoveRight")).toBe(true);
    expect(steamRingHolder()).toBe(line);
    for (const dir of ["onMoveUp", "onMoveDown", "onMoveLeft", "onMoveRight"] as Dir[]) {
      expect(typeof line.__nav?.[dir]).toBe("function");
    }
  });
});
