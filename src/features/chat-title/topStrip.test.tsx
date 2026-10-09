/**
 * Title: The tab bar in Steam's strip, and Decky's bar shaped per tab (plan 84 step 6)
 * Purpose: Pin rows P84-HEIGHT-01's top half, P84-OTHER-01, P84-BACK-01's put-back half, P84-QAM-01's
 *          never-touch-Steam half and P84-RING-01's routes at the level the Deck check looks at: Decky's
 *          real-shaped Quick Access page on the Deck's own 300 by 454 screen, laid out from the elements'
 *          own styles (test-harness/deckyQuickAccessLayout.tsx), with bonsAI's real title view in Decky's
 *          bar and a stand-in for bonsAI's root that wires the tab bar exactly as index.tsx does
 *          (useTopStripTabBar, the bar in bonsAI's box only as the fallback). Steam's ring moves only by
 *          Steam's own transfer (test-harness/steamRing.tsx). The checks read where each part lands in
 *          points, which control holds the ring, and every inline style on Decky's and Steam's parts.
 * Used for: deckyHeaderShape.ts, deckyHeaderLayout.ts, deckyTitleParts.ts, ChatTitleView.tsx, TitleTabStrip.tsx,
 *           useTopStripTabBar.ts, chatTranscriptNavHelpers.ts (`takeAboveTheChat`), useTabStripBodyOffset.ts.
 * Does not: Lay out bonsAI's tabs inside (the answer's own height is the Deck row's to measure), or prove what
 *           Steam does with a press nobody claims; the Deck rows do. The height lock is topStripHeightLock.test.tsx.
 */
import { useCallback, useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../test-harness/steamRing");
  /* The question box is a Decky TextField with the box's nav node on it: Steam's transfer lands on it. */
  return { ...stubs, Focusable: SteamRingFocusable, TextField: SteamRingFocusable };
});

import { Focusable } from "@decky/ui";
import { ChatTitleView } from "./ChatTitleView";
import { getChatTitleState, resetChatTitleStore, setChatsMenuOpen, setChatTitleLitColor } from "./chatTitleStore";
import { resetChatNameNav } from "./chatNameNav";
import { resetDeckyTitleParts } from "./deckyTitleParts";
import { resetDeckyHeaderShape, topStripActive } from "./deckyHeaderShape";
import { headerLayout, STEAM_STRIP_PX, DECKY_TITLE_PAD_TOP_PX } from "./deckyHeaderLayout";
import { tabBarExitDownFor, useTopStripTabBar } from "./useTopStripTabBar";
import { MainTabHarness, newMainTabCalls } from "./chatTitleTestFixtures";
import { TabIndicatorBar } from "../plugin-shell/TabIndicatorBar";
import { TabBodyFocusRoot } from "../plugin-shell/TabBodyFocusRoot";
import type { BonsaiTabId } from "../plugin-shell/tabTitles";
import { TAB_BAR_HEIGHT_PX } from "../unified-input/constants";
import { useTabStripBodyOffset } from "../../hooks/useTabStripBodyOffset";
import { takeAboveTheChat } from "../../utils/chatTranscriptNavHelpers";
import { resetNavFocusRegistry } from "../../utils/navFocusRegistry";
import { rememberUiDocument, resetUiDocument } from "../../utils/uiDocument";
import { DeckyQuickAccessPage, bodyTop, installQuickAccessLayout } from "../../test-harness/deckyQuickAccessLayout";
import { putSteamRingOn, steamRingHolder, type SteamEl } from "../../test-harness/steamRing";

const TABS: BonsaiTabId[] = ["main", "ollama", "settings", "permissions", "about"];
const LB = { detail: { button: 5 } };
const RB = { detail: { button: 6 } };

