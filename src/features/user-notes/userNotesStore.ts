/**
 * Title: What the notes screens remember between rebuilds
 *
 * Purpose: Everything the note card, the "Read N of your notes" line and the notes sheet must not lose
 * when the tab behind them is rebuilt: the pending offer to keep a note (its words, which game it is for,
 * and whether it was kept), which line opened the sheet, and a card button waiting to get the ring back
 * after the edit popup. Closing a Steam popup rebuilds the whole tab and throws component state away
 * (docs/lessons-learned.md, "Closing a Decky popup rebuilds the tab behind it" and "A come-back-here flag
 * kept inside a component does not survive a Decky popup"), so these live here, in the module, where a
 * rebuilt component finds them again.
 *
 * Used for: NoteOfferCard.tsx, NotesReadLine.tsx, UserNotesSheet.tsx, useUserNotes.ts, the Main tab's
 * bridge (useUserNotesBridge.ts) and the Ask hook, which hands in each finished answer's offer.
 *
 * Solves: The ring returning to the line that opened the sheet, the card keeping the words a person
 * edited, and the card not coming back for an offer already kept or dismissed.
 *
 * Does not: Talk to the back end (useUserNotes.ts does) or draw anything.
 */
import { useSyncExternalStore } from "react";

import type { BackgroundRequestStatus, NoteOffer } from "../../types/backgroundAsk";

type OfferScope = "game" | "every";
type OfferPhase = "offered" | "kept";

export type OfferRecord = {
  /** The Ask request this offer came with; the same status read twice must not reset the card. */
  requestId: number | null;
  /** The chat the answer belongs to ("" when none): the card shows only under that chat's newest answer. */
  slotId: string;
  offer: NoteOffer;
  /** The words as they will be saved: the offer's own, or what the person typed in Edit. */
  text: string;
  scope: OfferScope;
  phase: OfferPhase;
  /** The words the back end gave when it refused a save, shown on the card ("" when none). */
  error: string;
  /** The ring has not yet been put on Keep for this offer. */
  ringPending: boolean;
};

export type NotesModalHooks = {
  /** The shell's "a popup is about to open" capture. */
  before?: () => void;
  /** The shell's "a popup closed" finish: runs `close` and rebuilds the tab behind it. */
  complete?: (close: () => void) => void;
};

type State = {
  record: OfferRecord | null;
  /** The chat on screen, so a card never shows under another chat's newest answer. */
  activeSlotId: string;
  /** The turn whose line opened the sheet; the ring goes back to that line when the sheet closes. */
  sheetOpenedFrom: string | null;
  sheetOpen: boolean;
  /** The Edit popup was opened from the card; the ring goes back to Keep when it closes. */
  editReturn: boolean;
  editOpen: boolean;
  modalHooks: NotesModalHooks;
};

function fresh(): State {
  return { record: null, activeSlotId: "", sheetOpenedFrom: null, sheetOpen: false, editReturn: false, editOpen: false, modalHooks: {} };
}

let state: State = fresh();
const listeners = new Set<() => void>();

function set(next: Partial<State>): void {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function setRecord(patch: Partial<OfferRecord>): void {
  if (state.record) set({ record: { ...state.record, ...patch } });
}

function subscribeUserNotes(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getUserNotesState(): State {
  return state;
}

/** A component's read of the store; re-renders it when anything changes. */
export function useUserNotesState(): State {
  return useSyncExternalStore(subscribeUserNotes, getUserNotesState, getUserNotesState);
}

/** Test-only: back to a clean store. */
export function resetUserNotesStore(): void {
  state = fresh();
  listeners.forEach((l) => l());
}

function cleanOffer(raw: unknown): NoteOffer | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const text = typeof o.text === "string" ? o.text.trim() : "";
  if (!text) return null;
  return {
    text,
    app_id: typeof o.app_id === "string" ? o.app_id : "",
    game_title: typeof o.game_title === "string" ? o.game_title : "",
  };
}

/**
 * A finished answer's status: remember its offer (or forget the last one when it has none).
 * The same request read again (a restore plus a poll) changes nothing, so a kept card stays kept.
 */
export function receiveStatusOffer(status: Pick<BackgroundRequestStatus, "note_offer" | "request_id" | "chat_slot_id">): void {
  const requestId = typeof status.request_id === "number" ? status.request_id : null;
  if (requestId !== null && state.record?.requestId === requestId) return;
  const offer = cleanOffer(status.note_offer);
  if (!offer) {
    if (state.record) set({ record: null });
    return;
  }
  set({
    record: {
      requestId,
      slotId: typeof status.chat_slot_id === "string" ? status.chat_slot_id : "",
      offer,
      text: offer.text,
      scope: offer.game_title ? "game" : "every",
      phase: "offered",
      error: "",
      ringPending: true,
    },
  });
}

/** The offer to draw now: the open chat's, and only one that has not been dismissed. */
export function visibleRecord(s: State): OfferRecord | null {
  const r = s.record;
  if (!r) return null;
  if (r.slotId && s.activeSlotId && r.slotId !== s.activeSlotId) return null;
  return r;
}

export function setActiveSlot(slotId: string | null | undefined): void {
  const next = slotId ?? "";
  if (next !== state.activeSlotId) set({ activeSlotId: next });
}

export function setNotesModalHooks(hooks: NotesModalHooks): void {
  state = { ...state, modalHooks: hooks };
}

/** "For: <game> ▸" pressed: this game, then every game. A note with no game has nothing to flip. */
export function toggleOfferScope(): void {
  const r = state.record;
  if (!r || !r.offer.game_title) return;
  setRecord({ scope: r.scope === "game" ? "every" : "game", error: "" });
}

export function setOfferText(text: string): void {
  setRecord({ text, error: "" });
}

export function setOfferError(error: string): void {
  setRecord({ error });
}

export function markOfferKept(): void {
  setRecord({ phase: "kept", error: "", ringPending: false });
}

export function dismissOffer(): void {
  if (state.record) set({ record: null });
}

/** The ring has been put on Keep for this offer; do not do it again after a rebuild. */
export function offerRingDone(): void {
  if (state.record?.ringPending) setRecord({ ringPending: false });
}

export function beginEditReturn(): void {
  set({ editReturn: true, editOpen: true });
}

export function endEditOpen(): void {
  set({ editOpen: false });
}

/** Called by the rebuilt card once it has put the ring back on Keep. */
export function editReturnDone(): void {
  set({ editReturn: false });
}

export function beginSheet(turnKey: string): void {
  set({ sheetOpenedFrom: turnKey, sheetOpen: true });
}

export function endSheetOpen(): void {
  set({ sheetOpen: false });
}

/** Called by the rebuilt line once it has taken the ring back. */
export function sheetReturnDone(): void {
  set({ sheetOpenedFrom: null });
}
