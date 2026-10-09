/**
 * Title: The ask bar's ring watch counts bonsAI's own title view as the plugin's
 * Purpose: Pin that in the watch's short windows after a reopen or a tab return, a ring on the chat's name
 *          (drawn by bonsAI in Decky's title bar, plan 84 step 5) is a plugin control the person can be on,
 *          not "Decky's header": the watch ends and the ring is left on the name. Before this, the name
 *          counted as outside the plugin, so the watch pulled it to the question box. A ring on the tab
 *          bar drawn in Decky's bar (plan 84 step 6) keeps the tab bar's own rule. Decky's back arrow
 *          beside them is still Decky's, and is still taken.
 * Used for: askBarRingWatch.ts.
 * Does not: Start windows (useAskBarInitialRingClaim's tests do that).
 */
import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createRingWatch } from "./askBarRingWatch";
import { clearModalReturnFocus } from "../features/plugin-shell/modalReturnFocusRegistry";
import { registerNavFocus, resetNavFocusRegistry } from "../utils/navFocusRegistry";
import { rememberUiDocument, resetUiDocument } from "../utils/uiDocument";

/** Quick Access's pane holding Decky's plugin box: Decky's title bar (back arrow, bonsAI's view), then bonsAI's box. */
function mountPanel(withStripBar: boolean) {
  const doc = document.implementation.createHTMLDocument("qam");
  const pane = doc.createElement("div");
  pane.id = "quickaccess_content_999";
  const box = doc.createElement("div");
  const title = doc.createElement("div");
  const arrow = doc.createElement("button");
  arrow.className = "DialogButton";
  const view = doc.createElement("div");
  view.className = "bonsai-chat-title bonsai-chat-title--main";
  const strip = doc.createElement("div");
  strip.className = "bonsai-tab-bar Panel Focusable";
  const name = doc.createElement("div");
  name.className = "bonsai-chat-title__name Panel Focusable";
  if (withStripBar) view.appendChild(strip);
  view.appendChild(name);
  title.append(arrow, view);
  const gap = doc.createElement("div");
  const scope = doc.createElement("div");
  scope.className = "bonsai-scope";
  const questionBox = doc.createElement("textarea");
  scope.appendChild(questionBox);
  gap.appendChild(scope);
  box.append(title, gap);
  pane.appendChild(box);
  /* Steam's column of tab icons, outside the pane. */
  const tabIcon = doc.createElement("div");
  tabIcon.id = "quickaccess_tab_999";
  doc.body.append(tabIcon, pane);
  Object.defineProperty(doc, "visibilityState", { get: () => "visible", configurable: true });
  rememberUiDocument(doc.body);
  const putRingOn = (el: HTMLElement | null) => {
    doc.querySelectorAll(".gpfocus").forEach((e) => e.classList.remove("gpfocus"));
    el?.classList.add("gpfocus");
  };
  const panel = { doc, scope, arrow, name, strip, tabIcon, questionBox, putRingOn };
  lastPanel = panel;
  return panel;
}

/** The panel the test built last: a transfer to the question box puts the ring there. */
let lastPanel: { putRingOn: (el: HTMLElement | null) => void; questionBox: HTMLElement } | null = null;

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

describe("the ring watch and bonsAI's title view in Decky's bar", () => {
  let takeFocus: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    resetNavFocusRegistry();
    resetUiDocument();
    clearModalReturnFocus();
    takeFocus = vi.fn(() => {
      lastPanel?.putRingOn(lastPanel.questionBox);
      return true;
    });
    registerNavFocus("unified-input", { current: { TakeFocus: takeFocus } });
  });
  afterEach(() => {
    vi.useRealTimers();
    resetUiDocument();
  });

  it("leaves the ring on the chat's name, and ends the window there", () => {
    const p = mountPanel(false);
    const watch = createRingWatch(p.doc, p.scope);
    watch.start();
    p.putRingOn(p.name);
    advance(500);
    expect(takeFocus).not.toHaveBeenCalled();
    /* The window ended on a plugin control: a walk Left onto the arrow later is the person's own. */
    p.putRingOn(p.arrow);
    advance(3000);
    expect(takeFocus).not.toHaveBeenCalled();
    watch.stop();
  });

  it("still takes the ring from Decky's back arrow beside the name", () => {
    const p = mountPanel(false);
    const watch = createRingWatch(p.doc, p.scope);
    watch.start();
    p.putRingOn(p.arrow);
    advance(300);
    expect(takeFocus).toHaveBeenCalledTimes(1);
    watch.stop();
  });

  it("a ring on the tab bar drawn in Decky's bar follows the tab bar's rule: taken in the first seconds only", () => {
    const early = mountPanel(true);
    const first = createRingWatch(early.doc, early.scope);
    first.start();
    early.putRingOn(early.strip);
    advance(300);
    expect(takeFocus).toHaveBeenCalledTimes(1);
    first.stop();

    takeFocus.mockClear();
    const late = mountPanel(true);
    const second = createRingWatch(late.doc, late.scope);
    second.start();
    late.putRingOn(late.tabIcon); // resting on Steam's tab icon: left alone
    advance(3500);
    late.putRingOn(late.strip);
    advance(500);
    expect(takeFocus).not.toHaveBeenCalled();
    second.stop();
  });
});
