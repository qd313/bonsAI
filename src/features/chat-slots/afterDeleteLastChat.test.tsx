/**
 * Title: After the last chat is deleted, Main is the blank new-chat view (plan 93 lane B8)
 * Purpose: Pin what the Deck check looks at. The only chat has an answer; it is deleted through the Delete chat
 *          box and the plugin screen is thrown away and rebuilt around the box (as Decky does, both as the box
 *          opens and as it closes). The rebuilt screen reads the back end's stored answer on start. This
 *          stand-in back end still holds that answer (the worst case: an older back end, or a read that landed
 *          before the delete did), so the screen alone must show an empty new-chat view: no answer, and no "..."
 *          question bubble over one.
 * Used for: useChatSlots.ts (no-chat reload), useBonsaiAskOrchestration.ts (`applyBackgroundStatusToUi`).
 * Does not: Prove the back end drops the answer (tests/test_delete_chat_forgets_answer.py does).
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "@testing-library/react";

const hoisted = vi.hoisted(() => ({ world: null as null | { showBox: (el: React.ReactElement) => { Close: () => void } } }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../test-harness/steamRing");
  return { ...stubs, Focusable: SteamRingFocusable, showModal: (el: React.ReactElement) => hoisted.world!.showBox(el) };
});
vi.mock("../settings/settingsPayload", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../settings/settingsPayload")>()),
  toBonsaiSettingsPayload: () => ({}),
}));
vi.mock("../../utils/chatSlotsApi", async () => (await import("./fakeChatSlotsStore")).fakeChatSlotsApi);

import { DeckyWorld, type AskLayerArgs, type RebuildWhen } from "./afterBoxHarness";
import { fakeChatIds, seedFakeChats } from "./fakeChatSlotsStore";
import { ChatSlotDeleteModal } from "./ChatSlotDeleteModal";
import { useBonsaiAskOrchestration } from "../../hooks/useBonsaiAskOrchestration";
import { resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";
import { idleBackgroundStatusFixture } from "../../test-harness/rpcFixtures";
import { resetChatTitleStore } from "../chat-title/chatTitleStore";
import { resetChatNameNav } from "../chat-title/chatNameNav";
import { resetChatRowIconNav } from "../chat-title/chatRowIconNav";
import { resetChatRowActions } from "../chat-title/chatRowActions";
import { resetDeckyTitleParts } from "../chat-title/deckyTitleParts";
import { resetNavFocusRegistry } from "../../utils/navFocusRegistry";
import { clearBonsaiSessionSurvival } from "../../utils/bonsaiSessionSurvival";
import { clearModalReturnFocus, resetModalReturnFocusRegistry } from "../../shared/dpad/modalReturnFocusRegistry";
import { saveActiveChatSlotId } from "../plugin-shell/pluginStorage";
import { putSteamRingOn, type SteamEl } from "../../test-harness/steamRing";

let world: DeckyWorld | null = null;
const ANSWER = "Tap L1 as it swings.";

const advance = async (ms: number) => {
  for (let done = 0; done < ms; done += 10) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
  }
};

/* The real Ask hook, wired as index.tsx wires it, with only what the hook cannot do without. */
const useRealAsk = ({ activeSlotIdRef, onSlotTurnsChanged }: AskLayerArgs) =>
  useBonsaiAskOrchestration({
    desktopDebugNoteAutoSave: false,
    filesystemWrite: false,
    strategySpoilerMaskingEnabled: false,
    askMode: "speed",
    unifiedInput: "",
    setUnifiedInput: vi.fn(),
    unifiedInputPersistenceMode: "no_persist",
    effectiveOllamaPcIp: "127.0.0.1:11434",
    selectedAttachment: null,
    setSelectedAttachment: vi.fn(),
    syncSettingsFromDisk: vi.fn(async () => undefined),
    unifiedInputFieldLayerRef: { current: null },
    unifiedInputHostRef: { current: null },
    setNavigationMessage: vi.fn(),
    saveIp: vi.fn(),
    useLocalKnowledgeBase: false,
    activeSlotIdRef,
    onSlotTurnsChanged,
  });

/** The back end's stored last answer, as it was for the chat `ofChat`; held until the test says otherwise. */
function storeAnswerOf(ofChat: string) {
  setRpcHandler("get_background_game_ai_status", () => ({
    ...idleBackgroundStatusFixture(),
    status: "completed",
    success: true,
    request_id: 9,
    question: "how do I parry?",
    response: ANSWER,
    chat_slot_id: ofChat,
  }));
}

async function openWorld(when: RebuildWhen, labels: string[], open: string): Promise<DeckyWorld> {
  seedFakeChats(labels);
  saveActiveChatSlotId(`chat-${open}`);
  world = new DeckyWorld(when, useRealAsk);
  hoisted.world = world;
  await advance(300);
  return world;
}

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
  resetFakeDeckyRpc();
  resetChatTitleStore();
  resetChatNameNav();
  resetChatRowIconNav();
  resetChatRowActions();
  resetDeckyTitleParts();
  resetNavFocusRegistry();
  resetModalReturnFocusRegistry();
  clearModalReturnFocus();
  clearBonsaiSessionSurvival();
});
afterEach(() => {
  world?.dispose();
  world = null;
  hoisted.world = null;
  vi.useRealTimers();
});

describe.each<RebuildWhen>(["as the box opens", "as the box closes"])(
  "the plugin screen is rebuilt %s",
  (when) => {
    it("deleting the last chat leaves the blank new-chat view: no answer and no '...' bubble", async () => {
      storeAnswerOf("chat-empty-only");
      const w = await openWorld(when, ["Empty only"], "empty-only");
      /* Before the delete, the chat that owns the answer is open and shows it. */
      expect(w.screen.textContent).toContain(ANSWER);

      putSteamRingOn(w.q(".bonsai-chat-title__name"));
      act(() => (w.q(".bonsai-chat-title__icon--delete") as SteamEl).__nav!.onOKButton!());
      await advance(50);
      expect(w.box.type).toBe(ChatSlotDeleteModal);
      act(() => (w.box.props as { onDelete: () => void }).onDelete());
      await advance(2000);

      expect(fakeChatIds()).toEqual([]);
      expect(w.screen.textContent).not.toContain(ANSWER);
      expect(w.screen.textContent).not.toContain("…");
      expect(w.screen.textContent).not.toContain("...");
      expect(w.threadShown()).toBe("");
    });
  },
);