/** A stand-in for index.tsx's Content: the shell's tab, the tab bar wired as index.tsx wires it, the bodies. */
function BonsaiRoot({ startTab }: { startTab: string }) {
  const [tab, setTab] = useState(startTab);
  const scopeRef = useRef<HTMLDivElement | null>(null);
  const exitDown = useCallback(() => tabBarExitDownFor(tab), [tab]);
  const barInStrip = useTopStripTabBar({ tab, tabIds: TABS, selectTab: setTab, exitDown, generation: 0 });
  useTabStripBodyOffset(scopeRef);
  return (
    <div
      className="bonsai-scope"
      ref={(el) => {
        scopeRef.current = el;
        rememberUiDocument(el);
      }}
    >
      {barInStrip ? null : <TabIndicatorBar tabIds={TABS} currentTab={tab} selectTab={setTab} exitDown={exitDown} />}
      <div className="bonsai-decky-tabs-root">
        <span className="bonsai-tab-title-leaf" />
        <div className="Tabs_TabContentsScroll">
          {tab === "main" ? (
            <MainTabHarness calls={newMainTabCalls()} overrides={{ setIsUnifiedInputFocused: () => {} }} />
          ) : (
            <TabBodyFocusRoot id={tab as BonsaiTabId}>
              {/* Every tab's first control, a stop of its own. */}
              <Focusable className="first-control" {...({ focusable: true } as Record<string, unknown>)}>
                first control of {tab}
              </Focusable>
            </TabBodyFocusRoot>
          )}
        </div>
      </div>
    </div>
  );
}

/** bonsAI open in Decky's page: its title view in Decky's bar, its box in Decky's gap. */
function BonsaiInDecky({
  open = true,
  startTab = "main",
  arrow = true,
  pageId,
  titlePadTop,
}: {
  open?: boolean;
  startTab?: string;
  arrow?: boolean;
  pageId?: string;
  titlePadTop?: number;
}) {
  return (
    <DeckyQuickAccessPage
      arrow={arrow}
      pageId={pageId}
      titlePadTop={titlePadTop}
      title={open ? <ChatTitleView /> : <span>Decky</span>}
    >
      {open ? <BonsaiRoot startTab={startTab} /> : null}
    </DeckyQuickAccessPage>
  );
}

const q = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel);
const strip = () => q<SteamEl>(".bonsai-tab-bar--strip");
const name = () => q<SteamEl>(".bonsai-chat-title__name");
const arrow = () => q<HTMLElement>("button.DialogButton");
const steam = () => q<HTMLElement>('[data-testid="steam-tabs"]')!;
const page = () => q<HTMLElement>('[data-decky="plugin-box"]')!.parentElement!;
const title = () => q<HTMLElement>('[data-decky="title"]')!;
const gap = () => q<HTMLElement>('[data-decky="gap"]')!;
const box = (el: Element | null) => {
  const r = el!.getBoundingClientRect();
  return [Math.round(r.top), Math.round(r.bottom)];
};
/** The ring's place, in words. */
function ring(): string {
  const at = steamRingHolder();
  if (!at) return "nowhere";
  if (at === strip()) return "the tab bar";
  if (at === name()) return "the chat's name";
  if (at === arrow()) return "Decky's back arrow";
  if (at.closest(".bonsai-unified-input-host")) return "the question box";
  if (at.classList.contains("first-control")) return `the first control of ${at.textContent?.replace("first control of ", "")}`;
  return at.className || at.tagName;
}
function press(el: SteamEl | null, handler: "onMoveUp" | "onMoveDown" | "onMoveLeft" | "onMoveRight"): boolean {
  let claimed = false;
  act(() => {
    claimed = el!.__nav![handler]?.() === true;
  });
  return claimed;
}
function pressButton(el: SteamEl | null, evt: unknown): boolean {
  let claimed = false;
  act(() => {
    claimed = el!.__nav!.onButtonDown?.(evt) === true;
  });
  return claimed;
}
const tabShowing = () => getChatTitleState().tab;
/** Every inline style attribute on Decky's and Steam's parts. */
const deckyInline = () => ({
  steam: steam().getAttribute("style"),
  page: page().getAttribute("style"),
  title: title().getAttribute("style"),
  gap: gap().getAttribute("style"),
  arrow: arrow()?.getAttribute("style") ?? null,
});

let uninstallLayout: () => void = () => {};
let steamWrites: MutationRecord[] = [];
let steamWatch: MutationObserver | null = null;

