/**
 * Title: Turn header element navigation tests
 * Purpose: Pin the header's D-pad Down wiring to onMoveDown, the handler Steam invokes on device.
 * Used for: SPOILER-DPAD-01 regression guard — the header→bubble entry edge.
 * Solves: This edge shipped three times on handlers Steam never calls for the D-pad (DOM keydown,
 *         then a direction onButtonDown); each looked correct under vitest and was dead on
 *         hardware. These tests go red if the edge leaves onMoveDown again.
 * Does not: Prove on-device behavior — that is runs/SPOILER-REVEAL-*.json's job.
 */
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildTurnHeaderElement } from "./buildTurnHeaderElement";
import { focusFirstAnswerChunk } from "./answerBubbleNavigation";
import { registerReplyStop } from "./replyStopRegistry";

vi.mock("./answerBubbleNavigation", () => ({
  focusFirstAnswerChunk: vi.fn(() => true),
}));

const mockedFocusFirstAnswerChunk = vi.mocked(focusFirstAnswerChunk);

function headerProps(expanded: boolean, over: Record<string, unknown> = {}) {
  const el = buildTurnHeaderElement({
    turnId: "turn-1",
    title: "a question",
    expanded,
    onActivate: () => {},
    ...over,
  });
  return el.props as Record<string, unknown>;
}

describe("turn header D-pad Down", () => {
  beforeEach(() => {
    mockedFocusFirstAnswerChunk.mockClear();
    mockedFocusFirstAnswerChunk.mockReturnValue(true);
  });

  it("enters the answer through onMoveDown when the turn is expanded", () => {
    const onMoveDown = headerProps(true).onMoveDown as () => boolean;

    expect(onMoveDown()).toBe(true);
    expect(mockedFocusFirstAnswerChunk).toHaveBeenCalledWith("turn-1");
  });

  it("yields to Steam's own move when the turn is collapsed", () => {
    const onMoveDown = headerProps(false).onMoveDown as () => boolean;

    expect(onMoveDown()).toBe(false);
    expect(mockedFocusFirstAnswerChunk).not.toHaveBeenCalled();
  });

  /* A GamepadEvent direction must be a no-op on onButtonDown, or a press that reaches both
     handlers would enter the answer and then step once more inside it. */
  it("does not double-step: a GamepadEvent direction on onButtonDown is a no-op", () => {
    const onButtonDown = headerProps(true).onButtonDown as (b: unknown) => boolean;

    expect(onButtonDown({ type: "gamepadbuttondown", detail: { button: 10 } })).toBe(false);
    expect(mockedFocusFirstAnswerChunk).not.toHaveBeenCalled();
  });

  it("still enters on a string-shaped press, which desktop keyboards deliver", () => {
    const onButtonDown = headerProps(true).onButtonDown as (b: unknown) => boolean;

    expect(onButtonDown("ArrowDown")).toBe(true);
    expect(mockedFocusFirstAnswerChunk).toHaveBeenCalledWith("turn-1");
  });
});

/*
 * Roadmap: "Up skips the answer sections and the chat slot row" (archived-header half). Only the
 * caller (MainTabChatTranscript.tsx) knows which header is first, so `onMoveUp` is opt-in — most
 * headers get none, and this pins that the plumbing carries whichever one is supplied.
 */
describe("turn header D-pad Up (opt-in)", () => {
  it("carries no onMoveUp prop when the caller supplies none", () => {
    expect(headerProps(true).onMoveUp).toBeUndefined();
  });

  it("calls the supplied onMoveUp on a real D-pad move", () => {
    const onMoveUpImpl = vi.fn(() => true);
    const onMoveUp = headerProps(true, { onMoveUp: onMoveUpImpl }).onMoveUp as () => boolean;

    expect(onMoveUp()).toBe(true);
    expect(onMoveUpImpl).toHaveBeenCalledTimes(1);
  });

  it("still calls it on a string-shaped Up press, which desktop keyboards deliver", () => {
    const onMoveUpImpl = vi.fn(() => true);
    const onButtonDown = headerProps(true, { onMoveUp: onMoveUpImpl }).onButtonDown as (
      b: unknown
    ) => boolean;

    expect(onButtonDown("ArrowUp")).toBe(true);
    expect(onMoveUpImpl).toHaveBeenCalledTimes(1);
  });

  it("does not double-step: a GamepadEvent direction on onButtonDown is a no-op even with onMoveUp set", () => {
    const onMoveUpImpl = vi.fn(() => true);
    const onButtonDown = headerProps(true, { onMoveUp: onMoveUpImpl }).onButtonDown as (
      b: unknown
    ) => boolean;

    expect(onButtonDown({ type: "gamepadbuttondown", detail: { button: 9 } })).toBe(false);
    expect(onMoveUpImpl).not.toHaveBeenCalled();
  });
});

/*
 * Retry sits on the newest question's bubble as a faded circular arrow (D77), not in a button row
 * under the answer. A turn with no Retry to offer must be exactly what it was before: one
 * Focusable, one D-pad stop, activation on the bubble itself.
 */
