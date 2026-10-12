/**
 * Title: The folded Ollama tab, walked with the D-pad (plan 91 § 2b; plan 92 T0)
 * Purpose: Pin the Deck checks P91-FOLD-OLLAMA, P91-STRIP and P91-FOLD-ALL-BUTTON at the level a test can
 *          reach: the real Ollama tab, every section closed and every section open, walked Down to the end and
 *          back Up a bounded number of presses, the D-pad pressed the way Steam calls it (the move handlers
 *          first, then Steam's own step), Steam's own scroll-into-view modelled three ways. No stop is visited
 *          twice; with every section closed the walk is the five lines; with every section open it stops once
 *          per control; no landing moves the pane more than a third of it; every ringed control is wholly on
 *          screen and, while the strip shows, its bottom edge with its ring sits 6 px or more above the strip's
 *          top. Right from Reply style reaches the floating button, A opens every section (it reads Close all),
 *          Down returns to Reply style. Closed, the tab is under one screen of the Deck's own (430 points); with
 *          the first section opened, under one and a half.
 * Used for: OllamaTab.tsx and the folded-tabs pieces (src/features/folded-tabs/).
 * Does not: Know the Deck's real heights: foldedTabWalk.tsx lays the stops out by a flow model, and the Deck
 *           walk measures the truth.
 */
import { act, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../test-harness/steamRing");
  /* Steam's switch row: a stop of its own that keeps the move handlers it is given, as Decky's ToggleField does. */
  const ToggleField = (p: Record<string, unknown>) => {
    const { label, checked: _checked, onChange: _onChange, description: _d, disabled: _x, ...rest } = p;
    return <SteamRingFocusable {...rest} focusable aria-label={String(label)} data-decky-ui="ToggleField" />;
  };
  return { ...stubs, Focusable: SteamRingFocusable, ToggleField };
});

import { OllamaTab, type OllamaTabProps } from "./OllamaTab";
import { resetFoldedTabsForTests, setAllSections, toggleSection } from "../features/folded-tabs/foldedTabsStore";
import { OLLAMA_FOLD_TAB, OLLAMA_SECTIONS } from "../features/folded-tabs/ollamaTabFolds";
import { resetNavFocusRegistry } from "../utils/navFocusRegistry";
import { stripHeightFor } from "../styles/sections/foldedTabs";
import { walkFoldedTab, type FoldedLanding } from "../test-harness/foldedTabWalk";
import { putSteamRingOn, steamRingHolder, type SteamEl } from "../test-harness/steamRing";
import type { SteamFocusScroll } from "../test-harness/tabBodyWalk";

const noop = () => {};
const DECK_PANE = 430;
const MONITOR_PANE = 741;
const RULES: SteamFocusScroll[] = ["nearest", "centerIfHidden", "center"];
const SECTION_IDS = OLLAMA_SECTIONS.map((s) => s.id);
/** The room a folded tab leaves under its last line (foldedTabs.ts), not part of "top to bottom". */
const TAIL = 120;
/** The plugin's ring on a plain button reaches 4 px outside it (2 px outline, 2 px offset: scopeBase.ts). */
const RING_REACH = 4;

function props(): OllamaTabProps {
  return {
    ollamaIp: "",
    effectiveOllamaPcIp: "127.0.0.1",
    onOllamaIpChange: noop,
    onPersistOllamaIp: noop,
    ollamaLocalOnDeck: true,
    setOllamaLocalOnDeck: noop,
    ollamaLocalAutostart: true,
    setOllamaLocalAutostart: noop,
    namedOllamaHosts: [],
    setNamedOllamaHosts: noop,
    onBeforeDeckyModal: noop,
    onCompleteDeckyModalClose: (close) => close(),
    onOpenOllamaModelsHub: noop,
    latencyWarningSeconds: 60,
    requestTimeoutSeconds: 180,
    latencyTimeoutsCustomEnabled: false,
    setLatencyTimeoutsCustomEnabled: noop,
    setLatencyWarningSeconds: noop,
    setRequestTimeoutSeconds: noop,
    ollamaKeepAlive: "5m",
    setOllamaKeepAlive: noop,
    modelPolicyTier: "open_source_only",
    useLocalKnowledgeBase: true,
    setUseLocalKnowledgeBase: noop,
    ragCorpusVersion: "",
    replyVerbosity: "balanced",
    setReplyVerbosity: noop,
    terseMode: false,
    setTerseMode: noop,
    askThinkEffort: "off",
    setAskThinkEffort: noop,
  };
}

