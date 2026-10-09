/**
 * Title: The chats menu's stops, moves and words
 *
 * Purpose: The pure half of the chats menu (plan 84 step 5, the drawing's `chatSheet` and frame "R4"):
 * which stops it has and in what order, where each D-pad press goes from each of them, and the short
 * "when" written beside each chat. The menu lists every saved chat, newest first, then five actions in
 * a two-column grid, as drawn:
 *
 *     Your chats
 *     [ chat 1                     now ]
 *     [ chat 2 (current, lit edge)  2 h ]
 *     ...
 *     [ New chat        ] [ Rename chat          ]
 *     [ Sum up this chat ] [ Save to Desktop note ]
 *     [ Delete chat     ]
 *
 * Used for: ChatsMenu.tsx.
 *
 * Solves: Keeps the walk testable on its own, away from React and Steam: every stop is reachable, the
 * ends hold still, and no press can send the ring out of the menu except the two ways back to the
 * chat's name (Up from the first chat, B).
 *
 * Does not: Move anything or know which actions are greyed out. A greyed action is still a stop (A on it
 * does nothing), like the Session tab's greyed Sum up button, so the grid never changes shape.
 */

export type ChatsMenuAction = "new" | "rename" | "sumup" | "save" | "delete";

/** The actions in reading order, with their place in the two-column grid. */
export const CHATS_MENU_ACTIONS: ReadonlyArray<{ id: ChatsMenuAction; label: string; row: number; col: 0 | 1 }> = [
  { id: "new", label: "New chat", row: 0, col: 0 },
  { id: "rename", label: "Rename chat", row: 0, col: 1 },
  { id: "sumup", label: "Sum up this chat", row: 1, col: 0 },
  { id: "save", label: "Save to Desktop note", row: 1, col: 1 },
  { id: "delete", label: "Delete chat", row: 2, col: 0 },
];

export type MenuDirection = "up" | "down" | "left" | "right";

/** Where a press goes: another stop (by index), back to the chat's name, or nowhere (held still). */
export type MenuMove = { to: number } | "leave" | "hold";

/**
 * Stops are numbered: the chats first (0 to chatCount - 1, newest first), then the actions in reading
 * order. In: how many chats, which stop the ring is on, and the press. Out: where it goes.
 *
 * - Chats: Up and Down walk the list; Up from the first chat leaves for the name (it is right above);
 *   Down from the last chat enters the grid on New chat. Left and Right hold still (nothing beside).
 * - Actions: the grid. Up and Down keep the column when the row above or below has one, else take the
 *   left one; Up from the top row goes to the last chat (or the name with no chats); Down from the last
 *   row holds. Left and Right cross the row and hold at its ends.
 */
export function chatsMenuMove(chatCount: number, at: number, dir: MenuDirection): MenuMove {
  if (at < chatCount) {
    if (dir === "left" || dir === "right") return "hold";
    if (dir === "up") return at === 0 ? "leave" : { to: at - 1 };
    return { to: at + 1 };
  }
  const here = CHATS_MENU_ACTIONS[at - chatCount];
  if (!here) return "hold";
  const find = (row: number, col: number) => CHATS_MENU_ACTIONS.findIndex((a) => a.row === row && a.col === col);
  const inRow = (row: number, col: number) => {
    const exact = find(row, col);
    return exact >= 0 ? exact : find(row, 0);
  };
  if (dir === "left" || dir === "right") {
    const i = find(here.row, dir === "left" ? 0 : 1);
    return i >= 0 && i !== at - chatCount ? { to: chatCount + i } : "hold";
  }
  if (dir === "up") {
    if (here.row === 0) return chatCount > 0 ? { to: chatCount - 1 } : "leave";
    return { to: chatCount + inRow(here.row - 1, here.col) };
  }
  const below = inRow(here.row + 1, here.col);
  return below >= 0 ? { to: chatCount + below } : "hold";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * The "when" beside a chat, as drawn: "now", "5 min", "2 h", "yesterday", a weekday within the week,
 * else the date ("Sep 30"). In: when the chat last changed, in seconds since 1970 (the back end's
 * `updated_at`), and now in milliseconds. Out: the words, or "" for a chat with no time.
 */
export function chatWhenLabel(updatedAtSeconds: number, nowMs: number = Date.now()): string {
  if (!(updatedAtSeconds > 0)) return "";
  const at = new Date(updatedAtSeconds * 1000);
  const minutes = Math.floor((nowMs - at.getTime()) / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} h`;
  const now = new Date(nowMs);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const days = Math.ceil((startOfToday - at.getTime()) / 86_400_000);
  if (days <= 1) return "yesterday";
  if (days < 7) return DAYS[at.getDay()]!;
  return `${MONTHS[at.getMonth()]} ${at.getDate()}`;
}
