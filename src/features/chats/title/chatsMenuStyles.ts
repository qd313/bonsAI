/**
 * Title: How the chats menu looks
 *
 * Purpose: The stylesheet for the chats menu that drops over the answer from the chat's name (plan 84
 * step 5, the drawing's `.d-sheet`, `.d-crow`, `.d-cacts`, `.d-cact`, frame "R4"): the "Your chats"
 * heading, one row per chat with the current one's lit left edge, the unread dot and the still-writing
 * ring, the two-column grid of actions with Delete in red, the hint line at the foot, and the white inset
 * ring that marks the stop Steam's ring is on (design-tokens.md, "Focus rings": the inset ring is the
 * one for menu rows). ChatsMenu.tsx draws it in a `<style>` of its own, under `.bonsai-scope`, so it
 * reaches only the menu and its letters follow the Text size setting through `textPx`.
 *
 * Used for: ChatsMenu.tsx.
 *
 * Solves: Keeps the menu's look with the menu (src/features/chat-title/) rather than in a shared section
 * file, so the whole of plan 84 step 5 lives in one folder.
 *
 * Does not: Place the menu on the screen; ChatsMenu.tsx does (over the answer, its foot on the dock's
 * top edge, its height measured from the room above the dock).
 */
import { textPx } from "../../../styles/textPx";

const M = ".bonsai-scope .bonsai-chats-menu";
const LIT = "var(--bonsai-ui-tab-lit, #52d88a)";

export const CHATS_MENU_CSS = `
${M} {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 100%;
  z-index: 6;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  max-height: 260px;
  overflow-y: auto;
  padding: 6px;
  /* Fully opaque: the answer behind must not read through (section-4.ts, the settings card). */
  background: rgb(18, 26, 34);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
${M} .bonsai-chats-menu__stops {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 100%;
}
${M} .bonsai-chats-menu__heading {
  margin: 2px 4px 4px;
  font-size: ${textPx(10)};
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #9ce7ff;
}
${M} .bonsai-chats-menu__chat {
  flex: none;
  height: 27px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px 0 7px;
  border-radius: 4px;
  border-left: 3px solid transparent;
  background: rgba(255, 255, 255, 0.04);
  font-size: ${textPx(12)};
  color: #dfe6ee;
  min-width: 0;
}
${M} .bonsai-chats-menu__chat--current {
  border-left-color: ${LIT};
  background: rgba(255, 255, 255, 0.08);
  font-weight: 800;
}
${M} .bonsai-chats-menu__label {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
${M} .bonsai-chats-menu__mark {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  box-sizing: border-box;
}
/* The old row's dot language: solid green for a reply waiting, a hollow cyan ring while still writing. */
${M} .bonsai-chats-menu__mark--unread {
  background: #52d88a;
}
${M} .bonsai-chats-menu__mark--writing {
  border: 1.5px solid #9ce7ff;
}
${M} .bonsai-chats-menu__when {
  margin-left: auto;
  flex: none;
  font-size: ${textPx(10)};
  font-weight: 400;
  color: #8fa8c4;
}
${M} .bonsai-chats-menu__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  margin-top: 4px;
}
${M} .bonsai-chats-menu__action {
  height: 27px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  font-size: ${textPx(11)};
  color: #dfe6ee;
  white-space: nowrap;
  overflow: hidden;
  min-width: 0;
}
${M} .bonsai-chats-menu__action svg {
  flex: none;
  width: 13px;
  height: 13px;
  color: #9fb0c2;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
${M} .bonsai-chats-menu__action--danger,
${M} .bonsai-chats-menu__action--danger svg {
  color: #f16a5a;
}
/* Greyed: still a stop, A does nothing (or, for Save without the permission, A asks for it). */
${M} .bonsai-chats-menu__action--off {
  opacity: 0.45;
}
${M} .bonsai-chats-menu__chat.gpfocus,
${M} .bonsai-chats-menu__action.gpfocus {
  outline: 2px solid rgba(255, 255, 255, 0.85);
  outline-offset: -2px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.55);
}
${M} .bonsai-chats-menu__hint {
  margin: auto 4px 2px;
  padding-top: 6px;
  font-size: ${textPx(10)};
  color: #8fa8c4;
}
`;
