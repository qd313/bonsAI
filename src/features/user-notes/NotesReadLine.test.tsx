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
import { useAskBarInitialRingClaim } from "../ask/bar/useAskBarInitialRingClaim";
import { registerNavFocus, resetNavFocusRegistry } from "../../shared/dpad/navFocusRegistry";
import { REPLY_STOP_ORDER, registerReplyStop } from "../../shared/dpad/replyStopRegistry";
import type { ChatSlotTurnTransparency } from "../../types/inputTransparency";

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
    /* Landing does not end the claim (the tab may be drawn again); only the window does. */
    expect(getUserNotesState().sheetOpenedFrom).toBe("t1");
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

/**
 * The Main tab's own ring claim (useAskBarInitialRingClaim), as it runs after every rebuild: a fresh mount of
 * the Ask bar hands the ring to the question box if nothing owns it a beat later. The Deck showed it beating
 * the line (plan92-P90-NOTES-SHEET.json), because the tab is drawn more than once when a popup closes and the
 * claim runs on each, and because the line can be drawn after the bar has claimed.
 */
function AskBarStandIn(): React.ReactElement {
  useAskBarInitialRingClaim();
  return <input aria-label="question box" />;
}

describe("after the popup closes, whatever the Main tab does about the question box", () => {
  beforeEach(() => {
    resetNavFocusRegistry();
  });

  function registerBox(box: () => HTMLElement | null) {
    registerNavFocus("unified-input", { current: { TakeFocus: () => (putSteamRingOn(box()), true) } });
  }

  async function openAndCloseTheSheet() {
    setNotesModalHooks({ complete: (close) => close() });
    const first = render(<NotesReadLine turnKey="t1" notes={{ read: 1, off: 0 }} />);
    act(() => (first.container.querySelector(".bonsai-notes-line") as SteamEl).__nav?.onOKButton?.());
    first.unmount();
    act(() => (hoisted.modals[0]!.props as { onClose: () => void }).onClose());
  }

  const wait = (ms: number) =>
    act(async () => {
      await new Promise((r) => setTimeout(r, ms));
    });

  it("the line gets the ring when the bar and the line are drawn together", async () => {
    await openAndCloseTheSheet();
    const tab = render(
      <>
        <AskBarStandIn />
        <NotesReadLine turnKey="t1" notes={{ read: 1, off: 0 }} />
      </>,
    );
    registerBox(() => tab.container.querySelector("input"));
    await wait(400);
    expect(steamRingHolder()).toBe(tab.container.querySelector(".bonsai-notes-line"));
  });

  it("the line gets the ring when the bar claimed it for the question box first", async () => {
    await openAndCloseTheSheet();
    const bar = render(<AskBarStandIn />);
    registerBox(() => bar.container.querySelector("input"));
    await wait(200);
    expect(steamRingHolder()).toBe(bar.container.querySelector("input"));
    const line = render(<NotesReadLine turnKey="t1" notes={{ read: 1, off: 0 }} />);
    await wait(300);
    expect(steamRingHolder()).toBe(line.container.querySelector(".bonsai-notes-line"));
  });

  it("the tab drawn a second time, as it is when a popup closes, still ends with the ring on the line", async () => {
    await openAndCloseTheSheet();
    const one = render(
      <>
        <AskBarStandIn />
        <NotesReadLine turnKey="t1" notes={{ read: 1, off: 0 }} />
      </>,
    );
    registerBox(() => document.querySelector("input"));
    await wait(200);
    expect(steamRingHolder()).toBe(one.container.querySelector(".bonsai-notes-line"));
    one.unmount(); // the rebuild: the ring goes with the old line
    expect(steamRingHolder()).toBeNull();
    const two = render(
      <>
        <AskBarStandIn />
        <NotesReadLine turnKey="t1" notes={{ read: 1, off: 0 }} />
      </>,
    );
    await wait(400);
    expect(steamRingHolder()).toBe(two.container.querySelector(".bonsai-notes-line"));
  });

  it("a press after the sheet closed ends the claim for good: the ring follows the press and is never pulled back", async () => {
    await openAndCloseTheSheet();
    const elsewhere = document.createElement("button");
    document.body.appendChild(elsewhere);
    const tab = render(
      <>
        <AskBarStandIn />
        <NotesReadLine turnKey="t1" notes={{ read: 1, off: 0 }} />
      </>,
    );
    registerBox(() => tab.container.querySelector("input"));
    await wait(250);
    expect(steamRingHolder()).toBe(tab.container.querySelector(".bonsai-notes-line"));
    /* Down pressed 350 ms after B (the Deck's try): the ring moves on, and must stay moved. */
    act(() => void document.dispatchEvent(new Event("vgp_onbuttondown")));
    putSteamRingOn(elsewhere);
    await wait(500);
    expect(steamRingHolder()).toBe(elsewhere);
    /* A line drawn again after that press does not claim either. */
    tab.unmount();
    const again = render(<NotesReadLine turnKey="t1" notes={{ read: 1, off: 0 }} />);
    await wait(300);
    expect(steamRingHolder()).not.toBe(again.container.querySelector(".bonsai-notes-line"));
    elsewhere.remove();
  });

  it("a key press ends it too", async () => {
    await openAndCloseTheSheet();
    const elsewhere = document.createElement("button");
    document.body.appendChild(elsewhere);
    const tab = render(<NotesReadLine turnKey="t1" notes={{ read: 1, off: 0 }} />);
    await wait(250);
    act(() => void document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" })));
    putSteamRingOn(elsewhere);
    await wait(300);
    expect(steamRingHolder()).toBe(elsewhere);
    tab.unmount();
    elsewhere.remove();
  });

  it("a press in the first instants, while B itself is still arriving, does not end it", async () => {
    await openAndCloseTheSheet();
    act(() => void document.dispatchEvent(new Event("vgp_onbuttondown")));
    const tab = render(<NotesReadLine turnKey="t1" notes={{ read: 1, off: 0 }} />);
    await wait(300);
    expect(steamRingHolder()).toBe(tab.container.querySelector(".bonsai-notes-line"));
  });

  it("with no press, B still returns the ring to the line and it stays once the tab has settled", async () => {
    await openAndCloseTheSheet();
    const elsewhere = document.createElement("button");
    document.body.appendChild(elsewhere);
    const tab = render(<NotesReadLine turnKey="t1" notes={{ read: 1, off: 0 }} />);
    await wait(250);
    expect(steamRingHolder()).toBe(tab.container.querySelector(".bonsai-notes-line"));
    /* After the line has held the ring for a second the claim is over: something else may have it. */
    await wait(1300);
    putSteamRingOn(elsewhere);
    await wait(400);
    expect(steamRingHolder()).toBe(elsewhere);
    elsewhere.remove();
  });

  it("stops claiming after a few seconds, so the line does not pull the ring back on a later mount", async () => {
    vi.useFakeTimers();
    await openAndCloseTheSheet();
    act(() => void vi.advanceTimersByTime(10_000));
    const later = render(<NotesReadLine turnKey="t1" notes={{ read: 1, off: 0 }} />);
    act(() => void vi.advanceTimersByTime(1_000));
    vi.useRealTimers();
    expect(steamRingHolder()).toBeNull();
    expect(later.container.querySelector(".bonsai-notes-line")).not.toBeNull();
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
