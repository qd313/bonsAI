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
 *                     │(LB) [i] [I] [i] [i] [i] [i] (RB) │
 *                     │         settings                 │
 *                     └─────────────────────────────────┘
 *     (six equal icon cells; only the current one, "I", also shows its name)
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
  TAB_BAR_CELL_HEIGHT_PX,
  TAB_BAR_CELL_ICON_PX,
  TAB_BAR_CELL_ICON_TOP_PX,
  TAB_BAR_CELL_NAME_PX,
  TAB_BAR_CELL_RADIUS_PX,
  TAB_BAR_DASH_ACTIVE_EXTRA_H_PX,
  TAB_BAR_DASH_GAP_PX,
  TAB_BAR_DASH_H_PX,
  TAB_BAR_DASH_W_PX,
  TAB_BAR_NAME_PX,
  TAB_BAR_OPEN_HEIGHT_PX,
  TAB_BAR_PILL_PAD_X_PX,
  TAB_BAR_PILL_PAD_Y_PX,
  TAB_BAR_REST_HEIGHT_PX,
  TAB_BAR_SHOULDER_MARK_PX,
  TAB_BAR_SLOT_W_PX,
  TAB_BAR_STRIP_PAD_X_PX,
  TAB_BAR_STRIP_PAD_Y_PX,
  TAB_BAR_SWITCH_FADE_MS,
  TAB_STRIP_BODY_GAP_PX,
} from "../../features/unified-input/constants";
import { uiScalePx } from "./uiScalePx";

/** The slot-row pill colour (section-6.ts), reused so the marks read as the same family of hint. */
const MARK_COLOR = "rgba(168, 182, 198, 0.62)";
const DASH_COLOR = "rgba(168, 182, 198, 0.35)";
/**
 * The lit tab's colour, on the thin bar's dash/name and the strip's lit cell alike (plan 59 W3's
 * second half): the character's colour, lifted just enough to read on the dark bar, computed in
 * characterUiAccent.ts. The fallback is the same hand-picked green the design asks for.
 */
