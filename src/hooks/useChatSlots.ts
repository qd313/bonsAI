/**
 * Title: Saved chats list and switching
 *
 * Purpose: Owns the list of a person's saved chats — creating a new one,
 * switching to a different one, renaming, and deleting — and keeps the
 * "which chat is open right now" pointer in sync everywhere at once. It
 * also quietly deletes a chat that was opened and never used, so the chat
 * list does not fill up with empty "New chat" entries.
 *
 * Used for: The plugin's main screen, and the row of saved chats a person
 * picks a chat from.
 *
 * Solves: Before this, more than one place could change which chat was
 * open, and a plain ref meant to track that could lag a render behind the
 * screen state driving it. This hook is the one place that changes it, so
 * the two can no longer disagree.
 *
 * Does not: Send a question to the AI, or check on an answer that is
 * still being written — a separate hook owns that.
 */
import { useCallback, useMemo, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import { Router } from "@decky/ui";

import type { AskThreadCollapsedTurn, AskThreadExpandedTurnKey } from "../types/bonsaiUi";
import {
  createChatSlot,
  deleteChatSlot,
  getChatSlot,
  listChatSlots,
  renameChatSlot,
  type ChatMemorySummary,
  type ChatSlot,
  type ChatSlotSummary,
} from "../utils/chatSlotsApi";
import { turnsToCollapsedTurns } from "../utils/chatSlotTurns";
import {
  questionsIn,
  turnsAfterSummary,
  type ChatListRow,
} from "../features/chat-sum-up/chatSumUpModel";
import { useChatSumUpJob } from "../features/chat-sum-up/useChatSumUpJob";
import { saveActiveChatSlotId } from "../features/plugin-shell/pluginStorage";

type OpenChatMemory = {
  slotId: string | null;
  summary: ChatMemorySummary | null;
  canSumUp: boolean;
  questionsAfterSummary: number;
};

const NO_CHAT_MEMORY: OpenChatMemory = { slotId: null, summary: null, canSumUp: false, questionsAfterSummary: 0 };

export type UseChatSlotsArgs = {
  activeSlotIdRef: RefObject<string | null>;
  initialActiveSlotId?: string | null;
  setAskThreadCollapsed: Dispatch<SetStateAction<AskThreadCollapsedTurn[]>>;
  setAskThreadDisplayQuestion: Dispatch<SetStateAction<string>>;
  setExpandedTurnKey: Dispatch<SetStateAction<AskThreadExpandedTurnKey>>;
  resetLiveAskPresentation?: () => void;
  /** True while the backend is generating into this slot. A slot mid-answer is never swept. */
  isSlotGenerating?: (slotId: string) => boolean;
};

/**
 * In: refs and setters the caller owns — the ref tracking which chat is
 * open, the screen-state setters that redraw the current chat's turns, and
 * two optional callbacks (one to reset the live-answer view, one to ask
 * whether a given chat is still receiving an answer right now).
 * Out: the current chat list, which one is open, and every function that
 * changes either — one bundle the screen reads from and calls into.
 * Can go wrong: the "delete an unused chat" sweep only checks a chat's
 * turn count and its name at the moment it is left; it skips a chat that
 * is mid-answer only when the caller supplies the isSlotGenerating check,
 * so a caller that omits it could see a mid-answer chat swept.
 *
 * 1. Two pieces of state hold the chat list (`summaries`) and which chat
 *    is open (`activeSlotId`); two refs mirror them for callbacks that
 *    must always see the latest value, not the one from when they were
 *    created.
 * 2. `setActiveSlot()` is the only place the open chat changes: it updates
 *    the ref, saves the choice to disk, and updates the state that
 *    redraws the screen, all in one place.
 * 3. `applySlotTranscript()` turns a chat's raw list of turns into what
 *    the screen actually draws, and remembers how many turns that chat
 *    has — used later to tell whether it was ever used.
 * 4. `refreshSummaries()` reloads the chat list from the backend.
 * 5. `sweepIfNeverUsed()` quietly deletes a chat that was opened, still
 *    has no turns, was never renamed away from "New chat", and is not
 *    currently receiving an answer — so the chat list does not fill up
 *    with empty entries nobody meant to keep.
 * 6. `reloadActiveSlotTranscript()` refreshes the chat list and reloads
 *    the currently open chat's transcript, or clears the screen if no
 *    chat is open.
 * 7. `selectSlot()` switches to a different chat: it loads the new chat's
 *    transcript (or clears the screen for "no chat"), then sweeps the
 *    chat just left if it turned out to be unused.
 * 8. `createSlot()` makes a new chat tagged with whichever game is
 *    currently running, then switches to it.
 * 9. `renameSlot()` and `deleteSlot()` rename or remove a chat and refresh
 *    the list; deleting the currently open chat falls back to whichever
 *    chat is now first in the list.
 * 10. `ensureActiveSlotForAsk()` is for typing a question with no chat
 *     open yet — it creates one first, seeded with that question, so
 *     there is always a chat for the answer to land in.
 * 11. The hook hands all of the above back together at the end, so the
 *     screen has one bundle: the chat list, which one is open, and every
 *     action that can change either.
 */
export function useChatSlots({
  activeSlotIdRef,
  initialActiveSlotId = null,
  setAskThreadCollapsed,
  setAskThreadDisplayQuestion,
  setExpandedTurnKey,
  resetLiveAskPresentation,
  isSlotGenerating,
}: UseChatSlotsArgs) {
  const [summaries, setSummaries] = useState<ChatSlotSummary[]>([]);
  const [activeSlotId, setActiveSlotIdState] = useState<string | null>(
    initialActiveSlotId ?? activeSlotIdRef.current,
  );
  /** Mirror of `summaries` for callbacks that must not re-close over the list on every refresh. */
  const summariesRef = useRef<ChatSlotSummary[]>([]);
  /** Turns on screen for the active slot; -1 until a transcript has been applied. */
  const activeSlotTurnCountRef = useRef(-1);
  /**
   * Plan 68: the open chat's own summary and whether there is anything to sum up, set from the
   * same load that sets its transcript and blanked wherever the transcript is blanked, so a card
   * can never show under a different chat than the one it belongs to.
   */
  const [chatMemory, setChatMemory] = useState<OpenChatMemory>(NO_CHAT_MEMORY);
  const applySlotMemory = useCallback((slot: ChatSlot) => {
    const summary = slot.summary ?? null;
    setChatMemory({
      slotId: slot.id,
      summary,
      canSumUp: slot.can_sum_up === true,
      questionsAfterSummary: questionsIn(turnsAfterSummary(slot.turns ?? [], summary)),
    });
  }, []);
  /** After the button's own summary lands: only the card and the button change, not the transcript. */
  const refreshSlotMemory = useCallback(
    async (slotId: string) => {
      if (activeSlotIdRef.current !== slotId) return;
      const slot = await getChatSlot(slotId);
      if (slot && activeSlotIdRef.current === slotId) applySlotMemory(slot);
    },
    [activeSlotIdRef, applySlotMemory],
  );
  const sumUpJob = useChatSumUpJob(refreshSlotMemory);

  /*
   * The one place the active slot changes, which is why the persistence goes here rather than at
   * each call site: `selectSlot`, `createSlot`, `deleteSlot`, `ensureActiveSlotForAsk` and the
   * *Clear cache* detach all route through it. Writing null clears the stored pointer, so the
   * detach that keeps Clear cache clean (D32) keeps working across a reopen.
   */
  const setActiveSlot = useCallback(
    (id: string | null) => {
      activeSlotIdRef.current = id;
      saveActiveChatSlotId(id);
      setActiveSlotIdState(id);
    },
    [activeSlotIdRef],
  );

  /*
   * `fallbackAppId` is the slot's own `origin_app_id`, used only for turns saved before the
   * backend recorded one per turn. Passing it here rather than defaulting inside the mapper
   * keeps the mapper honest about where the guess comes from.
   */
  const applySlotTranscript = useCallback(
    (turns: Parameters<typeof turnsToCollapsedTurns>[0], fallbackAppId = "", fallbackAppName = "") => {
      const { collapsed, pendingQuestion } = turnsToCollapsedTurns(turns, fallbackAppId, fallbackAppName);
      /* A pending question counts: a slot whose first answer is still being written is in use. */
      activeSlotTurnCountRef.current = collapsed.length + (pendingQuestion ? 1 : 0);
      setAskThreadCollapsed(collapsed);
      setAskThreadDisplayQuestion(pendingQuestion ?? "");
      setExpandedTurnKey(pendingQuestion ? "live" : collapsed.length > 0 ? collapsed[collapsed.length - 1]!.id : "live");
    },
    [setAskThreadCollapsed, setAskThreadDisplayQuestion, setExpandedTurnKey],
  );

  const refreshSummaries = useCallback(async () => {
    const rows = await listChatSlots();
    summariesRef.current = rows;
    setSummaries(rows);
    return rows;
  }, []);

  /*
   * The dingleberry sweep (decision D42, option 2, locked 2026-08-31): a chat that was created
   * and then never used — zero turns, still wearing the default "New chat" name — deletes itself
   * when the user switches away from it. Left alone, such a chat sits in the rotation forever
   * looking almost identical to the [+] screen, which is how "there are two new chat screens"
   * got reported. A renamed empty chat is kept (the rename says "I mean to use this"), and a slot
   * the backend is generating into is never touched: its first turns simply have not landed yet.
   */
  const sweepIfNeverUsed = useCallback(
    (slotId: string, turnCount: number) => {
      if (turnCount !== 0) return;
      if (isSlotGenerating?.(slotId)) return;
      const label = summariesRef.current.find((s) => s.id === slotId)?.label ?? "";
      if (label !== "New chat") return;
      void deleteChatSlot(slotId).then((ok) => {
        if (ok) void refreshSummaries();
      });
    },
    [isSlotGenerating, refreshSummaries],
  );

  const reloadActiveSlotTranscript = useCallback(async () => {
    /*
     * The slot list is stale the moment an answer archives: appending the first turn renames the
     * slot after its question (chat_slot_service.append_turn), and every append bumps updated_at,
     * which is the row's ordering. Without this the row kept saying "New chat" over a finished
     * conversation — seen on device 2026-08-31. Fire-and-forget: the transcript below must not
     * wait on the list.
     */
    void refreshSummaries();
    const sid = activeSlotIdRef.current;
    if (!sid) {
      activeSlotTurnCountRef.current = -1;
      setAskThreadCollapsed([]);
      setAskThreadDisplayQuestion("");
      setExpandedTurnKey("live");
      setChatMemory(NO_CHAT_MEMORY);
      return;
    }
    const slot = await getChatSlot(sid);
    if (!slot) return;
    applySlotTranscript(slot.turns, slot.origin_app_id ?? "", slot.origin_app_name ?? "");
    applySlotMemory(slot);
  }, [applySlotMemory, applySlotTranscript, refreshSummaries, setAskThreadCollapsed, setAskThreadDisplayQuestion, setExpandedTurnKey]);

  const selectSlot = useCallback(
    async (slotId: string | null) => {
      /* Captured before anything below overwrites them: they describe the slot being LEFT. */
      const leavingId = activeSlotIdRef.current;
      const leavingTurnCount = activeSlotTurnCountRef.current;
      setActiveSlot(slotId);
      /*
       * Blank the live answer BEFORE the transcript round-trip below, not after: the fetch is
       * async, and activeSlotId already says "the new chat" the instant setActiveSlot returns
       * above. Waiting for the fetch to resolve left the OLD chat's finished reply on screen,
       * wearing the new chat's identity, for the length of one RPC — the "ghost reply" bug
       * (roadmap: "A new chat shows the previous chat's last reply until the panel is reopened").
       * This never touches askThreadCollapsed/askThreadDisplayQuestion/expandedTurnKey — those
       * still come from the branches below, once the real transcript (or "no chat") is known.
       */
      resetLiveAskPresentation?.();
      // Same reason as the live answer above: the chat being left must not lend its card to the next.
      setChatMemory(NO_CHAT_MEMORY);
      if (!slotId) {
        activeSlotTurnCountRef.current = -1;
        setAskThreadCollapsed([]);
        setAskThreadDisplayQuestion("");
        setExpandedTurnKey("live");
      } else {
        const slot = await getChatSlot(slotId);
        if (slot) {
          applySlotTranscript(slot.turns, slot.origin_app_id ?? "", slot.origin_app_name ?? "");
          applySlotMemory(slot);
        }
      }
      if (leavingId && leavingId !== slotId) {
        sweepIfNeverUsed(leavingId, leavingTurnCount);
      }
    },
    [
      applySlotMemory,
      applySlotTranscript,
      resetLiveAskPresentation,
      setActiveSlot,
      setAskThreadCollapsed,
      setAskThreadDisplayQuestion,
      setExpandedTurnKey,
      sweepIfNeverUsed,
    ],
  );

  const createSlot = useCallback(async () => {
    const running = Router.MainRunningApp;
    const slot = await createChatSlot({
      originAppId: running?.appid?.toString() ?? "",
      appName: running?.display_name ?? "",
    });
    if (!slot) return null;
    await refreshSummaries();
    await selectSlot(slot.id);
    return slot;
  }, [refreshSummaries, selectSlot]);

  const renameSlot = useCallback(
    async (slotId: string, label: string) => {
      const saved = await renameChatSlot(slotId, label);
      if (!saved) return false;
      await refreshSummaries();
      return true;
    },
    [refreshSummaries],
  );

  const deleteSlot = useCallback(
    async (slotId: string) => {
      const ok = await deleteChatSlot(slotId);
      if (!ok) return false;
      const wasActive = activeSlotIdRef.current === slotId;
      await refreshSummaries();
      if (wasActive) {
        const rows = await listChatSlots();
        await selectSlot(rows[0]?.id ?? null);
      }
      return true;
    },
    [refreshSummaries, selectSlot],
  );

  const ensureActiveSlotForAsk = useCallback(
    async (question: string) => {
      const existing = activeSlotIdRef.current;
      if (existing) return existing;
      const running = Router.MainRunningApp;
      const slot = await createChatSlot({
        originAppId: running?.appid?.toString() ?? "",
        appName: running?.display_name ?? "",
        firstQuestion: question,
      });
      if (!slot) return null;
      await refreshSummaries();
      setActiveSlot(slot.id);
      return slot.id;
    },
    [refreshSummaries, setActiveSlot],
  );

  /*
   * The open chat's summary and the button's job ride on that chat's own row of the list: the list
   * is already handed all the way to the Main tab, and no new value may be (plan 68 Appendix A).
   */
  const { runningSlotId, seconds: sumUpSeconds, start: startSumUpJob, stop: stopSumUpJob } = sumUpJob;
  const rows = useMemo<ChatListRow[]>(() => {
    if (!activeSlotId) return summaries;
    const memory = chatMemory.slotId === activeSlotId ? chatMemory : { ...NO_CHAT_MEMORY, slotId: activeSlotId };
    return summaries.map((row) =>
      row.id !== activeSlotId
        ? row
        : {
            ...row,
            sumUp: {
              summary: memory.summary,
              canSumUp: memory.canSumUp,
              questionsAfterSummary: memory.questionsAfterSummary,
              summingUp: runningSlotId === activeSlotId,
              summingUpSeconds: runningSlotId === activeSlotId ? sumUpSeconds : null,
              otherJobRunning: runningSlotId != null && runningSlotId !== activeSlotId,
              startSumUp: () => startSumUpJob(activeSlotId),
              stopSumUp: stopSumUpJob,
            },
          },
    );
  }, [activeSlotId, chatMemory, runningSlotId, startSumUpJob, stopSumUpJob, sumUpSeconds, summaries]);

  return {
    summaries: rows,
    activeSlotId,
    setActiveSlot,
    refreshSummaries,
    reloadActiveSlotTranscript,
    selectSlot,
    createSlot,
    renameSlot,
    deleteSlot,
    ensureActiveSlotForAsk,
  };
}
