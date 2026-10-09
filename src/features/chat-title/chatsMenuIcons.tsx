/**
 * Title: The chats menu's five action icons
 * Purpose: The small line icons beside New chat, Rename chat, Sum up this chat and Save to Desktop note,
 *          copied from the drawing (docs/planning/assets/84-vertical-room.html, `ICON.plus`, `.pencil`,
 *          `.sum`, `.save`), and for Delete chat the bin with two slots the maintainer picked for the old
 *          chat row's Delete (2026-10-02, TrashBinSlotsIcon). Stroked in the text colour;
 *          chatsMenuStyles.ts sizes them.
 * Used for: ChatsMenu.tsx.
 * Solves: Keeps the drawings out of the menu's own file.
 * Does not: Know anything about the menu's state; they are plain pictures.
 */
import React from "react";

import { TrashBinSlotsIcon } from "../../components/icons";
import type { ChatsMenuAction } from "./chatsMenuModel";

const PATHS: Record<Exclude<ChatsMenuAction, "delete">, string[]> = {
  new: ["M12 5v14M5 12h14"],
  rename: ["M4 20h4L19.5 8.5l-4-4L4 16z", "M13.5 6.5l4 4"],
  sumup: ["M5 6h14M5 10h14M5 14h9M5 18h6"],
  save: ["M12 4v11M7 10l5 5 5-5M5 20h14"],
};

export function ChatsMenuIcon({ action }: { action: ChatsMenuAction }): React.ReactElement {
  if (action === "delete") return <TrashBinSlotsIcon size={13} />;
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {PATHS[action].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
