/**
 * Title: The job card's look: one fixed-height card for a running download, with its bar and Cancel
 *
 * Purpose: The stylesheet for JobCard.tsx, drawn from board 5, tab 2, round 2 (`b5t2Card2` in
 * docs/demos/mockup-board-5/src/72-ollama.js and `.b5t2-card` in 62-ollama.css): the title and Cancel on one row,
 * a thin progress bar, then three one-line rows (what it is doing, how far, the sites), on a dark card with a blue
 * edge. The heights add up to the drawing's measured 110 px, and they are constants here so a test can add them up.
 *
 * Used for: bonsaiScopeStylesheet.ts, which folds it into the plugin's one stylesheet.
 *
 * Solves: The card never changes height while a job runs (the drawing's rule: "the card never shrinks, so nothing
 * below it jumps"). Every row is one line, cut with an ellipsis, at a fixed line height; only the letters follow
 * the Text size setting (textPx), as everywhere else in the plugin.
 *
 * Does not: Draw the ring: Cancel is a plain button with the plugin's ring class (settingsGlassButton.ts).
 */
import { textPx } from "../../styles/textPx";

/** The card's parts, top to bottom, in px (the drawing's .b5t2-card at Normal text). */
const CARD_BORDER_PX = 1;
const CARD_PAD_TOP_PX = 8;
const CARD_PAD_BOTTOM_PX = 9;
const CARD_PAD_SIDE_PX = 10;
const CARD_GAP_PX = 6;
const HEAD_PX = 28;
const BAR_PX = 6;
const LINE1_PX = 15;
const LINE2_PX = 13;
const LINE3_PX = 13;
const ZONE_GAP_PX = 2;

/** The card's whole height: the drawing measured 110 px. */
export const JOB_CARD_HEIGHT_PX =
  2 * CARD_BORDER_PX +
  CARD_PAD_TOP_PX +
  HEAD_PX +
  CARD_GAP_PX +
  BAR_PX +
  CARD_GAP_PX +
  LINE1_PX +
  ZONE_GAP_PX +
  LINE2_PX +
  ZONE_GAP_PX +
  LINE3_PX +
  CARD_PAD_BOTTOM_PX;

/** The card's rules, the moving stripes for a step with no percentage, and their stillness under reduced motion. */
export function buildJobLookSection(): string {
  return `
/* ==========================================================================
           JOB CARD (plan 105, lane D4): one running download in place of its buttons
           ========================================================================== */
        .bonsai-scope .bonsai-job-card {
          box-sizing: border-box;
          height: ${JOB_CARD_HEIGHT_PX}px;
          display: flex;
          flex-direction: column;
          gap: ${CARD_GAP_PX}px;
          padding: ${CARD_PAD_TOP_PX}px ${CARD_PAD_SIDE_PX}px ${CARD_PAD_BOTTOM_PX}px;
          border: ${CARD_BORDER_PX}px solid rgba(56, 189, 248, 0.4);
          border-radius: 6px;
          background: rgba(10, 24, 36, 0.75);
          width: 100%;
          min-width: 0;
        }
        .bonsai-scope .bonsai-job-card__head {
          display: flex;
          align-items: center;
          gap: 8px;
          height: ${HEAD_PX}px;
          flex: none;
        }
        .bonsai-scope .bonsai-job-card__title {
          flex: 1 1 auto;
          min-width: 0;
          font-size: ${textPx(12)};
          font-weight: 700;
          color: #e8eef5;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .bonsai-scope .bonsai-job-cancel-host {
          flex: none;
          display: flex;
        }
        .bonsai-scope button.bonsai-job-cancel {
          height: ${HEAD_PX}px;
          min-height: ${HEAD_PX}px;
          min-width: 0;
          padding: 0 10px;
          border-radius: 4px;
          border: 1px solid rgba(248, 113, 113, 0.5);
          background: rgba(48, 24, 26, 0.6);
          color: #fecaca;
          font-size: ${textPx(11)};
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          white-space: nowrap;
        }
        .bonsai-scope button.bonsai-job-cancel[data-stopping="true"] {
          background: rgba(248, 113, 113, 0.28);
        }
        .bonsai-scope .bonsai-job-progress {
          position: relative;
          flex: none;
          height: ${BAR_PX}px;
          border-radius: 3px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.12);
        }
        .bonsai-scope .bonsai-job-progress__fill {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          background: linear-gradient(90deg, rgba(56, 189, 248, 0.42), rgba(56, 189, 248, 0.68));
          transition: width 160ms linear;
        }
        .bonsai-scope .bonsai-job-progress__fill[data-moving="true"] {
          width: 100%;
          background: repeating-linear-gradient(-45deg, rgba(56, 189, 248, 0.34) 0 10px, rgba(56, 189, 248, 0.12) 10px 20px);
          background-size: 28px 28px;
          animation: bonsai-job-stripes 0.9s linear infinite;
        }
        @keyframes bonsai-job-stripes {
          to { background-position: 28px 0; }
        }
        .bonsai-scope .bonsai-job-card__zone {
          display: flex;
          flex-direction: column;
          gap: ${ZONE_GAP_PX}px;
          min-width: 0;
        }
        .bonsai-scope .bonsai-job-card__line {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .bonsai-scope .bonsai-job-card__line--now {
          height: ${LINE1_PX}px;
          line-height: ${LINE1_PX}px;
          font-size: ${textPx(11)};
          color: #9ce7ff;
        }
        .bonsai-scope .bonsai-job-card__line--far {
          height: ${LINE2_PX}px;
          line-height: ${LINE2_PX}px;
          font-size: ${textPx(10)};
          color: #8fa0b4;
        }
        .bonsai-scope .bonsai-job-card__line--sites {
          height: ${LINE3_PX}px;
          line-height: ${LINE3_PX}px;
          font-size: ${textPx(10)};
          color: #6b7c90;
        }
        @media (prefers-reduced-motion: reduce) {
          .bonsai-scope .bonsai-job-progress__fill[data-moving="true"] {
            animation: none;
          }
        }
`;
}
