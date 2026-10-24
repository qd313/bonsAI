/**
 * Title: Tab strip icon centering (the "ghost nudge" fix)
 *
 * Purpose: Styles the row of tab icons across the top of the plugin — Ask,
 * Chats, Settings, and so on — so each icon sits centered in its own slot
 * instead of drifting sideways ("the ghost nudge") once Steam's own sizing
 * rules get involved.
 *
 *     ┌────────────────────────────────────────┐
 *     │  [Ask]   [Chats]   [Settings]   [...]   │  <- this file
 *     ├────────────────────────────────────────┤
 *     │             tab body below              │
 *     └────────────────────────────────────────┘
 *
 * Used for: Folded into the plugin's one combined stylesheet by
 * bonsaiScopeStylesheet.ts, alongside the other numbered section files.
 *
 * Does not: Style the tab body underneath, or decide which tabs exist —
 * only the shell and icon around each tab's title.
 */

/**
 * In: nothing.
 * Out: a block of CSS text for the tab strip.
 * Can go wrong: nothing — this always returns the same fixed string.
 */
export function buildSection2Section(): string {
  return `
/* ==========================================================================
           2. TAB CAROUSEL LAYOUT (THE "GHOST NUDGE" FIX)
           ========================================================================== */
        .bonsai-scope .bonsai-tab-title-shell {
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          width: auto !important;
          min-width: 0 !important;
          max-width: none !important;
          height: auto !important;
          text-transform: none !important;
          
          margin: 0 !important;
          padding: 0 !important;
        }
        
        .bonsai-scope .bonsai-tab-title-icon {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          margin: 0 !important;
          padding: 0 !important;
          line-height: 0;
          text-transform: none !important;
        }

        `;
}
