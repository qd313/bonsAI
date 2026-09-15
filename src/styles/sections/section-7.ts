/**
 * Title: Stripping Steam's own backgrounds so the plugin's show through
 *
 * Purpose: Steam's building blocks stack several backgrounds and shadows
 * of their own on top of each other. This file strips all of that off a
 * handful of spots — the suggestion chips, the Ask box, and the Ask-mode
 * and Attach dropdown menus — so the plugin's own custom backgrounds are
 * what a person actually sees, instead of Steam's default look showing
 * through underneath or on top of it.
 *
 * Used for: Folded into the plugin's one combined stylesheet by
 * bonsaiScopeStylesheet.ts, alongside the other numbered section files.
 *
 * Does not: Draw the plugin's own backgrounds — this only clears Steam's
 * away so they are not fighting with whatever is drawn elsewhere.
 */

/**
 * In: nothing.
 * Out: a block of CSS text.
 * Can go wrong: nothing — this always returns the same fixed string, but
 * see the comment inside it about the Ask-mode menu — stripping
 * backgrounds this broadly once made a dropdown menu see-through by
 * accident, which is why the menu's own rules below have to explicitly
 * undo part of this file's work.
 */
export function buildSection7Section(): string {
  return `
/* ==========================================================================
           7. TRANSPARENCY FLATTENING (DECKY FIXES)
           Decky components heavily stack backgrounds/shadows. This flattens them
           so our custom backgrounds show through properly.
           ========================================================================== */
        .bonsai-scope .bonsai-preset-glass > div,
        .bonsai-scope .bonsai-unified-input-host div:not(.bonsai-unified-input-text-overlay),
        .bonsai-scope .bonsai-unified-input-host input,
        .bonsai-scope .bonsai-unified-input-host .Panel.Focusable,
        .bonsai-scope .bonsai-unified-input-host .Panel.Focusable > div,
        .bonsai-scope .bonsai-askbar-target,
        .bonsai-scope .bonsai-askbar-target > div,
        .bonsai-scope .bonsai-askbar-target > span,
        .bonsai-scope .bonsai-askbar-merged .DialogButton {
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
          box-shadow: none !important;
        }

        /*
         * Ask-mode menu lives inside .bonsai-unified-input-host. Section 7 above uses
         * .bonsai-unified-input-host div and .Panel.Focusable with higher
         * specificity than .bonsai-ask-mode-menu-surface alone, so every menu
         * row/stack was forced transparent; ASK/glass bleeds through as a vertical fade.
         * Undo only under .bonsai-ask-mode-menu-floater (must beat section 7).
         */
        .bonsai-scope .bonsai-unified-input-host .bonsai-ask-mode-menu-floater,
        .bonsai-scope .bonsai-unified-input-host .bonsai-ask-mode-menu-floater div,
        .bonsai-scope .bonsai-unified-input-host .bonsai-ask-mode-menu-floater .Panel.Focusable,
        .bonsai-scope .bonsai-unified-input-host .bonsai-ask-mode-menu-floater .Panel.Focusable > div {
          background-image: none !important;
          /* Section 7 sets background-color transparent on .Panel.Focusable > div — must override or ASK bleeds through inner wrappers. */
          background-color: rgb(28, 36, 44) !important;
          box-shadow: none !important;
          opacity: 1 !important;
          filter: none !important;
          -webkit-backdrop-filter: none !important;
          backdrop-filter: none !important;
        }
        .bonsai-scope .bonsai-unified-input-host .bonsai-ask-mode-menu-floater .bonsai-ask-mode-menu-item--selected.Panel.Focusable > div {
          background-color: rgb(40, 50, 62) !important;
        }
        .bonsai-scope .bonsai-unified-input-host .bonsai-ask-mode-menu-floater .bonsai-ask-mode-menu-surface div {
          background-color: rgb(28, 36, 44) !important;
        }
        .bonsai-scope .bonsai-unified-input-host .bonsai-ask-mode-menu-floater .bonsai-ask-mode-menu-item--selected div {
          background-color: rgb(40, 50, 62) !important;
        }
        .bonsai-scope .bonsai-unified-input-host .bonsai-ask-mode-menu-floater .bonsai-ask-mode-menu-surface,
        .bonsai-scope .bonsai-unified-input-host .bonsai-ask-mode-menu-floater .bonsai-ask-mode-menu-surface > .Panel.Focusable {
          background-color: rgb(28, 36, 44) !important;
        }
        .bonsai-scope .bonsai-unified-input-host .bonsai-ask-mode-menu-floater .bonsai-ask-mode-menu-item {
          background-color: rgb(28, 36, 44) !important;
        }
        .bonsai-scope .bonsai-unified-input-host .bonsai-ask-mode-menu-floater .bonsai-ask-mode-menu-item--selected {
          background-color: rgb(40, 50, 62) !important;
        }
        .bonsai-scope .bonsai-unified-input-host .bonsai-ask-mode-menu-floater .bonsai-ask-mode-menu-item,
        .bonsai-scope .bonsai-unified-input-host .bonsai-ask-mode-menu-floater .bonsai-ask-mode-menu-item.Panel.Focusable {
          border-top: none !important;
          border-bottom: none !important;
        }
        .bonsai-scope .bonsai-unified-input-host .bonsai-ask-mode-menu-floater button.bonsai-ask-mode-menu-item-btn,
        .bonsai-scope .bonsai-unified-input-host .bonsai-ask-mode-menu-floater button.bonsai-ask-mode-menu-item-btn.DialogButton,
        .bonsai-scope .bonsai-unified-input-host .bonsai-ask-mode-menu-floater button.bonsai-ask-mode-menu-item-btn > div,
        .bonsai-scope .bonsai-unified-input-host .bonsai-ask-mode-menu-floater button.bonsai-ask-mode-menu-item-btn > span {
          background-color: rgb(28, 36, 44) !important;
          background-image: none !important;
          box-shadow: none !important;
          opacity: 1 !important;
          mix-blend-mode: normal !important;
          width: 100% !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
        }
        .bonsai-scope .bonsai-unified-input-host .bonsai-ask-mode-menu-floater button.bonsai-ask-mode-menu-item-btn.bonsai-ask-mode-menu-item--selected,
        .bonsai-scope .bonsai-unified-input-host .bonsai-ask-mode-menu-floater button.bonsai-ask-mode-menu-item-btn.bonsai-ask-mode-menu-item--selected > div {
          background-color: rgb(40, 50, 62) !important;
        }

        /* Attach menu: same solid-stack paint model as ask-mode (opens downward below paperclip). */
        .bonsai-scope .bonsai-unified-input-host .bonsai-attach-menu-floater,
        .bonsai-scope .bonsai-unified-input-host .bonsai-attach-menu-floater div,
        .bonsai-scope .bonsai-unified-input-host .bonsai-attach-menu-floater .Panel.Focusable,
        .bonsai-scope .bonsai-unified-input-host .bonsai-attach-menu-floater .Panel.Focusable > div {
          background-image: none !important;
          background-color: rgb(28, 36, 44) !important;
          box-shadow: none !important;
          opacity: 1 !important;
          filter: none !important;
          -webkit-backdrop-filter: none !important;
          backdrop-filter: none !important;
        }
        .bonsai-scope .bonsai-unified-input-host .bonsai-attach-menu-floater .bonsai-attach-menu-surface div {
          background-color: rgb(28, 36, 44) !important;
        }
        .bonsai-scope .bonsai-unified-input-host .bonsai-attach-menu-floater .bonsai-attach-menu-surface,
        .bonsai-scope .bonsai-unified-input-host .bonsai-attach-menu-floater .bonsai-attach-menu-surface > .Panel.Focusable {
          background-color: rgb(28, 36, 44) !important;
        }
        .bonsai-scope .bonsai-unified-input-host .bonsai-attach-menu-floater .bonsai-attach-menu-item {
          background-color: rgb(28, 36, 44) !important;
        }
        .bonsai-scope .bonsai-unified-input-host .bonsai-attach-menu-floater .bonsai-attach-menu-item,
        .bonsai-scope .bonsai-unified-input-host .bonsai-attach-menu-floater .bonsai-attach-menu-item.Panel.Focusable {
          border-top: none !important;
          border-bottom: none !important;
        }
        .bonsai-scope .bonsai-unified-input-host .bonsai-attach-menu-floater button.bonsai-attach-menu-item-btn,
        .bonsai-scope .bonsai-unified-input-host .bonsai-attach-menu-floater button.bonsai-attach-menu-item-btn.DialogButton,
        .bonsai-scope .bonsai-unified-input-host .bonsai-attach-menu-floater button.bonsai-attach-menu-item-btn > div,
        .bonsai-scope .bonsai-unified-input-host .bonsai-attach-menu-floater button.bonsai-attach-menu-item-btn > span {
          background-color: rgb(28, 36, 44) !important;
          background-image: none !important;
          box-shadow: none !important;
          opacity: 1 !important;
          mix-blend-mode: normal !important;
          width: 100% !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
        }

        `;
}
