/**
 * Title: The streamed-answer scramble -- stylesheet checks
 * Purpose: Pin the three things plan 69 asks the stylesheet for while an answer's letters are still
 *          scrambling: no blinking end cursor, line breaks inside the unsettled stretch kept as
 *          line breaks, and the Copy corner held back until the last letter settles.
 * Used for: The `.bonsai-stream-scramble` rules in answerBubble.ts, and the span
 *           ScrambledAnswerText.tsx draws.
 * Does not: Check what any of it looks like -- jsdom has no layout engine. These read the generated
 *           CSS text, as the other section tests do; the look is the Deck's and the maintainer's.
 */
import { describe, expect, it } from "vitest";
import { buildAnswerBubbleSection } from "./answerBubble";
import { uiScalePx } from "./uiScalePx";
import { ANSWER_LINE_HEIGHT, buildAnswerMarkdownFormattingSection } from "./answerMarkdownFormatting";

function ruleBody(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  expect(match, `no rule for ${selector}`).toBeTruthy();
  return match![1]!;
}

describe("the answer's line spacing (the maintainer's call, 2026-09-25: tighter lines)", () => {
  const css = buildAnswerBubbleSection();

  it("spaces answer lines at 1.25 of the text size, not the old 1.4, in every rule that sets it", () => {
    expect(ANSWER_LINE_HEIGHT).toBe(1.25);
    for (const selector of [
      ".bonsai-scope .bonsai-chat-ai-bubble .bonsai-ai-response-chunk--in-bubble",
      ".bonsai-scope .bonsai-ai-response-plain-stream",
    ]) {
      expect(ruleBody(css, selector)).toMatch(/line-height:\s*1\.25 !important/);
    }
    expect(css).not.toMatch(/line-height:\s*1\.4 !important/);
    expect(buildAnswerMarkdownFormattingSection()).toMatch(/line-height:\s*1\.25;/);
  });
});

