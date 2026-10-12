/**
 * Title: The help strip shows the ringed row's text on the landing, and the scroll plan keeps the row clear of it
 * Purpose: Pin the Deck check P91-STRIP. The ringed row's longer text is in the strip by the time the
 *          focus event that landed the ring has finished (the same frame), with its name; a row with no
 *          text, a section line, or the ring leaving the tab hides it; a row whose text follows its value
 *          re-reads it when the value changes. And the band, as arithmetic read back from the plugin's
 *          stylesheet (lessons-learned § 5): the scroll plan's bottom margin grows by the strip's height,
 *          so a row the ring lands on near the bottom ends with its bottom edge, ring included, at least
 *          6 px above the strip's top. Without the growth the same landing leaves the row under the strip.
 * Used for: TabHelpStrip.tsx, useHelpStrip.ts, useTabBodyFocusScroll.ts (landing watchers), foldedTabs.ts.
 */
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { TabBodyFocusRoot } from "../plugin-shell/TabBodyFocusRoot";
import { TabHelpStrip } from "./TabHelpStrip";
import { FOLD_SECTION_ATTR, HELP_TEXT_ATTR, helpAttributes } from "./useHelpStrip";
import { foldSectionToReturnTo, resetFoldedTabsForTests } from "./foldedTabsStore";
import { buildBonsaiScopeStylesheet } from "../../styles/bonsaiScopeStylesheet";
import { stripHeightFor } from "../../styles/sections/foldedTabs";

const TAB = "ollama";
const PANE_TOP = 24;
/** Steam's own margin at the pane's bottom (the pane's scroll-padding), and the plan's 2 px of slack. */
const STEAM_PAD_BOTTOM = 80;

/** The declarations of the first rule whose selector is exactly `selector`, from the plugin's stylesheet. */
function rule(selector: string): Record<string, string> {
  const css = buildBonsaiScopeStylesheet();
  const at = css.indexOf(`${selector} {`);
  if (at < 0) throw new Error(`no rule for ${selector}`);
  const body = css.slice(css.indexOf("{", at) + 1, css.indexOf("}", at));
  const out: Record<string, string> = {};
  for (const decl of body.split(";")) {
    const [k, ...v] = decl.split(":");
    if (k && v.length) out[k.trim()] = v.join(":").replace(/!important/, "").trim();
  }
  return out;
}
const pxOf = (v: string | undefined, index = 0) => parseFloat((v ?? "").split(/\s+/)[index] ?? "");

/** The strip's height for `lines` lines of text, from the stylesheet's own numbers. */
function stripHeightFromCss(lines: number): number {
  const strip = rule(".bonsai-scope .bonsai-fold-strip");
  const label = rule(".bonsai-scope .bonsai-fold-strip__label");
  const pad = strip["padding"]!.split(/\s+/);
  const padTop = parseFloat(pad[0]!);
  const padBottom = parseFloat(pad[2] ?? pad[0]!);
  return pxOf(strip["border-top"]) + padTop + pxOf(label["line-height"]) + lines * pxOf(strip["line-height"]) + padBottom;
}

/** How far the plugin's ring on a plain button reaches outside it (outline plus its offset). */
function buttonRingReach(): number {
  const ring = rule(".bonsai-scope button.bonsai-settings-focus-btn.gpfocus,\n        .bonsai-scope button.bonsai-settings-focus-btn:focus-visible");
  return pxOf(ring["outline"]) + pxOf(ring["outline-offset"]);
}

type Row = { id: string; top: number; height: number; label?: string; help?: string };

