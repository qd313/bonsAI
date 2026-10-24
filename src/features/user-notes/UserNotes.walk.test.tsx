/**
 * Title: Walking the note card and the notes line with the D-pad, in the Deck's numbers
 * Purpose: Pin plan 92 lane N2's two walks at the level the Deck check looks at, with Steam's own scroll
 *          after every landing and the plugin's lift off the dock modelled (src/test-harness/deckAnswerWalk.ts,
 *          under each of its Steam scroll rules):
 *          1. question, "Read N of your notes" line, answer: Down from the question reaches the line, Down from
 *             the line enters the answer's first section, Up from that section reaches the line, Up from the
 *             line reaches the question; no stop twice, no dead press, every landing on screen.
 *          2. the rating row, the note card, its "For" line, the Show details line: Down from the answer
 *             reaches Helpful, then Keep, then For, then Show details; Up walks it back; with no thumbs row
 *             (rated Helpful) Down from the answer lands on Keep; under the "What went wrong?" choices Down
 *             from the last choice lands on Keep and Up from Keep lands on the choices; with the card gone the
 *             walk is what it was.
 * Used for: NotesReadLine.tsx, NoteOfferCard.tsx, buildReplyActionsElement.tsx, buildTurnHeaderElement.tsx,
 *           liveTurnFocusGraph.ts, replyStopRegistry.ts, the real builders the transcript calls.
 * Does not: Prove any of it on the Deck; the Deck check is in the lane report. The boxes are given in the
 *           Deck's own numbers (pane 88 to 366, dock 290), not measured from the stylesheet.
 */
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../test-harness/steamRing");
  return { ...stubs, Focusable: SteamRingFocusable, showModal: () => ({ Close: () => undefined }) };
});

import { WALK_RULES, deckAnswer, resetDeckAnswerWalk, type Box, type SteamScrollRule } from "../../test-harness/deckAnswerWalk";
import { type SteamEl } from "../../test-harness/steamRing";
import { buildNotesReadLine } from "./NotesReadLine";
import { receiveStatusOffer, resetUserNotesStore } from "./userNotesStore";
import { buildReplyActionsElement } from "../answer/reply-actions/buildReplyActionsElement";
import { buildTurnHeaderElement } from "../answer/transcript/buildTurnHeaderElement";
import { focusDownFromLiveAnswerBubble, queryTurnSlot } from "../../shared/dpad/liveTurnFocusGraph";
import { REPLY_STOP_ORDER, registerReplyStop, setReplyStopUnavailable } from "../../shared/dpad/replyStopRegistry";
import type { ChatSlotTurnTransparency } from "../../types/inputTransparency";

const TURN = "turn-1";
type Dir = "onMoveUp" | "onMoveDown";

const RULES: Array<[SteamScrollRule | undefined, boolean]> = WALK_RULES.flatMap((rule) =>
  [false, true].map((margin) => [rule, margin] as [SteamScrollRule | undefined, boolean]),
);

const SNAP = {
  route: "ollama",
  success: true,
  user_notes_attached: [{ id: "n-1", text: "Steel Soul run.", game_title: "Hollow Knight" }],
  user_notes_off_count: 0,
} as ChatSlotTurnTransparency;

const OFFER = { text: "I'm doing a Steel Soul run.", app_id: "", game_title: "Hollow Knight" };

beforeEach(() => {
  resetDeckAnswerWalk();
  resetUserNotesStore();
  for (const id of REPLY_STOP_ORDER) {
    registerReplyStop(id, null);
    setReplyStopUnavailable(id, false);
  }
});
afterEach(() => cleanup());

/**
 * Steam's ring follows the answer's own sections: the answer code lands on them itself (its own tests pin how),
 * so a section taking focus here clears the ring marker the other Focusables set, as Steam's ring would move.
 */
function ringFollowsTheAnswer(pane: HTMLElement): void {
  pane.addEventListener("focusin", (event) => {
    if ((event.target as HTMLElement).closest(".bonsai-chat-ai-bubble")) {
      document.querySelectorAll(".gpfocus").forEach((e) => e.classList.remove("gpfocus"));
    }
  });
}

/** One press the way Steam routes it: the ring's handler, then each container's, until one claims it. */
function runHandlers(dir: Dir): boolean {
  let el = document.activeElement as SteamEl | null;
  while (el) {
    const h = el.__nav?.[dir];
    if (h && h() === true) return true;
    el = el.parentElement as SteamEl | null;
  }
  return false;
}

function nameOf(el: Element | null, names: Map<Element, string>): string {
  for (let e: Element | null = el; e; e = e.parentElement) {
    const n = names.get(e);
    if (n) return n;
  }
  return "other";
}