function mount(props: Parameters<typeof BonsaiInDecky>[0] = {}) {
  const out = render(<BonsaiInDecky {...props} />);
  steamWatch = new MutationObserver((records) => steamWrites.push(...records));
  steamWatch.observe(steam(), { attributes: true });
  return out;
}

beforeEach(() => {
  resetChatTitleStore();
  resetChatNameNav();
  resetDeckyTitleParts();
  resetDeckyHeaderShape();
  resetNavFocusRegistry();
  resetUiDocument();
  steamWrites = [];
  uninstallLayout = installQuickAccessLayout();
});
afterEach(() => {
  cleanup();
  steamWatch?.disconnect();
  uninstallLayout();
});

describe("the arithmetic (deckyHeaderLayout)", () => {
  it("Main: the bar at 0-20, Decky's row at 20-48, the body from 52; other tabs from 24; today 64-84 and 88", () => {
    expect(headerLayout({ strip: true, row: true })).toEqual({ barTop: 0, barBottom: 20, rowTop: 20, rowBottom: 48, bodyTop: 52 });
    expect(headerLayout({ strip: true, row: false })).toEqual({ barTop: 0, barBottom: 20, rowTop: null, rowBottom: null, bodyTop: 24 });
    expect(headerLayout({ strip: false, row: true })).toEqual({ barTop: 64, barBottom: 84, rowTop: 20, rowBottom: 48, bodyTop: 88 });
  });

  it("the chat's name does not move (Steam's 14 and Decky's 6 are the bar's 20), and Main's body gains 36", () => {
    expect(STEAM_STRIP_PX + DECKY_TITLE_PAD_TOP_PX).toBe(TAB_BAR_HEIGHT_PX);
    const today = headerLayout({ strip: false, row: true });
    const main = headerLayout({ strip: true, row: true });
    expect([main.rowTop, main.rowBottom]).toEqual([today.rowTop, today.rowBottom]);
    expect(today.bodyTop - main.bodyTop).toBe(36);
  });
});

describe("where things land on the Deck's own screen", () => {
  it("Main: the tab bar in Steam's strip at 0-20, the back arrow and the chat's name at 20-48, the body from 52", () => {
    mount();
    expect(topStripActive()).toBe(true);
    expect(box(strip())).toEqual([0, 20]);
    expect(q(".bonsai-scope > .bonsai-tab-bar")).toBeNull(); // drawn once, in the strip
    expect(box(arrow())).toEqual([20, 48]);
    expect(box(name())).toEqual([20, 48]);
    expect(box(q(".bonsai-scope"))[0]).toBe(52);
    expect(bodyTop()).toBe(52);
  });

  it("another tab: no back arrow, no name, the strip alone above a body that starts at 24", () => {
    mount({ startTab: "ollama" });
    expect(box(strip())).toEqual([0, 20]);
    expect(arrow()!.style.display).toBe("none");
    expect(name()).toBeNull();
    expect(q(".bonsai-chat-title__wordmark")).toBeNull();
    expect(box(title())).toEqual([0, 20]);
    expect(bodyTop()).toBe(24);
  });

  it("follows every tab switch, both ways, and keeps the ring on the bar while it switches", () => {
    mount();
    putSteamRingOn(strip());
    expect(press(strip(), "onMoveRight")).toBe(true);
    expect(tabShowing()).toBe("ollama");
    expect(arrow()!.style.display).toBe("none");
    expect(bodyTop()).toBe(24);
    expect(ring()).toBe("the tab bar");
    expect(press(strip(), "onMoveLeft")).toBe(true);
    expect(tabShowing()).toBe("main");
    expect(arrow()!.style.display).toBe("");
    expect(box(name())).toEqual([20, 48]);
    expect(bodyTop()).toBe(52);
    expect(ring()).toBe("the tab bar");
  });

  it("the bar in the strip wears the character's colour, as it did in bonsAI's box (unchanged in look)", () => {
    mount();
    act(() => setChatTitleLitColor("rgb(255, 136, 0)"));
    /* The bar's current tab is drawn in var(--bonsai-ui-tab-lit); bonsAI's box sets it for the bar there, and
       the title view, the bar's ancestor in Decky's bar, must set it here. */
    const holder = strip()!.closest<HTMLElement>(".bonsai-chat-title")!;
    expect(holder.style.getPropertyValue("--bonsai-ui-tab-lit")).toBe("rgb(255, 136, 0)");
  });

  it("a pinned Quick Tab's bar, with no back arrow, gets the strip too", () => {
    mount({ arrow: false });
    expect(topStripActive()).toBe(true);
    expect(box(strip())).toEqual([0, 20]);
    expect(bodyTop()).toBe(52);
  });
});

