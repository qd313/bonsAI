/**
 * Title: The card that offers to keep what you said as a note
 *
 * Purpose: Under the newest answer, after the Helpful / Not really row, a small card offers to keep a
 * sentence from the question as a note (plan 90 § 2a, drawn on the mock-up board's tab 7, round 2,
 * option B): a lead line, the note's words, three choices (Keep, Edit, Not now) and a "For: Hollow
 * Knight ▸" line that flips between this game and every game. Keep saves the note and the card becomes
 * one line ("Kept. Ask reads it on every Hollow Knight question from now on."). Edit opens a small text
 * popup and puts what was typed on the card. Not now removes the card and saves nothing. A refusal (too
 * many notes, a text over 200 characters) shows the back end's own words on the card.
 *
 * Used for: buildReplyActionsElement.tsx, which mounts it between the rating row and Show details.
 *
 * Solves: Turning "I'm doing a Steel Soul run" into something every later Hollow Knight question
 * remembers, with no button on every answer: the card exists only when the question said something
 * worth keeping, or when "remember ..." was typed.
 *
 * Does not: Decide when an offer exists (the back end sends it with the answer; userNotesStore.ts holds
 * it), or read the notes (Ask does that). It holds no state of its own: the pending offer, the words
 * being edited and "put the ring back on Keep after the popup" all live in userNotesStore.ts, because
 * closing a Steam popup rebuilds the tab behind it and component state would be lost (docs/lessons-learned.md).
 *
 * Focus graph (new controls, AGENTS.md "Adding a new control"; the full version is in docs/focus-graph.md,
 * "The note card"). Steam calls the move handlers, so every stop here carries all four and claims its press:
 *
 *   the rating row (or its reason chips)        <- Down from it lands on Keep
 *      | Down                                   ^ Up (from any of the three)
 *   [ Keep ] --Right--> [ Edit ] --Right--> [ Not now ]     Left at Keep and Right at Not now hold still
 *      | Down (from any of the three)           ^ Up
 *   "For: Hollow Knight ▸"                       A flips this game / every game; Left and Right hold still
 *      | Down                                   ^ Up
 *   the Show details line
 *
 * Keep, Edit and Not now are siblings in one row, so the hops between them are plain focus calls. In and
 * out of the card, and between the row and the "For" line, cross containers and go through Steam's own
 * transfer (the stops' nav nodes, `focusRegisteredReplyStop`). The card is the ring's first stop when it
 * appears, unless the person is typing.
 */
import React, { useEffect, useRef } from "react";
import { Focusable, showModal } from "@decky/ui";

import { getUserNotesState, beginEditReturn, dismissOffer, editReturnDone, endEditOpen, markOfferKept, offerRingDone, setOfferError, setOfferText, toggleOfferScope, useUserNotesState, visibleRecord } from "./userNotesStore";
import { keepNote } from "./useUserNotes";
import { NoteEditModal } from "./NoteEditModal";
import { NotePinIcon } from "./NotePinIcon";
import {
  isDeckDirectionDownEvent,
  isDeckDirectionLeftEvent,
  isDeckDirectionRightEvent,
  isDeckDirectionUpEvent,
} from "../../shared/dpad/focusNavigation";
import { focusRegisteredReplyStop, registerReplyStop, replyStopNavRef } from "../../shared/dpad/replyStopRegistry";
import { uiGamepadFocusElement, elementHasFocus, elementHasGamepadFocus, getUiDocument } from "../../shared/dpad/uiDocument";

type NavHolder = { current: { TakeFocus?: (gamepad?: boolean) => unknown } | null | undefined };
type Moves = { up: () => boolean; down: () => boolean; left: () => boolean; right: () => boolean };

/** How long, and how often, a landing is tried while the card or the tab behind a popup is still being drawn. */
const LAND_TRIES = 12;
const LAND_EVERY_MS = 60;

/** What the kept line says. */
function keptLine(scopeIsGame: boolean, gameTitle: string): string {
  return scopeIsGame && gameTitle
    ? `Kept. Ask reads it on every ${gameTitle} question from now on.`
    : "Kept. Ask reads it on every question from now on.";
}

/** The card's "For" line. */
function forLine(scopeIsGame: boolean, gameTitle: string): string {
  return `For: ${scopeIsGame && gameTitle ? gameTitle : "every game"} ▸`;
}

/** Steam's transfer onto a sibling, then a plain focus, then the check: the move between the three buttons. */
function hop(nav: NavHolder, el: HTMLElement | null): boolean {
  if (!el?.isConnected) return false;
  try {
    nav.current?.TakeFocus?.(true);
  } catch {
    /* the focus + check below decides */
  }
  try {
    el.focus({ preventScroll: true });
  } catch {
    return false;
  }
  return elementHasFocus(el);
}

