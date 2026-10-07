/**
 * Title: The open reasoning block is a stop on the real transcript's path
 * Purpose: Pin the transcript's own wiring of plan 82's fix: with Show reasoning open, Down from the line
 *          lands on the block (it used to go straight into the answer), Down from the block goes on into
 *          the answer, and B on the block closes it with the ring back on the line. Closed, the line's
 *          Down still goes into the answer.
 * Used for: MainTabChatTranscript.tsx's renderReasoningFold, through buildReasoningFoldElement.tsx.
 * Solves: The walk test (buildReasoningFoldElement.walk.test.tsx) checks the scrolling in the Deck's
 *         numbers on the builder alone; this checks the transcript hands it the turn's own answer.
 * Does not: Measure anything on screen: jsdom has no layout, so there is no pane to scroll and every
 *           press on the block leaves it at once. The Deck check is in the lane report.
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";

import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import { resetUiDocument } from "../utils/uiDocument";

type NavHandlers = Partial<Record<"onMoveUp" | "onMoveDown" | "onCancelButton", (e?: unknown) => unknown>>;
type NavEl = HTMLElement & { __nav?: NavHandlers };

/* Keeps the move and B handlers on the element, and fills navRef the way Steam's TakeFocus lands. */
vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const Base = stubs.Focusable;
  const NavFocusable = React.forwardRef<HTMLDivElement, Record<string, unknown>>(function NavFocusable(props, ref) {
    const { onMoveUp, onMoveDown, onCancelButton, navRef, ...rest } = props as Record<string, unknown> &
      NavHandlers & { navRef?: { current: unknown } };
    const setRef = (el: HTMLDivElement | null) => {
      if (el) {
        if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");
        (el as NavEl).__nav = { onMoveUp, onMoveDown, onCancelButton };
        if (navRef) {
          navRef.current = {
            TakeFocus: () => {
              const first = el.querySelector<HTMLElement>("[tabindex]");
              (first ?? el).focus();
              return true;
            },
          };
        }
      }
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
    };
    return <Base {...rest} ref={setRef} />;
  });
  return { ...stubs, Focusable: NavFocusable };
});

function props(): MainTabChatTranscriptProps {
  return {
    fullBleedRowStyle: {},
    isAsking: false,
    selectedAttachment: null,
    ollamaContext: {} as MainTabChatTranscriptProps["ollamaContext"],
    unifiedInput: "",
    showSlowWarning: false,
    latencyWarningSeconds: 30,
    ollamaResponse: "Flank it and shoot the back.",
    elapsedSeconds: null,
    lastApplied: null,
    canSaveDesktopNote: false,
    onOpenDesktopNoteSave: () => {},
    askMode: "speed",
    askThreadCollapsed: [],
    expandedTurnKey: "live",
    askThreadDisplayQuestion: "how do i kill the big armoured bug boss",
    lastExchange: {
      question: "how do i kill the big armoured bug boss",
      answer: "Flank it and shoot the back.",
      reasoning: { text: "The armour is on the front.\nSo flank it.", seconds: 41, tokens: 380 },
    },
  };
}

const line = (c: HTMLElement) => c.querySelector<NavEl>(".bonsai-chat-reasoning-fold")!;
const block = (c: HTMLElement) => c.querySelector<NavEl>(".bonsai-chat-reasoning-block");
const press = (el: NavEl, handler: keyof NavHandlers, e?: unknown) => {
  let out: unknown;
  act(() => {
    out = el.__nav?.[handler]?.(e);
  });
  return out;
};

describe("the open reasoning block on the transcript's D-pad path (plan 82)", () => {
  beforeEach(() => resetUiDocument());
  afterEach(() => cleanup());

  it("Down from the open line lands on the block, and Down from the block goes into the answer", () => {
    const { container } = render(<MainTabChatTranscript {...props()} />);
    fireEvent.click(line(container));
    expect(block(container)).not.toBeNull();

    act(() => line(container).focus());
    expect(press(line(container), "onMoveDown")).toBe(true);
    expect(document.activeElement).toBe(block(container));

    expect(press(block(container)!, "onMoveDown")).toBe(true);
    expect(document.activeElement?.classList.contains("bonsai-answer-stop")).toBe(true);
  });

  it("Up from the block's top goes back to the line", () => {
    const { container } = render(<MainTabChatTranscript {...props()} />);
    fireEvent.click(line(container));
    act(() => block(container)!.focus());
    expect(press(block(container)!, "onMoveUp")).toBe(true);
    expect(document.activeElement).toBe(line(container));
  });

  it("B on the block closes it and leaves the ring on the line", () => {
    const { container } = render(<MainTabChatTranscript {...props()} />);
    fireEvent.click(line(container));
    act(() => block(container)!.focus());
    let prevented = false;
    press(block(container)!, "onCancelButton", { preventDefault: () => (prevented = true) });
    expect(prevented).toBe(true);
    expect(block(container)).toBeNull();
    expect(document.activeElement).toBe(line(container));
    expect(line(container).getAttribute("aria-label")).toBe("Show reasoning · 41 s");
  });

  it("with the block closed, Down from the line still goes into the answer", () => {
    const { container } = render(<MainTabChatTranscript {...props()} />);
    act(() => line(container).focus());
    expect(press(line(container), "onMoveDown")).toBe(true);
    expect(document.activeElement?.classList.contains("bonsai-answer-stop")).toBe(true);
  });
});
