/**
 * Title: How many chats the plugin keeps
 *
 * Purpose: The one number the screen compares the chat list against to know New chat must ask which
 * chat to drop. It is the back end's own `MAX_CHAT_SLOTS` (chat_slot_service.py), written down here
 * because the screen cannot import Python. The back end is the real guard: at this many chats it
 * refuses to make another, whatever the screen thinks.
 *
 * Used for: useStartNewChat.tsx, useChatSwitchActions.ts.
 *
 * Does not: Delete or make a chat, or enforce anything.
 */
export const MAX_CHAT_SLOTS = 10;