function walk(viewport: number, steam: SteamFocusScroll, over: Partial<OllamaTabProps> = {}) {
  return walkFoldedTab({
    tabId: OLLAMA_FOLD_TAB,
    tab: <OllamaTab {...props()} {...over} />,
    viewport,
    steam,
    stripHeight: stripHeightFor,
    tail: TAIL,
  });
}

/** Every landing on screen, clear of the strip, and the pane moved no more than a third at each. */
function checkLandings(landings: FoldedLanding[], viewport: number, label: string) {
  for (const l of landings) {
    expect(l.moved, `${label}: press ${l.press} onto ${l.name}`).toBeLessThanOrEqual(viewport / 3);
    expect(l.top, `${label}: ${l.name} top`).toBeGreaterThanOrEqual(24 - 0.5);
    expect(l.bottom, `${label}: ${l.name} bottom`).toBeLessThanOrEqual(24 + viewport + 0.5);
    if (l.stripTop !== null) {
      expect(l.bottom + RING_REACH + 6, `${label}: ${l.name} clear of the strip`).toBeLessThanOrEqual(l.stripTop);
    }
  }
}

const names = (landings: FoldedLanding[]) => landings.map((l) => l.name);
const repeats = (landings: FoldedLanding[]) => landings.length - new Set(landings.map((l) => l.stop)).size;

beforeEach(() => {
  resetFoldedTabsForTests();
  resetNavFocusRegistry();
});
afterEach(() => cleanup());

describe("the folded Ollama tab, every section closed", () => {
  it("Down from the tab bar walks the five section lines, once each, then holds; Up walks them back", () => {
    setAllSections(OLLAMA_FOLD_TAB, SECTION_IDS, false);
    const w = walk(DECK_PANE, "centerIfHidden");
    const down = [w.enter(), ...w.walk("down")];
    expect(names(down).map((n) => n.split(" section")[0])).toEqual(OLLAMA_SECTIONS.map((s) => s.title));
    const up = w.walk("up");
    expect(names(up).map((n) => n.split(" section")[0])).toEqual(OLLAMA_SECTIONS.slice(0, -1).map((s) => s.title).reverse());
    checkLandings([...down, ...up], DECK_PANE, "closed");
    w.unmount();
  });

  it("fits in one screen of the Deck's own: the last line ends above 430 points", () => {
    setAllSections(OLLAMA_FOLD_TAB, SECTION_IDS, false);
    const w = walk(DECK_PANE, "nearest");
    expect(w.contentHeight() - TAIL).toBeLessThan(DECK_PANE);
    w.unmount();
  });

  it("on a first visit no section is open", () => {
    const w = walk(DECK_PANE, "nearest");
    const open = Array.from(w.container.querySelectorAll<HTMLElement>('.bonsai-fold-line[data-open="true"]'));
    expect(open).toEqual([]);
    expect(w.contentHeight() - TAIL).toBeLessThan(DECK_PANE);
    w.unmount();
  });

  it("with Where AI runs opened, the tab is under one and a half screens", () => {
    toggleSection(OLLAMA_FOLD_TAB, SECTION_IDS, "where");
    const w = walk(DECK_PANE, "nearest");
    const open = Array.from(w.container.querySelectorAll<HTMLElement>('.bonsai-fold-line[data-open="true"]'));
    expect(open.map((el) => el.dataset.bonsaiFoldLine)).toEqual(["where"]);
    expect(w.contentHeight() - TAIL).toBeLessThan(DECK_PANE * 1.5);
    w.unmount();
  });
});

describe("A on a closed section line only opens the section", () => {
  it("A on the closed AI models line (and on Where AI runs) opens the sections and runs no button's action", () => {
    const openHub = vi.fn();
    const w = walk(DECK_PANE, "nearest", { onOpenOllamaModelsHub: openHub });
    for (const id of ["where", "models"]) {
      const line = w.container.querySelector<HTMLElement>(`[data-bonsai-fold-line="${id}"]`) as SteamEl;
      act(() => {
        putSteamRingOn(line);
        (line.__nav?.onOKButton as (() => void) | undefined)?.();
      });
    }
    const open = Array.from(w.container.querySelectorAll<HTMLElement>('.bonsai-fold-line[data-open="true"]'));
    expect(open.map((el) => el.dataset.bonsaiFoldLine)).toEqual(["where", "models"]);
    /* The buttons are drawn now, the first one of each section included, and none of them has been pressed. */
    expect(w.container.querySelector('button[aria-label="AI models"]')).not.toBeNull();
    expect(openHub).not.toHaveBeenCalled();
    w.unmount();
  });
});

