/**
 * Title: The question box and its strip while the panel's page has lost the browser's focus (plan 97, L14)
 * Purpose: Pin row P97-L14-FREEZE at the level the Deck check looks at: where Steam's ring is after each press.
 *          Plan 97 block B (workshop:test-evidence/plan97-P97-B-FREEZE-2.json, plan97-P97-B-AFTER-POPUP-FOCUS.json)
 *          caught the panel's page on screen with `document.hasFocus()` false after a Steam box or the menu
 *          closing; Down from the question box then moved the page's focus to Ask while the ring stayed on the box,
 *          press after press. This mounts the real ask bar inside a page in that state (lostFocusPanel.tsx) and
 *          presses the D-pad the way Steam does.
 * Used for: useMainTabAskBarFocus.ts (Down, Left and Right from the box), AskStripSendButtons.tsx (Ask and the X,
 *           with their own nav nodes), lostFocusHop.ts (the declined hop and the plugin-log line).
 * Solves: In the model, as on the Deck, a plain `focus()` on a page without focus leaves the ring where it was;
 *         Steam's own move and its transfer move it. So every press below must either reach its stop by Steam's
 *         transfer or decline, letting Steam's own step move the ring; and the page's focus and the ring must
 *         agree afterwards. With the page's focus present, the routes are the ones the strip test pins
 *         (MainTab.askStrip.deck.test.tsx).
 * Does not: Prove the Deck's ring moves: that is row P97-L14-FREEZE. Steam's own step is given by each test
 *           (the next or previous stop along the strip's row, which is how Steam walks a row's children).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";

import { mountPanelPage, type MoveKey, type PanelPage } from "../../../test-harness/lostFocusPanel";
import { getRpcCallLog, resetFakeDeckyRpc } from "../../../test-harness/fakeDeckyRpc";
import { resetNavFocusRegistry } from "../../../shared/dpad/navFocusRegistry";
import { LOST_FOCUS_HOP_LOG_TAG } from "../../../shared/dpad/lostFocusHop";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../../test-harness/fakeDeckyUi");
  const { withPanelNav } = await import("../../../test-harness/lostFocusPanel");
  return {
    ...stubs,
    Focusable: withPanelNav(stubs.Focusable),
    TextField: withPanelNav(stubs.TextField),
    Button: withPanelNav(stubs.Button),
  };
});

import { MainTabUnifiedAskBar, type MainTabUnifiedAskBarProps } from "./MainTabUnifiedAskBar";

function buildProps(overrides: Partial<MainTabUnifiedAskBarProps> = {}): MainTabUnifiedAskBarProps {
  return {
    fullBleedRowStyle: {},
    presetCarouselHostRef: { current: null },
    unifiedInputHostRef: { current: null },
    unifiedInputFieldLayerRef: { current: null },
    unifiedInputMeasureRef: { current: null },
    attachActionHostRef: { current: null },
    askBarHostRef: { current: null },
    unifiedInputSurfacePx: 60,
    unifiedInput: "",
    usesNativeMultilineField: true,
    setIsUnifiedInputFocused: vi.fn(),
    isUnifiedInputFocused: false,
    setUnifiedInput: vi.fn(),
    isAsking: false,
    ollamaIp: "192.168.1.50",
    onAskOllama: vi.fn(),
    onOpenScreenshotBrowser: vi.fn(),
    onTakeScreenshot: vi.fn(),
    onCancelAsk: vi.fn(),
    onMicInput: vi.fn(),
    selectedAttachment: null,
    setSelectedAttachment: vi.fn(),
    clearUnifiedInput: vi.fn(),
    showSearchClearButton: false,
    mediaError: "",
    askMode: "strategy",
    onAskModeChange: vi.fn(),
    ...overrides,
  };
}

const PAPERCLIP = "Attach screenshot to Ask";
const MODE = "Inference mode: Strategy. Open to change.";
const MIC = "Voice input";
const STOP = "Stop generation";
const CLEAR = "Clear";
const ASK = "Ask";

let page: PanelPage;

function mount(overrides: Partial<MainTabUnifiedAskBarProps> = {}) {
  const view = render(<MainTabUnifiedAskBar {...buildProps(overrides)} />, { container: page.host });
  /* Decky stamps tabindex on what Steam navigates; the stub does not, so give the box its own. */
  const box = page.host.querySelector<HTMLElement>('[data-decky-ui="TextField"]')!;
  box.setAttribute("tabindex", "0");
  return { ...view, box };
}

