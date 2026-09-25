/**
 * Title: The answer bubble in the conversation
 *
 * Purpose: Styles the glass-panel bubble that holds the AI's answer: its
 * background and border, the pulsing border and blinking cursor while an
 * answer is still streaming in, the dashed "waiting on a code block to
 * finish" chip, each answer section's own D-pad outline, the spoiler
 * reveal box, and the Copy icon tucked into the bubble's bottom-right
 * corner (drawn as a sibling of the bubble, not nested inside it, so the
 * D-pad cannot bounce between the icon and the last line of text).
 *
 * Used for: Folded into section-6.ts's buildSection6Section(), directly
 * after the question bubble it sits across from in the transcript.
 *
 * Does not: Style the question bubble (questionBubble.ts), the markdown
 * formatting of the text inside the bubble (answerMarkdownFormatting.ts),
 * or the row of buttons underneath the bubble (still in section-6.ts).
 */
import { uiScalePx } from "./uiScalePx";

/**
 * In: nothing -- every value here is a fixed string or read from a CSS
 * variable that some other part of the plugin sets.
 * Out: a block of CSS text.
 * Can go wrong: this function itself cannot fail, but several rules here
 * exist only to win a specificity fight with another rule elsewhere in
 * the stylesheet, or to keep the Copy icon clear of the answer's own
 * text -- each says so in its own comment.
 */