describe("the streamed-answer scramble's stylesheet (plan 69)", () => {
  const css = buildAnswerBubbleSection();

  it("hides the end cursor while the answer has a scramble in it", () => {
    const body = ruleBody(
      css,
      '.bonsai-scope [data-bonsai-stream-preview="true"].bonsai-ai-response-chunk:has(.bonsai-stream-scramble)::after'
    );
    expect(body).toMatch(/content:\s*none/);
  });

  it("keeps line breaks in the unsettled stretch", () => {
    expect(ruleBody(css, ".bonsai-scope .bonsai-stream-scramble")).toMatch(/white-space:\s*pre-wrap/);
  });

  it("holds the Copy corner back, without removing it, while any letter is unsettled", () => {
    const body = ruleBody(
      css,
      ".bonsai-scope .bonsai-chat-ai-bubble:has(.bonsai-stream-scramble) + .bonsai-reply-copy-corner-slot"
    );
    expect(body).toMatch(/visibility:\s*hidden/);
    expect(body).not.toMatch(/display:\s*none/);
  });

  it("keeps each unsettled letter in the line, invisible, with its symbol drawn over it", () => {
    const letter = ruleBody(css, ".bonsai-scope .bonsai-stream-scramble-char");
    expect(letter).toMatch(/-webkit-text-fill-color:\s*transparent/);
    expect(letter).toMatch(/position:\s*relative/);
    const symbol = ruleBody(css, ".bonsai-scope .bonsai-stream-scramble-char::before");
    expect(symbol).toMatch(/content:\s*attr\(data-s\)/);
    expect(symbol).toMatch(/position:\s*absolute/);
    expect(symbol).toMatch(/-webkit-text-fill-color:\s*currentColor/);
  });

  it("gives each colour choice its own look", () => {
    expect(ruleBody(css, ".bonsai-scope .bonsai-stream-scramble-churn--dim")).toMatch(/opacity:\s*0\.5/);
    expect(ruleBody(css, ".bonsai-scope .bonsai-stream-scramble-churn--green")).toMatch(/color:\s*#5b9e7e/);
    expect(ruleBody(css, ".bonsai-scope .bonsai-stream-scramble-churn--cyan")).toMatch(/color:\s*#7fd3f7/);
  });
});

describe("the streaming bubble's glow (Deck frame rate, 2026-09-25)", () => {
  // A pulse redraws the bubble every frame; with the model writing on the graphics chip it and the
  // question box's breathing cost the panel about 5 frames a second while an answer streamed in.
  const css = buildAnswerBubbleSection();

  it("is steady, not a pulse", () => {
    const body = ruleBody(css, ".bonsai-scope .bonsai-chat-ai-bubble--stream-preview.bonsai-glass-panel");
    expect(body).toMatch(/box-shadow:\s*0 0 8px 1px rgba\(56, 189, 248, 0\.2\)/);
    expect(body).not.toMatch(/animation/);
    expect(css).not.toContain("bonsai-stream-preview-pulse");
  });
});

describe("Read aloud in the answer's lower-left corner -- stylesheet (plan 84 step 3)", () => {
  const css = buildAnswerBubbleSection();
  /** The body of the rule that lists `selector` anywhere in its comma-separated selectors. */
  const bodyOfRuleListing = (selector: string): string => {
    const at = css.indexOf(selector);
    expect(at, `no rule lists ${selector}`).toBeGreaterThanOrEqual(0);
    const open = css.indexOf("{", at);
    const close = css.indexOf("}", open);
    /* The selector must belong to this very rule: only selectors and commas lie between them. */
    expect(css.slice(at + selector.length, open)).toMatch(/^[\s,.:>+~()\w\-\[\]="'*]*$/);
    return css.slice(open + 1, close);
  };

  it("draws the slot into the bubble's bottom-left corner, the mirror of Copy's", () => {
    const read = ruleBody(css, ".bonsai-scope .bonsai-reply-read-aloud-corner-slot");
    const copy = ruleBody(css, ".bonsai-scope .bonsai-reply-copy-corner-slot");
    expect(read).toMatch(/justify-content:\s*flex-start/);
    expect(copy).toMatch(/justify-content:\s*flex-end/);
    expect(read).toContain(`padding-left: ${uiScalePx(7)} !important`);
    expect(copy).toContain(`padding-right: ${uiScalePx(7)} !important`);
    /* Pulled up like Copy's (-38 alone), 2 less because the icon sits 2 from the bubble's bottom, not 4;
       the same width as Copy, so the two icons share one strip. */
    expect(read).toContain(`margin-top: ${uiScalePx(-36)} !important`);
    expect(read).toContain("width: min(92%, 100%) !important");
    /* Only the icon takes a tap, not the strip across the last line. */
    expect(read).toMatch(/pointer-events:\s*none/);
    expect(ruleBody(css, ".bonsai-scope .bonsai-reply-read-aloud-corner-slot > button.bonsai-reply-read-aloud-corner")).toMatch(
      /pointer-events:\s*auto/
    );
  });

  it("puts Copy on the same strip when it follows the speaker: it pulls up 26, not 38, and the speaker gives back no height", () => {
    expect(
      ruleBody(
        css,
        ".bonsai-scope .bonsai-reply-copy-corner-slot.bonsai-reply-copy-corner-slot--after-read-aloud"
      )
    ).toContain(`margin-top: ${uiScalePx(-26)} !important`);
    expect(
      ruleBody(
        css,
        ".bonsai-scope .bonsai-reply-read-aloud-corner-slot.bonsai-reply-read-aloud-corner-slot--before-copy"
      )
    ).toContain("margin-bottom: 0 !important");
  });

  it("draws the icon at Copy's size and weight", () => {
    const body = ruleBody(
      css,
      ".bonsai-scope button.bonsai-chat-secondary-btn.bonsai-reply-read-aloud-corner.DialogButton"
    );
    expect(body).toContain(`width: ${uiScalePx(20)} !important`);
    expect(body).toContain(`height: ${uiScalePx(20)} !important`);
    /* Copy's own icon, read from its rule, so the two cannot drift apart. */
    const copy = ruleBody(css, ".bonsai-scope button.bonsai-chat-secondary-btn.bonsai-reply-copy-corner.DialogButton");
    expect(copy).toContain(`width: ${uiScalePx(20)} !important`);
    expect(body).toMatch(/opacity:\s*0\.5/);
    expect(body).toMatch(/border:\s*none/);
  });

  it("turns red while reading, and shows the white ring when the D-pad is on it", () => {
    expect(
      ruleBody(
        css,
        ".bonsai-scope button.bonsai-chat-secondary-btn.bonsai-reply-read-aloud-corner.bonsai-chat-read-aloud-btn--speaking"
      )
    ).toMatch(/color:\s*#f87171/);
    expect(
      ruleBody(css, ".bonsai-scope button.bonsai-chat-secondary-btn.bonsai-reply-read-aloud-corner:focus-visible")
    ).toMatch(/outline:\s*2px solid/);
  });

  /*
   * Text never runs under either icon. Copy's float spacer reserves the END of the last line; nothing
   * reserves its START, so a bubble with the speaker gets a bottom band and Copy's spacer stands down
   * (paying for both would cost a line twice).
   */
  it("gives a bubble with the speaker a bottom band of 25 (see the arithmetic below)", () => {
    expect(ruleBody(css, ".bonsai-scope .bonsai-chat-ai-bubble--with-read-aloud .bonsai-chat-ai-bubble-inner")).toContain(
      `padding-bottom: ${uiScalePx(25)} !important`
    );
  });

  /*
   * The band is arithmetic, not a feel (Deck, plan 84 step 3, 2026-10-08): with a 20 point band the
   * speaker's 20 point box sat 3 points INTO the last line, and its ring (2 point outline) covered the
   * line's first letter. Measured: line bottom 324.3, box 321.3 to 341.3, bubble bottom 345.3. The
   * band has to hold the whole stack under the last line's bottom, bottom up:
   *     bubble border + band  >=  inset + icon box + ring reach + clearance
   * where the inset is how far the box sits above the bubble's bottom edge, and the ring reach is the
   * outline's width plus its offset, on the side that faces the text. Everything is read back out of
   * the generated CSS, so changing one number without the others fails here.
   */
  describe("the bottom band holds the icon, its inset and its ring (P84-READ-01 follow-up)", () => {
    const BORDER = 1;
    const CLEARANCE = 2;
    /* A scaled length ("calc(20px * var(--bonsai-ui-scale, 1))") or a plain one, as a number. */
    const px = (declaration: string, prop: string): number => {
      const m = declaration.match(new RegExp("(?:^|[\\s;])" + prop + ":\\s*(?:calc\\()?(-?[\\d.]+)px"));
      expect(m, `no ${prop} in ${declaration.trim().slice(0, 80)}`).toBeTruthy();
      return Number(m![1]);
    };
    const band = () =>
      px(ruleBody(css, ".bonsai-scope .bonsai-chat-ai-bubble--with-read-aloud .bonsai-chat-ai-bubble-inner"), "padding-bottom");
    const box = () =>
      px(ruleBody(css, ".bonsai-scope button.bonsai-chat-secondary-btn.bonsai-reply-read-aloud-corner.DialogButton"), "height");
    /* The slot is pulled up by -(bubble margin 8 + turn gap 6 + box + inset), see answerBubbleCorners.ts. */
    const inset = () =>
      -px(ruleBody(css, ".bonsai-scope .bonsai-reply-read-aloud-corner-slot"), "margin-top") - 8 - 6 - box();
    const ring = (selector: string) => {
      const body = ruleBody(css, selector);
      return px(body, "outline") + px(body, "outline-offset");
    };
    const speakerRing = () =>
      ring(".bonsai-scope button.bonsai-chat-secondary-btn.bonsai-reply-read-aloud-corner:focus-visible");
    const copyRing = () =>
      ring(".bonsai-scope .bonsai-reply-copy-corner-slot--after-read-aloud button.bonsai-reply-copy-corner:focus-visible");

    it("band + border >= box + inset + ring + clearance, for the speaker", () => {
      expect(BORDER + band()).toBeGreaterThanOrEqual(box() + inset() + speakerRing() + CLEARANCE);
    });

    it("and for Copy when it shares the band", () => {
      expect(BORDER + band()).toBeGreaterThanOrEqual(box() + inset() + copyRing() + CLEARANCE);
    });

    it("keeps the ring inside the bubble: the inset is at least the ring's reach below the box", () => {
      expect(inset()).toBeGreaterThanOrEqual(speakerRing());
    });

    it("puts the reply block back where it sat: bottom margin = bubble margin 8 + inset", () => {
      expect(
        px(ruleBody(css, ".bonsai-scope .bonsai-reply-read-aloud-corner-slot"), "margin-bottom")
      ).toBe(8 + inset());
      expect(
        px(
          ruleBody(css, ".bonsai-scope .bonsai-reply-copy-corner-slot.bonsai-reply-copy-corner-slot--after-read-aloud"),
          "margin-bottom"
        )
      ).toBe(8 + inset());
    });
  });

  it("stands Copy's end-of-line spacer and its code-box room down while the band is there", () => {
    const stand = ".bonsai-scope .bonsai-chat-ai-bubble--with-copy.bonsai-chat-ai-bubble--with-read-aloud .bonsai-answer-stop:last-child";
    expect(bodyOfRuleListing(`${stand} > .bonsai-md-p:last-child::after`)).toMatch(/content:\s*none/);
    expect(ruleBody(css, `${stand} > .bonsai-md-fenced-pre:last-child`)).toContain("margin-bottom: 0 !important");
    /* ...and leaves them exactly as they were for a bubble with Copy alone. */
    expect(
      bodyOfRuleListing(
        ".bonsai-scope .bonsai-chat-ai-bubble--with-copy .bonsai-answer-stop:last-child > .bonsai-md-ul:last-child > .bonsai-md-li:last-child:not(:has(> .bonsai-md-p))::after"
      )
    ).toMatch(/float:\s*right/);
  });

  it("holds both corners back while any letter is unsettled", () => {
    for (const selector of [
      ".bonsai-scope .bonsai-chat-ai-bubble:has(.bonsai-stream-scramble) + .bonsai-reply-read-aloud-corner-slot",
      ".bonsai-scope .bonsai-chat-ai-bubble:has(.bonsai-stream-scramble) + .bonsai-reply-read-aloud-corner-slot + .bonsai-reply-copy-corner-slot",
    ]) {
      expect(bodyOfRuleListing(selector)).toMatch(/visibility:\s*hidden/);
    }
  });
});
