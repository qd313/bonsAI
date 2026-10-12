/**
 * Title: The notes sheet lists every note and switches or removes one
 * Purpose: Pin plan 92 lane N2's sheet: each note shown with its words and its game ("Every game" for none),
 *          a switch that calls save with the new state, a Remove that calls delete and puts the ring on the
 *          row now in its place, the back end's own words when a call fails, B closing it once, and
 *          `openUserNotesSheet` going through the shell's hooks.
 * Used for: UserNotesSheet.tsx, useUserNotes.ts.
 * Does not: Draw Steam's popup chrome; the stand-in for the popup root only keeps B's handler.
 */
import React from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({ cancel: null as null | (() => void), modals: [] as React.ReactElement[], call: vi.fn(), closed: 0 }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const Root = ({ onCancel, children }: { onCancel?: () => void; children?: React.ReactNode }) => {
    hoisted.cancel = onCancel ?? null;
    return <div data-testid="modal-root">{children}</div>;
  };
  return {
    ...stubs,
    ModalRoot: Root,
    showModal: (el: React.ReactElement) => {
      hoisted.modals.push(el);
      return { Close: () => void (hoisted.closed += 1) };
    },
  };
});
vi.mock("../../utils/deckyCall", () => ({ callDeckyWithTimeout: hoisted.call }));

import { SHEET_EMPTY, SHEET_REMOVED, SHEET_SAY, UserNotesSheet, openUserNotesSheet } from "./UserNotesSheet";
import { getUserNotesState, resetUserNotesStore, setNotesModalHooks } from "./userNotesStore";
import type { UserNote } from "../search-tab/searchTypes";

const note = (id: string, text: string, game: string, on = true): UserNote => ({
  id, text, app_id: game ? "1" : "", game_title: game, on, created_at: "2026-10-12T03:15:00Z", source_turn_id: "",
});
const NOTES = [note("n-3", "No spoilers past the City of Tears.", "Hollow Knight"), note("n-2", "I prefer dodging.", ""), note("n-1", "Steel Soul run.", "Hollow Knight", false)];

async function mountSheet(list: UserNote[] = NOTES, onClose = vi.fn()) {
  const out = render(<UserNotesSheet onClose={onClose} load={async () => list} />);
  await act(async () => {
    await Promise.resolve();
  });
  return { ...out, onClose };
}

function row(container: HTMLElement, id: string): HTMLElement {
  return container.querySelector<HTMLElement>(`[data-bonsai-user-note="${id}"]`)!;
}

function toggleOf(container: HTMLElement, id: string): HTMLElement {
  return row(container, id).querySelector<HTMLElement>("[aria-pressed]")!;
}

beforeEach(() => {
  hoisted.cancel = null;
  hoisted.modals.length = 0;
  hoisted.closed = 0;
  hoisted.call.mockReset();
  resetUserNotesStore();
});
afterEach(() => cleanup());

