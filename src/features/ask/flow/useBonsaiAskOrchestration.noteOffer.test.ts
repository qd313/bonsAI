/**
 * Title: A finished answer hands its offer to keep a note to the notes store
 * Purpose: Pin plan 92 lane N2's seam in the Ask hook at the level the Deck check looks at: an answer whose
 *          status carries `note_offer` puts it in the store (so the card can draw under it), an answer without
 *          one clears the last, the same status read twice (a reopen plus a poll) changes nothing, a failed
 *          answer's offer still arrives, and a typed `remember ...` (answered on the start call itself, no
 *          polling) arrives too, with no PC address needed.
 * Used for: useBonsaiAskOrchestration.ts, userNotesStore.ts.
 * Does not: Draw the card; NoteOfferCard.test.tsx does.
 */
import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBonsaiAskOrchestration, type UseBonsaiAskOrchestrationArgs } from "./useBonsaiAskOrchestration";
import { resetFakeDeckyRpc, setRpcHandler } from "../../../test-harness/fakeDeckyRpc";
import { idleBackgroundStatusFixture } from "../../../test-harness/rpcFixtures";
import type { BackgroundRequestStatus } from "../../../types/backgroundAsk";
import { getUserNotesState, markOfferKept, resetUserNotesStore } from "../../user-notes/userNotesStore";

const OFFER = { text: "I'm doing a Steel Soul run.", app_id: "", game_title: "Hollow Knight" };

function makeArgs(overrides: Partial<UseBonsaiAskOrchestrationArgs> = {}): UseBonsaiAskOrchestrationArgs {
  return {
    desktopDebugNoteAutoSave: false,
    filesystemWrite: false,
    strategySpoilerMaskingEnabled: false,
    askMode: "speed",
    unifiedInput: "",
    setUnifiedInput: vi.fn(),
    unifiedInputPersistenceMode: "no_persist",
    effectiveOllamaPcIp: "127.0.0.1:11434",
    selectedAttachment: null,
    setSelectedAttachment: vi.fn(),
    syncSettingsFromDisk: vi.fn(async () => undefined),
    unifiedInputFieldLayerRef: { current: null },
    unifiedInputHostRef: { current: null },
    setNavigationMessage: vi.fn(),
    saveIp: vi.fn(),
    useLocalKnowledgeBase: false,
    ...overrides,
  };
}

function finished(extra: Partial<BackgroundRequestStatus> = {}): BackgroundRequestStatus {
  return {
    ...idleBackgroundStatusFixture(),
    status: "completed",
    success: true,
    request_id: 41,
    question: "I'm doing a Steel Soul run, how do I beat the mantis lords",
    response: "Learn the first lord's three moves.",
    app_id: "",
    app_context: "none",
    chat_slot_id: "slot-a",
    ...extra,
  };
}

async function settle() {
  await act(async () => {
    for (let i = 0; i < 6; i += 1) await Promise.resolve();
  });
}

describe("the offer from a finished answer reaches the notes store", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
    resetUserNotesStore();
  });

  it("a polled finished status with an offer puts it in the store, for its chat", async () => {
    setRpcHandler("get_background_game_ai_status", () => finished({ note_offer: OFFER }));
    renderHook(() => useBonsaiAskOrchestration(makeArgs()));
    await settle();
    const r = getUserNotesState().record;
    expect(r?.offer).toEqual(OFFER);
    expect(r?.slotId).toBe("slot-a");
    expect(r?.requestId).toBe(41);
  });

  it("an answer without an offer leaves none", async () => {
    setRpcHandler("get_background_game_ai_status", () => finished({ note_offer: null }));
    renderHook(() => useBonsaiAskOrchestration(makeArgs()));
    await settle();
    expect(getUserNotesState().record).toBeNull();
  });

  it("an answer that failed still brings its offer", async () => {
    setRpcHandler("get_background_game_ai_status", () =>
      finished({ status: "failed", success: false, response: "The AI did not answer.", note_offer: OFFER }),
    );
    renderHook(() => useBonsaiAskOrchestration(makeArgs()));
    await settle();
    expect(getUserNotesState().record?.offer).toEqual(OFFER);
  });

  it("the same status read again does not undo a kept note", async () => {
    setRpcHandler("get_background_game_ai_status", () => finished({ note_offer: OFFER }));
    const first = renderHook(() => useBonsaiAskOrchestration(makeArgs()));
    await settle();
    markOfferKept();
    first.unmount();
    renderHook(() => useBonsaiAskOrchestration(makeArgs()));
    await settle();
    expect(getUserNotesState().record?.phase).toBe("kept");
  });

  it("a typed remember is answered on the start call, with the offer, and needs no PC address", async () => {
    setRpcHandler("get_background_game_ai_status", () => idleBackgroundStatusFixture());
    setRpcHandler("start_background_game_ai", () => ({
      accepted: true,
      status: "completed",
      success: true,
      request_id: 52,
      response: "Keep this as a note?",
      app_id: "",
      meta: "note_command",
      note_offer: { text: "No spoilers past the City of Tears.", app_id: "", game_title: "" },
    }));
    const { result } = renderHook(() =>
      useBonsaiAskOrchestration(
        makeArgs({ effectiveOllamaPcIp: "", unifiedInput: "remember no spoilers past the City of Tears" }),
      ),
    );
    await settle();
    await act(async () => {
      await result.current.onAskOllama();
    });
    await settle();
    expect(result.current.ollamaResponse).toBe("Keep this as a note?");
    expect(getUserNotesState().record?.offer.text).toBe("No spoilers past the City of Tears.");
    expect(getUserNotesState().record?.scope).toBe("every");
  });
});
