/**
 * Title: Hidden tab header trap
 * Purpose: Pin that a ring landing on a hidden Steam tab button is handed to the tab bar, and that
 *          nothing else in the tabs root triggers the handover.
 * Used for: plan 30 W4 (TAB-BAR-05 is the on-device half).
 * Solves: The trap is a MutationObserver, which is easy to leave watching the wrong thing.
 * Does not: Prove Steam accepts the handover; jsdom has no gamepad tree.
 *
 * The realm-crossing tests below build their DOM in a second, genuinely separate `JSDOM` instance
 * rather than `document.implementation.createHTMLDocument()`, which was tried first and measured
 * (2026-09-04) NOT to reproduce the bug: a node built there is still `instanceof Element` true in
 * this project's jsdom, because it shares this file's own `Element`/`Node` constructors -- jsdom does
 * not mint a second one for a second `Document` instance the way a real iframe or a separate `JSDOM`
 * does. A real `new JSDOM(...)` gives a node whose `instanceof Element` (checked from this file) is
 * false, the same way a QuickAccess popup-document node is foreign to SharedJSContext's own `Element`.
 */
import { render } from "@testing-library/react";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isElementLike, useHiddenTabHeaderTrap } from "./useHiddenTabHeaderTrap";
import { registerNavFocus, resetNavFocusRegistry } from "../../utils/navFocusRegistry";
import { rememberUiDocument, resetUiDocument } from "../../utils/uiDocument";

function Host() {
  useHiddenTabHeaderTrap();
  return null;
}

const tick = () => new Promise((r) => setTimeout(r, 0));

