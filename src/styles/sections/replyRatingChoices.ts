/**
 * Title: The rating choices under an answer, calmer
 *
 * Purpose: Styles the buttons in the row under an answer: Helpful and Not really, and the five
 * "What went wrong?" reasons. The maintainer found them loud (plan 79) and picked the look called
 * "after 2, smaller and softer" in the drawing: the fill and the outline both halved, the words 11 px
 * at medium weight instead of 12 px bold, the reasons 24 px tall instead of 28 and the thumbs 28 instead
 * of 32. The whole block comes out about 9 px shorter, which gives the answer that much more room.
 *
 * Used for: Folded into section-6.ts's buildSection6Section(), straight after the shared reply button
 * rule it overrides.
 *
 * Solves: The shared reply button (`.bonsai-chat-secondary-btn`) is also the Retry and Copy corners and
 * more, so the calmer look cannot be written on the shared rule. Every selector here starts at
 * `.bonsai-chat-reply-actions`, the block only the reply row draws, and leaves the speaker alone.
 *
 * Does not: Touch the D-pad ring (gamepadAndPullModels.ts), the Show details line, or the speaker's
 * own rules in section-6.ts. The ring's box-shadow is not overridden while a button holds it: the
 * resting highlight is dropped only on a button that does not hold the ring.
 */
import { uiScalePx } from "./uiScalePx";

/**
 * In: nothing.
 * Out: a block of CSS text.
 * Can go wrong: nothing. The values are the drawing's own (calmer-ratings.html, `.v2`).
 */
export function buildReplyRatingChoicesSection(): string {
  return `        /*
         * Helpful, Not really and the five reasons: soft fill, soft outline, small medium-weight
         * words. The class count outranks the shared button rule whatever order the rules arrive in.
         * (The Read aloud speaker used to be left out of this block with a :not(); it sits in the
         * answer's corner now, never inside .bonsai-chat-reply-actions.)
         */
        .bonsai-scope .bonsai-chat-reply-actions button.bonsai-chat-secondary-btn,
        .bonsai-scope .bonsai-chat-reply-actions button.bonsai-chat-secondary-btn.DialogButton {
          min-height: 28px !important;
          padding: 4px 10px !important;
          border-radius: 6px !important;
          font-size: 11px !important;
          font-weight: 500 !important;
          border: 1px solid rgba(110, 150, 200, 0.2) !important;
          background: linear-gradient(
            180deg,
            rgba(26, 42, 62, 0.4) 0%,
            rgba(18, 28, 42, 0.45) 100%
          ) !important;
          color: #b4c6dc !important;
        }
        /* The resting highlight goes; a button holding the ring keeps the ring's own shadow. */
        .bonsai-scope .bonsai-chat-reply-actions button.bonsai-chat-secondary-btn:not(.gpfocus):not(:focus-visible),
        .bonsai-scope .bonsai-chat-reply-actions button.bonsai-chat-secondary-btn.DialogButton:not(.gpfocus):not(:focus-visible) {
          box-shadow: none !important;
        }
        /* The "What went wrong?" reasons run tighter still: 24 tall, 5 apart (plan 72 option E, then plan 79). */
        .bonsai-scope .bonsai-chat-reply-actions-row--chips {
          flex-wrap: wrap;
          gap: ${uiScalePx(5)} !important;
        }
        .bonsai-scope .bonsai-chat-reply-actions .bonsai-chat-reply-actions-row--chips button.bonsai-chat-secondary-btn,
        .bonsai-scope .bonsai-chat-reply-actions .bonsai-chat-reply-actions-row--chips button.bonsai-chat-secondary-btn.DialogButton {
          min-height: ${uiScalePx(24)} !important;
          padding: ${uiScalePx(2)} ${uiScalePx(8)} !important;
        }
        /* The two rows sit 5 apart as well: the reply block's own gap is 8, so the second row
           pulls up by the difference (Deck re-check, plan 72: the rows measured the block's 8). */
        .bonsai-scope .bonsai-chat-reply-actions-row--chips + .bonsai-chat-reply-actions-row--chips {
          margin-top: calc(${uiScalePx(5)} - 8px) !important;
        }
`;
}