/**
 * Every direction for one stop, and its nav node; `onButtonDown` is one function for all four (two spread
 * objects would clash). `navRef` is a real Steam Focusable prop that Decky's types omit, so it rides here.
 */
function stopProps(self: () => HTMLElement | null, moves: Moves, navRef: unknown): Record<string, unknown> {
  return {
    navRef,
    onMoveUp: () => moves.up(),
    onMoveDown: () => moves.down(),
    onMoveLeft: () => moves.left(),
    onMoveRight: () => moves.right(),
    onButtonDown: (evt: unknown) => {
      const el = self();
      if (el && !elementHasGamepadFocus(el)) return false;
      if (isDeckDirectionUpEvent(evt)) return moves.up();
      if (isDeckDirectionDownEvent(evt)) return moves.down();
      if (isDeckDirectionLeftEvent(evt)) return moves.left();
      if (isDeckDirectionRightEvent(evt)) return moves.right();
      return false;
    },
  };
}

/**
 * True unless the person is typing: the card then waits for them rather than taking the ring.
 * "Typing" means a text box holds the ring AND has words in it. An empty box holding the ring is the
 * ordinary case, not typing: the question was just sent from it (it empties on send), and the box holds
 * the page's focus whenever the ring is on it, keyboard shut (Deck, plan92-P90-NOTE-CARD.json).
 */
function ringIsFreeForCard(): boolean {
  const owner = uiGamepadFocusElement();
  if (!owner || owner === getUiDocument().body) return true;
  if (!owner.matches?.("input, textarea, [contenteditable='true']")) return true;
  const words = "value" in owner ? String((owner as HTMLInputElement).value) : owner.textContent ?? "";
  return words.trim().length === 0;
}

/** Try `attempt` now and every 60 ms for a short while, until it says done; returns the cancel. */
function tryLanding(attempt: () => boolean): () => void {
  let tries = 0;
  let timer: number | undefined;
  const run = () => {
    if (attempt() || ++tries >= LAND_TRIES) return;
    timer = window.setTimeout(run, LAND_EVERY_MS);
  };
  run();
  return () => {
    if (timer !== undefined) window.clearTimeout(timer);
  };
}

/** Opens the edit popup; what was typed goes into the store, and the ring comes back to Keep. */
function openNoteEditModal(): void {
  const record = getUserNotesState().record;
  if (!record) return;
  const hooks = getUserNotesState().modalHooks;
  beginEditReturn();
  hooks.before?.();
  let closed = false;
  const finish = () => {
    if (closed) return;
    closed = true;
    const close = () => {
      handle.Close();
      endEditOpen();
    };
    if (hooks.complete) hooks.complete(close);
    else close();
  };
  const handle = showModal(
    <NoteEditModal
      initialText={record.text}
      onCancel={finish}
      onConfirm={(text) => {
        setOfferText(text);
        finish();
      }}
    />,
  );
}

export type NoteOfferCardProps = {
  /** The turn this card sits under: the saved note remembers it as the turn it came from. */
  replyKey: string;
  /** Up out of the card: the rating row, its reason chips, or whatever sits above them. */
  onMoveUpOut: () => boolean;
  /** Down out of the card: the Show details line, or what comes after it. */
  onMoveDownOut: () => boolean;
};

/**
 * In: the turn the card sits under, and where Up and Down go when they leave the card.
 * Out: the card for the offer in the store (or its one kept line), or null when no note is on offer for this chat.
 * Can go wrong: a save the back end refuses shows its words on the card and keeps it; a failed call says the note
 * could not be saved. Nothing here ever throws into the press that called it.
 */