describe("useHiddenTabHeaderTrap", () => {
  let root: HTMLElement;
  let hiddenButton: HTMLElement;
  let bodyButton: HTMLElement;
  let takeFocus: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    document.body.innerHTML = `
      <div class="bonsai-scope">
        <div class="bonsai-decky-tabs-root">
          <div class="Panel Focusable">
            <div class="header" style="display:none">
              <div class="Panel Focusable" data-test="hidden-tab"><div class="bonsai-tab-title-leaf"></div></div>
            </div>
            <div class="body"><button class="Focusable" data-test="body">x</button></div>
          </div>
        </div>
      </div>`;
    root = document.querySelector(".bonsai-decky-tabs-root") as HTMLElement;
    hiddenButton = document.querySelector('[data-test="hidden-tab"]') as HTMLElement;
    bodyButton = document.querySelector('[data-test="body"]') as HTMLElement;
    rememberUiDocument(root);
    resetNavFocusRegistry();
    takeFocus = vi.fn(() => true);
    registerNavFocus("tab-bar", { current: { TakeFocus: takeFocus } });
  });

  afterEach(() => {
    resetNavFocusRegistry();
    resetUiDocument();
    document.body.innerHTML = "";
  });

  it("hands the ring to the bar when a hidden tab button gains gpfocus", async () => {
    render(<Host />);
    hiddenButton.classList.add("gpfocus");
    await tick();
    expect(takeFocus).toHaveBeenCalledWith(true);
  });

  it("ignores the ring landing on a real control in the body", async () => {
    render(<Host />);
    bodyButton.classList.add("gpfocus");
    await tick();
    expect(takeFocus).not.toHaveBeenCalled();
  });

  it("stops watching when the bar unmounts", async () => {
    const { unmount } = render(<Host />);
    unmount();
    hiddenButton.classList.add("gpfocus");
    await tick();
    expect(takeFocus).not.toHaveBeenCalled();
  });

  it("bounces a hidden tab button that already holds gpfocus the moment the trap attaches", async () => {
    // A remount (the Clear cache confirmation closing) can hand the ring to the hidden button
    // before this effect ever runs, so there is no later mutation for the observer to see.
    hiddenButton.classList.add("gpfocus");
    render(<Host />);
    await tick();
    expect(takeFocus).toHaveBeenCalledWith(true);
  });

  it("does not bounce on attach when gpfocus sits on a real body control", async () => {
    bodyButton.classList.add("gpfocus");
    render(<Host />);
    await tick();
    expect(takeFocus).not.toHaveBeenCalled();
  });

  it("bounces when a fresh hidden tab button is inserted already holding gpfocus", async () => {
    // A QAM chord close/reopen does not remount this component (TabIndicatorBar and the tabs root
    // share one fragment, which is never rebuilt on purpose), so the effect stays attached
    // the whole time -- but Steam's own header can still rebuild its child nodes, and a node born
    // with `gpfocus` already set produces a childList record, never an attributes one.
    render(<Host />);
    const header = document.querySelector(".header") as HTMLElement;
    const fresh = document.createElement("div");
    fresh.className = "Panel Focusable gpfocus";
    fresh.setAttribute("data-test", "fresh-hidden-tab");
    const leaf = document.createElement("div");
    leaf.className = "bonsai-tab-title-leaf";
    fresh.appendChild(leaf);
    header.appendChild(fresh);
    await tick();
    expect(takeFocus).toHaveBeenCalledWith(true);
  });

  describe("across a genuine realm boundary (2026-09-04 device finding)", () => {
    let other: JSDOM;

    afterEach(() => {
      other?.window.close();
    });

    it("isElementLike accepts a foreign-realm element and rejects a non-element", () => {
      other = new JSDOM(`<div id="el"></div>`);
      const foreignEl = other.window.document.getElementById("el");
      // Sanity: this really is a different realm from this file's own, the way a QuickAccess
      // popup-document node is foreign to SharedJSContext.
      expect(foreignEl instanceof Element).toBe(false);
      expect(isElementLike(foreignEl)).toBe(true);
      expect(isElementLike({ nodeType: 1 })).toBe(false); // has nodeType but no classList/querySelector
      expect(isElementLike(null)).toBe(false);
      expect(isElementLike("not a node")).toBe(false);
    });

    it("bounces a class change on an existing hidden button when root and target are both foreign", async () => {
      // Reproduces the 2026-09-04 device finding exactly: a RIGHT press moved gpfocus from the
      // hidden Main button to the already-existing hidden Ollama button
      // (runs/TAB-BAR-11-a-after-suspend-resume-hidden-button.json) -- an attributes mutation on a
      // pre-existing node, which the old `instanceof Element` guard silently dropped because every
      // node this observer is ever handed is foreign to this module's own realm, not just some of
      // them.
      other = new JSDOM(
        `<div class="bonsai-decky-tabs-root"><div data-test="foreign-hidden" class="Panel Focusable"><div class="bonsai-tab-title-leaf"></div></div></div>`,
      );
      const foreignRoot = other.window.document.querySelector(".bonsai-decky-tabs-root");
      const foreignHidden = other.window.document.querySelector('[data-test="foreign-hidden"]');
      expect(foreignHidden instanceof Element).toBe(false);
      rememberUiDocument(foreignRoot as unknown as Node);

      render(<Host />);
      foreignHidden!.classList.add("gpfocus");
      await tick();
      expect(takeFocus).toHaveBeenCalledWith(true);
    });

    it("bounces a fresh foreign-realm node inserted already holding gpfocus", async () => {
      other = new JSDOM(`<div class="bonsai-decky-tabs-root"><div class="header"></div></div>`);
      const foreignRoot = other.window.document.querySelector(".bonsai-decky-tabs-root");
      const foreignHeader = other.window.document.querySelector(".header")!;
      rememberUiDocument(foreignRoot as unknown as Node);

      render(<Host />);
      const fresh = other.window.document.createElement("div");
      fresh.className = "Panel Focusable gpfocus";
      const leaf = other.window.document.createElement("div");
      leaf.className = "bonsai-tab-title-leaf";
      fresh.appendChild(leaf);
      expect(fresh instanceof Element).toBe(false);
      foreignHeader.appendChild(fresh);
      await tick();
      expect(takeFocus).toHaveBeenCalledWith(true);
    });
  });
});
