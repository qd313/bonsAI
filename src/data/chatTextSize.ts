/**
 * Title: Chat text size
 *
 * Purpose: The three Text size steps and how the chosen one reaches the screen. Each step is a
 * number written into `--bonsai-chat-text-scale` on the plugin's root; the chat's own styles write
 * their font sizes as `calc(<today's size> * var(--bonsai-chat-text-scale, 1))`, so Normal (1) is
 * exactly today's size.
 *
 * Used for: index.tsx (puts the number on the root) and the chat styles (read it).
 *
 * Solves: Plan 87 call 3. A variable of its own, not the UI scale: the UI scale scales boxes, bars
 * and chips as well, and is going away (plan 86); this one scales only the words in the chat, and
 * will keep working when it does.
 *
 * Why 0.9 / 1 / 1.15: the chat column is 300 px wide and the answer bubble leaves about 240 px for
 * words (92% of the row, less the bubble's and the section's padding). Large turns the 12 px answer
 * into 13.8 px: about 34 letters a line, still room for a 25-letter word, and the answer already
 * breaks any longer word where it must instead of spilling out. A bigger step (1.25) would add a
 * quarter more lines to every answer inside a panel whose answer area is already short. Small turns
 * 12 px into 10.8 px and the smallest line in the details (9 px) into 8.1 px, which is as far down
 * as that text stays readable on the Deck's screen.
 *
 * Does not: Know about the UI scale, or scale anything that is not the chat's words.
 */
import type React from "react";

import type { ChatTextSize } from "./bonsaiSettingsSchema";

export const CHAT_TEXT_SCALE_VAR = "--bonsai-chat-text-scale";

export const CHAT_TEXT_SCALE: Record<ChatTextSize, number> = {
  small: 0.9,
  normal: 1,
  large: 1.15,
};

/** `base` with the chosen step written into it as the chat's text scale. */
export function withChatTextScale(base: React.CSSProperties, size: ChatTextSize): React.CSSProperties {
  return { ...base, [CHAT_TEXT_SCALE_VAR as string]: String(CHAT_TEXT_SCALE[size] ?? 1) };
}