function mount(rows: Row[], viewport: number, contentHeight: number) {
  const view = render(
    <div className="bonsai-decky-tabs-root" data-bonsai-active-tab={TAB}>
      <div className="Tabs_TabContentsScroll" data-pane="" style={{ scrollPaddingBottom: `${STEAM_PAD_BOTTOM}px`, scrollPaddingTop: "116px" }}>
        <TabBodyFocusRoot id={TAB}>
          <Column rows={rows} />
        </TabBodyFocusRoot>
      </div>
    </div>,
  );
  const pane = view.container.querySelector<HTMLElement>("[data-pane]")!;
  let scrollTop = 0;
  const inset = 24;
  const maxScroll = Math.max(0, inset + contentHeight - viewport);
  Object.defineProperty(pane, "scrollTop", { configurable: true, get: () => scrollTop, set: (v: number) => (scrollTop = Math.max(0, Math.min(maxScroll, v))) });
  Object.defineProperty(pane, "scrollHeight", { configurable: true, get: () => inset + contentHeight });
  Object.defineProperty(pane, "clientHeight", { configurable: true, value: viewport });
  const box = (top: number, height: number) => ({ top, bottom: top + height, left: 0, right: 300, width: 300, height, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;
  pane.getBoundingClientRect = () => box(PANE_TOP, viewport);
  for (const r of rows) {
    const el = view.container.querySelector<HTMLElement>(`[data-stop="${r.id}"]`)!;
    el.getBoundingClientRect = () => box(PANE_TOP + inset + r.top - scrollTop, r.height);
  }
  const strip = view.container.querySelector<HTMLElement>("[data-bonsai-help-strip]")!;
  return {
    view,
    pane,
    strip,
    scrollTop: () => scrollTop,
    land: (id: string) => {
      const el = view.container.querySelector<HTMLElement>(`[data-stop="${id}"]`)!;
      act(() => {
        el.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      });
      return el.getBoundingClientRect();
    },
    /** The strip's measured height: what the browser would give for `lines` lines while it shows. */
    sizeStrip: (lines: number) => {
      strip.getBoundingClientRect = () => box(0, strip.hidden ? 0 : stripHeightFromCss(lines));
    },
  };
}

function Column({ rows }: { rows: Row[] }) {
  return (
    <div>
      <div {...{ [FOLD_SECTION_ATTR]: "reply" }}>
        {rows.map((r) => (
          <div key={r.id} {...helpAttributes(r.label ?? r.id, r.help)}>
            <button className="Focusable" data-stop={r.id} />
          </div>
        ))}
      </div>
      <TabHelpStrip tab={TAB} />
    </div>
  );
}

beforeEach(() => resetFoldedTabsForTests());
afterEach(() => cleanup());

describe("the help strip", () => {
  const ROWS: Row[] = [
    { id: "line", top: 0, height: 34 },
    { id: "slider", top: 40, height: 60, label: "Reply style", help: "Bullet-first vs paragraph depth. Ask mode and model routing unchanged." },
    { id: "terse", top: 110, height: 40, label: "Terse mode", help: "Speed mode only." },
  ];

  it("shows the ringed row's name and text as the landing's own event finishes, and remembers the section", () => {
    const t = mount(ROWS, 741, 600);
    t.land("slider");
    expect(t.strip.hidden).toBe(false);
    expect(t.strip.textContent).toBe("Reply styleBullet-first vs paragraph depth. Ask mode and model routing unchanged.");
    expect(foldSectionToReturnTo(TAB)).toBe("reply");
    t.land("terse");
    expect(t.strip.textContent).toBe("Terse modeSpeed mode only.");
  });

  it("hides on a stop with no text (a section line), and when the ring leaves the tab", () => {
    const t = mount(ROWS, 741, 600);
    t.land("slider");
    t.land("line");
    expect(t.strip.hidden).toBe(true);
    t.land("terse");
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    const terse = t.view.container.querySelector<HTMLElement>('[data-stop="terse"]')!;
    act(() => {
      terse.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: outside }));
    });
    expect(t.strip.hidden).toBe(true);
    outside.remove();
  });

  it("re-reads a row's text when the row changes it (Thinking's description follows the pick)", async () => {
    const t = mount(ROWS, 741, 600);
    t.land("terse");
    const host = t.view.container.querySelector<HTMLElement>('[data-stop="terse"]')!.parentElement!;
    await act(async () => {
      host.setAttribute(HELP_TEXT_ATTR, "Answer straight away. Fastest.");
      await Promise.resolve();
    });
    expect(t.strip.textContent).toBe("Terse modeAnswer straight away. Fastest.");
  });

  it("is drawn in bonsAI's tabs box beside the pane, not inside the pane Steam scrolls", () => {
    const t = mount(ROWS, 741, 600);
    expect(t.pane.contains(t.strip)).toBe(false);
    expect(t.strip.closest(".bonsai-decky-tabs-root")).not.toBeNull();
  });
});

describe("the band: the ringed row clears the strip (arithmetic from the stylesheet)", () => {
  it("the stylesheet's strip is the height its constants say", () => {
    for (const lines of [1, 2, 3]) expect(stripHeightFromCss(lines)).toBe(stripHeightFor(lines));
  });

  for (const viewport of [430, 741]) {
    it(`pane ${viewport} px: a row inside Steam's own band but under a tall strip is moved clear of it, ring and 6 px included`, () => {
      /* Terse mode's text is the longest on the tab: six lines in the strip, taller than Steam's own 80 px margin. */
      const lines = 6;
      const H = stripHeightFromCss(lines);
      expect(H).toBeGreaterThan(STEAM_PAD_BOTTOM);
      /* Its bottom 84 px above the pane's bottom: Steam's band leaves it there, and the strip would cover it. */
      const rows: Row[] = [
        { id: "above", top: 0, height: 34 },
        { id: "low", top: viewport - 24 - STEAM_PAD_BOTTOM - 40, height: 36, label: "Terse mode", help: "Speed mode only." },
        { id: "below", top: viewport - 24 - STEAM_PAD_BOTTOM + 10, height: 34 },
      ];
      const t = mount(rows, viewport, viewport + 600);
      t.sizeStrip(lines);
      t.land("above");
      const r = t.land("low");
      const stripTop = PANE_TOP + viewport - H;
      expect(r.bottom + buttonRingReach() + 6).toBeLessThanOrEqual(stripTop);
      /* And the move is a step, not a page: no more than a third of the pane. */
      expect(t.scrollTop()).toBeLessThanOrEqual(viewport / 3);
    });
  }
});
