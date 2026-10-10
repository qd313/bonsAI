/**
 * Title: The plugin's own tab bar, at the very top of the screen
 *
 * Purpose: Styles the thin bar that replaced Steam's own tab strip, as
 * plan 84's design "T3" with plan 87 F4's fixed order: one 20-point row of
 * three columns, LB, the tabs and RB. The tabs are all drawn, always in the
 * strip's own order (Main far left, About far right, never wrapping round):
 * the current tab's icon and name sit at its own place in the row and every
 * other tab is a small dimmed icon, 18 points wide at the least. LB and RB
 * marks sit 16 points in from each edge, dim until the ring is on the bar.
 * While the D-pad's ring is on it, the whole bar wears a white inset ring.
 *
 *     LB  [Main]  [i]  [i]  [i]  [i]  [i]  RB        (on Main, the name beside its icon)
 *     LB  [i]  [i]  [SETTINGS]  [i]  [i]  [i]  RB    (on Settings)
 *
 * Used for: Folded into the plugin's one combined stylesheet by
 * bonsaiScopeStylesheet.ts, alongside the other numbered section files
 * (`buildTabIndicatorBarSection`). The bar's own rules are also built for
 * bonsAI's title view in Decky's bar (`buildTabBarRules`), where plan 84
 * step 6 draws the bar in the strip at the very top: that view sits
 * outside bonsAI's box, so the box's stylesheet does not reach it.
 *
 * Does not: Hide Steam's own original tab header — that is section-1.ts.
 * Draws nothing outside the bar's own 20 points and fades nothing: the drop-down strip that used to float
 * over the chip row, and its fade, were deleted in plan 84 step 4.
 */
import {
  TAB_BAR_COLUMN_GAP_PX,
  TAB_BAR_CURRENT_ICON_GAP_PX,
  TAB_BAR_CURRENT_ICON_PX,
  TAB_BAR_CURRENT_PAD_X_PX,
  TAB_BAR_EDGE_PAD_PX,
  TAB_BAR_HEIGHT_PX,
  TAB_BAR_NAME_PX,
  TAB_BAR_SHOULDER_DIM_OPACITY,
  TAB_BAR_SHOULDER_MARK_PX,
  TAB_BAR_SHOULDER_REACH_PX,
  TAB_BAR_SHOULDER_W_PX,
  TAB_BAR_SIDE_ICON_GAP_PX,
  TAB_BAR_SIDE_ICON_PX,
  TAB_STRIP_BODY_GAP_PX,
} from "../../features/unified-input/constants";
import { uiScalePx } from "./uiScalePx";

/** The dim colour of the LB and RB marks, the same grey-blue family as the other hint pills. */
const MARK_COLOR = "rgba(168, 182, 198, 0.62)";
/** LB and RB at full strength, while the ring is on the bar (the drawing's `.deck.dimkeys.ring-tabs`). */
const MARK_LIT_COLOR = "#eef3f8";
/** The other tabs' icons (the drawing's `.bal-t3 .side svg`). */
const SIDE_ICON_COLOR = "rgba(168, 182, 198, 0.55)";
/**
 * The current tab's colour, on its icon and name: the character's colour, lifted just enough to read
 * on the dark bar, computed in characterUiAccent.ts. The fallback is the same hand-picked green the
 * design asks for.
 */
const ACCENT = "var(--bonsai-ui-tab-lit, #52d88a)";

/**
 * In: nothing — every value here is a fixed string or read from a CSS
 * variable that some other part of the plugin sets.
 * Out: a block of CSS text.
 * Can go wrong: this function itself cannot fail, but its height rule
 * leans on an exact specificity fight with section-3.ts (noted inline),
 * and the row only fits while the other tabs' icons stay 18 wide and the
 * longest name stays under what the Deck's 300 points leave for it
 * (about 130 wide at the very most; 116 measured on Permissions).
 *
 * 1. Locks the bar's height to one fixed size, so the two hooks that
 *    measure "how much room does the tab area need" never see it change.
 * 2. Sets the small gap under the bar as a plain CSS value too, not only
 *    the one a hook writes inline — needed because changing the UI scale
 *    rebuilds the tab area and can leave the inline value stale.
 * 3. Lays the bar out as a three-column grid: LB, the tabs, RB. The tabs
 *    column takes what is left and spreads its items from one end to the
 *    other, so the first tab is flush after LB and the last flush before
 *    RB. The bar clips anything inside it to its own box, so no part of it
 *    can ever be drawn over the row below.
 * 4. Styles LB and RB: one fixed width each, dim, with a tap target that
 *    reaches into the bar's edge padding without moving anything.
 * 5. Styles the other tabs' icons: each its own tap target, a fixed width
 *    that never shrinks, so six tabs on the Deck's 300 points never crush
 *    an icon (plan 87 F4; the old bar shrank them to 15 on Permissions).
 * 6. Styles the current tab: its icon then its name, as one item at the
 *    tab's own place in the row; its width follows the name.
 * 7. Draws the ring on the whole bar, and lights LB and RB, while Steam's
 *    own ring marker is on it, and only then; plain browser focus alone
 *    draws nothing.
 */
