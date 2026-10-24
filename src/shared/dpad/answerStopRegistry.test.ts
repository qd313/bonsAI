import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  focusAnswerStop,
  focusedAnswerStopIndex,
  orderedAnswerStops,
  registerAnswerStop,
  resetAnswerStopRegistry,
} from "./answerStopRegistry";
import { resetUiDocument } from "./uiDocument";

/** Stand-in for the QAM popup document — see uiDocument.ts for why it is not `document`. */
function makeUiDocument(): Document {
  return document.implementation.createHTMLDocument("qam");
}

function makeBubble(doc: Document): HTMLElement {
  const bubble = doc.createElement("div");
  bubble.className = "bonsai-chat-ai-bubble Panel Focusable";
  doc.body.appendChild(bubble);
  return bubble;
}

function addStop(doc: Document, bubble: HTMLElement): HTMLElement {
  const stop = doc.createElement("div");
  stop.className = "bonsai-answer-stop Panel Focusable";
  bubble.appendChild(stop);
  return stop;
}

function setActiveElement(doc: Document, el: Element | null): void {
  Object.defineProperty(doc, "activeElement", { value: el, configurable: true });
}

describe("answer stop registry", () => {
  beforeEach(() => {
    resetAnswerStopRegistry();
    resetUiDocument();
    document.body.innerHTML = "";
  });

  it("has no stops for an answer that registered none", () => {
    const doc = makeUiDocument();
    expect(orderedAnswerStops("live", makeBubble(doc))).toEqual([]);
  });

  /* Sections stream in as they close, and the live tail re-registers on every partial, so arrival
     order is not render order. The index the renderer supplies is what decides the walk. */
  it("returns stops in render order however they registered", () => {
    const doc = makeUiDocument();
    const bubble = makeBubble(doc);
    const first = addStop(doc, bubble);
    const second = addStop(doc, bubble);
    const third = addStop(doc, bubble);

    registerAnswerStop("live", 2, third);
    registerAnswerStop("live", 0, first);
    registerAnswerStop("live", 1, second);

    expect(orderedAnswerStops("live", bubble)).toEqual([first, second, third]);
  });

  it("ignores stops belonging to another turn's bubble", () => {
    const doc = makeUiDocument();
    const mine = makeBubble(doc);
    const theirs = makeBubble(doc);
    const stop = addStop(doc, theirs);

    registerAnswerStop("live", 0, stop);

    expect(orderedAnswerStops("live", mine)).toEqual([]);
    expect(orderedAnswerStops("live", theirs)).toEqual([stop]);
  });

  it("keeps two answers' stops apart", () => {
    const doc = makeUiDocument();
    const liveBubble = makeBubble(doc);
    const histBubble = makeBubble(doc);
    const liveStop = addStop(doc, liveBubble);
    const histStop = addStop(doc, histBubble);

    registerAnswerStop("live", 0, liveStop);
    registerAnswerStop("turn-3", 0, histStop);

    expect(orderedAnswerStops("live", liveBubble)).toEqual([liveStop]);
    expect(orderedAnswerStops("turn-3", histBubble)).toEqual([histStop]);
  });

  it("treats a null ref as unmount", () => {
    const doc = makeUiDocument();
    const bubble = makeBubble(doc);
    const stop = addStop(doc, bubble);

    registerAnswerStop("live", 0, stop);
    registerAnswerStop("live", 0, null);

    expect(orderedAnswerStops("live", bubble)).toEqual([]);
  });

  /* React hands the inline ref a null and then the element on every re-render, so this is the
     ordinary path, not an edge case: the tail's index grows as closed blocks accumulate. */
  it("re-registering an index replaces the element", () => {
    const doc = makeUiDocument();
    const bubble = makeBubble(doc);
    const old = addStop(doc, bubble);
    const fresh = addStop(doc, bubble);

    registerAnswerStop("live", 0, old);
    registerAnswerStop("live", 0, null);
    registerAnswerStop("live", 0, fresh);

    expect(orderedAnswerStops("live", bubble)).toEqual([fresh]);
  });

  it("the live tail keeps its element when its index shifts", () => {
    const doc = makeUiDocument();
    const bubble = makeBubble(doc);
    const closed = addStop(doc, bubble);
    const tail = addStop(doc, bubble);

    registerAnswerStop("live", 0, tail);
    // A block closed: the tail is now section 1 and a new closed block owns 0.
    registerAnswerStop("live", 0, null);
    registerAnswerStop("live", 0, closed);
    registerAnswerStop("live", 1, tail);

    expect(orderedAnswerStops("live", bubble)).toEqual([closed, tail]);
  });

  describe("focusedAnswerStopIndex", () => {
    it("is -1 while focus is still on the bubble itself", () => {
      const doc = makeUiDocument();
      const bubble = makeBubble(doc);
      const stop = addStop(doc, bubble);
      registerAnswerStop("live", 0, stop);
      setActiveElement(doc, bubble);

      expect(focusedAnswerStopIndex(orderedAnswerStops("live", bubble))).toBe(-1);
    });

    /*
     * MICRO-04's defect, in the section walk rather than the reply row.
     *
     * Nothing calls `.focus()` before this, so there is no landing to verify -- it is a pure
     * "which section is the user in" question, and on device `activeElement` answers a different
     * one. A stale value inside another stop makes `at` a real but wrong index, so Down jumps to
     * `stops[at + 1]` (a section the user is not next to) or to `undefined`, which drops the whole
     * chain and hands the press back to Steam.
     */
    it("follows the ring, not activeElement, when the two disagree", () => {
      const doc = makeUiDocument();
      const bubble = makeBubble(doc);
      const first = addStop(doc, bubble);
      const second = addStop(doc, bubble);
      const third = addStop(doc, bubble);
      registerAnswerStop("live", 0, first);
      registerAnswerStop("live", 1, second);
      registerAnswerStop("live", 2, third);

      third.classList.add("gpfocus");
      setActiveElement(doc, first);

      expect(focusedAnswerStopIndex(orderedAnswerStops("live", bubble))).toBe(2);
    });

    it("finds the stop that holds focus", () => {
      const doc = makeUiDocument();
      const bubble = makeBubble(doc);
      const first = addStop(doc, bubble);
      const second = addStop(doc, bubble);
      registerAnswerStop("live", 0, first);
      registerAnswerStop("live", 1, second);
      setActiveElement(doc, second);

      expect(focusedAnswerStopIndex(orderedAnswerStops("live", bubble))).toBe(1);
    });

    /* A masked spoiler's own Focusable sits inside its section. Focus parked there still means the
       user is in that section, so Down from it must continue to the next one. */
    it("counts a nested control as being in its section", () => {
      const doc = makeUiDocument();
      const bubble = makeBubble(doc);
      const stop = addStop(doc, bubble);
      const fence = doc.createElement("div");
      fence.className = "bonsai-spoiler-reveal-target";
      stop.appendChild(fence);
      registerAnswerStop("live", 0, stop);
      setActiveElement(doc, fence);

      expect(focusedAnswerStopIndex(orderedAnswerStops("live", bubble))).toBe(0);
    });

    it("is -1 when focus left the turn entirely", () => {
      const doc = makeUiDocument();
      const bubble = makeBubble(doc);
      registerAnswerStop("live", 0, addStop(doc, bubble));
      setActiveElement(doc, doc.body);

      expect(focusedAnswerStopIndex(orderedAnswerStops("live", bubble))).toBe(-1);
    });
  });

  describe("focusAnswerStop", () => {
    /* Same rule as the spoiler fence: Decky navigates by the tabindex="0" it puts there, and
       replacing it with -1 takes the node back out of Steam's graph for the next press. */
    it("leaves Decky's own tabindex alone", () => {
      const bubble = document.createElement("div");
      document.body.appendChild(bubble);
      const stop = addStop(document, bubble);
      stop.setAttribute("tabindex", "0");

      focusAnswerStop(stop);

      expect(stop.getAttribute("tabindex")).toBe("0");
    });

    it("makes an untabbable stop focusable before focusing it", () => {
      const bubble = document.createElement("div");
      document.body.appendChild(bubble);
      const stop = addStop(document, bubble);

      expect(focusAnswerStop(stop)).toBe(true);
      expect(stop.getAttribute("tabindex")).toBe("-1");
    });

    /* The return value is a measurement, not an assumption — a walk that moved no focus must report
       false so the press falls through to scrolling instead of being swallowed. */
    it("reports false when focus does not land", () => {
      const bubble = document.createElement("div");
      document.body.appendChild(bubble);
      const stop = addStop(document, bubble);
      vi.spyOn(stop, "focus").mockImplementation(() => {
        /* focus refused, as a hidden or detached node would */
      });

      expect(focusAnswerStop(stop)).toBe(false);
    });

    it("is a no-op for null", () => {
      expect(focusAnswerStop(null)).toBe(false);
    });

    it("survives an element whose focus() throws", () => {
      const bubble = document.createElement("div");
      document.body.appendChild(bubble);
      const stop = addStop(document, bubble);
      vi.spyOn(stop, "focus").mockImplementation(() => {
        throw new Error("detached");
      });

      expect(() => focusAnswerStop(stop)).not.toThrow();
    });
  });
});
