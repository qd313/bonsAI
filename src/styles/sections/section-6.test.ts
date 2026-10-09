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
  // caret beside it (`.bonsai-unified-input-fake-caret--before-hint`) inherits the overlay div's own
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

describe("the live thinking under the question reads as ordinary text (the maintainer's call, 2026-09-24)", () => {
  // It used to be three one-line sentences cut with an ellipsis, which read as a list of broken
  // lines. Now it wraps like any text, and the newest lines stay in view at the bottom.
  const css = buildSection6Section();
  const match = css.match(/\.bonsai-scope \.bonsai-chat-reasoning-live\s*\{([^}]*)\}/);

  it("wraps instead of cutting each line with an ellipsis", () => {
    expect(match).toBeTruthy();
    const body = match![1]!;
    expect(body).toMatch(/white-space:\s*pre-wrap/);
    expect(body).not.toMatch(/nowrap/);
    expect(body).not.toMatch(/text-overflow:\s*ellipsis/);
    expect(css).not.toContain("bonsai-chat-reasoning-live-line");
  });

  it("keeps the newest six lines in view, older ones leaving at the top", () => {
    const body = match![1]!;
    expect(body).toMatch(/justify-content:\s*flex-end/);
    expect(body).toMatch(/overflow:\s*hidden/);
    expect(body).toMatch(/max-height:\s*calc\(6 \* 1\.15em/);
    expect(body).toMatch(/line-height:\s*1\.15/);
  });

  it("is small, dim and italic, so it reads as the model thinking, not as the answer", () => {
    const body = match![1]!;
    expect(body).toMatch(/font-style:\s*italic/);
    expect(body).toMatch(/font-size:[^;]*\b9px/);
    expect(body).toMatch(/color:\s*rgba\(180, 198, 217, 0\.6\)/);
  });
});

describe("the question box's glow while an answer's text arrives (Deck frame rate, 2026-09-25)", () => {
  // Breathing redraws the box every frame. With the model writing on the graphics chip that cost
  // the panel about 5 frames a second while an answer streamed in, and nothing while it only thought.
  const css = buildSection6Section();

  it("still breathes while asking, so the thinking keeps its sign of life", () => {
    const match = css.match(
      /\.bonsai-scope \.bonsai-unified-input-host\.bonsai-unified-input--asking\.bonsai-glass-panel,[^{]*\{([^}]*)\}/,
    );
    expect(match).toBeTruthy();
    expect(match![1]!).toMatch(/animation:\s*bonsai-ask-input-breathe/);
  });

  it("holds steady once the dock is marked as the answer arriving, with a selector that outranks the breathing", () => {
    const match = css.match(
      /\.bonsai-scope \.bonsai-main-tab-dock--answer-arriving \.bonsai-unified-input-host\.bonsai-unified-input--asking\.bonsai-glass-panel\s*\{([^}]*)\}/,
    );
    expect(match).toBeTruthy();
    const body = match![1]!;
    expect(body).toMatch(/animation:\s*none/);
    expect(body).toMatch(/border-color:[^;]*!important/);
  });
});

describe("the 'What went wrong?' reason chips are tighter than the other reply buttons (plan 72 option E, calmed in plan 79)", () => {
  // Five reasons used to sit almost one to a row in the 300-wide chat column. The maintainer picked
  // option E (2026-09-27): two rows, with smaller chips. Plan 79 made them calmer still ("after 2,
  // smaller and softer"): 5 gap, 24 tall, 2 by 8 padding. The final settled sizes are read off the
  // whole stylesheet in replyRatingChoices.test.ts; this pins that the shared button is left alone.
  const css = buildSection6Section();
  const scaled = (px: number) => `calc(${px}px * var(--bonsai-ui-scale, 1))`;

  it("puts 5 between the reason chips, scaled and able to beat the shared row gap", () => {
    const match = css.match(/\.bonsai-scope \.bonsai-chat-reply-actions-row--chips\s*\{([^}]*)\}/);
    expect(match).toBeTruthy();
    expect(match![1]!).toContain(`gap: ${scaled(5)} !important`);
  });

  it("makes each reason chip 24 tall with 2 by 8 padding, scaled", () => {
    const match = css.match(
      /\.bonsai-scope \.bonsai-chat-reply-actions \.bonsai-chat-reply-actions-row--chips button\.bonsai-chat-secondary-btn\.DialogButton\s*\{([^}]*)\}/,
    );
    expect(match).toBeTruthy();
    const body = match![1]!;
    expect(body).toContain(`min-height: ${scaled(24)} !important`);
    expect(body).toContain(`padding: ${scaled(2)} ${scaled(8)} !important`);
  });

  it("leaves the shared reply button at its own size", () => {
    const match = css.match(
      /\.bonsai-scope button\.bonsai-chat-secondary-btn,\s*\.bonsai-scope button\.bonsai-chat-secondary-btn\.DialogButton\s*\{([^}]*)\}/,
    );
    expect(match).toBeTruthy();
    expect(match![1]!).toMatch(/min-height:\s*32px !important/);
    expect(match![1]!).toMatch(/padding:\s*6px 12px !important/);
  });

  it("puts 5 between the two rows of reason chips too, not the block's 8", () => {
    // Deck re-check 2026-09-27 (plan72-F-CHIPS.json): the rows measured the reply block's own gap
    // of 8, not the chips' gap. The second row pulls up by the difference.
    const block = css.match(/\.bonsai-scope \.bonsai-chat-reply-actions\s*\{([^}]*)\}/);
    expect(block![1]!).toContain("gap: 8px !important");
    const match = css.match(
      /\.bonsai-scope \.bonsai-chat-reply-actions-row--chips \+ \.bonsai-chat-reply-actions-row--chips\s*\{([^}]*)\}/,
    );
    expect(match).toBeTruthy();
    expect(match![1]!).toContain(`margin-top: calc(${scaled(5)} - 8px) !important`);
  });
});

describe("Read aloud is no longer styled as a row item (section 6 CSS, plan 84 step 3)", () => {
  // The speaker moved into the answer's lower-left corner, whose look lives in answerBubble.ts. The
  // old rules pinned it to the right-hand end of the thumbs row (auto left margin, a 30 x 32 box) and
  // would fight the corner's 20 x 20 icon if they stayed, since the button keeps the same class name.
  const css = buildSection6Section();

  it("has no rule left that styles the speaker in the thumbs row", () => {
    /* The old rules were keyed on the shared button class plus the speaker's own, with an auto left
       margin and a 30 wide box. Others still name the class (the reply-rating rules leave it out with
       a :not(...); the corner speaker's red colour hangs off it), but none selects it on its own. */
    expect(css).not.toMatch(/button\.bonsai-chat-secondary-btn\.bonsai-chat-read-aloud-btn/);
  });

  it("has no \"Saved on this Deck\" centring rule for a row the label no longer shares", () => {
    expect(css).not.toContain(".bonsai-chat-reply-actions-row > .bonsai-chat-feedback-row__label");
  });
});
