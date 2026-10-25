/**
 * Title: "Suggest as a tip" under a finished answer (plan 100, lane J)
 * Purpose: Pin the reply row at the level the Deck check (P100-SUGGEST-01) looks at: the real rating hook, the real
 *          tip hook and the real reply row. A finished answer with text draws the button; an answer still being
 *          asked about, a half-written one (Stop) and a row handed no tip view do not. A presses it: the plugin
 *          call goes out with the question and the answer, and the one line under the button reads "Saved <file>.
 *          To send it in: <link>"; with the Desktop permission off the line is the refusal and names the Permissions
 *          tab. The button stays after a rating. It is a stop of the plugin's own, inside the reply row, with
 *          all four moves and a press; Left and Right hold; B is left to Steam.
 * Used for: buildReplyActionsElement.tsx, suggestTipRow.tsx, useReplySuggestTip.ts, replyStopRegistry.ts.
 * Does not: Walk the D-pad in the Deck's numbers (buildReplyActionsElement.suggestTipWalk.test.tsx does), or call the
 *           real plugin method (a stand-in records each call).
 */
import React from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../../test-harness/steamRing");
  return { ...stubs, Focusable: SteamRingFocusable };
});

import { putSteamRingOn, type SteamEl } from "../../../test-harness/steamRing";
import { buildReplyActionsElement } from "./buildReplyActionsElement";
import { resetRememberedReplyFeedbackForTests, useReplyFeedbackChips } from "./useReplyFeedbackChips";
import { resetRememberedReplySuggestTipForTests, useReplySuggestTip, type SuggestTipFn } from "./useReplySuggestTip";
import { REPLY_STOP_ORDER, registerReplyStop, setReplyStopUnavailable } from "../../../shared/dpad/replyStopRegistry";
import type { LastExchangeSnapshot } from "../../../types/backgroundAsk";

const REPLY: LastExchangeSnapshot = {
  question: "how do i beat the mantis lords",
  answer: "Stay near the middle and dash through the first lunge.",
  appName: "Hollow Knight",
};
const SAVED = { ok: true, file: "hollow-knight-20261025-153012.json", issueUrl: "https://github.com/qd313/bonsAI/issues/new?title=Suggested%20tip%3A%20how%20do%20i" } as const;
const REFUSED = { ok: false, error: "Filesystem writes are disabled. Enable them in the Permissions tab." } as const;
const BUTTON = "[aria-label='Suggest as a tip']";

beforeEach(() => {
  resetRememberedReplyFeedbackForTests();
  resetRememberedReplySuggestTipForTests();
  for (const id of REPLY_STOP_ORDER) {
    registerReplyStop(id, null);
    setReplyStopUnavailable(id, false);
  }
});
afterEach(() => cleanup());

type RowProps = {
  suggest: SuggestTipFn;
  showFeedback?: boolean;
  ratingUnavailable?: boolean;
  askInFlight?: boolean;
  withTip?: boolean;
};

function Row(p: RowProps): React.ReactElement | null {
  const fb = useReplyFeedbackChips({
    lastExchange: REPLY,
    lastRequestId: 7,
    setUnifiedInput: () => {},
    askMode: "strategy",
    pendingReplyFollowUpRef: { current: null },
  });
  const tip = useReplySuggestTip({ lastExchange: REPLY, appId: "367520", appName: "Hollow Knight", suggest: p.suggest });
  return buildReplyActionsElement({
    replyKey: "turn-1",
    rating: fb.liveReplyFeedbackRating,
    onRate: (r) => void fb.onReplyFeedback(r),
    showFeedback: p.showFeedback ?? true,
    ratingUnavailable: p.ratingUnavailable,
    askInFlight: p.askInFlight,
    onToggleTransparency: () => {},
    onChip: (id) => void fb.onReplyMicroAction(id),
    chipUsed: fb.liveReplyChipUsed,
    onMoveDownFromUtility: () => false,
    suggestTip: p.withTip === false ? undefined : tip,
  });
}