describe("question, notes line, answer", () => {
  function mount(rule: SteamScrollRule | undefined, steamTopMargin: boolean) {
    const sections: Box[] = [[166, 214], [222, 258]];
    const a = deckAnswer(sections, 0, rule, { steamTopMargin });
    ringFollowsTheAnswer(a.pane);
    const slot = document.createElement("div");
    slot.className = "bonsai-chat-turn-slot";
    a.pane.insertBefore(slot, a.bubble);
    const holder = document.createElement("div");
    slot.appendChild(holder);
    render(
      <>
        {buildTurnHeaderElement({ turnId: TURN, title: "I am doing a Steel Soul run, how do I beat the mantis lords", expanded: true, onActivate: () => {} })}
        {buildNotesReadLine(TURN, SNAP)}
      </>,
      { container: holder },
    );
    const header = holder.querySelector<HTMLElement>(".bonsai-chat-turn-row-header")!;
    const line = holder.querySelector<HTMLElement>(".bonsai-notes-line")!;
    a.place(header, [96, 128]);
    a.place(line, [136, 154]);
    const names = new Map<Element, string>([[header, "question"], [line, "notes line"]]);
    a.stops.forEach((s, i) => names.set(s, `section ${i + 1}`));
    const press = (dir: Dir): boolean => {
      const ring = document.activeElement as SteamEl;
      if (ring.__nav || ring.closest(".bonsai-chat-turn-slot")) {
        const handled = runHandlers(dir);
        a.settle();
        if (handled) return true;
      }
      if (dir === "onMoveDown") return a.down();
      const handled = a.up();
      if (handled) return true;
      /* Steam's own Up out of the answer's first section: the stop drawn just above it. */
      a.land(line);
      return true;
    };
    return { a, header, line, press, names };
  }

  function walk(m: ReturnType<typeof mount>, dir: Dir, limit = 12) {
    const labels = [nameOf(document.activeElement, m.names)];
    const problems: string[] = [];
    for (let i = 1; i <= limit; i += 1) {
      if (!m.press(dir)) break;
      const ring = document.activeElement as HTMLElement;
      labels.push(nameOf(ring, m.names));
      if (!(m.a.bottom(ring) > m.a.paneTop && m.a.top(ring) < m.a.dockTop)) problems.push(`press ${i}: ${labels[i]} is off the screen`);
      if (labels[i] === labels[i - 1]) problems.push(`press ${i}: stayed on ${labels[i]}`);
    }
    return { labels, problems };
  }

  it.each(RULES)("Down from the question reaches the line, then each section once (Steam rule %s, top margin %s)", (rule, margin) => {
    const m = mount(rule, margin);
    m.a.land(m.header);
    const { labels, problems } = walk(m, "onMoveDown");
    expect(labels.slice(0, 4)).toEqual(["question", "notes line", "section 1", "section 2"]);
    expect(new Set(labels.slice(0, 4)).size).toBe(4);
    expect(problems.filter((p) => !p.includes("stayed on section 2"))).toEqual([]);
  });

  it.each(RULES)("Up from the first section reaches the line, and Up from the line reaches the question (Steam rule %s, top margin %s)", (rule, margin) => {
    const m = mount(rule, margin);
    m.a.land(m.a.stops[0]!);
    const { labels, problems } = walk(m, "onMoveUp", 4);
    expect(labels.slice(0, 3)).toEqual(["section 1", "notes line", "question"]);
    expect(problems.filter((p) => !p.includes("stayed on"))).toEqual([]);
  });

  it("the line claims Left and Right so the ring cannot leave the panel", () => {
    const m = mount(undefined, false);
    const nav = (m.line as SteamEl).__nav;
    expect(nav?.onMoveLeft?.()).toBe(true);
    expect(nav?.onMoveRight?.()).toBe(true);
  });
});

