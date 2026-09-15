/**
 * Title: General spacing and width resets — read the warning below first
 *
 * Purpose: Strips Steam's own padding and margin off the tab body's scroll
 * area and the panel sections inside it, so the plugin's content can run
 * edge to edge instead of sitting inside Steam's usual gutters. It also
 * fixes two layout bugs seen on the Deck: the tab body quietly hugging the
 * right edge instead of filling the box, and long lines of text running
 * past the edge of the panel instead of wrapping.
 *
 * IMPORTANT: on a real Deck build, Steam renames most of the CSS class
 * names this file targets to short random strings, so most of the
 * selectors below match nothing at all. Only the ones naming
 * "TabContentsScroll" survive, because Steam keeps that one name as a
 * literal string. See section-4.ts for the fix that reaches the same
 * element a different way — do not assume a rule here is doing anything
 * without checking the class names on a real device.
 *
 * Used for: Folded into the plugin's one combined stylesheet by
 * bonsaiScopeStylesheet.ts, alongside the other numbered section files.
 *
 * Does not: Touch the tab strip icons above this (see section-2.ts), or
 * decide which tab is open — only the spacing and wrapping of the body
 * underneath.
 */
import { BONSAI_PLUGIN_SIDE_PAD_PX } from "../../features/unified-input/constants";
import { uiScalePx } from "./uiScalePx";

/**
 * In: nothing — every value here is a fixed string or read from a CSS
 * variable that some other part of the plugin sets.
 * Out: a block of CSS text.
 * Can go wrong: this function itself cannot fail, but see the class-name
 * warning above the file — a rule here can look correct and still do
 * nothing on a real Deck.
 *
 * 1. Strips Steam's default top margin, top padding, and left/right
 *    padding off the scroll area and any panel section — though per the
 *    warning above, most of this step matches nothing on a real Deck.
 * 2. When the plugin's panel height is locked, pins the scroll area's own
 *    height to a shared size variable so it fills the box instead of
 *    growing past it.
 * 3. Sets the scroll area's top gap and its left/right side padding — the
 *    padding scales with the UI scale setting, and this is the one rule in
 *    this group that actually reaches a real Deck.
 * 4. Forces the scroll area's direct child into a top-to-bottom layout,
 *    because the Deck sometimes decides it should be a row aligned to the
 *    right instead, which shoves the whole tab body to the right edge of
 *    the screen.
 * 5. Forces that same full-width, top-to-bottom treatment onto any panel
 *    section nested inside.
 * 6. Turns off Steam's slide and fade transitions on the scroll area, so
 *    switching tabs with the shoulder buttons does not flash.
 * 7. Keeps each row inside a panel section left-aligned and at full width.
 * 8. Makes long text actually wrap instead of running past the edge of the
 *    panel — on panel sections, their rows, and the text inside them.
 * 9. Resets the top and bottom margin on each row and makes sure it stays
 *    visible rather than clipped.
 * 10. Fixes a couple of Steam's own focusable panels so they take their
 *     natural height instead of sitting nudged down from where they
 *     should be.
 */
