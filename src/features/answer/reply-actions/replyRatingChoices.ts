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
 * `.bonsai-chat-reply-actions`, the block only the reply row draws.
 *
 * Does not: Touch the D-pad ring (gamepadAndPullModels.ts) or the Show details line. The ring's box-shadow is
 * not overridden while a button holds it: the resting highlight is dropped only on a button that does not hold the ring.
 */
import { textPx } from "../../../styles/textPx";

/**
 * In: nothing.
 * Out: a block of CSS text.
 * Can go wrong: nothing. The values are the drawing's own (calmer-ratings.html, `.v2`).
 */
export function buildReplyRatingChoicesSection(): string {
  return `        /*
         * Helpful, Not really and the five reasons: soft fill, soft outline, small medium-weight
         * words. The class count outranks the shared button rule whatever order the rules arrive in.
         */
        .bonsai-scope .bonsai-chat-reply-actions button.bonsai-chat-secondary-btn,
        .bonsai-scope .bonsai-chat-reply-actions button.bonsai-chat-secondary-btn.DialogButton {
          min-height: 28px !important;
          padding: 4px 10px !important;
          border-radius: 6px !important;
          font-size: ${textPx(11)} !important;
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
          gap: 5px !important;
        }
        .bonsai-scope .bonsai-chat-reply-actions .bonsai-chat-reply-actions-row--chips button.bonsai-chat-secondary-btn,
        .bonsai-scope .bonsai-chat-reply-actions .bonsai-chat-reply-actions-row--chips button.bonsai-chat-secondary-btn.DialogButton {
          min-height: 24px !important;
          padding: 2px 8px !important;
        }
        /* The two rows sit 5 apart as well: the reply block's own gap is 8, so the second row
           pulls up by the difference (Deck re-check, plan 72: the rows measured the block's 8). */
        .bonsai-scope .bonsai-chat-reply-actions-row--chips + .bonsai-chat-reply-actions-row--chips {
          margin-top: calc(5px - 8px) !important;
        }
        /*
         * Plan 98: Wrong tip, Outdated, Wrong edition and Undo. Each is a Steam stop of its own (a Focusable,
         * not a button: kbDemoteRows.tsx says why), drawn to match the reasons beside it, ring included.
         */
        .bonsai-scope .bonsai-chat-reply-actions .bonsai-kb-demote-chip {
          display: inline-flex;
          align-items: center;
          box-sizing: border-box;
          min-height: 24px;
          padding: 2px 8px;
          border-radius: 6px;
          font-size: ${textPx(11)};
          font-weight: 500;
          line-height: 1.2;
          border: 1px solid rgba(110, 150, 200, 0.2);
          background: linear-gradient(180deg, rgba(26, 42, 62, 0.4) 0%, rgba(18, 28, 42, 0.45) 100%);
          color: #b4c6dc;
          cursor: pointer;
          outline: none;
        }
        .bonsai-scope .bonsai-chat-reply-actions .bonsai-kb-demote-chip--disabled {
          opacity: 0.45;
          cursor: default;
        }
        /* "Marked not helpful" on the left, Undo on the right (the drawing's frame 3). */
        .bonsai-scope .bonsai-chat-reply-actions .bonsai-kb-demote-done {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .bonsai-scope .bonsai-chat-reply-actions .bonsai-kb-demote-undo {
          padding: 1px 4px;
          border-radius: 4px;
          font-size: ${textPx(10.5)};
          color: #9fb7d5;
          text-decoration: underline;
          cursor: pointer;
          outline: none;
        }
        .bonsai-scope .bonsai-chat-reply-actions .bonsai-kb-demote-noted {
          font-size: ${textPx(11)};
          line-height: 1.35;
          color: #e0b672;
        }
        .bonsai-scope .bonsai-chat-reply-actions .bonsai-kb-demote-chip.gpfocus,
        .bonsai-scope .bonsai-chat-reply-actions .bonsai-kb-demote-chip:focus-visible,
        .bonsai-scope .bonsai-chat-reply-actions .bonsai-kb-demote-undo.gpfocus,
        .bonsai-scope .bonsai-chat-reply-actions .bonsai-kb-demote-undo:focus-visible {
          outline: 2px solid rgba(255, 255, 255, 0.9) !important;
          outline-offset: 2px !important;
        }
`;
}
