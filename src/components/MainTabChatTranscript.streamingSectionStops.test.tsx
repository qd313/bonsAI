/**
 * Title: While an answer writes, its sections are D-pad stops, Up from below and Down from above
 *
 * Purpose: Pin plan 93's Deck finding (docs/test-evidence/plan93-P93-M4-ANSWER-FINISH-after-try2.json,
 * run C): with an answer still writing, Up from the question box went chip row, the "From the notes"
 * block, then the turn's Retry, never into the answer's sections, though they are already cut and
 * drawn as the finished answer's sections (the picked design: they are stops while it writes).
 *
 * Used for: the live turn's Up out of the notes block (MainTabChatTranscript.tsx) and out of the chip
 * row with no notes block (`focusBottomOfNewestReply`, liveTurnFocusGraph.ts).
 *
 * Solves: a walk test on the real rendered transcript while the answer writes, inside a pane shaped like
 * the Deck's (the dock at its foot, every box following the scroll), with the chip slot registered as the
 * dock registers it and Steam's glide after each landing under three rules (deckAnswerWalk.ts's
 * `steamGlide`). Down from the question to the chip and Up from the chip visit the same stops, mirror
 * images, none twice, every landing on screen, never the turn's Retry on the way down. Bounded walks.
 *
 * The still-filling last section is a stop like the others: it is the same element after the finish, so a
 * ring on it stays there (lane O3's rule), and the walk places it as any section; text growing under it
 * runs past the dock as a long section does, read by scrolling.
 *
 * Does not: model the answer growing between presses; the finish keeping the ring is
 * MainTabChatTranscript.streamFinishKeepsRing.test.tsx's.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup } from "@testing-library/react";

import type { KbAttachedNote } from "../utils/inputTransparency";
import { registerNavFocus, resetNavFocusRegistry } from "../utils/navFocusRegistry";
import { resetUiDocument } from "../utils/uiDocument";
import { resetAnswerStopRegistry } from "../utils/answerStopRegistry";
import { focusOn, nameOf, press, renderChat, type ScrollRule } from "./earlierListTestKit";
import { steamGlide } from "../test-harness/deckAnswerWalk";
import { chipRowExitUp } from "../features/preset-carousel/presetRowFocusNav";

vi.mock("@decky/ui", async () => (await import("./earlierListNavStub")).deckyUiWithNavNodes());

const SENTENCE = "Dash through the arc rather than away from it, and keep moving between her attacks. ";
const ANSWER = Array.from({ length: 7 }, (_, i) => `Part ${i + 1}. ${SENTENCE.repeat(4)}`.trim()).join("\n\n");
/** Most of the answer: several sections closed, the last one still filling. */
const SO_FAR = `Leaving the Forgotten Crossroads comes first. ${ANSWER.slice(0, Math.floor(ANSWER.length * 0.7))}`;
const QUESTION = "Walk through every region of Hollow Knight";

const NOTE: KbAttachedNote = {
  name: "Leaving the Forgotten Crossroads",
  kind: "mechanic",
  card: "Take the lift down once you have the map.",
  trust_tier: "wiki_verified",
  source_host: "hollowknight.wiki",
  source_license: "CC-BY-SA-4.0",
  domain: "strategy",
  game_title: "Hollow Knight",
} as KbAttachedNote;

const SLOT = "chip slot";

function chipSlot(): HTMLElement {
  const chip = document.createElement("button");
  chip.setAttribute("aria-label", SLOT);
  document.body.appendChild(chip);
  registerNavFocus("preset-carousel", { current: { TakeFocus: () => (chip.focus(), true) } });
  return chip;
}

function writingChat(notes: boolean) {
  return renderChat(
    {
      isAsking: true,
      isStreamingPreview: true,
      streamDisplayText: SO_FAR,
      askThreadDisplayQuestion: QUESTION,
      askMode: "expert",
      lastExchange: null,
      onRetryLastResponse: () => {},
      liveThinking: { summary: null, reasoning: null, kbAttachedNotes: notes ? [NOTE] : null },
      transparencySnapshot: null,
    },
    [],
    "live",
  );
}

/* ---- The Deck's Quick Access pane: y 88 to 366, the dock from 290, every box following the scroll ---- */
const PANE_TOP = 88;
const DOCK_TOP = 290;
const PANE_BOTTOM = 366;
/** A section of the answer: about six lines of text, shorter than the 202 px band. */
const SECTION_PX = 120;
const ROW_PX = 34;

