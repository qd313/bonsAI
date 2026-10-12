/**
 * Title: The note card, the "Read N of your notes" line and the kept note's look
 *
 * Purpose: The stylesheet for src/features/user-notes (plan 90 § 2a, plan 92 lane N2), drawn on the
 * mock-up board's tab 7, round 2, option B (docs/demos/mockup-board/src/47b-notes-r2.js and the rules
 * in 48b-round2.css). The card is a small cyan-edged panel under the rating row: a lead line, the note's
 * words, three choices (Keep filled blue, Edit and Not now outlined) and the "For: <game> ▸" line. The
 * line above an answer is a small cyan pill with a pin and a chevron. Every size goes through the
 * Text size and UI scale helpers, like the rest of the sheet.
 *
 * Used for: bonsaiScopeStylesheet.ts, which folds it into the plugin's one stylesheet.
 *
 * Solves: Gives the card, its buttons, the "For" line, the kept line and the notes line one set of rules
 * under `.bonsai-scope`, with Steam's ring drawn the way the other small stops draw it (white outline).
 *
 * Does not: Style the notes sheet or the edit popup: they are Steam popups, outside `.bonsai-scope`,
 * and carry their own inline styles (UserNotesSheet.tsx, NoteEditModal.tsx).
 */
import { textPx } from "./textPx";
import { uiScalePx } from "./uiScalePx";

const RING = `
          outline: 2px solid rgba(255, 255, 255, 0.9) !important;
          outline-offset: 2px !important;`;

/** The card's, the kept line's and the notes line's rules, ready to fold into the scoped stylesheet. */
export function buildUserNotesSection(): string {
  return `
        /* Plan 92 lane N2: the note card under the rating row. */
        .bonsai-scope .bonsai-note-card {
          box-sizing: border-box;
          width: 100%;
          display: grid;
          gap: ${uiScalePx(5)};
          margin: ${uiScalePx(4)} 0;
          padding: ${uiScalePx(7)} ${uiScalePx(8)};
          border: 1px solid rgba(156, 231, 255, 0.3);
          border-radius: 8px;
          background: rgba(14, 22, 32, 0.8);
        }
        .bonsai-scope .bonsai-note-card__lead {
          font-size: ${textPx(10)};
          line-height: 1.35;
          color: #8fa8c4;
        }
        .bonsai-scope .bonsai-note-card__text {
          font-size: ${textPx(12)};
          line-height: 1.35;
          font-weight: 600;
          color: #dce8f4;
          overflow-wrap: anywhere;
        }
        .bonsai-scope .bonsai-note-card__buttons {
          display: flex;
          gap: ${uiScalePx(5)};
        }
        .bonsai-scope .bonsai-note-card__btn {
          flex: 1 1 0;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: ${uiScalePx(26)};
          padding: 0 ${uiScalePx(8)};
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: transparent;
          color: #c3d3e6;
          font-size: ${textPx(11)};
          font-weight: 600;
          cursor: pointer;
          outline: none;
        }
        .bonsai-scope .bonsai-note-card__btn--primary {
          background: linear-gradient(180deg, #2b6fb5, #235d99);
          border-color: rgba(156, 231, 255, 0.35);
          color: #ffffff;
        }
        .bonsai-scope .bonsai-note-card__for {
          justify-self: start;
          box-sizing: border-box;
          padding: ${uiScalePx(2)} ${uiScalePx(7)};
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 5px;
          font-size: ${textPx(10)};
          color: #b4c6dc;
          cursor: pointer;
          outline: none;
        }
        .bonsai-scope .bonsai-note-card__btn.gpfocus,
        .bonsai-scope .bonsai-note-card__btn:focus-visible,
        .bonsai-scope .bonsai-note-card__for.gpfocus,
        .bonsai-scope .bonsai-note-card__for:focus-visible {${RING}
        }
        .bonsai-scope .bonsai-note-card__error {
          font-size: ${textPx(11)};
          line-height: 1.35;
          color: #f2a0a0;
        }
        /* After Keep: the card shrinks to one line. */
        .bonsai-scope .bonsai-note-card--kept {
          display: flex;
          align-items: flex-start;
          gap: ${uiScalePx(6)};
          font-size: ${textPx(11)};
          line-height: 1.35;
          color: #dce8f4;
        }
        .bonsai-scope .bonsai-note-pin {
          flex: 0 0 auto;
          margin-top: 1px;
          color: #9ce7ff;
        }
        /* The line above an answer that read your notes; A opens them. */
        .bonsai-scope .bonsai-notes-line {
          align-self: flex-start;
          display: inline-flex;
          align-items: center;
          gap: ${uiScalePx(5)};
          box-sizing: border-box;
          max-width: 100%;
          margin: ${uiScalePx(2)} 0 ${uiScalePx(4)};
          padding: ${uiScalePx(2)} ${uiScalePx(8)};
          border: 1px solid rgba(156, 231, 255, 0.25);
          border-radius: 10px;
          background: rgba(56, 189, 248, 0.08);
          font-size: ${textPx(10)};
          font-weight: 600;
          color: #9ce7ff;
          cursor: pointer;
          outline: none;
        }
        .bonsai-scope .bonsai-notes-line.gpfocus,
        .bonsai-scope .bonsai-notes-line:focus-visible {${RING}
        }
        .bonsai-scope .bonsai-notes-line__chev {
          font-size: ${textPx(12)};
          color: #8fa8c4;
        }
  `;
}
