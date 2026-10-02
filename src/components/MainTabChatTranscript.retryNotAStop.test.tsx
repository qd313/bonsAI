/**
 * Title: Up and Down never land on the question's Retry button; only Left from the question does
 * Purpose: Pin roadmap Bug "Down from the N earlier pill stops on the question's Retry button before
 *          the question itself". Measured on the Deck (docs/test-evidence/plan79-P79-M8-EARLIER-RETRY.json):
 *          Down from the pill landed on Retry first and then on the question, and Up from the question
 *          landed on Retry on the way back. The maintainer's rule: Retry is reached by Left from the
 *          question bubble, and by nothing else; Right comes back.
 * Used for: MainTabChatTranscript.tsx, buildTurnHeaderElement.tsx and chatTranscriptNavHelpers.ts
 *           together -- the real rendered transcript, not a hand-made copy of its graph.
 * Solves: The walk presses D-pad Down/Up from the pill through the newest turn and back. A press that
 *         a plugin handler claims runs that handler, as Steam does. A press no handler claims is
 *         Steam's own move, modelled the way the Deck measured it: it never steps sideways inside the
 *         question's row, except one hop: an Up nothing claims, from the question text, goes to Retry
 *         (the nearest stop in the row; plan79-P79-M8-EARLIER-RETRY-AFTER.json). Entering a row from
 *         above lands on its first control in page order (Retry, before the fix), from below on its last.
 * Does not: Model Steam's scroll-into-view. The fix moves no stop and changes no height, so the walk
 *           has no scroll to loop on; the answer-section walks that do are in
 *           answerBubbleNavigation.*.test.ts, with the scroll modelled.
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";

import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";
import type { TransparencySnapshot } from "../utils/inputTransparency";
import { resetUiDocument } from "../utils/uiDocument";
import { registerNavFocus, unregisterNavFocus } from "../utils/navFocusRegistry";

type Dir = "Up" | "Down" | "Left" | "Right";
type NavHandlers = Partial<Record<`onMove${Dir}`, () => unknown>>;
type NavEl = HTMLElement & { __nav?: NavHandlers };

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const Base = stubs.Focusable;
  /* Keeps the four move handlers on the element and gives `navRef` Steam's TakeFocus: the ring goes
     to the container's first live child. */
  const NavFocusable = React.forwardRef<HTMLDivElement, Record<string, unknown>>(
    function NavFocusable(props, ref) {
      const { onMoveUp, onMoveDown, onMoveLeft, onMoveRight, navRef, ...rest } = props as Record<string, unknown> &
        NavHandlers & { navRef?: { current: unknown } };
      const setRef = (el: HTMLDivElement | null) => {
        if (el) {
          (el as NavEl).__nav = { onMoveUp, onMoveDown, onMoveLeft, onMoveRight };
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

const ANSWER = ["First paragraph of the answer.", "Second paragraph of the answer."].join("\n\n");

function snapshot(): TransparencySnapshot {
  return {
    route: "ollama",
    raw_question: "q",
    sanitizer_action: "none",
    sanitizer_reason_codes: [],
    text_after_sanitizer: "q",
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

function turn(id: string, question: string, reasoning = false): AskThreadCollapsedTurn {
  return {
    id,
    question,
    answer: ANSWER,
    transparency: snapshot(),
    reasoning: reasoning ? { text: "They want a plan.", seconds: 18, tokens: 40 } : undefined,
  };
}

/** Three older turns, then the newest, open. Three earlier turns put the "N earlier" pill on screen. */
const TURNS = [
  turn("t1", "an old question number one"),
  turn("t2", "an old question number two"),
  turn("t3", "an old question number three"),
  turn("t4", "what is a good first upgrade in Hollow Knight", true),
];

function renderChat(extra: Partial<MainTabChatTranscriptProps> = {}, turns = TURNS, open = "t4") {
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
    askThreadCollapsed: turns,
    expandedTurnKey: open,
    askThreadDisplayQuestion: "",
    lastExchange: { question: "q", answer: ANSWER },
    transparencySnapshot: snapshot(),
    liveReplyFeedbackRating: "up",
    onReplyFeedback: () => {},
    onReplyMicroAction: () => {},
    onAskOllama: async () => {},
    onTurnActivate: () => {},
    ...extra,
  };
  const out = render(<MainTabChatTranscript {...props} />);
  /* Decky stamps tabindex="0" on the nodes Steam navigates. */
  out.container
    .querySelectorAll<HTMLElement>('[data-decky-ui="Focusable"]')
    .forEach((el) => el.setAttribute("tabindex", "0"));
  return out;
}

/** The controls the ring can sit on: the stops Steam walks, not the containers around them. */
const STOP_SELECTOR = [
  "button:not([disabled])",
  ".bonsai-chat-earlier-pill-row",
  ".bonsai-chat-turn-row-header:not(.bonsai-chat-turn-row-header--with-retry)",
  ".bonsai-chat-turn-row-body",
  ".bonsai-answer-stop",
  ".bonsai-chat-reasoning-fold",
].join(", ");

function stops(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(STOP_SELECTOR));
}

/** Retry is the question's corner button; its slot wraps the only one. */
function isRetry(el: Element | null): boolean {
  return Boolean(el?.matches?.('[aria-label="Retry same prompt"]'));
}

function nameOf(el: Element | null): string {
  if (!el) return "nothing";
  const h = el as HTMLElement;
  if (isRetry(h)) return "RETRY";
  if (h.classList.contains("bonsai-chat-earlier-pill-row")) return "pill";
  if (h.classList.contains("bonsai-chat-turn-row-body")) return `question:${h.textContent}`;
  if (h.classList.contains("bonsai-chat-turn-row-header")) return `header:${h.textContent}`;
  if (h.classList.contains("bonsai-chat-reasoning-fold")) return "reasoning-line";
  if (h.classList.contains("bonsai-answer-stop")) return `answer:${h.textContent?.slice(0, 12)}`;
  return h.getAttribute("aria-label") ?? h.textContent?.trim() ?? h.className;
}

/** The row Steam never steps sideways inside on a vertical press. */
function rowOf(el: Element | null): Element | null {
  return el?.closest?.(".bonsai-chat-turn-row-header--with-retry") ?? null;
}

/**
 * One press: the focused element's move handler first, then each containing Focusable's, until one
 * claims it. An unclaimed Up/Down is Steam's own move, modelled as above. An unclaimed Left/Right
 * does nothing (the only sideways hops that matter here are the plugin's own).
 */
function press(container: HTMLElement, dir: Dir): boolean {
  const key = `onMove${dir}` as const;
  let el = document.activeElement as NavEl | null;
  const start = document.activeElement;
  let claimed = false;
  act(() => {
    while (el) {
      const h = el.__nav?.[key];
      if (h && h() === true) {
        claimed = true;
        return;
      }
      el = el.parentElement as NavEl | null;
    }
  });
  if (claimed) return true;
  if (dir === "Left" || dir === "Right") return false;
  /* The Deck, twice (plan79-P79-M8-EARLIER-RETRY-AFTER.json): an Up from the question text that nothing
     claims is Steam's, and Steam picks Retry, the nearest stop in the row. */
  if (dir === "Up" && (start as HTMLElement | null)?.classList.contains("bonsai-chat-turn-row-body")) {
    const retry = rowOf(start)?.querySelector<HTMLElement>('[aria-label="Retry same prompt"]');
    if (retry) {
      act(() => retry.focus());
      return true;
    }
  }
  const all = stops(container);
  const here = all.indexOf(start as HTMLElement);
  /* Past the last stop the model knows, Steam leaves the transcript: the walk is over. */
  if (here < 0) return false;
  const from = rowOf(start);
  const rest = dir === "Down" ? all.slice(here + 1) : all.slice(0, here).reverse();
  const candidates = rest.filter((c) => !from || rowOf(c) !== from);
  if (!candidates.length) return false;
  /* Entering a row: from above its first control in page order, from below its last. */
  let target = candidates[0]!;
  const entered = rowOf(target);
  if (entered && dir === "Up") {
    const inRow = candidates.filter((c) => rowOf(c) === entered);
    target = inRow[inRow.length - 1]!;
  }
  act(() => target.focus());
  return true;
}

function focusOn(el: HTMLElement): void {
  act(() => el.focus());
  expect(document.activeElement).toBe(el);
}

/** Press `dir` until nothing moves (or the cap), returning every landing in order. */
function walk(container: HTMLElement, dir: "Up" | "Down", cap = 40): string[] {
  const seen: string[] = [nameOf(document.activeElement)];
  for (let i = 0; i < cap; i += 1) {
    const before = document.activeElement;
    if (!press(container, dir) || document.activeElement === before) break;
    seen.push(nameOf(document.activeElement));
  }
  return seen;
}

describe("Retry is reached by Left from the question and nothing else (plan 79)", () => {
  beforeEach(() => resetUiDocument());
  afterEach(() => cleanup());

  it("the page carries the pill, then the newest turn's Retry and question", () => {
    const { container } = renderChat();
    expect(container.querySelector(".bonsai-chat-earlier-pill")?.textContent).toBe("3 earlier");
    expect(container.querySelector('[aria-label="Retry same prompt"]')).not.toBeNull();
  });

  it("Down from the pill lands on the question, not on Retry", () => {
    const { container } = renderChat();
    focusOn(container.querySelector<HTMLElement>(".bonsai-chat-earlier-pill-row")!);
    expect(press(container, "Down")).toBe(true);
    expect(isRetry(document.activeElement)).toBe(false);
    expect(nameOf(document.activeElement)).toBe("question:what is a good first upgrade in Hollow Knight");
  });

  it("walks Down from the pill and back Up: Retry is never a landing and no stop is visited twice", () => {
    const { container } = renderChat();
    focusOn(container.querySelector<HTMLElement>(".bonsai-chat-earlier-pill-row")!);
    const down = walk(container, "Down");
    expect(down.length).toBeGreaterThan(4);
    expect(down).not.toContain("RETRY");
    expect(new Set(down).size).toBe(down.length);
    expect(down[1]).toBe("question:what is a good first upgrade in Hollow Knight");
    expect(down[2]).toBe("reasoning-line");

    const up = walk(container, "Up");
    expect(up).not.toContain("RETRY");
    expect(new Set(up).size).toBe(up.length);
    expect(up[up.length - 1]).toBe("pill");
    /* The same stops the Down walk visited, in reverse, back to the pill. */
    expect(up).toEqual([...down.slice(0, down.indexOf(up[0]!) + 1)].reverse());
  });

  it("Up from the question goes to the pill above it, not to Retry", () => {
    const { container } = renderChat();
    focusOn(container.querySelector<HTMLElement>(".bonsai-chat-turn-row-body")!);
    expect(press(container, "Up")).toBe(true);
    expect(nameOf(document.activeElement)).toBe("pill");
  });

  it("with no pill and no older turn, Up from the question goes to the chat slot row, not to Retry", () => {
    const slotRow = document.createElement("div");
    slotRow.setAttribute("tabindex", "0");
    document.body.appendChild(slotRow);
    const holder = { current: { TakeFocus: () => (slotRow.focus(), true) } };
    registerNavFocus("chat-slot-row", holder);
    const { container } = renderChat({}, [TURNS[3]!], "t4");
    focusOn(container.querySelector<HTMLElement>(".bonsai-chat-turn-row-body")!);
    expect(press(container, "Up")).toBe(true);
    expect(document.activeElement).toBe(slotRow);
    unregisterNavFocus("chat-slot-row", holder);
    slotRow.remove();
  });

  it("Up from the Show reasoning line stops on the question, and the next Up does not stop on Retry", () => {
    const { container } = renderChat();
    focusOn(container.querySelector<HTMLElement>(".bonsai-chat-reasoning-fold")!);
    expect(press(container, "Up")).toBe(true);
    expect(nameOf(document.activeElement)).toBe("question:what is a good first upgrade in Hollow Knight");
    expect(press(container, "Up")).toBe(true);
    expect(nameOf(document.activeElement)).toBe("pill");
  });

  it("with an older question closed just above, Down from it lands on the question, and back Up does not stop on Retry", () => {
    const { container } = renderChat({}, [TURNS[0]!, TURNS[3]!], "t4");
    expect(container.querySelector(".bonsai-chat-earlier-pill")).toBeNull();
    const older = container.querySelector<HTMLElement>(".bonsai-chat-turn-row-header:not(.bonsai-chat-turn-row-header--with-retry)")!;
    focusOn(older);
    const down = walk(container, "Down");
    expect(down).not.toContain("RETRY");
    expect(down[1]).toBe("question:what is a good first upgrade in Hollow Knight");
    expect(new Set(down).size).toBe(down.length);
    const up = walk(container, "Up");
    expect(up).not.toContain("RETRY");
    expect(up[up.length - 1]).toBe(nameOf(older));
    /* Up from the question text goes straight to the closed question above it. */
    focusOn(container.querySelector<HTMLElement>(".bonsai-chat-turn-row-body")!);
    expect(press(container, "Up")).toBe(true);
    expect(document.activeElement).toBe(older);
  });

  it("Left from the question lands on Retry and Right comes back", () => {
    const { container } = renderChat();
    const body = container.querySelector<HTMLElement>(".bonsai-chat-turn-row-body")!;
    focusOn(body);
    expect(press(container, "Left")).toBe(true);
    expect(isRetry(document.activeElement)).toBe(true);
    expect(press(container, "Right")).toBe(true);
    expect(document.activeElement).toBe(body);
  });
});