describe("Decky's parts are put back exactly, and Steam's are never touched", () => {
  it("leaving bonsAI puts back Decky's title padding, gap, page and back arrow, with no inline style left", () => {
    const before = render(<BonsaiInDecky open={false} />);
    const untouched = deckyInline();
    before.rerender(<BonsaiInDecky open />);
    steamWatch = new MutationObserver((records) => steamWrites.push(...records));
    steamWatch.observe(steam(), { attributes: true });
    expect(title().style.paddingTop).toBe("20px");
    expect(gap().style.paddingTop).toBe("4px");
    expect(page().style.top).toBe("-14px");
    act(() => putSteamRingOn(strip()));
    press(strip(), "onMoveRight"); // another tab: the arrow hidden
    expect(arrow()!.style.display).toBe("none");
    before.rerender(<BonsaiInDecky open={false} />);
    expect(deckyInline()).toEqual(untouched);
    expect(topStripActive()).toBe(false);
    expect(box(page())).toEqual([14, 454]);
    expect(steamWrites).toEqual([]);
  });

  it("never writes to Steam's shared container, across opening, every tab and closing", () => {
    const view = mount();
    act(() => putSteamRingOn(strip()));
    for (let i = 0; i < TABS.length; i += 1) press(strip(), "onMoveRight");
    view.rerender(<BonsaiInDecky open={false} />);
    expect(steamWrites).toEqual([]);
    expect(steam().getAttribute("style")).toBeNull();
  });
});

describe("an unexpected shape changes nothing (the fallback is today's layout)", () => {
  function expectToday() {
    expect(topStripActive()).toBe(false);
    expect(strip()).toBeNull();
    expect(q(".bonsai-scope > .bonsai-tab-bar")).not.toBeNull();
    expect([title(), gap(), page()].map((el) => el.getAttribute("style"))).toEqual([null, null, null]);
    expect(arrow()?.getAttribute("style") ?? null).toBeNull();
    expect(box(q(".bonsai-scope > .bonsai-tab-bar"))).toEqual([64, 84]);
  }

  it("a page that is not one of Steam's Quick Access pages", () => {
    mount({ pageId: "some_other_page" });
    expectToday();
  });

  it("Decky's title padding is not the 6 the arithmetic starts from", () => {
    mount({ titlePadTop: 3 });
    expect(topStripActive()).toBe(false);
    expect(strip()).toBeNull();
    expect([title(), gap(), page()].map((el) => el.getAttribute("style"))).toEqual([null, null, null]);
  });

  it("Decky's title bar holds something more than its arrow and bonsAI's view", () => {
    render(
      <DeckyQuickAccessPage
        title={
          <>
            <button className="decky-extra">?</button>
            <ChatTitleView />
          </>
        }
      >
        <BonsaiRoot startTab="main" />
      </DeckyQuickAccessPage>,
    );
    expectToday();
  });

  it("bonsAI's box is not the first thing in Decky's gap", () => {
    render(
      <DeckyQuickAccessPage title={<ChatTitleView />}>
        <div className="something-of-deckys" />
        <BonsaiRoot startTab="main" />
      </DeckyQuickAccessPage>,
    );
    expect(topStripActive()).toBe(false);
    expect(strip()).toBeNull();
    expect([title(), gap(), page()].map((el) => el.getAttribute("style"))).toEqual([null, null, null]);
  });
});

