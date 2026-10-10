/**
 * Title: The font size the browser would settle on, read off the real stylesheet
 * Purpose: jsdom cannot resolve `calc()` or `var()` in a font size, so a test that asks it for a
 *          computed size gets the raw rule text back. This works the size out the way the browser
 *          does for the few shapes the plugin writes: a rule's `!important` beats the rest, then the
 *          more specific selector, then the later rule, with an element's own inline size beating a
 *          plain rule; `calc(Npx * var(--bonsai-chat-text-scale, 1))` is N times the scale the root
 *          carries; the UI scale counts as 1; `em` is of the parent; no rule means the parent's size.
 * Used for: tests that must show a font size really changed on screen (the chat's Text size).
 * Does not: Lay anything out, or read shorthand `font`. A size written some other way throws, so a new
 *           shape cannot silently read as the default.
 */

type Decl = { prop: string; value: string; important: boolean };
type Rule = { selector: string; decls: Decl[]; order: number };

function parseRules(css: string): Rule[] {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules: Rule[] = [];
  let order = 0;
  for (const m of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const head = m[1]!.trim();
    if (head.startsWith("@")) continue;
    const decls: Decl[] = [];
    for (const part of m[2]!.split(/;(?![^(]*\))/)) {
      const colon = part.indexOf(":");
      if (colon < 0) continue;
      const raw = part.slice(colon + 1).trim();
      decls.push({
        prop: part.slice(0, colon).trim(),
        value: raw.replace(/\s*!important\s*$/, ""),
        important: /!important\s*$/.test(raw),
      });
    }
    for (const selector of head.split(/,(?![^(]*\))/)) rules.push({ selector: selector.trim(), decls, order: order++ });
  }
  return rules;
}

function specificity(selector: string): number {
  const s = selector.replace(/::?(not|is|where)\(/g, "(");
  const ids = (s.match(/#[\w-]+/g) ?? []).length;
  const classes =
    (s.match(/\.[\w-]+/g) ?? []).length + (s.match(/\[[^\]]+\]/g) ?? []).length + (s.match(/:(?!:)[\w-]+/g) ?? []).length;
  const bare = s.replace(/[.#:][\w-]+/g, " ").replace(/\[[^\]]+\]/g, " ");
  const elements = (bare.match(/(^|[\s>+~(])[a-zA-Z][\w-]*/g) ?? []).length;
  return ids * 10000 + classes * 100 + elements;
}

export type FontSizeReader = (el: Element) => number;

/** `css` is every stylesheet in play; `chatTextScale` is the number the plugin's root carries in `--bonsai-chat-text-scale`. */
export function makeFontSizeReader(css: string, chatTextScale: number): FontSizeReader {
  const rules = parseRules(css);

  const declaredOn = (el: Element): string | null => {
    let best: { key: [number, number, number]; value: string } | null = null;
    const offer = (key: [number, number, number], value: string) => {
      if (!best || key[0] > best.key[0] || (key[0] === best.key[0] && (key[1] > best.key[1] || (key[1] === best.key[1] && key[2] > best.key[2])))) {
        best = { key, value };
      }
    };
    for (const rule of rules) {
      let hit = false;
      try {
        hit = el.matches(rule.selector);
      } catch {
        hit = false;
      }
      if (!hit) continue;
      for (const d of rule.decls) if (d.prop === "font-size") offer([d.important ? 1 : 0, specificity(rule.selector), rule.order], d.value);
    }
    const inline = (el as HTMLElement).style?.fontSize;
    if (inline) offer([0, 1_000_000, 0], inline);
    return best ? (best as { value: string }).value : null;
  };

  const read: FontSizeReader = (el) => {
    const value = declaredOn(el);
    const parent = el.parentElement;
    const parentPx = parent ? read(parent) : 16;
    if (value === null || value === "inherit") return parentPx;
    let m = /^calc\(\s*([\d.]+)px \* var\(--bonsai-chat-text-scale, 1\)\s*\)$/.exec(value);
    if (m) return Number(m[1]) * chatTextScale;
    m = /^calc\(\s*([\d.]+)px \* var\(--bonsai-ui-scale, 1\)\s*\)$/.exec(value);
    if (m) return Number(m[1]);
    m = /^([\d.]+)px$/.exec(value);
    if (m) return Number(m[1]);
    m = /^([\d.]+)em$/.exec(value);
    if (m) return Number(m[1]) * parentPx;
    throw new Error(`settledFontSize: cannot read the font size "${value}" on <${el.tagName.toLowerCase()} class="${el.className}">`);
  };
  return read;
}
