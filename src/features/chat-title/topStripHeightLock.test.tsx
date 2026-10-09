/**
 * Title: With the tab bar in Steam's strip, the panel still reaches the bottom of the screen
 * Purpose: Pin plan 84 test C's second finding at the level the Deck check reads: moving Decky's own page up
 *          14 points left a 14-point empty band at the bottom of the panel, and bonsAI's height lock did not
 *          notice the header changing shape. Decky's real-shaped page is laid out on the Deck's own 300 by 454
 *          screen (test-harness/deckyQuickAccessLayout.tsx) with bonsAI's real title view and its real height
 *          lock (useQamPanelHeightGuard) in a stand-in for bonsAI's root; Decky's page clips what runs past its
 *          own bottom, as a Quick Access page does. The check is where bonsAI's box visibly ends: 454, on
 *          every tab, after every header change.
 * Used for: deckyHeaderShape.ts (the page given its 14 back), useQamPanelHeightGuard.ts (re-measures on a header
 *           change, against Decky's page while it is moved).
 * Does not: Measure the answer's own height inside bonsAI's box (P84-HEIGHT-01 does, on the Deck).
 */
import { useCallback, useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../test-harness/steamRing");
  return { ...stubs, Focusable: SteamRingFocusable, TextField: SteamRingFocusable };
});

import { ChatTitleView } from "./ChatTitleView";
import { resetChatTitleStore } from "./chatTitleStore";
import { resetChatNameNav } from "./chatNameNav";
import { resetDeckyTitleParts } from "./deckyTitleParts";
import { resetDeckyHeaderShape, topStripActive } from "./deckyHeaderShape";
import { tabBarExitDownFor, useTopStripTabBar } from "./useTopStripTabBar";
import { TabIndicatorBar } from "../plugin-shell/TabIndicatorBar";
import type { BonsaiTabId } from "../plugin-shell/tabTitles";
import { useQamPanelHeightGuard } from "../../hooks/useQamPanelHeightGuard";
import { resetNavFocusRegistry } from "../../utils/navFocusRegistry";
import { resetUiDocument } from "../../utils/uiDocument";
import { DeckyQuickAccessPage, installQuickAccessLayout } from "../../test-harness/deckyQuickAccessLayout";
import { putSteamRingOn, type SteamEl } from "../../test-harness/steamRing";

const TABS: BonsaiTabId[] = ["main", "ollama", "settings", "permissions", "about"];

/** bonsAI's root, reduced to what the height lock and the tab bar need, wired as index.tsx wires them. */
function BonsaiRoot({ generation }: { generation: number }) {
  const [tab, setTab] = useState("main");
  const scopeRef = useRef<HTMLDivElement | null>(null);
  const exitDown = useCallback(() => tabBarExitDownFor(tab), [tab]);
  const barInStrip = useTopStripTabBar({ tab, tabIds: TABS, selectTab: setTab, exitDown, generation });
  useQamPanelHeightGuard(scopeRef);
  return (
    <div className="bonsai-scope" ref={scopeRef}>
      {barInStrip ? null : <TabIndicatorBar tabIds={TABS} currentTab={tab} selectTab={setTab} exitDown={exitDown} />}
      <div className="bonsai-decky-tabs-root">
        <div className="Tabs_TabContentsScroll">{tab} body</div>
      </div>
    </div>
  );
}

function Page({ open = true, generation = 0 }: { open?: boolean; generation?: number }) {
  return (
    <DeckyQuickAccessPage title={open ? <ChatTitleView /> : <span>Decky</span>}>
      {open ? <BonsaiRoot generation={generation} /> : null}
    </DeckyQuickAccessPage>
  );
}

const q = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const page = () => q('[data-decky="plugin-box"]').parentElement!;
const strip = () => document.querySelector<SteamEl>(".bonsai-tab-bar--strip");
/** Where bonsAI's box visibly ends: its own bottom, cut off at the bottom of Decky's page. */
function panelBottom(): number {
  const scope = q(".bonsai-scope").getBoundingClientRect();
  const pageBox = page().getBoundingClientRect();
  return Math.round(Math.min(scope.bottom, pageBox.bottom));
}
const scopeTop = () => Math.round(q(".bonsai-scope").getBoundingClientRect().top);

function switchTab(dir: "onMoveRight" | "onMoveLeft") {
  act(() => {
    strip()!.__nav![dir]!();
  });
}

let uninstallLayout: () => void = () => {};

beforeEach(() => {
  vi.useFakeTimers();
  resetChatTitleStore();
  resetChatNameNav();
  resetDeckyTitleParts();
  resetDeckyHeaderShape();
  resetNavFocusRegistry();
  resetUiDocument();
  uninstallLayout = installQuickAccessLayout();
});
afterEach(() => {
  cleanup();
  uninstallLayout();
  vi.useRealTimers();
});

describe("the panel reaches the bottom of the screen with the bar in Steam's strip", () => {
  it("Main: bonsAI's box runs from 52 to the screen's bottom, 454, with no empty band", () => {
    render(<Page />);
    act(() => vi.advanceTimersByTime(100));
    expect(topStripActive()).toBe(true);
    expect(scopeTop()).toBe(52);
    expect(panelBottom()).toBe(454);
  });

  it("another tab and back: the lock re-measures each time, 24 to 454, then 52 to 454", () => {
    render(<Page />);
    act(() => putSteamRingOn(strip()));
    switchTab("onMoveRight");
    expect(scopeTop()).toBe(24);
    expect(panelBottom()).toBe(454);
    expect(q(".bonsai-scope").getBoundingClientRect().height).toBe(430);
    switchTab("onMoveLeft");
    expect(scopeTop()).toBe(52);
    expect(panelBottom()).toBe(454);
    expect(q(".bonsai-scope").getBoundingClientRect().height).toBe(402);
  });

  it("a UI-size Apply (a new generation) re-measures too", () => {
    const view = render(<Page generation={0} />);
    q(".bonsai-scope").style.setProperty("--bonsai-qam-lock-height", "300px");
    view.rerender(<Page generation={1} />);
    expect(panelBottom()).toBe(454);
  });

  it("never writes to Steam's shared container, with the lock re-measuring through open, every tab and close", () => {
    const view = render(<Page />);
    const steam = q('[data-testid="steam-tabs"]');
    const writes: MutationRecord[] = [];
    const watch = new MutationObserver((records) => writes.push(...records));
    watch.observe(steam, { attributes: true });
    act(() => putSteamRingOn(strip()));
    for (let i = 0; i < TABS.length; i += 1) switchTab("onMoveRight");
    view.rerender(<Page open={false} />);
    act(() => vi.advanceTimersByTime(100));
    watch.disconnect();
    expect(writes).toEqual([]);
    expect(steam.getAttribute("style")).toBeNull();
  });

  it("leaving bonsAI gives Decky's page back its own height and place", () => {
    const view = render(<Page />);
    expect(page().style.height).toBe("454px");
    view.rerender(<Page open={false} />);
    expect(page().getAttribute("style")).toBeNull();
    expect(Math.round(page().getBoundingClientRect().top)).toBe(14);
    expect(Math.round(page().getBoundingClientRect().bottom)).toBe(454);
  });
});