export function buildAnswerBubbleSection(): string {
  return `        .bonsai-scope .bonsai-chat-turn-row--expanded .bonsai-chat-ai-bubble {
          margin-bottom: 8px !important;
        }
        .bonsai-scope .bonsai-chat-turn-slot {
          display: flex !important;
          flex-direction: column !important;
          align-items: stretch !important;
          gap: 6px !important;
          min-width: 0 !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }
        .bonsai-scope .bonsai-chat-ai-bubble.Panel.Focusable,
        .bonsai-scope .bonsai-chat-ai-bubble.Panel.Focusable > div {
          font-size: 12px !important;
          line-height: 1.4 !important;
        }
        .bonsai-scope .bonsai-ai-response-plain-stream {
          white-space: pre-wrap !important;
          word-break: break-word !important;
          overflow-wrap: anywhere !important;
          font-size: 12px !important;
          line-height: 1.4 !important;
          color: inherit !important;
        }
        .bonsai-scope .bonsai-chat-ai-bubble .bonsai-ai-response-chunk--in-bubble {
          font-size: 12px !important;
          line-height: 1.4 !important;
        }
        .bonsai-scope .bonsai-chat-ai-bubble-inner {
          padding: 8px 10px !important;
          box-sizing: border-box !important;
        }
        /*
         * Copy, drawn inside the answer's bottom-right corner while staying a sibling of the
         * bubble in the DOM (why in flow and not a child: runs/reply-block-copy-trap.json,
         * 2026-09-06). The first cut sat astride the bubble's bottom edge, half in and half out,
         * and the maintainer called it from a screenshot the same day.
         */
        .bonsai-scope .bonsai-reply-copy-corner-slot {
          display: flex !important;
          justify-content: flex-end !important;
          align-items: center !important;
          /* Same cap as the answer bubble above it, so the icon lands on the bubble's own right
             edge rather than the column's. Kept in step with BONSAI_CHAT_AI_BUBBLE_MAX_FRAC. */
          width: min(92%, 100%) !important;
          max-width: min(92%, 100%) !important;
          align-self: flex-start !important;
          /* Pulled up until the icon's bottom sits 4px above the bubble's bottom edge: the bubble's
             own margin (8) plus the turn slot's gap (6) plus the icon (20) plus those 4 — measured
             on the Deck 2026-09-06, where -24 left the icon at 1155–1175 against a bubble ending at
             1165. The margin below puts the reply block back where it sat before the icon existed,
             so the reply loses no height to it. */
          margin-top: ${uiScalePx(-38)} !important;
          margin-bottom: ${uiScalePx(12)} !important;
          padding-right: ${uiScalePx(7)} !important;
          box-sizing: border-box !important;
          position: relative !important;
          z-index: 1 !important;
          outline: none !important;
          /* The slot spans the bubble's width so the icon lands on the bubble's right edge, and it
             overlaps the last section's bottom strip; only the icon should take a tap. Without
             this the strip hit-tested as the slot (sweep on the Deck 2026-09-06, "last section
             67% visible, covered by the copy slot"). */
          pointer-events: none !important;
        }
        .bonsai-scope .bonsai-reply-copy-corner-slot > button.bonsai-reply-copy-corner {
          pointer-events: auto !important;
        }
        /*
         * The answer's last line keeps clear of the icon.
         *
         * Same idea as the question bubble's Retry, mirrored: the icon overlaps the bottom corner,
         * and the only text that can reach it is the END of the last line, so a right-floated
         * spacer generated after that line's content reserves the corner. When the last line is
         * already full the spacer drops to a line of its own — one line of height, in the one case
         * where the text would otherwise run under the icon. Anything else (a bottom padding band,
         * a right-hand column) would cost every answer space to protect that one case.
         *
         * The float has to sit INSIDE the block that owns the last line, and markdown gives that
         * block several shapes: a paragraph or heading (both carry .bonsai-md-p), a fenced code
         * block, a list's last item, or a loose list's last item wrapping its own paragraph. Two
         * rules rather than one list so the :has() pair cannot take the plain ones down with it if
         * a Steam client ever lacks it. A table's last cell is not covered; there the icon rides
         * over the corner.
         */
        .bonsai-scope .bonsai-chat-ai-bubble--with-copy .bonsai-answer-stop:last-child > .bonsai-md-p:last-child::after,
        .bonsai-scope .bonsai-chat-ai-bubble--with-copy .bonsai-answer-stop:last-child > .bonsai-md-fenced-pre:last-child::after,
        .bonsai-scope .bonsai-chat-ai-bubble--with-copy .bonsai-answer-stop:last-child > .bonsai-md-ul:last-child > .bonsai-md-li:last-child > .bonsai-md-p:last-child::after,
        .bonsai-scope .bonsai-chat-ai-bubble--with-copy .bonsai-answer-stop:last-child > .bonsai-md-ol:last-child > .bonsai-md-li:last-child > .bonsai-md-p:last-child::after {
          content: "" !important;
          float: right !important;
          /* Icon 20 wide, 7 in from the bubble's right border; the text ends 11 in. 24 leaves a
             4px gap between the last word and the icon. */
          width: ${uiScalePx(24)} !important;
          height: 1em !important;
        }
        .bonsai-scope .bonsai-chat-ai-bubble--with-copy .bonsai-answer-stop:last-child > .bonsai-md-ul:last-child > .bonsai-md-li:last-child:not(:has(> .bonsai-md-p))::after,
        .bonsai-scope .bonsai-chat-ai-bubble--with-copy .bonsai-answer-stop:last-child > .bonsai-md-ol:last-child > .bonsai-md-li:last-child:not(:has(> .bonsai-md-p))::after {
          content: "" !important;
          float: right !important;
          width: ${uiScalePx(24)} !important;
          height: 1em !important;
        }
        /*
         * A code box paints its own background and border, so the end-of-line spacer above does
         * not help it the way it helps ordinary text: that spacer reserves room at the end of the
         * last LINE, but a code box has its own edge, not a line the icon can share. When the fence
         * is the answer's last block, the icon's usual pull-up (margin-top: -38px on the copy slot,
         * above) lands on the box's own painted corner instead of the bubble's flat one — measured
         * on the Deck 2026-09-12 (screenshots/DeckCapture_20260912_183855_game.png): the icon
         * overlapped the box's bottom-right corner by 16px across and 9 down, about two fifths of
         * it on the box. Fix: give the box itself extra room below — the icon's height (20) plus a
         * few pixels — so the icon sits below the box instead of on it. Scoped to a fenced block
         * that is the LAST child of the last section, so an answer ending in ordinary text (any
         * other shape) keeps today's layout exactly.
         */
        .bonsai-scope .bonsai-chat-ai-bubble--with-copy .bonsai-answer-stop:last-child > .bonsai-md-fenced-pre:last-child {
          margin-bottom: ${uiScalePx(28)} !important;
        }
        /*
         * Icon only: no border, no gradient, no minimum height. Overrides the shared secondary
         * button look, which is a labelled pill and would draw a box over the answer's own text.
         */
        .bonsai-scope button.bonsai-chat-secondary-btn.bonsai-reply-copy-corner,
        .bonsai-scope button.bonsai-chat-secondary-btn.bonsai-reply-copy-corner.DialogButton {
          min-height: 0 !important;
          width: ${uiScalePx(20)} !important;
          height: ${uiScalePx(20)} !important;
          padding: 0 !important;
          gap: 0 !important;
          border: none !important;
          border-radius: 4px !important;
          background: none !important;
          box-shadow: none !important;
          color: #d4dde6 !important;
          /* Same weight as the microphone in the Ask field. */
          opacity: 0.5 !important;
        }
        .bonsai-scope .bonsai-reply-copy-corner-slot:focus-within button.bonsai-reply-copy-corner,
        .bonsai-scope button.bonsai-reply-copy-corner.gpfocus,
        .bonsai-scope button.bonsai-reply-copy-corner:focus-visible {
          opacity: 0.95 !important;
        }
        .bonsai-scope button.bonsai-reply-copy-corner--copied {
          color: #9ce7ff !important;
          opacity: 0.95 !important;
        }
        .bonsai-scope button.bonsai-reply-copy-corner--error {
          color: #f16a5a !important;
          opacity: 0.95 !important;
        }
        .bonsai-scope .bonsai-chat-ai-bubble .bonsai-ai-response-stack--in-bubble,
        .bonsai-scope .bonsai-chat-ai-bubble .bonsai-ai-response-chunk--in-bubble {
          background: transparent !important;
          border: none !important;
          border-bottom: none !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          outline: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        /* Each answer section is its own D-pad stop. The reset directly above strips both of the
           properties Steam draws its ring with (outline and box-shadow, each !important), so a stop
           has to draw its own marker or the user cannot see where they are. Comes after that reset
           deliberately: same specificity, so source order decides. The transparent border is always
           present, otherwise focusing a section would shift the text sideways. */
        .bonsai-scope .bonsai-chat-ai-bubble .bonsai-answer-stop {
          border-left: 2px solid transparent !important;
          padding-left: 6px !important;
          border-radius: 4px !important;
        }
        .bonsai-scope .bonsai-chat-ai-bubble .bonsai-answer-stop.gpfocus,
        .bonsai-scope .bonsai-chat-ai-bubble .bonsai-answer-stop:focus {
          border-left-color: rgba(150, 187, 223, 0.9) !important;
          background: rgba(64, 93, 124, 0.22) !important;
        }
        .bonsai-scope .bonsai-spoiler-reveal-target {
          background: #0a0a0a !important;
          border-color: rgba(80, 80, 80, 0.55) !important;
          user-select: none !important;
        }
        .bonsai-scope .bonsai-spoiler-reveal-target > div:first-child {
          color: rgba(160, 160, 160, 0.85) !important;
        }
        .bonsai-scope .bonsai-chat-next-message-row {
          align-items: flex-end !important;
        }
        .bonsai-scope .bonsai-chat-ai-bubble.bonsai-glass-panel {
          border-radius: 10px !important;
          border: 1px solid var(--bonsai-chat-ai-bubble-border, rgba(46, 135, 83, 0.48)) !important;
          background:
            linear-gradient(
              0deg,
              var(--bonsai-chat-ai-bubble-wash, rgba(130, 183, 152, 0.11)),
              var(--bonsai-chat-ai-bubble-wash, rgba(130, 183, 152, 0.11))
            ),
            linear-gradient(
              180deg,
              var(--bonsai-chat-ai-bubble-bg-top, rgba(46, 135, 83, 0.12)) 0%,
              var(--bonsai-chat-ai-bubble-bg-bottom, rgba(18, 52, 34, 0.55)) 100%
            ) !important;
          color: var(--bonsai-chat-ai-bubble-text, #d4dde6) !important;
          overflow: hidden !important;
        }
        .bonsai-scope .bonsai-chat-ai-bubble .bonsai-ai-response-stack {
          background: transparent !important;
          border: none !important;
          width: 100% !important;
          max-width: 100% !important;
        }
        .bonsai-scope .bonsai-chat-ai-bubble-inner--faded {
          -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%) !important;
          mask-image: linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%) !important;
        }
        /* Streaming keeps the accent border: it reads as the cyan glow plus the caret, not as a
           border swap (item 12). The fence-wait sub-state drops its swap for the same reason. */
        .bonsai-scope .bonsai-chat-ai-bubble--stream-preview.bonsai-glass-panel {
          animation: bonsai-stream-preview-pulse var(--bonsai-stream-pulse-ms, 2000ms) ease-in-out infinite;
        }
        @keyframes bonsai-stream-preview-pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.12);
          }
          50% {
            box-shadow: 0 0 8px 1px rgba(56, 189, 248, 0.28);
          }
        }
        .bonsai-scope .bonsai-stream-fence-wait {
          display: inline-flex !important;
          align-items: center !important;
          gap: 8px !important;
          margin: 8px 0 !important;
          padding: 8px 10px !important;
          border-radius: 8px !important;
          border: 1px dashed rgba(56, 189, 248, 0.55) !important;
          color: #38bdf8 !important;
          font-size: 12px !important;
          line-height: 1.35 !important;
        }
        .bonsai-scope .bonsai-stream-fence-wait--code {
          animation: bonsai-stream-fence-wait-pulse var(--bonsai-stream-pulse-ms, 2000ms) ease-in-out infinite;
        }
        .bonsai-scope .bonsai-stream-fence-wait--spoiler {
          border-color: rgba(150, 187, 223, 0.45) !important;
          color: rgba(190, 205, 220, 0.9) !important;
          background: rgba(24, 40, 58, 0.45) !important;
        }
        @keyframes bonsai-stream-fence-wait-pulse {
          50% {
            opacity: 0.55;
          }
        }
        .bonsai-scope .bonsai-stream-fence-wait-spin {
          width: 12px !important;
          height: 12px !important;
          border: 2px solid rgba(56, 189, 248, 0.25) !important;
          border-top-color: #38bdf8 !important;
          border-radius: 50% !important;
          flex: 0 0 auto !important;
          animation: bonsai-stream-fence-wait-spin var(--bonsai-stream-spin-ms, 2000ms) linear infinite;
        }
        @keyframes bonsai-stream-fence-wait-spin {
          to {
            transform: rotate(360deg);
          }
        }
        .bonsai-scope [data-bonsai-stream-preview="true"] .bonsai-ai-response-chunk::after {
          content: "▋";
          display: inline;
          margin-left: 2px;
          opacity: 0.85;
          animation: bonsai-stream-caret-blink 0.9s step-end infinite;
        }
        @keyframes bonsai-stream-caret-blink {
          50% {
            opacity: 0.15;
          }
        }
        /* Plan 69's scramble (ScrambledAnswerText.tsx): no end cursor while letters churn -- the
           churn marks the edge -- and line breaks inside the unsettled stretch stay line breaks,
           so a new line or list item starts where the markdown will put it once it settles. The
           two cursor selectors cover the preview mark on the section itself and on a parent. */
        .bonsai-scope [data-bonsai-stream-preview="true"]:has(.bonsai-stream-scramble) .bonsai-ai-response-chunk::after,
        .bonsai-scope [data-bonsai-stream-preview="true"].bonsai-ai-response-chunk:has(.bonsai-stream-scramble)::after {
          content: none;
        }
        .bonsai-scope .bonsai-stream-scramble {
          white-space: pre-wrap;
        }
        /* The Copy corner waits for the last letters to settle (plan 69, up to 0.6 s after the
           end): the slot exists only while any are unsettled. Hidden rather than removed, so the
           D-pad's stops and the page's layout stay exactly as they are when it appears. */
        .bonsai-scope .bonsai-chat-ai-bubble:has(.bonsai-stream-scramble) + .bonsai-reply-copy-corner-slot {
          visibility: hidden !important;
        }
        .bonsai-scope .bonsai-stream-scramble-churn--dim {
          opacity: 0.5;
        }
        .bonsai-scope .bonsai-stream-scramble-churn--green {
          color: #5b9e7e;
        }
        .bonsai-scope .bonsai-stream-scramble-churn--cyan {
          color: #7fd3f7;
        }`;
}
