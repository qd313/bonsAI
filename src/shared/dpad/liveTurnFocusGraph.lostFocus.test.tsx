/**
 * Title: focusDeckOwner while the panel's page has lost the browser's focus (plan 102, lane C round two)
 * Purpose: Pin the one hop plan 102 found still written the old way. `focusDeckOwner` moved the page's focus with a
 *          plain focus() and read "the page's focus moved" as success; with the page out of the browser's focus
 *          Steam's ring does not follow a plain focus(), so the press was claimed and nothing moved. On the Deck
 *          (workshop:test-evidence/plan98-P98-DEMOTE-01-game.json) that was Down from the notes block, through
 *          `focusContextChipLadder`. Now it goes through lostFocusHop.ts's `plainHop`: it says false unless the
 *          ring followed and puts the page's focus back, so every caller goes on to its next choice or leaves the
 *          press to Steam, the way focusPerTurnRow.ts's `focusRowElement` already does.
 * Used for: liveTurnFocusGraph.ts (`focusDeckOwner`) and every hop that ends in it (the chip grid, the context hint,
 *           the session rows, the answer bubble, the strategy choices and checklist, the question row, the notes line).
 * Solves: The dead press itself. The walk at the Deck's level is kbDemoteRows.lostFocus.test.tsx: Down from Undo
 *         past the notes block with a window that refuses to take the focus back.
 * Does not: Walk Steam's own step (lostFocusPanel.tsx models it as the stop a test names), or win the page's focus back.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act } from "@testing-library/react";

import { mountPanelPage, type PanelPage } from "../../test-harness/lostFocusPanel";
import { getRpcCallLog, resetFakeDeckyRpc } from "../../test-harness/fakeDeckyRpc";
import { LOST_FOCUS_HOP_LOG_TAG } from "./lostFocusHop";
import { focusDeckOwner } from "./liveTurnFocusGraph";

let page: PanelPage;

/** One of Steam's own nodes as Decky draws it: a `.Panel.Focusable` with a tabindex, in the panel's page. */
function steamNode(label: string): HTMLElement {
  const el = page.doc.createElement("div");
  el.className = "Panel Focusable";
  el.setAttribute("tabindex", "0");
  el.setAttribute("aria-label", label);
  page.host.appendChild(el);
  return el;
}

/** The plugin-log lines the hops wrote. */
async function hopLogLines(): Promise<Array<Record<string, unknown>>> {
  await act(async () => {
    await Promise.resolve();
  });
  return getRpcCallLog()
    .filter((c) => c.method === "dbg_fe_log" && c.args[0] === LOST_FOCUS_HOP_LOG_TAG)
    .map((c) => c.args[1] as Record<string, unknown>);
}

beforeEach(() => {
  resetFakeDeckyRpc();
  page = mountPanelPage();
});
afterEach(() => {
  page.remove();
  document.body.innerHTML = "";
});

describe("focusDeckOwner and the panel's page focus", () => {
  it("with the page's focus present, lands as it always has: the ring and the page's focus on the target", async () => {
    const from = steamNode("notes block");
    const to = steamNode("chip grid");
    act(() => page.steamMove(from));

    expect(focusDeckOwner(to)).toBe(true);

    expect(page.ring()).toBe(to);
    expect(page.active()).toBe(to);
    expect(await hopLogLines()).toEqual([]);
  });

  it("with the page's focus gone and the ring not following, says false and puts the page's focus back", async () => {
    const from = steamNode("notes block");
    const to = steamNode("chip grid");
    act(() => page.steamMove(from));
    page.setFocused(false);

    expect(focusDeckOwner(to)).toBe(false);

    /* Ring and page focus together on the stop the press started from, so Steam's own move carries both. */
    expect(page.ring()).toBe(from);
    expect(page.active()).toBe(from);
    expect(await hopLogLines()).toEqual([{ hop: "deckOwner", via: "plain", followed: false, ring: "notes block" }]);
  });

  it("with the page's focus gone but the ring already there (a transfer came first), says true", () => {
    const to = steamNode("choice A");
    act(() => page.steamMove(to));
    page.setFocused(false);

    expect(focusDeckOwner(to)).toBe(true);
    expect(page.ring()).toBe(to);
  });
});