describe("the notes sheet", () => {
  it("says what Ask does with the notes and lists each with its words, its game and its switch", async () => {
    const { container } = await mountSheet();
    expect(container.textContent).toContain(SHEET_SAY);
    expect(SHEET_SAY).toBe("Ask reads the ones that are on, every time you ask about that game.");
    const rows = [...container.querySelectorAll("[data-bonsai-user-note]")].map((r) => r.getAttribute("data-bonsai-user-note"));
    expect(rows).toEqual(["n-3", "n-2", "n-1"]);
    expect(row(container, "n-3").textContent).toContain("No spoilers past the City of Tears.");
    expect(row(container, "n-3").textContent).toContain("Hollow Knight");
    expect(row(container, "n-2").textContent).toContain("Every game");
    expect(toggleOf(container, "n-3").getAttribute("aria-pressed")).toBe("true");
    expect(toggleOf(container, "n-1").getAttribute("aria-pressed")).toBe("false");
  });

  it("A on a row's words switches the note off through save_user_note and shows it off", async () => {
    hoisted.call.mockResolvedValue({ ok: true, note: { ...NOTES[0], on: false } });
    const { container } = await mountSheet();
    await act(async () => {
      fireEvent.click(toggleOf(container, "n-3"));
    });
    expect(hoisted.call).toHaveBeenCalledWith("save_user_note", [{ id: "n-3", on: false }]);
    expect(toggleOf(container, "n-3").getAttribute("aria-pressed")).toBe("false");
  });

  it("switches an off note back on", async () => {
    hoisted.call.mockResolvedValue({ ok: true, note: { ...NOTES[2], on: true } });
    const { container } = await mountSheet();
    await act(async () => {
      fireEvent.click(toggleOf(container, "n-1"));
    });
    expect(hoisted.call).toHaveBeenCalledWith("save_user_note", [{ id: "n-1", on: true }]);
    expect(toggleOf(container, "n-1").getAttribute("aria-pressed")).toBe("true");
  });

  it("Remove calls delete_user_note, drops the row, says so, and puts the ring on the row now in its place", async () => {
    vi.useFakeTimers();
    hoisted.call.mockResolvedValue({ ok: true });
    const { container } = await mountSheet();
    const bin = row(container, "n-2").querySelector<HTMLElement>("[aria-label^='Remove note']")!;
    await act(async () => {
      fireEvent.click(bin);
    });
    act(() => {
      vi.runAllTimers();
    });
    vi.useRealTimers();
    expect(hoisted.call).toHaveBeenCalledWith("delete_user_note", ["n-2"]);
    expect(row(container, "n-2")).toBeNull();
    expect(container.textContent).toContain(SHEET_REMOVED);
    expect(document.activeElement).toBe(toggleOf(container, "n-1"));
  });

  it("removing the last note lands the ring on Close and says there are none", async () => {
    vi.useFakeTimers();
    hoisted.call.mockResolvedValue({ ok: true });
    const { container } = await mountSheet([NOTES[0]!]);
    await act(async () => {
      fireEvent.click(container.querySelector<HTMLElement>("[aria-label^='Remove note']")!);
    });
    act(() => {
      vi.runAllTimers();
    });
    vi.useRealTimers();
    expect(container.textContent).toContain(SHEET_EMPTY);
    expect(document.activeElement?.textContent).toBe("Close");
  });

  it("a failed call shows the back end's words and changes nothing", async () => {
    hoisted.call.mockResolvedValue({ ok: false, error: "That note is gone.", code: "not_found" });
    const { container } = await mountSheet();
    await act(async () => {
      fireEvent.click(toggleOf(container, "n-3"));
    });
    expect(container.textContent).toContain("That note is gone.");
    expect(toggleOf(container, "n-3").getAttribute("aria-pressed")).toBe("true");
  });

  it("with no notes it says so", async () => {
    const { container } = await mountSheet([]);
    expect(container.textContent).toContain(SHEET_EMPTY);
  });

  it("B and the Close button each close it, once", async () => {
    const { container, onClose } = await mountSheet();
    act(() => hoisted.cancel?.());
    act(() => hoisted.cancel?.());
    fireEvent.click([...container.querySelectorAll("button")].find((b) => b.textContent === "Close")!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("openUserNotesSheet", () => {
  it("goes through the shell's hooks and marks the sheet closed when it closes", () => {
    const before = vi.fn();
    const complete = vi.fn((close: () => void) => close());
    setNotesModalHooks({ before, complete });
    openUserNotesSheet();
    expect(before).toHaveBeenCalledTimes(1);
    expect(hoisted.modals).toHaveLength(1);
    const props = hoisted.modals[0]!.props as { onClose: () => void };
    act(() => {
      props.onClose();
      props.onClose();
    });
    expect(complete).toHaveBeenCalledTimes(1);
    expect(hoisted.closed).toBe(1);
    expect(getUserNotesState().sheetOpen).toBe(false);
  });

  it("closes the popup itself when the shell gave no hooks", () => {
    openUserNotesSheet();
    act(() => (hoisted.modals[0]!.props as { onClose: () => void }).onClose());
    expect(hoisted.closed).toBe(1);
  });
});
