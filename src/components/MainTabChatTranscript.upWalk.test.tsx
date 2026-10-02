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
import { registerNavFocus, unregisterNavFocus } from "../utils/navFocusRegistry";

type NavHandlers = Partial<Record<"onMoveUp" | "onMoveDown", () => unknown>>;
type NavEl = HTMLElement & { __nav?: NavHandlers };

/* Every container Steam's transfer was asked to take the ring into, in order (plan 74 lane 3). */
const transfers = vi.hoisted(() => ({ into: [] as HTMLElement[] }));

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
                transfers.into.push(el);
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
  /*
   * A greyed button still takes the ring on the Deck (measured 2026-09-16, replyStopRegistry.ts), unlike
   * a native disabled one, so it is marked aria-disabled here (plan 79: Up from the choices lands on it).
   */
  const BaseButton = stubs.Button as React.ComponentType<Record<string, unknown>>;
  const DeckButton = React.forwardRef<HTMLButtonElement, Record<string, unknown>>(function DeckButton(
    { disabled, ...rest },
    ref,
  ) {
    return <BaseButton {...rest} aria-disabled={disabled ? true : undefined} ref={ref} />;
  });
  return { ...stubs, Focusable: NavFocusable, Button: DeckButton };
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

function byText(container: HTMLElement, text: string): HTMLElement {
  const el = Array.from(container.querySelectorAll<HTMLElement>("button")).find(
    (b) => b.textContent?.trim() === text,
  );
  if (!el) throw new Error(`no button reading ${text}`);
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

  it("Show reasoning goes Up onto the question's own text, and the text does not go Up onto Retry", () => {
    const { container } = renderTurn();
    const fold = container.querySelector<HTMLElement>(".bonsai-chat-reasoning-fold");
    expect(fold).not.toBeNull();
    focusOn(fold!);
    expect(press("onMoveUp")).toBe(true);
    const body = container.querySelector<HTMLElement>(".bonsai-chat-turn-row-body");
    expect(body).not.toBeNull();
    expect(document.activeElement).toBe(body);

    /* Plan 79: Retry is reached by Left from the text only. Up claims the press and hands it to what is
       above the row (here the chat slot row, a different container); with nothing there to take it, the
       press is unclaimed and Steam would pick Retry, so it must be claimed with the row registered. */
    const slotRow = document.createElement("div");
    slotRow.setAttribute("tabindex", "0");
    document.body.appendChild(slotRow);
    const holder = { current: { TakeFocus: () => (slotRow.focus(), true) } };
    registerNavFocus("chat-slot-row", holder);
    focusOn(body!);
    expect(press("onMoveUp")).toBe(true);
    expect(document.activeElement).toBe(slotRow);
    unregisterNavFocus("chat-slot-row", holder);
    slotRow.remove();

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

  it("Show details goes Up onto the bottom row of reason chips, first chip", () => {
    const { container } = renderTurn();
    focusOn(byLabel(container, "Show details"));
    expect(press("onMoveUp")).toBe(true);
    expect(document.activeElement).toBe(byText(container, "Spoiled it"));
  });

  it("the bottom chip row goes Up onto the top row, the chip in the same place", () => {
    const { container } = renderTurn();
    focusOn(byText(container, "Spoiled it"));
    expect(press("onMoveUp")).toBe(true);
    expect(document.activeElement).toBe(byText(container, "Bad info"));

    focusOn(byText(container, "Too long"));
    expect(press("onMoveUp")).toBe(true);
    expect(document.activeElement).toBe(byText(container, "Wrong game or topic"));

    /* Three chips below, two above: the third lands on the nearer of the two. */
    focusOn(byText(container, "Too short"));
    expect(press("onMoveUp")).toBe(true);
    expect(document.activeElement).toBe(byText(container, "Wrong game or topic"));
  });

  /* Plan 79: the greyed thumbs are stops now -- Up lands on the thumb drawn above the chip, not the speaker. */
  it("the top chip row goes Up onto the thumb above each chip, greyed or not", () => {
    const { container } = renderTurn();
    focusOn(byText(container, "Wrong game or topic"));
    expect(press("onMoveUp")).toBe(true);
    expect(document.activeElement).toBe(byLabel(container, "Mark reply not helpful"));

    focusOn(byText(container, "Bad info"));
    expect(press("onMoveUp")).toBe(true);
    expect(document.activeElement).toBe(byLabel(container, "Mark reply helpful"));
  });

  it("with no reason chips, Show details still goes Up onto Read aloud", () => {
    const { container } = renderTurn({ liveReplyFeedbackRating: "up" });
    focusOn(byLabel(container, "Show details"));
    expect(press("onMoveUp")).toBe(true);
    expect(document.activeElement).toBe(byLabel(container, "Read aloud"));
  });

  /*
   * The whole Up leg in one go, from Show details into the answer: every stop the Down leg
   * visits, in reverse. Steam's own step between the two choices is done by hand, as Steam does it.
   */
  it("walks Up from Show details through every row into the answer", () => {
    const { container } = renderTurn();
    const seen: string[] = [];
    const name = () => {
      const el = document.activeElement as HTMLElement;
      if (el.classList.contains("bonsai-answer-stop")) return "answer's last section";
      if (el.classList.contains("bonsai-strategy-branch-btn")) return el.textContent!.slice(0, 2);
      return el.getAttribute("aria-label") ?? "";
    };
    focusOn(byLabel(container, "Show details"));
    for (let i = 0; i < 12; i++) {
      if (!press("onMoveUp")) {
        const buttons = Array.from(container.querySelectorAll<HTMLElement>(".bonsai-strategy-branch-btn"));
        if (document.activeElement !== buttons[1]) break;
        focusOn(buttons[0]!);
      }
      seen.push(name());
      if (document.activeElement?.classList.contains("bonsai-answer-stop")) break;
    }
    expect(seen).toEqual([
      "Spoiled it",
      "Bad info",
      "Mark reply helpful",
      "B.",
      "A.",
      "answer's last section",
    ]);
  });
});

/*
 * Plan 74 lane 3, bug 5 (roadmap: "A straight Down lands on Read aloud, not Helpful; Up from
 * Helpful lands on choice A, skipping B"; plan72-Z-FREEPLAY.json and plan 72 § 7, 18:10). Steam
 * hands the ring into a row on the button that row last held, and a plain focus() after it does not
 * reliably move it on. This harness cannot show that memory -- a plain focus always lands here -- so
 * these tests pin the hand-over itself: it goes through a nav node around the one button wanted,
 * which has nothing else to land on.
 */
describe("Helpful and the last choice are reached exactly (plan 74)", () => {
  beforeEach(() => {
    resetUiDocument();
    transfers.into = [];
  });
  afterEach(() => cleanup());

  /** The transfer went into a node holding exactly this one button. */
  const tookInto = (button: HTMLElement) =>
    transfers.into.some((el) => el.contains(button) && el.querySelectorAll("button").length === 1);

  it("a straight Down from the answer's last section lands on Helpful, through Helpful's own node", () => {
    const { container } = renderTurn({ liveReplyFeedbackRating: null, strategyGuideBranches: null });
    const stops = answerStops(container);
    focusOn(stops[stops.length - 1]!);
    expect(press("onMoveDown")).toBe(true);
    const helpful = byLabel(container, "Mark reply helpful");
    expect(document.activeElement).toBe(helpful);
    expect(tookInto(helpful)).toBe(true);
  });

  it("Up from Helpful lands on the last choice, B, through B's own node", () => {
    const { container } = renderTurn({ liveReplyFeedbackRating: null });
    focusOn(byLabel(container, "Mark reply helpful"));
    expect(press("onMoveUp")).toBe(true);
    const b = byText(container, `B. ${BRANCHES.options[1]!.label}`);
    expect(document.activeElement).toBe(b);
    expect(tookInto(b)).toBe(true);
  });

  it("Down from the last choice lands on Helpful, through Helpful's own node", () => {
    const { container } = renderTurn({ liveReplyFeedbackRating: null });
    focusOn(byText(container, `B. ${BRANCHES.options[1]!.label}`));
    expect(press("onMoveDown")).toBe(true);
    const helpful = byLabel(container, "Mark reply helpful");
    expect(document.activeElement).toBe(helpful);
    expect(tookInto(helpful)).toBe(true);
  });

  it("with Helpful greyed after a rating, Down from the last choice stays Steam's own step", () => {
    const { container } = renderTurn();
    focusOn(byText(container, `B. ${BRANCHES.options[1]!.label}`));
    expect(press("onMoveDown")).toBe(false);
  });
});
