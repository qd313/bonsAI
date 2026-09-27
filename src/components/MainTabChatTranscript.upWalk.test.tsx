/**
 * Title: Walking Up under a finished answer visits every row Down visits
 * Purpose: Pin plan 72's "Up under an answer skips whole rows of controls". Measured on the Deck
 *          before the fix (docs/test-evidence/plan72-A4-UP-FAMILY-a.json and -d.json): going Up,
 *          Show details jumped straight to Read aloud past the "What went wrong?" chips, Read aloud
 *          jumped into the answer past the choice buttons, and Show reasoning jumped to Retry past
 *          the question's own text. Going Down visited all of them.
 * Used for: MainTabChatTranscript.tsx's newest archived turn, buildReplyActionsElement.tsx,
 *           buildTurnHeaderElement.tsx and liveTurnFocusGraph.ts together — the real graph, not a
 *           hand-made copy of it.
 * Solves: The stock harness drops every Steam move prop before it reaches the page, so nothing
 *         could press Up on a real rendered turn. This file's own Focusable keeps them, and fills
 *         `navRef` the way Steam does, so a press runs the handlers Steam would run.
 * Does not: Model Steam's own geometry. A press no handler claims reports "not handled" here; the
 *           two hops Steam makes on its own (choice B to choice A inside the picker, and Retry to
 *           the row above the question) are asserted as exactly that, because both are measured on
 *           the Deck. Decky's Button does not forward move props on the device, so neither does
 *           this file's — a handler put on a button counts for nothing here, as there.
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";

import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import type { AskThreadCollapsedTurn, StrategyGuideBranchesPayload } from "../types/bonsaiUi";
import type { TransparencySnapshot } from "../utils/inputTransparency";
import { resetUiDocument } from "../utils/uiDocument";

type NavHandlers = Partial<Record<"onMoveUp" | "onMoveDown", () => unknown>>;
type NavEl = HTMLElement & { __nav?: NavHandlers };

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const Base = stubs.Focusable;
  /*
   * Keeps onMoveUp/onMoveDown on the element, and hands `navRef` a TakeFocus that does what
   * Steam's does: puts the ring on the container's first live child.
   */
  const NavFocusable = React.forwardRef<HTMLDivElement, Record<string, unknown>>(
    function NavFocusable(props, ref) {
      const { onMoveUp, onMoveDown, navRef, ...rest } = props as Record<string, unknown> & NavHandlers & {
        navRef?: { current: unknown };
      };
      const setRef = (el: HTMLDivElement | null) => {
        if (el) {
          (el as NavEl).__nav = { onMoveUp, onMoveDown };
          if (navRef) {
            navRef.current = {
              TakeFocus: () => {
                const first = el.querySelector<HTMLElement>("button:not([disabled]), [tabindex]");
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
    },
  );
  return { ...stubs, Focusable: NavFocusable };
});

const QUESTION = "what is a good way to practice parrying in action games";
const ANSWER = [
  "Start with a game that has a generous parry window.",
  "Practise against one enemy type until the timing is automatic.",
  "Then move to bosses and watch their wind-up, not their weapon.",
].join("\n\n");

const BRANCHES: StrategyGuideBranchesPayload = {
  question: "Which kind of game are you playing?",
  options: [
    { id: "fast", label: "A fast-paced shooter or action game" },
    { id: "slow", label: "A strategy or RPG game with lots of loading screens" },
  ],
};

function snapshot(): TransparencySnapshot {
  return {
    route: "ollama",
    raw_question: QUESTION,
    sanitizer_action: "none",
    sanitizer_reason_codes: [],
    text_after_sanitizer: QUESTION,
    ollama_model: "llama3:8b",
    system_prompt: null,
    user_text_for_model: null,
    user_image_count: 0,
    attachment_paths: [],
    assistant_raw: null,
    assistant_after_attachment_format: null,
    final_response: ANSWER,
    applied: null,
    success: true,
    app_id: "",
    app_name: "",
    pc_ip: "",
    error_message: "",
    elapsed_seconds: 1.2,
    context_chips: [],
    ask_diagnostics: null,
  } as TransparencySnapshot;
}

const TURN: AskThreadCollapsedTurn = {
  id: "turn-newest",
  question: QUESTION,
  answer: ANSWER,
  transparency: snapshot(),
  reasoning: { text: "They want timing practice.", seconds: 21, tokens: 40 },
};

/** The state the Deck was in for plan72-A4-UP-FAMILY-d: choices, Not really pressed, chips open. */
function renderTurn(overrides: Partial<MainTabChatTranscriptProps> = {}) {
  const props: MainTabChatTranscriptProps = {
    fullBleedRowStyle: {},
    isAsking: false,
    selectedAttachment: null,
    ollamaContext: {} as MainTabChatTranscriptProps["ollamaContext"],
    unifiedInput: "",
    showSlowWarning: false,
    latencyWarningSeconds: 30,
    ollamaResponse: "",
    elapsedSeconds: null,
    lastApplied: null,
    canSaveDesktopNote: false,
    onOpenDesktopNoteSave: () => {},
    askMode: "strategy",
    askThreadCollapsed: [TURN],
    expandedTurnKey: TURN.id,
    askThreadDisplayQuestion: "",
    lastExchange: { question: QUESTION, answer: ANSWER },
    transparencySnapshot: snapshot(),
    liveReplyFeedbackRating: "down",
    onReplyFeedback: () => {},
    onReplyMicroAction: () => {},
    strategyGuideBranches: BRANCHES,
    onStrategyBranchPick: () => {},
    onAskOllama: async () => {},
    ...overrides,
  };
  const out = render(<MainTabChatTranscript {...props} />);
  /* Decky stamps tabindex="0" on the nodes Steam navigates, which is what lets a row take focus. */
  out.container
    .querySelectorAll<HTMLElement>('[data-decky-ui="Focusable"]')
    .forEach((el) => el.setAttribute("tabindex", "0"));
  return out;
}

/**
 * One press, the way Steam runs it: the focused element's own move handler first, then each
 * containing Focusable's, until one claims the press. Returns whether anything claimed it.
 */
function press(dir: "onMoveUp" | "onMoveDown"): boolean {
  let el = document.activeElement as NavEl | null;
  let handled = false;
  act(() => {
    while (el) {
      const h = el.__nav?.[dir];
      if (h && h() === true) {
        handled = true;
        return;
      }
      el = el.parentElement as NavEl | null;
    }
  });
  return handled;
}

function byLabel(container: HTMLElement, label: string): HTMLElement {
  const el = container.querySelector<HTMLElement>(`[aria-label="${label}"]`);
  if (!el) throw new Error(`no element labelled ${label}`);
  return el;
}

function answerStops(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(".bonsai-answer-stop"));
}

function focusOn(el: HTMLElement): void {
  act(() => el.focus());
  expect(document.activeElement).toBe(el);
}

describe("Up under a finished answer visits the rows Down visits (plan 72 A-4)", () => {
  beforeEach(() => resetUiDocument());
  afterEach(() => cleanup());

  it("Show reasoning goes Up onto the question's own text, and the text goes Up onto Retry", () => {
    const { container } = renderTurn();
    const fold = container.querySelector<HTMLElement>(".bonsai-chat-reasoning-fold");
    expect(fold).not.toBeNull();
    focusOn(fold!);
    expect(press("onMoveUp")).toBe(true);
    const body = container.querySelector<HTMLElement>(".bonsai-chat-turn-row-body");
    expect(body).not.toBeNull();
    expect(document.activeElement).toBe(body);

    expect(press("onMoveUp")).toBe(true);
    expect(document.activeElement).toBe(byLabel(container, "Retry same prompt"));

    /* Down is unchanged: from the text it still goes to the Show reasoning line. */
    focusOn(body!);
    expect(press("onMoveDown")).toBe(true);
    expect(document.activeElement).toBe(fold);
  });

  it("Read aloud goes Up onto the last choice button, not into the answer", () => {
    const { container } = renderTurn();
    focusOn(byLabel(container, "Read aloud"));
    expect(press("onMoveUp")).toBe(true);
    expect(document.activeElement?.textContent).toBe(`B. ${BRANCHES.options[1]!.label}`);
  });

  it("Up from the last choice is Steam's own step to the first; the first goes Up into the answer's last section", () => {
    const { container } = renderTurn();
    const buttons = Array.from(container.querySelectorAll<HTMLElement>(".bonsai-strategy-branch-btn"));
    expect(buttons).toHaveLength(2);
    focusOn(buttons[1]!);
    expect(press("onMoveUp")).toBe(false);

    focusOn(buttons[0]!);
    expect(press("onMoveUp")).toBe(true);
    const stops = answerStops(container);
    expect(stops.length).toBeGreaterThan(0);
    expect(document.activeElement).toBe(stops[stops.length - 1]);
  });

  it("with no choices, Read aloud still goes Up into the answer's last section", () => {
    const { container } = renderTurn({ strategyGuideBranches: null });
    focusOn(byLabel(container, "Read aloud"));
    expect(press("onMoveUp")).toBe(true);
    const stops = answerStops(container);
    expect(document.activeElement).toBe(stops[stops.length - 1]);
  });
});
