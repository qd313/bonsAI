/**
 * Title: The calmer rating choices, read off the real stylesheet
 * Purpose: Pin plan 79's "calmer rating choices, after 2, smaller and softer". The sizes are read
 *          the way the browser settles them: every rule of the real, whole stylesheet that matches
 *          the element, the highest specificity winning and the later rule winning a tie, with
 *          !important beating the rest. A string match on one rule would pass while a later or
 *          stronger rule still painted the old size, which is how a style fix can change nothing.
 * Used for: replyRatingChoices.ts and the shared reply button rules in section-6.ts.
 * Solves: Nothing else reads a button's final height or font size from the whole stylesheet.
 * Does not: Lay anything out. A height here is the declared `min-height`; jsdom has no layout, and
 *           the reply buttons size from it (their text is shorter than the box).
 */
import { afterEach, describe, expect, it } from "vitest";

import { buildBonsaiScopeStylesheet } from "../bonsaiScopeStylesheet";

type Rule = { selector: string; decls: [prop: string, value: string, important: boolean][]; order: number };

/** Every plain rule of the sheet, one per selector in a list; at-rules (keyframes, media) are skipped. */
function parseRules(css: string): Rule[] {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules: Rule[] = [];
  let i = 0;
  let order = 0;
  const skipBlock = (from: number): number => {
    let depth = 0;
    for (let j = from; j < text.length; j++) {
      if (text[j] === "{") depth++;
      else if (text[j] === "}" && --depth === 0) return j + 1;
    }
    return text.length;
  };
  while (i < text.length) {
    const open = text.indexOf("{", i);
    if (open < 0) break;
    const head = text.slice(i, open).trim();
    if (head.startsWith("@")) {
      i = skipBlock(open);
      continue;
    }
    const close = text.indexOf("}", open);
    const body = text.slice(open + 1, close);
    const decls: Rule["decls"] = [];
    let depth = 0;
    let start = 0;
    for (let j = 0; j <= body.length; j++) {
      const ch = body[j];
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
      else if ((ch === ";" && depth === 0) || j === body.length) {
        const decl = body.slice(start, j).trim();
        start = j + 1;
        const colon = decl.indexOf(":");
        if (colon < 0) continue;
        const important = /!important\s*$/.test(decl);
        decls.push([
          decl.slice(0, colon).trim(),
          decl.slice(colon + 1).replace(/!important\s*$/, "").trim(),
          important,
        ]);
      }
    }
    let d = 0;
    let from = 0;
    const selectors: string[] = [];
    for (let j = 0; j <= head.length; j++) {
      const ch = head[j];
      if (ch === "(") d++;
      else if (ch === ")") d--;
      else if ((ch === "," && d === 0) || j === head.length) {
        selectors.push(head.slice(from, j).trim());
        from = j + 1;
      }
    }
    for (const selector of selectors) rules.push({ selector, decls, order: order++ });
    i = close + 1;
  }
  return rules;
}

