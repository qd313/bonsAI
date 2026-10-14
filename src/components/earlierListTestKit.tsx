/**
 * Title: Stand-ins and helpers for tests that draw the real transcript with its "N earlier" list
 *
 * Purpose: What MainTabChatTranscript.earlierByDay.test.tsx and MainTabChatTranscript.searchJump.test.tsx share:
 * Steam's `Focusable` with each stop's move handlers kept on the element and `navRef` given a `TakeFocus` that
 * puts the ring on the container's first live child (and notes what it was given), a saved turn made from a few
 * words, the transcript rendered with the props it needs, the selectors for the lines and rows, and a D-pad
 * press that follows Steam's order (the focused element's handler, then each container's, then Steam's own step).
 *
 * Used for: the two test files above, and MainTabChatTranscript.olderTurnDownToNewer.test.tsx. `steamScroll` (Steam's
 * scroll-into-view in three rules) moved here from the first so the third walks the same model.
 *
 * Solves: One copy of the stand-ins and the press model, so a change to how the ring is modelled changes both.
 *
 * Does not: Run any test, or touch a real back end.
 */
import { expect } from "vitest";
import { act, render } from "@testing-library/react";

import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";
import type { TransparencySnapshot } from "../utils/inputTransparency";

export { taken, type Dir, type NavEl, type NavHandlers } from "./earlierListNavStub";
import type { Dir, NavEl } from "./earlierListNavStub";

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


export const NOW = new Date(2026, 9, 2, 12, 0, 0);
export const seconds = (month: number, day: number, hour = 9) => new Date(2026, month, day, hour).getTime() / 1000;

export function turn(id: string, question: string, createdAt?: number, reasoning = false): AskThreadCollapsedTurn {
  return {
    id,
    question,
    answer: ANSWER,
    transparency: snapshot(),
    createdAt,
    reasoning: reasoning ? { text: "They want a plan.", seconds: 18, tokens: 40 } : undefined,
  };
}

/** The transcript's props for a chat of `turns` with `open` as the open question. */
export function chatProps(extra: Partial<MainTabChatTranscriptProps>, turns: AskThreadCollapsedTurn[], open: string | null): MainTabChatTranscriptProps {
  return {
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
}

export function renderChat(extra: Partial<MainTabChatTranscriptProps>, turns: AskThreadCollapsedTurn[], open: string | null) {
  const out = render(<MainTabChatTranscript {...chatProps(extra, turns, open)} />);
  /* Decky stamps tabindex="0" on the nodes Steam navigates. */
  const stamp = () =>
    out.container
      .querySelectorAll<HTMLElement>('[data-decky-ui="Focusable"]')
      .forEach((el) => el.setAttribute("tabindex", "0"));
  stamp();
  return { ...out, stamp };
}

export const LINE = ".bonsai-chat-earlier-pill-row";
export const ROW = ".bonsai-chat-turn-row-header:not(.bonsai-chat-turn-row-header--with-retry)";

/** The controls the ring can sit on: the stops Steam walks, not the containers around them. */
const STOP_SELECTOR = [
  "button:not([disabled])",
  /* The "Back to where you were" line a jump from the Search tab draws over the chat. */
  ".bonsai-search-back-row",
  LINE,
  ROW,
  ".bonsai-chat-turn-row-body",
  ".bonsai-answer-stop",
  ".bonsai-chat-reasoning-fold",
  /* The Show details line under an answer: a Focusable line, not a button (D76). */
  ".bonsai-chat-details-divider",
].join(", ");

function stops(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(STOP_SELECTOR));
}

export function lines(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll(LINE)).map(
    (el) => el.querySelector(".bonsai-chat-earlier-pill")?.textContent ?? "",
  );
}

export function lineEl(container: HTMLElement, text: string): HTMLElement {
  const found = Array.from(container.querySelectorAll<HTMLElement>(LINE)).find(
    (el) => el.querySelector(".bonsai-chat-earlier-pill")?.textContent === text,
  );
  if (!found) throw new Error(`no line reads "${text}"; the lines are ${JSON.stringify(lines(container))}`);
  return found;
}

export function rowTexts(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll(`.bonsai-chat-turn-slot ${ROW}`)).map((el) => el.textContent ?? "");
}

export function isRetry(el: Element | null): boolean {
  return Boolean(el?.matches?.('[aria-label="Retry same prompt"]'));
}

