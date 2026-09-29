import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  elementHasFocus,
  elementHasGamepadFocus,
  getUiDocument,
  rememberUiDocument,
  resetUiDocument,
  uiActiveElement,
  uiGamepadFocusElement,
  uiWindowMissingFocus,
} from "./uiDocument";

/**
 * Stand-in for the QAM popup document. On device the plugin's own UI is rendered into a document
 * that is not the one plugin code sees as `document` — that is the whole reason this module exists.
 */
function makeUiDocument(): Document {
  return document.implementation.createHTMLDocument("qam");
}

function setActiveElement(doc: Document, el: Element | null): void {
  Object.defineProperty(doc, "activeElement", { value: el, configurable: true });
}

describe("uiDocument", () => {
  beforeEach(() => {
    resetUiDocument();
  });

  it("falls back to the global document before anything has mounted", () => {
    expect(getUiDocument()).toBe(document);
  });

  it("learns the UI document from a mounted element", () => {
    const doc = makeUiDocument();
    const el = doc.createElement("div");
    doc.body.appendChild(el);

    rememberUiDocument(el);

    expect(getUiDocument()).toBe(doc);
    expect(getUiDocument()).not.toBe(document);
  });

  it("ignores a null ref, so unmount does not forget the document", () => {
    const doc = makeUiDocument();
    rememberUiDocument(doc.body);
    rememberUiDocument(null);
    expect(getUiDocument()).toBe(doc);
  });

  it("reads activeElement from the UI document, not the global one", () => {
    const doc = makeUiDocument();
    const focused = doc.createElement("button");
    doc.body.appendChild(focused);
    setActiveElement(doc, focused);
    rememberUiDocument(focused);

    // The global document's activeElement is its own <body> and knows nothing about `focused`.
    expect(document.activeElement).not.toBe(focused);
    expect(uiActiveElement()).toBe(focused);
  });

  describe("elementHasFocus", () => {
    it("is true for the focused element", () => {
      const doc = makeUiDocument();
      const el = doc.createElement("div");
      doc.body.appendChild(el);
      setActiveElement(doc, el);

      expect(elementHasFocus(el)).toBe(true);
    });

    it("is true for an ancestor of the focused element", () => {
      const doc = makeUiDocument();
      const panel = doc.createElement("div");
      const inner = doc.createElement("button");
      panel.appendChild(inner);
      doc.body.appendChild(panel);
      setActiveElement(doc, inner);

      expect(elementHasFocus(panel)).toBe(true);
    });

    it("is false when focus sits elsewhere", () => {
      const doc = makeUiDocument();
      const el = doc.createElement("div");
      const other = doc.createElement("div");
      doc.body.append(el, other);
      setActiveElement(doc, other);

      expect(elementHasFocus(el)).toBe(false);
    });

    it("is false for null", () => {
      expect(elementHasFocus(null)).toBe(false);
    });

    /*
     * The regression this module was written for: the old check was
     * `el.contains(document.activeElement)`, which compares against the *global* document. On device
     * that document is SharedJSContext's shell, so the answer was false for every element we had
     * just successfully focused, and every caller treated a working focus move as a failure.
     */
    it("does not consult the global document", () => {
      const doc = makeUiDocument();
      const el = doc.createElement("div");
      doc.body.appendChild(el);
      setActiveElement(doc, el);
      setActiveElement(document, document.body);

      expect(el.contains(document.activeElement)).toBe(false);
      expect(elementHasFocus(el)).toBe(true);
    });
  });

  /*
   * MICRO-04, measured on device 2026-08-26 with the Decky Plugin Studio sequence
   * runner and reproduced by script.
   *
   * `focusedStop()` in buildReplyActionsElement scans the four reply stops in
   * REPLY_STOP_ORDER and returns the one holding focus, so the row's single
   * onMove handler can tell the left column from the right. It asked with
   * `elementHasFocus`, which reads `activeElement`. Steam moves the gamepad ring
   * without moving activeElement, so the scan matched the wrong stop -- or the
   * first one -- and both column-aware branches became dead code:
   *
   *     Down from "Not really"   landed on Retry   (should be Show details)
   *     Up   from "Show details" landed on Helpful (should be Not really)
   *
   * The right column was unreachable vertically; the only way in was Retry then
   * Right. These pin the helper that fixed it.
   */
  describe("elementHasGamepadFocus", () => {
    it("follows the gamepad ring, not activeElement, when they disagree", () => {
      const doc = makeUiDocument();
      const helpful = doc.createElement("button");
      const notReally = doc.createElement("button");
      doc.body.append(helpful, notReally);
      // The exact disagreement measured on device.
      notReally.classList.add("gpfocus");
      setActiveElement(doc, helpful);

      expect(elementHasGamepadFocus(notReally)).toBe(true);
      expect(elementHasGamepadFocus(helpful)).toBe(false);
      // And the old answer, for contrast -- this is what made the bug.
      expect(elementHasFocus(helpful)).toBe(true);
    });

    it("scanning the four reply stops in order picks the column that owns the ring", () => {
      /*
       * A faithful copy of focusedStop()'s loop. Reading order matters: helpful
       * comes first, so an implementation that cannot tell the stops apart
       * returns "helpful" and the left column wins every time -- exactly the
       * device symptom.
       */
      const doc = makeUiDocument();
      const order = ["helpful", "not-really", "retry", "show-details"] as const;
      const stops: Record<string, HTMLElement> = {};
      for (const id of order) {
        const el = doc.createElement("button");
        el.id = id;
        doc.body.append(el);
        stops[id] = el;
      }
      stops["not-really"].classList.add("gpfocus");
      setActiveElement(doc, stops.helpful);

      const focusedStop = (): string | null => {
        for (const id of order) if (elementHasGamepadFocus(stops[id])) return id;
        return null;
      };
      expect(focusedStop()).toBe("not-really");
    });

    it("a registered wrapper counts when the ring sits on a node inside it", () => {
      const doc = makeUiDocument();
      const wrapper = doc.createElement("div");
      const inner = doc.createElement("button");
      wrapper.append(inner);
      doc.body.append(wrapper);
      inner.classList.add("gpfocus");
      setActiveElement(doc, null);

      expect(elementHasGamepadFocus(wrapper)).toBe(true);
    });

    it("a ring on a container does not claim every stop inside it", () => {
      // The reverse containment check is deliberately absent: with it, a ring on
      // the row would match all four stops and the first in reading order would
      // win -- the same left-column bug in a new disguise.
      const doc = makeUiDocument();
      const row = doc.createElement("div");
      const helpful = doc.createElement("button");
      const notReally = doc.createElement("button");
      row.append(helpful, notReally);
      doc.body.append(row);
      row.classList.add("gpfocus");
      setActiveElement(doc, null);

      expect(elementHasGamepadFocus(helpful)).toBe(false);
      expect(elementHasGamepadFocus(notReally)).toBe(false);
    });

    it("falls back to activeElement when nothing owns the ring", () => {
      // Desktop, jsdom, or the moment after a plugin opens. A confident "no"
      // here would break the mouse and touch paths.
      const doc = makeUiDocument();
      const el = doc.createElement("button");
      doc.body.append(el);
      setActiveElement(doc, el);

      expect(elementHasGamepadFocus(el)).toBe(true);
    });
  });
  /*
   * The lookup half of the same question, added 2026-08-26 alongside the
   * `ring-question` focus-lint rule.
   *
   * `elementHasGamepadFocus` answers "is the ring in THIS element" — it needs a
   * candidate. The answer-bubble path has none: `resolveFocusedAnswerBubble` has
   * to start from wherever the ring is and walk up to the bubble containing it.
   * That is what made the spoiler fence unreachable, because the only accessor
   * available for it read `activeElement`.
   */
  describe("uiGamepadFocusElement", () => {
    it("returns the element the ring sits on", () => {
      const doc = makeUiDocument();
      const el = doc.createElement("button");
      doc.body.append(el);
      el.classList.add("gpfocus");
      rememberUiDocument(el);

      expect(uiGamepadFocusElement()).toBe(el);
    });

    /*
     * The failure mode that matters, and the one a `??` fallback cannot catch:
     * activeElement does not come back null on device, it comes back STALE. A
     * caller that trusts it gets a real element in the wrong turn and never
     * reaches its fallback.
     */
    it("prefers the ring over a stale activeElement pointing somewhere else", () => {
      const doc = makeUiDocument();
      const previousTurn = doc.createElement("div");
      const currentTurn = doc.createElement("div");
      doc.body.append(previousTurn, currentTurn);
      currentTurn.classList.add("gpfocus");
      setActiveElement(doc, previousTurn);
      rememberUiDocument(currentTurn);

      expect(uiActiveElement()).toBe(previousTurn);
      expect(uiGamepadFocusElement()).toBe(currentTurn);
    });

    it("falls back to activeElement when nothing owns the ring", () => {
      const doc = makeUiDocument();
      const el = doc.createElement("button");
      doc.body.append(el);
      setActiveElement(doc, el);
      rememberUiDocument(el);

      expect(uiGamepadFocusElement()).toBe(el);
    });

    it("is null when nothing owns the ring and nothing has focus", () => {
      const doc = makeUiDocument();
      rememberUiDocument(doc.body);
      setActiveElement(doc, null);

      expect(uiGamepadFocusElement()).toBeNull();
    });
  });

  /*
   * Plan 76, measured on the Deck 2026-09-29 (docs/test-evidence/plan76-P76-TRAP-SPLIT.json): with a
   * game running, Quick Access sometimes reopens without the browser's focus on the panel's own
   * window, `document.hasFocus()` false. Every reopen that read false split Steam's ring from the
   * page's own focus on a later press; every one that read true never did. This helper is the read
   * half of the fix: it names the panel's window only in that state.
   */
  describe("uiWindowMissingFocus", () => {
    function panelDocument(state: { visible: boolean; focused: boolean }) {
      const doc = makeUiDocument();
      const win = { focus: vi.fn() };
      Object.defineProperty(doc, "defaultView", { value: win, configurable: true });
      Object.defineProperty(doc, "visibilityState", {
        get: () => (state.visible ? "visible" : "hidden"),
        configurable: true,
      });
      doc.hasFocus = vi.fn(() => state.focused);
      return { doc, win };
    }

    it("names the panel's own window when the panel is on screen without focus", () => {
      const { doc, win } = panelDocument({ visible: true, focused: false });
      rememberUiDocument(doc.body);

      expect(uiWindowMissingFocus()).toBe(win);
      // A read only: naming the window never asks it for anything.
      expect(win.focus).not.toHaveBeenCalled();
    });

    it("is null when the panel already has focus, the common case", () => {
      const { doc } = panelDocument({ visible: true, focused: true });
      rememberUiDocument(doc.body);

      expect(uiWindowMissingFocus()).toBeNull();
    });

    it("is null when the panel is not on screen", () => {
      const { doc } = panelDocument({ visible: false, focused: false });
      rememberUiDocument(doc.body);

      expect(uiWindowMissingFocus()).toBeNull();
    });

    it("is null before the panel's document is known, so no other window is ever named", () => {
      // Under Decky the fallback is SharedJSContext's own shell page, never the panel.
      expect(getUiDocument()).toBe(document);
      expect(uiWindowMissingFocus()).toBeNull();
    });

    it("is null when the known document is the global one (desktop, tests)", () => {
      rememberUiDocument(document.body);

      expect(uiWindowMissingFocus()).toBeNull();
    });
  });
});
