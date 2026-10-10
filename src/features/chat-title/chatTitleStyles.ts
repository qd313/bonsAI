/**
 * Title: How the chat's name in Decky's bar looks
 *
 * Purpose: The stylesheet for the plugin's spot in Decky's title bar: the chat's name with its menu
 * arrow, the small line under it ("LT chat 2 of 5 RT"), the empty space that balances Decky's back
 * arrow, the white ring while Steam's ring is on the name, and the plain "bonsAI" wordmark the other
 * tabs show. Every rule sits under this view's own root class, `.bonsai-chat-title`, because Decky
 * draws this view outside bonsAI's own box and bonsAI's stylesheet (everything under `.bonsai-scope`)
 * does not reach it. ChatTitleView.tsx puts this text into a `<style>` of its own.
 *
 * Used for: ChatTitleView.tsx.
 *
 * Solves: Without its own rules the name drew in Decky's title type (22 points, heavy) and looked
 * like a heading, not the drawing's 13-point name over an 8-point line.
 *
 * Does not: Scale with bonsAI's UI-size setting. `uiScalePx` writes `var(--bonsai-ui-scale, 1)`, and
 * that variable is set on bonsAI's own box, which this view is outside of, so it would always read 1
 * here anyway; Decky's bar itself (its 28-point row and 40 by 28 back arrow) does not scale either.
 * Every number below is the drawing's own, in points, at the size the Deck shows.
 *
 * The numbers come from the drawing docs/planning/assets/84-vertical-room.html, frame "Z", round eight's
 * pick X1 (`.d-cpill`, `.d-cname`, `.nm2`, `.sub2`, `.d-key`, `.d-mirror`, `.deck.dimkeys`, `.ring-chat`).
 */

import { BONSAI_FOREST_GREEN } from "../unified-input/constants";

/** Decky's own back arrow, measured on the Deck 2026-10-08: the empty space on the right mirrors it. */
export const DECKY_BACK_ARROW_W_PX = 40;
/** Decky's title row height, the same measurement. */
const DECKY_TITLE_ROW_H_PX = 28;
/** The menu arrow after the name, and the empty space of the same width before it (so the WORDS centre). */
const NAME_CARET_PX = 10;
/** The gap between the name and the arrow, and between the spacer and the name. */
const NAME_CARET_GAP_PX = 3;
const NAME_FONT_PX = 13;
const SUB_FONT_PX = 8;
const KEY_FONT_PX = 7;
/** LT and RT at rest, dimmed while the ring is elsewhere (the drawing's `.deck.dimkeys`). */
export const KEY_DIM_OPACITY = 0.32;
/** The accent the tab bar uses when no character colour has been handed over yet (tabIndicatorBar.ts). */
const LIT_FALLBACK = "#52d88a";

/**
 * The + and the delete icon at the two ends of the name row (plan 87 F5): each stop is this wide, with a
 * 2-point gap on its inner side, so each takes ICON_SLOT_PX of the row. The name keeps what is left.
 */
const ICON_W_PX = 24;
const ICON_GAP_PX = 2;
export const ICON_SLOT_PX = ICON_W_PX + ICON_GAP_PX;
const ICON_SVG_PX = 13;

/** What the name's own box loses to the spacer, the two gaps and the arrow, out of its width. */
export const NAME_LINE_FURNITURE_PX = NAME_CARET_PX * 2 + NAME_CARET_GAP_PX * 2;

const ROOT = ".bonsai-chat-title";