const ACCENT = "var(--bonsai-ui-tab-lit, #52d88a)";

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
 * 7. Styles the open strip's look (plan 59): a solid bar with a bottom
 *    line and a soft shadow under it, fading in and out, and not
 *    clickable or reachable by the D-pad while closed.
 * 8. Styles the LB/RB pills in their fixed slots and each tab cell inside
 *    the strip: one shared icon size and position in every cell, a soft
 *    fill on whichever cell is current, and that cell's name fading in
 *    under its icon while every other cell's stays hidden.
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
        /* Plan 59: a solid bar (no gradient) with a bottom line and a shadow instead of the old
           translucent look. The content box works out to 55px (66 minus the 1px bottom line minus
           the 10px of top/bottom padding); the 44px cells sit centred in it by align-items: center,
           about 5.5px of empty space above and below, exactly as the chosen mockup drew them (the
           board's own drawing was a 54px bar with a 43px content box; the cells themselves did not
           change). TAB_BAR_STRIP_BG_HEX is not in constants.ts yet (Lane B's token, plan 59 W3) —
           #141c24 is the same colour written as a literal; the landing reconciles the two. */
        .bonsai-scope .bonsai-tab-bar__strip {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          z-index: 3;
          box-sizing: border-box;
          height: ${uiScalePx(TAB_BAR_OPEN_HEIGHT_PX)};
          padding: ${uiScalePx(TAB_BAR_STRIP_PAD_Y_PX)} ${uiScalePx(TAB_BAR_STRIP_PAD_X_PX)};
          display: flex;
          align-items: center;
          gap: ${uiScalePx(TAB_BAR_CELL_GAP_PX)};
          overflow: hidden;
          background: #141c24; /* = TAB_BAR_STRIP_BG_HEX (Lane B's token); the landing reconciles */
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.45);
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
        /* LB/RB sit in a fixed-width slot so the cells never shift when the pill hides (section
           6.ts hides .bonsai-tab-bar__shoulder by visibility while the chat-slot row has the
           ring; that class stays on the pill inside the slot so the same rule still reaches it). */
        .bonsai-scope .bonsai-tab-bar__slot {
          flex: 0 0 auto;
          width: ${uiScalePx(TAB_BAR_SLOT_W_PX)};
          display: flex;
          justify-content: center;
        }
        /* Reuses the chat-slot row's own bumper-pill values (section 6.ts) so the two hints read as
           one family. Ordered after the plain .bonsai-tab-bar__shoulder rule above (same
           specificity), so this rule's colour and letter-spacing win on the strip's own pills; the
           thin bar's own LB/RB marks, which carry only the older class, are untouched. */
        .bonsai-scope .bonsai-tab-bar__pill {
          font-size: ${uiScalePx(TAB_BAR_SHOULDER_MARK_PX)};
          font-weight: 700;
          line-height: 1;
          letter-spacing: 0;
          padding: ${uiScalePx(TAB_BAR_PILL_PAD_Y_PX)} ${uiScalePx(TAB_BAR_PILL_PAD_X_PX)};
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          color: #8fa8c4;
        }
        .bonsai-scope .bonsai-tab-bar__cell {
          flex: 1 1 0;
          min-width: 0;
          box-sizing: border-box;
          height: ${uiScalePx(TAB_BAR_CELL_HEIGHT_PX)};
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding: ${uiScalePx(TAB_BAR_CELL_ICON_TOP_PX)} 0 0;
          gap: ${uiScalePx(2)};
          border-radius: ${uiScalePx(TAB_BAR_CELL_RADIUS_PX)};
          background: transparent;
          color: rgba(168, 182, 198, 0.62);
          cursor: pointer;
          transition: background-color ${TAB_BAR_SWITCH_FADE_MS}ms ease-out;
        }
        /* Active cell: a soft fill only, no ring and no underline (plan 59 § 3 item 6). */
        .bonsai-scope .bonsai-tab-bar__cell--active {
          background: rgba(255, 255, 255, 0.08);
          color: ${ACCENT};
        }
        .bonsai-scope .bonsai-tab-bar__cell-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: ${uiScalePx(TAB_BAR_CELL_ICON_PX)};
          height: ${uiScalePx(TAB_BAR_CELL_ICON_PX)};
          overflow: visible; /* the bug's 26px shell, centred in this 22px box, overhangs 2px top and
                                 bottom on purpose -- the board's "26 with -2px margins". */
          color: inherit;
        }
        .bonsai-scope .bonsai-tab-bar__cell-icon svg {
          display: block;
        }
        /* Present in every cell's markup, faded by opacity, never added or removed (plan 59 § 5):
           the fade-out needs the old name still there, and the icon then sits at one height in
           every cell with no per-cell measuring. May overhang its cell by a couple of pixels at six
           tabs (design-language Rule 4 tolerance) -- no overflow clipping here on purpose. */
        .bonsai-scope .bonsai-tab-bar__cell-name {
          font-size: ${uiScalePx(TAB_BAR_CELL_NAME_PX)};
          line-height: 1;
          font-weight: 700;
          letter-spacing: 0;
          /* Synthetic small caps (Steam's font likely has none of its own). D109 item 4's fallback,
             if these read too small on the Deck, is to replace this one line with
             text-transform: uppercase; at the same size -- decided by eye on the device. */
          font-variant: small-caps;
          white-space: nowrap;
          opacity: 0;
          color: ${ACCENT};
          transition: opacity ${TAB_BAR_SWITCH_FADE_MS}ms ease-out, color ${TAB_BAR_SWITCH_FADE_MS}ms ease-out;
        }
        .bonsai-scope .bonsai-tab-bar__cell--active .bonsai-tab-bar__cell-name {
          opacity: 1;
        }
        /* Reduced motion: a state change, not movement, for the switch fade above -- scoped to
           these two selectors only, the same pattern as section-4.ts's own reduced-motion block. */
        @media (prefers-reduced-motion: reduce) {
          .bonsai-scope .bonsai-tab-bar__cell,
          .bonsai-scope .bonsai-tab-bar__cell-name {
            transition: none;
          }
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
