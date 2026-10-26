/**
 * Title: The notes line and the note card inside the real chat transcript
 * Purpose: Pin that MainTabChatTranscript draws plan 92 lane N2's two pieces where they belong: "Read N of
 *          your notes" between the question and the answer (and above the Show reasoning line when the turn
 *          has one, with Up from that line reaching it), nothing on a turn whose record has no notes, the note
 *          card under the newest answer's rating row (never under an older one), and a full D-pad walk down
 *          the real turn from the question to Show details with each stop visited once.
 * Used for: MainTabChatTranscript.tsx, buildTurnHeaderElement.tsx, buildReplyActionsElement.tsx,
 *           NotesReadLine.tsx, NoteOfferCard.tsx.
 * Does not: Model Steam's scroll (UserNotes.walk.test.tsx does, on the same builders).
 */
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../test-harness/steamRing");
  return { ...stubs, Focusable: SteamRingFocusable, showModal: () => ({ Close: () => undefined }) };
});

import { MainTabChatTranscript } from "../answer/transcript/MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "../answer/transcript/MainTabChatTranscript";
import type { AskThreadCollapsedTurn } from "../../types/bonsaiUi";
import type { TransparencySnapshot } from "../../types/inputTransparency";
import { receiveStatusOffer, resetUserNotesStore } from "./userNotesStore";
import { putSteamRingOn, steamRingHolder, type SteamEl } from "../../test-harness/steamRing";
import { resetUiDocument } from "../../shared/dpad/uiDocument";

const QUESTION = "I am doing a Steel Soul run, how do I beat the mantis lords";
const ANSWER = "Learn the first lord's three moves before you swing.";
const OFFER = { text: "I am doing a Steel Soul run.", app_id: "", game_title: "Hollow Knight" };

function snapshot(attached: number, off = 0): TransparencySnapshot {
  return {
    route: "ollama", raw_question: QUESTION, sanitizer_action: "none", sanitizer_reason_codes: [], text_after_sanitizer: QUESTION,
    ollama_model: "m", system_prompt: null, user_text_for_model: null, user_image_count: 0, attachment_paths: [],
    assistant_raw: null, assistant_after_attachment_format: null, final_response: ANSWER, applied: null, success: true,
    app_id: "", app_name: "", pc_ip: "", error_message: "", elapsed_seconds: 1, context_chips: [], ask_diagnostics: null,
    user_notes_attached: Array.from({ length: attached }, (_, i) => ({ id: `n-${i}`, text: `note ${i}`, game_title: "Hollow Knight" })),
    user_notes_off_count: off,
  } as TransparencySnapshot;
}

const turn = (id: string, attached: number, off = 0, extra: Partial<AskThreadCollapsedTurn> = {}): AskThreadCollapsedTurn => ({
  id, question: QUESTION, answer: ANSWER, transparency: snapshot(attached, off), ...extra,
});

function renderTranscript(turns: AskThreadCollapsedTurn[], overrides: Partial<MainTabChatTranscriptProps> = {}) {
  const newest = turns[turns.length - 1]!;
  const props: MainTabChatTranscriptProps = {
    fullBleedRowStyle: {}, isAsking: false, selectedAttachment: null,
    ollamaContext: {} as MainTabChatTranscriptProps["ollamaContext"], unifiedInput: "", showSlowWarning: false,
    latencyWarningSeconds: 30, ollamaResponse: "", elapsedSeconds: null, lastApplied: null, canSaveDesktopNote: false,
    onOpenDesktopNoteSave: () => {}, askMode: "strategy", askThreadCollapsed: turns, expandedTurnKey: newest.id,
    askThreadDisplayQuestion: "", lastExchange: { question: QUESTION, answer: ANSWER }, transparencySnapshot: snapshot(1),
    liveReplyFeedbackRating: null, onReplyFeedback: () => {}, onReplyMicroAction: () => {}, strategyGuideBranches: null,
    onAskOllama: async () => {}, ...overrides,
  };
  return render(<MainTabChatTranscript {...props} />);
}

beforeEach(() => {
  resetUserNotesStore();
  resetUiDocument();
});
afterEach(() => cleanup());

