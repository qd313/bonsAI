/**
 * Title: The folded tabs' look: section lines, one-line rows, the help strip and the Open all button
 *
 * Purpose: The stylesheet for src/features/folded-tabs (plan 91 § 2b, drawn on the density board's
 * Ollama tab, round 2 option B and round 3 option C: docs/demos/mockup-board-2/src/43-tabs.css). A
 * section line is one row: its name in small capitals, its summary greyed and cut off with an
 * ellipsis, a chevron. The strip is a dark band over the bottom of the panel: the ringed row's name in
 * small grey capitals, then its text. The Open all button floats in the bottom-right corner above it.
 *
 * Used for: bonsaiScopeStylesheet.ts, which folds it into the plugin's one stylesheet. The class
 * names are the contract the Settings and Developer tabs reuse unchanged.
 *
 * Solves: The numbers the walk and the strip depend on live here once, as constants, and the tests
 * read them back out of the built stylesheet (lessons-learned § 5: anything drawn over another
 * element's space gets its arithmetic as a test).
 *
 * Does not: Colour the Open all button: it is the tab's own plain button (settingsGlassButton.ts). Does
 * not size Steam's own rows (rule 5 of design-language.md: never target Steam by class name).
 */
import { textPx } from "./textPx";

/** The tabs a folded tab can be; the dock shows only while its tab is the one on screen. */
const FOLDED_TAB_IDS = ["ollama", "settings", "developer"] as const;

/** A section line's least height, and its side padding (the drawing's 34 and 12). */
const FOLD_LINE_MIN_HEIGHT_PX = 34;
const FOLD_ROW_SIDE_PAD_PX = 12;

/** The strip: its padding, its top border, and its two line heights (label, text). */
const STRIP_PAD_TOP_PX = 6;
const STRIP_PAD_BOTTOM_PX = 8;
const STRIP_BORDER_TOP_PX = 1;
const STRIP_LABEL_LINE_PX = 13;
const STRIP_TEXT_LINE_PX = 15;

/** The Open all button's gap above the strip (and above the panel's bottom when the strip is hidden). */
const FOLD_ALL_GAP_PX = 8;

/**
 * Room at the end of a folded tab, under its last line, so the last rows can scroll up clear of the
 * strip and the button (the drawing's 120 px of padding under a tab with a strip).
 */
const FOLD_TAIL_PX = 120;

/** The strip's height for a text of `lines` lines (label included), as the rules below draw it. */
export function stripHeightFor(lines: number): number {
  return STRIP_BORDER_TOP_PX + STRIP_PAD_TOP_PX + STRIP_LABEL_LINE_PX + lines * STRIP_TEXT_LINE_PX + STRIP_PAD_BOTTOM_PX;
}

/**
 * The section's rules: the line and its parts, its ring, the open rows, the room at the tab's end, the dock
 * beside the pane (shown only while its tab is on screen), the button's corner and the strip.
 */
export function buildFoldedTabsSection(): string {
  const onlyWhileShown = FOLDED_TAB_IDS.map(
    (id) =>
      `.bonsai-scope .bonsai-decky-tabs-root:not([data-bonsai-active-tab="${id}"]) > .bonsai-fold-dock[data-bonsai-fold-tab="${id}"]`,
  ).join(",\n        ");
  return `
/* ==========================================================================
           FOLDED TABS (plan 91 § 2b): section lines, one-line rows, the strip, Open all
           ========================================================================== */
        .bonsai-scope .bonsai-fold-line {
          display: flex;
          align-items: center;
          gap: 6px;
          width: 100%;
          min-height: ${FOLD_LINE_MIN_HEIGHT_PX}px;
          padding: 4px ${FOLD_ROW_SIDE_PAD_PX}px;
          box-sizing: border-box;
          border-bottom: 1px solid #272c32;
          color: #b7b9bb;
          cursor: pointer;
        }
        .bonsai-scope .bonsai-fold-line[data-open="true"] {
          color: #ffffff;
        }
        .bonsai-scope .bonsai-fold-line__name {
          flex: 0 1 auto;
          min-width: 0;
          max-width: 62%;
          font-size: ${textPx(12)};
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .bonsai-scope .bonsai-fold-line__summary {
          flex: 1 1 auto;
          min-width: 0;
          font-size: ${textPx(11)};
          color: #8b929a;
          text-align: right;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .bonsai-scope .bonsai-fold-line__chevron {
          flex: none;
          width: 10px;
          font-size: ${textPx(11)};
          color: #9ce7ff;
        }
        /* The ring on a line: Steam's row fill, and the inset white ring (design-tokens.md, Focus rings). */
        .bonsai-scope .bonsai-fold-line.gpfocus {
          background: #32373d;
          color: #ffffff;
          outline: 2px solid rgba(255, 255, 255, 0.85);
          outline-offset: -2px;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.55);
        }
        .bonsai-scope .bonsai-fold-line.gpfocus .bonsai-fold-line__summary {
          color: #dcdedf;
        }
        .bonsai-scope .bonsai-fold-body {
          padding-bottom: 4px;
          border-bottom: 1px solid #272c32;
        }
        .bonsai-scope .bonsai-dense-row {
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }
        .bonsai-scope .bonsai-fold-tail {
          flex: none;
          height: ${FOLD_TAIL_PX}px;
        }

        /* The dock: drawn in bonsAI's tabs box beside Steam's pane, over the pane's bottom (TabHelpStrip.tsx). */
        .bonsai-scope .bonsai-decky-tabs-root:has(> .bonsai-fold-dock) {
          position: relative !important;
        }
        .bonsai-scope .bonsai-decky-tabs-root > .bonsai-fold-dock {
          position: absolute !important;
          left: 0;
          right: 0;
          top: auto;
          bottom: var(--bonsai-fold-dock-bottom, 0px);
          z-index: 5;
          display: flex !important;
          flex-direction: column !important;
          align-items: stretch;
          flex: none !important;
          min-height: 0 !important;
          overflow: visible !important;
          pointer-events: none;
        }
        ${onlyWhileShown} {
          display: none !important;
        }
        .bonsai-scope .bonsai-fold-all-host {
          align-self: flex-end;
          margin: 0 10px ${FOLD_ALL_GAP_PX}px 0;
          pointer-events: auto;
          border-radius: 4px;
          /* The panel's own colour under the see-through fill, so the list does not show through it. */
          background: #0e141b;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.55);
        }
        .bonsai-scope .bonsai-fold-strip {
          pointer-events: auto;
          box-sizing: border-box;
          background: #23262e;
          border-top: ${STRIP_BORDER_TOP_PX}px solid #3d4450;
          padding: ${STRIP_PAD_TOP_PX}px ${FOLD_ROW_SIDE_PAD_PX}px ${STRIP_PAD_BOTTOM_PX}px;
          font-size: ${textPx(11)};
          line-height: ${STRIP_TEXT_LINE_PX}px;
          color: #dcdedf;
        }
        .bonsai-scope .bonsai-fold-strip[hidden] {
          display: none;
        }
        /* The unseen copy the scroll plan measures a row's text in: laid out like the strip, never painted. */
        .bonsai-scope .bonsai-fold-strip--measure:not([hidden]) {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          visibility: hidden;
        }
        .bonsai-scope .bonsai-fold-strip__label {
          display: block;
          font-size: ${textPx(10)};
          line-height: ${STRIP_LABEL_LINE_PX}px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #8b929a;
        }
`;
}