function box(): HTMLElement {
  return page.host.querySelector<HTMLElement>('[data-decky-ui="TextField"]')!;
}
function byLabel(label: string): HTMLElement {
  const el = page.host.querySelector<HTMLElement>(`.bonsai-unified-input-actions-row button[aria-label="${label}"]`);
  expect(el, `no "${label}" in the strip`).toBeTruthy();
  return el!;
}
function nameOf(el: Element | null): string {
  if (!el) return "nothing";
  if (el === box()) return "question box";
  return el.getAttribute("aria-label") ?? el.className;
}
/** The strip's stops, left to right: what Steam walks along its row. */
function stripStops(): HTMLElement[] {
  return Array.from(
    page.host.querySelectorAll<HTMLElement>('.bonsai-unified-input-actions-row button:not([aria-disabled="true"])'),
  );
}
/** Steam's own step along the strip's row: the stop beside the ring that way, none past an end. */
function steamRowStep(key: MoveKey) {
  return (from: HTMLElement): HTMLElement | null => {
    const stops = stripStops();
    const at = stops.indexOf(from);
    if (at < 0) return null;
    if (key === "onMoveLeft") return stops[at - 1] ?? null;
    if (key === "onMoveRight") return stops[at + 1] ?? null;
    return null;
  };
}
function press(key: MoveKey, steamStep?: (from: HTMLElement) => HTMLElement | null) {
  let out: "claimed" | "declined" = "declined";
  act(() => {
    out = page.press(key, steamStep);
  });
  return out;
}

/** Plugin-log lines this file's hops wrote. */
function hopLogLines(): Array<Record<string, unknown>> {
  return getRpcCallLog()
    .filter((c) => c.method === "dbg_fe_log" && c.args[0] === LOST_FOCUS_HOP_LOG_TAG)
    .map((c) => c.args[1] as Record<string, unknown>);
}

beforeEach(() => {
  resetFakeDeckyRpc();
  resetNavFocusRegistry();
  page = mountPanelPage();
});
afterEach(() => {
  cleanup();
  page.remove();
  document.body.innerHTML = "";
});

describe("the plugin log records every hop made while the page lacks focus (plan 97, L14 commit 1)", () => {
  it("writes one dpad.lostFocusHop line for Down from the box with the page's focus gone, saying whether the ring followed", () => {
    mount();
    act(() => page.steamMove(box()));
    page.setFocused(false);

    press("onMoveDown");

    const lines = hopLogLines();
    expect(lines.length).toBeGreaterThanOrEqual(1);
    const last = lines[lines.length - 1]!;
    expect(typeof last.hop).toBe("string");
    expect(typeof last.followed).toBe("boolean");
    expect(["plain", "transfer"]).toContain(last.via);
  });

  it("writes nothing while the page has its focus", () => {
    mount();
    act(() => page.steamMove(box()));

    press("onMoveDown");
    press("onMoveLeft");

    expect(hopLogLines()).toEqual([]);
  });
});

/** The ring and the page's own focus on the same element: what the Deck check reads after every press. */
function expectTogether(label: string) {
  expect(page.ring(), `${label}: no ring`).toBeTruthy();
  expect(nameOf(page.active()), `${label}: the page's focus left the ring`).toBe(nameOf(page.ring()));
}

/**
 * A bounded walk: press `key` until the ring stops moving, Steam's own step along the strip's row taking every
 * press the plugin declines. Fails on a stop seen twice, and on any press after which the ring and the page's
 * focus disagree.
 */
function walk(key: MoveKey, limit = 8): string[] {
  const seen = [nameOf(page.ring())];
  for (let i = 0; i < limit; i++) {
    const before = page.ring();
    press(key, steamRowStep(key));
    expectTogether(`${key} from ${seen[seen.length - 1]}`);
    if (page.ring() === before) return seen;
    const name = nameOf(page.ring());
    expect(seen, `"${name}" visited twice walking ${key}`).not.toContain(name);
    seen.push(name);
  }
  throw new Error(`walk ${key} did not stop within ${limit} presses: ${seen.join(" -> ")}`);
}

