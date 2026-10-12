/**
 * Title: The About tab, one line per row
 *
 * Purpose: Styles the About tab's dense layout (plan 92, lane T3; the maintainer's pick, "round 2 option A
 * with round 3 option D" on the density board): the Version line, the "What bonsAI is" row whose paragraph
 * opens under it while the ring is on it, the one-line beta warning, the Reply language row, and the three
 * small link buttons beside a smaller QR code. Every number here is read off the drawing
 * (docs/demos/mockup-board-2/src/43-tabs.css, `.k-row`, `.k-text`, `.k-lsmall`, `.k-lqrbtn`) and the
 * colours are the ones sampled from the Deck (docs/demos/mockup-board-2/README.md).
 *
 * Used for: Folded into bonsaiScopeStylesheet.ts. The class names are drawn by AboutTab.tsx,
 * AboutRevealRow.tsx, AboutReplyLanguageSection.tsx and AboutLinks.tsx.
 *
 * Solves: The tab was 877 points tall because every row was a full Steam row with its text always drawn;
 * on the Deck's own screen that is two screens. The QR code shrinks from 132 to 88 points here, and
 * AboutTab.test.tsx / AboutLinks.test.tsx read both numbers back out of this text.
 *
 * Does not: Draw the D-pad ring (the shared ring classes do, scopeBase.ts), and does not touch any other tab.
 */
import { textPx } from "./textPx";

/** The QR picture's side, in points: 132 before plan 92, about 88 in the drawing's "links beside the QR". */
export const ABOUT_QR_SIZE_PX = 88;

/** A link button's height, in points (the drawing's `.k-lsmall` is a 28 point `.k-btn`). */
export const ABOUT_LINK_HEIGHT_PX = 28;

/**
 * In: nothing.
 * Out: a block of CSS text.
 * Can go wrong: nothing. Steam's own button rules carry `!important` on the sizes, so the link buttons' sizes
 * repeat it.
 */
export function buildAboutTabSection(): string {
  return `
        /* The Version line: plain text, not a stop. */
        .bonsai-scope .bonsai-about-version {
          font-size: ${textPx(11)};
          line-height: 1.2;
          color: #c8c8c8;
          padding: 2px 4px 4px;
        }
        /* A one-line row that is a stop: "What bonsAI is". The ring (white, inside the edge) is the shared
           wrap-ring class; the lighter fill is the drawing's ringed row. */
        .bonsai-scope .bonsai-about-row {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          min-height: 30px;
          box-sizing: border-box;
          padding: 4px 10px;
          border-bottom: 1px solid #1b2026;
          color: #dcdedf;
          font-size: ${textPx(13)};
          line-height: 1.25;
        }
        .bonsai-scope .bonsai-about-row.gpfocus {
          background: #32373d;
          color: #fff;
        }
        /* The paragraph that opens under the ringed row, and closes when the ring leaves. */
        .bonsai-scope .bonsai-about-reveal {
          font-size: ${textPx(11)};
          line-height: 1.3;
          color: #c8c8c8;
          padding: 4px 10px 6px;
        }
        .bonsai-scope .bonsai-about-reveal-note {
          display: block;
          margin-top: 4px;
          color: #9ce7ff;
        }
        /* The beta warning: one short line, always visible. */
        .bonsai-scope .bonsai-about-beta {
          font-size: ${textPx(11)};
          line-height: 1.3;
          font-weight: 700;
          color: #2e8753;
          padding: 4px 4px 2px;
        }
        /* Reply language: the label on the left, Steam's own dropdown (its value and chevron) on the right. */
        .bonsai-scope .bonsai-about-lang {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
        }
        .bonsai-scope .bonsai-about-lang-label {
          flex: 1 1 auto;
          min-width: 0;
          font-size: ${textPx(13)};
          color: #dcdedf;
        }
        .bonsai-scope .bonsai-about-lang > :last-child {
          flex: 0 0 56%;
          min-width: 0;
        }

        /* Links: three small buttons stacked beside the QR code, which is a stop of its own. */
        .bonsai-scope .bonsai-about-links {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          width: 100%;
        }
        .bonsai-scope .bonsai-about-links-col {
          flex: 1 1 0;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .bonsai-scope .bonsai-about-links .bonsai-about-link {
          display: flex !important;
          align-items: center !important;
          justify-content: flex-start !important;
          gap: 6px;
          width: 100% !important;
          min-width: 0 !important;
          height: ${ABOUT_LINK_HEIGHT_PX}px !important;
          min-height: ${ABOUT_LINK_HEIGHT_PX}px !important;
          box-sizing: border-box !important;
          padding: 0 8px !important;
          border-radius: 2px !important;
          font-size: ${textPx(11.5)} !important;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .bonsai-scope .bonsai-about-link-wrap {
          width: 100%;
        }
        .bonsai-scope .bonsai-about-qr-wrap {
          flex: none;
          width: 100px;
        }
        .bonsai-scope .bonsai-about-link-icon {
          flex: none;
          width: 16px;
          height: 16px;
          display: inline-flex;
        }
        .bonsai-scope .bonsai-about-link-icon svg {
          width: 100%;
          height: 100%;
        }
        .bonsai-scope .bonsai-about-links .bonsai-about-qr {
          flex: none !important;
          width: 100px !important;
          min-width: 0 !important;
          height: auto !important;
          min-height: 0 !important;
          padding: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          gap: 3px;
          background: none !important;
          border: 0 !important;
          color: #b8bcbf;
        }
        .bonsai-scope .bonsai-about-qr-img {
          display: block;
          width: ${ABOUT_QR_SIZE_PX}px;
          height: ${ABOUT_QR_SIZE_PX}px;
          max-width: 100%;
        }
        .bonsai-scope .bonsai-about-qr-caption {
          font-size: ${textPx(9)};
          line-height: 1.2;
          text-align: center;
          white-space: normal;
        }
`;
}
