/**
 * Title: What the notes screens remember between rebuilds
 * Purpose: Pin userNotesStore.ts: an offer arrives with a finished answer, is read again harmlessly, is
 *          shown only under its own chat, and keeps what was edited and what was kept.
 * Used for: userNotesStore.ts (plan 92, lane N2).
 * Does not: Draw anything; the card, the line and the sheet have their own tests.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  dismissOffer,
  getUserNotesState,
  markOfferKept,
  receiveStatusOffer,
  resetUserNotesStore,
  setActiveSlot,
  setOfferText,
  simulateScreenReload,
  toggleOfferScope,
  visibleRecord,
} from "./userNotesStore";

const OFFER = { text: "I'm doing a Steel Soul run.", app_id: "", game_title: "Hollow Knight" };

describe("userNotesStore", () => {
  beforeEach(() => resetUserNotesStore());

  it("remembers an offer a finished answer carried, for this game by default", () => {
    receiveStatusOffer({ note_offer: OFFER, request_id: 7, chat_slot_id: "slot-a" });
    const r = visibleRecord(getUserNotesState());
    expect(r?.text).toBe(OFFER.text);
    expect(r?.scope).toBe("game");
    expect(r?.phase).toBe("offered");
    expect(r?.ringPending).toBe(true);
  });

  it("an offer with no game is for every game, and the game toggle has nothing to flip", () => {
    receiveStatusOffer({ note_offer: { ...OFFER, game_title: "" }, request_id: 1, chat_slot_id: "" });
    expect(getUserNotesState().record?.scope).toBe("every");
    toggleOfferScope();
    expect(getUserNotesState().record?.scope).toBe("every");
  });

  it("reading the same request's status again changes nothing, so a kept card stays kept", () => {
    receiveStatusOffer({ note_offer: OFFER, request_id: 7, chat_slot_id: "" });
    markOfferKept();
    receiveStatusOffer({ note_offer: OFFER, request_id: 7, chat_slot_id: "" });
    expect(getUserNotesState().record?.phase).toBe("kept");
  });

  it("the next answer replaces the offer, and an answer with none clears it", () => {
    receiveStatusOffer({ note_offer: OFFER, request_id: 7, chat_slot_id: "" });
    receiveStatusOffer({ note_offer: { ...OFFER, text: "I prefer dodging." }, request_id: 8, chat_slot_id: "" });
    expect(getUserNotesState().record?.text).toBe("I prefer dodging.");
    receiveStatusOffer({ note_offer: null, request_id: 9, chat_slot_id: "" });
    expect(getUserNotesState().record).toBeNull();
  });

  it("an offer without words is no offer", () => {
    receiveStatusOffer({ note_offer: { text: "  ", app_id: "", game_title: "" }, request_id: 3, chat_slot_id: "" });
    expect(getUserNotesState().record).toBeNull();
  });

  it("shows the offer only under its own chat", () => {
    receiveStatusOffer({ note_offer: OFFER, request_id: 7, chat_slot_id: "slot-a" });
    setActiveSlot("slot-a");
    expect(visibleRecord(getUserNotesState())).not.toBeNull();
    setActiveSlot("slot-b");
    expect(visibleRecord(getUserNotesState())).toBeNull();
    setActiveSlot("slot-a");
    expect(visibleRecord(getUserNotesState())).not.toBeNull();
  });

  it("keeps the words that were edited and flips between this game and every game", () => {
    receiveStatusOffer({ note_offer: OFFER, request_id: 7, chat_slot_id: "" });
    setOfferText("Steel Soul run, so no risky plans.");
    toggleOfferScope();
    expect(getUserNotesState().record?.text).toBe("Steel Soul run, so no risky plans.");
    expect(getUserNotesState().record?.scope).toBe("every");
    toggleOfferScope();
    expect(getUserNotesState().record?.scope).toBe("game");
  });

  it("Not now removes the offer", () => {
    receiveStatusOffer({ note_offer: OFFER, request_id: 7, chat_slot_id: "" });
    dismissOffer();
    expect(getUserNotesState().record).toBeNull();
  });

  it("does not draw a kept offer again after a screen-only reload", () => {
    receiveStatusOffer({ note_offer: OFFER, request_id: 9, chat_slot_id: "slot-a" });
    markOfferKept();
    simulateScreenReload();
    receiveStatusOffer({ note_offer: OFFER, request_id: 9, chat_slot_id: "slot-a" });
    expect(visibleRecord(getUserNotesState())).toBeNull();
  });

  it("does not draw a dismissed offer again after a screen-only reload", () => {
    receiveStatusOffer({ note_offer: OFFER, request_id: 10, chat_slot_id: "slot-a" });
    dismissOffer();
    simulateScreenReload();
    receiveStatusOffer({ note_offer: OFFER, request_id: 10, chat_slot_id: "slot-a" });
    expect(visibleRecord(getUserNotesState())).toBeNull();
  });

  it("still offers a new answer's offer after a reload, and works with no storage", () => {
    receiveStatusOffer({ note_offer: OFFER, request_id: 11, chat_slot_id: "" });
    dismissOffer();
    simulateScreenReload();
    receiveStatusOffer({ note_offer: OFFER, request_id: 12, chat_slot_id: "" });
    expect(visibleRecord(getUserNotesState())?.requestId).toBe(12);
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    simulateScreenReload();
    receiveStatusOffer({ note_offer: OFFER, request_id: 12, chat_slot_id: "" });
    expect(visibleRecord(getUserNotesState())).not.toBeNull();
    spy.mockRestore();
  });
});
