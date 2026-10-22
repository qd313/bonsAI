/**
 * Title: Steam's own tab row stays hidden, and the plugin log says when it had to be hidden
 * Purpose: Pin the guard at the level the Deck check reads: Steam's row (in its real shape, from the
 *          test stand-in) has a computed display of none whatever state it arrives in, the guard writes
 *          exactly one plugin-log line with the page read when it had to act, and it touches nothing it
 *          should not (a row already hidden, Steam mid-rebuild, a strip that is not the panel's child).
 * Used for: plan 97 L15 (row P97-L15-GHOST is the on-device half).
 * Does not: prove Steam draws the row in either badge shape on the Deck; the stand-in is read from
 *           plan 30's probe and the scoping note's suspicion.
 */
import { act, render } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { STEAM_TAB_ROW_HIDE_SELECTOR, STEAM_TAB_ROW_LOG_TAG, SteamTabRowGuard } from "./useSteamTabRowGuard";
import { buildSection1Section } from "../../styles/sections/section-1";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";
import { SteamTabsPanel } from "../../test-harness/deckyQuickAccessLayout";

const HIDE_RULE_CSS = `${STEAM_TAB_ROW_HIDE_SELECTOR} { display: none !important; }`;

function Plugin({
  badges = "images",
  body = true,
  hideRule = false,
  stray = false,
}: {
  badges?: "images" | "text";
  body?: boolean;
  hideRule?: boolean;
  stray?: boolean;
}) {
  return (
    <div className="bonsai-scope">
      {hideRule ? <style>{HIDE_RULE_CSS}</style> : null}
      <SteamTabRowGuard />
      <div className="bonsai-decky-tabs-root">
        <SteamTabsPanel badges={badges} body={body}>
          <button>chip</button>
        </SteamTabsPanel>
        {stray ? (
          <div data-test="stray">
            <div className="bonsai-tab-title-leaf" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

const row = () => document.querySelector<HTMLElement>('[data-steam="tab-row"]')!;
const shownOnScreen = (el: HTMLElement) => getComputedStyle(el).display !== "none";
const logLines = () => getRpcCallLog().filter((c) => c.method === "dbg_fe_log");
const flush = () => act(async () => new Promise((r) => setTimeout(r, 0)));

describe("SteamTabRowGuard", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
    setRpcHandler("dbg_fe_log", () => ({ ok: true }));
  });
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("guards the same selector the stylesheet hides the row with", () => {
    expect(buildSection1Section()).toContain(STEAM_TAB_ROW_HIDE_SELECTOR);
  });

  it("does nothing and logs nothing when the style rule already hides the row", async () => {
    render(<Plugin hideRule />);
    await flush();
    expect(shownOnScreen(row())).toBe(false);
    expect(row().style.display).toBe("");
    expect(logLines()).toHaveLength(0);
  });

  it("hides a shown row with text badges and logs one line with the page read", async () => {
    render(<Plugin badges="text" hideRule />);
    await flush();
    expect(shownOnScreen(row())).toBe(false);
    expect(row().style.getPropertyPriority("display")).toBe("important");
    expect(logLines()).toHaveLength(1);
    const [tag, read] = logLines()[0].args as [string, Record<string, unknown>];
    expect(tag).toBe(STEAM_TAB_ROW_LOG_TAG);
    expect(read).toMatchObject({
      why: "mount",
      display: "block",
      ruleMatches: false,
      imgBadges: 0,
      textBadges: 2,
      rows: 1,
      expectedBox: true,
      plugBoxes: 1,
      n: 1,
    });
    expect(read).toHaveProperty("position");
    expect(read).toHaveProperty("h");
  });

  it("hides a shown row whose badges are images when the rule matches but is not applied", async () => {
    render(<Plugin badges="images" />);
    await flush();
    expect(shownOnScreen(row())).toBe(false);
    const read = logLines()[0].args[1] as Record<string, unknown>;
    expect(read).toMatchObject({ ruleMatches: true, imgBadges: 2, textBadges: 0 });
    // The fix itself fires a style change; the next check finds the row hidden and stays quiet.
    await flush();
    expect(logLines()).toHaveLength(1);
  });

  it("hides the row Steam draws again after a rebuild, on the page change", async () => {
    const view = render(<Plugin body={false} badges="text" />);
    await flush();
    // Mid-rebuild (no tab body yet): nothing is touched, nothing logged.
    expect(row().style.display).toBe("");
    expect(shownOnScreen(row())).toBe(true);
    expect(logLines()).toHaveLength(0);

    view.rerender(<Plugin body badges="text" />);
    await flush();
    expect(shownOnScreen(row())).toBe(false);
    expect((logLines()[0].args[1] as Record<string, unknown>).why).toBe("page");
  });

  it("checks again on a touch when the style rule stops applying with no change in the tabs", async () => {
    render(<Plugin hideRule />);
    await flush();
    expect(shownOnScreen(row())).toBe(false);
    // The stylesheet sits outside the tabs root, so losing it reaches no page watcher.
    document.querySelector(".bonsai-scope > style")!.remove();
    expect(shownOnScreen(row())).toBe(true);
    expect(logLines()).toHaveLength(0);
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    await flush();
    expect(shownOnScreen(row())).toBe(false);
    expect((logLines()[0].args[1] as Record<string, unknown>).why).toBe("touch");
  });

  it("leaves alone a strip that is not a direct child of Steam's tab panel, and the row's inner parts", async () => {
    render(<Plugin badges="text" stray />);
    await flush();
    const stray = document.querySelector<HTMLElement>('[data-test="stray"]')!;
    expect(stray.style.display).toBe("");
    expect(document.querySelector<HTMLElement>('[data-steam="tab-row-inner"]')!.style.display).toBe("");
    expect(document.querySelector<HTMLElement>('[data-steam="tab-body"]')!.style.display).toBe("");
    expect(shownOnScreen(row())).toBe(false);
    expect(logLines()).toHaveLength(1);
  });

  it("leaves everything alone when the only leaves sit straight under the tabs root", async () => {
    render(
      <div className="bonsai-scope">
        <SteamTabRowGuard />
        <div className="bonsai-decky-tabs-root">
          <div data-test="flat">
            <div className="bonsai-tab-title-leaf" />
          </div>
          <div className="TabContentsScroll_x6" />
        </div>
      </div>
    );
    await flush();
    expect(document.querySelector<HTMLElement>('[data-test="flat"]')!.style.display).toBe("");
    expect(logLines()).toHaveLength(0);
  });
});

void React;