describe("the D-pad at the top, Main tab", () => {
  it("strip Down: the chat's name; name Up: the strip; strip Up holds", () => {
    mount();
    act(() => putSteamRingOn(strip()));
    expect(press(strip(), "onMoveDown")).toBe(true);
    expect(ring()).toBe("the chat's name");
    expect(press(name(), "onMoveUp")).toBe(true);
    expect(ring()).toBe("the tab bar");
    expect(press(strip(), "onMoveUp")).toBe(true);
    expect(ring()).toBe("the tab bar");
  });

  it("name Down: the chat's first stop (the question box, on an empty chat)", () => {
    mount();
    act(() => putSteamRingOn(name()));
    expect(press(name(), "onMoveDown")).toBe(true);
    expect(ring()).toBe("the question box");
  });

  it("Up from the top of the chat: the chat's name (takeAboveTheChat)", () => {
    mount();
    act(() => putSteamRingOn(q(".bonsai-unified-input-host textarea") ?? q(".bonsai-unified-input-host")));
    let took = false;
    act(() => {
      took = takeAboveTheChat();
    });
    expect(took).toBe(true);
    expect(ring()).toBe("the chat's name");
  });

  it("Left and Right on the strip switch tabs and claim the press (never Steam's walk to its icon column)", () => {
    mount();
    act(() => putSteamRingOn(strip()));
    expect(press(strip(), "onMoveLeft")).toBe(true);
    expect(tabShowing()).toBe("about");
    expect(press(strip(), "onMoveRight")).toBe(true);
    expect(tabShowing()).toBe("main");
    expect(ring()).toBe("the tab bar");
  });

  it("LB and RB on the name switch tabs, and the ring goes to the strip (the other tabs draw no name)", () => {
    mount();
    act(() => putSteamRingOn(name()));
    expect(pressButton(name(), RB)).toBe(true);
    expect(tabShowing()).toBe("ollama");
    expect(ring()).toBe("the tab bar");
    expect(name()).toBeNull();
    expect(pressButton(strip(), LB)).toBe(true);
    expect(tabShowing()).toBe("main");
  });

  it("Up from the name closes an open chats menu as the ring goes", () => {
    mount();
    act(() => putSteamRingOn(name()));
    act(() => setChatsMenuOpen(true));
    expect(getChatTitleState().menuOpen).toBe(true);
    press(name(), "onMoveUp");
    expect(getChatTitleState().menuOpen).toBe(false);
    expect(ring()).toBe("the tab bar");
  });
});

describe("touch on the strip", () => {
  it("a tap on RB opens the next tab, on LB the one before, on a side icon that tab", () => {
    mount();
    act(() => q(".bonsai-tab-bar--strip .bonsai-tab-bar__shoulder--r")!.click());
    expect(tabShowing()).toBe("ollama");
    act(() => q(".bonsai-tab-bar--strip .bonsai-tab-bar__shoulder--l")!.click());
    expect(tabShowing()).toBe("main");
    act(() => q('.bonsai-tab-bar--strip .bonsai-tab-bar__peek[data-bonsai-tab="settings"]')!.click());
    expect(tabShowing()).toBe("settings");
    expect(arrow()!.style.display).toBe("none");
  });
});

describe("the D-pad at the top, other tabs", () => {
  it("strip Down: the tab's first control; Up from the top of the tab: the strip", () => {
    mount({ startTab: "settings" });
    act(() => putSteamRingOn(strip()));
    expect(press(strip(), "onMoveDown")).toBe(true);
    expect(ring()).toBe("the first control of settings");
    const body = q<SteamEl>(".bonsai-tab-body-root");
    expect(press(body, "onMoveUp")).toBe(true);
    expect(ring()).toBe("the tab bar");
  });
});

