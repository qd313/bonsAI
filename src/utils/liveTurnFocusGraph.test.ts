import { describe, expect, it } from "vitest";

import {
  focusAnyContextChipLadder,
  focusBottomOfNewestReply,
  focusDeckOwner,
  focusOwnBonsaiRow,
  focusDownFromLiveAnswerBubble,
  focusDownFromReplyUtilityRow,
  focusLastSessionContextRow,
  focusReplyHelpful,
  focusReplyNotReally,
  focusReplyRetry,
  focusReplyShowDetails,
  focusUpFromBelowContextChipLadder,
  focusUpFromReplyActions,
  queryLiveTurnSlot,
} from "./liveTurnFocusGraph";
import { REPLY_STOP_ORDER, registerReplyStop } from "./replyStopRegistry";

function mountLiveTurn(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body;
}

describe("liveTurnFocusGraph", () => {
  it("queryLiveTurnSlot finds the live turn container", () => {
    mountLiveTurn(`
      <div class="bonsai-chat-turn-slot">
        <div class="bonsai-chat-turn-row-header bonsai-chat-turn-row-header--live"></div>
      </div>
    `);
    expect(queryLiveTurnSlot(document.body)?.classList.contains("bonsai-chat-turn-slot")).toBe(true);
  });

  it("focusDeckOwner prefers Panel.Focusable wrapper", () => {
    mountLiveTurn(`
      <div class="Panel Focusable" tabindex="-1">
        <button type="button">Inner</button>
      </div>
    `);
    const btn = document.querySelector("button");
    expect(focusDeckOwner(btn)).toBe(true);
    expect((document.activeElement as HTMLElement)?.classList.contains("Focusable")).toBe(true);
  });

  /*
   * PERM-JUMP-01's redo, measured on device 2026-09-04 (build 49241e7): with the ring genuinely on
   * Retry, Copy and Open Permissions in turn, every one read `tabindex: null` — real Steam
   * Focusables carry no `tabindex` attribute here at all, unlike this file's other fixtures (all
   * pre-stamped `tabindex="-1"` for exactly this reason). The old "stamp whenever one is absent"
   * guard therefore fired on a genuine `.Panel.Focusable` it had climbed to, and the stamp itself is
   * what dropped `.bonsai-chat-vac-deny-row` out of Steam's nav graph (same shape as REPLY-DOWN-01,
   * 2026-08-04, docs/testing.md — `focusRegisteredReplyStop` stamping `-1` onto Retry and its row).
   * This fixture matches the bug's actual shape: a native `<button>` (needs no tabindex — buttons
   * are natively focusable) nested in a wrapping Focusable that, on device, has none either.
   */
  it("focusDeckOwner never stamps a tabindex onto a genuine Panel.Focusable it climbed to", () => {
    mountLiveTurn(`
      <div class="Panel Focusable">
        <button type="button">Inner</button>
      </div>
    `);
    const wrapper = document.querySelector(".Panel.Focusable") as HTMLElement;
    const btn = document.querySelector("button") as HTMLElement;
    expect(focusDeckOwner(btn)).toBe(true);
    // The wrapper is left exactly as Steam rendered it — no attribute added at all.
    expect(wrapper.hasAttribute("tabindex")).toBe(false);
    // The natively-focusable button itself is what actually holds the ring, via the existing
    // `el.focus()` fallback for when `target` (the wrapper) cannot be focused.
    expect(document.activeElement).toBe(btn);
  });

  /*
   * The one case this change accepts as an honest `false` rather than a misleading `true`: a target
   * that is itself a genuine Panel.Focusable, has no tabindex on device, and has no natively
   * focusable descendant to fall back to. Before this change the function stamped it, which is
   * exactly the corruption above — and the alternative (silently reporting success while nothing was
   * actually focused) is not better. Every caller already treats `false` as "fall through to the
   * next option in the chain", the same as if the target had not resolved at all.
   */
  it("focusDeckOwner reports false rather than stamp a bare Panel.Focusable leaf with no fallback", () => {
    mountLiveTurn(`<div class="Panel Focusable bonsai-chip-ladder"></div>`);
    const leaf = document.querySelector(".Panel.Focusable") as HTMLElement;
    expect(focusDeckOwner(leaf)).toBe(false);
    expect(leaf.hasAttribute("tabindex")).toBe(false);
  });

  /* The fallback the stamp still exists for: a plain element of ours, not a Steam Focusable at all
     (no `.Panel.Focusable` anywhere in its ancestry), needs a synthetic tabindex to be focusable. */
  it("focusDeckOwner still stamps a tabindex onto a plain element that is not a Steam Focusable", () => {
    mountLiveTurn(`<div class="bonsai-session-context-strip"></div>`);
    const plain = document.querySelector(".bonsai-session-context-strip") as HTMLElement;
    expect(focusDeckOwner(plain)).toBe(true);
    expect(plain.getAttribute("tabindex")).toBe("-1");
    expect(document.activeElement).toBe(plain);
  });

  it("focusDownFromLiveAnswerBubble prefers branch buttons over thumbs", () => {
    mountLiveTurn(`
      <div class="bonsai-chat-turn-slot">
        <div class="bonsai-chat-turn-row-header bonsai-chat-turn-row-header--live"></div>
        <div class="bonsai-chat-ai-bubble Panel Focusable" tabindex="-1"></div>
        <div class="bonsai-strategy-branch-picker">
          <div class="Panel Focusable" tabindex="-1"><button type="button">A</button></div>
          <div class="Panel Focusable" tabindex="-1"><button type="button">B</button></div>
        </div>
        <div class="bonsai-chat-reply-actions">
          <div class="Panel Focusable" tabindex="-1">
            <button class="bonsai-chat-secondary-btn" aria-label="Mark reply helpful">Helpful</button>
          </div>
        </div>
      </div>
    `);
    const slot = queryLiveTurnSlot(document.body);
    expect(focusDownFromLiveAnswerBubble(slot)).toBe(true);
    expect(document.activeElement?.textContent).toContain("A");
  });

  it("focusUpFromReplyActions prefers checklist then branch over bubble", () => {
    mountLiveTurn(`
      <div class="bonsai-chat-turn-slot">
        <div class="bonsai-chat-turn-row-header bonsai-chat-turn-row-header--live"></div>
        <div class="bonsai-chat-ai-bubble Panel Focusable" tabindex="-1">Answer</div>
        <div class="bonsai-strategy-branch-picker">
          <div class="Panel Focusable" tabindex="-1"><button type="button">Branch</button></div>
        </div>
        <div class="bonsai-strategy-checklist-panel">
          <div class="Panel Focusable" tabindex="-1"><button type="button">Check</button></div>
        </div>
        <div class="bonsai-chat-reply-actions">
          <div class="Panel Focusable" tabindex="-1">
            <button class="bonsai-chat-secondary-btn" aria-label="Mark reply helpful">Helpful</button>
          </div>
        </div>
      </div>
    `);
    const slot = queryLiveTurnSlot(document.body);
    expect(focusUpFromReplyActions(slot)).toBe(true);
    expect(document.activeElement?.textContent).toContain("Check");
  });

  it("column helpers focus Not really / Show details / Retry / Helpful", () => {
    /*
     * The shape Decky actually renders, verified on device: a Decky `Button` is a single
     * `<button class="… Focusable">` and the registered stop IS that button — there is no
     * `.Panel.Focusable` wrapper per stop, only the row. The previous fixture wrapped each button
     * in one, which made the row the first focus candidate and hid the fact that a wrapper-first
     * ladder lands focus on the whole row instead of the button.
     */
    mountLiveTurn(`
      <div class="bonsai-chat-turn-slot">
        <div class="bonsai-chat-turn-row-header bonsai-chat-turn-row-header--live"></div>
        <div class="bonsai-chat-reply-actions Panel Focusable">
          <div class="bonsai-chat-reply-actions-row Panel Focusable">
            <button class="bonsai-chat-secondary-btn Focusable" id="stop-helpful">Helpful</button>
            <button class="bonsai-chat-secondary-btn Focusable" id="stop-not-really">Not really</button>
          </div>
          <div class="bonsai-chat-reply-actions-row--utility Panel Focusable">
            <button class="bonsai-chat-secondary-btn Focusable" id="stop-retry">Retry</button>
            <button class="bonsai-chat-secondary-btn Focusable" id="stop-show-details">Show details</button>
          </div>
        </div>
      </div>
    `);
    registerReplyStop("helpful", document.getElementById("stop-helpful"));
    registerReplyStop("not-really", document.getElementById("stop-not-really"));
    registerReplyStop("retry", document.getElementById("stop-retry"));
    registerReplyStop("show-details", document.getElementById("stop-show-details"));
    const slot = queryLiveTurnSlot(document.body);
    expect(focusReplyNotReally(slot)).toBe(true);
    expect(document.activeElement?.id).toBe("stop-not-really");
    expect(focusReplyShowDetails(slot)).toBe(true);
    expect(document.activeElement?.id).toBe("stop-show-details");
    expect(focusReplyRetry(slot)).toBe(true);
    expect(document.activeElement?.id).toBe("stop-retry");
    expect(focusReplyHelpful(slot)).toBe(true);
    expect(document.activeElement?.id).toBe("stop-helpful");
  });

  /*
   * The focus trap recorded on device 2026-08-23 (DeckRecord_20260823_170847_game.mkv). With
   * *Show details* collapsed there is no inline ladder, so a plain first-match query found the
   * session context strip's own ladder and the strip header's Up handler fed the ring straight
   * back into the strip it was trying to leave.
   */
  it("focusAnyContextChipLadder ignores the session context strip's own ladder", () => {
    mountLiveTurn(`
      <div class="bonsai-session-context-strip">
        <div class="bonsai-chip-ladder Focusable" tabindex="-1" id="strip-ladder"></div>
      </div>
    `);
    expect(focusAnyContextChipLadder()).toBe(false);
    expect(document.activeElement?.id).not.toBe("strip-ladder");
  });

  it("focusAnyContextChipLadder still finds the transcript ladder when both are mounted", () => {
    mountLiveTurn(`
      <div class="bonsai-chat-turn-slot">
        <div class="bonsai-chip-ladder Focusable" tabindex="-1" id="inline-ladder"></div>
      </div>
      <div class="bonsai-session-context-strip">
        <div class="bonsai-chip-ladder Focusable" tabindex="-1" id="strip-ladder"></div>
      </div>
    `);
    expect(focusAnyContextChipLadder()).toBe(true);
    expect(document.activeElement?.id).toBe("inline-ladder");
  });

  it("focusLastSessionContextRow targets the row list above the strip's ladder", () => {
    mountLiveTurn(`
      <div class="bonsai-session-context-strip">
        <div class="bonsai-session-context-row Focusable" tabindex="-1" id="row-1"></div>
        <div class="bonsai-session-context-row Focusable" tabindex="-1" id="row-2"></div>
        <div class="bonsai-chip-ladder Focusable" tabindex="-1" id="strip-ladder"></div>
      </div>
    `);
    expect(focusLastSessionContextRow()).toBe(true);
    expect(document.activeElement?.id).toBe("row-2");
  });

  it("focusLastSessionContextRow reports failure when the strip is collapsed", () => {
    mountLiveTurn(`<div class="bonsai-session-context-strip"></div>`);
    expect(focusLastSessionContextRow()).toBe(false);
  });

  /*
   * The round trip the CONTEXT-LADDER row exists for.
   *
   * Measured on device 2026-08-26 by the Decky Plugin Studio sequence runner, with
   * nobody at the Deck. Down from the utility row enters the ladder at chip 1;
   * Right past chip 6 leaves it downward onto the session context strip; Up from
   * there comes back to the ladder at chip 6; Up again steps back down the chips
   * and escapes to Retry at chip 1. The ring is not trapped in either direction.
   *
   * Both halves of that trip -- focusDownFromReplyUtilityRow and
   * focusUpFromBelowContextChipLadder -- had NO test before this, which is why
   * the row sat unverified for three days after a fix had already shipped. The
   * fix was real; nothing pinned it. These pin it.
   */
  function resetReplyStops(): void {
    for (const id of REPLY_STOP_ORDER) registerReplyStop(id, null);
  }

  /** Utility row plus, optionally, an expanded transparency ladder. */
  function mountTurnWithUtilityRow(extra = ""): HTMLElement | null {
    resetReplyStops();
    mountLiveTurn(`
      <div class="bonsai-chat-turn-slot">
        <div class="bonsai-chat-turn-row-header bonsai-chat-turn-row-header--live"></div>
        <div class="bonsai-chat-reply-actions Panel Focusable">
          <div class="bonsai-chat-reply-actions-row--utility Panel Focusable">
            <button class="bonsai-chat-secondary-btn Focusable" id="stop-retry">Retry</button>
            <button class="bonsai-chat-secondary-btn Focusable" id="stop-show-details">Show details</button>
          </div>
        </div>
        ${extra}
      </div>
    `);
    registerReplyStop("retry", document.getElementById("stop-retry"));
    registerReplyStop("show-details", document.getElementById("stop-show-details"));
    return queryLiveTurnSlot(document.body);
  }

  const INLINE_LADDER =
    '<div class="bonsai-chip-ladder Panel Focusable" tabindex="-1" id="inline-ladder"></div>';

  it("Down from the utility row enters the transparency ladder when details are open", () => {
    const slot = mountTurnWithUtilityRow(INLINE_LADDER);
    expect(focusDownFromReplyUtilityRow(slot)).toBe(true);
    expect(document.activeElement?.id).toBe("inline-ladder");
  });

  it("Up from below returns to the ladder it just left", () => {
    // The one-way-carousel claim, in one assertion: leave the ladder downward,
    // press Up, and land back on the same element. Focus has to genuinely move
    // off the ladder first or this passes without testing anything, so the
    // fixture carries the collapsed session strip the ring exits onto -- which
    // is where it landed on device (Chip 6 -> "Session context (1 turn)").
    const slot = mountTurnWithUtilityRow(INLINE_LADDER);
    expect(focusDownFromReplyUtilityRow(slot)).toBe(true);
    const left = document.activeElement?.id;
    expect(left).toBe("inline-ladder");

    document.body.insertAdjacentHTML(
      "beforeend",
      '<div class="bonsai-session-context-strip Panel Focusable" tabindex="-1" id="strip"></div>',
    );
    expect(focusDeckOwner(document.getElementById("strip"))).toBe(true);
    expect(document.activeElement?.id).toBe("strip");

    expect(focusUpFromBelowContextChipLadder(slot)).toBe(true);
    expect(document.activeElement?.id).toBe(left);
  });

  it("Up from an expanded session strip climbs out to the Show details line, not back into the strip", () => {
    /*
     * The 2026-08-23 trap, and the check that fails without its fix.
     *
     * With *Show details* collapsed there is no inline ladder, so the strip's own
     * `.bonsai-chip-ladder` is the only match in the document. If
     * focusAnyContextChipLadder takes it, the strip header's Up handler feeds the
     * ring straight back into the strip it is trying to leave, and Retry and
     * Show details become unreachable without closing the panel.
     *
     * Reproduced on device 2026-08-26 in exactly this state -- details collapsed,
     * strip expanded, one `.bonsai-chip-ladder` mounted and inside the strip --
     * and the ring climbed out to Retry, as it does here.
     */
    const slot = mountTurnWithUtilityRow();
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="bonsai-session-context-strip">
         <div class="bonsai-session-context-row Focusable" tabindex="-1" id="strip-row"></div>
         <div class="bonsai-chip-ladder Panel Focusable" tabindex="-1" id="strip-ladder"></div>
       </div>`,
    );
    expect(focusUpFromBelowContextChipLadder(slot)).toBe(true);
    /* The Show details line sits directly above the chips now (D76), so it is what Up lands on —
       it used to be Retry, back when Show details was a button in the row. */
    expect(document.activeElement?.id).toBe("stop-show-details");
    expect(document.activeElement?.id).not.toBe("strip-ladder");
  });

  /*
   * The standalone "Ask diagnostics" block (and its own focus stop between Show details and the
   * session strip) was removed 2026-08-28 (roadmap: "Fold Show diagnostics into Show details") —
   * the same JSON now lives inside the chip ladder's "Developer details" chip, reached via
   * `focusContextChipLadder` above like any other chip content. With the ladder unmounted (details
   * collapsed) and no collapsed hint either, Down from the utility row now has nothing left between
   * it and the session strip.
   */
  it("Down from the utility row reaches the session strip directly when details are collapsed", () => {
    const slot = mountTurnWithUtilityRow();
    document.body.insertAdjacentHTML(
      "beforeend",
      '<div class="bonsai-session-context-strip Panel Focusable" tabindex="-1" id="strip"></div>',
    );
    expect(focusDownFromReplyUtilityRow(slot)).toBe(true);
    expect(document.activeElement?.id).toBe("strip");
  });

  /*
   * Measured on the Deck 2026-09-12: a restored answer with no thumbs row sent Down straight to
   * Show details, skipping the new Read aloud line entirely. `focusDownFromLiveAnswerBubble` now
   * falls through branch -> checklist -> thumbs -> Retry/Copy -> Read aloud -> Show details.
   */
  it("focusDownFromLiveAnswerBubble reaches the Read aloud line when nothing above it is mounted", () => {
    resetReplyStops();
    mountLiveTurn(`
      <div class="bonsai-chat-turn-slot">
        <div class="bonsai-chat-turn-row-header bonsai-chat-turn-row-header--live"></div>
        <div class="bonsai-chat-ai-bubble Panel Focusable" tabindex="-1"></div>
      </div>
    `);
    const readAloud = document.createElement("button");
    readAloud.id = "stop-read-aloud";
    document.body.appendChild(readAloud);
    const showDetails = document.createElement("button");
    showDetails.id = "stop-show-details";
    document.body.appendChild(showDetails);
    registerReplyStop("read-aloud", readAloud);
    registerReplyStop("show-details", showDetails);
    const slot = queryLiveTurnSlot(document.body);
    expect(focusDownFromLiveAnswerBubble(slot)).toBe(true);
    expect(document.activeElement?.id).toBe("stop-read-aloud");
  });

  it("focusDownFromLiveAnswerBubble falls through to Show details when Read aloud is not mounted either", () => {
    resetReplyStops();
    mountLiveTurn(`
      <div class="bonsai-chat-turn-slot">
        <div class="bonsai-chat-turn-row-header bonsai-chat-turn-row-header--live"></div>
        <div class="bonsai-chat-ai-bubble Panel Focusable" tabindex="-1"></div>
      </div>
    `);
    const showDetails = document.createElement("button");
    showDetails.id = "stop-show-details";
    document.body.appendChild(showDetails);
    registerReplyStop("show-details", showDetails);
    const slot = queryLiveTurnSlot(document.body);
    expect(focusDownFromLiveAnswerBubble(slot)).toBe(true);
    expect(document.activeElement?.id).toBe("stop-show-details");
  });

  /*
   * Roadmap: "Walking up from the question box skips every reply row", measured on the Deck
   * 2026-09-21. The cause was a leftover: the suggestion chips' own Up aimed at the session context
   * strip, which was the last stop above the dock until plan 62 3c folded it into the Show details
   * panel as a tab and removed it. Nothing has registered under that name since, so Up fell through
   * to the chat slot row on every press and stepped over the whole reply.
   *
   * These pin the replacement. `focusOwnBonsaiRow` is the piece that makes it possible at all: the
   * rows it has to reach are bare `.Panel.Focusable` elements carrying no tabindex on device, which
   * `focusDeckOwner` deliberately refuses to touch (see its own tests above) -- rightly, because
   * stamping one of Steam's own is what broke a permission row on 2026-09-04. The distinction is
   * ownership, so that is what the first two tests check.
   */
  describe("reaching the bottom of the newest reply, for Up out of the dock", () => {
    it("focusOwnBonsaiRow focuses one of our own bare Focusables, which focusDeckOwner will not", () => {
      mountLiveTurn(`
        <div class="bonsai-chip-ladder Panel Focusable"></div>
      `);
      const ladder = document.querySelector(".bonsai-chip-ladder") as HTMLElement;

      // The shape measured on the Deck: ours, a genuine Focusable, no tabindex, nothing
      // natively focusable inside it. focusDeckOwner honestly reports it moved nothing.
      expect(focusDeckOwner(ladder)).toBe(false);

      expect(focusOwnBonsaiRow(ladder)).toBe(true);
      expect(document.activeElement).toBe(ladder);
      expect(ladder.getAttribute("tabindex")).toBe("-1");
    });

    it("focusOwnBonsaiRow refuses anything that is not ours, so Steam's own rows are never stamped", () => {
      mountLiveTurn(`
        <div class="SomeSteamClass Panel Focusable"></div>
      `);
      const steamRow = document.querySelector(".SomeSteamClass") as HTMLElement;
      expect(focusOwnBonsaiRow(steamRow)).toBe(false);
      expect(steamRow.hasAttribute("tabindex")).toBe(false);
    });

    it("lands on the details panel's own content when the panel is open -- the lowest stop there is", () => {
      mountLiveTurn(`
        <div class="bonsai-chat-turn-slot">
          <div class="bonsai-kb-notes-block Panel Focusable"></div>
          <div class="bonsai-details-tabs-row Panel Focusable"></div>
          <div class="bonsai-chip-ladder Panel Focusable"></div>
        </div>
      `);
      expect(focusBottomOfNewestReply()).toBe(true);
      expect((document.activeElement as HTMLElement)?.className).toContain("bonsai-chip-ladder");
    });

    it("on a Session tab with no rows, lands on the summary card, else the Sum up button (plan 68)", () => {
      mountLiveTurn(`
        <div class="bonsai-chat-turn-slot">
          <div class="bonsai-details-tabs-row Panel Focusable"></div>
          <div class="bonsai-details-session-body Panel Focusable">
            <div class="bonsai-sumup-btn Panel Focusable"></div>
            <div class="bonsai-sumup-card Panel Focusable"></div>
          </div>
        </div>
      `);
      expect(focusBottomOfNewestReply()).toBe(true);
      expect((document.activeElement as HTMLElement)?.className).toContain("bonsai-sumup-card");

      mountLiveTurn(`
        <div class="bonsai-chat-turn-slot">
          <div class="bonsai-details-tabs-row Panel Focusable"></div>
          <div class="bonsai-details-session-body Panel Focusable">
            <div class="bonsai-sumup-btn Panel Focusable"></div>
          </div>
        </div>
      `);
      expect(focusBottomOfNewestReply()).toBe(true);
      expect((document.activeElement as HTMLElement)?.className).toContain("bonsai-sumup-btn");
    });

    it("on a Session tab with rows, lands on the active row's chips at the bottom, not the button at the top", () => {
      mountLiveTurn(`
        <div class="bonsai-chat-turn-slot">
          <div class="bonsai-details-session-body Panel Focusable">
            <div class="bonsai-sumup-btn Panel Focusable"></div>
            <div class="bonsai-details-session-row Panel Focusable"></div>
            <div class="bonsai-chip-ladder Panel Focusable"></div>
          </div>
        </div>
      `);
      expect(focusBottomOfNewestReply()).toBe(true);
      expect((document.activeElement as HTMLElement)?.className).toContain("bonsai-chip-ladder");
    });

    it("falls back up the reply when the panel is shut: the notes block, then Show details", () => {
      resetReplyStops();
      mountLiveTurn(`
        <div class="bonsai-chat-turn-slot">
          <div class="bonsai-kb-notes-block Panel Focusable"></div>
        </div>
      `);
      expect(focusBottomOfNewestReply()).toBe(true);
      expect((document.activeElement as HTMLElement)?.className).toContain("bonsai-kb-notes-block");

      resetReplyStops();
      mountLiveTurn(`<div class="bonsai-chat-turn-slot"></div>`);
      const showDetails = document.createElement("button");
      showDetails.id = "stop-show-details";
      (document.querySelector(".bonsai-chat-turn-slot") as HTMLElement).appendChild(showDetails);
      registerReplyStop("show-details", showDetails);
      expect(focusBottomOfNewestReply()).toBe(true);
      expect(document.activeElement?.id).toBe("stop-show-details");
    });

    it("reports false with no reply on screen at all, so the chat slot row still gets the press", () => {
      resetReplyStops();
      mountLiveTurn(`<div class="bonsai-main-tab-dock"></div>`);
      expect(focusBottomOfNewestReply()).toBe(false);
    });

    it("uses the NEWEST turn when several are on screen, not the first one it finds", () => {
      resetReplyStops();
      mountLiveTurn(`
        <div class="bonsai-chat-turn-slot">
          <div class="bonsai-kb-notes-block Panel Focusable" id="older"></div>
        </div>
        <div class="bonsai-chat-turn-slot">
          <div class="bonsai-kb-notes-block Panel Focusable" id="newest"></div>
        </div>
      `);
      expect(focusBottomOfNewestReply()).toBe(true);
      expect(document.activeElement?.id).toBe("newest");
    });
  });
});
