/**
 * Title: The question typing box itself
 *
 * Purpose: Styles the actual field a person types their question into.
 * The real native field is made invisible on purpose — its text is drawn
 * by a separate overlay on top, which is how the plugin gets a custom
 * blinking caret and (when the AI-character feature is on) a small avatar
 * beside the text. This file makes sure the invisible field and the
 * overlay drawn on top of it line up exactly.
 *
 *     ┌─ Ask box ──────────────────────────────┐
 *     │ 🙂 What should I upgrade first? |       │  <- overlay text + caret
 *     │    (real field is invisible, same spot) │  <- this file's job
 *     └──────────────────────────────────────────┘
 *
 * Used for: Folded into the plugin's one combined stylesheet by
 * bonsaiScopeStylesheet.ts, alongside the other numbered section files.
 *
 * Does not: Style the icon row below the box, or the Ask button — see
 * section-8.ts for those.
 *
 * Gotchas: The overlay's padding and font have to match the real field's
 * exactly — a mismatch wraps a long line one character sooner than the
 * real field does, and the caret drifts off the text it is supposed to
 * sit on. Another part of the plugin measures the real field on screen and
 * writes what it finds into CSS variables the overlay reads; the plain
 * numbers in this file are only the fallback used before that first
 * measurement has run.
 */
import {
  UNIFIED_CARET_GAP_PX,
  UNIFIED_CARET_WIDTH_PX,
  UNIFIED_TEXT_FONT_PX,
  UNIFIED_TEXT_INSET_BOTTOM_PX,
  UNIFIED_TEXT_INSET_LEFT_PX,
  UNIFIED_TEXT_INSET_RIGHT_PX,
  UNIFIED_TEXT_INSET_TOP_PX,
  UNIFIED_TEXT_LINE_HEIGHT,
  UNIFIED_TEXT_OVERLAY_FALLBACK_FONT_FAMILY,
  UNIFIED_TEXT_OVERLAY_FALLBACK_OVERFLOW_WRAP,
  UNIFIED_TEXT_OVERLAY_FALLBACK_WHITE_SPACE,
} from "../../features/unified-input/constants";
import { uiScalePx } from "./uiScalePx";

/**
 * In: nothing.
 * Out: a block of CSS text.
 * Can go wrong: nothing — this always returns the same fixed string.
 */