export function buildSection3Section(): string {
  return `
/* ==========================================================================
           3. GENERAL SPACING & WIDTH RESETS
           Groups and removes Steam's default padding/margins on scroll areas and panels
           to allow true full-bleed layouts across the entire plugin.
           ========================================================================== */
        /*
          WARNING: every [class*="PanelSection"] / [class*="PanelSectionRow"] selector in this file
          matches NOTHING on the shipping Deck build. Measured 2026-08-16 with
          scripts/probe_deck_ask_row_width.py: 0 matches inside the QAM, because Steam hashes those
          class names (the PanelSection wrapping Main's rows is "_3gY0aBuNR8_NPTpXIYfkby").
          "_TabContentsScroll" survives as a literal, which is why only that reset actually applies.

          Do not assume these rules are doing anything; the padding reset below silently was not,
          which is what left a 16px gutter on both sides of every Main row (see section-4.ts, where
          the working fix reaches the same element by structure via :has). They are kept because
          other Steam builds do ship readable names — but anything load-bearing needs a structural
          selector or a probe run to confirm it matches.
        */
        .bonsai-scope [class*="TabContentsScroll"],
        .bonsai-scope [class*="TabContentsScroll"] > div,
        .bonsai-scope [class*="PanelSection"] {
          margin-top: 0 !important;
          padding-top: 0 !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          min-width: 0 !important;
        }

        /* After the global TabContentsScroll reset: gap under LB/RB strip + kill stray horizontal inset
           (Deck screenshots: SETTINGS body looked right-shifted vs panel edge). */
        .bonsai-scope.bonsai-qam-height-locked .bonsai-decky-tabs-root [class*="TabContentsScroll"] {
          height: var(--bonsai-tab-body-height, auto) !important;
          max-height: var(--bonsai-tab-body-height, 100%) !important;
          flex: 0 0 auto !important;
          overflow-y: auto !important;
        }

        .bonsai-scope .bonsai-decky-tabs-root [class*="TabContentsScroll"] {
          margin-top: var(--bonsai-tab-strip-reserve, 0px) !important;
          padding-top: 0 !important;
          position: relative !important;
          top: auto !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
          padding-left: ${uiScalePx(BONSAI_PLUGIN_SIDE_PAD_PX)} !important;
          padding-right: ${uiScalePx(BONSAI_PLUGIN_SIDE_PAD_PX)} !important;
          box-sizing: border-box !important;
          flex: 1 1 0% !important;
          min-height: 0 !important;
          max-height: 100% !important;
          overflow-y: auto !important;
          align-self: stretch !important;
        }

        .bonsai-scope .bonsai-decky-tabs-root [class*="TabContentsScroll"] > div {
          margin-left: 0 !important;
          margin-right: 0 !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
          align-self: stretch !important;
          /* H5: Deck sometimes makes this a flex column with align-items:flex-end — whole body hugs the right. */
          display: flex !important;
          flex-direction: column !important;
          align-items: stretch !important;
          justify-content: flex-start !important;
        }

        .bonsai-scope .bonsai-decky-tabs-root [class*="TabContentsScroll"] > div [class*="PanelSection"] {
          display: flex !important;
          flex-direction: column !important;
          align-items: stretch !important;
          align-self: stretch !important;
          width: 100% !important;
          max-width: 100% !important;
        }

        /*
          LB/RB bumper tab switches use Steam's native carousel and can flash when tab content
          hosts animate. Keep icon-strip transitions; suppress only the content pane motion.
        */
        .bonsai-scope .bonsai-decky-tabs-root [class*="TabContentsScroll"],
        .bonsai-scope .bonsai-decky-tabs-root [class*="TabContentsScroll"] > div {
          transition: none !important;
          animation: none !important;
        }

        .bonsai-scope .bonsai-decky-tabs-root [class*="PanelSectionRow"] {
          justify-content: flex-start !important;
          align-self: stretch !important;
          width: 100% !important;
        }

        /*
          Panel copy was still painting past the QAM edge (Deck screenshot): long lines need explicit
          wrapping + shrink in nested flex; overflow-wrap:anywhere breaks tokens if needed.
        */
        .bonsai-scope [class*="PanelSection"],
        .bonsai-scope [class*="PanelSectionRow"],
        .bonsai-scope [class*="PanelSectionRow"] > div {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          overflow-wrap: anywhere !important;
          word-wrap: break-word !important;
        }

        .bonsai-scope [class*="PanelSectionRow"] {
          margin-top: 0 !important;
          margin-bottom: 0 !important;
          overflow: visible !important;
          align-self: stretch !important;
        }
        
        .bonsai-scope .Panel.Focusable { height: auto !important; }
        .bonsai-scope .Panel.Focusable > div { position: relative !important; top: 0 !important; }

        `;
}