describe("rating row, note card, For line, Show details", () => {
  type Opts = { rating?: "up" | "down" | null; offer?: boolean };

  function mount(rule: SteamScrollRule | undefined, steamTopMargin: boolean, opts: Opts = {}) {
    const { rating = null, offer = true } = opts;
    if (offer) receiveStatusOffer({ note_offer: OFFER, request_id: 1, chat_slot_id: "" });
    const sections: Box[] = [[100, 150], [158, 200]];
    const a = deckAnswer(sections, 0, rule, { steamTopMargin });
    ringFollowsTheAnswer(a.pane);
    const slot = document.createElement("div");
    slot.className = "bonsai-chat-turn-slot";
    slot.setAttribute("data-bonsai-turn-id", TURN);
    a.pane.appendChild(slot);
    const holder = document.createElement("div");
    slot.appendChild(holder);
    render(
      buildReplyActionsElement({
        replyKey: TURN,
        rating,
        onRate: () => {},
        showFeedback: true,
        onToggleTransparency: () => {},
        onChip: () => {},
        onMoveDownFromUtility: () => false,
      })!,
      { container: holder },
    );
    const q = <T extends HTMLElement>(sel: string) => holder.querySelector<T>(sel);
    const names = new Map<Element, string>();
    const at = (el: HTMLElement | null, name: string, box: Box) => {
      if (!el) return;
      a.place(el, box);
      names.set(el, name);
    };
    at(q("[aria-label='Mark reply helpful']"), "Helpful", [540, 566]);
    at(q("[aria-label='Mark reply not helpful']"), "Not really", [540, 566]);
    const chips = [...holder.querySelectorAll<HTMLElement>(".bonsai-chat-reply-actions-row--chips button")];
    chips.forEach((c, i) => at(c, `choice ${i + 1}`, [572 + (i < 2 ? 0 : 30), 596 + (i < 2 ? 0 : 30)]));
    const lastChoice = chips.length ? chips[chips.length - 1]! : null;
    const base = chips.length ? 640 : 580;
    at(q("[aria-label='Keep this note']"), "Keep", [base, base + 26]);
    const labelled = (start: string) =>
      [...holder.querySelectorAll<HTMLElement>("[aria-label]")].find((e) => e.getAttribute("aria-label")?.startsWith(start)) ?? null;
    at(labelled("Edit"), "Edit", [base, base + 26]);
    at(labelled("Not now"), "Not now", [base, base + 26]);
    at(labelled("Who this note is for"), "For", [base + 34, base + 52]);
    at(q("[aria-label='Show details']"), "Show details", [base + 66, base + 82]);
    a.pane.scrollTop = 0;

    const press = (dir: Dir): boolean => {
      const handled = runHandlers(dir);
      a.settle();
      return handled;
    };
    const walk = (dir: Dir, limit = 8) => {
      const labels = [nameOf(document.activeElement, names)];
      const problems: string[] = [];
      for (let i = 1; i <= limit; i += 1) {
        if (!press(dir)) break;
        const ring = document.activeElement as HTMLElement;
        labels.push(nameOf(ring, names));
        if (!(a.bottom(ring) > a.paneTop && a.top(ring) < a.dockTop)) problems.push(`press ${i}: ${labels[i]} is off the screen`);
      }
      return { labels, problems };
    };
    return { a, holder, names, press, walk, lastChoice, slot };
  }

  it.each(RULES)("Down from the answer, then Down: Helpful, Keep, For, Show details, each once (Steam rule %s, top margin %s)", (rule, margin) => {
    const m = mount(rule, margin);
    m.a.land(m.a.stops[1]!);
    expect(m.a.down()).toBe(false); // the end of the answer: the ring leaves it
    act(() => void focusDownFromLiveAnswerBubble(queryTurnSlot(TURN)));
    m.a.settle();
    const { labels, problems } = m.walk("onMoveDown");
    expect(labels).toEqual(["Helpful", "Keep", "For", "Show details"]);
    expect(problems).toEqual([]);
  });

  it.each(RULES)("Up from Show details walks back through For and Keep to Helpful (Steam rule %s, top margin %s)", (rule, margin) => {
    const m = mount(rule, margin);
    act(() => void m.holder.querySelector<HTMLElement>("[aria-label='Show details']")!.focus());
    m.a.settle();
    const { labels, problems } = m.walk("onMoveUp", 3);
    expect(labels).toEqual(["Show details", "For", "Keep", "Helpful"]);
    expect(problems).toEqual([]);
  });

  it("with no thumbs row (rated Helpful) Down from the answer lands on Keep", () => {
    const m = mount(undefined, false, { rating: "up" });
    m.a.land(m.a.stops[1]!);
    act(() => void focusDownFromLiveAnswerBubble(queryTurnSlot(TURN)));
    m.a.settle();
    expect(nameOf(document.activeElement, m.names)).toBe("Keep");
    expect(m.walk("onMoveDown").labels).toEqual(["Keep", "For", "Show details"]);
  });

  it("under the What went wrong choices, Down from the last choice lands on Keep and Up from Keep lands on the choices", () => {
    const m = mount(undefined, false, { rating: "down" });
    expect(m.lastChoice).not.toBeNull();
    act(() => m.lastChoice!.focus());
    m.a.settle();
    expect(runHandlers("onMoveDown")).toBe(true);
    expect(nameOf(document.activeElement, m.names)).toBe("Keep");
    expect(runHandlers("onMoveUp")).toBe(true);
    expect(nameOf(document.activeElement, m.names)).toMatch(/^choice/);
  });

  it("with no card on offer the walk is what it was: Helpful, then Show details", () => {
    const m = mount(undefined, false, { offer: false });
    expect(m.holder.querySelector("[data-bonsai-note-card]")).toBeNull();
    act(() => void m.holder.querySelector<HTMLElement>("[aria-label='Mark reply helpful']")!.focus());
    expect(m.walk("onMoveDown").labels).toEqual(["Helpful", "Show details"]);
  });
});