export function buildSection5Section(): string {
  return `
/* ==========================================================================
           5. UNIFIED INPUT FIELD & TEXT AREA STYLING
           Aggressively strips native styling from inputs so we can draw custom carets/overlays.
           ========================================================================== */
        /*
          Decky renders TextField inside a .Panel.Focusable wrapper (plus an inner div) that does
          not inherit our host width — the "wrappers diverge from host width" note the measuring in
          useUnifiedInputSurface was originally written around. Unwidened, the typing surface is
          narrower than the glass card holding it. The Ask row already forces the same wrapper to
          100% (section-4); this is the matching rule for the input host, which never had one.

          Scoped by :has(textarea) / :has(input) on purpose: the ask-mode and attach popovers are
          also .Panel.Focusable inside this host, contain no field, and must keep their own width.
        */
        .bonsai-scope .bonsai-unified-input-host .Panel.Focusable:has(textarea),
        .bonsai-scope .bonsai-unified-input-host .Panel.Focusable:has(input),
        .bonsai-scope .bonsai-unified-input-host .Panel.Focusable:has(textarea) > div,
        .bonsai-scope .bonsai-unified-input-host .Panel.Focusable:has(input) > div {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          box-sizing: border-box !important;
        }

        /*
          Same declarations without :has(), so the fix does not depend on it. An unsupported :has()
          invalidates the whole selector list above and CEF drops that rule silently.

          These reach the wrapper by position instead: direct child of the field layer (plain
          layout) or of .bonsai-unified-input-text-box (AI character layout). The popovers are
          excluded either way — .bonsai-ask-mode-menu-floater / .bonsai-attach-menu-floater are the
          direct children there, and their own .Panel.Focusable sits a level deeper inside them.
        */
        .bonsai-scope .bonsai-unified-input-host > div > .Panel.Focusable,
        .bonsai-scope .bonsai-unified-input-host > div > .Panel.Focusable > div,
        .bonsai-scope .bonsai-unified-input-text-box > .Panel.Focusable,
        .bonsai-scope .bonsai-unified-input-text-box > .Panel.Focusable > div {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          box-sizing: border-box !important;
        }

        .bonsai-scope .bonsai-unified-input-host input,
        .bonsai-scope .bonsai-unified-input-host textarea {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          color: transparent !important;
          -webkit-text-fill-color: transparent !important;
          margin: 0 !important;
          padding: ${uiScalePx(UNIFIED_TEXT_INSET_TOP_PX)} ${uiScalePx(UNIFIED_TEXT_INSET_RIGHT_PX)} ${uiScalePx(UNIFIED_TEXT_INSET_BOTTOM_PX)} ${uiScalePx(UNIFIED_TEXT_INSET_LEFT_PX)} !important;
          text-indent: 0 !important;
          box-sizing: border-box !important;
          font-size: ${uiScalePx(UNIFIED_TEXT_FONT_PX)} !important;
          line-height: ${UNIFIED_TEXT_LINE_HEIGHT} !important;
          vertical-align: top !important;
        }

        /*
          The mirrors must copy the field's own wrapping and font stack, never declare their own
          (roadmap: "The question overlay sits a few pixels off the native text field") -- a
          mismatch here wraps a long line one character sooner than the real field does and drifts
          the caret/typed-text overlay off it. useUnifiedInputSurface.ts reads the live field's
          computed style on every measure pass and writes these three custom properties; the
          fallbacks below (matching the constants of the same name) only apply before that first
          pass has run.
        */
        .bonsai-scope .bonsai-unified-input-host .bonsai-unified-input-measure,
        .bonsai-scope .bonsai-unified-input-host .bonsai-unified-input-text-overlay {
          padding: ${uiScalePx(UNIFIED_TEXT_INSET_TOP_PX)} ${uiScalePx(UNIFIED_TEXT_INSET_RIGHT_PX)} ${uiScalePx(UNIFIED_TEXT_INSET_BOTTOM_PX)} ${uiScalePx(UNIFIED_TEXT_INSET_LEFT_PX)} !important;
          box-sizing: border-box !important;
          white-space: var(--bonsai-unified-field-white-space, ${UNIFIED_TEXT_OVERLAY_FALLBACK_WHITE_SPACE}) !important;
          overflow-wrap: var(--bonsai-unified-field-overflow-wrap, ${UNIFIED_TEXT_OVERLAY_FALLBACK_OVERFLOW_WRAP}) !important;
          font-family: var(--bonsai-unified-field-font-family, ${UNIFIED_TEXT_OVERLAY_FALLBACK_FONT_FAMILY}) !important;
        }

        .bonsai-scope .bonsai-unified-input-host.bonsai-unified-input--ai-character {
          overflow: hidden !important;
        }

        /* Avatar sits in a flex column beside the text box — not inside the field — so the native caret aligns with typed text. */
        .bonsai-scope .bonsai-unified-input-text-row {
          display: flex;
          flex-direction: row;
          align-items: flex-start;
          width: 100%;
          box-sizing: border-box;
        }
        .bonsai-scope .bonsai-ai-character-avatar-slot {
          position: relative;
          flex: 0 0 auto;
          width: 18px;
          height: 18px;
          margin: 2px 4px 0 2px;
          z-index: 6;
        }
        .bonsai-scope .bonsai-unified-input-text-box {
          position: relative;
          flex: 1 1 auto;
          min-width: 0;
          width: 100%;
          box-sizing: border-box;
        }

        .bonsai-scope .bonsai-ai-character-avatar {
          outline: none;
          margin: 0 !important;
          padding: 0 !important;
          box-sizing: border-box !important;
          opacity: 0.85 !important;
          overflow: hidden !important;
        }

        /* Matches the overlay span in section-6 (.bonsai-unified-input-strategy-placeholder):
           the field has two placeholder render paths and they have to read the same. */
        .bonsai-scope .bonsai-unified-input-host input::placeholder,
        .bonsai-scope .bonsai-unified-input-host textarea::placeholder {
          font-size: ${uiScalePx(UNIFIED_TEXT_FONT_PX)} !important;
          font-style: italic !important;
          color: rgba(200, 214, 230, 0.45) !important;
        }

        /* Hide standard field labels to allow custom overlays */
        .bonsai-scope .bonsai-unified-input-host [class*="FieldLabel"],
        .bonsai-scope .bonsai-unified-input-host [class*="fieldlabel"] {
          display: none !important;
          height: 0 !important;
          min-height: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
        }

        /* Position the fake text overlay to perfectly cover the invisible actual input */
        .bonsai-scope .bonsai-unified-input-text-overlay {
          margin: 0 !important;
          box-sizing: border-box !important;
          left: var(--bonsai-unified-field-left, 0px) !important;
          top: var(--bonsai-unified-field-top, 0px) !important;
          right: auto !important;
          width: var(--bonsai-unified-field-width, 100%) !important;
        }

        /*
         * The blinking cursor. The real field underneath is invisible, so the cursor is drawn: a
         * thin bar that sits IN the line of text, never at a fixed spot in the box. Whatever
         * places the text -- the field's padding, the text size, the line height, the UI scale --
         * places the cursor too, so a later change to any of them cannot leave it behind.
         *
         * It came loose exactly that way, more than once (roadmap bug, 2026-09-24). On the empty
         * box it was pinned to the overlay's corner (position absolute, left 0, top 0), which is
         * outside the overlay's 8px/6px padding, while the hint text starts inside it: measured on
         * the Deck, 5px left of the "D" and 4px above it. The fix before that matched font sizes,
         * and the check that closed it compared sizes, not positions, so it could not see this.
         *
         * It takes no room -- the negative right margin cancels its own width -- so nothing
         * beside it shifts or re-wraps when it appears or blinks, and the drawn text keeps
         * wrapping exactly where the real field underneath wraps. The em height is the fallback
         * for a runtime without the lh unit.
         */
        .bonsai-scope .bonsai-unified-input-fake-caret {
          display: inline-block;
          width: ${UNIFIED_CARET_WIDTH_PX}px;
          height: ${UNIFIED_TEXT_LINE_HEIGHT}em;
          height: 1lh;
          margin: 0 -${UNIFIED_CARET_WIDTH_PX}px 0 0;
          vertical-align: top;
          background: currentColor;
          opacity: 0.9;
          transform: translateX(${UNIFIED_CARET_GAP_PX}px);
          animation: bonsai-caret-blink 1s step-end infinite;
        }

        /* Before the empty box's hint: its right edge the same half pixel clear of the "D". */
        .bonsai-scope .bonsai-unified-input-fake-caret--before-hint {
          transform: translateX(calc(-100% - ${UNIFIED_CARET_GAP_PX}px));
        }
        @keyframes bonsai-caret-blink {
          0%, 45% { opacity: 0.9; }
          50%, 100% { opacity: 0; }
        }

        `;
}
