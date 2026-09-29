/**
 * Title: A rated reply stays rated when the panel is closed and opened again
 * Purpose: Pin the fix for plan 72 flow F (docs/test-evidence/plan72-F-ROW.json, "sideEffect"):
 *          Not helpful was pressed, the "What went wrong?" chips showed, then the chat row's save
 *          icon opened Steam's save window, which closes and reopens the side panel. The panel
 *          came back with the chips gone and the thumbs live again, because the rating lived only
 *          in the Ask hook's own state and a remount starts that state at "not rated".
 * Used for: useReplyFeedbackChips.ts, drawn through buildReplyActionsElement.tsx the way the
 *           transcript draws the newest answer.
 * Does not: Prove the fix on the Deck. The check this owes: Not helpful on the newest answer,
 *           then A on the chat row's save icon, B; the panel comes back with both thumbs greyed
 *           and "What went wrong?" and its five chips still under the answer.
 */
import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { call } from "@decky/api";

import {
  resetRememberedReplyFeedbackForTests,
  useReplyFeedbackChips,
} from "./useReplyFeedbackChips";
import type { LastExchangeSnapshot, ReplyFollowUpPending } from "../types/backgroundAsk";
import { buildReplyActionsElement } from "../utils/buildReplyActionsElement";
import { resetUiDocument } from "../utils/uiDocument";
import { dispatchFakeRpc, resetFakeDeckyRpc } from "../test-harness/fakeDeckyRpc";

vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

const REPLY: LastExchangeSnapshot = {
  question: "how do i beat the boss at the end of the first area",
  answer: "Dodge the slam, then hit its back.",
  askMode: "speed",
};

/** The newest answer's action row, wired the way MainTabChatTranscript wires it. */
function NewestAnswerRow(props: { exchange: LastExchangeSnapshot; requestId: number }) {
  const pendingReplyFollowUpRef = { current: null as ReplyFollowUpPending | null };
  const fb = useReplyFeedbackChips({
    lastExchange: props.exchange,
    lastRequestId: props.requestId,
    setUnifiedInput: () => {},
    askMode: "speed",
    pendingReplyFollowUpRef,
  });
  return buildReplyActionsElement({
    replyKey: "turn-1",
    rating: fb.liveReplyFeedbackRating,
    onRate: (r) => void fb.onReplyFeedback(r),
    showFeedback: true,
    transparencyOpen: false,
    chipUsed: fb.liveReplyChipUsed,
    onChip: (id) => void fb.onReplyMicroAction(id),
  });
}

const thumb = (label: string) => screen.getByLabelText(label) as HTMLButtonElement;

describe("the Helpful row after the panel is closed and opened again", () => {
  beforeEach(() => {
    resetUiDocument();
    resetFakeDeckyRpc();
    resetRememberedReplyFeedbackForTests();
    vi.mocked(call).mockImplementation((method: string, ...args: unknown[]) =>
      dispatchFakeRpc(method, args) as ReturnType<typeof call>
    );
  });
  afterEach(() => cleanup());

  it("Not helpful: greyed thumbs and the reason chips are drawn again after a remount", async () => {
    const first = render(<NewestAnswerRow exchange={REPLY} requestId={7} />);
    await act(async () => {
      fireEvent.click(thumb("Mark reply not helpful"));
    });
    expect(screen.getByText("What went wrong?")).toBeTruthy();
    expect(thumb("Mark reply helpful").disabled).toBe(true);

    // The save window closes the side panel: the whole plugin unmounts, then mounts again.
    first.unmount();
    render(<NewestAnswerRow exchange={{ ...REPLY }} requestId={7} />);

    expect(screen.getByText("What went wrong?")).toBeTruthy();
    expect(thumb("Mark reply helpful").disabled).toBe(true);
    expect(thumb("Mark reply not helpful").disabled).toBe(true);
  });

  it("Helpful: still reads as saved after a remount, with no live thumbs", async () => {
    const first = render(<NewestAnswerRow exchange={REPLY} requestId={7} />);
    await act(async () => {
      fireEvent.click(thumb("Mark reply helpful"));
    });
    first.unmount();
    render(<NewestAnswerRow exchange={{ ...REPLY }} requestId={7} />);

    expect(screen.getByText("Saved on this Deck")).toBeTruthy();
    expect(screen.queryByLabelText("Mark reply helpful")).toBeNull();
  });

  it("a chip already used stays used after a remount", async () => {
    const first = render(<NewestAnswerRow exchange={REPLY} requestId={7} />);
    await act(async () => {
      fireEvent.click(thumb("Mark reply not helpful"));
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Too long"));
    });
    first.unmount();
    render(<NewestAnswerRow exchange={{ ...REPLY }} requestId={7} />);

    expect((screen.getByText("Too long").closest("button") as HTMLButtonElement).disabled).toBe(true);
  });

  it("the same words from a new question are not already rated (the answer cache)", async () => {
    const first = render(<NewestAnswerRow exchange={REPLY} requestId={7} />);
    await act(async () => {
      fireEvent.click(thumb("Mark reply not helpful"));
    });
    first.unmount();
    render(<NewestAnswerRow exchange={{ ...REPLY }} requestId={8} />);

    expect(screen.queryByText("What went wrong?")).toBeNull();
    expect(thumb("Mark reply helpful").disabled).toBe(false);
  });
});

