/**
 * Title: Slider and carousel width fixes
 *
 * Purpose: A short grab-bag of leftover width fixes. It stops slider
 * controls — like the sliders on the Settings tab — from refusing to
 * shrink inside a narrow Quick Access Menu column, and keeps the strip
 * that holds the preset chips at full width instead of collapsing down
 * to the width of its own content.
 *
 * Used for: Folded into the plugin's one combined stylesheet by
 * bonsaiScopeStylesheet.ts, alongside the other numbered section files.
 *
 * Does not: Style a slider's color or its thumb — only its width and the
 * width of the row wrapped around it.
 */

/**
 * In: nothing.
 * Out: a block of CSS text.
 * Can go wrong: nothing — this always returns the same fixed string.
 */
export function buildSection9Section(): string {
  return `
/* ==========================================================================
           9. MISC FIXES (SLIDERS, ETC)
           ========================================================================== */
        .bonsai-scope .bonsai-preset-carousel-slot { width: 100%; min-width: 0; box-sizing: border-box; }
        .bonsai-scope [class*="SliderControlPanelGroup"],
        .bonsai-scope [class*="SliderControlAndNotches"] { width: 100% !important; min-width: 0 !important; max-width: 100% !important; }
        .bonsai-scope [class*="SliderControlPanelGroup"] > div,
        .bonsai-scope [class*="SliderControlAndNotches"] > div { min-width: 0 !important; }`;
}
