import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { splitResponseIntoChunks } from "./splitResponseIntoChunks";
import {
  elementIsWithinViewportOf,
  focusFirstAnswerChunk,
  focusLastAnswerChunk,
  handleAnswerBubbleMoveDown,
  handleAnswerBubbleMoveUp,
  revealBelowDock,
} from "./answerBubbleNavigation";
import { registerAnswerStop, resetAnswerStopRegistry } from "./answerStopRegistry";
import { registerAnswerBubbleEl } from "./answerBubbleElRegistry";
import { registerSpoilerFence, resetSpoilerFenceRegistry } from "./spoilerFenceRegistry";
import {
  findNextDrgGlossaryTermChipInView,
  registerDrgGlossaryTermChip,
  resetDrgGlossaryTermRegistry,
} from "./drgGlossaryTermRegistry";
import { resetUiDocument } from "./uiDocument";

/*
 * These describe the FINISHED answer's sections. A still-streaming answer is split by
 * prepareStreamMarkdown, not by this function — see buildAnswerBubbleElement.tsx.
 */
describe("finished answer sections", () => {
  it("puts three short paragraphs in one section, so Down does not waste two presses", () => {
    const body = "First paragraph.\n\nSecond paragraph.\n\nThird paragraph.";
    const chunks = splitResponseIntoChunks(body);
    expect(chunks).toHaveLength(1);
  });

  it("still splits once a paragraph fills about half a screen on its own", () => {
    const long = `${"word ".repeat(200).trim()}.`;
    const chunks = splitResponseIntoChunks(`${long}\n\n${long}`);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("returns one section for a short line", () => {
    const chunks = splitResponseIntoChunks("Short stream");
    expect(chunks).toHaveLength(1);
  });
});

/*
 * jsdom reports every rect as 0×0 and never scrolls, so the geometry the navigation reads has to be
 * supplied. `top`/`bottom` are the only fields the helpers consult (elementIsWithinViewportOf and
 * chunkHasContent{Above,Below}Viewport).
 */
function stubRect(el: HTMLElement, top: number, bottom: number): void {
  el.getBoundingClientRect = () =>
    ({
      top,
      bottom,
      left: 0,
      right: 0,
      width: 0,
      height: bottom - top,
      x: 0,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect;
}

const ANSWER_KEY = "live";

type StopLayout = { top: number; bottom: number };

/** Scroll viewport is 0–250; a stop outside that band is off screen. */
function buildBubble(layout: StopLayout[]): { bubble: HTMLElement; stops: HTMLElement[] } {
  const scroll = document.createElement("div");
  scroll.className = "TabContentsScroll";
  stubRect(scroll, 0, 250);
  document.body.appendChild(scroll);

  const bubble = document.createElement("div");
  bubble.className = "bonsai-chat-ai-bubble Panel Focusable";
  bubble.setAttribute("tabindex", "0");
  stubRect(bubble, 0, 300);
  /* jsdom ships no scrollIntoView; the geometry-nudge fallback calls it once the walk runs out. */
  bubble.scrollIntoView = () => {};
  scroll.appendChild(bubble);
  registerAnswerBubbleEl(ANSWER_KEY, bubble);

  const stops = layout.map((geo, i) => {
    const stop = document.createElement("div");
    stop.className = "bonsai-answer-stop Panel Focusable";
    stubRect(stop, geo.top, geo.bottom);
    bubble.appendChild(stop);
    registerAnswerStop(ANSWER_KEY, i, stop);
    return stop;
  });

  return { bubble, stops };
}

const noopChunkRef = { current: 0 };

const moveDown = (bubble: HTMLElement) =>
  handleAnswerBubbleMoveDown(bubble, noopChunkRef, 1, ANSWER_KEY);
const moveUp = (bubble: HTMLElement) =>
  handleAnswerBubbleMoveUp(bubble, noopChunkRef, 1, ANSWER_KEY);

/** Three sections, the last one scrolled below the fold. */
function threeSections() {
  return buildBubble([
    { top: 0, bottom: 100 },
    { top: 100, bottom: 200 },
    { top: 300, bottom: 400 },
  ]);
}

describe("walking answer sections with the D-pad", () => {
  beforeEach(() => {
    resetAnswerStopRegistry();
    resetSpoilerFenceRegistry();
    resetDrgGlossaryTermRegistry();
    resetUiDocument();
    registerAnswerBubbleEl(ANSWER_KEY, null);
    document.body.innerHTML = "";
  });

  it("Down from the bubble enters the first section", () => {
    const { bubble, stops } = threeSections();
    bubble.focus();

    expect(moveDown(bubble)).toBe(true);
    expect(document.activeElement).toBe(stops[0]);
  });

  it("Down steps one section at a time", () => {
    const { bubble, stops } = threeSections();
    bubble.focus();

    moveDown(bubble);
    expect(moveDown(bubble)).toBe(true);
    expect(document.activeElement).toBe(stops[1]);
  });

  /*
   * The next section is below the fold, so this press scrolls instead. Chasing it with focus would
   * skip the text between here and there — the same mistake the unconditional spoiler jump made.
   */
  it("does not jump to a section that is still off screen", () => {
    const { bubble, stops } = threeSections();
    bubble.focus();
    moveDown(bubble);
    moveDown(bubble);

    moveDown(bubble);

    expect(document.activeElement).toBe(stops[1]);
    expect(document.activeElement).not.toBe(stops[2]);
  });

  /*
   * After the user has scrolled, section 0 is above the fold and can never come back into view by
   * pressing Down. Entering at stops[0] regardless would make the whole chain unreachable.
   */
  it("Down enters at the first section actually on screen", () => {
    const { bubble, stops } = buildBubble([
      { top: -200, bottom: -100 },
      { top: 0, bottom: 100 },
    ]);
    bubble.focus();

    expect(moveDown(bubble)).toBe(true);
    expect(document.activeElement).toBe(stops[1]);
  });

  it("Up steps back one section", () => {
    const { bubble, stops } = threeSections();
    bubble.focus();
    moveDown(bubble);
    moveDown(bubble);

    expect(moveUp(bubble)).toBe(true);
    expect(document.activeElement).toBe(stops[0]);
  });

  /* From the first section Up has to yield, which is what hands focus back to the turn header. */
  it("Up from the first section yields instead of trapping", () => {
    const { bubble, stops } = threeSections();
    bubble.focus();
    moveDown(bubble);

    expect(moveUp(bubble)).toBe(false);
    expect(document.activeElement).toBe(stops[0]);
  });

  /*
   * Deliberate asymmetry with Down: arriving at the bubble on the way up means the user is leaving,
   * so diving into the last visible section would trap them one press short of the header.
   */
  it("Up from the bubble does not dive into the sections", () => {
    const { bubble } = threeSections();
    bubble.focus();

    expect(moveUp(bubble)).toBe(false);
    expect(document.activeElement).toBe(bubble);
  });

  /*
   * The masked-spoiler diversion still runs first. A section that hides a spoiler must offer the
   * reveal before the walk carries on past it (STREAM-03).
   */
  it("parks on a masked spoiler before continuing the walk", () => {
    const { bubble, stops } = threeSections();
    const fence = document.createElement("div");
    stubRect(fence, 100, 150);
    stops[1]!.appendChild(fence);
    registerSpoilerFence("s1", fence);
    bubble.focus();

    expect(moveDown(bubble)).toBe(true);
    expect(document.activeElement).toBe(fence);
  });

  it("resumes the walk from the section holding the revealed spoiler", () => {
    const { bubble, stops } = buildBubble([
      { top: 0, bottom: 100 },
      { top: 100, bottom: 200 },
    ]);
    const fence = document.createElement("div");
    stubRect(fence, 0, 50);
    stops[0]!.appendChild(fence);
    registerSpoilerFence("s1", fence);
    bubble.focus();

    moveDown(bubble);
    expect(document.activeElement).toBe(fence);

    // Focus sits inside section 0, so the next press continues to section 1 rather than restarting.
    expect(moveDown(bubble)).toBe(true);
    expect(document.activeElement).toBe(stops[1]);
  });

  /*
   * DRG Survivor glossary term chip (roadmap: tap-to-define jargon). Same diversion shape as the
   * masked-spoiler one above, since a term chip is likewise a nested Focusable inside plain reply
   * prose rather than a stop of its own — but geometric rather than visited-once: only chips after
   * the ring (Down) or before it (Up) are offered, so every pass can land on the chip and no pass
   * can be trapped by it ("consistently dpad focusable", maintainer 2026-08-28). See
   * drgGlossaryTermRegistry.ts.
   */
  it("parks on a glossary term chip before continuing the walk", () => {
    const { bubble, stops } = threeSections();
    const chip = document.createElement("div");
    stubRect(chip, 100, 150);
    stops[1]!.appendChild(chip);
    registerDrgGlossaryTermChip("kiting-1", chip);
    bubble.focus();

    expect(moveDown(bubble)).toBe(true);
    expect(document.activeElement).toBe(chip);
  });

  it("resumes the walk from the section holding the parked-on term chip", () => {
    const { bubble, stops } = buildBubble([
      { top: 0, bottom: 100 },
      { top: 100, bottom: 200 },
    ]);
    const chip = document.createElement("div");
    stubRect(chip, 0, 50);
    stops[0]!.appendChild(chip);
    registerDrgGlossaryTermChip("kiting-1", chip);
    bubble.focus();

    moveDown(bubble);
    expect(document.activeElement).toBe(chip);

    // Focus sits inside section 0, so the next press continues to section 1 rather than re-parking.
    expect(moveDown(bubble)).toBe(true);
    expect(document.activeElement).toBe(stops[1]);
  });

  it("Down never jumps back to a chip above the ring", () => {
    const { bubble, stops } = threeSections();
    const chip = document.createElement("div");
    stubRect(chip, 0, 50);
    stops[0]!.appendChild(chip);
    registerDrgGlossaryTermChip("kiting-1", chip);
    stops[1]!.setAttribute("tabindex", "-1");
    stops[1]!.focus();

    moveDown(bubble);
    expect(document.activeElement).not.toBe(chip);
  });

  it("Up parks back on a chip that was walked past", () => {
    const { bubble, stops } = buildBubble([
      { top: 0, bottom: 100 },
      { top: 100, bottom: 200 },
    ]);
    const chip = document.createElement("div");
    stubRect(chip, 0, 50);
    stops[0]!.appendChild(chip);
    registerDrgGlossaryTermChip("kiting-1", chip);
    bubble.focus();

    moveDown(bubble); // chip
    moveDown(bubble); // section 1
    expect(document.activeElement).toBe(stops[1]);

    expect(moveUp(bubble)).toBe(true);
    expect(document.activeElement).toBe(chip);
  });

  it("Up from the chip yields toward the header instead of trapping", () => {
    const { bubble, stops } = buildBubble([
      { top: 0, bottom: 100 },
      { top: 100, bottom: 200 },
    ]);
    const chip = document.createElement("div");
    stubRect(chip, 0, 50);
    stops[0]!.appendChild(chip);
    registerDrgGlossaryTermChip("kiting-1", chip);
    bubble.focus();

    moveDown(bubble);
    expect(document.activeElement).toBe(chip);

    expect(moveUp(bubble)).toBe(false);
  });

  it("a second pass down the same reply lands on the chip again", () => {
    // The old visited-once flag made this exact walk skip the chip forever after the first pass.
    const { bubble, stops } = buildBubble([
      { top: 0, bottom: 100 },
      { top: 100, bottom: 200 },
    ]);
    const chip = document.createElement("div");
    stubRect(chip, 0, 50);
    stops[0]!.appendChild(chip);
    registerDrgGlossaryTermChip("kiting-1", chip);
    bubble.focus();

    moveDown(bubble); // chip
    moveDown(bubble); // section 1

    bubble.focus(); // re-entering the reply from the header
    expect(moveDown(bubble)).toBe(true);
    expect(document.activeElement).toBe(chip);
  });

  it("offers a chip going up to a ring below the bubble (the reply-actions row)", () => {
    // The reply-actions row sits under the bubble in a different navigation container; its Up
    // handler asks this registry directly. A ring outside the bubble uses plain reading-order
    // geometry, so every chip above it is eligible.
    const { bubble, stops } = threeSections();
    const chip = document.createElement("div");
    stubRect(chip, 100, 150);
    stops[1]!.appendChild(chip);
    registerDrgGlossaryTermChip("kiting-1", chip);

    const showDetails = document.createElement("button");
    stubRect(showDetails, 420, 450);
    showDetails.setAttribute("tabindex", "-1");
    document.body.appendChild(showDetails);
    showDetails.focus();

    const found = findNextDrgGlossaryTermChipInView(bubble, () => true, "up");
    expect(found).toBe(chip);
  });

  it("does nothing for an answer with no sections registered", () => {
    const { bubble } = buildBubble([]);
    bubble.focus();

    expect(moveDown(bubble)).toBe(false);
    expect(document.activeElement).toBe(bubble);
  });
});

/*
 * Entering the bubble from outside it: the turn header's Down (buildTurnHeaderElement.tsx) and the
 * reply-actions row's Up (buildReplyActionsElement.tsx) both hand off here. Before this fix the
 * fallback landed on the bare bubble — a stop of its own — so the first press after Down (or Up)
 * consumed one press just to arrive, and only the next press actually entered a section. Filed
 * 2026-09-02: "Down from the chat slot lands on the whole reply before its first section."
 */
describe("focusFirstAnswerChunk / focusLastAnswerChunk", () => {
  beforeEach(() => {
    resetAnswerStopRegistry();
    resetSpoilerFenceRegistry();
    resetUiDocument();
    registerAnswerBubbleEl(ANSWER_KEY, null);
    document.body.innerHTML = "";
  });

  it("focusFirstAnswerChunk lands on the first section, not the bare bubble", () => {
    const { bubble, stops } = threeSections();

    expect(focusFirstAnswerChunk(ANSWER_KEY)).toBe(true);
    expect(document.activeElement).toBe(stops[0]);
    expect(document.activeElement).not.toBe(bubble);
  });

  it("focusLastAnswerChunk lands on the last section, not the bare bubble", () => {
    const { bubble, stops } = threeSections();

    expect(focusLastAnswerChunk(ANSWER_KEY)).toBe(true);
    expect(document.activeElement).toBe(stops[stops.length - 1]);
    expect(document.activeElement).not.toBe(bubble);
  });

  it("focusFirstAnswerChunk still prefers a masked spoiler over the first section", () => {
    const { stops } = threeSections();
    // The shape Decky actually renders (MainTabBonsaiAiMarkdownChunk.tsx): the reveal target is its
    // own Focusable, so it carries "Panel Focusable" itself rather than relying on an ancestor's.
    const reveal = document.createElement("div");
    reveal.className = "bonsai-spoiler-reveal-target Panel Focusable";
    stops[0]!.appendChild(reveal);

    expect(focusFirstAnswerChunk(ANSWER_KEY)).toBe(true);
    expect(document.activeElement).toBe(reveal);
  });

  /*
   * The bug this repo measured on device 2026-09-05 (round35-spoiler-block-down-and-up.json): Down
   * from the question went straight to a hidden spoiler block and never stopped on either paragraph
   * ahead of it. The old rule grabbed the FIRST `.bonsai-spoiler-reveal-target` anywhere in the
   * bubble, regardless of which section it was nested in; a spoiler in a later section (its own
   * chunk, after real paragraphs) was still preferred over stops[0]. Fixed: the spoiler wins only
   * when it sits inside the first section — a later one is reached in its own turn by the ordinary
   * per-press walk.
   */
  it("focusFirstAnswerChunk enters at the first section when the masked spoiler is a LATER section", () => {
    const { stops } = threeSections();
    const reveal = document.createElement("div");
    reveal.className = "bonsai-spoiler-reveal-target Panel Focusable";
    stops[1]!.appendChild(reveal); // second section, not the first

    expect(focusFirstAnswerChunk(ANSWER_KEY)).toBe(true);
    expect(document.activeElement).toBe(stops[0]);
    expect(document.activeElement).not.toBe(reveal);
  });

  it("focusFirstAnswerChunk falls back to the bubble when it has no registered sections", () => {
    const { bubble } = buildBubble([]);

    expect(focusFirstAnswerChunk(ANSWER_KEY)).toBe(true);
    expect(document.activeElement).toBe(bubble);
  });

  it("focusLastAnswerChunk falls back to the bubble when it has no registered sections", () => {
    const { bubble } = buildBubble([]);

    expect(focusLastAnswerChunk(ANSWER_KEY)).toBe(true);
    expect(document.activeElement).toBe(bubble);
  });
});

/*
 * The Main tab's dock is sticky inside the scroll container, so the container's bottom edge is well
 * below the last readable pixel. Measured on the Deck 2026-09-06: the last part of a long answer sat
 * a third behind the Ask bar with the ring on it, because every check compared against the container.
 */
describe("the readable band stops at the dock, not the panel edge", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    resetUiDocument();
  });

  /** jsdom reports every rect as 0x0, so the geometry the helpers read has to be supplied. */
  function stubRect(el: HTMLElement, top: number, bottom: number) {
    el.getBoundingClientRect = () =>
      ({ top, bottom, left: 0, right: 100, width: 100, height: bottom - top }) as DOMRect;
  }

  function panelWithDock(dockTop: number | null) {
    document.body.innerHTML = `
      <div id="scroll"><div id="section"></div>${
        dockTop === null ? "" : '<div class="bonsai-main-tab-dock"></div>'
      }</div>`;
    const scroll = document.getElementById("scroll") as HTMLElement;
    stubRect(scroll, 0, 700);
    Object.defineProperty(scroll, "scrollHeight", { value: 2000, configurable: true });
    Object.defineProperty(scroll, "clientHeight", { value: 700, configurable: true });
    scroll.scrollTop = 0;
    const dock = scroll.querySelector(".bonsai-main-tab-dock") as HTMLElement | null;
    if (dock && dockTop !== null) stubRect(dock, dockTop, 700);
    return scroll;
  }

  it("does not call a section in view when it sits entirely behind the dock", () => {
    const scroll = panelWithDock(500);
    const section = document.getElementById("section") as HTMLElement;
    stubRect(section, 520, 660);
    expect(elementIsWithinViewportOf(section, scroll)).toBe(false);
  });

  it("still calls a section in view when it is above the dock", () => {
    const scroll = panelWithDock(500);
    const section = document.getElementById("section") as HTMLElement;
    stubRect(section, 100, 400);
    expect(elementIsWithinViewportOf(section, scroll)).toBe(true);
  });

  it("falls back to the panel edge on a tab with no dock", () => {
    const scroll = panelWithDock(null);
    const section = document.getElementById("section") as HTMLElement;
    stubRect(section, 520, 660);
    expect(elementIsWithinViewportOf(section, scroll)).toBe(true);
  });

  it("scrolls a section out from under the dock, by just enough", () => {
    const scroll = panelWithDock(500);
    const section = document.getElementById("section") as HTMLElement;
    /* 100 tall band overrun: bottom 600 against a readable bottom of 500. */
    stubRect(section, 300, 600);
    expect(revealBelowDock(section, scroll)).toBe(true);
    expect(scroll.scrollTop).toBe(100);
  });

  it("never scrolls a tall section's own start off the top", () => {
    const scroll = panelWithDock(500);
    const section = document.getElementById("section") as HTMLElement;
    /* Starts 40 below the top, runs 300 past the dock: it may only move by the 40 it has. */
    stubRect(section, 40, 800);
    expect(revealBelowDock(section, scroll)).toBe(true);
    expect(scroll.scrollTop).toBe(40);
  });

  it("does nothing when the section already clears the dock", () => {
    const scroll = panelWithDock(500);
    const section = document.getElementById("section") as HTMLElement;
    stubRect(section, 100, 400);
    expect(revealBelowDock(section, scroll)).toBe(false);
    expect(scroll.scrollTop).toBe(0);
  });
});
