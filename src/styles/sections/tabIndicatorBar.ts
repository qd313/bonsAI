/**
 * Title: The plugin's own tab bar, at the very top of the screen
 *
 * Purpose: Styles the thin bar that replaced Steam's own tab strip: a
 * small row of dashes and the current tab's name, sitting at a fixed
 * height so nothing around it jumps when a person switches tabs, and the
 * white ring the whole bar wears while the D-pad's ring is on it.
 *
 *     - - - -   SETTINGS                           LB  RB
 *
 * Used for: Folded into the plugin's one combined stylesheet by
 * bonsaiScopeStylesheet.ts, alongside the other numbered section files.
 *
 * Does not: Hide Steam's own original tab header — that is section-1.ts.
 * Does not hide the bar's own marks while the chat-slot row has the ring
 * either — that is savedChatSlotsRow.ts. Draws nothing outside the bar's
 * own 20 points and fades nothing: the drop-down strip that used to float
 * over the chip row, and its fade, were deleted in plan 84 step 4.
 */
import {
  TAB_BAR_DASH_ACTIVE_EXTRA_H_PX,
  TAB_BAR_DASH_GAP_PX,
  TAB_BAR_DASH_H_PX,
  TAB_BAR_DASH_W_PX,
  TAB_BAR_HEIGHT_PX,
  TAB_BAR_NAME_PX,
  TAB_BAR_SHOULDER_MARK_PX,
  TAB_STRIP_BODY_GAP_PX,
} from "../../features/unified-input/constants";
import { uiScalePx } from "./uiScalePx";

/** The slot-row pill colour (section-6.ts), reused so the marks read as the same family of hint. */
const MARK_COLOR = "rgba(168, 182, 198, 0.62)";
const DASH_COLOR = "rgba(168, 182, 198, 0.35)";
/**
 * The lit tab's colour on the dash and the name: the character's colour, lifted just enough to
 * read on the dark bar, computed in characterUiAccent.ts. The fallback is the same hand-picked green
 * the design asks for.
 */
const ACCENT = "var(--bonsai-ui-tab-lit, #52d88a)";

/**
 * In: nothing — every value here is a fixed string or read from a CSS
 * variable that some other part of the plugin sets.
 * Out: a block of CSS text.
 * Can go wrong: this function itself cannot fail, but its height rule
 * leans on an exact specificity fight with section-3.ts (noted inline) —
 * a change there could quietly break it.
 *
 * 1. Locks the bar's height to one fixed size, so the two hooks that
 *    measure "how much room does the tab area need" never see it change.
 * 2. Sets the small gap under the bar as a plain CSS value too, not only
 *    the one a hook writes inline — needed because changing the UI scale
 *    rebuilds the tab area and can leave the inline value stale.
 * 3. Lays out the bar itself: a row with the left/right shoulder-button
 *    marks at each end and the row of dashes in the middle. The bar clips
 *    anything inside it to its own box, so no part of it can ever be
 *    drawn over the row below.
 * 4. Styles the shoulder marks and the dashes, including which dash is
 *    lit up for the current tab.
 * 5. Draws the ring on the whole bar while Steam's own ring marker is on
 *    it, and only then; plain browser focus alone draws nothing.
 * 6. Styles the current tab's name.
 */