describe("the hidden back arrow never keeps the ring (plan 84 test C)", () => {
  /** Lets the page's change watchers run. */
  const settle = async () => {
    await act(async () => {
      await Promise.resolve();
    });
  };

  it("off Main, Steam's own landing on the hidden arrow (Right from its icon column) is taken to the strip", async () => {
    mount({ startTab: "ollama" });
    expect(arrow()!.style.display).toBe("none");
    act(() => putSteamRingOn(arrow()));
    await settle();
    expect(ring()).toBe("the tab bar");
  });

  it("every time, not only the first", async () => {
    mount({ startTab: "ollama" });
    for (let i = 0; i < 3; i += 1) {
      act(() => putSteamRingOn(q(".first-control")));
      await settle();
      act(() => putSteamRingOn(arrow()));
      await settle();
      expect(ring()).toBe("the tab bar");
    }
  });

  it("a ring already on the arrow when it is hidden (a tab chosen by touch) goes to the strip", async () => {
    mount();
    act(() => putSteamRingOn(arrow()));
    act(() => getChatTitleState().tabBar!.selectTab("settings"));
    await settle();
    expect(arrow()!.style.display).toBe("none");
    expect(ring()).toBe("the tab bar");
  });

  it("on Main the arrow is Decky's to hold: a person who walks Left onto it is left there, after a round trip too", async () => {
    mount();
    act(() => putSteamRingOn(arrow()));
    await settle();
    expect(ring()).toBe("Decky's back arrow");
    act(() => getChatTitleState().tabBar!.selectTab("ollama"));
    act(() => getChatTitleState().tabBar!.selectTab("main"));
    await settle();
    act(() => putSteamRingOn(name()));
    act(() => putSteamRingOn(arrow()));
    await settle();
    expect(ring()).toBe("Decky's back arrow");
  });

  it("once bonsAI has closed, nothing watches Decky's arrow", async () => {
    const view = mount({ startTab: "ollama" });
    view.rerender(<BonsaiInDecky open={false} />);
    act(() => putSteamRingOn(arrow()));
    await settle();
    expect(steamRingHolder()).toBe(arrow());
  });
});

describe("a bounded walk at the top of the Main tab", () => {
  /**
   * Steam's glide after every landing: a stop not wholly on the screen is brought into view. Decky's bar is
   * outside the scrolling pane and stays where it is, so the glide can only move the chat; the check that
   * matters is that every landing is on screen and has a size (a hidden control has none).
   */
  function landing(): [string, number, number] {
    const at = steamRingHolder()!;
    const r = at.getBoundingClientRect();
    return [ring(), Math.round(r.top), Math.round(r.bottom)];
  }

  it("Up from the chat to the strip and Down back: each stop once, each on screen, never Decky's arrow", () => {
    mount();
    act(() => {
      takeAboveTheChat();
    });
    const seen: string[] = [];
    const visit = () => {
      const [where, top, bottom] = landing();
      expect(where).not.toBe("Decky's back arrow");
      if (where !== "the question box") {
        expect(top).toBeGreaterThanOrEqual(0);
        expect(bottom).toBeLessThanOrEqual(48);
        expect(bottom - top).toBeGreaterThan(0);
      }
      seen.push(where);
    };
    visit();
    for (let i = 0; i < 4 && steamRingHolder() !== strip(); i += 1) {
      press(steamRingHolder() as SteamEl, "onMoveUp");
      visit();
    }
    expect(seen).toEqual(["the chat's name", "the tab bar"]);
    expect(press(strip(), "onMoveUp")).toBe(true);
    expect(ring()).toBe("the tab bar");
    const down: string[] = [];
    for (let i = 0; i < 4 && ring() !== "the question box"; i += 1) {
      press(steamRingHolder() as SteamEl, "onMoveDown");
      visit();
      down.push(ring());
    }
    expect(down).toEqual(["the chat's name", "the question box"]);
    expect(new Set(down).size).toBe(down.length);
  });
});

describe("the fallback keeps step 5's routes", () => {
  it("with the bar in bonsAI's box, Down from the name is the bar and the stop above the chat is the bar", () => {
    mount({ pageId: "some_other_page" });
    const bar = q<SteamEl>(".bonsai-scope > .bonsai-tab-bar");
    act(() => putSteamRingOn(name()));
    expect(press(name(), "onMoveDown")).toBe(true);
    expect(steamRingHolder()).toBe(bar);
    act(() => putSteamRingOn(name()));
    expect(name()!.__nav!.onMoveUp).toBeUndefined();
    act(() => {
      takeAboveTheChat();
    });
    expect(steamRingHolder()).toBe(bar);
  });
});
