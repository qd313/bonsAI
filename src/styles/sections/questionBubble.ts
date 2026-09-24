/**
 * Title: The question bubble in the conversation
 *
 * Purpose: Styles the right-aligned bubble that holds a person's own
 * question in the transcript: its shape and background, the small Retry
 * icon tucked into its bottom-left corner, the single-line title at rest,
 * and the wrapped, five-line-capped title once the bubble is open with a
 * fade on its last line when the question runs longer than that.
 *
 * Used for: Folded into section-6.ts's buildSection6Section(), directly
 * after the transcript's own column/row shell rules.
 *
 * Does not: Style the answer bubble across from it (answerBubble.ts) or
 * the row of buttons underneath an answer (replyActionsRow.ts).
 */
import { uiScalePx } from "./uiScalePx";

/**
 * In: nothing -- every value here is a fixed string or read from a CSS
 * variable that some other part of the plugin sets.
 * Out: a block of CSS text.
 * Can go wrong: this function itself cannot fail, but see the inline
 * comments -- several rules here exist only to win a specificity fight
 * with another rule in the stylesheet, or to place the Retry icon exactly
 * where the Deck measurements in the comments say it has to sit.
 */
export function buildQuestionBubbleSection(): string {
  return `        .bonsai-scope .bonsai-chat-turn-row-header {
          display: block !important;
          width: fit-content !important;
          /* Same cap as the answer bubble below it, so the two are mirrored rather than merely
             both indented. At 88% a long question stopped 35px short of the left edge while the
             answer stopped 23px short of the right, and the mismatch is what read as lopsided
             (measured on the Deck 2026-09-05, reported by the maintainer). 92% of the 290px row
             is 267px, which is exactly the answer bubble's width. */
          max-width: min(92%, 280px) !important;
          min-width: 0 !important;
          margin-left: auto !important;
          margin-right: 0 !important;
          align-self: flex-end !important;
          box-sizing: border-box !important;
          text-align: right !important;
          padding: 6px 10px !important;
          border-radius: 8px !important;
          cursor: pointer !important;
          outline: none !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          background: linear-gradient(
            180deg,
            rgba(22, 34, 48, 0.78) 0%,
            rgba(14, 22, 34, 0.82) 100%
          ) !important;
          color: #8fa8c4 !important;
        }
        /*
         * The newest question's bubble carries a Retry icon at its bottom-left corner (D77).
         *
         * Out of the flow, not a flex child. As a child it reserved a 26px column down the WHOLE
         * height of the bubble — on a four-line question that is a tall empty strip, and the
         * maintainer flagged it from a screenshot on 2026-09-06. Positioned against the bubble it
         * costs no width at all, so the question text gets those pixels back and usually drops a
         * line.
         *
         * Inside the bubble's bottom-left corner: 6px in from the left border, 3px up from the
         * bottom one. The first cut straddled the border — half in, half out — and the maintainer
         * called it from a screenshot on 2026-09-06. All relative to the bubble itself, so no
         * measurement is involved: the earlier worry about this bubble's floating left edge was
         * about pinning to the COLUMN, not to the bubble. How the text keeps clear of it is the
         * pair of title rules below.
         */
        .bonsai-scope .bonsai-chat-turn-row-header--with-retry {
          position: relative !important;
        }
        .bonsai-scope .bonsai-chat-turn-row-body {
          min-width: 0 !important;
          text-align: right !important;
          outline: none !important;
        }
        /*
         * Four classes plus the element on purpose. .bonsai-scope .Panel.Focusable > div further
         * up this sheet forces position: relative !important on every direct div child of a Decky
         * Focusable, and it beat a two-class rule: measured on the Deck 2026-09-06, the icon stayed
         * in the flow, sat at the TOP of the bubble pushed 245px to the left, and added 23px of
         * empty space above the question text — the opposite of the fix.
         */
        .bonsai-scope
          .bonsai-chat-turn-row-header.bonsai-chat-turn-row-header--with-retry
          > div.bonsai-turn-retry-corner-slot {
          position: absolute !important;
          top: auto !important;
          right: auto !important;
          left: ${uiScalePx(6)} !important;
          bottom: ${uiScalePx(3)} !important;
          margin: 0 !important;
          /* Above the question text's box, which follows it in the DOM and is itself positioned:
             without this a hit-test at the icon returned the title span, so a TAP on the icon
             would have opened the question rather than retried (sweep on the Deck 2026-09-06,
             "Retry same prompt COVERED by the title"). */
          z-index: 2 !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          outline: none !important;
        }
        /*
         * The question text keeps clear of the icon without reserving a column beside every line.
         *
         * Only the OPEN newest question carries the icon — a collapsed one is rebuilt without it,
         * since the transcript hands over the Retry handler only while the turn is expanded — so
         * only the open shape matters. There, only the LAST line can meet the icon —
         * the text is right-aligned — so a left float generated after the text sits on that line
         * and pushes its words to the right. When the last line is already full the float drops
         * to a line of its own underneath, the one case that adds height (a single line), and the
         * only way to promise the icon never sits on a word. A question longer than the five-line
         * cap keeps its float on a hidden line, so there the icon rides over the faded fifth line
         * instead. The icon itself lives outside the title box, so the open bubble's bottom fade
         * does not touch it.
         *
         * A float rather than padding for the open case on purpose: padding reserved 26px beside
         * every line of a four-line question, and the maintainer flagged the empty strip from a
         * screenshot on 2026-09-06. Widths: the icon starts at 6 and is 20 wide, so it ends at 26;
         * the header's 10px side padding plus this 22 puts the first word at 32, a 6px gap.
         */
        .bonsai-scope
          .bonsai-chat-turn-row-header--with-retry.bonsai-chat-turn-row-header--expanded
          .bonsai-chat-turn-row-title::after {
          content: "" !important;
          float: left !important;
          width: ${uiScalePx(22)} !important;
          height: 1.3em !important;
        }
        /* Icon only, same weight as the microphone in the Ask field. */
        .bonsai-scope button.bonsai-chat-secondary-btn.bonsai-turn-retry-corner,
        .bonsai-scope button.bonsai-chat-secondary-btn.bonsai-turn-retry-corner.DialogButton {
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
          opacity: 0.5 !important;
        }
        .bonsai-scope .bonsai-turn-retry-corner-slot:focus-within button.bonsai-turn-retry-corner,
        .bonsai-scope button.bonsai-turn-retry-corner.gpfocus,
        .bonsai-scope button.bonsai-turn-retry-corner:focus-visible {
          opacity: 0.95 !important;
        }
        .bonsai-scope .bonsai-chat-turn-row-header--live {
          border: 1px solid rgba(100, 145, 205, 0.48) !important;
          background: linear-gradient(
            180deg,
            rgba(32, 52, 78, 0.8) 0%,
            rgba(20, 34, 54, 0.85) 100%
          ) !important;
          color: #dce6f2 !important;
        }
        .bonsai-scope .bonsai-chat-turn-row-header--expanded {
          border: 1px solid rgba(120, 155, 198, 0.42) !important;
          background: linear-gradient(
            180deg,
            rgba(36, 52, 72, 0.82) 0%,
            rgba(24, 36, 52, 0.85) 100%
          ) !important;
          color: #e8eef4 !important;
        }
        .bonsai-scope .bonsai-chat-turn-row-title {
          display: block !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          line-height: 1.3 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
        /*
         * D60: an OPEN turn shows the whole question, wrapped, capped at five lines — instead of
         * the single-line ellipsis rule above. Scoped off the header's own --expanded modifier
         * (set by buildTurnHeaderElement.tsx) rather than a class on the title span itself, so
         * the two files stay decoupled.
         */
        .bonsai-scope .bonsai-chat-turn-row-header--expanded .bonsai-chat-turn-row-title {
          white-space: normal !important;
          overflow: hidden !important;
          overflow-wrap: anywhere !important;
          text-overflow: clip !important;
          max-height: 6.5em !important;
        }
        /*
         * The last-line fade only belongs on a question that is actually cut short by the
         * five-line cap above. CSS alone cannot tell a short question from a cut one, so
         * MainTabChatTranscript.tsx measures the title's real height against that cap (the same
         * shape of check ChatSlotRow.tsx runs for its own title overflow) and adds this modifier
         * class only when the text truly overflows. Roadmap: "A short question fades out at its
         * right edge as if there were more to read" — before this it fired on every open
         * question, one-liners included, because the mask below used to run unconditionally.
         *
         * The fade is a plain overflow cue, not the focus-driven cut-question cue from the same
         * decision (that one is a separate Features entry, still unbuilt). It fades a fixed
         * one-line-tall band at the bottom via calc(100% - 1.3em) rather than a fixed percentage,
         * so the fade always covers the LAST line actually shown — 1 through 5 — rather than a
         * fraction of a box whose height changes with how much text there is.
         */
        .bonsai-scope
          .bonsai-chat-turn-row-header--expanded
          .bonsai-chat-turn-row-title--overflowing {
          -webkit-mask-image: linear-gradient(
            to bottom,
            #000 0%,
            #000 calc(100% - 1.3em),
            transparent 100%
          ) !important;
          mask-image: linear-gradient(
            to bottom,
            #000 0%,
            #000 calc(100% - 1.3em),
            transparent 100%
          ) !important;
        }`;
}
