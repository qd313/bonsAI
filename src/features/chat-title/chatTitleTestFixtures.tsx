/**
 * Title: A real Main tab with five saved chats, for the chat title tests
 * Purpose: Test fixture shared by the chat-title tests: the five chats the drawing uses, in the back
 *          end's order (newest first), and a harness that draws the real Main tab with them, keeps
 *          which chat is open the way index.tsx does (selecting a chat makes it the open one), and
 *          records every select, create, rename and delete call it is handed.
 * Used for: the chat-title folder's tests only. Not part of the plugin.
 * Solves: Each of those tests needs the same real Main tab, not a hand-made copy of its graph.
 * Does not: Draw the title view; each test mounts that itself, as its own root, the way Decky does.
 */
import React, { useState } from "react";

import { MainTab, type MainTabProps } from "../../components/MainTab";
import type { ChatListRow } from "../chat-sum-up/chatSumUpModel";

export function chatRow(id: string, label: string, updated_at = 0): ChatListRow {
  return { id, label, created_at: 0, updated_at };
}

/** The drawing's five chats (84-vertical-room.html, `CHATS`), newest first, with letters for ids. */
export const FIVE_CHATS: ChatListRow[] = [
  chatRow("a", "Hades build"),
  chatRow("b", "Boss help"),
  chatRow("c", "Battery life"),
  chatRow("d", "Ollama on PC"),
  chatRow("e", "Second boss, phase two strategy"),
];

export type MainTabCalls = {
  selected: Array<string | null>;
  created: number;
  renamed: Array<[string, string]>;
  deleted: string[];
};

export function newMainTabCalls(): MainTabCalls {
  return { selected: [], created: 0, renamed: [], deleted: [] };
}

/** The props the Main tab needs to draw, with an empty chat on screen. */
export function baseMainTabProps(): MainTabProps {
  return {
    fullBleedRowStyle: {},
    isAsking: false,
    selectedAttachment: null,
    ollamaContext: {},
    unifiedInput: "",
    showSlowWarning: false,
    latencyWarningSeconds: 30,
    ollamaResponse: "",
    elapsedSeconds: null,
    lastApplied: null,
    canSaveDesktopNote: false,
    onOpenDesktopNoteSave: () => {},
    askMode: "strategy",
    askThreadCollapsed: [],
    askThreadDisplayQuestion: "",
    onAskOllama: async () => {},
    chatSlotSummaries: FIVE_CHATS,
    activeChatSlotId: "b",
    onChatSlotCreate: async () => undefined,
    onChatSlotSelect: async () => undefined,
    onChatSlotRename: async () => true,
    onChatSlotDelete: async () => true,
    suggestedPrompts: [],
    filteredSettings: [],
    recentScreenshots: [],
  } as unknown as MainTabProps;
}

/** The real Main tab, keeping the open chat as index.tsx does, and recording what it is asked to do. */
export function MainTabHarness({
  calls,
  startOn = "b",
  overrides = {},
}: {
  calls: MainTabCalls;
  startOn?: string | null;
  overrides?: Partial<MainTabProps>;
}): React.ReactElement {
  const [active, setActive] = useState<string | null>(startOn);
  return (
    <MainTab
      {...baseMainTabProps()}
      activeChatSlotId={active}
      onChatSlotSelect={async (id) => {
        calls.selected.push(id);
        setActive(id);
      }}
      onChatSlotCreate={async () => {
        calls.created += 1;
      }}
      onChatSlotRename={async (id, label) => {
        calls.renamed.push([id, label]);
        return true;
      }}
      onChatSlotDelete={async (id) => {
        calls.deleted.push(id);
        return true;
      }}
      {...overrides}
    />
  );
}