export function buildTabIndicatorBarSection(): string {
  const activeDashH = TAB_BAR_DASH_H_PX + TAB_BAR_DASH_ACTIVE_EXTRA_H_PX;
  return `
/* ==========================================================================
           10. THE TAB BAR (plan 30, plan 84 step 4). Sits above .bonsai-decky-tabs-root in the
           scope's column; Steam's own header underneath is display:none (section 1). 20px tall,
           always: nothing opens from it and nothing inside it is drawn outside it.
           ========================================================================== */
        /* The bar's height in its own (0,4,0) !important rule: section-3.ts sets every
           .Panel.Focusable to height: auto !important, and the bar is one. Measured 2026-09-02: the
           bar read 11px (its tallest child) until this rule. */
        .bonsai-scope .bonsai-tab-bar.Panel.Focusable {
          height: ${uiScalePx(TAB_BAR_HEIGHT_PX)} !important;
          min-height: ${uiScalePx(TAB_BAR_HEIGHT_PX)} !important;
          max-height: ${uiScalePx(TAB_BAR_HEIGHT_PX)} !important;
        }
        /* The 4px gap under the bar as a stylesheet value, not only the inline one the hook writes:
           a UI-scale Apply remounts the tabs root and its inline --bonsai-tab-strip-reserve with it,
           and with no pointer moving (a controller) the hook never re-wrote it — measured 2026-09-02,
           the body started flush under the bar after Apply (TAB-BAR-10). Declared where the bar is
           mounted, so a scope without the bar keeps the measuring path's value. */
        .bonsai-scope:has(.bonsai-tab-bar) .bonsai-decky-tabs-root {
          --bonsai-tab-strip-reserve: ${uiScalePx(TAB_STRIP_BODY_GAP_PX)};
        }
        /* overflow: hidden is the guarantee behind TAB-BAR-GHOST-01 staying fixed: whatever is ever
           put inside the bar, none of it can be painted over the chip row below. */
        .bonsai-scope .bonsai-tab-bar {
          position: relative;
          flex: 0 0 auto;
          box-sizing: border-box;
          width: 100%;
          min-width: 0;
          height: ${uiScalePx(TAB_BAR_HEIGHT_PX)};
          padding: 0 ${uiScalePx(8)};
          display: flex;
          align-items: center;
          gap: ${uiScalePx(10)};
          overflow: hidden;
          user-select: none;
        }
        .bonsai-scope .bonsai-tab-bar__shoulder {
          flex: 0 0 auto;
          font-size: ${uiScalePx(TAB_BAR_SHOULDER_MARK_PX)};
          line-height: 1;
          font-weight: 700;
          letter-spacing: 0.06em;
          color: ${MARK_COLOR};
        }
        .bonsai-scope .bonsai-tab-bar__shoulder--r {
          margin-left: auto;
        }
        .bonsai-scope .bonsai-tab-bar__dashes {
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          gap: ${uiScalePx(TAB_BAR_DASH_GAP_PX)};
          height: ${uiScalePx(activeDashH)};
        }
        .bonsai-scope .bonsai-tab-bar__dash {
          display: inline-block;
          width: ${uiScalePx(TAB_BAR_DASH_W_PX)};
          height: ${uiScalePx(TAB_BAR_DASH_H_PX)};
          border-radius: ${uiScalePx(2)};
          background: ${DASH_COLOR};
        }
        .bonsai-scope .bonsai-tab-bar__dash--active {
          height: ${uiScalePx(activeDashH)};
          background: ${ACCENT};
        }
        /* Plain browser focus draws nothing (design-tokens.md: no catch-all ring rule — this one is
           scoped to the bar); a fake ring is worse than none (plan 78 measured the bar holding
           browser focus with no Steam ring anywhere). */
        .bonsai-scope .bonsai-tab-bar:focus,
        .bonsai-scope .bonsai-tab-bar:focus-visible {
          outline: none !important;
          box-shadow: none !important;
        }
        /* The ring on the bar (plan 84, drawing "Z", .deck.ring-tabs): the whole bar wears the white
           inset ring and a faint fill, keyed on Steam's own markers only. Inset, so the bar's own
           overflow: hidden never cuts it off. After the focus rule above, so it wins in any cascade. */
        .bonsai-scope .bonsai-tab-bar.gpfocus,
        .bonsai-scope .bonsai-tab-bar.gpfocuswithin {
          outline: none !important;
          box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.85) !important;
          background: rgba(255, 255, 255, 0.06);
          border-radius: ${uiScalePx(3)};
        }
        /* Caps at the size the slot-row bumper pills use; readable at rest is the whole requirement. */
        .bonsai-scope .bonsai-tab-bar__name {
          flex: 1 1 auto;
          min-width: 0;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          font-size: ${uiScalePx(TAB_BAR_NAME_PX)};
          line-height: 1;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: ${ACCENT};
        }
`;
}
