/**
 * Title: Read aloud's corner of the answer bubble
 *
 * Purpose: Styles the Read aloud speaker drawn into the answer bubble's lower-left corner (plan 84
 * step 3), the mirror image of the Copy icon in the lower-right: the strip it sits in, the
 * bottom band that keeps the answer's text clear of it, the icon's own look, and how Copy's strip
 * shifts to share the same row.
 *
 * Used for: Spliced into answerBubble.ts's buildAnswerBubbleSection(), right after Copy's rules,
 * which this block overrides where the two corners share a bubble.
 *
 * Solves: answerBubble.ts crossed the file-size limit when this was added to it, and the block is a
 * self-contained unit with one job.
 *
 * Does not: Style Copy itself or the rest of the bubble (answerBubble.ts), or the speaker's place in
 * the D-pad walk (buildAnswerCornerSlots.tsx).
 */
import { uiScalePx } from "./uiScalePx";

/**
 * In: nothing. Out: a block of CSS text.
 * Can go wrong: the rules here beat Copy's by one extra class, not by order, so they keep winning
 * wherever answerBubble.ts places them; the -26 pull-up on Copy's strip is derived from the 6px gap
 * the turn slot puts between its children (answerBubble.ts), and would need re-deriving if that
 * gap changed.
 */
export function buildReadAloudCornerCss(): string {
  return `
        /*
         * Read aloud, drawn inside the answer's bottom-LEFT corner (plan 84 step 3): Copy mirrored.
         * Same plan as Copy above -- a sibling of the bubble in the DOM (so Steam scrolls it and steps
         * onto it like any other stop), pulled up into the corner by a negative margin, with only the
         * icon taking a tap. It comes before Copy in the tree, so the two overlap the same strip and
         * the left-to-right order of the D-pad stops is the tree order.
         *
         * Two things differ from Copy because the speaker comes FIRST. Its own bottom margin (12, which
         * puts the reply block back where it sat before the icons existed) is dropped when Copy follows,
         * and Copy's pull-up shrinks from -38 to -26: Copy's top has to land where the speaker's top
         * did (4 above the bubble's bottom, minus the icon), and it now starts from the speaker's
         * bottom plus the turn slot's 6px gap instead of from the bubble's. -38 = -(8 + 6 + 20 + 4),
         * and with 20 + 4 already spent by the speaker, -26 = -(20 + 6).
         */
        .bonsai-scope .bonsai-reply-read-aloud-corner-slot {
          display: flex !important;
          justify-content: flex-start !important;
          align-items: center !important;
          width: min(92%, 100%) !important;
          max-width: min(92%, 100%) !important;
          align-self: flex-start !important;
          margin-top: ${uiScalePx(-38)} !important;
          margin-bottom: ${uiScalePx(12)} !important;
          padding-left: ${uiScalePx(7)} !important;
          box-sizing: border-box !important;
          position: relative !important;
          z-index: 1 !important;
          outline: none !important;
          pointer-events: none !important;
        }
        .bonsai-scope .bonsai-reply-read-aloud-corner-slot.bonsai-reply-read-aloud-corner-slot--before-copy {
          margin-bottom: 0 !important;
        }
        .bonsai-scope .bonsai-reply-copy-corner-slot.bonsai-reply-copy-corner-slot--after-read-aloud {
          margin-top: ${uiScalePx(-26)} !important;
        }
        .bonsai-scope .bonsai-reply-read-aloud-corner-slot > button.bonsai-reply-read-aloud-corner {
          pointer-events: auto !important;
        }
        /*
         * The answer keeps clear of the speaker with a band along the bottom, not an end-of-line spacer.
         *
         * Copy's float works because a right float generated after the last line's text lands at the
         * right end of that line. The speaker is at the START of the last line, and a float cannot be
         * made to land there: the paragraph's one :after is already Copy's, and a :before floats to the
         * start of the FIRST line. So the bubble gains a bottom band as tall as the icon strip
         * instead (20 under the text where it was 8): the icons sit in it, below every line, and
         * neither corner needs a spacer. Copy's own spacer and its extra room under a trailing code box
         * stand down while the band is there, or the band would be paid for twice.
         */
        .bonsai-scope .bonsai-chat-ai-bubble--with-read-aloud .bonsai-chat-ai-bubble-inner {
          padding-bottom: ${uiScalePx(20)} !important;
        }
        .bonsai-scope .bonsai-chat-ai-bubble--with-copy.bonsai-chat-ai-bubble--with-read-aloud .bonsai-answer-stop:last-child > .bonsai-md-p:last-child::after,
        .bonsai-scope .bonsai-chat-ai-bubble--with-copy.bonsai-chat-ai-bubble--with-read-aloud .bonsai-answer-stop:last-child > .bonsai-md-fenced-pre:last-child::after,
        .bonsai-scope .bonsai-chat-ai-bubble--with-copy.bonsai-chat-ai-bubble--with-read-aloud .bonsai-answer-stop:last-child > .bonsai-md-ul:last-child > .bonsai-md-li:last-child > .bonsai-md-p:last-child::after,
        .bonsai-scope .bonsai-chat-ai-bubble--with-copy.bonsai-chat-ai-bubble--with-read-aloud .bonsai-answer-stop:last-child > .bonsai-md-ol:last-child > .bonsai-md-li:last-child > .bonsai-md-p:last-child::after,
        .bonsai-scope .bonsai-chat-ai-bubble--with-copy.bonsai-chat-ai-bubble--with-read-aloud .bonsai-answer-stop:last-child > .bonsai-md-ul:last-child > .bonsai-md-li:last-child:not(:has(> .bonsai-md-p))::after,
        .bonsai-scope .bonsai-chat-ai-bubble--with-copy.bonsai-chat-ai-bubble--with-read-aloud .bonsai-answer-stop:last-child > .bonsai-md-ol:last-child > .bonsai-md-li:last-child:not(:has(> .bonsai-md-p))::after {
          content: none !important;
          float: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        .bonsai-scope .bonsai-chat-ai-bubble--with-copy.bonsai-chat-ai-bubble--with-read-aloud .bonsai-answer-stop:last-child > .bonsai-md-fenced-pre:last-child {
          margin-bottom: 0 !important;
        }
        /* Icon only, the same look as Copy's: no border, no fill, no minimum height, 50% at rest. */
        .bonsai-scope button.bonsai-chat-secondary-btn.bonsai-reply-read-aloud-corner,
        .bonsai-scope button.bonsai-chat-secondary-btn.bonsai-reply-read-aloud-corner.DialogButton {
          min-height: 0 !important;
          min-width: 0 !important;
          width: ${uiScalePx(20)} !important;
          height: ${uiScalePx(20)} !important;
          margin: 0 !important;
          padding: 0 !important;
          gap: 0 !important;
          flex: 0 0 auto !important;
          border: none !important;
          border-radius: 4px !important;
          background: none !important;
          box-shadow: none !important;
          color: #d4dde6 !important;
          opacity: 0.5 !important;
        }
        /* Full strength the moment the D-pad ring lands on it, with the same white ring Show details has. */
        .bonsai-scope .bonsai-reply-read-aloud-corner-slot:focus-within button.bonsai-reply-read-aloud-corner,
        .bonsai-scope button.bonsai-reply-read-aloud-corner.gpfocus,
        .bonsai-scope button.bonsai-reply-read-aloud-corner:focus-visible {
          opacity: 0.95 !important;
        }
        .bonsai-scope button.bonsai-chat-secondary-btn.bonsai-reply-read-aloud-corner.gpfocus,
        .bonsai-scope button.bonsai-chat-secondary-btn.bonsai-reply-read-aloud-corner:focus-visible {
          outline: 2px solid rgba(255, 255, 255, 0.9) !important;
          outline-offset: 2px !important;
        }
        /* Speaking: red, the same shade the Ask bar's mic turns while recording. */
        .bonsai-scope button.bonsai-chat-secondary-btn.bonsai-reply-read-aloud-corner.bonsai-chat-read-aloud-btn--speaking {
          color: #f87171 !important;
          opacity: 0.95 !important;
        }
`;
}