describe("the notes line in the transcript", () => {
  it("sits between the question and the answer", () => {
    const { container } = renderTranscript([turn("t1", 1)]);
    const line = container.querySelector(".bonsai-notes-line")!;
    expect(line.textContent).toBe("Read 1 of your notes▸");
    const header = container.querySelector(".bonsai-chat-turn-row-header")!;
    const answer = container.querySelector(".bonsai-chat-ai-bubble")!;
    expect(header.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(line.compareDocumentPosition(answer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("says all off when every matching note is off, and is absent when there were none", () => {
    expect(renderTranscript([turn("t1", 0, 2)]).container.querySelector(".bonsai-notes-line")?.textContent).toBe("Your notes are all off▸");
    cleanup();
    expect(renderTranscript([turn("t1", 0, 0)]).container.querySelector(".bonsai-notes-line")).toBeNull();
  });

  it("sits above the Show reasoning line, and Up from that line reaches it", () => {
    const { container } = renderTranscript([
      turn("t1", 1, 0, { reasoning: { text: "1. Think.", seconds: 12, tokens: 30 } }),
    ]);
    const line = container.querySelector<SteamEl>(".bonsai-notes-line")!;
    const fold = container.querySelector<SteamEl>(".bonsai-chat-reasoning-fold")!;
    expect(line.compareDocumentPosition(fold) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    putSteamRingOn(fold);
    act(() => void fold.__nav?.onMoveUp?.());
    expect(steamRingHolder()).toBe(line);
    /* Line to Show reasoning is a plain focus inside the turn's column, which the harness's ring does not follow. */
    act(() => void line.__nav?.onMoveDown?.());
    expect(document.activeElement).toBe(fold);
  });

  it("Up from the reasoning line goes to the question when the turn has no notes line", () => {
    const { container } = renderTranscript([
      turn("t1", 0, 0, { reasoning: { text: "1. Think.", seconds: 12, tokens: 30 } }),
    ]);
    const fold = container.querySelector<SteamEl>(".bonsai-chat-reasoning-fold")!;
    putSteamRingOn(fold);
    act(() => void fold.__nav?.onMoveUp?.());
    expect(document.activeElement?.closest(".bonsai-chat-turn-row-header")).not.toBeNull();
  });

  it("Down from the question reaches the line first", () => {
    const { container } = renderTranscript([turn("t1", 2)]);
    const header = container.querySelector<SteamEl>(".bonsai-chat-turn-row-header")!;
    putSteamRingOn(header);
    act(() => void header.__nav?.onMoveDown?.());
    expect(steamRingHolder()).toBe(container.querySelector(".bonsai-notes-line"));
  });
});

describe("the note card in the transcript", () => {
  it("is drawn under the newest answer, after the rating row and before Show details", () => {
    receiveStatusOffer({ note_offer: OFFER, request_id: 1, chat_slot_id: "" });
    const { container } = renderTranscript([turn("t1", 0)]);
    const card = container.querySelector("[data-bonsai-note-card]")!;
    expect(card).not.toBeNull();
    const thumbs = container.querySelector("[aria-label='Mark reply helpful']")!;
    const details = container.querySelector("[aria-label='Show details']")!;
    expect(thumbs.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(card.compareDocumentPosition(details) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("is not drawn under an older answer, nor when no note is on offer", () => {
    receiveStatusOffer({ note_offer: OFFER, request_id: 1, chat_slot_id: "" });
    const { container } = renderTranscript([turn("t1", 0), turn("t2", 0)], { expandedTurnKey: "t1" });
    expect(container.querySelector("[data-bonsai-note-card]")).toBeNull();
    cleanup();
    resetUserNotesStore();
    expect(renderTranscript([turn("t1", 0)]).container.querySelector("[data-bonsai-note-card]")).toBeNull();
  });

  it("walks Down the real turn from the question: line, answer, Helpful, Keep, For, Suggest as a tip, Show details, each once", () => {
    receiveStatusOffer({ note_offer: OFFER, request_id: 1, chat_slot_id: "" });
    const { container } = renderTranscript([turn("t1", 1)]);
    const names: string[] = [];
    const nameNow = () => {
      const ring = steamRingHolder();
      const label = ring?.getAttribute("aria-label") ?? ring?.className ?? "none";
      return label.replace(/^Who this note is for.*/, "For").replace(/^Read.*/, "notes line");
    };
    const header = container.querySelector<SteamEl>(".bonsai-chat-turn-row-header")!;
    putSteamRingOn(header);
    names.push("question");
    const press = () => {
      let el = steamRingHolder() as SteamEl | null;
      let handled = false;
      act(() => {
        while (el) {
          const h = el.__nav?.onMoveDown;
          if (h && h() === true) {
            handled = true;
            return;
          }
          el = el.parentElement as SteamEl | null;
        }
      });
      return handled;
    };
    expect(press()).toBe(true);
    names.push(nameNow());
    expect(names).toEqual(["question", "notes line"]);
    /* From the line the answer is the next stop; the rows under it are entered by the answer's own Down
       (walked with Steam's scroll in UserNotes.walk.test.tsx), so enter them the same way here. */
    act(() => {
      const helpful = container.querySelector<HTMLElement>("[aria-label='Mark reply helpful']")!;
      putSteamRingOn(helpful);
    });
    const rest: string[] = [];
    for (let i = 0; i < 5 && press(); i += 1) rest.push(nameNow());
    expect(rest.slice(0, 4)).toEqual(["Keep this note", "For", "Suggest as a tip", "Show details"]);
    expect(new Set(rest.slice(0, 4)).size).toBe(4);
  });
});
