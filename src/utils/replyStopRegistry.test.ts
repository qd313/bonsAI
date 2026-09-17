import { beforeEach, describe, expect, it } from "vitest";

import {
  focusRegisteredReplyStop,
  getReplyStop,
  registerReplyStop,
  REPLY_STOP_ORDER,
  setReplyStopUnavailable,
} from "./replyStopRegistry";

/** The shape Decky renders for a `Button`: one `<button>` carrying the Focusable class. */
function mountReplyRow(): { row: HTMLElement; retry: HTMLElement; details: HTMLElement } {
  document.body.innerHTML = `
    <div class="bonsai-chat-reply-actions-row--utility Panel Focusable">
      <button class="bonsai-chat-secondary-btn Focusable" id="retry">Retry</button>
      <button class="bonsai-chat-secondary-btn Focusable" id="details">Show details</button>
    </div>
  `;
  return {
    row: document.querySelector(".bonsai-chat-reply-actions-row--utility") as HTMLElement,
    retry: document.getElementById("retry") as HTMLElement,
    details: document.getElementById("details") as HTMLElement,
  };
}

describe("reply stop registry", () => {
  beforeEach(() => {
    for (const id of REPLY_STOP_ORDER) {
      registerReplyStop(id, null);
      setReplyStopUnavailable(id, false);
    }
    document.body.innerHTML = "";
  });

  /*
   * Plan 57: the Show reasoning line sits between the question and the answer, so a person walking
   * down meets it after Retry and before the answer's own Copy. The order is what every "which
   * stop has focus?" lookup scans, so the position matters, not just the presence.
   */
  it("walks Retry, then Show reasoning, then Copy", () => {
    expect(REPLY_STOP_ORDER.indexOf("show-reasoning")).toBe(
      REPLY_STOP_ORDER.indexOf("retry") + 1,
    );
    expect(REPLY_STOP_ORDER.indexOf("copy")).toBe(
      REPLY_STOP_ORDER.indexOf("show-reasoning") + 1,
    );
  });

  it("focuses the registered button itself, not the row around it", () => {
    const { retry } = mountReplyRow();
    registerReplyStop("retry", retry);

    expect(focusRegisteredReplyStop("retry")).toBe(true);
    expect(document.activeElement).toBe(retry);
  });

  /*
   * The regression this file exists for. The old helper stamped tabindex="-1" on every target it
   * touched — the button *and* its `.Panel.Focusable` row — which takes those nodes out of Steam's
   * navigation graph. Navigating into Retry was therefore what stopped Retry responding to a D-pad
   * press, and nothing below the reply row could be reached. Measured on device 2026-08-04.
   */
  it("does not stamp tabindex on the button or its row", () => {
    const { row, retry } = mountReplyRow();
    registerReplyStop("retry", retry);

    focusRegisteredReplyStop("retry");

    expect(retry.hasAttribute("tabindex")).toBe(false);
    expect(row.hasAttribute("tabindex")).toBe(false);
  });

  it("leaves an existing tabindex untouched", () => {
    const { retry } = mountReplyRow();
    retry.setAttribute("tabindex", "0");
    registerReplyStop("retry", retry);

    focusRegisteredReplyStop("retry");

    expect(retry.getAttribute("tabindex")).toBe("0");
  });

  it("makes a non-native focus owner focusable when it has no tabindex", () => {
    document.body.innerHTML = `<div class="Panel Focusable" id="stop"><span>Retry</span></div>`;
    const stop = document.getElementById("stop") as HTMLElement;
    registerReplyStop("retry", stop);

    expect(focusRegisteredReplyStop("retry")).toBe(true);
    expect(stop.getAttribute("tabindex")).toBe("-1");
    expect(document.activeElement).toBe(stop);
  });

  it("reports false for a stop that is not mounted", () => {
    expect(focusRegisteredReplyStop("show-details")).toBe(false);
  });

  it("forgets a stop when its ref is cleared", () => {
    const { retry } = mountReplyRow();
    registerReplyStop("retry", retry);
    expect(getReplyStop("retry")).toBe(retry);

    registerReplyStop("retry", null);

    expect(getReplyStop("retry")).toBeNull();
    expect(focusRegisteredReplyStop("retry")).toBe(false);
  });

  /*
   * "A greyed-out button still takes the highlight" (roadmap). Measured on the Deck 2026-09-16
   * (plan56-GREYED-STEP-OVER-01-thumbs.json): a "disabled" button on this build still accepts
   * `.focus()` — it is greyed by styling, not by the native HTML `disabled` attribute, which is
   * what `mountReplyRow`'s plain `<button>` would otherwise rely on browsers to block. A caller
   * that knows its own control is greyed marks it unavailable instead, and this proves that mark
   * is what keeps the walk off it even though the button itself would still happily take focus.
   */
  describe("setReplyStopUnavailable", () => {
    it("skips a stop marked unavailable even though the element itself would still take focus", () => {
      const { retry } = mountReplyRow();
      registerReplyStop("retry", retry);
      setReplyStopUnavailable("retry", true);

      expect(focusRegisteredReplyStop("retry")).toBe(false);
      expect(document.activeElement).not.toBe(retry);
      // The element itself is still a perfectly normal, focusable button — proving the block came
      // from the mark, not from anything about the element.
      retry.focus();
      expect(document.activeElement).toBe(retry);
    });

    it("stops skipping a stop once it is marked available again", () => {
      const { retry } = mountReplyRow();
      registerReplyStop("retry", retry);
      setReplyStopUnavailable("retry", true);
      expect(focusRegisteredReplyStop("retry")).toBe(false);

      setReplyStopUnavailable("retry", false);

      expect(focusRegisteredReplyStop("retry")).toBe(true);
      expect(document.activeElement).toBe(retry);
    });

    it("does not affect a different stop", () => {
      const { retry, details } = mountReplyRow();
      registerReplyStop("retry", retry);
      registerReplyStop("show-details", details);
      setReplyStopUnavailable("retry", true);

      expect(focusRegisteredReplyStop("show-details")).toBe(true);
      expect(document.activeElement).toBe(details);
    });
  });
});
