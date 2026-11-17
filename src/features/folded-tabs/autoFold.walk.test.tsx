/**
 * Title: "Open sections as you walk" around the walk itself (plan 105, lane C2)
 * Purpose: What the per-tab walks (autoFold.walkOllama, walkSettings, walkDeveloper) leave out, on the real Ollama tab:
 *          the maintainer's own words at named stops (Thinking, Reply style's last setting, opens Connection tuning;
 *          Keep models loaded, its second, closes Reply style; the same in reverse going Up); Left and Right along a
 *          row, and a tap, open and close nothing; with the switch off the walk is today's, nothing is held, and the
 *          browser's own scroll anchoring stays on; and the late look after a hold puts a row Steam's glide carried on
 *          back once, unless a press came first.
 * Used for: autoFold.ts, holdTabBodyStop (useTabBodyFocusScroll.ts), FoldedSection.tsx's FoldedColumn, foldedTabs.ts.
 * Does not: Know the Deck's real heights (foldedTabWalk.tsx's flow model); the Deck walk measures the truth.
 */
import { act, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../test-harness/steamRing");
  /* Steam's switch row: a stop of its own that keeps the move handlers it is given, as Decky's ToggleField does. */
  const ToggleField = (p: Record<string, unknown>) => {
    const { label, checked: _checked, onChange: _onChange, description: _d, disabled: _x, ...rest } = p;
    return <SteamRingFocusable {...rest} focusable aria-label={stubs.wordsOf(label)} data-decky-ui="ToggleField" />;
  };
  return { ...stubs, Focusable: SteamRingFocusable, ToggleField };
});

import { buildFoldedTabsSection } from "./foldedTabs";
import type { FoldedLanding, FoldedTabWalk } from "../../test-harness/foldedTabWalk";
import {
  BOUND,
  DECK_PANE,
  OLLAMA_CASE,
  PANE_TOP,
  openNow,
  resetAutoFoldWalk,
  seeing,
  switchOn,
  walk,
  walkSeeing,
  type Seen,
} from "../../test-harness/autoFoldWalk";

beforeEach(() => resetAutoFoldWalk());
afterEach(() => cleanup());

describe("on the Ollama tab, in the maintainer's words", () => {
  const at = (seen: Seen[], name: string) => seen.find((s) => s.l.name === name)!;

  it("Thinking (Reply style's last setting) opens Connection tuning; Keep models loaded, its second, closes Reply style; going Up, Custom timeouts opens Reply style again", () => {
    switchOn();
    const w = walk(OLLAMA_CASE, DECK_PANE, "nearest");
    const down = [seeing(w, w.enter()), ...walkSeeing(w, "down")];
    expect(at(down, "Set thinking to Off").open).toEqual(["reply", "tuning"]);
    expect(at(down, "Custom timeouts").open).toEqual(["reply", "tuning"]);
    expect(at(down, "Keep models loaded").open).toEqual(["tuning", "models"]);
    const up = walkSeeing(w, "up");
    expect(at(up, "Keep models loaded").open).toEqual(["tuning", "models"]);
    expect(at(up, "Custom timeouts").open).toEqual(["reply", "tuning"]);
    expect(at(up, "Set thinking to Off").open).toEqual(["reply", "tuning"]);
    w.unmount();
  });

  it("Left and Right along Thinking's buttons open and close nothing; a tap opens and closes nothing", () => {
    switchOn();
    const w = walk(OLLAMA_CASE, DECK_PANE, "nearest");
    w.enter();
    let landing: FoldedLanding | null = null;
    while ((landing = w.press("down")) && landing.name !== "Set thinking to Off");
    expect(openNow(w.container)).toEqual(["reply", "tuning"]);
    const brief = Array.from(w.container.querySelectorAll<HTMLButtonElement>("button")).find((b) => b.textContent === "Brief")!;
    act(() => brief.focus());
    expect(openNow(w.container)).toEqual(["reply", "tuning"]);
    /* A tap on Where AI runs' line: a D-pad landing there would close Reply style and Connection tuning; a tap leaves them. */
    const where = w.container.querySelector<HTMLElement>('[data-bonsai-fold-line="where"]')!;
    act(() => {
      where.dispatchEvent(new Event("pointerdown", { bubbles: true }));
      where.focus();
    });
    expect(openNow(w.container)).toEqual(["reply", "tuning"]);
    w.unmount();
  });
});

