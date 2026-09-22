/**
 * Title: Copy icon vs. a code box at the end of a reply — stylesheet checks
 * Purpose: Pin the fix for roadmap "The copy button sits on top of the code box instead of
 *          beside it" (two-star, ui, measured on the Deck 2026-09-12,
 *          screenshots/DeckCapture_20260912_183855_game.png): the corner icon overlapped a
 *          trailing code box's own bottom-right corner by 16px across and 9 down, because the
 *          icon's usual pull-up assumes the bubble's flat background sits behind it, and a code
 *          box paints its own background and border there instead.
 * Used for: The `.bonsai-chat-ai-bubble--with-copy` corner icon rules in section-6.ts, alongside
 *           the end-of-line spacer they sit next to (which reserves room for ordinary text, not a
 *           code box's own edge).
 * Does not: Render anything or assert paint — jsdom has no layout/paint engine
 *           (design-language.md rule 6). These read the generated CSS text, the same approach
 *           section-4.test.ts uses for the same reason. See buildAnswerBubbleElement.test.tsx for
 *           proof that the DOM shape this selector targets is what the bubble actually renders.
 */
import { describe, expect, it } from "vitest";
import { buildSection6Section } from "./section-6";
import { UNIFIED_TEXT_FONT_PX } from "../../features/unified-input/constants";

describe("copy icon room reserved below a trailing code box (section 6 CSS)", () => {
  const css = buildSection6Section();

  it("reserves room below a code box that is the answer's last block", () => {
    const match = css.match(
      /\.bonsai-scope \.bonsai-chat-ai-bubble--with-copy \.bonsai-answer-stop:last-child > \.bonsai-md-fenced-pre:last-child\s*\{([^}]*)\}/,
    );
    expect(match).toBeTruthy();
    const body = match![1]!;
    // The icon is 20 tall (section-6.ts, button.bonsai-reply-copy-corner); the reserved room must
    // be at least that plus a little breathing space, and marked !important so it outranks the
    // shared `.bonsai-md-fenced-pre` margin reset above it.
    const marginMatch = body.match(/margin-bottom:\s*calc\((\d+)px/);
    expect(marginMatch).toBeTruthy();
    expect(Number(marginMatch![1])).toBeGreaterThanOrEqual(24);
    expect(body).toMatch(/!important/);
  });

  it("does not touch a fenced block that is not the last thing in the reply", () => {
    // The selector's `:last-child` is load-bearing: a code box followed by more text (or by
    // another block) must keep today's spacing, because the icon then sits below real text, not
    // the box, and the end-of-line spacer already covers that case.
    const match = css.match(
      /\.bonsai-scope \.bonsai-chat-ai-bubble--with-copy \.bonsai-answer-stop:last-child > \.bonsai-md-fenced-pre:last-child\s*\{([^}]*)\}/,
    );
    expect(match![0]).toContain(":last-child > .bonsai-md-fenced-pre:last-child");
  });

  it("leaves the plain-text ending's own spacer rule alone", () => {
    // The pre-existing end-of-line spacer (::after on .bonsai-md-p / .bonsai-md-fenced-pre /
    // list items) still exists for the ordinary-text case; this fix only adds a second, narrower
    // rule for the code-box case rather than replacing it.
    expect(css).toMatch(
      /\.bonsai-scope \.bonsai-chat-ai-bubble--with-copy \.bonsai-answer-stop:last-child > \.bonsai-md-p:last-child::after/,
    );
  });
});

describe("strategy placeholder font size matches the real caret (section 6 CSS, roadmap: blinking cursor does not line up with the placeholder)", () => {
  // The strategy-mode placeholder span used to hard-code font-size: 10px while the blinking
  // caret beside it (`.bonsai-unified-input-fake-caret--overlay`) inherits the overlay div's own
  // 12px (UNIFIED_TEXT_FONT_PX, set inline in MainTabUnifiedAskBar.tsx), so the two could never
  // line up. The fix makes the placeholder span read the same font size as the real typed text.
  const css = buildSection6Section();

  it("does not hard-code a smaller font size than the real text field's own", () => {
    const match = css.match(/\.bonsai-scope \.bonsai-unified-input-strategy-placeholder\s*\{([^}]*)\}/);
    expect(match).toBeTruthy();
    const body = match![1]!;
    expect(body).not.toMatch(/font-size:\s*10px/);
  });

  it("uses the same scaled font size constant as the real field's text (UNIFIED_TEXT_FONT_PX)", () => {
    const match = css.match(/\.bonsai-scope \.bonsai-unified-input-strategy-placeholder\s*\{([^}]*)\}/);
    const body = match![1]!;
    expect(body).toMatch(new RegExp(`font-size:\\s*calc\\(${UNIFIED_TEXT_FONT_PX}px`));
  });
});