export function NoteOfferCard({ replyKey, onMoveUpOut, onMoveDownOut }: NoteOfferCardProps): React.ReactElement | null {
  const s = useUserNotesState();
  const record = visibleRecord(s);
  const keepEl = useRef<HTMLElement | null>(null);
  const editEl = useRef<HTMLElement | null>(null);
  const notNowEl = useRef<HTMLElement | null>(null);
  const forEl = useRef<HTMLElement | null>(null);
  const editNav: NavHolder = useRef<NavHolder["current"]>(null);
  const notNowNav: NavHolder = useRef<NavHolder["current"]>(null);
  const saving = useRef(false);

  const offered = record !== null && record.phase === "offered";
  const ringPending = offered && record.ringPending;
  const returnToKeep = offered && s.editReturn && !s.editOpen;

  /* A new offer: the ring goes to Keep, once (unless the person is typing). */
  useEffect(() => {
    if (!ringPending) return undefined;
    return tryLanding(() => {
      if (!ringIsFreeForCard()) {
        offerRingDone();
        return true;
      }
      if (focusRegisteredReplyStop("note-keep")) {
        offerRingDone();
        return true;
      }
      return false;
    });
  }, [ringPending]);

  /* The edit popup closed and the tab was rebuilt behind it: the ring goes back to Keep. */
  useEffect(() => {
    if (!returnToKeep) return undefined;
    return tryLanding(() => {
      focusRegisteredReplyStop("note-keep");
      if (!elementHasGamepadFocus(keepEl.current)) return false;
      editReturnDone();
      return true;
    });
  }, [returnToKeep]);

  if (!record) return null;

  /* After a press that removes the button holding the ring: hand it down once the card has changed. */
  const handRingOnWhenGone = (pressed: HTMLElement | null, hadRing: boolean) => {
    if (!hadRing || !pressed) return;
    tryLanding(() => {
      if (pressed.isConnected) return false;
      const owner = uiGamepadFocusElement();
      if (owner && owner.isConnected && owner !== getUiDocument().body) return true;
      onMoveDownOut();
      return true;
    });
  };

  if (record.phase === "kept") {
    return (
      <div className="bonsai-note-card bonsai-note-card--kept" role="status">
        <NotePinIcon />
        <span>{keptLine(record.scope === "game", record.offer.game_title)}</span>
      </div>
    );
  }

  const scopeIsGame = record.scope === "game";
  const gameTitle = record.offer.game_title;
  const keep = async () => {
    if (saving.current) return;
    saving.current = true;
    const pressed = keepEl.current;
    const hadRing = elementHasGamepadFocus(pressed);
    const sourceTurnId = replyKey === "live" ? "" : replyKey;
    const result = await keepNote({
      text: record.text,
      game: scopeIsGame && gameTitle ? record.offer : null,
      sourceTurnId,
    });
    saving.current = false;
    if (result.ok) {
      markOfferKept();
      handRingOnWhenGone(pressed, hadRing);
    } else {
      setOfferError(result.error);
    }
  };
  const notNow = () => {
    const pressed = notNowEl.current;
    const hadRing = elementHasGamepadFocus(pressed);
    dismissOffer();
    handRingOnWhenGone(pressed, hadRing);
  };

  const toKeep = () => focusRegisteredReplyStop("note-keep");
  const toFor = () => focusRegisteredReplyStop("note-for");
  const toEdit = () => hop(editNav, editEl.current);
  const toNotNow = () => hop(notNowNav, notNowEl.current);
  const hold = () => true;

  return (
    <div className="bonsai-note-card" data-bonsai-note-card="offered">
      <small className="bonsai-note-card__lead">Keep this as a note?</small>
      <div className="bonsai-note-card__text">{record.text}</div>
      <div className="bonsai-note-card__buttons">
        <Focusable
          className="bonsai-note-card__btn bonsai-note-card__btn--primary"
          ref={(el: HTMLElement | null) => {
            keepEl.current = el;
            registerReplyStop("note-keep", el);
          }}
          aria-label="Keep this note"
          onOKButton={() => void keep()}
          onClick={() => void keep()}
          {...stopProps(() => keepEl.current, { up: onMoveUpOut, down: toFor, left: hold, right: toEdit }, replyStopNavRef("note-keep"))}
        >
          Keep
        </Focusable>
        <Focusable
          className="bonsai-note-card__btn"
          ref={(el: HTMLElement | null) => {
            editEl.current = el;
          }}
          aria-label="Edit the note's words"
          onOKButton={openNoteEditModal}
          onClick={openNoteEditModal}
          {...stopProps(() => editEl.current, { up: onMoveUpOut, down: toFor, left: toKeep, right: toNotNow }, editNav)}
        >
          Edit
        </Focusable>
        <Focusable
          className="bonsai-note-card__btn"
          ref={(el: HTMLElement | null) => {
            notNowEl.current = el;
          }}
          aria-label="Not now, do not keep this note"
          onOKButton={notNow}
          onClick={notNow}
          {...stopProps(() => notNowEl.current, { up: onMoveUpOut, down: toFor, left: toEdit, right: hold }, notNowNav)}
        >
          Not now
        </Focusable>
      </div>
      <Focusable
        className="bonsai-note-card__for"
        ref={(el: HTMLElement | null) => {
          forEl.current = el;
          registerReplyStop("note-for", el);
        }}
        aria-label={`Who this note is for. ${forLine(scopeIsGame, gameTitle)} Press to change.`}
        onOKButton={toggleOfferScope}
        onClick={toggleOfferScope}
        {...stopProps(() => forEl.current, { up: toKeep, down: onMoveDownOut, left: hold, right: hold }, replyStopNavRef("note-for"))}
      >
        {forLine(scopeIsGame, gameTitle)}
      </Focusable>
      {record.error ? (
        <div className="bonsai-note-card__error" role="alert">
          {record.error}
        </div>
      ) : null}
    </div>
  );
}
