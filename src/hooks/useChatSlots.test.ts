import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useChatSlots } from "./useChatSlots";

vi.mock("../utils/chatSlotsApi", () => ({
  listChatSlots: vi.fn(async () => []),
  getChatSlot: vi.fn(async () => null),
  createChatSlot: vi.fn(async () => ({
    id: "new-slot",
    label: "New chat",
    created_at: 0,
    updated_at: 0,
    turns: [],
  })),
  deleteChatSlot: vi.fn(async () => true),
  renameChatSlot: vi.fn(async () => null),
}));

import * as chatSlotsApi from "../utils/chatSlotsApi";

describe("useChatSlots", () => {
  it("writes activeSlotIdRef synchronously in setActiveSlot", async () => {
    const activeSlotIdRef = { current: null as string | null };
    const { result } = renderHook(() =>
      useChatSlots({
        activeSlotIdRef,
        setAskThreadCollapsed: vi.fn(),
        setAskThreadDisplayQuestion: vi.fn(),
        setExpandedTurnKey: vi.fn(),
      }),
    );

    await act(async () => {
      result.current.setActiveSlot("slot-a");
    });

    expect(activeSlotIdRef.current).toBe("slot-a");
    expect(result.current.activeSlotId).toBe("slot-a");
  });

  it("concurrent create calls each see the ref the setter wrote", async () => {
    const activeSlotIdRef = { current: null as string | null };
    const createSpy = vi.mocked(chatSlotsApi.createChatSlot);
    createSpy
      .mockResolvedValueOnce({
        id: "slot-1",
        label: "One",
        created_at: 0,
        updated_at: 0,
        turns: [],
      })
      .mockResolvedValueOnce({
        id: "slot-2",
        label: "Two",
        created_at: 0,
        updated_at: 0,
        turns: [],
      });

    const { result } = renderHook(() =>
      useChatSlots({
        activeSlotIdRef,
        setAskThreadCollapsed: vi.fn(),
        setAskThreadDisplayQuestion: vi.fn(),
        setExpandedTurnKey: vi.fn(),
      }),
    );

    await act(async () => {
      await Promise.all([result.current.ensureActiveSlotForAsk("q1"), result.current.ensureActiveSlotForAsk("q2")]);
    });

    expect(createSpy).toHaveBeenCalledTimes(2);
    expect(activeSlotIdRef.current).toBe("slot-2");
  });

  /*
   * Clear cache detaches the slot rather than deleting it (D32), and detaching only works because
   * of what this describes: with the pointer null, the post-Ask reload must blank the thread
   * instead of reading the slot back off disk. Before the fix the pointer survived the reset, and
   * `reloadActiveSlotTranscript` — which runs after every completed Ask — refilled the transcript
   * the user had just cleared.
   */
  describe("a detached slot pointer", () => {
    it("makes reloadActiveSlotTranscript clear the thread instead of restoring one", async () => {
      const activeSlotIdRef = { current: "slot-a" as string | null };
      const setAskThreadCollapsed = vi.fn();
      const setAskThreadDisplayQuestion = vi.fn();
      const setExpandedTurnKey = vi.fn();
      const getSpy = vi.mocked(chatSlotsApi.getChatSlot);
      getSpy.mockClear();

      const { result } = renderHook(() =>
        useChatSlots({
          activeSlotIdRef,
          setAskThreadCollapsed,
          setAskThreadDisplayQuestion,
          setExpandedTurnKey,
        }),
      );

      await act(async () => {
        result.current.setActiveSlot(null);
      });
      expect(activeSlotIdRef.current).toBeNull();
      expect(result.current.activeSlotId).toBeNull();

      await act(async () => {
        await result.current.reloadActiveSlotTranscript();
      });

      // The slot is never even read, so nothing on disk can come back.
      expect(getSpy).not.toHaveBeenCalled();
      expect(setAskThreadCollapsed).toHaveBeenLastCalledWith([]);
      expect(setAskThreadDisplayQuestion).toHaveBeenLastCalledWith("");
      expect(setExpandedTurnKey).toHaveBeenLastCalledWith("live");
    });

    it("still reads the slot back while a pointer is set, so only the reset path is affected", async () => {
      const activeSlotIdRef = { current: "slot-a" as string | null };
      const setAskThreadCollapsed = vi.fn();
      const getSpy = vi.mocked(chatSlotsApi.getChatSlot);
      getSpy.mockClear();
      getSpy.mockResolvedValueOnce({
        id: "slot-a",
        label: "A",
        created_at: 0,
        updated_at: 0,
        turns: [
          { role: "user", text: "q" },
          { role: "assistant", text: "a" },
        ],
      } as never);

      const { result } = renderHook(() =>
        useChatSlots({
          activeSlotIdRef,
          setAskThreadCollapsed,
          setAskThreadDisplayQuestion: vi.fn(),
          setExpandedTurnKey: vi.fn(),
        }),
      );

      await act(async () => {
        await result.current.reloadActiveSlotTranscript();
      });

      expect(getSpy).toHaveBeenCalledWith("slot-a");
      expect(setAskThreadCollapsed).toHaveBeenCalled();
      expect(setAskThreadCollapsed.mock.calls.at(-1)?.[0]).not.toEqual([]);
    });
  });

  describe("the active slot survives a reopen", () => {
    /*
     * SESSION-CONTEXT-COUNT-01. The pointer to the saved chat was carried only by the
     * modal-survival snapshot, which is written when a Decky modal opens. A QAM close/reopen is
     * a plain remount and writes none, so the pointer came back null and the thread read as
     * empty while the slot file still held every turn. Measured on device: four entries on disk,
     * one turn on screen tagged `live`.
     */
    function render(activeSlotIdRef: { current: string | null }) {
      return renderHook(() =>
        useChatSlots({
          activeSlotIdRef,
          setAskThreadCollapsed: vi.fn(),
          setAskThreadDisplayQuestion: vi.fn(),
          setExpandedTurnKey: vi.fn(),
        }),
      );
    }

    it("stores the id so a fresh mount can find it", async () => {
      window.localStorage.removeItem("bonsai:active-chat-slot");
      const { result } = render({ current: null });

      await act(async () => {
        result.current.setActiveSlot("slot-a");
      });

      expect(window.localStorage.getItem("bonsai:active-chat-slot")).toBe("slot-a");
    });

    /*
     * The half that keeps Clear cache fixed. *Clear cache* detaches by calling
     * `setActiveSlot(null)`, and D32 rests on there being nothing left to restore afterwards —
     * a write-only pointer would refill the thread on the next reopen.
     */
    it("clears the stored id when the slot is detached", async () => {
      const { result } = render({ current: null });

      await act(async () => {
        result.current.setActiveSlot("slot-a");
      });
      expect(window.localStorage.getItem("bonsai:active-chat-slot")).toBe("slot-a");

      await act(async () => {
        result.current.setActiveSlot(null);
      });

      expect(window.localStorage.getItem("bonsai:active-chat-slot")).toBeNull();
    });

    it("stores the id minted for a first Ask, not just an explicit selection", async () => {
      window.localStorage.removeItem("bonsai:active-chat-slot");
      const { result } = render({ current: null });

      await act(async () => {
        await result.current.ensureActiveSlotForAsk("how do i deal with the exploders");
      });

      expect(window.localStorage.getItem("bonsai:active-chat-slot")).toBe("new-slot");
    });
  });

  /*
   * The dingleberry sweep (D42, locked 2026-08-31): a chat created and never used — zero turns,
   * still named "New chat" — deletes itself when the user switches away. A rename or a pending
   * answer both mean "in use" and protect the slot.
   */
  describe("the never-used slot sweep", () => {
    const SUMMARY_ROWS = [
      { id: "empty", label: "New chat", created_at: 0, updated_at: 0 },
      { id: "draft", label: "Draft ideas", created_at: 0, updated_at: 0 },
      { id: "used", label: "Real chat", created_at: 0, updated_at: 0 },
    ];

    function mockSlots() {
      vi.mocked(chatSlotsApi.listChatSlots).mockImplementation(async () => SUMMARY_ROWS as never);
      vi.mocked(chatSlotsApi.getChatSlot).mockImplementation(async (id: string) =>
        ({
          id,
          label: SUMMARY_ROWS.find((r) => r.id === id)?.label ?? "",
          created_at: 0,
          updated_at: 0,
          turns:
            id === "used"
              ? [
                  { role: "user", text: "q" },
                  { role: "assistant", text: "a" },
                ]
              : [],
        }) as never,
      );
    }

    function renderSwept(isSlotGenerating?: (slotId: string) => boolean) {
      return renderHook(() =>
        useChatSlots({
          activeSlotIdRef: { current: null },
          setAskThreadCollapsed: vi.fn(),
          setAskThreadDisplayQuestion: vi.fn(),
          setExpandedTurnKey: vi.fn(),
          isSlotGenerating,
        }),
      );
    }

    async function visitThenLeave(
      result: { current: ReturnType<typeof useChatSlots> },
      visited: string,
    ) {
      await act(async () => {
        await result.current.refreshSummaries();
        await result.current.selectSlot(visited);
        await result.current.selectSlot("used");
      });
    }

    afterEach(() => {
      vi.mocked(chatSlotsApi.listChatSlots).mockImplementation(async () => []);
      vi.mocked(chatSlotsApi.getChatSlot).mockImplementation(async () => null);
      vi.mocked(chatSlotsApi.deleteChatSlot).mockClear();
    });

    it("deletes an empty 'New chat' when the user switches away from it", async () => {
      mockSlots();
      const { result } = renderSwept();

      await visitThenLeave(result, "empty");

      expect(chatSlotsApi.deleteChatSlot).toHaveBeenCalledWith("empty");
    });

    it("keeps an empty chat the user renamed — the rename says they mean to use it", async () => {
      mockSlots();
      const { result } = renderSwept();

      await visitThenLeave(result, "draft");

      expect(chatSlotsApi.deleteChatSlot).not.toHaveBeenCalled();
    });

    it("keeps a chat with turns", async () => {
      mockSlots();
      const { result } = renderSwept();

      await act(async () => {
        await result.current.refreshSummaries();
        await result.current.selectSlot("used");
        await result.current.selectSlot("draft");
      });

      expect(chatSlotsApi.deleteChatSlot).not.toHaveBeenCalled();
    });

    /* The Ask-from-[+] flow creates the chat and pops to it BEFORE the first turn lands, so for a
       few seconds a generating chat is empty and named "New chat" — exactly what the sweep hunts.
       Deleting it would lose the answer being written. */
    it("never sweeps a chat the backend is generating into", async () => {
      mockSlots();
      const { result } = renderSwept((slotId) => slotId === "empty");

      await visitThenLeave(result, "empty");

      expect(chatSlotsApi.deleteChatSlot).not.toHaveBeenCalled();
    });
  });

  /*
   * Plan 68: the open chat's own summary rides on its row of the chat list, set by the same load
   * that sets the transcript -- and blanked the moment another chat is picked, so a card can never
   * show under a chat it does not belong to.
   */
  describe("the open chat's summary on its own row", () => {
    const SUMMARY = {
      text: "Playing Half-Life 2.",
      covers_through_turn_id: "a1",
      turns_covered: 2,
      oldest_turns_unread: 0,
      hidden_notes_left_out: 0,
      written_at: "2026-09-25T19:00:00Z",
      seconds: 30,
      model: "gemma4:e2b-it-qat",
    };
    const row = (id: string) => ({ id, label: id, created_at: 0, updated_at: 0, turn_count: 4 });

    function renderWithSlots() {
      vi.mocked(chatSlotsApi.listChatSlots).mockResolvedValue([row("summed"), row("plain")]);
      vi.mocked(chatSlotsApi.getChatSlot).mockImplementation(async (id: string) =>
        id === "summed"
          ? {
              ...row("summed"),
              summary: SUMMARY,
              can_sum_up: true,
              turns: [
                { id: "q1", role: "user", text: "one" },
                { id: "a1", role: "assistant", text: "one." },
                { id: "q2", role: "user", text: "two" },
                { id: "a2", role: "assistant", text: "two." },
              ],
            }
          : { ...row("plain"), turns: [{ id: "q9", role: "user", text: "hi" }, { id: "a9", role: "assistant", text: "hello" }] },
      );
      const activeSlotIdRef = { current: null as string | null };
      return renderHook(() =>
        useChatSlots({
          activeSlotIdRef,
          setAskThreadCollapsed: vi.fn(),
          setAskThreadDisplayQuestion: vi.fn(),
          setExpandedTurnKey: vi.fn(),
        }),
      );
    }

    it("the open chat's row carries its summary, whether there is anything to sum up, and what is kept", async () => {
      const { result } = renderWithSlots();
      await act(async () => {
        await result.current.refreshSummaries();
        await result.current.selectSlot("summed");
      });
      const open = result.current.summaries.find((r) => r.id === "summed");
      expect(open?.sumUp?.summary).toEqual(SUMMARY);
      expect(open?.sumUp?.canSumUp).toBe(true);
      expect(open?.sumUp?.questionsAfterSummary).toBe(1);
      expect(open?.sumUp?.summingUp).toBe(false);
      expect(result.current.summaries.find((r) => r.id === "plain")?.sumUp).toBeUndefined();
    });

    it("switching chats never lends the old chat's card to the new one", async () => {
      const { result } = renderWithSlots();
      await act(async () => {
        await result.current.refreshSummaries();
        await result.current.selectSlot("summed");
        await result.current.selectSlot("plain");
      });
      const open = result.current.summaries.find((r) => r.id === "plain");
      expect(open?.sumUp?.summary).toBeNull();
      expect(open?.sumUp?.canSumUp).toBe(false);
    });
  });
});