export function buildTabIndicatorBarSection(): string {
  return `
/* ==========================================================================
           10. THE TAB BAR (plan 30; plan 84 step 4, design "T3"). Sits above .bonsai-decky-tabs-root
           in the scope's column; Steam's own header underneath is display:none (section 1). 20px
           tall, always: nothing opens from it and nothing inside it is drawn outside it.
           ========================================================================== */
        /* The 4px gap under the bar as a stylesheet value, not only the inline one the hook writes:
           a UI-scale Apply remounts the tabs root and its inline --bonsai-tab-strip-reserve with it,
           and with no pointer moving (a controller) the hook never re-wrote it — measured 2026-09-02,
           the body started flush under the bar after Apply (TAB-BAR-10). Declared where the bar is
           mounted, so a scope without the bar keeps the measuring path's value. */
        .bonsai-scope:has(.bonsai-tab-bar) .bonsai-decky-tabs-root {
          --bonsai-tab-strip-reserve: ${uiScalePx(TAB_STRIP_BODY_GAP_PX)};
        }
${buildTabBarRules(".bonsai-scope")}`;
}

/**
 * In: the root class every rule is scoped under (`.bonsai-scope` for bonsAI's own box,
 * `.bonsai-chat-title` for bonsAI's title view in Decky's bar).
 * Out: the bar's own rules, numbered as in the list above (1 and 3 to 7).
 */
