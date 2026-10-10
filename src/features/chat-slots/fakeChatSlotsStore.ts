/**
 * Title: A pretend chat store with real-looking waits, for the box-then-rebuild tests
 * Purpose: Stands in for the back end's chat calls (utils/chatSlotsApi.ts) in the tests that open a Delete
 *          box and then rebuild the whole plugin behind it. Chats live in a list, newest first, and every
 *          call takes a little while and reads the list when it ENDS, as the real back end does: a delete
 *          that is still on its way when the rebuilt plugin asks for the chat is the race the Deck showed.
 * Used for: afterDeleteRebuild.test.tsx (through afterBoxHarness.tsx) only. Not part of the plugin.
 * Does not: Keep summaries, or grow a chat: a chat the test seeded has one question and one answer that
 *           name it ("Question in <label>") unless its name starts with "Empty"; a chat the plugin makes is empty.
 */
import type { ChatSlot, ChatSlotSummary } from "../../utils/chatSlotsApi";

/** How long each call takes, in milliseconds (the test uses fake timers, so this costs nothing). */
export const FAKE_CHAT_WAIT = { list: 5, get: 5, create: 5, delete: 30 };

let chats: ChatSlot[] = [];
let clock = 1000;
let made = 0;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Starts over with these chats, newest first. */
export function seedFakeChats(labels: string[]): ChatSlot[] {
  clock = 1000 + labels.length;
  made = 0;
  chats = labels.map((label, i) => ({
    id: `chat-${label.replace(/\W+/g, "-").toLowerCase()}`,
    label,
    created_at: 1000 + labels.length - i,
    updated_at: 1000 + labels.length - i,
    /* A chat whose name starts with "Empty" has nothing asked in it yet. */
    turns: label.startsWith("Empty")
      ? []
      : [
          { id: `q-${i}`, role: "user" as const, text: `Question in ${label}` },
          { id: `a-${i}`, role: "assistant" as const, text: `Answer in ${label}` },
        ],
  }));
  return chats;
}

/** The ids of the chats that exist right now, newest first. */
export function fakeChatIds(): string[] {
  return chats.map((c) => c.id);
}

const summary = (c: ChatSlot): ChatSlotSummary => ({
  id: c.id,
  label: c.label,
  created_at: c.created_at,
  updated_at: c.updated_at,
});

export const fakeChatSlotsApi = {
  listChatSlots: async (): Promise<ChatSlotSummary[]> => {
    await wait(FAKE_CHAT_WAIT.list);
    return chats.map(summary);
  },
  getChatSlot: async (id: string): Promise<ChatSlot | null> => {
    await wait(FAKE_CHAT_WAIT.get);
    return chats.find((c) => c.id === id) ?? null;
  },
  /** Refuses an eleventh chat, as the back end does. */
  createChatSlot: async (): Promise<ChatSlot | null> => {
    await wait(FAKE_CHAT_WAIT.create);
    if (chats.length >= 10) return null;
    made += 1;
    clock += 1;
    const slot: ChatSlot = { id: `chat-new-${made}`, label: "New chat", created_at: clock, updated_at: clock, turns: [] };
    chats = [slot, ...chats];
    return slot;
  },
  deleteChatSlot: async (id: string): Promise<boolean> => {
    await wait(FAKE_CHAT_WAIT.delete);
    const had = chats.some((c) => c.id === id);
    chats = chats.filter((c) => c.id !== id);
    return had;
  },
  renameChatSlot: async () => null,
  keepChatTitle: async () => true,
  sumUpChatSlot: async () => ({ ok: false }),
};