export function nameOf(el: Element | null): string {
  if (!el) return "nothing";
  const h = el as HTMLElement;
  if (isRetry(h)) return "RETRY";
  if (h.classList.contains("bonsai-search-back-row")) return "back";
  if (h.matches(LINE)) return `line:${h.querySelector(".bonsai-chat-earlier-pill")?.textContent}`;
  if (h.classList.contains("bonsai-chat-turn-row-body")) return `question:${h.textContent}`;
  if (h.classList.contains("bonsai-chat-turn-row-header")) return `row:${h.textContent}`;
  if (h.classList.contains("bonsai-chat-reasoning-fold")) return "reasoning-line";
  if (h.classList.contains("bonsai-answer-stop")) return `answer:${h.textContent?.slice(0, 12)}`;
  return h.getAttribute("aria-label") ?? h.textContent?.trim() ?? h.className;
}

/** The row Steam never steps sideways inside on a vertical press. */
function rowOf(el: Element | null): Element | null {
  return el?.closest?.(".bonsai-chat-turn-row-header--with-retry") ?? null;
}

/** A on a stop: its own activate handler, as Steam calls it. */
export function activate(el: HTMLElement): void {
  act(() => {
    (el as NavEl).__nav?.onActivate?.();
  });
}

/**
 * One press: the focused element's move handler first, then each containing Focusable's, until one
 * claims it. An unclaimed Up/Down is Steam's own move, modelled as in the Retry walk: it never steps
 * sideways inside the question's row, entering a row from above lands on its first control (Retry)
 * and from below on its last. `after` runs once a landing is made (the scroll model hooks in there).
 */
export function press(container: HTMLElement, dir: Dir, after?: () => void): boolean {
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
  if (claimed) {
    after?.();
    return true;
  }
  if (dir === "Left" || dir === "Right") return false;
  const all = stops(container);
  const here = all.indexOf(start as HTMLElement);
  /* Past the last stop the model knows, Steam leaves the transcript: the walk is over. */
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
  after?.();
  return true;
}

export function focusOn(el: HTMLElement): void {
  act(() => el.focus());
  // focus-patterns-allow: a test reading where the page's focus landed, not code that finds a target.
  expect(document.activeElement).toBe(el);
}

/** Press `dir` until nothing moves (or the cap), returning every landing in order. */
export function walk(container: HTMLElement, dir: "Up" | "Down", after?: () => void, cap = 40): string[] {
  const seen: string[] = [nameOf(document.activeElement)];
  for (let i = 0; i < cap; i += 1) {
    const before = document.activeElement;
    if (!press(container, dir, after) || document.activeElement === before) break;
    seen.push(nameOf(document.activeElement));
  }
  return seen;
}

/** Open "4 earlier"'s list: the line is the first stop, A opens it. */
export function openEarlier(container: HTMLElement, stamp: () => void): void {
  activate(container.querySelector<HTMLElement>(LINE)!);
  stamp();
}

/* ---- Steam's scroll-into-view, modelled on the Deck's Quick Access numbers ---- */
const PANE_TOP = 88;
const DOCK_TOP = 290;
export type ScrollRule = "top" | "padded" | "center";

/**
 * Lays the stops out in one column and scrolls like Steam after each landing: "top" aligns a stop that
 * is not wholly in the readable band to the pane's top, "padded" puts it 116 px below, "center" also
 * re-centres a stop that was already on screen. Boxes follow the scroll, as on the Deck.
 */
export function steamScroll(container: HTMLElement, rule: ScrollRule) {
  const state = { scrollTop: 0 };
  const boxes = new Map<Element, [number, number]>();
  let y = PANE_TOP;
  for (const el of stops(container)) {
    const h = el.matches(LINE) ? 26 : 34;
    boxes.set(el, [y, y + h]);
    y += h + 8;
  }
  const rectOf = (el: Element): [number, number] => {
    const [top, bottom] = boxes.get(el)!;
    return [top - state.scrollTop, bottom - state.scrollTop];
  };
  const after = () => {
    const el = document.activeElement;
    if (!el || !boxes.has(el)) return;
    const [top, bottom] = rectOf(el);
    const onScreen = top >= PANE_TOP && bottom <= DOCK_TOP;
    if (rule === "top" && !onScreen) state.scrollTop += top - PANE_TOP;
    if (rule === "padded" && !onScreen) state.scrollTop += top - (PANE_TOP + 116);
    if (rule === "center") state.scrollTop += (top + bottom) / 2 - (PANE_TOP + DOCK_TOP) / 2;
    state.scrollTop = Math.max(0, state.scrollTop);
  };
  const visible = (el: Element) => {
    const [top, bottom] = rectOf(el);
    return top >= PANE_TOP && bottom <= DOCK_TOP;
  };
  return { after, visible };
}
