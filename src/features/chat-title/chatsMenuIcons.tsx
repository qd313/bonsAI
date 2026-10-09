/**
 * Title: The chats menu's five action icons
 * Purpose: The small line icons beside New chat, Rename chat, Sum up this chat, Save to Desktop note and
 *          Delete chat, copied from the drawing (docs/planning/assets/84-vertical-room.html, `ICON.plus`,
 *          `.pencil`, `.sum`, `.save`, `.trash`). Stroked in the text colour; chatsMenuStyles.ts sizes them.
 * Used for: ChatsMenu.tsx.
 * Solves: Keeps the drawings out of the menu's own file.
 * Does not: Know anything about the menu's state; they are plain pictures.
 */
import React from "react";

import type { ChatsMenuAction } from "./chatsMenuModel";

const PATHS: Record<ChatsMenuAction, string[]> = {
  new: ["M12 5v14M5 12h14"],
  rename: ["M4 20h4L19.5 8.5l-4-4L4 16z", "M13.5 6.5l4 4"],
  sumup: ["M5 6h14M5 10h14M5 14h9M5 18h6"],
  save: ["M12 4v11M7 10l5 5 5-5M5 20h14"],
  delete: ["M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6"],
};

export function ChatsMenuIcon({ action }: { action: ChatsMenuAction }): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {PATHS[action].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
