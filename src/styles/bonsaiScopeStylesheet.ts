import {
  ASK_LABEL_COLOR,
  ASK_LABEL_READY_COLOR,
  ASK_READY_STATE_TRANSITION_MS,
  TAB_TITLE_DEBUG_TAB_ICON_PX,
  TAB_TITLE_ICON_PX,
  TAB_TITLE_MAIN_ICON_SHIFT_X_PX,
  TAB_TITLE_MAIN_TAB_ICON_PX,
  TAB_TITLE_TAB_CELL_PX,
  TAB_TITLE_TAB_GAP_PX,
  TAB_STRIP_BODY_GAP_PX,
  UNIFIED_TEXT_FONT_PX,
  UNIFIED_TEXT_LINE_HEIGHT,
} from "../features/unified-input/constants";

/** Scoped Deck/QAM CSS injected once under `.bonsai-scope`. */
export function buildBonsaiScopeStylesheet(): string {
  return `
        /* Keep plugin subtree shrinkable inside QAM flex layout (avoids horizontal spill). */
        /*
          Do not set overflow-x on .bonsai-scope: if overflow-x is not visible, CSS forces overflow-y
          away from visible, which clipped tab content below the icon strip. Horizontal containment
          stays on TabContentsScroll + width/min-width fixes on bleed/ask rows.
        */
        .bonsai-scope {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }
        .bonsai-scope .bonsai-settings-connection-row {
          min-width: 0;
          max-width: 100%;
        }
        .bonsai-scope .bonsai-settings-connection-host input {
          min-width: 0 !important;
          max-width: 100%;
        }

        /* Non-main tabs: clip horizontal paint overflow without touching Main full-bleed (shell only). */
        .bonsai-scope .bonsai-tab-panel-shell--tight {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
          overflow-x: hidden;
        }

        /* Flushes row content with PanelSection title (counters default row inset). */
        .bonsai-scope .bonsai-settings-bleed {
          box-sizing: border-box;
          width: calc(100% + 24px);
          max-width: calc(100% + 24px);
          margin-left: -12px;
          margin-right: -12px;
        }

        .bonsai-scope .bonsai-settings-section-stack {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /*
          Explicit prose hooks: Deck CEF often ignored inherited overflow-wrap on PanelSection subtrees
          (class names do not always match our [class*="PanelSection"] patterns). H6 fix.
        */
        .bonsai-scope .bonsai-prose-host {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          box-sizing: border-box !important;
        }
        .bonsai-scope .bonsai-prose {
          display: block !important;
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          box-sizing: border-box !important;
          white-space: normal !important;
          overflow-wrap: anywhere !important;
          word-wrap: break-word !important;
          word-break: break-word !important;
        }

        /* ==========================================================================
           1. DECKY TAB HOST (do not kill transitions — Steam's tab carousel uses them to slide).
           ========================================================================== */

        /* Tab host: width only — do not make this a flex column with flex-grow (Deck logs showed
           tab strip ancestors blowing past hostW ~300 with negative left; content vanished). */
        .bonsai-scope .bonsai-decky-tabs-root {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          min-height: 0 !important;
          box-sizing: border-box !important;
        }

        /* Uniform tab glyph box. Icon components use an inner IconShell <span>; logo uses <img>. */
        .bonsai-scope .bonsai-decky-tabs-root .bonsai-tab-title-shell {
          width: ${TAB_TITLE_TAB_CELL_PX}px !important;
          height: ${TAB_TITLE_TAB_CELL_PX}px !important;
          min-width: ${TAB_TITLE_TAB_CELL_PX}px !important;
          min-height: ${TAB_TITLE_TAB_CELL_PX}px !important;
          max-width: ${TAB_TITLE_TAB_CELL_PX}px !important;
          max-height: ${TAB_TITLE_TAB_CELL_PX}px !important;
          box-sizing: border-box !important;
        }
        .bonsai-scope .bonsai-decky-tabs-root .bonsai-tab-title-shell--main .bonsai-tab-title-icon,
        .bonsai-scope .bonsai-decky-tabs-root .bonsai-tab-title-shell--main .bonsai-tab-title-icon > span,
        .bonsai-scope .bonsai-decky-tabs-root .bonsai-tab-title-shell--main .bonsai-tab-title-icon svg {
          width: ${TAB_TITLE_MAIN_TAB_ICON_PX}px !important;
          height: ${TAB_TITLE_MAIN_TAB_ICON_PX}px !important;
          min-width: ${TAB_TITLE_MAIN_TAB_ICON_PX}px !important;
          min-height: ${TAB_TITLE_MAIN_TAB_ICON_PX}px !important;
          max-width: ${TAB_TITLE_MAIN_TAB_ICON_PX}px !important;
          max-height: ${TAB_TITLE_MAIN_TAB_ICON_PX}px !important;
        }
        .bonsai-scope .bonsai-decky-tabs-root .bonsai-tab-title-shell--main .bonsai-tab-title-icon {
          transform: translateX(${TAB_TITLE_MAIN_ICON_SHIFT_X_PX}px) !important;
        }
        .bonsai-scope .bonsai-decky-tabs-root .bonsai-tab-title-shell--debug .bonsai-tab-title-icon,
        .bonsai-scope .bonsai-decky-tabs-root .bonsai-tab-title-shell--debug .bonsai-tab-title-icon > span,
        .bonsai-scope .bonsai-decky-tabs-root .bonsai-tab-title-shell--debug .bonsai-tab-title-icon svg {
          width: ${TAB_TITLE_DEBUG_TAB_ICON_PX}px !important;
          height: ${TAB_TITLE_DEBUG_TAB_ICON_PX}px !important;
          min-width: ${TAB_TITLE_DEBUG_TAB_ICON_PX}px !important;
          min-height: ${TAB_TITLE_DEBUG_TAB_ICON_PX}px !important;
          max-width: ${TAB_TITLE_DEBUG_TAB_ICON_PX}px !important;
          max-height: ${TAB_TITLE_DEBUG_TAB_ICON_PX}px !important;
        }
        .bonsai-scope .bonsai-decky-tabs-root .bonsai-tab-title-icon {
          width: ${TAB_TITLE_ICON_PX}px !important;
          height: ${TAB_TITLE_ICON_PX}px !important;
          min-width: ${TAB_TITLE_ICON_PX}px !important;
          min-height: ${TAB_TITLE_ICON_PX}px !important;
          max-width: ${TAB_TITLE_ICON_PX}px !important;
          max-height: ${TAB_TITLE_ICON_PX}px !important;
          box-sizing: border-box !important;
          color: rgba(168, 182, 198, 0.62) !important;
          opacity: 1 !important;
        }
        .bonsai-scope .bonsai-decky-tabs-root .bonsai-tab-title-icon > span {
          width: ${TAB_TITLE_ICON_PX}px !important;
          height: ${TAB_TITLE_ICON_PX}px !important;
          min-width: ${TAB_TITLE_ICON_PX}px !important;
          min-height: ${TAB_TITLE_ICON_PX}px !important;
          max-width: ${TAB_TITLE_ICON_PX}px !important;
          max-height: ${TAB_TITLE_ICON_PX}px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          box-sizing: border-box !important;
        }
        .bonsai-scope .bonsai-decky-tabs-root .bonsai-tab-title-icon svg {
          width: ${TAB_TITLE_ICON_PX}px !important;
          height: ${TAB_TITLE_ICON_PX}px !important;
          max-width: ${TAB_TITLE_ICON_PX}px !important;
          max-height: ${TAB_TITLE_ICON_PX}px !important;
          box-sizing: border-box !important;
        }
        .bonsai-scope .bonsai-decky-tabs-root .bonsai-tab-title-icon img {
          width: ${TAB_TITLE_ICON_PX}px !important;
          height: ${TAB_TITLE_ICON_PX}px !important;
          max-width: ${TAB_TITLE_ICON_PX}px !important;
          max-height: ${TAB_TITLE_ICON_PX}px !important;
          object-fit: contain !important;
          box-sizing: border-box !important;
        }

        /*
          Chip sizing lives on .bonsai-tab-title-leaf only (see bonsaiTabIconTitle).
          Prior :has(.bonsai-tab-title-shell) + width:40px matched intermediate carousel Panels (H2 depth-3),
          collapsing the strip so only one tab column peeked through.
        */
        .bonsai-scope .bonsai-decky-tabs-root .bonsai-tab-title-leaf {
          box-sizing: border-box !important;
          width: 40px !important;
          min-width: 40px !important;
          max-width: 40px !important;
          min-height: 44px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          flex-shrink: 0 !important;
          margin-left: ${TAB_TITLE_TAB_GAP_PX}px !important;
          margin-right: ${TAB_TITLE_TAB_GAP_PX}px !important;
          padding: 2px !important;
          border-radius: 12px !important;
          outline: none !important;
        }

        .bonsai-scope .bonsai-decky-tabs-root .Panel.Focusable:has(.bonsai-tab-title-leaf),
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton:has(.bonsai-tab-title-leaf) {
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
          border: none !important;
          box-shadow: none !important;
        }

        /*
          Current tab: very dim ring while focus is in the tab body (active strip control has no :focus-within).
          Bright ring when the strip control or its descendants hold focus / gamepad focus.
        */
        .bonsai-scope .bonsai-decky-tabs-root .Panel.Focusable.Active:not(:focus-within) .bonsai-tab-title-leaf,
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton.Active:not(:focus-within) .bonsai-tab-title-leaf,
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton.active:not(:focus-within) .bonsai-tab-title-leaf {
          box-shadow:
            0 0 0 1px var(--bonsai-ui-tab-dim-1, rgba(82, 216, 138, 0.2)),
            0 0 6px 1px var(--bonsai-ui-tab-dim-2, rgba(34, 100, 65, 0.12)) !important;
        }

        .bonsai-scope .bonsai-decky-tabs-root .Panel.Focusable.Active:focus-within .bonsai-tab-title-leaf,
        .bonsai-scope .bonsai-decky-tabs-root .Panel.Focusable.Active:focus-visible .bonsai-tab-title-leaf,
        .bonsai-scope .bonsai-decky-tabs-root .Panel.Focusable.Active.gpfocus .bonsai-tab-title-leaf,
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton.Active:focus-within .bonsai-tab-title-leaf,
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton.Active:focus-visible .bonsai-tab-title-leaf,
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton.active:focus-within .bonsai-tab-title-leaf,
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton.active:focus-visible .bonsai-tab-title-leaf,
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton.Active.gpfocus .bonsai-tab-title-leaf,
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton.active.gpfocus .bonsai-tab-title-leaf {
          box-shadow:
            0 0 0 2px var(--bonsai-ui-tab-bright-1, rgba(82, 216, 138, 0.95)),
            0 0 18px 6px var(--bonsai-ui-tab-bright-2, rgba(34, 100, 65, 0.55)),
            0 0 36px 12px var(--bonsai-ui-tab-bright-3, rgba(82, 216, 138, 0.32)) !important;
        }

        .bonsai-scope .bonsai-decky-tabs-root .Panel.Focusable.gpfocus:has(.bonsai-tab-title-leaf),
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton.gpfocus:has(.bonsai-tab-title-leaf),
        .bonsai-scope .bonsai-decky-tabs-root .Panel.Focusable.gpfocuswithin:has(.bonsai-tab-title-leaf),
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton.gpfocuswithin:has(.bonsai-tab-title-leaf) {
          border-radius: 12px !important;
        }

        .bonsai-scope .bonsai-decky-tabs-root .Panel.Focusable:focus-visible .bonsai-tab-title-leaf,
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton:focus-visible .bonsai-tab-title-leaf {
          outline: none !important;
        }

        .bonsai-scope .bonsai-decky-tabs-root .Panel.Focusable:focus-visible:not(.Active) .bonsai-tab-title-leaf,
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton:focus-visible:not(.Active):not(.active) .bonsai-tab-title-leaf {
          box-shadow:
            0 0 0 2px var(--bonsai-ui-tab-focus-1, rgba(82, 216, 138, 0.92)),
            0 0 0 5px var(--bonsai-ui-tab-focus-2, rgba(82, 216, 138, 0.18)) !important;
        }

        /* No green icon glow on non-active DialogButton tabs only. Avoid Panel.Focusable:not(.Active):
           Deck nests a non-Active Focusable inside the active tab DialogButton, which matched and cleared the active icon glow. */
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton:not(.Active):not(.active) .bonsai-tab-title-icon {
          filter: none !important;
        }

        .bonsai-scope .bonsai-decky-tabs-root .Panel.Focusable:focus-visible:not(.Active) .bonsai-tab-title-icon,
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton:focus-visible:not(.Active):not(.active) .bonsai-tab-title-icon,
        .bonsai-scope .bonsai-decky-tabs-root .Panel.Focusable.gpfocuswithin:not(.Active) .bonsai-tab-title-icon,
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton.gpfocuswithin:not(.Active):not(.active) .bonsai-tab-title-icon {
          color: rgba(252, 252, 252, 1) !important;
        }

        .bonsai-scope .bonsai-decky-tabs-root .Panel.Focusable.Active:not(:focus-within) .bonsai-tab-title-icon,
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton.Active:not(:focus-within) .bonsai-tab-title-icon,
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton.active:not(:focus-within) .bonsai-tab-title-icon,
        .bonsai-scope .bonsai-decky-tabs-root .Focusable.Active:not(:focus-within) .bonsai-tab-title-icon {
          color: rgba(252, 252, 252, 1) !important;
          filter:
            drop-shadow(0 0 2px var(--bonsai-ui-tab-icon-ds-1, rgba(82, 216, 138, 0.22)))
            drop-shadow(0 0 6px var(--bonsai-ui-tab-icon-ds-2, rgba(34, 100, 65, 0.16))) !important;
        }

        .bonsai-scope .bonsai-decky-tabs-root .Panel.Focusable.Active:focus-within .bonsai-tab-title-icon,
        .bonsai-scope .bonsai-decky-tabs-root .Panel.Focusable.Active:focus-visible .bonsai-tab-title-icon,
        .bonsai-scope .bonsai-decky-tabs-root .Panel.Focusable.Active.gpfocus .bonsai-tab-title-icon,
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton.Active:focus-within .bonsai-tab-title-icon,
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton.Active:focus-visible .bonsai-tab-title-icon,
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton.active:focus-within .bonsai-tab-title-icon,
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton.active:focus-visible .bonsai-tab-title-icon,
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton.Active.gpfocus .bonsai-tab-title-icon,
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton.active.gpfocus .bonsai-tab-title-icon {
          filter:
            drop-shadow(0 0 6px var(--bonsai-ui-tab-icon-ds-3, rgba(82, 216, 138, 0.95)))
            drop-shadow(0 0 14px var(--bonsai-ui-tab-icon-ds-4, rgba(34, 100, 65, 0.62)))
            drop-shadow(0 0 24px var(--bonsai-ui-tab-icon-ds-5, rgba(82, 216, 138, 0.45))) !important;
        }

        .bonsai-scope [class*="TabContentsScroll"] {
          scroll-behavior: auto !important;
          overflow-x: hidden !important;
          overflow-y: auto !important;
          min-width: 0 !important;
          max-width: 100% !important;
        }

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

        /* ==========================================================================
           3. GENERAL SPACING & WIDTH RESETS
           Groups and removes Steam's default padding/margins on scroll areas and panels
           to allow true full-bleed layouts across the entire plugin.
           ========================================================================== */
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
        .bonsai-scope .bonsai-decky-tabs-root [class*="TabContentsScroll"] {
          margin-top: ${TAB_STRIP_BODY_GAP_PX}px !important;
          padding-top: 6px !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
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

        /* ==========================================================================
           4. FULL-BLEED & ASKBAR WRAPPERS
           Forces specific containers to break out of standard bounds for edge-to-edge UI.
           ========================================================================== */
        /*
          Full-bleed width uses negative margins; do not set min-width to (100% + Npx) or the tab
          scroll region gains a wider min-content width and the QAM scrolls horizontally.
        */
        .bonsai-scope .bonsai-full-bleed-row,
        .bonsai-scope .bonsai-ask-bleed-wrap.bonsai-full-bleed-row {
          width: calc(100% + 24px) !important;
          max-width: none !important;
          min-width: 0 !important;
          /* Slight left pull vs symmetric -12/-12; eased from -14 so body reads a bit more to the right. */
          margin-left: -12px !important;
          margin-right: -10px !important;
          box-sizing: border-box !important;
        }

        /* Main unified search + Ask row: small right bias vs prior 0/6 (nudge body slightly right). */
        .bonsai-scope .bonsai-unified-input-host.bonsai-full-bleed-row {
          width: calc(100% - 8px) !important;
          margin-left: 3px !important;
          margin-right: 5px !important;
        }

        /* Settings search hits — same horizontal track as unified host so results line up under the textarea. */
        .bonsai-scope .bonsai-main-search-results-pane {
          width: calc(100% - 8px) !important;
          max-width: none !important;
          min-width: 0 !important;
          margin-left: 3px !important;
          margin-right: 5px !important;
          box-sizing: border-box !important;
        }

        /* Re-map width for specific askbar rows using CSS Variables with fallbacks */
        .bonsai-scope .bonsai-ask-bleed-wrap.bonsai-full-bleed-row {
          width: var(--bonsai-askbar-outer-width, var(--bonsai-search-host-width, calc(100% + 2px))) !important;
          min-width: 0 !important;
          margin-left: -1px !important;
          margin-right: -1px !important;
        }

        /*
          H1 fix: never tie min-width to --bonsai-search-host-width (measured px); that inflates tab
          min-content and causes QAM horizontal spill. Ask inner width uses --bonsai-askbar-outer-width
          (host + small extra) so the glass matches the unified field spill; max-width stays none so % parents do not clip it.
        */
        .bonsai-scope .bonsai-askbar-row-host,
        .bonsai-scope .bonsai-ask-bleed-wrap .bonsai-askbar-merged {
          width: var(--bonsai-askbar-outer-width, var(--bonsai-search-host-width, 100%)) !important;
          min-width: 0 !important;
          max-width: none !important;
          /* Left-edge correction (ASK bar shell starts inset from the unified input host).
           * Applied via CSS var set in useUnifiedInputSurface; ref-set inline styles on the
           * ask element get wiped by React re-renders, but scope-level vars persist. */
          margin-left: var(--bonsai-ask-margin-left, 0px) !important;
        }

        .bonsai-scope .bonsai-askbar-merged .bonsai-ask-primary.DialogButton,
        .bonsai-scope .bonsai-ask-bleed-wrap .Panel.Focusable {
          width: 100% !important;
          max-width: none !important;
          min-width: 0 !important;
        }

        .bonsai-scope .bonsai-ask-bleed-wrap,
        .bonsai-scope .bonsai-ask-bleed-wrap .bonsai-askbar-merged {
          flex: 1 1 auto !important;
          align-self: stretch !important;
        }

        /* ==========================================================================
           5. UNIFIED INPUT FIELD & TEXT AREA STYLING
           Aggressively strips native styling from inputs so we can draw custom carets/overlays.
           ========================================================================== */
        .bonsai-scope .bonsai-unified-input-host input,
        .bonsai-scope .bonsai-unified-input-host textarea {
          color: transparent !important;
          -webkit-text-fill-color: transparent !important;
          margin: 0 !important;
          padding: 0 !important;
          text-indent: 0 !important;
          box-sizing: border-box !important;
          font-size: ${UNIFIED_TEXT_FONT_PX}px !important;
          line-height: ${UNIFIED_TEXT_LINE_HEIGHT} !important;
          vertical-align: top !important;
        }

        .bonsai-scope .bonsai-unified-input-host.bonsai-unified-input--ai-character textarea,
        .bonsai-scope .bonsai-unified-input-host.bonsai-unified-input--ai-character input {
          padding-left: 22px !important;
        }

        .bonsai-scope .bonsai-unified-input-host.bonsai-unified-input--ai-character .bonsai-unified-input-measure,
        .bonsai-scope .bonsai-unified-input-host.bonsai-unified-input--ai-character .bonsai-unified-input-text-overlay {
          padding-left: 22px !important;
          box-sizing: border-box !important;
        }

        .bonsai-scope .bonsai-ai-character-avatar {
          outline: none;
          margin: 0 !important;
          padding: 0 !important;
          box-sizing: border-box !important;
          opacity: 0.75 !important;
        }

        .bonsai-scope .bonsai-unified-input-host input::placeholder,
        .bonsai-scope .bonsai-unified-input-host textarea::placeholder {
          font-size: ${UNIFIED_TEXT_FONT_PX}px !important;
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
          padding: 0 !important;
          box-sizing: border-box !important;
          left: var(--bonsai-unified-field-left, 0px) !important;
          top: var(--bonsai-unified-field-top, 0px) !important;
          right: auto !important;
          width: var(--bonsai-unified-field-width, 100%) !important;
        }

        /* Fake Caret Animation */
        .bonsai-scope .bonsai-unified-input-fake-caret {
          display: inline-block;
          margin-left: 1px;
          opacity: 0.9;
          transform: translateY(1px);
          animation: bonsai-caret-blink 1s step-end infinite;
        }
        @keyframes bonsai-caret-blink {
          0%, 45% { opacity: 0.9; }
          50%, 100% { opacity: 0; }
        }

        /* ==========================================================================
           6. GLASS PANELS & UI THEMING
           Applies frosted glass effects and borders to standard panels.
           ========================================================================== */
        .bonsai-scope .bonsai-glass-panel,
        .bonsai-scope .bonsai-preset-glass,
        .bonsai-scope .bonsai-ai-response-chunk,
        .bonsai-scope .bonsai-ai-response-stack {
          -webkit-backdrop-filter: blur(10px);
          backdrop-filter: blur(10px);
          box-sizing: border-box;
        }

        .bonsai-scope .bonsai-glass-panel {
          background: rgba(18, 26, 34, 0.25) !important;
          border: 1px solid rgba(255, 255, 255, 0.07) !important;
        }

        .bonsai-scope .bonsai-preset-glass {
          background: rgba(18, 26, 34, 0.22) !important;
          border: 1px solid rgba(255, 255, 255, 0.07) !important;
          box-shadow: none !important;
        }

        .bonsai-scope .bonsai-unified-input-strategy-placeholder {
          font-style: italic;
          font-size: 10px;
          opacity: 0.4;
        }

        .bonsai-scope .bonsai-ai-response-stack {
          display: flex;
          flex-direction: column;
          background: rgba(18, 26, 34, 0.28) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          color: #dadde3;
          border-radius: 4px;
          overflow: hidden;
        }

        .bonsai-scope .bonsai-ai-response-stack .bonsai-ai-response-chunk {
          background: transparent !important;
          border: none !important;
          border-radius: 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .bonsai-scope .bonsai-ai-response-stack .bonsai-ai-response-chunk:last-child {
          border-bottom: none;
        }

        .bonsai-scope .bonsai-ai-response-chunk {
          background: rgba(18, 26, 34, 0.28) !important;
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #dadde3;
          padding: 8px;
          white-space: normal;
          word-break: break-word;
          overflow-wrap: anywhere;
          font-size: 12px;
          line-height: 1.4;
        }
        .bonsai-scope .bonsai-ai-response-chunk .bonsai-md-p {
          margin: 0 0 0.5em 0;
        }
        .bonsai-scope .bonsai-ai-response-chunk .bonsai-md-p:last-child {
          margin-bottom: 0;
        }
        .bonsai-scope .bonsai-ai-response-chunk .bonsai-md-ul,
        .bonsai-scope .bonsai-ai-response-chunk .bonsai-md-ol {
          margin: 0.35em 0 0.5em 1.1em;
          padding: 0;
        }
        .bonsai-scope .bonsai-ai-response-chunk .bonsai-md-li {
          margin: 0.2em 0;
        }
        .bonsai-scope .bonsai-ai-response-chunk .bonsai-md-blockquote {
          margin: 0.4em 0;
          padding-left: 0.6em;
          border-left: 2px solid rgba(255, 255, 255, 0.2);
        }
        .bonsai-scope .bonsai-ai-response-chunk .bonsai-md-a {
          color: #7eb8ff;
          text-decoration: underline;
        }
        .bonsai-scope .bonsai-ai-response-chunk .bonsai-md-inline-code {
          font-family: ui-monospace, "Cascadia Code", "Consolas", monospace;
          background: rgba(0, 0, 0, 0.28);
          padding: 0.05em 0.3em;
          border-radius: 3px;
          font-size: 0.95em;
        }
        .bonsai-scope .bonsai-ai-response-chunk .bonsai-md-fenced-pre {
          margin: 0.5em 0;
          padding: 8px 10px;
          white-space: pre-wrap;
          word-break: break-word;
          overflow-x: auto;
          border-radius: 6px;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .bonsai-scope .bonsai-ai-response-chunk .bonsai-md-fenced-code {
          font-family: ui-monospace, "Cascadia Code", "Consolas", monospace;
          font-size: 11px;
          line-height: 1.35;
          display: block;
        }

        /*
          Main-tab AIM-style transcript: column shell + bubbles. Overrides broad PanelSectionRow
          child width where needed so player bubbles stay right-aligned (fit-content) without QAM bleed.
        */
        .bonsai-scope .bonsai-chat-main-column {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          box-sizing: border-box !important;
        }
        .bonsai-scope .bonsai-chat-transcript {
          display: flex !important;
          flex-direction: column !important;
          align-items: stretch !important;
          gap: 8px !important;
          min-width: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
          padding: 0 6px 0 4px !important;
        }
        .bonsai-scope .bonsai-chat-next-message-row {
          align-items: flex-end !important;
        }
        .bonsai-scope button.bonsai-chat-user-bubble {
          display: block !important;
          width: fit-content !important;
          max-width: min(88%, 260px) !important;
          min-width: 0 !important;
          margin-left: auto !important;
          margin-right: 0 !important;
          align-self: flex-end !important;
          box-sizing: border-box !important;
          text-align: right !important;
          white-space: pre-wrap !important;
          word-break: break-word !important;
          overflow-wrap: anywhere !important;
          font-size: 12px !important;
          line-height: 1.4 !important;
          padding: 8px 10px !important;
          border-radius: 10px !important;
          cursor: pointer !important;
          outline: none !important;
          appearance: none !important;
          -webkit-appearance: none !important;
          color: #dce6f2 !important;
          border: 1px solid rgba(90, 130, 185, 0.42) !important;
          background: linear-gradient(
            180deg,
            rgba(28, 44, 68, 0.72) 0%,
            rgba(18, 30, 48, 0.78) 100%
          ) !important;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04) !important;
        }
        .bonsai-scope button.bonsai-chat-user-bubble--history {
          font-size: 10px !important;
          font-weight: 600 !important;
          line-height: 1.25 !important;
          padding: 5px 8px !important;
          border-radius: 8px !important;
          max-width: min(100%, 200px) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          background: linear-gradient(
            180deg,
            rgba(22, 34, 48, 0.78) 0%,
            rgba(14, 22, 34, 0.82) 100%
          ) !important;
          color: #8fa8c4 !important;
        }
        .bonsai-scope button.bonsai-chat-user-bubble--history.bonsai-chat-user-bubble--selected {
          border: 1px solid rgba(120, 155, 198, 0.42) !important;
          background: linear-gradient(
            180deg,
            rgba(36, 52, 72, 0.82) 0%,
            rgba(24, 36, 52, 0.85) 100%
          ) !important;
          color: #e8eef4 !important;
        }
        .bonsai-scope button.bonsai-chat-user-bubble--latest {
          border: 1px solid rgba(100, 145, 205, 0.48) !important;
          background: linear-gradient(
            180deg,
            rgba(32, 52, 78, 0.8) 0%,
            rgba(20, 34, 54, 0.85) 100%
          ) !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.06),
            0 0 0 1px rgba(70, 120, 175, 0.1) !important;
        }
        .bonsai-scope .bonsai-chat-user-bubble-inner--faded {
          -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 52%, transparent 100%) !important;
          mask-image: linear-gradient(to bottom, #000 0%, #000 52%, transparent 100%) !important;
        }
        .bonsai-scope .bonsai-chat-ai-bubble.bonsai-glass-panel {
          border-radius: 10px !important;
          border: 1px solid var(--bonsai-chat-ai-bubble-border, rgba(46, 135, 83, 0.48)) !important;
          background: linear-gradient(
            180deg,
            var(--bonsai-chat-ai-bubble-bg-top, rgba(46, 135, 83, 0.12)) 0%,
            var(--bonsai-chat-ai-bubble-bg-bottom, rgba(18, 52, 34, 0.55)) 100%
          ) !important;
          color: var(--bonsai-chat-ai-bubble-text, #d4dde6) !important;
          overflow: hidden !important;
        }
        .bonsai-scope .bonsai-chat-ai-bubble .bonsai-ai-response-stack {
          background: transparent !important;
          border: none !important;
          width: 100% !important;
          max-width: 100% !important;
        }
        .bonsai-scope .bonsai-chat-ai-bubble .bonsai-ai-response-chunk {
          background: transparent !important;
          border: none !important;
          border-bottom: 1px solid var(--bonsai-chat-ai-bubble-chunk-border, rgba(255, 255, 255, 0.08)) !important;
          color: var(--bonsai-chat-ai-bubble-text, #d4dde6) !important;
        }
        .bonsai-scope .bonsai-chat-ai-bubble .bonsai-ai-response-chunk:last-child {
          border-bottom: none !important;
        }
        .bonsai-scope .bonsai-chat-ai-bubble-inner--faded {
          -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%) !important;
          mask-image: linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%) !important;
        }
        .bonsai-scope button.bonsai-chat-next-message {
          display: block !important;
          width: fit-content !important;
          max-width: min(88%, 260px) !important;
          margin-left: auto !important;
          align-self: flex-end !important;
          padding: 6px 12px !important;
          border-radius: 10px !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          border: 1px solid rgba(110, 150, 200, 0.38) !important;
          background: linear-gradient(
            180deg,
            rgba(26, 42, 62, 0.82) 0%,
            rgba(18, 28, 42, 0.88) 100%
          ) !important;
          color: #c8daf0 !important;
        }

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

        /* ==========================================================================
           8. ASKBAR INTERACTIONS & ICONS
           Handles focus states, layout of bottom action icons, and opacity.
           ========================================================================== */
        .bonsai-scope .bonsai-unified-input-host { border-radius: 8px; overflow: hidden; }
        /*
         * While the ask-mode dropdown is open: overflow visible for the menu, and raise stacking.
         * The ASK row is a later PanelSectionRow, so it paints on top of this host by default;
         * the menu extends over the ASK bar and looked like a vertical fade (ASK ::before gradient on top of rows).
         */
        .bonsai-scope .bonsai-unified-input-host.bonsai-ask-mode-menu-open {
          overflow: visible;
          position: relative;
          z-index: 50;
        }

        /* Ask mode menu: solid stack (Decky sometimes composites menus semi-transparent over glass). */
        .bonsai-scope .bonsai-ask-mode-menu-floater {
          opacity: 1 !important;
          filter: none !important;
          backdrop-filter: none !important;
        }
        .bonsai-scope .bonsai-ask-mode-menu-surface,
        .bonsai-scope .bonsai-ask-mode-menu-surface > .Panel.Focusable {
          background-color: rgb(28, 36, 44) !important;
          opacity: 1 !important;
        }
        .bonsai-scope .bonsai-ask-mode-menu-surface .Panel.Focusable {
          opacity: 1 !important;
        }
        .bonsai-scope .bonsai-ask-mode-menu-surface .bonsai-ask-mode-menu-item {
          background-color: rgb(28, 36, 44) !important;
          opacity: 1 !important;
          mix-blend-mode: normal !important;
        }
        .bonsai-scope .bonsai-ask-mode-menu-surface .bonsai-ask-mode-menu-item--selected {
          background-color: rgb(40, 50, 62) !important;
        }
        .bonsai-scope .bonsai-ask-mode-menu-surface .bonsai-ask-mode-menu-item,
        .bonsai-scope .bonsai-ask-mode-menu-surface .bonsai-ask-mode-menu-item.Panel.Focusable {
          border-top: none !important;
          border-bottom: none !important;
        }
        /* Keep gamepad/pointer focus ring inside the row so it does not extend past the panel edge. */
        .bonsai-scope .bonsai-ask-mode-menu-surface .bonsai-ask-mode-menu-item:focus,
        .bonsai-scope .bonsai-ask-mode-menu-surface .bonsai-ask-mode-menu-item:focus-visible {
          outline: 2px solid rgba(255, 255, 255, 0.38) !important;
          outline-offset: -2px !important;
        }

        /*
         * Reset nested Panel.Focusable under the unified input host. Keep selector specificity LOW: adding :not()
         * on menu classes raised specificity above .bonsai-unified-input-bottom-actions / .bonsai-unified-input-actions-right,
         * so flex-direction:column here won the cascade and stacked the paperclip above the mode chip + mic row.
         */
        .bonsai-scope .bonsai-unified-input-host .Panel.Focusable {
          padding: 0 !important; margin: 0 !important; min-width: 0 !important;
          display: flex !important; flex-direction: column !important;
          align-items: stretch !important; justify-content: flex-start !important;
        }
        /* Stronger chain beats the rule above so ask-mode menu rows keep horizontal padding (vars from MainTabAskModeMenuPopover surface). */
        .bonsai-scope .bonsai-unified-input-host .bonsai-ask-mode-menu-floater .bonsai-ask-mode-menu-surface > .bonsai-ask-mode-menu-list.Panel.Focusable {
          padding-top: var(--bonsai-ask-mode-menu-list-pad-y, 0px) !important;
          padding-bottom: var(--bonsai-ask-mode-menu-list-pad-y, 0px) !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
        }
        .bonsai-scope .bonsai-unified-input-host .bonsai-ask-mode-menu-floater .bonsai-ask-mode-menu-surface .bonsai-ask-mode-menu-item.Panel.Focusable {
          padding: var(--bonsai-ask-mode-menu-pad-y, 10px) var(--bonsai-ask-mode-menu-pad-x, 13px) !important;
        }

        /* Only the outer actions row is full-width; nested Focusable (mode + mic) stays end-aligned. */
        .bonsai-scope .bonsai-unified-input-bottom-actions > .Panel.Focusable {
          width: 100% !important; min-height: 100% !important;
          flex-direction: row !important; justify-content: flex-start !important;
          align-items: flex-end !important; flex-wrap: nowrap !important;
        }
        .bonsai-scope .bonsai-unified-input-actions-right.Panel.Focusable {
          width: auto !important;
          min-width: 0 !important;
          flex: 0 0 auto !important;
          margin-left: auto !important;
          flex-direction: row !important;
          align-items: flex-end !important;
          justify-content: flex-end !important;
        }

        .bonsai-scope .bonsai-unified-input-bottom-actions .bonsai-askbar-target.DialogButton,
        .bonsai-scope .bonsai-unified-input-bottom-actions .bonsai-askbar-target {
          padding: 0 !important; margin: 0 !important;
          min-width: 20px !important; min-height: 20px !important; border-radius: 0 !important;
        }
        .bonsai-scope .bonsai-unified-input-bottom-actions .bonsai-ask-mode-trigger.bonsai-askbar-target {
          min-width: unset !important;
        }
        .bonsai-scope .bonsai-unified-input-bottom-actions .bonsai-askbar-target > span { padding: 0 !important; margin: 0 !important; }

        .bonsai-scope .bonsai-unified-input-icon { display: inline-flex; align-items: center; justify-content: center; opacity: 0.15 !important; }
        .bonsai-scope .bonsai-unified-input-icon svg { opacity: 1; }

        .bonsai-scope .bonsai-askbar-corner-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          opacity: 0.5 !important;
          transition: opacity ${ASK_READY_STATE_TRANSITION_MS}ms ease !important;
        }
        .bonsai-scope .bonsai-askbar-merged .bonsai-askbar-corner-icon svg { opacity: 1; }

        .bonsai-scope .bonsai-askbar-merged .bonsai-ask-primary.DialogButton,
        .bonsai-scope .bonsai-askbar-merged .bonsai-ask-primary {
          color: ${ASK_LABEL_COLOR} !important;
          transition: color ${ASK_READY_STATE_TRANSITION_MS}ms ease !important;
        }
        .bonsai-scope .bonsai-askbar-merged .bonsai-ask-primary span { color: inherit !important; }

        /*
          Ask bar idle ↔ ready: crossfade a ::before overlay (opacity) so the lift animates smoothly; base glass stays
          from .bonsai-glass-panel (background gradients do not interpolate reliably in all engines).
        */
        .bonsai-scope .bonsai-askbar-merged {
          position: relative;
          transition:
            box-shadow ${ASK_READY_STATE_TRANSITION_MS}ms ease,
            border-color ${ASK_READY_STATE_TRANSITION_MS}ms ease;
        }
        .bonsai-scope .bonsai-askbar-merged::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          pointer-events: none;
          z-index: 0;
          opacity: 0;
          transition: opacity ${ASK_READY_STATE_TRANSITION_MS}ms ease;
          background: linear-gradient(180deg, rgba(42, 58, 76, 0.52) 0%, rgba(22, 34, 46, 0.46) 100%);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }
        .bonsai-scope .bonsai-askbar-merged--ready::before {
          opacity: 1;
        }
        .bonsai-scope .bonsai-askbar-merged > * {
          position: relative;
          z-index: 1;
        }

        /* Ask “ready” — border / outer ring (transitions on .bonsai-askbar-merged above) */
        .bonsai-scope .bonsai-askbar-merged.bonsai-askbar-merged--ready.bonsai-glass-panel {
          border-color: rgba(255, 255, 255, 0.11) !important;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07) !important;
        }
        .bonsai-scope .bonsai-askbar-merged.bonsai-askbar-merged--ready:focus-within {
          border-color: rgba(255, 255, 255, 0.14) !important;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.07) !important;
        }
        .bonsai-scope .bonsai-askbar-merged .bonsai-ask-primary--ready.DialogButton,
        .bonsai-scope .bonsai-askbar-merged .bonsai-ask-primary--ready { color: ${ASK_LABEL_READY_COLOR} !important; }
        .bonsai-scope .bonsai-askbar-merged--ready .bonsai-askbar-corner-icon { opacity: 0.62 !important; }

        /* Focus and Hover Effects */
        .bonsai-scope .bonsai-askbar-merged:focus-within {
          border-color: rgba(255, 255, 255, 0.12) !important;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08);
        }
        .bonsai-scope .bonsai-askbar-target { transition: background-color 120ms ease, box-shadow 120ms ease; border: none !important; }
        .bonsai-scope .bonsai-askbar-target:focus-visible {
          background: rgba(160, 189, 220, 0.16) !important; box-shadow: inset 0 0 0 1px rgba(200, 223, 245, 0.8);
        }
        .bonsai-scope .bonsai-attachment-preview-target:focus-visible,
        .bonsai-scope .bonsai-attachment-preview-target :focus-visible {
          background: rgba(176, 205, 235, 0.14) !important; box-shadow: inset 0 0 0 1px rgba(206, 229, 249, 0.9);
        }
        .bonsai-scope .bonsai-attachment-remove-target:focus-visible,
        .bonsai-scope .bonsai-attachment-remove-target :focus-visible {
          background: rgba(176, 205, 235, 0.22) !important; box-shadow: inset 0 0 0 1px rgba(206, 229, 249, 0.95); border-radius: 6px;
        }

        .bonsai-scope .bonsai-settings-inline-menu-host.bonsai-settings-accent-menu-open {
          overflow: visible;
          position: relative;
          z-index: 50;
        }
        .bonsai-scope .bonsai-settings-inline-menu-host .bonsai-accent-intensity-menu-floater {
          opacity: 1 !important;
          filter: none !important;
          backdrop-filter: none !important;
        }
        .bonsai-scope .bonsai-settings-inline-menu-host .bonsai-accent-intensity-menu-surface,
        .bonsai-scope .bonsai-settings-inline-menu-host .bonsai-accent-intensity-menu-surface > .Panel.Focusable {
          background-color: rgb(28, 36, 44) !important;
          opacity: 1 !important;
        }
        .bonsai-scope .bonsai-settings-inline-menu-host .bonsai-accent-intensity-menu-surface .bonsai-accent-intensity-menu-item {
          background-color: rgb(28, 36, 44) !important;
          opacity: 1 !important;
          mix-blend-mode: normal !important;
        }
        .bonsai-scope .bonsai-settings-inline-menu-host .bonsai-accent-intensity-menu-item--selected {
          background-color: rgb(40, 50, 62) !important;
        }

        /* ==========================================================================
           9. MISC FIXES (SLIDERS, ETC)
           ========================================================================== */
        .bonsai-scope .bonsai-preset-carousel-slot { width: 100%; min-width: 0; box-sizing: border-box; }
        .bonsai-scope [class*="SliderControlPanelGroup"],
        .bonsai-scope [class*="SliderControlAndNotches"] { width: 100% !important; min-width: 0 !important; max-width: 100% !important; }
        .bonsai-scope [class*="SliderControlPanelGroup"] > div,
        .bonsai-scope [class*="SliderControlAndNotches"] > div { min-width: 0 !important; }`;
}
