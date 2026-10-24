/**
 * Title: Walking up through an answer to its question, and back down, while the panel's page has lost focus (plan 97, L14)
 * Purpose: Pin the third round of row P97-L14-FREEZE at the level the Deck check looks at, where Steam's ring is.
 *          With the page's focus gone (workshop:test-evidence/plan97-P97-L14-FREEZE.json), every stop inside an
 *          answer was reached by a plain focus(), which moves the page's focus and leaves Steam's ring behind, so
 *          going Up the question row and Show reasoning stayed out of reach. The real transcript (question with
 *          Retry, Show reasoning, a three-section answer, the reply row and Show details) is drawn inside a page
 *          whose focus a test takes away (lostFocusPanel.tsx) and walked Up from Show details to the question's
 *          text, then Down again, the D-pad pressed the way Steam calls it.
 * Used for: answerStopRegistry.ts, spoilerFenceRegistry.ts, glossaryTermRegistry.ts and the answer walk's own
 *           fallback (answerBubbleNavigation.ts), through focusPerTurnRow.ts's focusStopHonestly; the sections'
 *           own nav nodes (buildAnswerSections.tsx); the question text's (buildTurnHeaderElement.tsx).
 * Solves: Every press must reach its stop by Steam's transfer or be declined so Steam's own step moves the ring;
 *         after every press the ring and the page's focus agree, and no stop is visited twice in a walk.
 * Does not: Scroll. The pane here is tall enough for the whole turn, so Steam's scroll-into-view has nothing to do;
 *           the answer walks with Steam's scroll modelled (deckAnswerWalk.ts) run with the page's focus present
 *           and are unchanged by this. Does not draw the dock: the question box, chips and notes block steps up to
 *           Show details are the first two rounds' tests (MainTabUnifiedAskBar.lostFocus, presetRow.lostFocus).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";

import { mountPanelPage, type MoveKey, type PanelPage } from "../../../test-harness/lostFocusPanel";
import { resetNavFocusRegistry } from "../../../shared/dpad/navFocusRegistry";
import { resetAnswerStopRegistry } from "../../../shared/dpad/answerStopRegistry";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../../test-harness/fakeDeckyUi");
  const { withPanelNav } = await import("../../../test-harness/lostFocusPanel");
  return { ...stubs, Focusable: withPanelNav(stubs.Focusable), Button: withPanelNav(stubs.Button) };
});

import { MainTabChatTranscript, type MainTabChatTranscriptProps } from "./MainTabChatTranscript";

const QUESTION = "what is a good first build";
/** Three paragraphs, each long enough to be a section of its own (splitResponseIntoChunks.ts, SECTION_FULL_CHARS). */
const PARAGRAPH = (topic: string) => `${topic} ` + "and the rest of the advice runs on for a while. ".repeat(14);
const ANSWER = [PARAGRAPH("Start with the Driller."), PARAGRAPH("Pick up Nitra."), PARAGRAPH("Fight near the pod.")].join(
  "\n\n",
);

function props(): MainTabChatTranscriptProps {
  return {
    fullBleedRowStyle: {},
    isAsking: false,
    selectedAttachment: null,
    ollamaContext: {} as MainTabChatTranscriptProps["ollamaContext"],
    unifiedInput: "",
    showSlowWarning: false,
    latencyWarningSeconds: 30,
    ollamaResponse: ANSWER,
    elapsedSeconds: null,
    lastApplied: null,
    canSaveDesktopNote: false,
    onOpenDesktopNoteSave: () => {},
    askMode: "speed",
    askThreadCollapsed: [],
    expandedTurnKey: "live",
    askThreadDisplayQuestion: QUESTION,
    lastExchange: {
      question: QUESTION,
      answer: ANSWER,
      reasoning: { text: "They are new.\nKeep it simple.", seconds: 12, tokens: 80 },
    },
    onRetryLastResponse: () => {},
    /* A finished answer with a route: Show details shows under the reply row. */
    transparencySnapshot: { route: "ollama", success: true } as unknown as MainTabChatTranscriptProps["transparencySnapshot"],
    onReplyFeedback: () => {},
    liveReplyFeedbackRating: null,
  } as MainTabChatTranscriptProps;
}

let page: PanelPage;

