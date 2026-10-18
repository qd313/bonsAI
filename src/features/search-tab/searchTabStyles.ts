/**
 * Title: How the Search tab looks
 *
 * Purpose: The stylesheet for the Search tab (plan 90 § 2b, drawn on the mock-up board in
 * docs/demos/mockup-board/src/49-search.css and 49b-search-r2.js, option B of round 2): the tab's heading, the
 * game row (rounded buttons, the picked one gold), the find box with its magnifier, the word buttons (two rows
 * of four with a small count), the "N matches" line with Clear, the group headings, the match rows with the
 * picked word lit in cyan, the notes with their on/off switch, and the game note sheet. The white inset ring
 * that marks the stop Steam's ring is on follows the chats menu's (design-tokens.md, "Focus rings"). Every
 * letter size goes through `textPx`, so the tab follows the Text size setting; boxes are plain pixels.
 * SearchTab.tsx draws it in a `<style>` of its own, under `.bonsai-scope`.
 *
 * Used for: SearchTab.tsx.
 *
 * Solves: Keeps the tab's look with the tab (src/features/search-tab/) rather than in a shared section file.
 *
 * Does not: Place the tab; the tab body root and the scroll pane do.
 */
import { textPx } from "../../styles/textPx";

const T = ".bonsai-scope .bonsai-search";
const INK = "#e8eef5";
const INK_2 = "#a8b4c4";
const INK_3 = "#6b7c90";
const CYAN = "#9ce7ff";
const GOLD = "#facc15";

export const SEARCH_TAB_CSS = `
${T} {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 0 6px 8px;
}
${T} .bonsai-search__title {
  padding: 4px 2px 2px;
  font-size: ${textPx(10)};
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${INK_2};
}
/* A stop: the ring is the inset white one, drawn here (the stop carries noFocusRing). */
${T} .bonsai-search__stop {
  cursor: pointer;
}
${T} .bonsai-search__stop.gpfocus {
  outline: 2px solid rgba(255, 255, 255, 0.85);
  outline-offset: -2px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.55);
}
${T} .bonsai-search__games {
  display: flex;
  flex-wrap: nowrap;
  gap: 4px;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 1px;
}
${T} .bonsai-search__games::-webkit-scrollbar {
  display: none;
}
${T} .bonsai-search__game {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  max-width: 130px;
  height: 22px;
  padding: 0 8px;
  border-radius: 11px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: ${INK_2};
  font-size: ${textPx(10)};
  white-space: nowrap;
}
${T} .bonsai-search__game-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
${T} .bonsai-search__game--on {
  background: rgba(250, 204, 21, 0.12);
  border-color: rgba(250, 204, 21, 0.5);
  color: ${GOLD};
}
${T} .bonsai-search__find {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
${T} .bonsai-search__box {
  position: relative;
  min-height: 30px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.06);
}
${T} .bonsai-search__mag {
  position: absolute;
  left: 8px;
  top: 50%;
  width: 13px;
  height: 13px;
  margin-top: -6.5px;
  color: ${CYAN};
  pointer-events: none;
  z-index: 1;
}
${T} .bonsai-search__box > div {
  margin: 0;
  padding: 0;
  background: transparent;
}
${T} .bonsai-search__box input {
  box-sizing: border-box;
  width: 100%;
  min-height: 28px;
  padding: 0 8px 0 28px;
  border: 0;
  background: transparent;
  color: ${INK};
  font-size: ${textPx(12)};
}
${T} .bonsai-search__box:has(.gpfocus) {
  outline: 2px solid rgba(255, 255, 255, 0.85);
  outline-offset: -2px;
}
${T} .bonsai-search__words {
  display: flex;
  gap: 5px;
}
${T} .bonsai-search__word {
  flex: 1 1 0;
  min-width: 0;
  box-sizing: border-box;
  height: 24px;
  padding: 0 6px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.05);
  color: #dce8f4;
  font-size: ${textPx(10.5)};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  white-space: nowrap;
  overflow: hidden;
}
${T} .bonsai-search__word-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
${T} .bonsai-search__word small {
  font-size: ${textPx(8.5)};
  color: ${INK_3};
}
${T} .bonsai-search__word--on {
  background: rgba(56, 189, 248, 0.16);
  border-color: #1a9fff;
  color: #fff;
}
${T} .bonsai-search__results,
${T} .bonsai-search__notes {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 2px;
}
${T} .bonsai-search__count {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 2px;
  font-size: ${textPx(10)};
  color: #8fa8c4;
}
${T} .bonsai-search__clear {
  box-sizing: border-box;
  min-height: 20px;
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 4px;
  color: ${INK_2};
  font-size: ${textPx(9.5)};
}
${T} .bonsai-search__group {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 2px 0;
  font-size: ${textPx(9.5)};
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${INK_2};
}
${T} .bonsai-search__group small {
  margin-left: auto;
  font-weight: 600;
  color: ${INK_3};
}
${T} .bonsai-search__group-icon {
  display: inline-flex;
  width: 11px;
  height: 11px;
}
${T} .bonsai-search__hit,
${T} .bonsai-search__note {
  box-sizing: border-box;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 8px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(180deg, rgba(22, 34, 48, 0.78), rgba(14, 22, 34, 0.82));
  color: #dfe6ee;
  text-align: left;
}
${T} .bonsai-search__hit--qam {
  border-color: rgba(243, 197, 91, 0.3);
}
${T} .bonsai-search__hit-main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
${T} .bonsai-search__hit-title {
  font-size: ${textPx(11)};
  font-weight: 600;
  line-height: 1.3;
}
${T} .bonsai-search__hit-main small {
  font-size: ${textPx(9)};
  font-weight: 500;
  color: ${INK_3};
}
${T} .bonsai-search__hit mark {
  background: transparent;
  color: ${CYAN};
  font-weight: 800;
}
${T} .bonsai-search__note {
  color: ${INK_3};
}
${T} .bonsai-search__note--on {
  color: ${INK};
  border-color: rgba(156, 231, 255, 0.3);
}
${T} .bonsai-search__switch {
  position: relative;
  flex: 0 0 auto;
  width: 34px;
  height: 18px;
  border-radius: 9px;
  background: #3b4552;
}
${T} .bonsai-search__switch::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #c9d1da;
}
${T} .bonsai-search__switch--on {
  background: #1a9fff;
}
${T} .bonsai-search__switch--on::after {
  left: 18px;
  background: #fff;
}
${T} .bonsai-search__hint {
  margin: 0;
  padding: 2px;
  font-size: ${textPx(10)};
  line-height: 1.35;
  color: ${INK_3};
}
${T} .bonsai-search__sheet {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
${T} .bonsai-search__sheet-name {
  font-size: ${textPx(13)};
  font-weight: 700;
  color: ${INK};
}
${T} .bonsai-search__sheet-head small {
  font-size: ${textPx(9.5)};
  color: ${INK_3};
}
${T} .bonsai-search__sheet-text {
  box-sizing: border-box;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(10, 15, 21, 0.5);
  font-size: ${textPx(11)};
  line-height: 1.4;
  color: #d4dde6;
  white-space: pre-wrap;
  word-break: break-word;
}
`;
