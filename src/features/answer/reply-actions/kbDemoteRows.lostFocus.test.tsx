/**
 * Title: Undo and the Down walk past the notes block while the panel's page has lost the browser's focus (plan 102, C)
 * Purpose: Pin the one fix plan 102 lane C makes for the side effect of P98-DEMOTE-01-game
 *          (workshop:test-evidence/plan98-P98-DEMOTE-01-game.json), at the level the Deck check looks at, where
 *          Steam's ring is. On the Deck, with a game running, the page was out of focus after Not really and Wrong
 *          tip; a Down walk from Undo reached the notes block and Down died there. The real chat screen (the
 *          answer, the reply row with the reasons, Undo, "Suggest as a tip", Show details open, the notes block, the
 *          details tabs) is drawn inside a page whose focus a test takes away (lostFocusPanel.tsx), and every
 *          press is made the way Steam makes it.
 * Used for: kbDemoteRows.tsx (`landOn`, which every landing on these rows goes through, asks the panel's window
 *           for its focus first), and the walk through buildReplyActionsElement.tsx, MainTabChatTranscript.tsx and
 *           the details panel.
 * Solves: Nothing on this walk asked the window for its focus before: Steam's transfers carried the ring down
 *         to the notes block, and the notes block's Down is a plain hop that moves only the page's focus while
 *         the ring stays (`focusContextChipLadder` in liveTurnFocusGraph.ts). Now the landing on Undo, or on Wrong
 *         tip after Undo, asks the window once; a window that takes the focus back lets the walk go on.
 * Does not: Prove the window takes the focus back on the Deck: the plan 97 readings saw it refuse, and with a
 *           window that refuses (lostFocusPanel's own) the notes block's Down still dies, a hop outside this
 *           fix. Does not scroll: the pane is tall enough for the whole turn; the demote walks with Steam's scroll
 *           modelled are buildReplyActionsElement.demote.test.tsx, run with the page's focus present.
 */
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";

import { mountPanelPage, type MoveKey, type PanelNavEl, type PanelPage } from "../../../test-harness/lostFocusPanel";
import { resetNavFocusRegistry } from "../../../shared/dpad/navFocusRegistry";
import { resetAnswerStopRegistry } from "../../../shared/dpad/answerStopRegistry";
import { REPLY_STOP_ORDER, registerReplyStop, setReplyStopUnavailable } from "../../../shared/dpad/replyStopRegistry";
import { resetRememberedReplyDemoteForTests } from "./useReplyDemote";
import { resetRememberedReplyFeedbackForTests } from "./useReplyFeedbackChips";
import type { KbAttachedNote } from "../../../types/inputTransparency";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../../test-harness/fakeDeckyUi");
  const { withPanelNav } = await import("../../../test-harness/lostFocusPanel");
  return { ...stubs, Focusable: withPanelNav(stubs.Focusable), Button: withPanelNav(stubs.Button) };
});

import { MainTabChatTranscript, type MainTabChatTranscriptProps } from "../transcript/MainTabChatTranscript";

/* The question does not name the boss, the answer does: the notes block shows the note (kbNoteUsedByAnswer.ts). */
const QUESTION = "how should I deal with the big boss when it charges";
const ANSWER =
  "The Glyphid Dreadnought charges in a straight line, so sidestep at the last moment and shoot the glowing sacs on its back. " +
  "Keep moving while the swarm is down and save your strongest skill for the moment it stops to turn around.";
const NOTE: KbAttachedNote = {
  name: "Glyphid Dreadnought",
  kind: "boss",
  card: "Summary: a boss that charges. Weak points: the sacs on its back.",
  trust_tier: "seed",
  source_host: "",
  source_license: "",
  domain: "strategy",
  game_title: "Deep Rock Galactic: Survivor",
  section_id: 41,
};
const chip = (id: string, rank: number, label: string) => ({
  id, rank, label, attached: true, tier_class: "", body: { title: label, paths: [], bullets: [label] },
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
    ollamaResponse: ANSWER,
    elapsedSeconds: null,
    lastApplied: null,
    canSaveDesktopNote: false,
    onOpenDesktopNoteSave: () => {},
    askMode: "strategy",
    askThreadCollapsed: [],
    expandedTurnKey: "live",
    askThreadDisplayQuestion: QUESTION,
    lastExchange: { question: QUESTION, answer: ANSWER, askMode: "strategy" },
    lastRequestId: 7,
    onRetryLastResponse: () => {},
    /* A finished answer with its notes and the chips Show details lists, as on the Deck. */
    transparencySnapshot: {
      route: "ollama",
      success: true,
      kb_attached_notes: [NOTE],
      context_chips: [chip("game_context", 1, "Game context"), chip("kb_notes", 2, "Notes")],
    } as unknown as MainTabChatTranscriptProps["transparencySnapshot"],
    onReplyMicroAction: () => {},
  } as MainTabChatTranscriptProps;
}