/** Specificity as one comparable number: ids, then classes/attributes/pseudo-classes (a :not counts its argument), then elements. */
function specificity(selector: string): number {
  const s = selector.replace(/::?(not|is|where)\(/g, "(");
  const ids = (s.match(/#[\w-]+/g) ?? []).length;
  const classes =
    (s.match(/\.[\w-]+/g) ?? []).length + (s.match(/\[[^\]]+\]/g) ?? []).length + (s.match(/:(?!:)[\w-]+/g) ?? []).length;
  const withoutNotParens = s.replace(/[.#:][\w-]+/g, " ").replace(/\[[^\]]+\]/g, " ");
  const elements = (withoutNotParens.match(/(^|[\s>+~(])[a-zA-Z][\w-]*/g) ?? []).length;
  return ids * 10000 + classes * 100 + elements;
}

const rules = parseRules(buildBonsaiScopeStylesheet());

/** The value the cascade settles on for `prop` on `el`, or null. `calc(Npx * var(--bonsai-ui-scale, 1))` reads as N px. */
function settled(el: Element, prop: string): string | null {
  let best: { key: [number, number, number]; value: string } | null = null;
  for (const rule of rules) {
    let hit = false;
    try {
      hit = el.matches(rule.selector);
    } catch {
      hit = false;
    }
    if (!hit) continue;
    for (const [p, value, important] of rule.decls) {
      if (p !== prop) continue;
      const key: [number, number, number] = [important ? 1 : 0, specificity(rule.selector), rule.order];
      if (!best || key[0] > best.key[0] || (key[0] === best.key[0] && (key[1] > best.key[1] || (key[1] === best.key[1] && key[2] > best.key[2])))) {
        best = { key, value };
      }
    }
  }
  return best ? best.value.replace(/calc\(\s*([\d.]+)px \* var\(--bonsai-ui-scale, 1\)\s*\)/g, "$1px") : null;
}

/** The reply row as the Deck draws it: the real class names, the shared button carrying Decky's own class too. */
function mount(): { thumb: HTMLElement; reason: HTMLElement; speaker: HTMLElement; outsider: HTMLElement; reasonRows: HTMLElement[] } {
  document.body.innerHTML = `
    <div class="bonsai-scope">
      <div class="bonsai-chat-reply-actions">
        <div class="bonsai-chat-reply-actions-row">
          <button class="bonsai-chat-secondary-btn DialogButton" id="thumb">Helpful</button>
          <button class="bonsai-chat-secondary-btn DialogButton bonsai-chat-read-aloud-btn" id="speaker"></button>
        </div>
        <div class="bonsai-chat-reply-actions-row bonsai-chat-reply-actions-row--chips" id="row1">
          <button class="bonsai-chat-secondary-btn DialogButton" id="reason">Bad info</button>
        </div>
        <div class="bonsai-chat-reply-actions-row bonsai-chat-reply-actions-row--chips" id="row2"></div>
      </div>
      <button class="bonsai-chat-secondary-btn DialogButton" id="outsider">Retry</button>
    </div>`;
  const get = (id: string) => document.getElementById(id)!;
  return { thumb: get("thumb"), reason: get("reason"), speaker: get("speaker"), outsider: get("outsider"), reasonRows: [get("row1"), get("row2")] };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("the calmer rating choices (plan 79, after 2: smaller and softer)", () => {
  it("makes a reason button 24 tall, 11 px words at medium weight", () => {
    const { reason } = mount();
    expect(settled(reason, "min-height")).toBe("24px");
    expect(settled(reason, "font-size")).toBe("11px");
    expect(settled(reason, "font-weight")).toBe("500");
    expect(settled(reason, "padding")).toBe("2px 8px");
    expect(settled(reason, "border-radius")).toBe("6px");
  });

  it("makes a thumb 28 tall, the same 11 px words at medium weight", () => {
    const { thumb } = mount();
    expect(settled(thumb, "min-height")).toBe("28px");
    expect(settled(thumb, "font-size")).toBe("11px");
    expect(settled(thumb, "font-weight")).toBe("500");
    expect(settled(thumb, "padding")).toBe("4px 10px");
    expect(settled(thumb, "border-radius")).toBe("6px");
  });

  it("halves the fill and the outline", () => {
    const { thumb, reason } = mount();
    for (const el of [thumb, reason]) {
      expect(settled(el, "border")).toBe("1px solid rgba(110, 150, 200, 0.2)");
      const fill = settled(el, "background") ?? "";
      expect(fill).toContain("rgba(26, 42, 62, 0.4)");
      expect(fill).toContain("rgba(18, 28, 42, 0.45)");
      expect(settled(el, "color")).toBe("#b4c6dc");
    }
  });

  it("puts 5 between the reasons and between their two rows", () => {
    const { reasonRows } = mount();
    expect(settled(reasonRows[0]!, "gap")).toBe("5px");
    expect(settled(reasonRows[1]!, "margin-top")).toBe("calc(5px - 8px)");
  });

  it("leaves the speaker's bare glyph alone", () => {
    const { speaker } = mount();
    expect(settled(speaker, "min-height")).toBe("32px");
    expect(settled(speaker, "border")).toBe("none");
    expect(settled(speaker, "background")).toBe("none");
    expect(settled(speaker, "width")).toBe("30px");
  });

  it("leaves every other reply button at the shared size", () => {
    const { outsider } = mount();
    expect(settled(outsider, "min-height")).toBe("32px");
    expect(settled(outsider, "font-size")).toBe("12px");
    expect(settled(outsider, "font-weight")).toBe("600");
  });

  it("keeps the D-pad ring on a choice that holds it: white outline and the ring's own shadow", () => {
    const { thumb, reason } = mount();
    for (const el of [thumb, reason]) {
      el.classList.add("gpfocus");
      expect(settled(el, "outline")).toBe("2px solid rgba(255, 255, 255, 0.9)");
      expect(settled(el, "outline-offset")).toBe("2px");
      expect(settled(el, "box-shadow")).toContain("0 0 0 2px rgba(255, 255, 255, 0.92)");
    }
  });
});