export function buildTabBarRules(root: string): string {
  const halfColumnGap = TAB_BAR_COLUMN_GAP_PX / 2;
  return `
        /* The bar's height in its own (0,4,0) !important rule: section-3.ts sets every
           .Panel.Focusable to height: auto !important, and the bar is one. Measured 2026-09-02: the
           bar read 11px (its tallest child) until this rule. */
        ${root} .bonsai-tab-bar.Panel.Focusable {
          height: ${uiScalePx(TAB_BAR_HEIGHT_PX)} !important;
          min-height: ${uiScalePx(TAB_BAR_HEIGHT_PX)} !important;
          max-height: ${uiScalePx(TAB_BAR_HEIGHT_PX)} !important;
        }
        /* Three columns (plan 87 F4): LB, the tabs (minmax(0, 1fr), so it takes whatever LB and RB
           leave) and RB, with the bar's 16-point edge padding (the drawing's .edge16). Items stretch
           to the full 20 points so every tap target is the bar's height.
           overflow: hidden is the guarantee behind TAB-BAR-GHOST-01 staying fixed: whatever is ever
           put inside the bar, none of it can be painted over the chip row below. */
        ${root} .bonsai-tab-bar {
          position: relative;
          flex: 0 0 auto;
          box-sizing: border-box;
          width: 100%;
          min-width: 0;
          height: ${uiScalePx(TAB_BAR_HEIGHT_PX)};
          padding-top: 0;
          padding-bottom: 0;
          padding-left: ${uiScalePx(TAB_BAR_EDGE_PAD_PX)};
          padding-right: ${uiScalePx(TAB_BAR_EDGE_PAD_PX)};
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: stretch;
          column-gap: ${uiScalePx(TAB_BAR_COLUMN_GAP_PX)};
          overflow: hidden;
          user-select: none;
        }
        /* LB and RB: the same fixed width, so the two sides come out equal; the mark's own text sits
           on the bar's 16-point edge. The tap target reaches 12 points out into the edge padding and
           half the column gap in, with negative margins taking the same room back, so nothing moves. */
        ${root} .bonsai-tab-bar__shoulder {
          box-sizing: content-box;
          width: ${uiScalePx(TAB_BAR_SHOULDER_W_PX)};
          display: flex;
          align-items: center;
          font-size: ${uiScalePx(TAB_BAR_SHOULDER_MARK_PX)};
          line-height: 1;
          font-weight: 800;
          letter-spacing: 0.06em;
          white-space: nowrap;
          color: ${MARK_COLOR};
          opacity: ${TAB_BAR_SHOULDER_DIM_OPACITY};
          cursor: pointer;
        }
        ${root} .bonsai-tab-bar__shoulder--l {
          justify-content: flex-start;
          padding-left: ${uiScalePx(TAB_BAR_SHOULDER_REACH_PX)};
          margin-left: ${uiScalePx(-TAB_BAR_SHOULDER_REACH_PX)};
          padding-right: ${uiScalePx(halfColumnGap)};
          margin-right: ${uiScalePx(-halfColumnGap)};
        }
        ${root} .bonsai-tab-bar__shoulder--r {
          justify-content: flex-end;
          padding-right: ${uiScalePx(TAB_BAR_SHOULDER_REACH_PX)};
          margin-right: ${uiScalePx(-TAB_BAR_SHOULDER_REACH_PX)};
          padding-left: ${uiScalePx(halfColumnGap)};
          margin-left: ${uiScalePx(-halfColumnGap)};
        }
        /* The tabs, in the strip's own order, spread from one end to the other (plan 87 F4): the first
           one flush after LB, the last flush before RB, the spare room shared out between them. Nothing
           wraps and nothing shrinks: with the longest name at six tabs the row is still narrower than
           the room between LB and RB (measured on the Deck, 2026-10-09), and if it ever were not, the
           bar's overflow: hidden clips the end rather than crushing an icon. */
        ${root} .bonsai-tab-bar__tabs {
          display: flex;
          flex-wrap: nowrap;
          align-items: stretch;
          justify-content: space-between;
          min-width: 0;
        }
        /* Each other tab: its icon in its own tap target, an icon plus a gap wide, never narrower. */
        ${root} .bonsai-tab-bar__peek {
          flex: 0 0 ${uiScalePx(TAB_BAR_SIDE_ICON_PX + TAB_BAR_SIDE_ICON_GAP_PX)};
          min-width: ${uiScalePx(TAB_BAR_SIDE_ICON_PX + TAB_BAR_SIDE_ICON_GAP_PX)};
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${SIDE_ICON_COLOR};
          cursor: pointer;
        }
        /* The current tab: its icon then its name, as one item at its own place in the row. The
           name carries 0.1em of padding on its left to match the letter-spacing every letter, the
           last included, carries on its right, so the name's own box is centred on its letters. */
        ${root} .bonsai-tab-bar__current {
          flex: none;
          display: flex;
          align-items: center;
          min-width: 0;
          padding-left: ${uiScalePx(TAB_BAR_CURRENT_PAD_X_PX)};
          padding-right: ${uiScalePx(TAB_BAR_CURRENT_PAD_X_PX)};
          white-space: nowrap;
          color: ${ACCENT};
        }
        ${root} .bonsai-tab-bar__current-icon {
          flex: none;
          width: ${uiScalePx(TAB_BAR_CURRENT_ICON_PX)};
          height: ${uiScalePx(TAB_BAR_CURRENT_ICON_PX)};
          margin-right: ${uiScalePx(TAB_BAR_CURRENT_ICON_GAP_PX)};
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: visible; /* the bug is drawn 14 in this 12 box, as the strip drew it 26 in 22 */
        }
        ${root} .bonsai-tab-bar__name {
          flex: none;
          padding-left: 0.1em;
          font-size: ${uiScalePx(TAB_BAR_NAME_PX)};
          line-height: 1;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          white-space: nowrap;
          color: ${ACCENT};
        }
        /* The Main tab's name is "bonsAI", drawn in small caps (plan 87 F1): the rule above upper-cases
           every name, so this one turns that off for Main alone and asks for small caps, which draws the
           lowercase letters small and "AI" at full size. It sits after the rule above so it wins there. */
        ${root} .bonsai-tab-bar[data-bonsai-tab-bar-tab="main"] .bonsai-tab-bar__name {
          text-transform: none;
          font-variant-caps: small-caps;
        }
        /* Plain browser focus draws nothing (design-tokens.md: no catch-all ring rule — this one is
           scoped to the bar); a fake ring is worse than none (plan 78 measured the bar holding
           browser focus with no Steam ring anywhere). */
        ${root} .bonsai-tab-bar:focus,
        ${root} .bonsai-tab-bar:focus-visible {
          outline: none !important;
          box-shadow: none !important;
        }
        /* The ring on the bar (plan 84, drawing "Z", .deck.ring-tabs): the whole bar wears the white
           inset ring and a faint fill, keyed on Steam's own markers only. Inset, so the bar's own
           overflow: hidden never cuts it off. After the focus rule above, so it wins in any cascade. */
        ${root} .bonsai-tab-bar.gpfocus,
        ${root} .bonsai-tab-bar.gpfocuswithin {
          outline: none !important;
          box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.85) !important;
          background: rgba(255, 255, 255, 0.06);
          border-radius: ${uiScalePx(3)};
        }
        /* LB and RB light up only while the ring is on the bar (the drawing's .deck.dimkeys.ring-tabs;
           D126: a row's hints dim unless the ring is on that row). No fade: a state change, so
           nothing can be left half lit. */
        ${root} .bonsai-tab-bar.gpfocus .bonsai-tab-bar__shoulder,
        ${root} .bonsai-tab-bar.gpfocuswithin .bonsai-tab-bar__shoulder {
          opacity: 1;
          color: ${MARK_LIT_COLOR};
        }
`;
}