describe("the rating while the same hook shows another reply and comes back", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
    resetRememberedReplyFeedbackForTests();
    vi.mocked(call).mockImplementation((method: string, ...args: unknown[]) =>
      dispatchFakeRpc(method, args) as ReturnType<typeof call>
    );
  });

  it("comes back with the reply, and clearing the view does not forget it", async () => {
    const view = renderHook(
      (p: { ex: LastExchangeSnapshot | null; rid: number | null }) =>
        useReplyFeedbackChips({
          lastExchange: p.ex,
          lastRequestId: p.rid,
          setUnifiedInput: () => {},
          askMode: "speed",
          pendingReplyFollowUpRef: { current: null },
        }),
      { initialProps: { ex: REPLY as LastExchangeSnapshot | null, rid: 7 as number | null } }
    );
    await act(async () => {
      await view.result.current.onReplyFeedback("down");
    });
    // A chat switch blanks the live answer and resets the row's state.
    act(() => view.result.current.resetReplyFeedback());
    act(() => view.rerender({ ex: null, rid: 7 }));
    expect(view.result.current.liveReplyFeedbackRating).toBeNull();

    act(() => view.rerender({ ex: { ...REPLY }, rid: 7 }));
    expect(view.result.current.liveReplyFeedbackRating).toBe("down");
  });

  /*
   * Plan 76 lane 4: the same reply comes back after a chat switch as the saved chat's newest turn,
   * which carries no request id (only the live poll knows it). It must still find its rating.
   */
  it("finds a rating given to the live reply when the reply comes back from the saved chat", async () => {
    const view = renderHook(
      (p: { ex: LastExchangeSnapshot | null; rid: number | null }) =>
        useReplyFeedbackChips({
          lastExchange: p.ex,
          lastRequestId: p.rid,
          setUnifiedInput: () => {},
          askMode: "speed",
          pendingReplyFollowUpRef: { current: null },
        }),
      { initialProps: { ex: REPLY as LastExchangeSnapshot | null, rid: 7 as number | null } }
    );
    await act(async () => {
      await view.result.current.onReplyFeedback("down");
    });
    act(() => view.result.current.resetReplyFeedback());
    act(() => view.rerender({ ex: null, rid: 7 }));
    act(() => view.rerender({ ex: { ...REPLY }, rid: null }));
    expect(view.result.current.liveReplyFeedbackRating).toBe("down");
  });

  it("a rating given on a reply that came from the saved chat is kept and saved with no request id", async () => {
    const view = renderHook(
      (p: { ex: LastExchangeSnapshot | null; rid: number | null }) =>
        useReplyFeedbackChips({
          lastExchange: p.ex,
          lastRequestId: p.rid,
          setUnifiedInput: () => {},
          askMode: "speed",
          pendingReplyFollowUpRef: { current: null },
        }),
      { initialProps: { ex: { ...REPLY } as LastExchangeSnapshot | null, rid: null as number | null } }
    );
    await act(async () => {
      await view.result.current.onReplyFeedback("up");
    });
    act(() => view.result.current.resetReplyFeedback());
    act(() => view.rerender({ ex: null, rid: null }));
    act(() => view.rerender({ ex: { ...REPLY }, rid: null }));
    expect(view.result.current.liveReplyFeedbackRating).toBe("up");
  });

  it("finds the rating of a reply whose question was shown under a friendly caption", async () => {
    const live: LastExchangeSnapshot = {
      question: "I'm at: the first boss",
      originalQuestion: "[Strategy follow-up] I'm at: the first boss",
      answer: "Dodge the slam.",
    };
    const saved: LastExchangeSnapshot = {
      question: "[Strategy follow-up] I'm at: the first boss",
      originalQuestion: "[Strategy follow-up] I'm at: the first boss",
      answer: "Dodge the slam.",
    };
    const view = renderHook(
      (p: { ex: LastExchangeSnapshot | null; rid: number | null }) =>
        useReplyFeedbackChips({
          lastExchange: p.ex,
          lastRequestId: p.rid,
          setUnifiedInput: () => {},
          askMode: "speed",
          pendingReplyFollowUpRef: { current: null },
        }),
      { initialProps: { ex: live as LastExchangeSnapshot | null, rid: 9 as number | null } }
    );
    await act(async () => {
      await view.result.current.onReplyFeedback("up");
    });
    act(() => view.result.current.resetReplyFeedback());
    act(() => view.rerender({ ex: saved, rid: null }));
    expect(view.result.current.liveReplyFeedbackRating).toBe("up");
  });
});
