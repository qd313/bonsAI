/**
 * Title: Chat bubbles, the bottom dock, and the saved-chats strip
 *
 * Purpose: This file started as one thing — the frosted-glass look shared
 * by panels across the plugin — and grew into the largest single piece of
 * styling in the plugin as the conversation screen grew around it. It now
 * covers most of what a person actually looks at while reading a
 * conversation: the question and answer bubbles, the row of saved chats
 * above them, and the Ask bar pinned to the bottom of the screen.
 *
 *     ┌─ tab strip / saved-chats row ────────────┐
 *     ├───────────────────────────────────────────┤
 *     │            you: a question          [bubble, right-aligned]
 *     │  [bubble] the AI's answer, in sections     │
 *     │           [retry] [copy] [Show details]    │
 *     ├─ bottom dock, pinned in place ─────────────┤
 *     │  [suggestion chips]                        │
 *     │  Ask something...              [ Ask ]     │
 *     └─────────────────────────────────────────────┘
 *
 * Used for: Folded into the plugin's one combined stylesheet by
 * bonsaiScopeStylesheet.ts, alongside the other numbered section files.
 *
 * Does not: Style the tab strip above the saved-chats row (section-1.ts)
 * or the plugin's own tab bar (tabIndicatorBar.ts).
 *
 * Split note (plan 65): answer text formatting (paragraphs, lists, code
 * blocks) now lives in answerMarkdownFormatting.ts, the question bubble
 * (with its Retry icon) lives in questionBubble.ts, the answer bubble
 * (streaming look, Copy icon, D-pad stops) lives in answerBubble.ts,
 * and the saved-chats row (its shape, title and ghosts in
 * savedChatSlotsRow.ts, its small dots in savedChatSlotDots.ts) lives
 * in those two, all called from here.
 *
 * How it works: roughly top to bottom of the file —
 * 1. The shared frosted-glass look (blurred, semi-transparent background)
 *    used by several panels, plus the Ask box's pulsing border while
 *    waiting on an answer.
 * 2. How answer text itself is formatted — paragraphs, lists, quotes,
 *    links, and code blocks.
 * 3. The question and answer bubbles in the conversation: their shape,
 *    their small corner icons (retry on a question, copy on an answer),
 *    and the streaming look (a pulsing border and blinking cursor) while
 *    an answer is still arriving.
 * 4. The buttons below an answer (retry, copy, and so on) and the "Show
 *    details" divider line.
 * 5. The bottom dock: the suggestion chips and Ask bar, pinned to the
 *    bottom of the screen no matter how long the conversation above them
 *    grows, with a soft fade hinting that more text is scrollable above.
 * 6. The row of saved chats above the conversation: its bumper pills, the
 *    current chat's name, faint "ghost" previews of the chats on either
 *    side, and the small dots marking every chat plus the one that
 *    creates a new one.
 */
import { BONSAI_CHAT_INPUT_TO_TRANSCRIPT_GAP_PX, BONSAI_CHAT_TRANSCRIPT_TO_SAVE_GAP_PX, UNIFIED_TEXT_FONT_PX } from "../../features/unified-input/constants";
import { uiScalePx } from "./uiScalePx";
import { buildAnswerMarkdownFormattingSection } from "./answerMarkdownFormatting";
import { buildQuestionBubbleSection } from "./questionBubble";
import { buildAnswerBubbleSection } from "./answerBubble";
import { buildSavedChatSlotsRowSection } from "./savedChatSlotsRow";
import { buildSavedChatSlotDotsSection } from "./savedChatSlotDots";

