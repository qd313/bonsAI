// Tests for scripts/probe_deck_ui_look.py (plan 97, lane L8). The look check's page script (LOOK_JS) runs
// inside the Deck's panel; these tests run that same script text against a small fake panel in jsdom.
// Run with:  node --test scripts/probe_deck_ui_look.test.mjs
// The script is read out of the Python file, so the test runs the real text the Deck runs. jsdom has no
// layout, so each element's position comes from a data-rect attribute on it, and the cases below say where
// each control sits in the fake panel (300 px wide, 600 px tall).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const pySource = fs.readFileSync(path.join(HERE, "probe_deck_ui_look.py"), "utf8");
const LOOK_JS = /LOOK_JS = r"""([\s\S]*?)"""/.exec(pySource)[1];

// "panel": the whole panel. "edge": a button pressed 2 px from the left edge. "centre": a button with 90 px each side.
function rectFor(el) {
  const at = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });
  switch (el.dataset.rect) {
    case "panel":
      return at(0, 0, 300, 600);
    case "edge":
      return at(2, 100, 120, 40);
    case "centre":
      return at(90, 100, 120, 40);
    case "chip": // the second suggestion chip: 147 px wide, its right edge on the panel's edge (Deck, 2026-11-15)
      return at(153, 100, 147, 26);
    case "window": // the label's own window inside that chip
      return at(165, 103, 129, 20);
    case "words": // the scrolling words, wider than the window and past the panel edge until they scroll
      return at(165, 103, 258, 20);
    default:
      return at(0, 0, 0, 0);
  }
}

// Runs the look check's page script over the given markup and returns what it reports.
function runLook(markup) {
  const { window } = new JSDOM(`<!doctype html><body>${markup}</body>`);
  const { document } = window;
  // A control's text range reads the box of the element marked data-text-rect inside it (jsdom has no layout).
  document.createRange = () => {
    let node = null;
    return {
      selectNodeContents(n) {
        node = n;
      },
      getBoundingClientRect() {
        const t = node.querySelector("[data-text-rect]");
        return t ? rectFor({ dataset: { rect: t.dataset.textRect } }) : rectFor({ dataset: {} });
      },
    };
  };
  window.Element.prototype.getBoundingClientRect = function () {
    return rectFor(this);
  };
  globalThis.document = document;
  globalThis.getComputedStyle = window.getComputedStyle.bind(window);
  globalThis.innerHeight = 800;
  for (const el of document.querySelectorAll("[data-scroll-width]")) {
    Object.defineProperty(el, "scrollWidth", { value: Number(el.dataset.scrollWidth) });
    Object.defineProperty(el, "clientWidth", { value: Number(el.dataset.clientWidth) });
  }
  return JSON.parse(eval(LOOK_JS));
}

const WHITE = "background-color: rgb(255, 255, 255)";

test("a light Steam language dropdown button in the About row is not a finding", () => {
  const result = runLook(
    `<div class="bonsai-scope" data-rect="panel">` +
      `<div data-bonsai-about-language-dropdown="1"><button data-rect="centre" style="${WHITE}">English</button></div>` +
      `</div>`,
  );
  assert.equal(result.panel, 300);
  assert.deepEqual(result.findings, []);
});

test("the same exemption also covers the edge rule inside the language row", () => {
  const result = runLook(
    `<div class="bonsai-scope" data-rect="panel">` +
      `<div data-bonsai-about-language-dropdown="1"><button data-rect="edge">English</button></div>` +
      `</div>`,
  );
  assert.deepEqual(result.findings, []);
});

test("a light button outside the language row is still a finding", () => {
  const result = runLook(
    `<div class="bonsai-scope" data-rect="panel"><button data-rect="centre" style="${WHITE}">Other</button></div>`,
  );
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].rule, "light-button");
});

// plan 104 T3 (row P104-M-CHIP-CUT): a long chip label scrolls inside its own window on purpose, so its words
// reaching past the chip for a moment is not "cut words". Only the chip's own box counts when a scroller is inside.
const chip = (label) =>
  `<div class="bonsai-scope" data-rect="panel"><div class="bonsai-full-bleed-row">` +
  `<button data-rect="chip" data-scroll-width="270" data-client-width="147">${label}</button>` +
  `</div></div>`;

test("a chip whose long label scrolls inside its own window is not a finding", () => {
  const result = runLook(
    chip(
      `<span class="bonsai-preset-chip-label" data-rect="window">` +
        `<span class="bonsai-preset-chip-text bonsai-preset-chip-text--marquee" data-rect="window">` +
        `<span class="bonsai-preset-chip-text-run" data-rect="words" data-text-rect="words">When should I use Expert mode instead of Speed?</span>` +
        `</span></span>`,
    ),
  );
  assert.deepEqual(result.findings, []);
});

test("a chip with no scroller whose words run past its box is still a finding", () => {
  const result = runLook(
    chip(
      `<span class="bonsai-preset-chip-text" data-rect="window">` +
        `<span data-rect="words" data-text-rect="words">When should I use Expert mode instead of Speed?</span></span>`,
    ),
  );
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].rule, "text-does-not-fit");
});

test("a chip whose scroller window itself sticks out of the chip is still a finding", () => {
  const result = runLook(
    chip(
      `<span class="bonsai-preset-chip-label" data-rect="words">` +
        `<span class="bonsai-preset-chip-text bonsai-preset-chip-text--marquee" data-rect="words" data-text-rect="words">Words</span></span>`,
    ),
  );
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].rule, "text-does-not-fit");
});
