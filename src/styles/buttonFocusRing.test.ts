/**
 * Title: A button that paints its own fill must carry a ring class
 * Purpose: Stop the invisible focus ring coming back. Roadmap "The highlight goes invisible on some
 *          tabs, starting with Down from 'Update AI & models'": the maintainer said it keeps coming
 *          back, and on 2026-10-02 the Deck showed why (plan79-P79-M2-OLLAMA-INVISIBLE.json). Steam
 *          shows focus on its own buttons by changing their fill through its `gpfocus` class. A
 *          button that sets `background` inline (the glass look, a tint) wins over that class rule,
 *          so Steam's cue never shows, and unless the plugin draws a ring of its own, nothing does.
 *          Every new button copied from a glass one repeated it.
 * Used for: Every `<Button>` / `<DialogButton>` in src/ (tests excluded).
 * How it works: reads each file with the TypeScript parser, finds buttons whose inline `style` sets a
 *          background (directly or by spreading SETTINGS_GLASS_BTN), and asks whether the button's
 *          `className` names a class the plugin's real stylesheet draws a `.gpfocus` rule for
 *          (FOCUS_RING_BTN_CLASS counts). The ring classes are read from the stylesheet itself, so
 *          a class with no focus rule does not pass.
 *          A second check covers the buttons that paint NO fill of their own (plain Steam buttons):
 *          on the Settings, Developer, Ollama and Permissions tabs every one must also carry a ring
 *          class, and every Steam button row (ButtonItem) must sit inside the ring host div. Deck walk
 *          2026-10-03 (plan81-P81-RING-WALK-SETTINGS-DEV.json) found "Apply UI scale" with the
 *          browser's default outline and "Jump to Steam Input" with none, both plain.
 * Does not: See pixels, or catch a button whose ring comes from an ancestor's rule (those are named
 *           in KNOWN with the reason). The Deck walk on each tab is still the real check.
 *
 * KNOWN holds the files that still have such buttons and how many. It may only shrink: a file over
 * its number fails (a new offender), and a file under it fails too, so the number is lowered as
 * each file is fixed and cannot quietly grow back.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

import { buildBonsaiScopeStylesheet } from "./bonsaiScopeStylesheet";
import { FOCUS_RING_BTN_CLASS, FOCUS_RING_ITEM_HOST_CLASS } from "./settingsGlassButton";

const SRC = join(__dirname, "..");

/** Files with buttons still painting their own fill with no ring class: count, and why left. */
const KNOWN: Record<string, { count: number; why: string }> = {
  "components/CharacterPickerModal.tsx": {
    count: 1,
    why: "picker tiles; ringed by the `.bonsai-ai-char-grid-col button.gpfocus` ancestor rule (the Playing suggestion row sits outside that grid and carries the ring class)",
  },
};

/** Every class the stylesheet styles in the same compound selector as `.gpfocus`. */
function ringClasses(): Set<string> {
  const css = buildBonsaiScopeStylesheet().replace(/\/\*[\s\S]*?\*\//g, "");
  const out = new Set<string>();
  for (const head of css.match(/[^{}]+(?=\{)/g) ?? []) {
    for (const selector of head.split(",")) {
      for (const compound of selector.trim().split(/[\s>+~]+/)) {
        if (!/\.gpfocus(?![\w-])/.test(compound)) continue;
        for (const m of compound.matchAll(/\.([\w-]+)/g)) if (m[1] !== "gpfocus") out.add(m[1]!);
      }
    }
  }
  return out;
}

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sourceFiles(path, out);
    else if (path.endsWith(".tsx") && !path.includes(".test.")) out.push(path);
  }
  return out;
}

type Offender = { file: string; line: number };

