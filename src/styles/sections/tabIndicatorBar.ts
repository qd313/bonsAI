/**
 * Title: The plugin's own tab bar, at the very top of the screen
 *
 * Purpose: Styles the thin bar that replaced Steam's own tab strip: a
 * small row of dashes and the current tab's name, sitting at a fixed
 * height so nothing around it jumps when a person switches tabs. Also
 * styles the fuller strip that floats open over the top of it — showing
 * every tab as an icon and label — while that bar has the D-pad's focus.
 *
 *     at rest:        - - - -   ASK              LB  RB
 *     focused, open:  ┌─────────────────────────────────┐
 *                     │ [Ask] [Chats] [Settings] [...]   │
 *                     └─────────────────────────────────┘
 *
 * Used for: Folded into the plugin's one combined stylesheet by
 * bonsaiScopeStylesheet.ts, alongside the other numbered section files.
 *
 * Does not: Hide Steam's own original tab header — that is section-1.ts.
 * Does not hide the bar's own marks while something else has focus either
 * — that lives elsewhere. This file only draws the bar in its two states.
 */
import {
  TAB_BAR_CELL_GAP_PX,
  TAB_BAR_CELL_ICON_BOX_PX,
  TAB_BAR_CELL_PAD_X_PX,
  TAB_BAR_DASH_ACTIVE_EXTRA_H_PX,
  TAB_BAR_DASH_GAP_PX,
  TAB_BAR_DASH_H_PX,
  TAB_BAR_DASH_W_PX,
  TAB_BAR_LABEL_PX,
  TAB_BAR_NAME_PX,
  TAB_BAR_OPEN_HEIGHT_PX,
  TAB_BAR_REST_HEIGHT_PX,
  TAB_BAR_SHOULDER_MARK_PX,
  TAB_STRIP_BODY_GAP_PX,
} from "../../features/unified-input/constants";
import { uiScalePx } from "./uiScalePx";

/** The slot-row pill colour (section-6.ts), reused so the marks read as the same family of hint. */
const MARK_COLOR = "rgba(168, 182, 198, 0.62)";
const DASH_COLOR = "rgba(168, 182, 198, 0.35)";
/** The same character accent the active icon used to take; the fallback is the forest green default. */
const ACCENT = "var(--bonsai-ui-tab-focus-1, rgba(82, 216, 138, 0.92))";

/**
 * In: nothing — every value here is a fixed string or read from a CSS
 * variable that some other part of the plugin sets.
 * Out: a block of CSS text.
 * Can go wrong: this function itself cannot fail, but its rules lean on
 * exact specificity fights with other section files (noted inline) — a
 * change elsewhere that reorders the sections could quietly break one.
 *
 * 1. Locks the bar's height to one fixed size in every state, so the two
 *    hooks that measure "how much room does the tab area need" never see
 *    it change — the open strip below floats over the top instead of
 *    pushing anything down.
 * 2. Sets the small gap under the bar as a plain CSS value too, not only
 *    the one a hook writes inline — needed because changing the UI scale
 *    rebuilds the tab area and can leave the inline value stale.
 * 3. Lays out the bar itself: a row with the left/right shoulder-button
 *    marks at each end and the row of dashes in the middle.
 * 4. Styles the shoulder marks and the dashes, including which dash is
 *    lit up for the current tab.
 * 5. Turns off Steam's own focus ring on the bar — the open strip further
 *    down is what stands in for a ring here, showing exactly when the
 *    bar holds the D-pad's focus.
 * 6. Positions the open strip absolutely, in its own rule with a
 *    specificity carefully chosen to beat a conflicting reset elsewhere
 *    (explained inline) — without it the strip pushed the rest of the
 *    screen down instead of floating over it.
 * 7. Styles the open strip's look: fades in and out, and is not clickable
 *    or reachable by the D-pad while closed.
 * 8. Styles each tab cell inside the open strip (icon, label, and the
 *    highlighted look for whichever tab is current).
 * 9. Styles the current tab's name, shown at rest next to the dashes,
 *    capped to the same size as other small pill labels elsewhere in the
 *    plugin.
 */