describe("the folded Ollama tab, every section open", () => {
  for (const viewport of [DECK_PANE, MONITOR_PANE]) {
    for (const steam of RULES) {
      it(`pane ${viewport}, Steam's rule "${steam}": Down stops once per control to the end and Up comes back, each move under a third of the pane, every row clear of the strip`, () => {
        setAllSections(OLLAMA_FOLD_TAB, SECTION_IDS, true);
        const w = walk(viewport, steam);
        const down = [w.enter(), ...w.walk("down")];
        expect(repeats(down), names(down).join(" | ")).toBe(0);
        /* Every line, and a control of every section, in order. */
        const order = names(down);
        expect(order[0]).toMatch(/^Where AI runs/);
        expect(order).toContain("Run AI on this Deck");
        expect(order).toContain("Terse mode");
        expect(order).toContain("Set thinking to Off");
        expect(order[order.length - 1]).toBe("AI models");
        expect(order.length).toBeGreaterThanOrEqual(17);
        checkLandings(down, viewport, `${steam} down`);
        const up = w.walk("up");
        expect(repeats(up), names(up).join(" | ")).toBe(0);
        expect(up[up.length - 1]!.name).toMatch(/^Where AI runs/);
        checkLandings(up, viewport, `${steam} up`);
        w.unmount();
      });
    }
  }

  it("the strip shows each row's own text while the ring is on it, and hides on a section line", () => {
    setAllSections(OLLAMA_FOLD_TAB, SECTION_IDS, true);
    const w = walk(MONITOR_PANE, "nearest");
    const seen = new Map<string, string>();
    for (const l of [w.enter(), ...w.walk("down")]) seen.set(l.name, l.stripText);
    expect(seen.get("Terse mode")).toMatch(/^Terse modeSpeed mode only\./);
    expect(seen.get("Run AI on this Deck")).toBe("Run AI on this DeckOff: use a PC on your home network. On: AI runs on this device.");
    expect(seen.get("Set thinking to Off")).toBe("ThinkingAnswer straight away. Fastest.");
    expect(seen.get("Use local knowledge base")).toMatch(/Ground Strategy and troubleshooting Asks/);
    expect(seen.get("AI models")).toBe("");
    for (const [name, text] of seen) if (/ section(:|$)/.test(name)) expect(text, name).toBe("");
    w.unmount();
  });
});

describe("the floating Open all button on the Ollama tab", () => {
  it("Right from Reply style puts the ring on it; A opens every section (Close all); Down returns to Reply style", () => {
    const w = walk(DECK_PANE, "nearest");
    const line = w.container.querySelector<HTMLElement>('[data-bonsai-fold-line="reply"]') as SteamEl;
    const host = w.container.querySelector<HTMLElement>('[data-bonsai-fold-all="ollama"]') as SteamEl;
    const button = host.querySelector("button")!;
    act(() => {
      putSteamRingOn(line);
      line.__nav?.onMoveRight?.();
    });
    expect(steamRingHolder()).toBe(button);
    act(() => button.click());
    expect(w.container.querySelectorAll('.bonsai-fold-line[data-open="true"]')).toHaveLength(5);
    expect(button.textContent).toContain("Close all");
    expect(steamRingHolder()).toBe(button);
    act(() => {
      host.__nav?.onMoveDown?.();
    });
    expect(steamRingHolder()).toBe(w.container.querySelector('[data-bonsai-fold-line="reply"]'));
    w.unmount();
  });

  it("is drawn outside the pane Steam scrolls, so landing on it never scrolls the list", () => {
    const w = walk(DECK_PANE, "nearest");
    const pane = w.container.querySelector("[data-pane]")!;
    expect(pane.contains(w.container.querySelector("[data-bonsai-fold-all]"))).toBe(false);
    w.unmount();
  });
});

export {};