/** What Steam navigates: buttons and the nodes Decky stamps a tabindex on, innermost only. */
const STOPS = "button, [tabindex]";
function stops(): HTMLElement[] {
  const all = Array.from(page.host.querySelectorAll<HTMLElement>(STOPS));
  return all.filter((el) => !el.querySelector(STOPS));
}
function nameOf(el: HTMLElement | null): string {
  if (!el) return "nothing";
  if (el.classList.contains("bonsai-answer-stop")) return `section ${el.getAttribute("data-bonsai-chunk-index")}`;
  if (el.classList.contains("bonsai-chat-turn-row-body")) return "question";
  return (el.getAttribute("aria-label") ?? el.textContent ?? el.tagName).trim().slice(0, 30);
}
/** Steam's own Up or Down: the next stop that way in the turn's column. */
function steamColumnStep(key: MoveKey) {
  return (from: HTMLElement): HTMLElement | null => {
    const list = stops();
    const at = list.indexOf(from);
    if (at < 0) return null;
    return (key === "onMoveDown" ? list[at + 1] : list[at - 1]) ?? null;
  };
}
function press(key: MoveKey): "claimed" | "declined" {
  let out: "claimed" | "declined" = "declined";
  act(() => {
    out = page.press(key, steamColumnStep(key));
  });
  return out;
}
/** A bounded walk: no stop twice, the ring and the page's focus together after every press; stops at `until`. */
function walk(key: MoveKey, until: string): string[] {
  const seen = [nameOf(page.ring())];
  for (let i = 0; i < 20; i++) {
    const before = page.ring();
    press(key);
    const now = nameOf(page.ring());
    expect(nameOf(page.active()), `${key} from ${seen[seen.length - 1]}: the page's focus left the ring (${seen.join(" -> ")})`).toBe(now);
    if (page.ring() === before) break;
    expect(seen.includes(now), `${now} visited twice: ${seen.join(" -> ")}`).toBe(false);
    seen.push(now);
    if (now === until) return seen;
  }
  return seen;
}
function box(top: number, bottom: number): DOMRect {
  return { top, bottom, left: 0, right: 300, width: 300, height: bottom - top, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
}
/** The pane's height: tall enough that the whole turn is on screen, so nothing ever has to scroll. */
const PANE_PX = 4000;
/** Each element's own box: stacked top to bottom in the order they are drawn, a few px apart, all inside the pane. */
const ROW_PX = 4;

function mount(over: Partial<MainTabChatTranscriptProps> = {}) {
  const pane = page.doc.createElement("div");
  pane.className = "TabContentsScroll";
  Object.defineProperty(pane, "clientHeight", { value: PANE_PX, configurable: true });
  Object.defineProperty(pane, "scrollHeight", { value: PANE_PX + 100, configurable: true });
  page.host.appendChild(pane);
  const view = page.doc.defaultView as unknown as { Element: typeof Element };
  view.Element.prototype.getBoundingClientRect = function (this: Element) {
    if (this === pane) return box(0, PANE_PX);
    const all = Array.from(pane.querySelectorAll("*"));
    const at = all.indexOf(this);
    return at < 0 ? box(0, 0) : box(at * ROW_PX, at * ROW_PX + ROW_PX);
  };
  render(<MainTabChatTranscript {...props()} {...over} />, { container: pane });
  /* Decky stamps tabindex on the nodes Steam navigates; the stub does not. */
  page.host
    .querySelectorAll<HTMLElement>(".bonsai-answer-stop, .bonsai-chat-turn-row-body, .bonsai-chat-reasoning-fold, .bonsai-chat-details-divider")
    .forEach((el) => el.setAttribute("tabindex", "0"));
}
function byName(name: string): HTMLElement {
  const el = stops().find((s) => nameOf(s) === name);
  expect(el, `no stop "${name}" among ${stops().map(nameOf).join(", ")}`).toBeTruthy();
  return el!;
}

beforeEach(() => {
  resetNavFocusRegistry();
  resetAnswerStopRegistry();
  page = mountPanelPage();
});
afterEach(() => {
  cleanup();
  page.remove();
  document.body.innerHTML = "";
});

describe("P97-L14-FREEZE (round three): up through the answer to the question and back, the page's focus gone", () => {
  it("walks Up from Show details through every section and Show reasoning to the question, as it does with focus", () => {
    mount();
    act(() => page.steamMove(byName("Show details")));
    const withFocus = walk("onMoveUp", "question");

    act(() => page.steamMove(byName("Show details")));
    page.setFocused(false);
    const withoutFocus = walk("onMoveUp", "question");

    expect(withFocus.slice(-5)).toEqual(["section 2", "section 1", "section 0", "Show reasoning · 12 s", "question"]);
    expect(withoutFocus).toEqual(withFocus);
  });

  it("walks Down from the question through Show reasoning and every section to Show details, as it does with focus", () => {
    mount();
    act(() => page.steamMove(byName("question")));
    const withFocus = walk("onMoveDown", "Show details");

    act(() => page.steamMove(byName("question")));
    page.setFocused(false);
    const withoutFocus = walk("onMoveDown", "Show details");

    expect(withFocus.slice(0, 5)).toEqual(["question", "Show reasoning · 12 s", "section 0", "section 1", "section 2"]);
    expect(withFocus[withFocus.length - 1]).toBe("Show details");
    expect(withoutFocus).toEqual(withFocus);
  });
});

/** A Strategy answer's choice menu ("A. ...", "B. ...", "C. ..."), drawn between the answer and the reply row. */
const CHOICES: Partial<MainTabChatTranscriptProps> = {
  askMode: "strategy",
  strategyGuideBranches: {
    question: "What do you want to work on?",
    options: [
      { id: "move", label: "Movement and dodging" },
      { id: "gear", label: "Choosing upgrades" },
      { id: "boss", label: "Boss attack patterns" },
    ],
  },
  onStrategyBranchPick: () => {},
};
const A = "A. Movement and dodging";
const B = "B. Choosing upgrades";
const C = "C. Boss attack patterns";

describe("P97-L14-FREEZE (round four): from the answer's last section onto its choices and back, the page's focus gone", () => {
  /* plan97-P97-L14-FREEZE-try4.json: Down from the last section moved only the page's focus to "A.", ten presses of ten. */
  it("walks Down from the last section through A, B and C to Show details, as it does with focus", () => {
    mount(CHOICES);
    act(() => page.steamMove(byName("section 2")));
    const withFocus = walk("onMoveDown", "Show details");

    act(() => page.steamMove(byName("section 2")));
    page.setFocused(false);
    const withoutFocus = walk("onMoveDown", "Show details");

    expect(withFocus.slice(0, 4)).toEqual(["section 2", A, B, C]);
    expect(withoutFocus).toEqual(withFocus);
  });

  it("walks Up from Show details through C, B and A back to the last section, as it does with focus", () => {
    mount(CHOICES);
    act(() => page.steamMove(byName("Show details")));
    const withFocus = walk("onMoveUp", "section 2");

    act(() => page.steamMove(byName("Show details")));
    page.setFocused(false);
    const withoutFocus = walk("onMoveUp", "section 2");

    expect(withFocus.slice(-4)).toEqual([C, B, A, "section 2"]);
    expect(withoutFocus).toEqual(withFocus);
  });
});