describe("Retry on the question bubble", () => {
  const build = (over: Record<string, unknown> = {}) =>
    buildTurnHeaderElement({
      turnId: "turn-1",
      title: "a question",
      expanded: true,
      onActivate: () => {},
      ...over,
    });

  const childrenOf = (el: React.ReactElement) =>
    React.Children.toArray((el.props as { children?: React.ReactNode }).children).filter(
      Boolean
    ) as React.ReactElement[];

  it("is one stop, with activation on the bubble, when there is no Retry", () => {
    const el = build();
    const props = el.props as Record<string, unknown>;
    expect(props.onActivate).toBeTypeOf("function");
    expect(String(props.className)).not.toContain("--with-retry");
    const kids = childrenOf(el);
    expect(kids).toHaveLength(1);
    expect(String((kids[0]!.props as Record<string, unknown>).className)).toContain(
      "bonsai-chat-turn-row-title"
    );
  });

  it("becomes a row of the icon then the question when Retry is offered", () => {
    const el = build({ onRetry: () => {} });
    const props = el.props as Record<string, unknown>;
    expect(String(props.className)).toContain("--with-retry");
    /* Activation moved onto the text child, so pressing the icon cannot also open the question. */
    expect(props.onActivate).toBeUndefined();

    const kids = childrenOf(el);
    expect(kids).toHaveLength(2);
    expect(String((kids[0]!.props as Record<string, unknown>).className)).toContain(
      "bonsai-turn-retry-corner-slot"
    );
    const body = kids[1]!.props as Record<string, unknown>;
    expect(String(body.className)).toContain("bonsai-chat-turn-row-body");
    expect(body.onActivate).toBeTypeOf("function");
    expect(body.onMoveLeft).toBeTypeOf("function");
  });

  it("keeps Down into the answer on the outer row, not on either child", () => {
    const el = build({ onRetry: () => {} });
    expect((el.props as Record<string, unknown>).onMoveDown).toBeTypeOf("function");
    for (const kid of childrenOf(el)) {
      expect((kid.props as Record<string, unknown>).onMoveDown).toBeUndefined();
    }
  });

  it("presses Retry once", () => {
    const onRetry = vi.fn();
    const slot = childrenOf(build({ onRetry }))[0]!;
    const button = childrenOf(slot)[0]!;
    ((button.props as Record<string, unknown>).onClick as () => void)();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("greys the icon out and refuses Left while an answer is on its way", () => {
    const el = build({ onRetry: () => {}, retryDisabled: true });
    const kids = childrenOf(el);
    const button = childrenOf(kids[0]!)[0]!;
    expect((button.props as Record<string, unknown>).disabled).toBe(true);
    const onMoveLeft = (kids[1]!.props as Record<string, unknown>).onMoveLeft as () => boolean;
    expect(onMoveLeft()).toBe(false);
  });
});

/*
 * Roadmap: "A short question fades out at its right edge as if there were more to read". The
 * fade lives in CSS keyed off a modifier class, since CSS alone cannot detect overflow — the
 * caller (MainTabChatTranscript.tsx) measures and hands back a ref + a boolean. This only pins
 * the plumbing: the title span carries whatever ref it is given, and the class only when told to.
 */
describe("title overflow ref and class plumbing", () => {
  const titleSpanOf = (el: React.ReactElement) => {
    const props = el.props as { children?: React.ReactNode };
    return props.children as React.ReactElement;
  };

  it("attaches the caller's titleRef to the title span", () => {
    const titleRef = vi.fn();
    const el = buildTurnHeaderElement({
      turnId: "turn-1",
      title: "a question",
      expanded: true,
      onActivate: () => {},
      titleRef,
    });
    expect((titleSpanOf(el) as unknown as { ref: unknown }).ref).toBe(titleRef);
  });

  it("adds the overflowing modifier class only when titleOverflowing is true", () => {
    const overflowing = buildTurnHeaderElement({
      turnId: "turn-1",
      title: "a question",
      expanded: true,
      onActivate: () => {},
      titleOverflowing: true,
    });
    expect(String((titleSpanOf(overflowing).props as Record<string, unknown>).className)).toContain(
      "bonsai-chat-turn-row-title--overflowing"
    );

    const short = buildTurnHeaderElement({
      turnId: "turn-1",
      title: "a question",
      expanded: true,
      onActivate: () => {},
      titleOverflowing: false,
    });
    expect(String((titleSpanOf(short).props as Record<string, unknown>).className)).not.toContain(
      "bonsai-chat-turn-row-title--overflowing"
    );
  });
});

/*
 * Plan 57: on a turn where the model thought before it answered, a Show reasoning line sits
 * between the question and the answer, so Down from the question has to stop there first. Every
 * ordinary turn has no such line, and Down there must be exactly what it always was.
 */
describe("turn header D-pad Down with a Show reasoning line below it", () => {
  beforeEach(() => {
    registerReplyStop("show-reasoning", null);
    mockedFocusFirstAnswerChunk.mockClear();
    mockedFocusFirstAnswerChunk.mockReturnValue(true);
  });

  it("stops on the line when one is mounted, instead of entering the answer", () => {
    const row = document.createElement("div");
    row.className = "bonsai-chat-reasoning-fold";
    row.tabIndex = -1;
    document.body.appendChild(row);
    registerReplyStop("show-reasoning", row);

    const onMoveDown = headerProps(true).onMoveDown as () => boolean;

    expect(onMoveDown()).toBe(true);
    expect(document.activeElement).toBe(row);
    expect(mockedFocusFirstAnswerChunk).not.toHaveBeenCalled();

    registerReplyStop("show-reasoning", null);
    row.remove();
  });

  it("enters the answer as before when no line is mounted", () => {
    const onMoveDown = headerProps(true).onMoveDown as () => boolean;

    expect(onMoveDown()).toBe(true);
    expect(mockedFocusFirstAnswerChunk).toHaveBeenCalledWith("turn-1");
  });
});
