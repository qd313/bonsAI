/**
 * Title: The note card keeps, edits and drops a note, and the D-pad can walk it
 * Purpose: Pin plan 92 lane N2's card at the level the Deck check looks at: the card appears for an offer
 *          with the ring on Keep; Keep saves the note for this game or every game and the card becomes its
 *          one line; a refusal shows the back end's own words; Edit opens a popup and what was typed lands on
 *          the card, through a rebuild of the tab (the store holds it) with the ring back on Keep; Not now
 *          saves nothing; and every stop claims all four directions, the three buttons side by side, the
 *          "For" line below them, each stop visited once, with Steam's ring modelled by test-harness/steamRing.
 * Used for: NoteOfferCard.tsx, userNotesStore.ts, useUserNotes.ts, NoteEditModal.tsx.
 * Does not: Model Steam's scroll; the walk through the real transcript is in UserNotes.walk.test.tsx.
 */
import React from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({ modals: [] as React.ReactElement[], closed: 0, call: vi.fn() }));

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
vi.mock("../../shared/deckyCall", () => ({ callDeckyWithTimeout: hoisted.call }));

import { NoteOfferCard } from "./NoteOfferCard";
import { NoteEditModal } from "./NoteEditModal";
import {
  getUserNotesState,
  receiveStatusOffer,
  resetUserNotesStore,
  setActiveSlot,
  setNotesModalHooks,
  simulateScreenReload,
} from "./userNotesStore";
import { putSteamRingOn, steamRingHolder, type SteamEl } from "../../test-harness/steamRing";
import { REPLY_STOP_ORDER, registerReplyStop } from "../../shared/dpad/replyStopRegistry";
import { resetUiDocument } from "../../shared/dpad/uiDocument";

const OFFER = { text: "I'm doing a Steel Soul run.", app_id: "", game_title: "Hollow Knight" };
const KEPT_NOTE = { id: "n-1", text: OFFER.text, app_id: "", game_title: "Hollow Knight", on: true, created_at: "x", source_turn_id: "turn-1" };

type Dir = "onMoveUp" | "onMoveDown" | "onMoveLeft" | "onMoveRight";

let up: ReturnType<typeof vi.fn>;
let down: ReturnType<typeof vi.fn>;

function mountCard() {
  return render(<NoteOfferCard replyKey="turn-1" onMoveUpOut={up as () => boolean} onMoveDownOut={down as () => boolean} />);
}

function stop(container: HTMLElement, label: string): SteamEl {
  const el = container.querySelector<SteamEl>(`[aria-label^="${label}"]`);
  if (!el) throw new Error(`no stop labelled ${label}`);
  return el;
}

/** One press on the stop that holds the ring, the way Steam runs it: that stop's handler. */
function press(dir: Dir): boolean {
  const holder = steamRingHolder() as SteamEl | null;
  let result = false;
  act(() => {
    result = holder?.__nav?.[dir]?.() === true;
  });
  return result;
}

function ringOn(): string | null {
  return steamRingHolder()?.getAttribute("aria-label") ?? null;
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
  });
}

