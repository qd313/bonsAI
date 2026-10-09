/**
 * Title: Down from the tab bar on Main lands on the first question's text, never on its Retry button
 * Purpose: Pin the roadmap Bug "Down from N earlier stops on the question's Retry button" on the route
 *          plan 84 step 5 left: the saved-chats row that used to sit at the top of the Main tab is gone,
 *          so Down from the tab bar enters the chat itself (index.tsx's `tabBarExitDown`, through the
 *          Main tab's own action in the chat title store). A chat with one question (or a few) has no
 *          pill, and a Down left to Steam would enter the first turn's row on its first control --
 *          Retry. The Deck check: Down from the tab bar lands on the question text; Left reaches Retry
 *          and Right comes back.
 * Used for: MainTab.tsx (publishes the action), takeFirstChatStop.ts and buildTurnHeaderElement.tsx
 *           (`takeOpenQuestionText`) together -- the real Main tab, not a hand-made copy of its graph.
 * Solves: Presses D-pad Down/Up/Left/Right on the real rendered page. A press a plugin handler claims
 *         runs that handler, as Steam does. A press nobody claims is Steam's own move, modelled the
 *         way the Deck measured it: entering a row from above lands on its first control in page order
 *         (Retry, before the fix). Steam's scroll-into-view moves no stop here, so no scroll is
 *         needed to keep the walk honest (the answer walks that need it are in the answer-section
 *         tests, with deckAnswerWalk.ts).
 * Does not: Walk the preset chips, or draw the tab bar: its Down is exactly `takeChatFirstStop`.
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";

import { MainTab } from "./MainTab";
import type { MainTabProps } from "./MainTab";
import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";
import type { TransparencySnapshot } from "../utils/inputTransparency";
import { resetUiDocument } from "../utils/uiDocument";
import { resetChatTitleStore, takeChatFirstStop } from "../features/chat-title/chatTitleStore";
import { registerNavFocus } from "../utils/navFocusRegistry";

type Dir = "Up" | "Down" | "Left" | "Right";
type NavHandlers = Partial<Record<`onMove${Dir}`, () => unknown>>;
type NavEl = HTMLElement & { __nav?: NavHandlers };

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const Base = stubs.Focusable;
  /* Keeps the four move handlers on the element and gives `navRef` Steam's TakeFocus: the ring goes
     to the container's first live child (or the container itself when it is a stop). */
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
const QUESTION = "what is a good first upgrade in Hollow Knight";

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

function turn(id: string, question: string): AskThreadCollapsedTurn {
  return { id, question, answer: ANSWER, transparency: snapshot() };
}

function renderMainTab(turns: AskThreadCollapsedTurn[], open: string) {
  const props = {
    fullBleedRowStyle: {},
    isAsking: false,
    selectedAttachment: null,
    ollamaContext: {},
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
    onRetryLastResponse: () => {},
    chatSlotSummaries: [{ id: "s1", label: "Hollow Knight", created_at: 0, updated_at: 0 }],
    activeChatSlotId: "s1",
    onChatSlotCreate: async () => undefined,
    onChatSlotSelect: async () => undefined,
    onChatSlotRename: async () => true,
    onChatSlotDelete: async () => true,
    suggestedPrompts: [],
    filteredSettings: [],
    recentScreenshots: [],
  } as unknown as MainTabProps;
  const out = render(<MainTab {...props} />);
  /* Decky stamps tabindex="0" on the nodes Steam navigates. */
  out.container
    .querySelectorAll<HTMLElement>('[data-decky-ui="Focusable"]')
    .forEach((el) => el.setAttribute("tabindex", "0"));
  return out;
}

/** The controls the ring can sit on: the stops Steam walks, not the containers around them. */
const STOP_SELECTOR = [
  "button:not([disabled])",
  ".bonsai-chat-slot-row-focus",
  ".bonsai-chat-earlier-pill-row",
  ".bonsai-chat-turn-row-header:not(.bonsai-chat-turn-row-header--with-retry)",
  ".bonsai-chat-turn-row-body",
  ".bonsai-answer-stop",
  ".bonsai-chat-reasoning-fold",
].join(", ");

function isRetry(el: Element | null): boolean {
  return Boolean(el?.matches?.('[aria-label="Retry same prompt"]'));
}