describe("chat slot title centring (section 6 CSS, plan 62 3a)", () => {
  // The chat's name used to sit 14px left of the game name above it and the dots below it,
  // because the title row centred the name TOGETHER with the small delete x beside it, and the
  // game name/dots centre on the whole row instead. jsdom has no layout engine (design-language.md
  // rule 6, same reason section-4.test.ts and the copy-icon suite above read the CSS text rather
  // than rendering), so this proves the fix structurally: the x is taken out of the flex group
  // that gets centred, rather than checking a pixel offset the test runner cannot produce.
  const css = buildSection6Section();

  it("takes the delete x out of the centred flex flow and anchors it to the row's own edge", () => {
    const match = css.match(/\.bonsai-scope \.bonsai-chat-slot-delete\s*\{([^}]*)\}/);
    expect(match).toBeTruthy();
    const body = match![1]!;
    // position: absolute (not a flex child any more) removes it from the group that
    // justify-content: center on .bonsai-chat-slot-title-row centres — that group is now only
    // the title (and, unfocused, its ghost neighbours), so it centres on the row's true middle.
    expect(body).toMatch(/position:\s*absolute;/);
    expect(body).toMatch(/right:\s*0;/);
    expect(body).not.toMatch(/flex:\s*0 0 auto;/);
  });

  it("gives the title row a positioned anchor for that absolute x", () => {
    const match = css.match(/\.bonsai-scope \.bonsai-chat-slot-title-row\s*\{([^}]*)\}/);
    expect(match).toBeTruthy();
    expect(match![1]).toMatch(/position:\s*relative;/);
  });

  it("narrows the name's own width so a long one still ellipsizes before the x, not under it", () => {
    // 28px is the delete box (22px) plus the 6px gap it used to sit in — the exact amount of
    // room the x used to occupy inside the centred group, now reserved instead of shared with it.
    const match = css.match(/\.bonsai-scope \.bonsai-chat-slot-title\s*\{([^}]*)\}/);
    expect(match).toBeTruthy();
    const body = match![1]!;
    expect(body).toMatch(/max-width:\s*calc\(88% - calc\(28px/);
  });
});

describe("suggestion chip surface at rest (section 6 CSS, plan 60 board B)", () => {
  const css = buildSection6Section();

  it("gives the base chip rule the top-lit gradient and the hairline-plus-shadow list", () => {
    // Two rules share this selector text: the shared blur rule (`.bonsai-glass-panel,
    // .bonsai-preset-glass { backdrop-filter... }`) comes first, then this chip's own rule with
    // its background/border/box-shadow — take the second match, not the first.
    const matches = [...css.matchAll(/\.bonsai-scope \.bonsai-preset-glass\s*\{([^}]*)\}/g)];
    expect(matches.length).toBeGreaterThanOrEqual(2);
    const body = matches[1]![1]!;
    expect(body).toContain(
      "background: linear-gradient(180deg, rgba(56, 70, 84, 0.5) 0%, rgba(16, 22, 30, 0.55) 100%) !important;",
    );
    expect(body).toContain("border: 1px solid rgba(255, 255, 255, 0.10) !important;");
    expect(body).toMatch(/box-shadow:\s*\n\s*inset 0 1px 0 rgba\(255, 255, 255, 0\.10\),\s*\n\s*0 2px 3px rgba\(0, 0, 0, 0\.4\) !important;/);
  });

  it("keeps the help chip on its own colours and does not let it set box-shadow", () => {
    const match = css.match(
      /\.bonsai-scope button\.bonsai-preset-help-chip\.bonsai-preset-glass\s*\{([^}]*)\}/,
    );
    expect(match).toBeTruthy();
    const body = match![1]!;
    expect(body).toContain("background: linear-gradient(");
    expect(body).not.toMatch(/box-shadow/);
  });

  it("gives the agent chip the raised look and its own orange ring and glow, together", () => {
    // box-shadow replaces the whole list rather than adding to it, so this chip cannot inherit the
    // hairline and drop shadow from the rule above while also setting its own orange ring: all four
    // have to be written out here, or whichever is missing is silently erased.
    const match = css.match(
      /\.bonsai-scope button\.bonsai-preset-glass\.bonsai-pyro-inject-chip\s*\{([^}]*)\}/,
    );
    expect(match).toBeTruthy();
    const body = match![1]!;
    expect(body).toContain("border: 2px solid rgba(255, 107, 53, 0.92) !important;");
    expect(body).toMatch(/inset 0 1px 0 rgba\(255, 255, 255, 0\.10\)/);
    expect(body).toMatch(/0 0 0 1px rgba\(160, 45, 28, 0\.5\)/);
    expect(body).toMatch(/0 0 12px rgba\(255, 85, 40, 0\.38\)/);
    expect(body).toMatch(/0 2px 3px rgba\(0, 0, 0, 0\.4\) !important;/);
  });
});