/** The chat screen with the rating the main screen would hold, so Not really shows the reasons. */
function Screen() {
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  return <MainTabChatTranscript {...props()} liveReplyFeedbackRating={rating} onReplyFeedback={setRating} />;
}

let page: PanelPage;
let stamper: MutationObserver | null = null;

/** What Steam navigates: buttons and the nodes Decky stamps a tabindex on, innermost only. */
const STOPS = "button, [tabindex]";
function stops(): HTMLElement[] {
  const all = Array.from(page.host.querySelectorAll<HTMLElement>(STOPS));
  return all.filter((el) => !el.querySelector(STOPS));
}
function nameOf(el: HTMLElement | null): string {
  if (!el) return "nothing";
  if (el.classList.contains("bonsai-kb-notes-block")) return "notes block";
  if (el.classList.contains("bonsai-details-tabs-row")) return "details tabs";
  if (el.classList.contains("bonsai-chip-ladder")) return "chip grid";
  return (el.getAttribute("aria-label") ?? el.textContent ?? el.tagName).trim().slice(0, 30);
}
/** Steam's own Down: the next stop in the turn's column. */
function steamColumnStep(key: MoveKey) {
  return (from: HTMLElement): HTMLElement | null => {
    const list = stops();
    const at = list.indexOf(from);
    if (at < 0) return null;
    return (key === "onMoveDown" ? list[at + 1] : list[at - 1]) ?? null;
  };
}
/** A on the stop holding the ring (its own A, else the button's click), then the redraw and the hand-over. */
async function pressA(): Promise<void> {
  const ring = page.ring() as PanelNavEl | null;
  act(() => {
    const ok = ring?.__nav?.onOKButton;
    if (ok) ok();
    else ring?.click();
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 150));
  });
}
/** A bounded Down walk: every press moves the ring to a new stop, the page's focus with it; stops at `until`. */
function walkDown(until: string): string[] {
  const seen = [nameOf(page.ring())];
  for (let i = 0; i < 12 && seen[seen.length - 1] !== until; i++) {
    const before = page.ring();
    act(() => {
      page.press("onMoveDown", steamColumnStep("onMoveDown"));
    });
    const now = nameOf(page.ring());
    const trail = seen.join(" -> ");
    /* Compared as a yes/no: printing a node from the panel's own page breaks the assertion's message. */
    expect(page.ring() === before, `Down from ${seen[seen.length - 1]} was dead (page focus on ${nameOf(page.active())}): ${trail}`).toBe(false);
    expect(nameOf(page.active()), `Down from ${seen[seen.length - 1]}: the page's focus left the ring: ${trail}`).toBe(now);
    expect(seen.includes(now), `${now} visited twice: ${trail}`).toBe(false);
    seen.push(now);
  }
  return seen;
}