export const CHAT_TITLE_CSS = `
${ROOT} {
  /* Basis 0, not auto: a long name's wide natural size must not count in Decky's flex row, or it squeezes
     Decky's back arrow (40 points with a short name, 32 with a long one: plan 87 B7). */
  flex: 1 1 0%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  --bonsai-chat-title-lit: ${LIT_FALLBACK};
}
${ROOT} .bonsai-chat-title__wordmark {
  font-variant: small-caps;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: rgba(236, 240, 245, 0.96);
  -webkit-text-stroke: 1.25px ${BONSAI_FOREST_GREEN};
  paint-order: stroke fill;
  white-space: nowrap;
}
${ROOT} .bonsai-chat-title__row {
  display: flex;
  align-items: center;
  height: ${DECKY_TITLE_ROW_H_PX}px;
  min-width: 0;
}
${ROOT} .bonsai-chat-title__name {
  flex: 1 1 auto;
  min-width: 0;
  height: ${DECKY_TITLE_ROW_H_PX}px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;
  outline: none !important;
  font-family: inherit;
  font-variant: normal !important;
  text-transform: none !important;
  letter-spacing: normal !important;
  -webkit-text-stroke: 0 transparent !important;
}
/* The ring on the name: Steam's own ring marker, or the view's own while DOM focus is here. */
${ROOT} .bonsai-chat-title__name.gpfocus,
${ROOT} .bonsai-chat-title__row--ring .bonsai-chat-title__name {
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.06);
}
${ROOT} .bonsai-chat-title__line {
  display: inline-flex;
  align-items: center;
  gap: ${NAME_CARET_GAP_PX}px;
  max-width: 100%;
  min-width: 0;
}
/* Centre the WORDS, not the group: an empty space the arrow's width before the name. */
${ROOT} .bonsai-chat-title__spacer {
  flex: none;
  width: ${NAME_CARET_PX}px;
}
${ROOT} .bonsai-chat-title__words {
  font-size: ${NAME_FONT_PX}px !important;
  line-height: 16px !important;
  font-weight: 800 !important;
  color: #e8eef5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
${ROOT} .bonsai-chat-title__words[data-scroll-phase="waiting"],
${ROOT} .bonsai-chat-title__words[data-scroll-phase="out"],
${ROOT} .bonsai-chat-title__words[data-scroll-phase="end"],
${ROOT} .bonsai-chat-title__words[data-scroll-phase="back"] {
  text-overflow: clip;
}
${ROOT} .bonsai-chat-title__run {
  display: inline-block;
}
${ROOT} .bonsai-chat-title__caret {
  flex: none;
  width: ${NAME_CARET_PX}px;
  height: ${NAME_CARET_PX}px;
  display: grid;
  place-items: center;
  color: var(--bonsai-chat-title-lit);
}
${ROOT} .bonsai-chat-title__caret svg {
  width: ${NAME_CARET_PX}px;
  height: ${NAME_CARET_PX}px;
  fill: none;
  stroke: currentColor;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  display: block;
  transition: transform 0.15s;
}
${ROOT}.bonsai-chat-title--menu-open .bonsai-chat-title__caret svg {
  transform: rotate(180deg);
}
${ROOT} .bonsai-chat-title__sub {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: ${SUB_FONT_PX}px !important;
  line-height: 10px !important;
  font-weight: 400 !important;
  color: rgba(168, 182, 198, 0.72);
  letter-spacing: 0.03em !important;
  white-space: nowrap;
}
${ROOT} .bonsai-chat-title__key {
  flex: none;
  font-size: ${KEY_FONT_PX}px;
  line-height: 8px;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: rgba(200, 212, 226, 0.85);
  border: 1px solid rgba(168, 182, 198, 0.4);
  border-radius: 3px;
  padding: 1px 2px 0;
  opacity: ${KEY_DIM_OPACITY};
  transition: opacity 0.15s;
}
/* LT and RT light only while the ring is on the name (Steam's markers, or the view's own). */
${ROOT} .bonsai-chat-title__name.gpfocus .bonsai-chat-title__key,
${ROOT} .bonsai-chat-title__row.gpfocuswithin .bonsai-chat-title__key,
${ROOT} .bonsai-chat-title__row--ring .bonsai-chat-title__key {
  opacity: 1;
  color: #eef3f8;
  border-color: rgba(238, 243, 248, 0.8);
}
/* The empty space that centres a short name gives way first, so a long name spills into it (plan 87 B7). */
${ROOT} .bonsai-chat-title__mirror {
  flex: 0 1000 auto;
  min-width: 0;
  width: ${DECKY_BACK_ARROW_W_PX}px;
  height: ${DECKY_TITLE_ROW_H_PX}px;
}
/* The + and the delete icon: icons only, the menu's own pictures at the menu's size and stroke. */
${ROOT} .bonsai-chat-title__icon {
  flex: none;
  box-sizing: border-box;
  width: ${ICON_W_PX}px;
  height: ${DECKY_TITLE_ROW_H_PX}px;
  display: grid;
  place-items: center;
  border-radius: 4px;
  cursor: pointer;
  outline: none !important;
  color: #9fb0c2;
}
${ROOT} .bonsai-chat-title__icon--new {
  margin-right: ${ICON_GAP_PX}px;
}
${ROOT} .bonsai-chat-title__icon--delete {
  margin-left: ${ICON_GAP_PX}px;
  color: #f16a5a;
}
${ROOT} .bonsai-chat-title__icon svg {
  width: ${ICON_SVG_PX}px;
  height: ${ICON_SVG_PX}px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
  display: block;
}
/* Greyed: still a stop, A does nothing (the delete icon at the new-chat spot, as the menu's Delete chat). */
${ROOT} .bonsai-chat-title__icon[data-off="true"] {
  opacity: 0.45;
}
${ROOT} .bonsai-chat-title__icon.gpfocus,
${ROOT} .bonsai-chat-title__icon[data-ring="true"] {
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.06);
}
@media (prefers-reduced-motion: reduce) {
  ${ROOT} .bonsai-chat-title__key,
  ${ROOT} .bonsai-chat-title__caret svg {
    transition: none;
  }
}
`;