beforeEach(() => {
  hoisted.modals.length = 0;
  hoisted.closed = 0;
  hoisted.call.mockReset();
  resetUserNotesStore();
  resetUiDocument();
  for (const id of REPLY_STOP_ORDER) registerReplyStop(id, null);
  up = vi.fn(() => true);
  down = vi.fn(() => true);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("the note card", () => {
  it("draws nothing when no note is on offer", () => {
    const { container } = mountCard();
    expect(container.querySelector("[data-bonsai-note-card]")).toBeNull();
  });

  it("shows the lead, the words, Keep / Edit / Not now and the For line, with the ring on Keep", () => {
    receiveStatusOffer({ note_offer: OFFER, request_id: 1, chat_slot_id: "" });
    const { container } = mountCard();
    expect(container.textContent).toContain("Keep this as a note?");
    expect(container.textContent).toContain("I'm doing a Steel Soul run.");
    expect(container.textContent).toContain("For: Hollow Knight ▸");
    expect(stop(container, "Keep this note").textContent).toBe("Keep");
    expect(stop(container, "Edit").textContent).toBe("Edit");
    expect(stop(container, "Not now").textContent).toBe("Not now");
    expect(ringOn()).toBe("Keep this note");
  });

  it("does not take the ring from a person who is typing", () => {
    receiveStatusOffer({ note_offer: OFFER, request_id: 1, chat_slot_id: "" });
    const field = document.createElement("textarea");
    field.value = "where do I go after";
    document.body.appendChild(field);
    putSteamRingOn(field);
    mountCard();
    expect(steamRingHolder()).toBe(field);
    field.remove();
  });

  it("takes the ring from the question box when the question was sent from it and the box is empty (the Deck's real path)", () => {
    receiveStatusOffer({ note_offer: OFFER, request_id: 1, chat_slot_id: "" });
    const field = document.createElement("input");
    field.value = "";
    document.body.appendChild(field);
    putSteamRingOn(field);
    const { container } = mountCard();
    expect(steamRingHolder()).toBe(stop(container, "Keep this note"));
    field.remove();
  });

  it("a box holding only spaces counts as empty", () => {
    receiveStatusOffer({ note_offer: OFFER, request_id: 1, chat_slot_id: "" });
    const field = document.createElement("textarea");
    field.value = "   ";
    document.body.appendChild(field);
    putSteamRingOn(field);
    const { container } = mountCard();
    expect(steamRingHolder()).toBe(stop(container, "Keep this note"));
    field.remove();
  });

  it("A on For flips between this game and every game", () => {
    receiveStatusOffer({ note_offer: OFFER, request_id: 1, chat_slot_id: "" });
    const { container } = mountCard();
    putSteamRingOn(stop(container, "Who this note is for"));
    act(() => stop(container, "Who this note is for").__nav?.onOKButton?.());
    expect(container.textContent).toContain("For: every game ▸");
    act(() => stop(container, "Who this note is for").__nav?.onOKButton?.());
    expect(container.textContent).toContain("For: Hollow Knight ▸");
  });

  it("Keep saves the note for this game and the card becomes its one line", async () => {
    hoisted.call.mockResolvedValue({ ok: true, note: KEPT_NOTE });
    receiveStatusOffer({ note_offer: { ...OFFER, app_id: "367520" }, request_id: 1, chat_slot_id: "" });
    const { container } = mountCard();
    await act(async () => stop(container, "Keep this note").__nav?.onOKButton?.());
    await flush();
    expect(hoisted.call).toHaveBeenCalledWith("save_user_note", [
      { id: "", text: OFFER.text, app_id: "367520", game_title: "Hollow Knight", on: true, source_turn_id: "turn-1" },
    ]);
    expect(container.querySelector(".bonsai-note-card--kept")?.textContent).toBe(
      "Kept. Ask reads it on every Hollow Knight question from now on.",
    );
    expect(container.querySelector("[aria-label^='Keep this note']")).toBeNull();
  });

  it("Keep with every game picked saves it with no game", async () => {
    hoisted.call.mockResolvedValue({ ok: true, note: { ...KEPT_NOTE, game_title: "" } });
    receiveStatusOffer({ note_offer: { ...OFFER, app_id: "367520" }, request_id: 1, chat_slot_id: "" });
    const { container } = mountCard();
    act(() => stop(container, "Who this note is for").__nav?.onOKButton?.());
    await act(async () => stop(container, "Keep this note").__nav?.onOKButton?.());
    await flush();
    expect(hoisted.call).toHaveBeenCalledWith("save_user_note", [
      { id: "", text: OFFER.text, app_id: "", game_title: "", on: true, source_turn_id: "turn-1" },
    ]);
    expect(container.querySelector(".bonsai-note-card--kept")?.textContent).toBe(
      "Kept. Ask reads it on every question from now on.",
    );
  });

  it("hands the ring on when Keep removes the button that held it", async () => {
    hoisted.call.mockResolvedValue({ ok: true, note: KEPT_NOTE });
    receiveStatusOffer({ note_offer: OFFER, request_id: 1, chat_slot_id: "" });
    const { container } = mountCard();
    expect(ringOn()).toBe("Keep this note");
    await act(async () => stop(container, "Keep this note").__nav?.onOKButton?.());
    await flush();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 200));
    });
    expect(down).toHaveBeenCalledTimes(1);
  });

  it("a refusal shows the back end's own words and keeps the card", async () => {
    hoisted.call.mockResolvedValue({ ok: false, error: "That's one note too many. Remove one first.", code: "too_many" });
    receiveStatusOffer({ note_offer: OFFER, request_id: 1, chat_slot_id: "" });
    const { container } = mountCard();
    await act(async () => stop(container, "Keep this note").__nav?.onOKButton?.());
    await flush();
    expect(container.querySelector("[role='alert']")?.textContent).toBe("That's one note too many. Remove one first.");
    expect(container.querySelector("[aria-label^='Keep this note']")).not.toBeNull();
  });

  it("a failed call says the note could not be saved", async () => {
    hoisted.call.mockRejectedValue(new Error("RPC timeout"));
    receiveStatusOffer({ note_offer: OFFER, request_id: 1, chat_slot_id: "" });
    const { container } = mountCard();
    await act(async () => stop(container, "Keep this note").__nav?.onOKButton?.());
    await flush();
    expect(container.querySelector("[role='alert']")?.textContent).toBe("That note could not be saved.");
  });

  it("Not now saves nothing and removes the card", () => {
    receiveStatusOffer({ note_offer: OFFER, request_id: 1, chat_slot_id: "" });
    const { container } = mountCard();
    act(() => stop(container, "Not now").__nav?.onOKButton?.());
    expect(hoisted.call).not.toHaveBeenCalled();
    expect(container.querySelector("[data-bonsai-note-card]")).toBeNull();
    expect(getUserNotesState().record).toBeNull();
  });

  it("is not drawn under another chat's answer", () => {
    receiveStatusOffer({ note_offer: OFFER, request_id: 1, chat_slot_id: "slot-a" });
    act(() => setActiveSlot("slot-b"));
    const { container } = mountCard();
    expect(container.querySelector("[data-bonsai-note-card]")).toBeNull();
  });
});

