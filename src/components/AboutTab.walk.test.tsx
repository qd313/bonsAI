/**
 * Title: About tab -- a bounded D-pad walk of the whole tab
 * Purpose: Walk the real About tab, inside the real tab-body root and a scrolling pane, the way the Deck's
 *          controller rig will (plan 92, block 3): Down from the first stop to the last, Right to the QR code,
 *          Left back, then Up to the top. The stops are, in order: Reply language, GitHub,
 *          Built on Ollama!, Bugs & Feature Requests, and the QR code (the version on the title line, the "What bonsAI is" paragraph
 *          and the beta notice are plain text, not stops, since 2026-10-12). Each press is
 *          Steam's, routed through its tree of containers (steamStep in the About test kit): the stop's own move
 *          handler first, then each container around it, which walks its children only along its own
 *          `flow-children` and otherwise offers the press to its own handler; a container with no flow walks
 *          nothing. Then Steam's own scroll of the landing into its padded band, after the plugin's focus
 *          listener has placed the pane (useTabBodyFocusScroll). The Reply language hint opens under its
 *          row on the ring and grows the page under itself, so the numbers are read with it open.
 * Used for: AboutTab.tsx and its pieces; fails on the earlier layout (no "What bonsAI is" stop, the language
 *           dropdown first, four full-width link rows, a support button after a 132 point picture), and on the
 *           first round's links block (build 5d67f9d9), exactly as the Deck did: Down from GitHub went nowhere,
 *           because the block set no flow and the buttons sat in a plain div. A walk by distance on screen had
 *           passed it.
 * Does not: Know Steam's code (the tree model is what the Deck has shown: rows of a tab body walk as a column
 *           with no flow set; the links block with none walked nothing), or paint: jsdom has no layout, so every
 *           stop's box is a number laid out below from the stylesheet's own sizes (the link height and the
 *           picture's side) and the drawing's row heights. The real walk is the Deck check.
 */
import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const kit = await import("../test-harness/aboutDeckyUi");
  return { ...stubs, Focusable: kit.KeepNavFocusable, Button: kit.KeepNavButton, Dropdown: kit.StopDropdown };
});

import { steamStep } from "../test-harness/aboutDeckyUi";
import { TabBodyFocusRoot } from "../features/plugin-shell/TabBodyFocusRoot";
import { AboutTab } from "./AboutTab";
import { resetAboutLinksMemory } from "./AboutLinks";
import { ABOUT_LINK_HEIGHT_PX, ABOUT_QR_SIZE_PX } from "../styles/sections/aboutTab";

/** The pane's top on the screen, and Steam's padding on the pane (docs/lessons-learned.md § 3). */
const PANE_TOP = 24;
const STEAM_PAD_TOP = 116;
const STEAM_PAD_BOTTOM = 80;
/** The Deck's own screen and the plugged-in monitor, as plan 92 measured the pane. */
const VIEWPORTS = [400, 741];

/*
 * Heights of what the tab draws, from the drawing (docs/demos/mockup-board-2/src/43-tabs.css): a section heading
 * with Steam's spacing, a text line, a one-line row, the paragraph that opens under its row, and the QR block's
 * caption. The link height and the picture's side are the stylesheet's own numbers.
 */
const BODY_INSET = 24;
const HEADING = 40;
const WHAT_IS_PARAGRAPH = 62;
const LANGUAGE_HINT = 44;
const BETA = 34;
const LANGUAGE_ROW = 40;
const LINK_GAP = 5;
const QR_CAPTION = 33;
const WIDTH = 300;
const QR_COLUMN = 100;

type Box = { top: number; height: number; left: number; width: number };

