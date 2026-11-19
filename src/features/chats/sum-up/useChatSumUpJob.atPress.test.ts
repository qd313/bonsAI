/**
 * Title: Sum up this chat turns busy at the press -- tests
 * Purpose: Pin what the Deck check looks at, on the open chat's own row (the one the button is drawn
 *          from): at the press, before the back end has answered the start, the button already reads
 *          "Summing up" and is greyed, and a second press sends no second start; a refusal (busy,
 *          nothing to do, low memory) or an error puts the normal label back and shows the same toast as
 *          before; the seconds clock only starts once the start is accepted.
 * Used for: useChatSumUpJob.ts, useChatSlots.ts.
 * Does not: Draw the button (SessionSumUpSection tests do) or follow a running summary (useChatSumUpJob.test.ts).
 */
import { act, renderHook } from "@testing-library/react";
import { toaster } from "@decky/api";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useChatSlots } from "../slots/useChatSlots";
import { sumUpButtonView } from "./chatSumUpModel";
import { SUM_UP_FAILED_TOAST, SUM_UP_LOW_MEMORY_TOAST } from "./useChatSumUpJob";
import { resetFakeDeckyRpc, setRpcHandler } from "../../../test-harness/fakeDeckyRpc";
import { idleBackgroundStatusFixture } from "../../../test-harness/rpcFixtures";

vi.mock("../slots/chatSlotsApi", () => ({
  listChatSlots: vi.fn(async () => []),
  getChatSlot: vi.fn(async () => null),
  createChatSlot: vi.fn(async () => null),
  deleteChatSlot: vi.fn(async () => true),
  renameChatSlot: vi.fn(async () => null),
  keepChatTitle: vi.fn(async () => true),
  sumUpChatSlot: vi.fn(),
}));

import * as chatSlotsApi from "../slots/chatSlotsApi";

const row = { id: "c1", label: "c1", created_at: 0, updated_at: 0, turn_count: 40 };
let answerStart: (v: chatSlotsApi.SumUpStartResult) => void;
let failStart: (e: unknown) => void;

async function openChat() {
  vi.mocked(chatSlotsApi.listChatSlots).mockResolvedValue([row]);
  vi.mocked(chatSlotsApi.getChatSlot).mockResolvedValue({
    ...row,
    can_sum_up: true,
    turns: [
      { id: "q1", role: "user", text: "one" },
      { id: "a1", role: "assistant", text: "one." },
    ],
  } as never);
  const hook = renderHook(() =>
    useChatSlots({
      activeSlotIdRef: { current: null as string | null },
      setAskThreadCollapsed: vi.fn(),
      setAskThreadDisplayQuestion: vi.fn(),
      setExpandedTurnKey: vi.fn(),
    }),
  );
  await act(async () => {
    await hook.result.current.refreshSummaries();
    await hook.result.current.selectSlot("c1");
  });
  return hook;
}

const openRow = (h: Awaited<ReturnType<typeof openChat>>) => h.result.current.summaries.find((r) => r.id === "c1")!;
const button = (h: Awaited<ReturnType<typeof openChat>>) =>
  sumUpButtonView({ state: openRow(h).sumUp, answerInFlight: false });

beforeEach(() => {
  resetFakeDeckyRpc();
  vi.mocked(toaster.toast).mockClear();
  vi.mocked(chatSlotsApi.sumUpChatSlot).mockReset();
  vi.mocked(chatSlotsApi.sumUpChatSlot).mockImplementation(
    () =>
      new Promise((resolve, reject) => {
        answerStart = resolve;
        failStart = reject;
      }),
  );
  setRpcHandler("get_background_game_ai_status", () => idleBackgroundStatusFixture());
});

describe("Sum up this chat, at the press", () => {
  it("reads Summing up at once, and a second press sends no second start", async () => {
    const h = await openChat();
    expect(button(h)).toMatchObject({ label: "Sum up this chat", busy: false, disabled: false });
    await act(async () => {
      openRow(h).sumUp!.startSumUp();
      openRow(h).sumUp!.startSumUp();
    });
    expect(button(h)).toMatchObject({ label: "Summing up", busy: true });
    await act(async () => {
      openRow(h).sumUp!.startSumUp();
    });
    expect(chatSlotsApi.sumUpChatSlot).toHaveBeenCalledTimes(1);
    expect(openRow(h).sumUp!.summingUpSeconds).toBeNull();
  });

  it("starts the seconds clock at 0 only once the start is accepted", async () => {
    const h = await openChat();
    await act(async () => {
      openRow(h).sumUp!.startSumUp();
    });
    await act(async () => {
      answerStart({ accepted: true, status: "pending" });
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(button(h).label).toBe("Summing up · 0 s");
  });

  it.each([
    ["busy", "Wait for the answer to finish, then sum up."],
    ["nothing_to_do", "nothing new to sum up"],
    ["low_memory", SUM_UP_LOW_MEMORY_TOAST],
  ])("a refusal (%s) puts the normal label back and shows its toast", async (status, words) => {
    const h = await openChat();
    await act(async () => {
      openRow(h).sumUp!.startSumUp();
    });
    expect(button(h).busy).toBe(true);
    await act(async () => {
      answerStart({ accepted: false, status } as chatSlotsApi.SumUpStartResult);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(button(h)).toMatchObject({ label: "Sum up this chat", busy: false, disabled: false });
    const body = vi.mocked(toaster.toast).mock.calls.map((c) => (c[0] as { body: string }).body).join(" ");
    expect(body).toContain(words);
    // And the person can press it again.
    await act(async () => {
      openRow(h).sumUp!.startSumUp();
    });
    expect(chatSlotsApi.sumUpChatSlot).toHaveBeenCalledTimes(2);
  });

  it("an error puts the normal label back and says it could not sum up", async () => {
    const h = await openChat();
    await act(async () => {
      openRow(h).sumUp!.startSumUp();
    });
    await act(async () => {
      failStart(new Error("RPC timeout"));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(button(h).busy).toBe(false);
    expect(toaster.toast).toHaveBeenCalledWith(expect.objectContaining({ body: SUM_UP_FAILED_TOAST }));
  });
});