describe("P97-L14-FREEZE: Down from the question box moves the ring with the page's focus gone", () => {
  it("lands on Ask by Steam's transfer, every time, ring and page's focus together", () => {
    mount();
    for (let round = 0; round < 3; round++) {
      act(() => page.steamMove(box()));
      page.setFocused(false);
      page.transfers.length = 0;

      expect(press("onMoveDown", () => byLabel(PAPERCLIP))).toBe("claimed");

      expect(nameOf(page.ring()), `round ${round + 1}`).toBe(ASK);
      expectTogether(`round ${round + 1}`);
      expect(page.transfers.map(nameOf)).toEqual([ASK]);
    }
    /* The log says it: the hop went by transfer and the ring followed. */
    const last = hopLogLines().pop()!;
    expect(last).toMatchObject({ hop: "to-ask", via: "transfer", followed: true });
  });

  it("Left and Right from the box decline rather than split the ring from the page's focus", () => {
    mount();
    for (const key of ["onMoveLeft", "onMoveRight"] as const) {
      act(() => page.steamMove(box()));
      page.setFocused(false);

      expect(press(key), key).toBe("declined");

      expect(nameOf(page.ring()), key).toBe("question box");
      expectTogether(key);
      const last = hopLogLines().pop()!;
      expect(last, key).toMatchObject({ via: "plain", followed: false });
    }
  });

  it("while an answer is arriving, Down from the box declines instead of holding still on a dead press", () => {
    mount({ isAsking: true });
    act(() => page.steamMove(box()));
    page.setFocused(false);

    expect(press("onMoveDown", () => byLabel(STOP))).toBe("declined");

    expect(nameOf(page.ring())).toBe(STOP);
    expectTogether("Down while asking");
  });

  it("walks the strip one stop at a time both ways, no stop twice, and Up comes back to the box", () => {
    mount();
    act(() => page.steamMove(box()));
    page.setFocused(false);
    press("onMoveDown");

    expect(walk("onMoveLeft")).toEqual([ASK, MIC, MODE, PAPERCLIP]);
    expect(walk("onMoveRight")).toEqual([PAPERCLIP, MODE, MIC, ASK]);

    expect(press("onMoveUp")).toBe("claimed");
    expect(nameOf(page.ring())).toBe("question box");
    expectTogether("Up from Ask");
  });

  it("with words in the box the walk takes in the X, reached by its own transfer", () => {
    mount({ unifiedInput: "how do I parry", showSearchClearButton: true });
    act(() => page.steamMove(box()));
    page.setFocused(false);
    press("onMoveDown");

    expect(walk("onMoveLeft")).toEqual([ASK, CLEAR, MIC, MODE, PAPERCLIP]);
    expect(walk("onMoveRight")).toEqual([PAPERCLIP, MODE, MIC, CLEAR, ASK]);
  });
});

describe("with the page's focus present, the routes are unchanged", () => {
  it("Down lands on Ask, Left on the paperclip, Right on the mode button, every press claimed", () => {
    mount();
    for (const [key, target] of [
      ["onMoveDown", ASK],
      ["onMoveLeft", PAPERCLIP],
      ["onMoveRight", MODE],
    ] as const) {
      act(() => page.steamMove(box()));
      expect(press(key), key).toBe("claimed");
      expect(nameOf(page.ring()), key).toBe(target);
      expectTogether(key);
    }
  });

  it("walks the strip on the plugin's own hops: no press is left to Steam", () => {
    mount({ unifiedInput: "how do I parry", showSearchClearButton: true });
    act(() => page.steamMove(box()));
    press("onMoveDown");
    const noSteam = () => null;
    const seen = [nameOf(page.ring())];
    for (let i = 0; i < 4; i++) {
      expect(press("onMoveLeft", noSteam)).toBe("claimed");
      seen.push(nameOf(page.ring()));
    }
    expect(seen).toEqual([ASK, CLEAR, MIC, MODE, PAPERCLIP]);
  });
});