function walkAbout(viewport: number) {
  resetAboutLinksMemory();
  const view = render(
    <div className="Tabs_TabContentsScroll" data-pane="">
      <TabBodyFocusRoot id="about">
        <AboutTab
          githubRepoUrl="https://example.invalid/github"
          ollamaRepoUrl="https://example.invalid/ollama"
          githubIssuesUrl="https://example.invalid/issues"
          replyLanguage="follow_system"
          onReplyLanguageChange={() => {}}
          effectiveLang="en"
          steamClientLanguageLabel="English"
          t={(key) => key}
        />
      </TabBodyFocusRoot>
    </div>,
  );
  const pane = view.container.querySelector<HTMLElement>("[data-pane]")!;
  const q = (selector: string) => pane.querySelector<HTMLElement>(selector)!;
  const stops: Record<string, HTMLElement> = {
    "Reply language": q('[data-decky-ui="Dropdown"]'),
    GitHub: q('[data-bonsai-about-link="github"]'),
    "Built on Ollama!": q('[data-bonsai-about-link="ollama"]'),
    "Bugs & Feature Requests": q('[data-bonsai-about-link="bugs"]'),
    QR: q("[data-bonsai-about-qr]"),
  };
  const names = Object.keys(stops);
  const nameOf = (el: Element | null) => names.find((n) => stops[n] === el) ?? null;
  const open = (id: string) => pane.querySelector(`[data-bonsai-about-reveal="${id}"]`) !== null;

  /** Every stop's box in the page's own coordinates, with the paragraphs open or shut as they are right now. */
  const layout = (): { boxes: Record<string, Box>; contentHeight: number } => {
    let y = BODY_INSET + HEADING + WHAT_IS_PARAGRAPH + BETA + HEADING;
    const language = y;
    y += LANGUAGE_ROW + (open("language") ? LANGUAGE_HINT : 0) + HEADING;
    const linksTop = y;
    const step = ABOUT_LINK_HEIGHT_PX + LINK_GAP;
    const qrHeight = ABOUT_QR_SIZE_PX + 3 + QR_CAPTION;
    const buttonWidth = WIDTH - QR_COLUMN - 8;
    return {
      boxes: {
        "Reply language": { top: language, height: LANGUAGE_ROW, left: 0, width: WIDTH },
        GitHub: { top: linksTop, height: ABOUT_LINK_HEIGHT_PX, left: 0, width: buttonWidth },
        "Built on Ollama!": { top: linksTop + step, height: ABOUT_LINK_HEIGHT_PX, left: 0, width: buttonWidth },
        "Bugs & Feature Requests": { top: linksTop + 2 * step, height: ABOUT_LINK_HEIGHT_PX, left: 0, width: buttonWidth },
        QR: { top: linksTop, height: qrHeight, left: WIDTH - QR_COLUMN, width: QR_COLUMN },
      },
      contentHeight: linksTop + qrHeight + 20,
    };
  };

  let scrollTop = 0;
  const maxScroll = () => Math.max(0, layout().contentHeight - viewport);
  Object.defineProperty(pane, "scrollTop", {
    configurable: true,
    get: () => scrollTop,
    set: (v: number) => {
      scrollTop = Math.max(0, Math.min(maxScroll(), v));
    },
  });
  Object.defineProperty(pane, "scrollHeight", { configurable: true, get: () => layout().contentHeight });
  Object.defineProperty(pane, "clientHeight", { configurable: true, value: viewport });
  const rect = (top: number, height: number, left = 0, width = WIDTH): DOMRect =>
    ({ top, bottom: top + height, left, right: left + width, width, height, x: left, y: top, toJSON: () => ({}) }) as DOMRect;
  pane.getBoundingClientRect = () => rect(PANE_TOP, viewport);
  for (const name of names) {
    stops[name]!.getBoundingClientRect = () => {
      const b = layout().boxes[name]!;
      return rect(PANE_TOP + b.top - scrollTop, b.height, b.left, b.width);
    };
  }

  /** Steam's own scroll-into-view for the control the ring just landed on: the nearest edge into the padded band. */
  const steamScrolls = (el: HTMLElement) => {
    const bandTop = PANE_TOP + STEAM_PAD_TOP;
    const bandBottom = PANE_TOP + viewport - STEAM_PAD_BOTTOM;
    const r = el.getBoundingClientRect();
    if (r.top >= bandTop - 0.5 && r.bottom <= bandBottom + 0.5) return;
    scrollTop = Math.max(0, Math.min(maxScroll(), scrollTop + (r.top < bandTop ? r.top - bandTop : r.bottom - bandBottom)));
  };

  const landings: Array<{ name: string; moved: number; top: number; bottom: number }> = [];
  /** Steam's scroll for a landing, and a line in the log of it. `before` is where the page stood before the press. */
  const settle = (el: HTMLElement, before: number) => {
    steamScrolls(el);
    const r = el.getBoundingClientRect();
    landings.push({ name: nameOf(el)!, moved: Math.abs(scrollTop - before), top: r.top - PANE_TOP, bottom: r.bottom - PANE_TOP });
  };
  const land = (el: HTMLElement) => {
    const before = scrollTop;
    act(() => el.focus());
    settle(el, before);
  };

  /**
   * One D-pad press, routed the way Steam routes it: the stop's own handler, then up through its containers,
   * each walking its children only along its own `flow-children` (steamStep). The tab body's root has no flow
   * set and Steam walks its rows as a column anyway (measured: Down and Up between the rows work on the Deck);
   * every other container with no flow walks nothing. Then Steam's scroll for the landing.
   */
  const press = (direction: "Down" | "Up" | "Left" | "Right"): string | null => {
    const from = document.activeElement as HTMLElement;
    const pageBefore = scrollTop;
    const to = steamStep(from, direction, { columnWhereUnset: (c) => c.hasAttribute("data-bonsai-tab-body") });
    if (to !== from) settle(to, pageBefore);
    return nameOf(document.activeElement);
  };

  // The ring comes in from the tab bar onto the first stop, as the tab body's transfer does.
  land(stops["Reply language"]!);
  return { press, landings, names, here: () => nameOf(document.activeElement), scrollTop: () => scrollTop, viewport, unmount: view.unmount, layout };
}