/** Buttons whose inline style paints a background, and whose className names no ring class. */
function buttonsWithoutRing(rings: Set<string>): Offender[] {
  const found: Offender[] = [];
  for (const path of sourceFiles(SRC)) {
    const text = readFileSync(path, "utf8");
    const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (node: ts.Node): void => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(sf);
        if (tag === "Button" || tag === "DialogButton") {
          let style = "";
          let className = "";
          for (const attr of node.attributes.properties) {
            if (!ts.isJsxAttribute(attr) || !attr.initializer) continue;
            if (attr.name.getText(sf) === "style") style = attr.initializer.getText(sf);
            if (attr.name.getText(sf) === "className") className = attr.initializer.getText(sf);
          }
          const paintsFill = /\bbackground(Color|Image)?\s*:|\.\.\.SETTINGS_GLASS_BTN/.test(style);
          const words: string[] = className.match(/[\w-]+/g) ?? [];
          const ringed = words.includes("FOCUS_RING_BTN_CLASS") || words.some((w) => rings.has(w));
          if (paintsFill && !ringed) {
            const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
            found.push({ file: relative(SRC, path).split(sep).join("/"), line });
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return found;
}

describe("buttons that paint their own fill still show the D-pad ring", () => {
  const rings = ringClasses();

  it("the shared ring class really has a focus rule in the stylesheet", () => {
    expect(rings.has(FOCUS_RING_BTN_CLASS)).toBe(true);
  });

  it("no button outside the known list sets a background without a ring class", () => {
    const counts: Record<string, number> = {};
    const lines: Record<string, number[]> = {};
    for (const { file, line } of buttonsWithoutRing(rings)) {
      counts[file] = (counts[file] ?? 0) + 1;
      (lines[file] ??= []).push(line);
    }
    const expected = Object.fromEntries(Object.entries(KNOWN).map(([f, k]) => [f, k.count]));
    // On a failure, `lines` names each button. A new one: give it className={FOCUS_RING_BTN_CLASS}.
    // A fixed one: lower (or remove) its file's number in KNOWN.
    expect({ counts, lines }).toEqual({ counts: expected, lines: expect.anything() });
  });
});

/** The files that draw the Settings, Developer, Ollama and Permissions tabs' buttons. */
const TAB_FILES = [
  "components/SettingsTab.tsx",
  "components/SettingsTabUiScaleSection.tsx",
  "components/DeveloperTab.tsx",
  "components/PermissionsTab.tsx",
  "components/PermissionDenyAction.tsx",
  "components/OllamaSavedHostsRows.tsx",
  "components/OllamaWhereAiRunsSection.tsx",
  "components/VoiceInputSettingsSection.tsx",
  "components/KnowledgeBaseSection.tsx",
];

/** Buttons in TAB_FILES with no ring class, and Steam button rows outside the ring host div. */
function unringedTabButtons(rings: Set<string>): string[] {
  const found: string[] = [];
  for (const file of TAB_FILES) {
    const path = join(SRC, file);
    const text = readFileSync(path, "utf8");
    const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const classOf = (node: ts.JsxOpeningElement | ts.JsxSelfClosingElement): string => {
      for (const attr of node.attributes.properties) {
        if (ts.isJsxAttribute(attr) && attr.name.getText(sf) === "className" && attr.initializer) {
          return attr.initializer.getText(sf);
        }
      }
      return "";
    };
    const visit = (node: ts.Node): void => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(sf);
        const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
        if (tag === "Button" || tag === "DialogButton") {
          const words: string[] = classOf(node).match(/[\w-]+/g) ?? [];
          const ringed = words.includes("FOCUS_RING_BTN_CLASS") || words.some((w) => rings.has(w));
          if (!ringed) found.push(`${file}:${line} ${tag}`);
        } else if (tag === "ButtonItem") {
          let hosted = false;
          for (let up: ts.Node | undefined = node.parent?.parent; up; up = up.parent) {
            if (ts.isJsxElement(up) && classOf(up.openingElement).includes("FOCUS_RING_ITEM_HOST_CLASS")) hosted = true;
          }
          if (!hosted) found.push(`${file}:${line} ButtonItem outside ${FOCUS_RING_ITEM_HOST_CLASS}`);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return found;
}

describe("plain Steam buttons on the four tabs also draw the ring", () => {
  it("the ring host class has a focus rule in the stylesheet", () => {
    // The host is an ancestor of the focused part, so it is not in ringClasses(): look for its rule.
    expect(buildBonsaiScopeStylesheet()).toMatch(new RegExp(String.raw`\.${FOCUS_RING_ITEM_HOST_CLASS} \.gpfocus`));
  });

  it("every Button on those tabs has a ring class, every ButtonItem sits in the ring host", () => {
    expect(unringedTabButtons(ringClasses())).toEqual([]);
  });
});