/**
 * In: nothing — every value here is a fixed string or read from a CSS
 * variable that some other part of the plugin sets.
 * Out: a block of CSS text — the largest one this plugin builds.
 * Can go wrong: this function itself cannot fail, but several rules
 * inside it exist only to win a specificity fight with another rule
 * elsewhere in the stylesheet (each one says so in its own comment) — a
 * change to the order sections are combined in, in bonsaiScopeStylesheet.ts,
 * could quietly flip one of those fights.
 *
 * 1. The shared glass-panel background and border, plus the pulsing glow
 *    the Ask box gets while a question is mid-flight.
 * 2. Formatting for the text inside an answer: paragraphs, lists, quotes,
 *    links, inline code, and fenced code blocks.
 * 3. The question bubble: right-aligned, its own background, and the
 *    small Retry icon tucked into its bottom-left corner — positioned by
 *    hand rather than reserving space in the layout, so a short question
 *    is not left with an empty gap beside it.
 * 4. The answer bubble: its glass background, the pulsing border and
 *    blinking-cursor look while text is still streaming in, and the
 *    dashed "waiting on a code block to finish" chip.
 * 5. The Copy icon tucked into an answer's bottom-right corner, drawn as
 *    a sibling of the bubble rather than nested inside it (explained
 *    inline — nesting it caused the D-pad to bounce between the icon and
 *    the last line of text), plus the trick that keeps the answer's very
 *    last line of text from running underneath it.
 * 6. Each answer section's own D-pad outline, used when stepping through
 *    a long answer piece by piece.
 * 7. The row of buttons under an answer (retry, copy feedback, and so
 *    on) and the "Show details" hairline divider.
 * 8. The Main tab's bottom dock — the suggestion chips and Ask bar,
 *    pinned to the bottom of the screen by sticky positioning rather
 *    than simple bottom alignment, so a long conversation cannot push
 *    them off screen; plus the soft fade above it and two Deck-only
 *    spacing fixes noted inline.
 * 9. The "N earlier" pill that stands in for archived older turns, and
 *    the empty-conversation placeholder shown on a brand new chat.
 * 10. The row of saved chats above the conversation: the bumper pills,
 *     the current chat's name (including the marquee scroll for a name
 *     too long to fit), faint "ghost" previews of neighboring chats, the
 *     delete button, and the small dots marking every chat's position
 *     plus which ones are mid-answer or hold an unread reply.
 */
