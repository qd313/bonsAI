/**
 * Title: About tab, one line per row
 * Purpose: Pin the About tab's dense layout (plan 92, lane T3; plan 91 § 2c and § 3d; the maintainer's pick,
 *          round 2 option A with round 3 option D on the density board). On the Deck the tab was 877 points
 *          tall (two screens on the Deck's own screen) because every row was a full Steam row with its text
 *          always drawn. Now: "Version 0.5.0" sits on the title line beside "About bonsAI" (plain text, not a stop, no row of its own); the "What bonsAI is" paragraph
 *          and the green beta notice are plain text, always drawn, as before plan 92 (the maintainer asked for
 *          them back on 2026-10-12, so the reveal-on-focus row is gone and the first stop is the Reply language
 *          dropdown); "Reply language" is one line (Steam's dropdown at the full width of the row, no "Language" label) whose hint opens
 *          under it the same way; GitHub, Built on Ollama! and Bugs & Feature Requests are three small buttons
 *          beside a smaller QR code, which is a stop of its own (AboutLinks.test.tsx walks them).
 *          The words are checked against the drawing's own data (docs/demos/mockup-board-2/src/42-tabs-data.js
 *          and 44-tabs.js), so the page and the board cannot drift apart unnoticed.
 *          What changed from the earlier version of this file: the first three tests (the support button is a
 *          button built like its three neighbours, holds only its words, and the QR sits above it) described
 *          the old full-width rows and are replaced; the PayPal press test stays.
 * Used for: AboutTab.tsx, AboutRevealRow.tsx, AboutReplyLanguageSection.tsx, styles/sections/aboutTab.ts.
 * Does not: Measure anything: jsdom has no layout. The size of the whole tab (under 1.3 times the pane) and the
 *           walk on the real screen are the Deck check (plan 92, block 3); AboutTab.walk.test.tsx models the walk.
 */
import { act, render, screen } from "@testing-library/react";
import { toaster } from "@decky/api";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const kit = await import("../../test-harness/aboutDeckyUi");
  const React = await import("react");
  // Steam's PanelSection draws its title as the first child of the section, in a title element of its own; the
  // shared stub only puts it in an attribute, so this one draws it, which is what lets a title hold a node.
  const PanelSection = ({ title, children }: { title?: React.ReactNode; children?: React.ReactNode }) =>
    React.createElement(
      "div",
      { "data-decky-ui": "PanelSection" },
      React.createElement("div", { "data-test-section-title": "" }, title),
      children,
    );
  return { ...stubs, PanelSection, Focusable: kit.KeepNavFocusable, Button: kit.KeepNavButton, Dropdown: kit.StopDropdown };
});

