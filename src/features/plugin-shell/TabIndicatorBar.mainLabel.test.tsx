/**
 * Title: The Main tab's name on the tab bar reads "bonsAI", in small caps (plan 87 F1)
 * Purpose: Render the real tab bar with the real scope stylesheet and pin what a person sees for the
 *          Main tab: when Main is the current tab, its name on the bar reads "bonsAI" and asks for
 *          small caps (lowercase letters small, "AI" full size, no upper-casing of the whole word);
 *          the bar's own spoken name follows; and when another tab is current, Main's side icon is
 *          still spoken as "bonsAI".
 * Used for: plan 87 lane F1 (maintainer's call 4, D127). The Deck check reads the same element.
 * Solves: The name had been "Main" and the bar's CSS upper-cases every name, so it drew "MAIN". A test
 *         that only read the label table would pass while the bar still drew the old word. This one
 *         reads the rendered text and the computed style on the element the bar draws.
 * Does not: Measure the words on the Deck's screen; jsdom has no layout. The Deck check reads the
 *           computed style of the same element with the probe.
 */
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TabIndicatorBar } from "./TabIndicatorBar";
import { ALL_BONSAI_TAB_IDS } from "./tabTitles";
import { buildBonsaiScopeStylesheet } from "../../styles/bonsaiScopeStylesheet";

describe("the Main tab's name on the tab bar", () => {
  let style: HTMLStyleElement;
  let scope: HTMLDivElement;

  beforeEach(() => {
    style = document.createElement("style");
    style.textContent = buildBonsaiScopeStylesheet();
    document.head.appendChild(style);
    scope = document.createElement("div");
    scope.className = "bonsai-scope";
    document.body.appendChild(scope);
  });

  afterEach(() => {
    style.remove();
    scope.remove();
  });

  it("reads bonsAI and asks for small caps when Main is the current tab", () => {
    const host = scope.appendChild(document.createElement("div"));
    const { container } = render(
      <TabIndicatorBar tabIds={ALL_BONSAI_TAB_IDS} currentTab="main" selectTab={vi.fn()} exitDown={() => true} />,
      { container: host },
    );

    const name = container.querySelector(".bonsai-tab-bar__name") as HTMLElement;
    expect(name.textContent).toBe("bonsAI");

    const cs = getComputedStyle(name);
    expect(cs.fontVariantCaps).toBe("small-caps");
    expect(cs.textTransform).toBe("none");

    const bar = container.querySelector(".bonsai-tab-bar") as HTMLElement;
    expect(bar.getAttribute("aria-label")).toBe("bonsAI tab");
  });

  it("keeps Main's spoken name as bonsAI when another tab is current", () => {
    const host = scope.appendChild(document.createElement("div"));
    const { container } = render(
      <TabIndicatorBar tabIds={ALL_BONSAI_TAB_IDS} currentTab="settings" selectTab={vi.fn()} exitDown={() => true} />,
      { container: host },
    );

    const mainPeek = container.querySelector('[data-bonsai-tab="main"]') as HTMLElement;
    expect(mainPeek.getAttribute("aria-label")).toBe("bonsAI");

    // The current tab's own name is unchanged: Settings, drawn in capitals as before.
    const settingsName = container.querySelector(".bonsai-tab-bar__name") as HTMLElement;
    expect(settingsName.textContent).toBe("Settings");
    expect(getComputedStyle(settingsName).textTransform).toBe("uppercase");
    expect(getComputedStyle(settingsName).fontVariantCaps).not.toBe("small-caps");
  });
});
