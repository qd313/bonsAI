/**
 * Title: Root scope, QAM host, and Settings-tab spacing
 *
 * Purpose: Styles the plugin's outermost box — the `.bonsai-scope` element
 * every other rule in the stylesheet lives inside — plus Decky's own
 * wrapper around it, so the plugin's column fills the Quick Access Menu
 * instead of being crushed down to the height of the tab strip. The rest
 * of the file is a handful of Settings-tab specific fixes: the connection
 * row, wrapping blocks of help text ("prose"), full-width rows, and the
 * focus ring drawn around a Settings button when the D-pad lands on it.
 *
 *     ┌─ Quick Access Menu ────────────────────┐
 *     │ ┌─ .bonsai-scope (this file) ─────────┐ │
 *     │ │  [Ask] [Chats] [Settings] ...        │ │  <- tab strip, section-2
 *     │ │  ───────────────────────────────     │ │
 *     │ │  tab body fills the rest of the box  │ │
 *     │ │  instead of shrinking to the strip's │ │
 *     │ │  own height                          │ │
 *     │ └──────────────────────────────────────┘ │
 *     └─────────────────────────────────────────┘
 *
 * Used for: Folded into the plugin's one combined stylesheet by
 * bonsaiScopeStylesheet.ts — first, before every other numbered section,
 * so later sections can rely on the box shape this one sets up.
 *
 * Does not: Style the tab strip itself (section-2.ts) or the general
 * width resets for the scroll area underneath (section-3.ts).
 */
import { BONSAI_PLUGIN_SIDE_PAD_PX } from "../../features/unified-input/constants";
import { uiScalePx } from "./uiScalePx";

/**
 * In: nothing — every value here is a fixed string or read from a CSS
 * variable that some other part of the plugin sets.
 * Out: a block of CSS text.
 * Can go wrong: this function itself cannot fail — it always returns the
 * same fixed string.
 *
 * 1. `.bonsai-scope` itself: full width, a top-to-bottom flex column that
 *    stretches to fill the space Decky gives it, no side padding, and
 *    hidden overflow so content cannot spill out sideways.
 * 2. `.bonsai-scope.bonsai-qam-height-locked`: forces an explicit height
 *    from a shared size variable. Needed because a plain inline height set
 *    on the scope gets wiped out every time React re-renders it.
 * 3. `.decky-qam-scope:has(> .bonsai-scope)`: stretches Decky's own
 *    wrapper around the plugin, because on some Deck setups touching the
 *    menu can collapse that wrapper down to the height of the tab strip;
 *    also strips its side padding, which would otherwise inset every row.
 * 4. The Settings connection row and its host input: kept from growing
 *    wider than the row that contains them.
 * 5. `.bonsai-tab-panel-shell--tight`: clips sideways overflow, but only
 *    on tabs other than Main, so Main's own edge-to-edge layout is left
 *    alone.
 * 6. `.bonsai-settings-bleed`: pulls a row out to the left and right by
 *    negative margins, then pads it back in by the same amount, so its
 *    content lines up flush with a panel section's title instead of
 *    sitting indented from it.
 * 7. `.bonsai-settings-section-stack`: the gap between stacked blocks in
 *    Settings, and their text size, both scaled by the UI scale setting.
 * 8. `.bonsai-prose-host` / `.bonsai-prose`: makes blocks of wrapped text
 *    (such as help text) actually wrap on the Deck's browser engine,
 *    which does not always inherit ordinary wrap settings on its own.
 * 9. The Settings focus-button rules: shrinks the focusable wrapper around
 *    a button down to the size of the button itself, draws a visible ring
 *    around it once the D-pad or keyboard lands on it, and turns off the
 *    default ring on the outer wrapper so only one ring ever shows.
 */
export function buildScopebaseSection(): string {
  return `
/* ==========================================================================
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
          /* Explicit 0: rows must reach the QAM edges, and an inherited inset here would shift
             every full-bleed row at once (the "no longer span QAM width" bug). */
          padding-left: 0;
          padding-right: 0;
          /* Fill QAM column height so Decky Tabs body is not crushed into the ~80px strip row. */
          display: flex;
          flex-direction: column;
          flex: 1 1 auto;
          min-height: 0;
          align-self: stretch;
          overflow: hidden;
        }

        /* Durable QAM height lock (inline height on scope is wiped by React/Decky re-renders). */
        .bonsai-scope.bonsai-qam-height-locked {
          height: var(--bonsai-qam-lock-height) !important;
          min-height: var(--bonsai-qam-lock-height) !important;
          max-height: var(--bonsai-qam-lock-height) !important;
          display: flex !important;
          flex-direction: column !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
        }

        /*
          Decky wraps plugin content in .decky-qam-scope. On Bazzite gamescope, pointer entry can
          collapse that host to tab-strip height (~80px); stretch it with the plugin column.
        */
        .decky-qam-scope:has(> .bonsai-scope) {
          display: flex !important;
          flex-direction: column !important;
          flex: 1 1 auto !important;
          min-height: 0 !important;
          align-self: stretch !important;
          width: 100% !important;
          box-sizing: border-box !important;
          /* Decky's wrapper is the last ancestor bonsAI can name, and any horizontal padding it
             carries insets every row at once. Scoped by :has so no other plugin's panel changes. */
          padding-left: 0 !important;
          padding-right: 0 !important;
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
          width: 100%;
          max-width: 100%;
          margin-left: calc(-1 * (${uiScalePx(BONSAI_PLUGIN_SIDE_PAD_PX)}));
          margin-right: calc(-1 * (${uiScalePx(BONSAI_PLUGIN_SIDE_PAD_PX)}));
          padding-left: ${uiScalePx(BONSAI_PLUGIN_SIDE_PAD_PX)};
          padding-right: ${uiScalePx(BONSAI_PLUGIN_SIDE_PAD_PX)};
        }

        .bonsai-scope .bonsai-settings-section-stack {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          font-size: ${uiScalePx(14)} !important;
          line-height: 1.4 !important;
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
          font-size: ${uiScalePx(12)} !important;
          line-height: 1.4 !important;
        }

        /* Settings action buttons: shrink Focusable host so gpfocus ring hugs the button. */
        .bonsai-scope .bonsai-settings-focus-btn-host {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }
        .bonsai-scope .bonsai-settings-focus-btn-host > .Panel.Focusable,
        .bonsai-scope .bonsai-settings-focus-btn-host > .Focusable {
          width: auto !important;
          max-width: 100% !important;
          flex: 0 0 auto !important;
        }
        .bonsai-scope button.bonsai-settings-focus-btn.gpfocus,
        .bonsai-scope button.bonsai-settings-focus-btn:focus-visible {
          outline: 2px solid rgba(255, 255, 255, 0.88) !important;
          outline-offset: 2px !important;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.45) !important;
        }
        .bonsai-scope .bonsai-settings-focus-btn-host > .Panel.Focusable.gpfocus,
        .bonsai-scope .bonsai-settings-focus-btn-host > .Panel.Focusable:focus-visible {
          outline: none !important;
          box-shadow: none !important;
        }

        `;
}