beforeEach(() => resetAboutLinksMemory());

describe.each(VIEWPORTS)("About tab walk, pane %i points high", (viewport) => {
  it("Down visits Reply language and the three links once each, then holds still", () => {
    const walk = walkAbout(viewport);
    const seen = [walk.here()!];
    for (let i = 0; i < 12; i++) {
      const next = walk.press("Down");
      if (next === seen.at(-1)) break;
      seen.push(next!);
    }
    expect(seen).toEqual(["Reply language", "GitHub", "Built on Ollama!", "Bugs & Feature Requests"]);
    expect(new Set(seen).size).toBe(seen.length);
    // Down at the last button changes nothing, however often it is pressed.
    expect(walk.press("Down")).toBe("Bugs & Feature Requests");
    expect(walk.press("Down")).toBe("Bugs & Feature Requests");
    walk.unmount();
  });

  it("Right from the last button reaches the QR code and Left comes back to it; Up walks back to the top with no stop twice", () => {
    const walk = walkAbout(viewport);
    for (let i = 0; i < 5; i++) walk.press("Down");
    expect(walk.here()).toBe("Bugs & Feature Requests");
    expect(walk.press("Right")).toBe("QR");
    expect(walk.press("Down")).toBe("QR");
    expect(walk.press("Left")).toBe("Bugs & Feature Requests");
    const up = [walk.here()!];
    for (let i = 0; i < 12; i++) {
      const next = walk.press("Up");
      if (next === up.at(-1)) break;
      up.push(next!);
    }
    expect(up).toEqual(["Bugs & Feature Requests", "Built on Ollama!", "GitHub", "Reply language"]);
    expect(new Set(up).size).toBe(up.length);
    walk.unmount();
  });

  it("Left from the QR returns to the button the ring left from, whichever height that was", () => {
    for (const button of ["GitHub", "Built on Ollama!", "Bugs & Feature Requests"]) {
      const walk = walkAbout(viewport);
      for (let guard = 0; walk.here() !== button && guard < 10; guard++) walk.press("Down");
      expect(walk.press("Right")).toBe("QR");
      expect(walk.press("Left")).toBe(button);
      walk.unmount();
    }
  });

  it("Up from GitHub reaches Reply language, and Down from Reply language reaches GitHub, never the QR code", () => {
    const walk = walkAbout(viewport);
    expect(walk.here()).toBe("Reply language");
    expect(walk.press("Down")).toBe("GitHub");
    expect(walk.press("Up")).toBe("Reply language");
    walk.unmount();
  });

  it("every landing is wholly on screen once Steam has scrolled, and no landing moves the page by more than half of it", () => {
    const walk = walkAbout(viewport);
    for (let i = 0; i < 5; i++) walk.press("Down");
    walk.press("Right");
    walk.press("Left");
    for (let i = 0; i < 6; i++) walk.press("Up");
    expect(walk.landings.length).toBeGreaterThan(8);
    for (const l of walk.landings) {
      expect(l.top, `${l.name} top`).toBeGreaterThanOrEqual(-0.5);
      expect(l.bottom, `${l.name} bottom`).toBeLessThanOrEqual(viewport + 0.5);
      expect(l.moved, `${l.name} moved the page`).toBeLessThanOrEqual(viewport / 2);
    }
    walk.unmount();
  });

  it("is bounded: the whole walk, down, across and back up, takes fewer than twenty presses", () => {
    const walk = walkAbout(viewport);
    let presses = 0;
    for (const direction of ["Down", "Down", "Down", "Down", "Right", "Left", "Up", "Up", "Up", "Up"] as const) {
      walk.press(direction);
      presses++;
    }
    expect(presses).toBeLessThan(20);
    expect(walk.here()).toBe("Reply language");
    walk.unmount();
  });
});