export function buildSection6Section(): string {
  return `
/* ==========================================================================
           6. GLASS PANELS & UI THEMING
           Applies frosted glass effects and borders to standard panels.
           ========================================================================== */
        .bonsai-scope .bonsai-glass-panel,
        .bonsai-scope .bonsai-preset-glass {
          -webkit-backdrop-filter: blur(10px);
          backdrop-filter: blur(10px);
          box-sizing: border-box;
        }

        .bonsai-scope .bonsai-glass-panel {
          background: rgba(18, 26, 34, 0.25) !important;
          border: 1px solid rgba(255, 255, 255, 0.07) !important;
        }

        @keyframes bonsai-ask-input-breathe {
          0%, 100% {
            border-color: var(--bonsai-ask-breathe-low, rgba(74, 222, 128, 0.28));
            box-shadow: 0 0 0 0 var(--bonsai-ask-glow-low, rgba(74, 222, 128, 0.05));
          }
          50% {
            border-color: var(--bonsai-ask-breathe-high, rgba(74, 222, 128, 0.72));
            box-shadow: 0 0 10px 2px var(--bonsai-ask-glow-high, rgba(74, 222, 128, 0.16));
          }
        }
        .bonsai-scope .bonsai-unified-input-host.bonsai-unified-input--asking.bonsai-glass-panel,
        .bonsai-scope .bonsai-unified-input-host.bonsai-unified-input--capturing.bonsai-glass-panel {
          animation: bonsai-ask-input-breathe 3.4s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .bonsai-scope .bonsai-unified-input-host.bonsai-unified-input--asking.bonsai-glass-panel,
          .bonsai-scope .bonsai-unified-input-host.bonsai-unified-input--capturing.bonsai-glass-panel {
            animation: none;
            border-color: var(--bonsai-ask-breathe-high, var(--bonsai-ask-mode-accent, #4ade80)) !important;
            box-shadow: 0 0 0 1px var(--bonsai-ask-glow-high, rgba(74, 222, 128, 0.2));
          }
        }

        /* Plan 60, board B, 2026-09-17: the chip should read as a pressable thing, not a flat
           label. A gradient (lighter at the top, darker at the bottom) plus a hairline on the top
           edge and a soft shadow underneath give it the "raised button" cue the flat 22 percent
           fill never had. The help chip and the agent chip below keep their own background and
           border for their own colour, but neither sets box-shadow, so this rule's hairline and
           shadow still reach them (D110, item 5) — they sit level with the other chips. */
        .bonsai-scope .bonsai-preset-glass {
          background: linear-gradient(180deg, rgba(56, 70, 84, 0.5) 0%, rgba(16, 22, 30, 0.55) 100%) !important;
          border: 1px solid rgba(255, 255, 255, 0.10) !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.10),
            0 2px 3px rgba(0, 0, 0, 0.4) !important;
        }

        .bonsai-scope button.bonsai-preset-help-chip.bonsai-preset-glass {
          background: linear-gradient(
            180deg,
            rgba(46, 135, 83, 0.28) 0%,
            rgba(18, 52, 34, 0.48) 100%
          ) !important;
          border: 1px solid var(--bonsai-ui-accent-main, rgba(46, 135, 83, 0.65)) !important;
          color: #dff5ea !important;
        }

        /* The agent chip keeps its own orange ring and glow, and gains the raised look with them
           (D110, item 5). The hairline and drop shadow from the rule above are written out again
           here because box-shadow replaces the whole list rather than adding to it. */
        .bonsai-scope button.bonsai-preset-glass.bonsai-pyro-inject-chip {
          border: 2px solid rgba(255, 107, 53, 0.92) !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.10),
            0 0 0 1px rgba(160, 45, 28, 0.5),
            0 0 12px rgba(255, 85, 40, 0.38),
            0 2px 3px rgba(0, 0, 0, 0.4) !important;
          background: rgba(38, 22, 18, 0.38) !important;
          color: #f0ddd6 !important;
        }

        /* Font size must match the real field's own text (UNIFIED_TEXT_FONT_PX, section-5.ts) --
           roadmap: "The blinking cursor in the question box does not line up with the placeholder
           text". This span used to hard-code 10px while the caret beside it inherits the overlay's
           12px, so the placeholder was measurably smaller than the caret it sits next to and the
           two could never line up. */
        .bonsai-scope .bonsai-unified-input-strategy-placeholder {
          font-style: italic;
          font-size: ${uiScalePx(UNIFIED_TEXT_FONT_PX)};
          opacity: 0.45;
        }

${buildAnswerMarkdownFormattingSection()}
        /*
          Main-tab AIM-style transcript: column shell + bubbles. Overrides broad PanelSectionRow
          child width where needed so player bubbles stay right-aligned (fit-content) without QAM bleed.
        */
        .bonsai-scope .bonsai-chat-main-column {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          box-sizing: border-box !important;
          margin-top: ${uiScalePx(BONSAI_CHAT_INPUT_TO_TRANSCRIPT_GAP_PX)} !important;
        }
        .bonsai-scope .bonsai-chat-status-line {
          margin-top: 8px !important;
          margin-bottom: 4px !important;
        }
        .bonsai-scope .bonsai-chat-transcript {
          display: flex !important;
          flex-direction: column !important;
          align-items: stretch !important;
          gap: 8px !important;
          min-width: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
          padding: 0 6px 0 4px !important;
        }
        .bonsai-scope .bonsai-chat-turn-row {
          display: flex !important;
          flex-direction: column !important;
          align-items: stretch !important;
          gap: 6px !important;
          min-width: 0 !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }
${buildQuestionBubbleSection()}
${buildAnswerBubbleSection()}
        .bonsai-scope button.bonsai-chat-next-message {
          display: block !important;
          width: fit-content !important;
          max-width: min(88%, 260px) !important;
          margin-left: auto !important;
          align-self: flex-end !important;
          padding: 6px 12px !important;
          border-radius: 10px !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          border: 1px solid rgba(110, 150, 200, 0.38) !important;
          background: linear-gradient(
            180deg,
            rgba(26, 42, 62, 0.82) 0%,
            rgba(18, 28, 42, 0.88) 100%
          ) !important;
          color: #c8daf0 !important;
        }
        .bonsai-scope button.bonsai-chat-secondary-btn,
        .bonsai-scope button.bonsai-chat-secondary-btn.DialogButton {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
          width: fit-content !important;
          min-height: 32px !important;
          padding: 6px 12px !important;
          border-radius: 8px !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          border: 1px solid rgba(110, 150, 200, 0.38) !important;
          background: linear-gradient(
            180deg,
            rgba(26, 42, 62, 0.82) 0%,
            rgba(18, 28, 42, 0.88) 100%
          ) !important;
          color: #c8daf0 !important;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06) !important;
        }
        .bonsai-scope button.bonsai-chat-secondary-btn > div,
        .bonsai-scope button.bonsai-chat-secondary-btn > span {
          display: inline-flex !important;
          align-items: center !important;
          gap: 8px !important;
          border: none !important;
          background: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          min-height: auto !important;
          width: auto !important;
          border-radius: 0 !important;
          font: inherit !important;
          color: inherit !important;
        }
        .bonsai-scope button.bonsai-chat-secondary-btn:disabled {
          opacity: 0.45 !important;
          cursor: default !important;
        }
        .bonsai-scope button.bonsai-chat-secondary-btn--selected {
          border-color: var(--bonsai-chat-ai-bubble-border, rgba(46, 135, 83, 0.55)) !important;
          color: #dce8f4 !important;
        }
        .bonsai-scope .bonsai-chat-reply-actions {
          margin-top: 10px !important;
          /* 92%, matching the answer bubble above it and the question bubble above that, so the
             details line below shares their left and right edge instead of sitting 4% inside them
             (design-language.md rule 3). Was 88%; the buttons are fit-content and left-aligned, so
             only the full-width line and the chip row's wrap point notice. */
          max-width: min(92%, 100%) !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: flex-start !important;
          gap: 8px !important;
        }
        .bonsai-scope .bonsai-chat-reply-actions-row {
          display: flex !important;
          flex-direction: row !important;
          flex-wrap: wrap !important;
          align-items: flex-start !important;
          gap: 8px !important;
          width: 100% !important;
        }
        .bonsai-scope .bonsai-chat-reply-actions-row--chips {
          flex-wrap: wrap;
          gap: 8px;
        }
        .bonsai-scope .bonsai-chat-reply-actions-row--utility {
          flex-wrap: nowrap !important;
        }
        .bonsai-scope .bonsai-chat-reply-actions-row--utility button.bonsai-chat-secondary-btn {
          flex: 0 1 auto !important;
          white-space: nowrap !important;
          max-width: none !important;
        }
        /*
         * Read aloud, at the right-hand end of the Helpful / Not really row (plan 62 section 3b) —
         * the full-width "Read aloud" line that used to sit here is gone. Styled the way the Ask
         * bar's own microphone is (MainTabUnifiedAskBar.tsx): no border, no fill, no radius, a bare
         * glyph. 45% strength at rest rather than the mic's 15% — the maintainer's call, because
         * this glyph shares a row with two visible buttons and still needs to read as findable.
         * The auto left margin pushes it to the row's right edge whether or not Helpful / Not
         * really are present next to it (an older turn can offer Read aloud with no thumbs at all).
         */
        .bonsai-scope button.bonsai-chat-secondary-btn.bonsai-chat-read-aloud-btn {
          margin-left: auto !important;
          flex: 0 0 auto !important;
          min-width: ${uiScalePx(30)} !important;
          width: ${uiScalePx(30)} !important;
          min-height: ${uiScalePx(32)} !important;
          padding: 0 !important;
          border: none !important;
          background: none !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          opacity: 0.45 !important;
        }
        /* Full strength the moment the D-pad ring lands on it — same white ring as Show details. */
        .bonsai-scope button.bonsai-chat-secondary-btn.bonsai-chat-read-aloud-btn.gpfocus,
        .bonsai-scope button.bonsai-chat-secondary-btn.bonsai-chat-read-aloud-btn:focus-visible {
          opacity: 1 !important;
          outline: 2px solid rgba(255, 255, 255, 0.9) !important;
          outline-offset: 2px !important;
          border-radius: 4px !important;
        }
        /* Speaking: red, the same shade the Ask bar's mic turns while recording. */
        .bonsai-scope button.bonsai-chat-secondary-btn.bonsai-chat-read-aloud-btn--speaking {
          color: #f87171 !important;
        }
        /*
         * Show details, as a line across the reply rather than a button in the row (D76).
         *
         * Same shape as the collapsed-history row above: a label centred on a hairline. The
         * difference is a rule on both sides. The hairline stays a raw 1px — hairlines do not
         * follow the UI scale (design-tokens.md).
         */
        .bonsai-scope .bonsai-chat-details-divider {
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
          gap: ${uiScalePx(8)} !important;
          width: 100% !important;
          box-sizing: border-box !important;
          margin: ${uiScalePx(4)} 0 ${uiScalePx(2)} !important;
          cursor: pointer !important;
          outline: none !important;
        }
        .bonsai-scope .bonsai-chat-details-divider-rule {
          flex: 1;
          height: 1px;
          background: rgba(255, 255, 255, 0.09);
        }
        .bonsai-scope .bonsai-chat-details-divider-label {
          font-size: ${uiScalePx(10)};
          font-weight: 600;
          letter-spacing: 0.04em;
          color: #9fb7d5;
          white-space: nowrap;
          padding: 0 ${uiScalePx(2)};
        }
        /*
         * Brightens when the D-pad ring is on it. Keyed off Steam's own focus class as well as
         * :focus-within, the way the Ask row's Clear button is — on the Deck you arrive here with
         * the D-pad, never a pointer, and :focus alone does not fire.
         */
        .bonsai-scope .bonsai-chat-details-divider.gpfocus .bonsai-chat-details-divider-label,
        .bonsai-scope .bonsai-chat-details-divider:focus-within .bonsai-chat-details-divider-label {
          color: #e8eef5;
        }
        .bonsai-scope .bonsai-chat-details-divider.gpfocus .bonsai-chat-details-divider-rule,
        .bonsai-scope .bonsai-chat-details-divider:focus-within .bonsai-chat-details-divider-rule {
          background: rgba(255, 255, 255, 0.28);
        }
        /* The standard white ring, never the character colour (design-tokens.md). */
        .bonsai-scope .bonsai-chat-details-divider.gpfocus,
        .bonsai-scope .bonsai-chat-details-divider:focus-visible {
          outline: 2px solid rgba(255, 255, 255, 0.9) !important;
          outline-offset: 2px !important;
          border-radius: 4px !important;
        }
        .bonsai-scope .bonsai-chat-details-divider--disabled {
          opacity: 0.45 !important;
          cursor: default !important;
        }
        /*
         * The model's own thinking while it works, where the stock waiting phrase used to be.
         *
         * Ordinary wrapping text, line breaks kept (the maintainer's call, 2026-09-24: "let it
         * display the thinking normally"; it was three one-line sentences cut with an ellipsis).
         * Small, dim and italic -- the maintainer's calls the same night: "dimmer, italics,
         * smaller font, then you can fit more lines", then "even smaller thinking font" -- so nine
         * 9px lines, spaced tight at the maintainer's third call ("the line spacing to be tighter"),
         * take 93px where six lines of 12px text took 101px (9 x 10.35px against 6 x 16.8px). The newest line sits at the bottom: flex-end pushes older lines up and out of
         * the top as the model writes, instead of pushing the newest down behind the question box
         * -- the visible chat above it is small on the built-in screen. The height is exactly nine
         * lines plus the padding, so no half line ever shows at the top. The block goes the moment
         * the answer starts.
         *
         * The left rule stays a raw 2px. It is a hairline, and hairlines do not follow the user's
         * UI scale (design-tokens.md).
         */
        .bonsai-scope .bonsai-chat-reasoning-live {
          display: flex !important;
          flex-direction: column !important;
          justify-content: flex-end !important;
          width: 100% !important;
          box-sizing: border-box !important;
          max-height: calc(9 * 1.15em + ${uiScalePx(4)}) !important;
          overflow: hidden !important;
          padding: ${uiScalePx(2)} ${uiScalePx(4)} ${uiScalePx(2)} ${uiScalePx(8)} !important;
          border-left: 2px solid rgba(159, 183, 213, 0.4) !important;
          margin-bottom: ${uiScalePx(8)} !important;
          min-width: 0 !important;
          font-size: ${uiScalePx(9)} !important;
          font-style: italic !important;
          line-height: 1.15 !important;
          color: rgba(180, 198, 217, 0.6) !important;
          white-space: pre-wrap !important;
          overflow-wrap: anywhere !important;
        }
        /*
         * The whole thinking, once the fold row above it has been opened. The answer chunk's own
         * dark surface, so it reads as a quieter neighbour of the answer rather than a second
         * answer. Line breaks are kept as the model wrote them, and nothing inside is masked.
         */
        .bonsai-scope .bonsai-chat-reasoning-block {
          width: 100% !important;
          box-sizing: border-box !important;
          background: rgba(18, 26, 34, 0.28) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: ${uiScalePx(6)} !important;
          padding: ${uiScalePx(8)} !important;
          margin-bottom: ${uiScalePx(6)} !important;
          font-size: ${uiScalePx(11)} !important;
          line-height: 1.4 !important;
          color: #9fb7d5 !important;
          white-space: pre-wrap !important;
          overflow-wrap: anywhere !important;
        }
        .bonsai-scope .bonsai-save-chat-desktop-row {
          margin-top: ${uiScalePx(BONSAI_CHAT_TRANSCRIPT_TO_SAVE_GAP_PX)} !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }
        @keyframes bonsai-thinking-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .bonsai-scope .bonsai-thinking-spinner {
          animation: bonsai-thinking-spin 0.9s linear infinite !important;
          transform-origin: center center !important;
        }
        .bonsai-scope .bonsai-context-footnote {
          margin-top: 4px !important;
        }
        .bonsai-scope .bonsai-chat-feedback-row__label {
          font-size: 11px !important;
          color: #9fb7d5 !important;
          line-height: 1.35 !important;
        }
        .bonsai-scope .bonsai-chat-feedback-row--rated {
          color: #8fa6bd !important;
          font-style: italic !important;
        }

        /*
          Main tab bottom dock. The column stretches to the scroll viewport's bottom edge
          (min-height measured by useMainTabColumnFill — the offset to the viewport crosses
          hashed Steam wrappers, so it cannot be a CSS constant) and the dock's margin-top: auto
          pins presets + Ask bar + context line to the bottom. With a long transcript the column
          outgrows the min-height and the dock scrolls in flow, exactly as before.
        */
        .bonsai-scope .bonsai-main-tab-column {
          display: flex;
          flex-direction: column;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
          min-height: var(--bonsai-main-column-min-height, auto);
        }
        /*
          Sticky, not merely bottom-aligned. margin-top: auto parks the dock at the bottom while
          the transcript is short, but a long one simply pushed it past the fold — measured
          2026-08-30 with a single answer on screen, scrollHeight 957 against a 667 viewport, so
          the Ask bar and the context line were both off screen. Sticking it to the scrollport's
          bottom edge keeps the input reachable no matter how long the thread grows, which is what
          the mocks draw.

          It needs its own surface because nothing above it is opaque: the scroll container, the
          scope and the QAM pane all compute to rgba(0,0,0,0) and the panel's colour comes from
          Steam's chrome further up, so without this the transcript would scroll through the dock.
        */
        .bonsai-scope .bonsai-main-tab-dock {
          display: flex;
          flex-direction: column;
          margin-top: auto;
          position: sticky;
          bottom: 0;
          z-index: 2;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
          background: rgba(18, 26, 34, 0.92);
          -webkit-backdrop-filter: blur(10px);
          backdrop-filter: blur(10px);
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }
        /*
          A short fade above the dock, so a reply that continues below it visibly passes UNDER the
          chips instead of being sliced off at a hard edge. The dock covers 245px of a 616px pane
          (measured 2026-08-30), which is a large share of the reading area to hide behind an edge
          that looks like the end of the text. The fade says "there is more, keep scrolling"
          without costing a row. The real cure is a shorter dock - see the vertical-space lane.

          Absolute against the dock, which is positioned (sticky), and bottom: 100% puts it just
          above the dock's own top edge rather than over its first row.
        */
        .bonsai-scope .bonsai-main-tab-dock::before {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          bottom: 100%;
          height: ${uiScalePx(18)};
          pointer-events: none;
          background: linear-gradient(180deg, rgba(18, 26, 34, 0) 0%, rgba(18, 26, 34, 0.85) 100%);
        }

        /*
          Steam's scroll container carries padding-bottom: 40px (measured on device 2026-08-30).
          Sticky pins to a scrollport's CONTENT box, not its padding box, so bottom: 0 parked the
          dock 40px short of the panel's bottom edge - leaving exactly the dead strip at the bottom
          that the dock was added to remove. Zeroing it costs no height (box-sizing is border-box,
          and the element's height is pinned by --bonsai-tab-body-height either way); the 40px moves
          from padding into the content box, so the transcript gets it.

          Scoped by :has to the one tab that deliberately owns its bottom edge. Every other tab
          keeps Steam's breathing room, because nothing has measured what removing it does there.
          Lifting it panel-wide belongs to the vertical-space goal as its own measured change, not
          as a side effect of this one.
        */
        .bonsai-scope .bonsai-decky-tabs-root [class*="TabContentsScroll"]:has(.bonsai-main-tab-dock) {
          padding-bottom: 0 !important;
        }
        /*
          Decky's PanelSection reserves 24px under itself. On a slot whose content overflows this
          is invisible - the dock is sticky and pins to the scrollport edge regardless. On the [+]
          slot, whose transcript is one line of placeholder, nothing overflows, so the dock sits at
          its flow position and that 24px showed as dead space under the context line: a gap that
          appeared on the new-chat screen and on no other. Measured on device 2026-08-30, 24px.
          Same treatment and same scope as the padding above - Main only, by way of the dock.
        */
        .bonsai-scope .bonsai-decky-tabs-root [class*="TabContentsScroll"] div:has(> .bonsai-main-tab-column) {
          margin-bottom: 0 !important;
        }

        /* Collapsed history: one "N earlier" pill standing in for the older archived turns. */
        .bonsai-scope .bonsai-chat-earlier-pill-row {
          display: flex;
          align-items: center;
          gap: ${uiScalePx(8)};
          opacity: 0.55;
          margin: ${uiScalePx(2)} 0 ${uiScalePx(6)};
        }
        .bonsai-scope .bonsai-chat-earlier-pill {
          font-size: ${uiScalePx(10)};
          font-weight: 600;
          letter-spacing: 0.04em;
          color: rgba(200, 214, 230, 0.85);
          padding: ${uiScalePx(3)} ${uiScalePx(10)};
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(18, 26, 34, 0.5);
          white-space: nowrap;
        }
        .bonsai-scope .bonsai-chat-earlier-rule {
          flex: 1;
          height: 1px;
          background: rgba(255, 255, 255, 0.09);
        }

        /* Empty slot / create-position preview, directly under the slot row. */
        .bonsai-scope .bonsai-chat-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: ${uiScalePx(8)};
          padding: ${uiScalePx(14)} 0 ${uiScalePx(6)};
        }
        .bonsai-scope .bonsai-chat-empty-logo {
          width: ${uiScalePx(52)};
          height: ${uiScalePx(52)};
          opacity: 0.16;
          filter: grayscale(1) brightness(1.7);
        }
        .bonsai-scope .bonsai-chat-empty-caption {
          font-style: italic;
          font-size: ${uiScalePx(13)};
          line-height: 1.55;
          max-width: ${uiScalePx(210)};
          text-align: center;
          color: rgba(143, 168, 196, 0.5);
        }

${buildSavedChatSlotsRowSection()}${buildSavedChatSlotDotsSection()}
        /*
         * Plan 62 3c: the "This answer / Session · N" tabs at the top of the newest answer's own
         * Show details panel. One real D-pad stop (the row itself), same as the chip ladder just
         * below it — Left/Right pick a tab, they never become two separate Focusables.
         *
         * The focus ring goes on the row, in the standard white (design-tokens.md "Focus rings");
         * which tab is selected is a separate, deliberately different cue (background fill, not a
         * colour ring) so the two questions -- "where is the D-pad ring" and "which tab is picked"
         * -- read as different facts, the same reasoning the chip ladder's own header comment gives
         * for not reusing the real focus ring as its active-chip cue.
         */
        .bonsai-scope .bonsai-details-tabs-row {
          outline: none;
          border-radius: 6px;
        }
        .bonsai-scope .bonsai-details-tabs-row.gpfocus,
        .bonsai-scope .bonsai-details-tabs-row:focus-visible {
          outline: 2px solid rgba(255, 255, 255, 0.9) !important;
          outline-offset: 2px !important;
        }
        .bonsai-scope .bonsai-details-tab {
          flex: 1 1 0;
          text-align: center;
          padding: ${uiScalePx(6)} ${uiScalePx(4)};
          border-radius: 6px;
          font-size: ${uiScalePx(10)};
          font-weight: 600;
          letter-spacing: 0.03em;
          color: #8fa8c4;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          cursor: pointer;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .bonsai-scope .bonsai-details-tab--active {
          color: #e2e8f0;
          background: rgba(156, 231, 255, 0.14);
          border-color: rgba(156, 231, 255, 0.4);
        }

        `;
}