function box(top: number, bottom: number): DOMRect {
  return { top, bottom, left: 0, right: 300, width: 300, height: bottom - top, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
}
/** Tall enough that the whole turn is on screen, so nothing ever has to scroll. */
const PANE_PX = 4000;
const ROW_PX = 4;
/* Decky stamps tabindex on the nodes Steam navigates; the stub does not, so the test does, as each is drawn. */
const STEAM_STOPS = [
  ".bonsai-answer-stop", ".bonsai-chat-turn-row-body", ".bonsai-chat-details-divider", ".bonsai-kb-demote-chip",
  ".bonsai-kb-demote-undo", ".bonsai-kb-demote-pick", ".bonsai-kb-notes-block", ".bonsai-chip-ladder-chip",
].join(", ");
function stamp(root: ParentNode) {
  root.querySelectorAll<HTMLElement>(STEAM_STOPS).forEach((el) => {
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");
  });
}

function mount() {
  const pane = page.doc.createElement("div");
  pane.className = "TabContentsScroll";
  Object.defineProperty(pane, "clientHeight", { value: PANE_PX, configurable: true });
  Object.defineProperty(pane, "scrollHeight", { value: PANE_PX + 100, configurable: true });
  page.host.appendChild(pane);
  const view = page.doc.defaultView as unknown as { Element: typeof Element; MutationObserver: typeof MutationObserver };
  view.Element.prototype.getBoundingClientRect = function (this: Element) {
    if (this === pane) return box(0, PANE_PX);
    const all = Array.from(pane.querySelectorAll("*"));
    const at = all.indexOf(this);
    return at < 0 ? box(0, 0) : box(at * ROW_PX, at * ROW_PX + ROW_PX);
  };
  stamper = new view.MutationObserver(() => stamp(pane));
  stamper.observe(pane, { childList: true, subtree: true });
  render(<Screen />, { container: pane });
  stamp(pane);
}
function byName(name: string): HTMLElement {
  const el = stops().find((s) => nameOf(s) === name);
  expect(el, `no stop "${name}" among ${stops().map(nameOf).join(", ")}`).toBeTruthy();
  return el!;
}

/** The evidence's presses: Show details open, Not really, Wrong tip; the ring then on Undo. */
async function markWrongTip(focused: boolean): Promise<void> {
  mount();
  act(() => page.steamMove(byName("Show details")));
  await pressA();
  act(() => page.steamMove(byName("Mark reply not helpful")));
  await pressA();
  act(() => page.steamMove(byName("Wrong tip")));
  page.setFocused(focused);
  await pressA();
  expect(page.host.querySelector(".bonsai-kb-demote-done")?.textContent).toContain("Marked not helpful");
  expect(nameOf(page.ring())).toBe("Undo, the note ranks as before");
}

beforeEach(() => {
  resetNavFocusRegistry();
  resetAnswerStopRegistry();
  resetRememberedReplyDemoteForTests();
  resetRememberedReplyFeedbackForTests();
  for (const id of REPLY_STOP_ORDER) {
    registerReplyStop(id, null);
    setReplyStopUnavailable(id, false);
  }
  page = mountPanelPage();
});
afterEach(() => {
  stamper?.disconnect();
  stamper = null;
  cleanup();
  page.remove();
  document.body.innerHTML = "";
});

const WALK = ["Undo, the note ranks as before", "Suggest as a tip", "Hide details", "notes block", "details tabs"];
const WALK_AFTER_UNDO = ["Wrong tip", "Suggest as a tip", "Hide details", "notes block", "details tabs"];

/** The panel's window as a spy: it takes the browser's focus back when asked, or refuses. */
function panelWindow(grants: boolean) {
  const focus = vi.fn(() => {
    if (grants) page.setFocused(true);
  });
  Object.defineProperty(page.doc.defaultView!, "focus", { value: focus, configurable: true });
  return focus;
}

describe("P102-UNDO-FOCUS-01: Down from Undo past the notes block, Show details open", () => {
  it("with the page's focus present, asks nothing of the window and every Down moves the ring", async () => {
    const focus = panelWindow(true);
    await markWrongTip(true);
    expect(walkDown("details tabs")).toEqual(WALK);
    expect(focus).not.toHaveBeenCalled();
  });

  it("with the page's focus gone, the landing on Undo asks the window, and the walk goes past the notes block", async () => {
    const focus = panelWindow(true);
    await markWrongTip(false);
    expect(walkDown("details tabs")).toEqual(WALK);
    expect(focus).toHaveBeenCalledTimes(1);
    expect(page.doc.hasFocus()).toBe(true);
  });

  it("the page losing its focus while Undo holds the ring: A on Undo asks the window as the ring lands on Wrong tip", async () => {
    const focus = panelWindow(true);
    await markWrongTip(true);
    page.setFocused(false);
    await pressA();
    expect(page.host.querySelector(".bonsai-kb-demote-done")).toBeNull();
    expect(nameOf(page.ring())).toBe("Wrong tip");
    expect(walkDown("details tabs")).toEqual(WALK_AFTER_UNDO);
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it("a window that refuses is asked and nothing else changes: the ring still lands on Undo", async () => {
    const focus = panelWindow(false);
    await markWrongTip(false);
    expect(focus).toHaveBeenCalledTimes(1);
    expect(page.doc.hasFocus()).toBe(false);
    expect(page.active()?.getAttribute("aria-label")).toBe("Undo, the note ranks as before");
  });
});