describe("Edit", () => {
  it("opens the popup through the shell's hooks, and what was typed lands on the card after a rebuild", async () => {
    const before = vi.fn();
    const complete = vi.fn((close: () => void) => close());
    setNotesModalHooks({ before, complete });
    receiveStatusOffer({ note_offer: OFFER, request_id: 1, chat_slot_id: "" });
    const first = mountCard();
    act(() => stop(first.container, "Edit").__nav?.onOKButton?.());
    expect(before).toHaveBeenCalledTimes(1);
    expect(hoisted.modals).toHaveLength(1);
    const modal = hoisted.modals[0]!;
    expect(modal.type).toBe(NoteEditModal);
    expect((modal.props as { initialText: string }).initialText).toBe(OFFER.text);
    expect(getUserNotesState().editReturn).toBe(true);

    /* The popup is open; the tab behind it is rebuilt (unmounted, mounted again) while it is. */
    first.unmount();
    act(() => (modal.props as { onConfirm: (t: string) => void }).onConfirm("Steel Soul run, so no risky plans."));
    expect(complete).toHaveBeenCalledTimes(1);
    expect(hoisted.closed).toBe(1);
    expect(getUserNotesState().editOpen).toBe(false);

    const second = mountCard();
    expect(second.container.textContent).toContain("Steel Soul run, so no risky plans.");
    await act(async () => {
      await new Promise((r) => setTimeout(r, 80));
    });
    expect(ringOn()).toBe("Keep this note");
    expect(getUserNotesState().editReturn).toBe(false);

    /* Keep now saves the edited words. */
    hoisted.call.mockResolvedValue({ ok: true, note: KEPT_NOTE });
    await act(async () => stop(second.container, "Keep this note").__nav?.onOKButton?.());
    await flush();
    expect(hoisted.call.mock.calls[0]![1][0]).toMatchObject({ text: "Steel Soul run, so no risky plans." });
  });

  it("Cancel leaves the words as they were and the ring comes back to Keep", async () => {
    setNotesModalHooks({ complete: (close) => close() });
    receiveStatusOffer({ note_offer: OFFER, request_id: 1, chat_slot_id: "" });
    const first = mountCard();
    act(() => stop(first.container, "Edit").__nav?.onOKButton?.());
    first.unmount();
    act(() => (hoisted.modals[0]!.props as { onCancel: () => void }).onCancel());
    const second = mountCard();
    expect(second.container.textContent).toContain("I'm doing a Steel Soul run.");
    await act(async () => {
      await new Promise((r) => setTimeout(r, 80));
    });
    expect(ringOn()).toBe("Keep this note");
  });

  it("closing the popup twice runs the shell's finish once", () => {
    const complete = vi.fn((close: () => void) => close());
    setNotesModalHooks({ complete });
    receiveStatusOffer({ note_offer: OFFER, request_id: 1, chat_slot_id: "" });
    const { container } = mountCard();
    act(() => stop(container, "Edit").__nav?.onOKButton?.());
    const props = hoisted.modals[0]!.props as { onCancel: () => void; onConfirm: (t: string) => void };
    act(() => {
      props.onConfirm("x");
      props.onCancel();
    });
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it("the popup's Save is greyed while the box is empty", () => {
    const empty = render(<NoteEditModal initialText="  " onCancel={() => {}} onConfirm={() => {}} />);
    expect(empty.container.querySelector('[data-decky-ui="ConfirmModal"]')?.getAttribute("data-ok-disabled")).toBe("true");
    empty.unmount();
    const full = render(<NoteEditModal initialText="Steel Soul run" onCancel={() => {}} onConfirm={() => {}} />);
    expect(full.container.querySelector('[data-decky-ui="ConfirmModal"]')?.getAttribute("data-ok-disabled")).toBe("false");
  });
});

describe("the D-pad on the card", () => {
  function start() {
    receiveStatusOffer({ note_offer: OFFER, request_id: 1, chat_slot_id: "" });
    const out = mountCard();
    expect(ringOn()).toBe("Keep this note");
    return out;
  }

  it("Right walks Keep, Edit, Not now and holds still at the end; Left walks back and holds at Keep", () => {
    start();
    expect(press("onMoveLeft")).toBe(true);
    expect(ringOn()).toBe("Keep this note");
    expect(press("onMoveRight")).toBe(true);
    expect(ringOn()).toBe("Edit the note's words");
    expect(press("onMoveRight")).toBe(true);
    expect(ringOn()).toBe("Not now, do not keep this note");
    expect(press("onMoveRight")).toBe(true);
    expect(ringOn()).toBe("Not now, do not keep this note");
    expect(press("onMoveLeft")).toBe(true);
    expect(press("onMoveLeft")).toBe(true);
    expect(ringOn()).toBe("Keep this note");
  });

  it("Down from any of the three lands on the For line; Up from it lands on Keep; Down from it leaves the card", () => {
    start();
    for (const label of ["Keep this note", "Edit the note's words", "Not now, do not keep this note"]) {
      putSteamRingOn(document.querySelector<HTMLElement>(`[aria-label="${label}"]`));
      expect(press("onMoveDown")).toBe(true);
      expect(ringOn()).toMatch(/^Who this note is for/);
    }
    expect(press("onMoveUp")).toBe(true);
    expect(ringOn()).toBe("Keep this note");
    press("onMoveDown");
    expect(down).not.toHaveBeenCalled();
    expect(press("onMoveDown")).toBe(true);
    expect(down).toHaveBeenCalledTimes(1);
  });

  it("Up from any of the three leaves the card upward", () => {
    start();
    expect(press("onMoveUp")).toBe(true);
    expect(up).toHaveBeenCalledTimes(1);
    press("onMoveRight");
    press("onMoveUp");
    press("onMoveRight");
    press("onMoveUp");
    expect(up).toHaveBeenCalledTimes(3);
  });

  it("the For line holds still on Left and Right", () => {
    start();
    press("onMoveDown");
    expect(press("onMoveLeft")).toBe(true);
    expect(press("onMoveRight")).toBe(true);
    expect(ringOn()).toMatch(/^Who this note is for/);
  });

  it("every stop carries and claims all four directions, none visited twice on a full walk", () => {
    const { container } = start();
    const seen: string[] = [];
    const walk = ["onMoveRight", "onMoveRight", "onMoveDown", "onMoveUp"] as Dir[];
    seen.push(ringOn()!);
    for (const dir of walk) {
      press(dir);
      seen.push(ringOn()!);
    }
    expect(seen).toEqual([
      "Keep this note",
      "Edit the note's words",
      "Not now, do not keep this note",
      expect.stringMatching(/^Who this note is for/),
      "Keep this note",
    ]);
    for (const el of container.querySelectorAll<SteamEl>(".bonsai-note-card__btn, .bonsai-note-card__for")) {
      for (const dir of ["onMoveUp", "onMoveDown", "onMoveLeft", "onMoveRight"] as Dir[]) {
        expect(typeof el.__nav?.[dir]).toBe("function");
        putSteamRingOn(el);
        expect(press(dir)).toBe(true);
      }
    }
  });

  it("after Not now and a screen-only reload, the same answer's offer is not drawn again", () => {
    receiveStatusOffer({ note_offer: OFFER, request_id: 1, chat_slot_id: "" });
    const first = mountCard();
    act(() => stop(first.container, "Not now").__nav?.onOKButton?.());
    first.unmount();
    simulateScreenReload();
    receiveStatusOffer({ note_offer: OFFER, request_id: 1, chat_slot_id: "" });
    const { container } = mountCard();
    expect(container.querySelector("[data-bonsai-note-card]")).toBeNull();
  });
});
