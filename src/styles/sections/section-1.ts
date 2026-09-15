/**
 * Title: Tab area frame, and stopping the tab-switch flicker
 *
 * Purpose: Styles the box that holds the whole tab area — everything
 * below the top of the plugin's window: the strip that used to show
 * Steam's own tab icons (now hidden; the plugin draws its own bar
 * instead, see tabIndicatorBar.ts) and the scrollable body underneath it.
 * Also fixes a flicker seen when switching tabs with the shoulder
 * buttons, where the tab strip visibly dragged sideways for a moment.
 *
 *     ┌─ this file's box ─────────────────────┐
 *     │  (Steam's own tab strip: hidden here)  │
 *     │  ┌───────────────────────────────────┐ │
 *     │  │        scrollable tab body         │ │
 *     │  └───────────────────────────────────┘ │
 *     └─────────────────────────────────────────┘
 *
 * Used for: Folded into the plugin's one combined stylesheet by
 * bonsaiScopeStylesheet.ts, alongside the other numbered section files.
 *
 * Does not: Draw the plugin's own tab bar that replaced Steam's — see
 * tabIndicatorBar.ts for that.
 */

/**
 * In: nothing.
 * Out: a block of CSS text.
 * Can go wrong: nothing — this always returns the same fixed string.
 */
export function buildSection1Section(): string {
  return `
/* ==========================================================================
           1. DECKY TAB HOST (do not kill transitions — Steam's tab carousel uses them to slide).
           ========================================================================== */

        /* Tab host: column flex so tab body grows below the strip (Bazzite gamescope kept host ≈80px).
           Do not flex-grow the carousel strip row itself — only TabContentsScroll (section 3). */
        .bonsai-scope .bonsai-decky-tabs-root {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          min-height: 0 !important;
          box-sizing: border-box !important;
          /* Both axes must say clip. Per spec, clip on one axis computes to hidden when the
             other axis is hidden — measured on device 2026-08-07: this rule read back as
             hidden/hidden for as long as it was written as overflow-x only. hidden still
             allows *programmatic* scrolling, which is what made the strip flicker (see the
             sibling rule below). */
          overflow: clip !important;
          display: flex !important;
          flex-direction: column !important;
          flex: 1 1 0% !important;
          align-self: stretch !important;
        }

        /* Decky Tabs host between strip and TabContentsScroll must shrink, not grow with content.

           clip, not hidden — this is the LB/RB tab-strip flicker fix (TAB-SWITCH-01).
           Measured on device 2026-08-07: on an RB press this wrapper's scrollWidth transiently
           inflates (300 -> 420) while the outgoing tab is still mounted, Steam scrolls it right
           to reveal the incoming tab, and then the browser clamps scrollLeft back down frame by
           frame as scrollWidth collapses — dragging the whole strip sideways and back over
           ~350ms. scrollLeft tracked scrollWidth - clientWidth exactly on every frame. LB never
           showed it because scrolling toward 0 is valid at any scrollWidth.

           overflow:hidden does not prevent this: a hidden box is still a scroll container and
           is still scrollable programmatically (measured: scrollLeft took 119.53 under hidden, 0
           under clip). clip removes the scroll container outright, so there is no offset to
           clamp. This element has no legitimate scroll range to lose — at rest it measures
           scrollWidth == clientWidth == 300; the carousel's real horizontal scrolling happens on
           a deeper Steam element (sw 362 / cw 188), which this rule does not touch. */
        .bonsai-scope .bonsai-decky-tabs-root > .Panel,
        .bonsai-scope .bonsai-decky-tabs-root > div {
          flex: 1 1 0% !important;
          min-height: 0 !important;
          min-width: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          overflow: clip !important;
          align-self: stretch !important;
        }

        .bonsai-scope .bonsai-decky-tabs-root [class*="TabContentsScroll"] {
          position: relative !important;
          z-index: 1 !important;
          flex: 1 1 0% !important;
          min-height: 0 !important;
          max-height: 100% !important;
          overflow-y: auto !important;
        }

        /* Plan 30 (D44): Steam's tab header — LB hint, icon carousel, RB hint — is hidden; the
           collapsing bar above the tabs root shows the tab instead. Structural and hash-free: the
           header wrapper is the Tabs panel's first child, the only child holding our title leaves
           and both aria-labelled hint images and not TabContentsScroll (probe_deck_tab_bar.py,
           2026-09-02). display:none, not height:0 + visibility:hidden — measured the same day:
           both leave Steam's hidden tab button as a D-pad stop (its nav tree is mounted
           Focusables, not layout), but only display:none takes the leaves out of layout, so
           useTabStripBodyOffset does not reserve their 62px (variant B reserved 67px and reclaimed
           nothing). Fail-safe by construction: if a Steam update stops this from matching, Steam's
           own strip reappears above our bar and nothing else breaks. Steam keeps handling LB/RB
           with the row hidden — TAB-BAR-W1a, with and without a game running. */
        .bonsai-scope .bonsai-decky-tabs-root > .Panel.Focusable > div:has(.bonsai-tab-title-leaf):has(img[aria-label]):not(:has([class*="TabContentsScroll"])) {
          display: none !important;
        }

        /*
          Plan 30 W6 (2026-09-02): everything that used to style Steam's tab strip here — the leaf
          box, the icon shells and sizes, the dim and bright rings, the icon drop-shadows and the
          [data-bonsai-active-tab] marker — was deleted. Steam's header is display:none (the rule
          above), so none of it could paint, and docs/audit/decky-tab-strip-classes.md had already
          recorded the .Active-keyed ring blocks as dead since 2026-08-04. The strip's job moved to
          TabIndicatorBar + styles/sections/tabIndicatorBar.ts. data-bonsai-active-tab stays on the
          tabs root: nothing styles on it any more, but the on-Deck rows read it as the probe of
          which tab is active (runs/TAB-BAR-03-*.json expect on it).
        */

        .bonsai-scope [class*="TabContentsScroll"] {
          scroll-behavior: auto !important;
          overflow-x: hidden !important;
          overflow-y: auto !important;
          min-width: 0 !important;
          max-width: 100% !important;
        }

        `;
}
