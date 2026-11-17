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
import { putSteamRingOn } from "../../test-harness/steamRing";
import {
  BOUND,
  DECK_PANE,
  DEVELOPER_CASE,
  OLLAMA_CASE,
  PANE_TOP,
  everyOpenWalk,
  names,
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

describe("arriving on a tab with the switch on (the Deck, plan 105 block D3a: Ollama 1 of 3, Developer 1 of 2)", () => {
  /*
   * On arrival Steam may put the ring somewhere other than the first section: back on a control it last held, or on
   * the LAST line (foldedTabArrival.ts records both). That landing used to close the first section and open nothing,
   * and then no landing ever opened anything again: the Deck saw every section shut and five lines walked past.
   */
  const stray = [
    { t: OLLAMA_CASE, line: "models", what: "the last line, as after a shoulder switch" },
    { t: DEVELOPER_CASE, line: "navigation", what: "a closed section's line, as Steam's way back from the tab bar to a control it last held" },
  ];
  for (const { t, line, what } of stray) {
    it(`${t.name}: a stray first landing on ${what}, then the first line: the first section is open, and Down opens every section in turn`, () => {
      const reference = everyOpenWalk(t);
      switchOn();
      const w = walk(t, DECK_PANE, "nearest");
      expect(openNow(w.container)).toEqual([t.ids[0]]);
      act(() => putSteamRingOn(w.container.querySelector<HTMLElement>(`[data-bonsai-fold-line="${line}"]`)));
      expect(openNow(w.container).length, "some section stays open after the stray landing").toBeGreaterThan(0);
      /* The arrival code (or Down from the tab bar) then puts the ring on the first line. */
      const down = [seeing(w, w.enter()), ...walkSeeing(w, "down")];
      expect(down[0]!.open).toEqual([t.ids[0]]);
      expect(names(down)).toEqual(reference.down);
      w.unmount();
    });
  }
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

describe("a late line above the held row (the Deck, plan 105 block D3a: Up onto Use local knowledge base)", () => {
  /*
   * Where AI runs reopened above the ring and the row was put back; a few frames later the section grew again (its own
   * late lines), and the row dropped 37.6 px for about 7 frames until the late look caught it. A ResizeObserver hears the
   * growth after layout and before that frame is painted, so the row is put back in the same frame.
   */
  const observers: { cb: () => void; on: boolean }[] = [];
  class FakeResizeObserver {
    private entry: { cb: () => void; on: boolean };
    constructor(cb: () => void) {
      this.entry = { cb, on: false };
      observers.push(this.entry);
    }
    observe() {
      this.entry.on = true;
    }
    unobserve() {}
    disconnect() {
      this.entry.on = false;
    }
  }
  /* What the browser does after a layout that changed an observed box: every connected observer hears it. */
  const layoutChanged = () => act(() => observers.filter((o) => o.on).forEach((o) => o.cb()));

  beforeEach(() => {
    observers.length = 0;
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  });
  afterEach(() => vi.unstubAllGlobals());

  /** Down to the end, then Up until the landing on "Use local knowledge base" (Where AI runs opens above it). */
  function upOntoKbSwitch(w: FoldedTabWalk): FoldedLanding {
    w.enter();
    w.walk("down", BOUND);
    for (let i = 0; i < BOUND; i++) {
      const l = w.press("up");
      if (!l) break;
      if (l.name === "Use local knowledge base") return l;
    }
    throw new Error("never reached Use local knowledge base going up");
  }

  /** Where AI runs grows by two lines of words above the ring, as its own late status lines did on the Deck. */
  function growWhereAiRuns(w: FoldedTabWalk): void {
    const body = w.container.querySelector('[data-bonsai-fold-section="where"] .bonsai-fold-body')!;
    const late = document.createElement("div");
    late.textContent = "Connected · Ollama v0.40.16 · 2 models · answering on this Deck at 127.0.0.1:11434 now";
    body.appendChild(late);
  }

  it("the row is put back in the same frame the section grows, not ten frames later", () => {
    switchOn();
    const w = walk(OLLAMA_CASE, DECK_PANE, "nearest");
    const landing = upOntoKbSwitch(w);
    expect(Math.abs(landing.held), "Where AI runs opened above and the row was held").toBeGreaterThan(1);
    const top = landing.stop.getBoundingClientRect().top;
    growWhereAiRuns(w);
    expect(landing.stop.getBoundingClientRect().top - top, "the late lines push the row down").toBeGreaterThan(10);
    layoutChanged();
    expect(landing.stop.getBoundingClientRect().top).toBeCloseTo(top, 5);
    w.unmount();
  });

  it("after the next press the row is the person's again: a later growth is left to the plan", () => {
    switchOn();
    const w = walk(OLLAMA_CASE, DECK_PANE, "nearest");
    upOntoKbSwitch(w);
    const next = w.press("up")!;
    const top = next.stop.getBoundingClientRect().top;
    const scroll = w.scrollTop();
    growWhereAiRuns(w);
    layoutChanged();
    expect(w.scrollTop()).toBe(scroll);
    expect(next.stop.getBoundingClientRect().top).not.toBeCloseTo(top, 0);
    w.unmount();
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
