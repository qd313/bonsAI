/**
 * Title: About tab, one line per row
 * Purpose: Pin the About tab's dense layout (plan 92, lane T3; plan 91 § 2c and § 3d; the maintainer's pick,
 *          round 2 option A with round 3 option D on the density board). On the Deck the tab was 877 points
 *          tall (two screens on the Deck's own screen) because every row was a full Steam row with its text
 *          always drawn. Now: "Version 0.5.0" is a plain line that is not a stop; "What bonsAI is" is a
 *          one-line row whose paragraph is drawn under it only while the ring is on it; the beta warning is one
 *          short visible line; "Reply language" is one line (the label and Steam's dropdown) whose hint opens
 *          under it the same way; GitHub, Built on Ollama! and Bugs & Feature Requests are three small buttons
 *          beside a smaller QR code, which is a stop of its own (AboutLinks.test.tsx walks them).
 *          The words are checked against the drawing's own data (docs/demos/mockup-board-2/src/42-tabs-data.js
 *          and 44-tabs.js), so the page and the board cannot drift apart unnoticed.
 *          What changed from the earlier version of this file: the first three tests (the support button is a
 *          button built like its three neighbours, holds only its words, and the QR sits above it) described
 *          the old full-width rows and are replaced; the PayPal press and the Version line tests stay.
 * Used for: AboutTab.tsx, AboutRevealRow.tsx, AboutReplyLanguageSection.tsx, styles/sections/aboutTab.ts.
 * Does not: Measure anything: jsdom has no layout. The size of the whole tab (under 1.3 times the pane) and the
 *           walk on the real screen are the Deck check (plan 92, block 3); AboutTab.walk.test.tsx models the walk.
 */
import { act, render, screen } from "@testing-library/react";
import { toaster } from "@decky/api";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const kit = await import("../test-harness/aboutDeckyUi");
  return { ...stubs, Focusable: kit.KeepNavFocusable, Button: kit.KeepNavButton, Dropdown: kit.StopDropdown };
});

import { callNav } from "../test-harness/aboutDeckyUi";
import { AboutTab } from "./AboutTab";
import { PLUGIN_VERSION } from "../pluginVersion";
import { buildBonsaiScopeStylesheet } from "../styles/bonsaiScopeStylesheet";

const BOARD = join(__dirname, "../../docs/demos/mockup-board-2/src");
const dataText = readFileSync(join(BOARD, "42-tabs-data.js"), "utf8");
const drawingText = readFileSync(join(BOARD, "44-tabs.js"), "utf8");
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

const whatIsRow = (root: HTMLElement) => root.querySelector<HTMLElement>('[data-bonsai-about-row="what-is"]')!;
const languageRow = (root: HTMLElement) => root.querySelector<HTMLElement>("[data-bonsai-about-language-dropdown]")!;
const revealOf = (root: HTMLElement, id: string) => root.querySelector<HTMLElement>(`[data-bonsai-about-reveal="${id}"]`);

describe("About tab: the rows, in the drawing's order and words", () => {
  it("draws the three section headings the drawing has", () => {
    const { container } = renderAbout();
    const drawn = Array.from(aboutData.matchAll(/sec\("([^"]+)"\)/g)).map((m) => m[1]);
    const titles = Array.from(container.querySelectorAll('[data-decky-ui="PanelSection"]')).map((s) => s.getAttribute("title"));
    expect(drawn).toEqual(["About bonsAI", "Reply language", "Links"]);
    expect(titles).toEqual(drawn);
  });

  it("has the stops in the drawing's order: What bonsAI is, Reply language, the three links, the QR", () => {
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
    expect(stops).toEqual(["what-is", "Dropdown", ...links]);
  });

  it("names the first row and the beta line as the drawing words them", () => {
    expect(drawingText).toContain('"What bonsAI is"');
    const drawnBeta = drawingText.match(/"(Beta: [^"]+)"/)![1];
    const { container } = renderAbout();
    expect(whatIsRow(container).textContent).toBe("What bonsAI is");
    expect(container.querySelector(".bonsai-about-beta")!.textContent).toBe(drawnBeta);
  });

  it("labels the language row as the drawing does", () => {
    const { container } = renderAbout();
    const drawn = aboutData.match(/label: "([^"]+)", value: "([^"]+)"/)!;
    expect(drawn.slice(1)).toEqual(["Language", "Follow system"]);
    expect(container.querySelector(".bonsai-about-lang-label")!.textContent).toBe(drawn[1]);
  });

  it("draws the Version line as plain text, not a stop", () => {
    const { container } = renderAbout();
    const line = screen.getByText(`Version ${PLUGIN_VERSION}`);
    expect(line.closest("button")).toBeNull();
    expect(line.closest("[tabindex]")).toBeNull();
    expect(container.querySelectorAll("[data-bonsai-about-row]")).toHaveLength(1);
  });
});

describe("About tab: the paragraph under 'What bonsAI is' is drawn only while the ring is on the row", () => {
  it("is not drawn at first", () => {
    const { container } = renderAbout();
    expect(revealOf(container, "what-is")).toBeNull();
    expect(container.textContent).not.toContain("Backend Ollama Node for Steam");
  });

  it("opens under the row when Steam puts the ring on it, with the drawing's words, and closes when the ring leaves", () => {
    const { container } = renderAbout();
    const row = whatIsRow(container);
    callNav(row, "onGamepadFocus");
    const open = revealOf(container, "what-is");
    expect(open).not.toBeNull();
    const drawn = aboutData.match(/para\("(Backend Ollama[^"]+)"/)![1];
    expect(squash(open!.textContent!)).toBe(squash(drawn));
    // Under the row, not inside it: the ring stays on the one line.
    expect(row.contains(open)).toBe(false);
    expect(row.parentElement!.contains(open)).toBe(true);
    callNav(row, "onGamepadBlur");
    expect(revealOf(container, "what-is")).toBeNull();
  });

  it("opens and closes on a plain focus and blur as well", () => {
    const { container } = renderAbout();
    const row = whatIsRow(container);
    act(() => row.focus());
    expect(revealOf(container, "what-is")).not.toBeNull();
    act(() => row.blur());
    expect(revealOf(container, "what-is")).toBeNull();
  });

  it("keeps the beta line on screen whether or not the ring is on the row", () => {
    const { container } = renderAbout();
    const beta = () => container.querySelector(".bonsai-about-beta");
    expect(beta()).not.toBeNull();
    callNav(whatIsRow(container), "onGamepadFocus");
    expect(beta()).not.toBeNull();
    expect(squash(beta()!.textContent!)).toMatch(/^Beta: check AI advice/);
  });

  it("opens the Reply language hint the same way, with the line naming Steam's language while on 'follow system'", () => {
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

describe("About tab: the QR code is smaller", () => {
  /** A rule's declarations in the plugin's real stylesheet, found by its selector. */
  function declarations(selector: string): string {
    const css = buildBonsaiScopeStylesheet().replace(/\/\*[\s\S]*?\*\//g, "");
    const at = css.indexOf(selector + " {");
    expect(at, `${selector} has a rule`).toBeGreaterThan(-1);
    return css.slice(at, css.indexOf("}", at));
  }

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