describe("the switch off means nothing changed", () => {
  it("off, the first section's settings, then only lines: the walk of today, nothing held", () => {
    const w = walk(OLLAMA_CASE, DECK_PANE, "nearest");
    const down = [seeing(w, w.enter()), ...walkSeeing(w, "down")];
    expect(down.filter((s) => s.line).map((s) => s.section)).toEqual(OLLAMA_CASE.ids);
    expect(down.every((s) => s.open.join() === "where")).toBe(true);
    expect(down.every((s) => s.l.held === 0)).toBe(true);
    w.unmount();
  });

  it("the browser's own scroll anchoring is turned off only while the switch is on", () => {
    expect(buildFoldedTabsSection()).toMatch(
      /\.bonsai-tab-body-root:has\(\.bonsai-fold-column\[data-bonsai-walk-opens="true"\]\)\s*\{\s*overflow-anchor: none;/,
    );
    expect(buildFoldedTabsSection().match(/overflow-anchor/g)).toHaveLength(1);
    const off = walk(OLLAMA_CASE, DECK_PANE, "nearest");
    expect(off.container.querySelector(".bonsai-fold-column")!.hasAttribute("data-bonsai-walk-opens")).toBe(false);
    off.unmount();
    switchOn();
    const on = walk(OLLAMA_CASE, DECK_PANE, "nearest");
    expect(on.container.querySelector(".bonsai-fold-column")!.getAttribute("data-bonsai-walk-opens")).toBe("true");
    on.unmount();
  });
});

describe("the late look after a hold", () => {
  afterEach(() => vi.useRealTimers());

  /**
   * Walk Down until a landing whose redraw turned the pane (a section above the ring closed) and left the ring inside
   * Steam's band (116 px clear at the pane's top, 80 at its bottom), where the late look may act; returns the pane.
   */
  function untilHeld(w: FoldedTabWalk): { pane: HTMLElement; ring: HTMLElement } {
    w.enter();
    for (let i = 0; i < BOUND; i++) {
      const l = w.press("down");
      if (!l) break;
      const inBand = l.top >= PANE_TOP + 116 && l.bottom <= PANE_TOP + DECK_PANE - 80;
      if (Math.abs(l.held) > 1 && inBand) return { pane: w.container.querySelector<HTMLElement>("[data-pane]")!, ring: l.stop };
    }
    throw new Error("no hold on the way down");
  }

  it("a glide that carries the held row on is put back once, about ten frames later", () => {
    vi.useFakeTimers();
    switchOn();
    const w = walk(OLLAMA_CASE, DECK_PANE, "nearest");
    const { pane, ring } = untilHeld(w);
    const top = ring.getBoundingClientRect().top;
    /* Steam's glide, aimed before the change, carries on by 6 px. */
    pane.scrollTop = pane.scrollTop + 6;
    expect(ring.getBoundingClientRect().top).toBeCloseTo(top - 6, 5);
    act(() => vi.advanceTimersByTime(200));
    expect(ring.getBoundingClientRect().top).toBeCloseTo(top, 5);
    w.unmount();
  });

  it("a press before the look cancels it: the person's next landing is never pulled back", () => {
    vi.useFakeTimers();
    switchOn();
    const w = walk(OLLAMA_CASE, DECK_PANE, "nearest");
    const { pane } = untilHeld(w);
    pane.scrollTop = pane.scrollTop + 6;
    w.press("down");
    const after = pane.scrollTop;
    act(() => vi.advanceTimersByTime(200));
    expect(pane.scrollTop).toBe(after);
    w.unmount();
  });
});