import { callNav } from "../../test-harness/aboutDeckyUi";
import { findFirstSrcFile, repoRoot } from "../../test-harness/repoPaths";
import { AboutTab } from "./AboutTab";
import { PLUGIN_VERSION } from "../../pluginVersion";
import { resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";
import { buildBonsaiScopeStylesheet } from "../../styles/bonsaiScopeStylesheet";
import { SETTINGS_GLASS_BTN } from "../../styles/settingsGlassButton";

const BOARD = join(repoRoot(), "docs", "demos", "mockup-board-2", "src");
const dataText = readFileSync(join(BOARD, "42-tabs-data.js"), "utf8");
/** The About tab's rows as the drawing's data file lists them. */
const aboutData = dataText.slice(dataText.indexOf("About: { icon"));
const squash = (text: string) => text.replace(/\s+/g, " ").trim();

function renderAbout() {
  return render(
    <AboutTab
      githubRepoUrl="https://example.invalid/github"
      ollamaRepoUrl="https://example.invalid/ollama"
      githubIssuesUrl="https://example.invalid/issues"
      replyLanguage="follow_system"
      onReplyLanguageChange={() => {}}
      effectiveLang="en"
      steamClientLanguageLabel="English"
      t={(key) => key}
    />,
  );
}

/** The beta sentence as the About tab worded it before plan 92 (commit d553a5b4), on one line, minus the clause about TDP and performance changes (cut 2026-10-14: bonsAI stopped making them on 2026-07-30). */
const BETA_SENTENCE = "This plugin is in beta. AI-generated recommendations should be verified before relying on them. Use at your own risk!";
const languageRow = (root: HTMLElement) => root.querySelector<HTMLElement>("[data-bonsai-about-language-dropdown]")!;
/** A rule's declarations in the plugin's real stylesheet, found by its selector. */
function declarations(selector: string): string {
  const css = buildBonsaiScopeStylesheet().replace(/\/\*[\s\S]*?\*\//g, "");
  const at = css.indexOf(selector + " {");
  expect(at, `${selector} has a rule`).toBeGreaterThan(-1);
  return css.slice(at, css.indexOf("}", at));
}
const revealOf = (root: HTMLElement, id: string) => root.querySelector<HTMLElement>(`[data-bonsai-about-reveal="${id}"]`);

describe("About tab: the rows, in the drawing's order and words", () => {
  it("draws the three section headings the drawing has", () => {
    const { container } = renderAbout();
    const drawn = Array.from(aboutData.matchAll(/sec\("([^"]+)"\)/g)).map((m) => m[1]);
    // The words of each title: the first text in its title element (the About title also holds the version).
    const titles = Array.from(container.querySelectorAll("[data-test-section-title]")).map((t) => t.firstChild?.textContent);
    expect(drawn).toEqual(["About bonsAI", "Reply language", "Links"]);
    expect(titles).toEqual(drawn);
  });

  it("has the stops in order: Reply language first, then the three links and the QR (no 'What bonsAI is' stop)", () => {
    const { container } = renderAbout();
    const stops = Array.from(
      container.querySelectorAll<HTMLElement>(
        '[data-bonsai-about-row], [data-decky-ui="Dropdown"], button',
      ),
    ).map((el) =>
      el.tagName === "BUTTON" ? el.textContent : (el.getAttribute("data-bonsai-about-row") ?? el.getAttribute("data-decky-ui")),
    );
    const links = Array.from(aboutData.matchAll(/sbtn\("([^"]+)", \{ link: true \}\)/g)).map((m) => m[1]);
    expect(links).toEqual(["GitHub", "Built on Ollama!", "Bugs & Feature Requests", "Support my Steam Sale habit"]);
    // The QR block is the drawing's fourth link ("Support my Steam Sale habit"), beside the other three.
    expect(stops).toEqual(["Dropdown", ...links]);
  });

  it("has no 'Language' label beside the dropdown: the section title already says it", () => {
    const { container } = renderAbout();
    const row = languageRow(container);
    expect(row.querySelector(".bonsai-about-lang-label")).toBeNull();
    expect(container.querySelector(".bonsai-about-lang-label")).toBeNull();
    // The row holds the dropdown and nothing else, and no text of its own ("Language") sits in it.
    expect(row.children).toHaveLength(1);
    expect(row.children[0]!.getAttribute("data-decky-ui")).toBe("Dropdown");
    expect(Array.from(row.childNodes).filter((n) => n.nodeType === Node.TEXT_NODE)).toHaveLength(0);
    // The section title stays.
    const titles = Array.from(container.querySelectorAll("[data-test-section-title]")).map((t) => t.firstChild?.textContent);
    expect(titles).toContain("Reply language");
  });

  it("makes the dropdown as wide as the row, read out of the stylesheet", () => {
    const row = declarations(".bonsai-scope .bonsai-about-lang");
    expect(row).toMatch(/width:\s*100%/);
    expect(row).toMatch(/display:\s*flex/);
    const dropdown = declarations(".bonsai-scope .bonsai-about-lang > :last-child");
    expect(dropdown).toMatch(/width:\s*100%/);
    expect(dropdown).toMatch(/flex:\s*1 1 100%/);
    // The old rule gave it 56 percent of the row beside a label.
    expect(dropdown).not.toMatch(/56%/);
  });

  it("puts 'About bonsAI' and the version on one line: the version sits in the title itself, not in a row of its own", () => {
    const { container } = renderAbout();
    const title = container.querySelector<HTMLElement>("[data-test-section-title]")!;
    expect(title.firstChild!.textContent).toBe("About bonsAI");
    const version = title.querySelector<HTMLElement>("[data-bonsai-about-version]")!;
    expect(version.textContent).toBe(`Version ${PLUGIN_VERSION}`);
    // The version comes after the title's words, on the same line (a span inside the title element).
    expect(title.textContent).toBe(`About bonsAI${version.textContent}`);
    expect(version.tagName).toBe("SPAN");
    // Nothing else on the tab says the version: no separate row.
    expect(container.querySelectorAll("[data-bonsai-about-version]")).toHaveLength(1);
    expect(container.querySelector(".bonsai-about-version")).toBeNull();
    expect(screen.getAllByText(`Version ${PLUGIN_VERSION}`)).toHaveLength(1);
  });

  it("draws the version as plain text, not a stop, in the quieter description colour and plain case", () => {
    const { container } = renderAbout();
    const version = container.querySelector<HTMLElement>("[data-bonsai-about-version]")!;
    expect(version.closest("button")).toBeNull();
    expect(version.closest("[tabindex]")).toBeNull();
    expect(container.querySelectorAll("[data-bonsai-about-row]")).toHaveLength(0);
    // Steam's title is capitals and bold; the version is not, and it takes the description grey.
    const rule = declarations(".bonsai-scope .bonsai-about-title-version");
    expect(rule).toMatch(/color:\s*#c8c8c8/);
    expect(rule).toMatch(/text-transform:\s*none/);
    expect(rule).toMatch(/font-size:\s*calc\(/);
  });
});

describe("About tab: the paragraph and the beta notice are always shown at the top, with no ring anywhere", () => {
  it("draws the 'What bonsAI is' paragraph in the drawing's words, with nothing focused and no reveal row", () => {
    const { container } = renderAbout();
    expect(document.activeElement === document.body || document.activeElement === null).toBe(true);
    const blurb = container.querySelector<HTMLElement>("[data-bonsai-about-blurb]")!;
    expect(blurb).not.toBeNull();
    const drawn = aboutData.match(/para\("(Backend Ollama[^"]+)"/)![1];
    expect(squash(blurb.textContent!)).toBe(squash(drawn));
    expect(container.querySelector("[data-bonsai-about-row]")).toBeNull();
    expect(container.querySelector('[data-bonsai-about-reveal="what-is"]')).toBeNull();
  });

  it("draws the old green beta sentence in full, in the plugin's forest green, as plain text", () => {
    const { container } = renderAbout();
    const beta = container.querySelector<HTMLElement>("[data-bonsai-about-beta]")!;
    expect(squash(beta.textContent!)).toBe(BETA_SENTENCE);
    expect(beta.closest("button")).toBeNull();
    expect(beta.closest("[tabindex]")).toBeNull();
    const rule = declarations(".bonsai-scope .bonsai-about-beta");
    expect(rule).toMatch(/color:\s*#2e8753/);
  });

  it("sets the sizes of both through the text-size helper, not a raw size in the markup", () => {
    const { container } = renderAbout();
    for (const hook of ["[data-bonsai-about-blurb]", "[data-bonsai-about-beta]"]) {
      expect(container.querySelector(hook)!.getAttribute("style")).toBeNull();
    }
    expect(declarations(".bonsai-scope .bonsai-about-blurb")).toMatch(/font-size:\s*calc\(/);
  });

  it("opens the Reply language hint on the ring, with the line naming Steam's language while on 'follow system'", () => {
    const { container } = renderAbout();
    const row = languageRow(container);
    expect(revealOf(container, "language")).toBeNull();
    callNav(row, "onGamepadFocus");
    const open = revealOf(container, "language");
    expect(open).not.toBeNull();
    expect(open!.textContent).toContain("Steam client language: English");
    callNav(row, "onGamepadBlur");
    expect(revealOf(container, "language")).toBeNull();
  });
});

describe("About tab: the link buttons wear the floating Open all button's colours", () => {
  const link = () => declarations(".bonsai-scope .bonsai-about-links .bonsai-about-link").replace(/\s+/g, " ");

  it("reads the same background, border and text colour out of the stylesheet as the floating button's style object", () => {
    // FoldAllButton spreads SETTINGS_GLASS_BTN onto its Button: that object is what is on the Deck.
    expect(link()).toContain(`background: ${SETTINGS_GLASS_BTN.background} !important`);
    expect(link()).toContain(`border: ${SETTINGS_GLASS_BTN.border} !important`);
    expect(link()).toContain(`color: ${SETTINGS_GLASS_BTN.color} !important`);
  });

  it("is light text on a dark fill, and the old plain Steam fill is no longer what the links show", () => {
    expect(SETTINGS_GLASS_BTN.color).toBe("#e8eef5");
    expect(String(SETTINGS_GLASS_BTN.background)).toContain("rgba(255,255,255,0.16)");
    expect(link()).not.toMatch(/background:\s*none/);
  });

  it("keeps the white focus ring class on every link and leaves the QR block's own look alone", () => {
    const { container } = renderAbout();
    for (const button of container.querySelectorAll("[data-bonsai-about-link]")) {
      expect(button.classList.contains("bonsai-settings-focus-btn")).toBe(true);
    }
    const qr = declarations(".bonsai-scope .bonsai-about-links .bonsai-about-qr").replace(/\s+/g, " ");
    expect(qr).toContain("background: none !important");
    expect(qr).toContain("color: #b8bcbf");
  });

  it("does not keep a second copy of the colours: the About styles take them from the shared button file", () => {
    const source = readFileSync(findFirstSrcFile(["aboutTabStyles.ts", "aboutTabStyles.ts"]), "utf8");
    expect(source).not.toContain("#e8eef5");
    expect(source).not.toContain("rgba(255,255,255,0.16)");
  });
});

describe("About tab: the QR code is smaller", () => {
  it("draws the picture 88 points square, down from 132, read out of the stylesheet", () => {
    const rule = declarations(".bonsai-scope .bonsai-about-qr-img");
    expect(rule).toMatch(/width:\s*88px/);
    expect(rule).toMatch(/height:\s*88px/);
    expect(88).toBeLessThan(132);
  });

  it("fits inside the QR button's column, and the link buttons' column is no taller than the QR block", () => {
    const column = declarations(".bonsai-scope .bonsai-about-links .bonsai-about-qr");
    const width = Number(column.match(/width:\s*(\d+)px/)![1]);
    expect(width).toBeGreaterThanOrEqual(88);
    const link = declarations(".bonsai-scope .bonsai-about-links .bonsai-about-link");
    const height = Number(link.match(/height:\s*(\d+)px/)![1]);
    const gap = Number(declarations(".bonsai-scope .bonsai-about-links-col").match(/gap:\s*(\d+)px/)![1]);
    // Three small buttons and their two gaps stand beside the picture (88) and its caption.
    expect(3 * height + 2 * gap).toBeLessThanOrEqual(88 + 3 + 33);
  });

  it("lets a long link label wrap instead of being cut with an ellipsis", () => {
    // Plan 96 F16: "Bugs & Feature Requests" needs 172 px on one line in a 158 px button and was cut. The
    // buttons keep a 28 px minimum but grow to fit two lines.
    const rule = declarations(".bonsai-scope .bonsai-about-links .bonsai-about-link").replace(/\s+/g, " ");
    expect(rule).toContain("white-space: normal");
    expect(rule).toMatch(/(^|[^-])height: auto/);
    expect(rule).toMatch(/min-height:\s*28px/);
    expect(rule).not.toContain("text-overflow: ellipsis");
  });

  it("sets no size of its own on the picture, so the stylesheet's is the one that counts", () => {
    const { container } = renderAbout();
    const img = container.querySelector<HTMLImageElement>("img.bonsai-about-qr-img")!;
    expect(img).toBeTruthy();
    expect(img.getAttribute("style")).toBeNull();
    expect(img.getAttribute("alt")).toBe("Support on PayPal — Support my Steam Sale habit");
  });
});

describe("About tab: A on the QR opens the support page", () => {
  it("lands on the PayPal address, as the old support button did", () => {
    const { container } = renderAbout();
    const qr = container.querySelector<HTMLElement>("[data-bonsai-about-qr]")!;
    expect(qr.textContent).toBe("Support my Steam Sale habit");
    act(() => qr.click());
    // The test harness has no Steam browser, so the press lands on the toast fallback, which
    // names the page it could not open.
    expect(toaster.toast).toHaveBeenCalledWith(
      expect.objectContaining({ body: "https://paypal.me/quentind313" }),
    );
  });
});

describe("About tab: the build on the title line (P97-L6-ABOUT-BUILD)", () => {
  afterEach(() => resetFakeDeckyRpc());

  it("reads 'Version <v> \u00b7 build <12 characters>' once the back end answers", async () => {
    setRpcHandler("get_build_info", () => ({ build: "8bdfff8b7f5e", modified: 1 }));
    const { container } = renderAbout();
    await act(async () => {});
    const version = container.querySelector<HTMLElement>("[data-bonsai-about-version]")!;
    expect(version.textContent).toBe(`Version ${PLUGIN_VERSION} \u00b7 build 8bdfff8b7f5e`);
    expect(container.querySelectorAll("[data-bonsai-about-version]")).toHaveLength(1);
  });

  it("says 'build unknown' when the back end could not read the bundle", async () => {
    setRpcHandler("get_build_info", () => ({ build: "unknown", modified: null }));
    const { container } = renderAbout();
    await act(async () => {});
    expect(container.querySelector("[data-bonsai-about-version]")!.textContent).toBe(
      `Version ${PLUGIN_VERSION} \u00b7 build unknown`,
    );
  });

  it("keeps the plain version line when the call fails", async () => {
    setRpcHandler("get_build_info", () => {
      throw new Error("no such method");
    });
    const { container } = renderAbout();
    await act(async () => {});
    expect(container.querySelector("[data-bonsai-about-version]")!.textContent).toBe(`Version ${PLUGIN_VERSION}`);
  });
});