export function buildTabIndicatorBarSection(): string {
  const activeDashH = TAB_BAR_DASH_H_PX + TAB_BAR_DASH_ACTIVE_EXTRA_H_PX;
  return `
/* ==========================================================================
           10. COLLAPSING TAB BAR (plan 30). Sits above .bonsai-decky-tabs-root in the scope's
           column; Steam's own header underneath is display:none (section 1). The wrapper is 20px in
           every state so the two height hooks never see it change — the open strip (W5) floats.
           ========================================================================== */
        /* The bar's height in its own (0,4,0) !important rule: section-3.ts sets every
           .Panel.Focusable to height: auto !important, and the bar became one in W4. Measured
           2026-09-02: the bar read 11px (its tallest child) from W4 until this rule. */
        .bonsai-scope .bonsai-tab-bar.Panel.Focusable {
          height: ${uiScalePx(TAB_BAR_REST_HEIGHT_PX)} !important;
          min-height: ${uiScalePx(TAB_BAR_REST_HEIGHT_PX)} !important;
          max-height: ${uiScalePx(TAB_BAR_REST_HEIGHT_PX)} !important;
        }
        /* The 4px gap under the bar as a stylesheet value, not only the inline one the hook writes:
           a UI-scale Apply remounts the tabs root and its inline --bonsai-tab-strip-reserve with it,
           and with no pointer moving (a controller) the hook never re-wrote it — measured 2026-09-02,
           the body started flush under the bar after Apply (TAB-BAR-10). Declared where the bar is
           mounted, so a scope without the bar keeps the measuring path's value. */
        .bonsai-scope:has(.bonsai-tab-bar) .bonsai-decky-tabs-root {
          --bonsai-tab-strip-reserve: ${uiScalePx(TAB_STRIP_BODY_GAP_PX)};
        }
        .bonsai-scope .bonsai-tab-bar {
          position: relative;
          flex: 0 0 auto;
          box-sizing: border-box;
          width: 100%;
          min-width: 0;
          height: ${uiScalePx(TAB_BAR_REST_HEIGHT_PX)};
          padding: 0 ${uiScalePx(8)};
          display: flex;
          align-items: center;
          gap: ${uiScalePx(10)};
          overflow: visible;
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
        /* Steam's own ring is suppressed on the bar's Focusable (design-tokens.md: no catch-all
           gpfocus rule — this one is scoped to the bar). The open strip below is what the ring
           looks like here: it shows exactly while the bar holds the ring. */
        .bonsai-scope .bonsai-tab-bar.gpfocus,
        .bonsai-scope .bonsai-tab-bar:focus,
        .bonsai-scope .bonsai-tab-bar:focus-visible {
          outline: none !important;
          box-shadow: none !important;
        }

        /* The open strip (plan 30 § 4.2): floats over the top of the panel, the wrapper stays 20px,
           so the height hooks never see a change. Opacity fades; visibility keeps a closed strip
           out of hit-testing; nothing animates height. */
        /* The placement lives in its own rule with a specificity of (0,5,1): section-3.ts resets
           every .Panel.Focusable > div child to position: relative !important at (0,3,1), and the
           strip is exactly that child. Measured 2026-09-02 twice: at (0,2,0) without !important
           the strip laid out in-flow (the bar grew to 54px, the body moved down 34px), and with
           !important alone the reset still won on specificity. */
        .bonsai-scope .bonsai-tab-bar.Panel.Focusable > div.bonsai-tab-bar__strip {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
        }
        .bonsai-scope .bonsai-tab-bar__strip {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          z-index: 3;
          box-sizing: border-box;
          height: ${uiScalePx(TAB_BAR_OPEN_HEIGHT_PX)};
          padding: 0 ${uiScalePx(6)};
          display: flex;
          align-items: center;
          gap: ${uiScalePx(TAB_BAR_CELL_GAP_PX)};
          overflow: hidden;
          background: linear-gradient(180deg, rgba(20, 28, 36, 0.98), rgba(12, 18, 24, 0.96));
          border-bottom: 1px solid rgba(156, 231, 255, 0.18);
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          transition: opacity 120ms ease-out, visibility 0s linear 120ms;
        }
        .bonsai-scope .bonsai-tab-bar__strip--open {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
          transition: opacity 120ms ease-out;
        }
        .bonsai-scope .bonsai-tab-bar__strip .bonsai-tab-bar__shoulder {
          flex: 0 0 auto;
        }
        .bonsai-scope .bonsai-tab-bar__strip .bonsai-tab-bar__shoulder--r {
          margin-left: auto;
        }
        .bonsai-scope .bonsai-tab-bar__cell {
          flex: 0 0 auto;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: ${uiScalePx(1)};
          min-width: ${uiScalePx(TAB_BAR_CELL_ICON_BOX_PX + 2 * TAB_BAR_CELL_PAD_X_PX)};
          height: ${uiScalePx(TAB_BAR_OPEN_HEIGHT_PX - 6)};
          padding: 0 ${uiScalePx(TAB_BAR_CELL_PAD_X_PX)};
          border-radius: ${uiScalePx(6)};
          color: rgba(168, 182, 198, 0.62);
          cursor: pointer;
        }
        /* Active cell: R5's own board 2b fill plus a 2px accent ring — our ring, not Steam's. */
        .bonsai-scope .bonsai-tab-bar__cell--active {
          background: rgba(255, 255, 255, 0.1);
          box-shadow: 0 0 0 ${uiScalePx(2)} ${ACCENT};
          color: var(--bonsai-ui-tab-active-icon, ${ACCENT});
        }
        .bonsai-scope .bonsai-tab-bar__cell-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: ${uiScalePx(TAB_BAR_CELL_ICON_BOX_PX)};
          height: ${uiScalePx(TAB_BAR_CELL_ICON_BOX_PX)};
          color: inherit;
        }
        .bonsai-scope .bonsai-tab-bar__cell-icon svg {
          display: block;
        }
        .bonsai-scope .bonsai-tab-bar__cell-label {
          font-size: ${uiScalePx(TAB_BAR_LABEL_PX)};
          line-height: 1;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          white-space: nowrap;
          color: rgba(168, 182, 198, 0.5);
        }
        .bonsai-scope .bonsai-tab-bar__cell--active .bonsai-tab-bar__cell-label {
          color: ${ACCENT};
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
