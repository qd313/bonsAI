/**
 * Title: How the Search tab looks
 *
 * Purpose: The stylesheet for the Search tab (plan 90 § 2b, drawn on the mock-up board in
 * docs/demos/mockup-board/src/49-search.css and 49b-search-r2.js, option B of round 2): the tab's heading, the
 * game row (rounded buttons, the picked one gold), the find box with its magnifier, the word buttons (two rows
 * of four with a small count), the "N matches" line with Clear, the group headings, the match rows with the
 * picked word lit in cyan, the notes with their on/off switch, and the game note sheet. The white inset ring
 * that marks the stop Steam's ring is on follows the chats menu's (design-tokens.md, "Focus rings"). Every
 * size goes through `uiScalePx` or `uiTextPx`, so the tab follows both the UI size and Text size settings.
 * SearchTab.tsx draws it in a `<style>` of its own, under `.bonsai-scope`.
 *
 * Used for: SearchTab.tsx.
 *
 * Solves: Keeps the tab's look with the tab (src/features/search-tab/) rather than in a shared section file.
 *
 * Does not: Place the tab; the tab body root and the scroll pane do.
 */
import { uiScalePx } from "../../styles/sections/uiScalePx";
import { uiTextPx } from "../../styles/sections/textPx";

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
  gap: ${uiScalePx(5)};
  padding: 0 ${uiScalePx(6)} ${uiScalePx(8)};
}
${T} .bonsai-search__title {
  padding: ${uiScalePx(4)} ${uiScalePx(2)} ${uiScalePx(2)};
  font-size: ${uiTextPx(10)};
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
  gap: ${uiScalePx(4)};
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: ${uiScalePx(1)};
}
${T} .bonsai-search__games::-webkit-scrollbar {
  display: none;
}
${T} .bonsai-search__game {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  max-width: ${uiScalePx(130)};
  height: ${uiScalePx(22)};
  padding: 0 ${uiScalePx(8)};
  border-radius: ${uiScalePx(11)};
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: ${INK_2};
  font-size: ${uiTextPx(10)};
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
  gap: ${uiScalePx(5)};
}
${T} .bonsai-search__box {
  position: relative;
  min-height: ${uiScalePx(30)};
  border-radius: ${uiScalePx(4)};
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.06);
}
${T} .bonsai-search__mag {
  position: absolute;
  left: ${uiScalePx(8)};
  top: 50%;
  width: ${uiScalePx(13)};
  height: ${uiScalePx(13)};
  margin-top: ${uiScalePx(-6.5)};
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
  min-height: ${uiScalePx(28)};
  padding: 0 ${uiScalePx(8)} 0 ${uiScalePx(28)};
  border: 0;
  background: transparent;
  color: ${INK};
  font-size: ${uiTextPx(12)};
}
${T} .bonsai-search__box:has(.gpfocus) {
  outline: 2px solid rgba(255, 255, 255, 0.85);
  outline-offset: -2px;
}
${T} .bonsai-search__words {
  display: flex;
  gap: ${uiScalePx(5)};
}
${T} .bonsai-search__word {
  flex: 1 1 0;
  min-width: 0;
  box-sizing: border-box;
  height: ${uiScalePx(24)};
  padding: 0 ${uiScalePx(6)};
  border-radius: ${uiScalePx(4)};
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.05);
  color: #dce8f4;
  font-size: ${uiTextPx(10.5)};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${uiScalePx(4)};
  white-space: nowrap;
  overflow: hidden;
}
${T} .bonsai-search__word-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
${T} .bonsai-search__word small {
  font-size: ${uiTextPx(8.5)};
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
  gap: ${uiScalePx(4)};
  padding-top: ${uiScalePx(2)};
}
${T} .bonsai-search__count {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${uiScalePx(8)};
  padding: 0 ${uiScalePx(2)};
  font-size: ${uiTextPx(10)};
  color: #8fa8c4;
}
${T} .bonsai-search__clear {
  box-sizing: border-box;
  min-height: ${uiScalePx(20)};
  display: inline-flex;
  align-items: center;
  padding: 0 ${uiScalePx(8)};
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: ${uiScalePx(4)};
  color: ${INK_2};
  font-size: ${uiTextPx(9.5)};
}
${T} .bonsai-search__group {
  display: flex;
  align-items: center;
  gap: ${uiScalePx(5)};
  padding: ${uiScalePx(4)} ${uiScalePx(2)} 0;
  font-size: ${uiTextPx(9.5)};
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
  width: ${uiScalePx(11)};
  height: ${uiScalePx(11)};
}
${T} .bonsai-search__hit,
${T} .bonsai-search__note {
  box-sizing: border-box;
  width: 100%;
  display: flex;
  align-items: center;
  gap: ${uiScalePx(7)};
  padding: ${uiScalePx(5)} ${uiScalePx(8)};
  border-radius: ${uiScalePx(6)};
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
  gap: ${uiScalePx(1)};
}
${T} .bonsai-search__hit-title {
  font-size: ${uiTextPx(11)};
  font-weight: 600;
  line-height: 1.3;
}
${T} .bonsai-search__hit-main small {
  font-size: ${uiTextPx(9)};
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
  width: ${uiScalePx(34)};
  height: ${uiScalePx(18)};
  border-radius: ${uiScalePx(9)};
  background: #3b4552;
}
${T} .bonsai-search__switch::after {
  content: "";
  position: absolute;
  top: ${uiScalePx(2)};
  left: ${uiScalePx(2)};
  width: ${uiScalePx(14)};
  height: ${uiScalePx(14)};
  border-radius: 50%;
  background: #c9d1da;
}
${T} .bonsai-search__switch--on {
  background: #1a9fff;
}
${T} .bonsai-search__switch--on::after {
  left: ${uiScalePx(18)};
  background: #fff;
}
${T} .bonsai-search__hint {
  margin: 0;
  padding: ${uiScalePx(2)};
  font-size: ${uiTextPx(10)};
  line-height: 1.35;
  color: ${INK_3};
}
${T} .bonsai-search__sheet {
  display: flex;
  flex-direction: column;
  gap: ${uiScalePx(6)};
}
${T} .bonsai-search__sheet-name {
  font-size: ${uiTextPx(13)};
  font-weight: 700;
  color: ${INK};
}
${T} .bonsai-search__sheet-head small {
  font-size: ${uiTextPx(9.5)};
  color: ${INK_3};
}
${T} .bonsai-search__sheet-text {
  box-sizing: border-box;
  padding: ${uiScalePx(6)} ${uiScalePx(8)};
  border-radius: ${uiScalePx(6)};
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(10, 15, 21, 0.5);
  font-size: ${uiTextPx(11)};
  line-height: 1.4;
  color: #d4dde6;
  white-space: pre-wrap;
  word-break: break-word;
}
`;