function nameOf(el: Element | null): string {
  if (!el) return "nothing";
  const h = el as HTMLElement;
  if (isRetry(h)) return "RETRY";
  if (h.classList.contains("bonsai-chat-slot-row-focus")) return "chat-row";
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
 * claims it. An unclaimed Up/Down is Steam's own move, modelled as above (a row is entered on its
 * first control from above, its last from below). An unclaimed Left/Right does nothing.
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
  const all = Array.from(container.querySelectorAll<HTMLElement>(STOP_SELECTOR));
  const here = all.indexOf(start as HTMLElement);
  if (here < 0) return false;
  const from = rowOf(start);
  const rest = dir === "Down" ? all.slice(here + 1) : all.slice(0, here).reverse();
  const candidates = rest.filter((c) => !from || rowOf(c) !== from);
  if (!candidates.length) return false;
  let target = candidates[0]!;
  const entered = rowOf(target);
  if (entered && dir === "Up") {
    const inRow = candidates.filter((c) => rowOf(c) === entered);
    target = inRow[inRow.length - 1]!;
  }
  act(() => target.focus());
  return true;
}

/** Down from the tab bar on Main: exactly what index.tsx's `tabBarExitDown` calls there. */
function tabBarDown(): boolean {
  let claimed = false;
  act(() => {
    claimed = takeChatFirstStop();
  });
  return claimed;
}

/** Up to `cap` presses of `dir`, returning every landing in order (stops when nothing moves). */
function walk(container: HTMLElement, dir: "Up" | "Down", cap: number): string[] {
  const seen: string[] = [nameOf(document.activeElement)];
  for (let i = 0; i < cap; i += 1) {
    const before = document.activeElement;
    if (!press(container, dir) || document.activeElement === before) break;
    seen.push(nameOf(document.activeElement));
  }
  return seen;
}

describe("Down from the tab bar lands on the first question, not on Retry (plan 79, plan 84 step 5)", () => {
  beforeEach(() => {
    resetUiDocument();
    resetChatTitleStore();
  });
  afterEach(() => cleanup());

  it("a one-question chat has no earlier pill, but the question and its Retry are on the page", () => {
    const { container } = renderMainTab([turn("t1", QUESTION)], "t1");
    expect(container.querySelector(".bonsai-chat-earlier-pill")).toBeNull();
    expect(container.querySelector('[aria-label="Retry same prompt"]')).not.toBeNull();
  });

  it("Down from the tab bar lands on the question text", () => {
    renderMainTab([turn("t1", QUESTION)], "t1");
    expect(tabBarDown()).toBe(true);
    expect(isRetry(document.activeElement)).toBe(false);
    expect(nameOf(document.activeElement)).toBe(`question:${QUESTION}`);
  });

  it("walks Down from the tab bar: Retry is never a landing and no stop is visited twice", () => {
    const { container } = renderMainTab([turn("t1", QUESTION)], "t1");
    expect(tabBarDown()).toBe(true);
    const down = ["tab-bar", ...walk(container, "Down", 6)];
    expect(down.length).toBeGreaterThan(2);
    expect(down).not.toContain("RETRY");
    expect(new Set(down).size).toBe(down.length);
    expect(down[1]).toBe(`question:${QUESTION}`);
  });

  it("Left from the question reaches Retry and Right comes back", () => {
    const { container } = renderMainTab([turn("t1", QUESTION)], "t1");
    tabBarDown();
    const body = document.activeElement as HTMLElement;
    expect(press(container, "Left")).toBe(true);
    expect(isRetry(document.activeElement)).toBe(true);
    expect(press(container, "Right")).toBe(true);
    expect(document.activeElement).toBe(body);
  });

  it("with an older closed question above the newest, Down lands on the open question's text, one row lower", () => {
    /* The closed older row has no stop of its own to take by name (only the newest question carries one);
       a Down left to Steam would land on Steam's hidden tab buttons, so the open question is the landing. */
    const { container } = renderMainTab([turn("t1", "an old question"), turn("t2", QUESTION)], "t2");
    expect(tabBarDown()).toBe(true);
    expect(nameOf(document.activeElement)).toBe(`question:${QUESTION}`);
    expect(press(container, "Up")).toBe(true);
    expect(nameOf(document.activeElement)).toBe("header:an old question");
  });

  it("an empty chat: Down from the tab bar goes to the question box", () => {
    renderMainTab([], "live");
    /* The box's own nav node: the test's TextField stub drops navRef, so a stand-in takes its place. */
    const box = document.createElement("textarea");
    document.body.appendChild(box);
    registerNavFocus("unified-input", { current: { TakeFocus: () => (box.focus(), true) } });
    expect(tabBarDown()).toBe(true);
    expect(document.activeElement).toBe(box);
    box.remove();
  });
});
