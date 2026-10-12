/**
 * Title: The Search tab
 *
 * Purpose: The tab to the left of Main with a magnifier on it (plan 90, § 2b): one place to find a word
 * across a person's chats, their notes, the Steam settings bonsAI can open and the knowledge library's
 * game notes. This first piece is the tab itself with its heading; the body (the game row, the find box
 * with its word buttons, the matches and the notes list) comes next.
 *
 * Used for: useSearchTabPayload.tsx, which index.tsx mounts as the first tab.
 *
 * Solves: Gives the tab a place in the strip and in the tab bar before its body exists, so the order of
 * the tabs, LB and RB wrapping and the bar's room for seven tabs can be built and checked on their own.
 *
 * Does not: Search anything yet.
 */
import React from "react";

import { textPx } from "../../styles/sections/textPx";

export const SearchTab: React.FC = () => (
  <div className="bonsai-search-tab" data-bonsai-search-tab="true">
    <div
      style={{
        padding: "4px 8px 6px",
        fontSize: textPx(10),
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "#a8b4c4",
      }}
    >
      Search
    </div>
  </div>
);