function mount(p: Partial<RowProps> = {}) {
  const calls: Parameters<SuggestTipFn>[0][] = [];
  const suggest: SuggestTipFn = async (req) => (calls.push(req), p.suggest ? p.suggest(req) : SAVED);
  const view = render(<Row {...p} suggest={suggest} />);
  const button = () => view.container.querySelector<HTMLElement>(BUTTON);
  const line = () => view.container.querySelector(".bonsai-chat-suggest-tip-line");
  const pressA = async () => {
    const el = button()!;
    act(() => putSteamRingOn(el));
    act(() => el.click());
    await act(async () => void (await new Promise((r) => setTimeout(r, 0))));
  };
  return { view, calls, button, line, pressA };
}

describe("the button is there only under a finished answer", () => {
  it("a finished answer with text draws it, with its words", () => {
    const m = mount();
    expect(m.button()).not.toBeNull();
    expect(m.button()!.textContent).toBe("Suggest as a tip");
    expect(m.line()).toBeNull();
  });

  it.each([
    ["an answer with no text (showFeedback off)", { showFeedback: false }],
    ["a half-written answer after Stop", { ratingUnavailable: true }],
    ["a row handed no tip view", { withTip: false }],
  ])("%s draws none", (_n, props) => {
    expect(mount(props).button()).toBeNull();
  });

  it("while a new question is being asked it is drawn greyed and A does nothing", async () => {
    const m = mount({ askInFlight: true });
    expect(m.button()!.getAttribute("aria-disabled")).toBe("true");
    await m.pressA();
    expect(m.calls).toEqual([]);
  });
});

describe("A on the button", () => {
  it("sends the question and the answer, and the line names the file and the link", async () => {
    const m = mount();
    await m.pressA();
    expect(m.calls).toEqual([
      {
        question: "how do i beat the mantis lords",
        answer: "Stay near the middle and dash through the first lunge.",
        appId: "367520",
        appName: "Hollow Knight",
        kind: "mechanic",
      },
    ]);
    expect(m.line()?.textContent).toBe(`Saved ${SAVED.file}. To send it in: ${SAVED.issueUrl}`);
    expect(m.line()?.getAttribute("role")).toBe("status");
  });

  it("with the Desktop permission off the line is the refusal and it names the Permissions tab", async () => {
    const m = mount({ suggest: async () => REFUSED });
    await m.pressA();
    expect(m.line()?.textContent).toBe(REFUSED.error);
    expect(m.line()?.textContent).toContain("Permissions tab");
  });

  it("a second A after a good save sends nothing and the line stays", async () => {
    const m = mount();
    await m.pressA();
    await m.pressA();
    expect(m.calls).toHaveLength(1);
    expect(m.line()?.textContent).toContain("Saved ");
  });

  it("the button is still there after Not really, with its reasons showing", () => {
    const m = mount();
    act(() => m.view.container.querySelector<HTMLElement>("[aria-label='Mark reply not helpful']")!.click());
    expect(m.view.container.textContent).toContain("What went wrong?");
    expect(m.button()).not.toBeNull();
  });

  it("the button is still there after Helpful, when the thumbs have given way to the saved words", () => {
    const m = mount();
    act(() => m.view.container.querySelector<HTMLElement>("[aria-label='Mark reply helpful']")!.click());
    expect(m.view.container.textContent).toContain("Saved on this Deck");
    expect(m.button()).not.toBeNull();
  });
});

describe("the button is a stop of the plugin's own and hears A and B", () => {
  it("it sits inside the reply row, its container has all four moves, Left and Right hold, and B is left to Steam", () => {
    const m = mount();
    const button = m.button()!;
    expect(button.closest(".bonsai-chat-reply-actions")).not.toBeNull();
    const container = button.parentElement as SteamEl;
    const nav = container.__nav!;
    for (const k of ["onMoveUp", "onMoveDown", "onMoveLeft", "onMoveRight"]) expect(typeof nav[k]).toBe("function");
    expect(nav.onMoveLeft!()).toBe(true);
    expect(nav.onMoveRight!()).toBe(true);
    /* B is not claimed anywhere between the button and the reply row, so Steam's back step still runs. */
    for (let el: SteamEl | null = button as SteamEl; el && !el.classList.contains("bonsai-chat-reply-actions"); el = el.parentElement as SteamEl | null) {
      expect(el.__nav?.onCancelButton).toBeUndefined();
    }
    /* A is the button's press and a tap is its click, one handler. */
    act(() => button.click());
    expect(m.calls).toHaveLength(1);
  });
});
