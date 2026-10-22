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
    default:
      return at(0, 0, 0, 0);
  }
}

// Runs the look check's page script over the given markup and returns what it reports.
function runLook(markup) {
  const { window } = new JSDOM(`<!doctype html><body>${markup}</body>`);
  const { document } = window;
  document.createRange = () => ({
    selectNodeContents() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }),
  });
  window.Element.prototype.getBoundingClientRect = function () {
    return rectFor(this);
  };
  globalThis.document = document;
  globalThis.getComputedStyle = window.getComputedStyle.bind(window);
  globalThis.innerHeight = 800;
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