const rect = (top: number, bottom: number) =>
  ({ top, bottom, left: 0, right: 0, width: 0, height: bottom - top, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;

/**
 * Puts the rendered transcript in a scrolling pane with the dock at its foot, lays every stop out in one
 * column in page order (a section 120 px, anything else 34), gives the answer bubble its 9 px frame, and
 * after each landing applies Steam's glide under `rule` (deckAnswerWalk.ts's `steamGlide`).
 */
function deckPane(container: HTMLElement, rule: ScrollRule) {
  const pane = document.createElement("div");
  pane.className = "TabContentsScroll";
  Object.defineProperty(pane, "scrollHeight", { value: 3000, configurable: true });
  Object.defineProperty(pane, "clientHeight", { value: PANE_BOTTOM - PANE_TOP, configurable: true });
  pane.getBoundingClientRect = () => rect(PANE_TOP, PANE_BOTTOM);
  const dock = document.createElement("div");
  dock.className = "bonsai-main-tab-dock";
  dock.getBoundingClientRect = () => rect(DOCK_TOP, PANE_BOTTOM);
  document.body.appendChild(pane);
  pane.appendChild(container);
  pane.appendChild(dock);
  const place = (el: HTMLElement, top: number, bottom: number) => {
    el.getBoundingClientRect = () => rect(top - pane.scrollTop, bottom - pane.scrollTop);
  };
  const all = Array.from(container.querySelectorAll<HTMLElement>("button, [tabindex], .bonsai-answer-stop"));
  const isSectionEl = (el: HTMLElement) => el.classList.contains("bonsai-answer-stop");
  const leaves = all.filter((el) => isSectionEl(el) || !all.some((o) => o !== el && el.contains(o)));
  let y = PANE_TOP + 8;
  for (const el of leaves) {
    const h = isSectionEl(el) ? SECTION_PX : ROW_PX;
    place(el, y, y + h);
    y += h + 8;
  }
  const sections = leaves.filter(isSectionEl);
  const bubble = container.querySelector<HTMLElement>(".bonsai-chat-ai-bubble");
  if (bubble && sections.length) {
    const first = sections[0]!.getBoundingClientRect().top + pane.scrollTop;
    const last = sections[sections.length - 1]!.getBoundingClientRect().bottom + pane.scrollTop;
    place(bubble, first - 9, last + 9);
  }
  const after = () => {
    const el = document.activeElement as HTMLElement | null;
    if (el && container.contains(el)) steamGlide(el, pane, rule, { paneTop: PANE_TOP, dockTop: DOCK_TOP });
  };
  const visible = (el: Element) => {
    const r = el.getBoundingClientRect();
    return r.top >= PANE_TOP - 1 && r.bottom <= DOCK_TOP + 4;
  };
  return { pane, after, visible };
}

/** Press `dir` until the ring stops moving (or the cap), naming each landing; a section by its place in the answer. */
function walkNamed(container: HTMLElement, dir: "Up" | "Down", after: () => void, cap = 30): string[] {
  const sections = Array.from(container.querySelectorAll(".bonsai-chat-ai-bubble .bonsai-answer-stop"));
  const name = (el: Element | null) => {
    const at = sections.indexOf(el as Element);
    return at >= 0 ? `section ${at + 1}` : nameOf(el).slice(0, 40);
  };
  const seen = [name(document.activeElement)];
  for (let i = 0; i < cap; i += 1) {
    const before = document.activeElement;
    if (!press(container, dir, after) || document.activeElement === before) break;
    seen.push(name(document.activeElement));
  }
  return seen;
}

const isSection = (name: string) => name.startsWith("section ");

describe("an answer still writing: its sections are stops both ways (plan 93)", () => {
  beforeEach(() => {
    resetUiDocument();
    resetNavFocusRegistry();
    resetAnswerStopRegistry();
  });
  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
  });

  describe.each([
    ["with a notes block under the answer", true],
    ["with nothing between the answer and the chips", false],
  ])("%s", (_name, notes) => {
    it.each(["top", "padded", "center"] as ScrollRule[])(
      "%s rule: Up from the chip reaches every section, last to first, and Down from the question is its mirror",
      (rule) => {
        const chip = chipSlot();
        const { container, stamp } = writingChat(notes);
        stamp();
        const sections = container.querySelectorAll(".bonsai-chat-ai-bubble .bonsai-answer-stop");
        expect(sections.length).toBeGreaterThan(2);
        const model = deckPane(container, rule);
        const seenVisible: boolean[] = [];
        const after = () => {
          model.after();
          if (container.contains(document.activeElement)) seenVisible.push(model.visible(document.activeElement!));
        };

        act(() => {
          chip.focus();
        });
        act(() => {
          chipRowExitUp();
        });
        model.after();
        const up = walkNamed(container, "Up", after);
        if (process.env.WALK_DEBUG) console.log("UP  ", notes, rule, up.join(" > "));
        expect(up.filter(isSection)).toHaveLength(sections.length);
        expect(new Set(up).size).toBe(up.length);

        const question = container.querySelector<HTMLElement>(".bonsai-chat-turn-row-body, .bonsai-chat-turn-row-header");
        focusOn(question!);
        model.after();
        const down = walkNamed(container, "Down", after);
        if (process.env.WALK_DEBUG) console.log("DOWN", notes, rule, down.join(" > "));
        expect(new Set(down).size).toBe(down.length);
        expect(down).not.toContain("RETRY");
        expect(down[down.length - 1]).toBe(SLOT);
        // From the first section to the stop above the chip, Down is Up reversed (Up's last stop is above the answer).
        expect(down.slice(1, -1)).toEqual(up.slice(0, -1).reverse());
        expect(seenVisible.every(Boolean)).toBe(true);
      },
    );

    it("Down from the last section goes on below the answer, never back up to the turn's Retry", () => {
      const chip = chipSlot();
      const { container, stamp } = writingChat(notes);
      stamp();
      deckPane(container, "top");
      const sections = container.querySelectorAll<HTMLElement>(".bonsai-chat-ai-bubble .bonsai-answer-stop");
      const bubble = container.querySelector(".bonsai-chat-ai-bubble")!;
      focusOn(sections[sections.length - 1]!);

      // A press or two may only scroll the rest of the section into view; then the ring leaves the answer.
      for (let i = 0; i < 5 && bubble.contains(document.activeElement); i += 1) expect(press(container, "Down")).toBe(true);
      if (notes) expect(document.activeElement?.closest(".bonsai-kb-notes-block")).not.toBeNull();
      else expect(document.activeElement).toBe(chip);
    });
  });
});
