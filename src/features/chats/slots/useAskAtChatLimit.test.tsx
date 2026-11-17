/**
 * Title: Ask with ten chats saved and none open (P105-TEN-CHATS-ASK-01)
 * Purpose: Pin what the Deck check looks at, with the real Ask code, the real "You have 10 chats" list and the
 *          real Delete chat? box, and a stand-in for Decky's showModal. With ten chats and none open, Ask opens
 *          the list and sends nothing; a pick and Delete removes that chat, makes a fresh one, and only then
 *          sends the question, into the fresh chat; Cancel and B (in the list or the box) send nothing and
 *          leave the question in the box; a screen rebuilt as the boxes close still sends it, once; below ten
 *          chats, or with a chat open, no list opens and the Ask goes as before.
 * Used for: useAskAtChatLimit.tsx, heldAsk.ts, useBonsaiAskOrchestration.ts (the gate).
 * Does not: Open a real Steam box or move Steam's ring: the Deck row does.
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, renderHook } from "@testing-library/react";

const hoisted = vi.hoisted(() => ({ modals: [] as React.ReactElement[], closed: 0 }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../../test-harness/fakeDeckyUi");
  return {
    ...stubs,
    showModal: (el: React.ReactElement) => {
      hoisted.modals.push(el);
      return {
        Close: () => {
          hoisted.closed += 1;
        },
      };
    },
  };
});

import { useBonsaiAskOrchestration, type UseBonsaiAskOrchestrationArgs } from "../../ask/flow/useBonsaiAskOrchestration";
import { askAnyway } from "../../answer/transcript/lowMemoryNotice";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../../../test-harness/fakeDeckyRpc";
import { clearModalReturnFocus, peekModalReturnFocus } from "../../../shared/dpad/modalReturnFocusRegistry";
import { ChatSlotDeleteModal } from "./ChatSlotDeleteModal";
import { ChatSlotPickerModal } from "./ChatSlotPickerModal";
import { resetHeldAsk } from "./heldAsk";
import { useAskAtChatLimit } from "./useAskAtChatLimit";

type Summary = { id: string; label: string; updated_at: number };
const chatsOf = (n: number): Summary[] =>
  Array.from({ length: n }, (_, i) => ({ id: `c${i}`, label: `Chat number ${i}`, updated_at: 1000 - i }));

/** What the Main tab and the chat list hook do at the Deck, reduced to the calls this gate makes. */
type World = {
  order: string[];
  setUnifiedInput: ReturnType<typeof vi.fn>;
  activeSlotIdRef: { current: string | null };
  deleteResult: boolean;
};

function newWorld(active: string | null = null, deleteResult = true): World {
  return { order: [], setUnifiedInput: vi.fn(), activeSlotIdRef: { current: active }, deleteResult };
}

function useWorld(world: World, summaries: Summary[]) {
  const gate = React.useRef<((q: string, o?: { threadQuestionDisplay?: string }) => boolean) | null>(null);
  const args: UseBonsaiAskOrchestrationArgs = {
    desktopDebugNoteAutoSave: false,
    filesystemWrite: false,
    strategySpoilerMaskingEnabled: false,
    askMode: "speed",
    unifiedInput: "where is the key",
    setUnifiedInput: world.setUnifiedInput as unknown as UseBonsaiAskOrchestrationArgs["setUnifiedInput"],
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
    activeSlotIdRef: world.activeSlotIdRef,
    ensureActiveSlotForAsk: async () => world.activeSlotIdRef.current,
    holdAskAtChatLimit: (q, o) => gate.current?.(q, o) ?? false,
  };
  const ask = useBonsaiAskOrchestration(args);
  gate.current = useAskAtChatLimit({
    summaries,
    activeSlotIdRef: world.activeSlotIdRef,
    createSlot: async () => {
      world.order.push("create");
      world.activeSlotIdRef.current = "fresh";
      return { id: "fresh" };
    },
    deleteSlot: async (id) => {
      world.order.push(`delete ${id}`);
      return world.deleteResult;
    },
    ask: ask.onAskOllama,
    onCompleteNestedDeckyModalClose: (close) => close(),
  });
  return ask;
}

const sends = () => getRpcCallLog().filter((c) => c.method === "start_background_game_ai");
const lastModal = () => hoisted.modals.at(-1)!;
const buttonsOf = (el: React.ReactElement) =>
  Array.from(render(el).container.querySelectorAll("button")).map((b) => b as HTMLButtonElement);
const wait = (ms: number) => act(async () => new Promise<void>((r) => setTimeout(r, ms)));

/** Press the nth button of the box on top, found before the press (rendering inside the press finds none). */
async function pressButton(index: number) {
  const button = buttonsOf(lastModal())[index]!;
  await act(async () => {
    fireEvent.click(button);
  });
}

async function pressAsk(world: World, summaries: Summary[]) {
  const hook = renderHook(() => useWorld(world, summaries));
  await act(async () => {
    await hook.result.current.onAskOllama();
  });
  return hook;
}

/** Ask at ten chats, then pick chat 3 in the list: the Delete chat? box is up. */
async function reachDeleteBox(world: World) {
  const hook = await pressAsk(world, chatsOf(10));
  fireEvent.click(buttonsOf(lastModal())[3]!);
  return hook;
}

beforeEach(() => {
  resetFakeDeckyRpc();
  resetHeldAsk();
  clearModalReturnFocus();
  setRpcHandler("start_background_game_ai", () => ({ accepted: true, status: "pending", request_id: 1 }));
  hoisted.modals = [];
  hoisted.closed = 0;
});
afterEach(() => cleanup());

describe("Ask with ten chats saved and none open", () => {
  it("opens the ten-chat list, and sends nothing, makes nothing, deletes nothing, clears nothing", async () => {
    const world = newWorld();
    await pressAsk(world, chatsOf(10));
    expect(lastModal().type).toBe(ChatSlotPickerModal);
    expect(hoisted.modals).toHaveLength(1);
    expect(buttonsOf(lastModal())).toHaveLength(11);
    expect(sends()).toHaveLength(0);
    expect(world.order).toEqual([]);
    expect(world.setUnifiedInput).not.toHaveBeenCalled();
  });

  it("asks for the ring back on the chat's name, as the + button's list does", async () => {
    await pressAsk(newWorld(), chatsOf(10));
    expect(peekModalReturnFocus()).toBe("chat-slot-rename");
  });

  it("a pick opens the Delete chat? box for that chat and still sends nothing", async () => {
    const world = newWorld();
    await reachDeleteBox(world);
    expect(lastModal().type).toBe(ChatSlotDeleteModal);
    expect((lastModal().props as { label: string }).label).toBe("Chat number 3");
    expect(sends()).toHaveLength(0);
  });

  it("Delete removes the chat, makes a fresh one, then sends the question into the fresh chat", async () => {
    const world = newWorld();
    await reachDeleteBox(world);
    await pressButton(0);
    await wait(450);
    expect(world.order).toEqual(["delete c3", "create"]);
    expect(sends()).toHaveLength(1);
    const payload = sends()[0]!.args[0] as { question: string; chat_slot_id?: string };
    expect(payload.question).toBe("where is the key");
    expect(payload.chat_slot_id).toBe("fresh");
    expect(hoisted.closed).toBe(2);
  });

  it("Cancel in the Delete chat? box sends nothing and leaves the question in the box", async () => {
    const world = newWorld();
    await reachDeleteBox(world);
    await pressButton(1);
    await wait(450);
    expect(sends()).toHaveLength(0);
    expect(world.order).toEqual([]);
    expect(world.setUnifiedInput).not.toHaveBeenCalled();
  });

  it("B in the Delete chat? box sends nothing", async () => {
    const world = newWorld();
    await reachDeleteBox(world);
    await act(async () => {
      (lastModal().props as { onKeep: () => void }).onKeep();
    });
    await wait(450);
    expect(sends()).toHaveLength(0);
    expect(world.setUnifiedInput).not.toHaveBeenCalled();
  });

  it("B in the list sends nothing", async () => {
    const world = newWorld();
    await pressAsk(world, chatsOf(10));
    await act(async () => {
      (lastModal().props as { onCancel: () => void }).onCancel();
    });
    await wait(450);
    expect(sends()).toHaveLength(0);
    expect(world.order).toEqual([]);
    expect(world.setUnifiedInput).not.toHaveBeenCalled();
  });

  it("Cancel in the list sends nothing", async () => {
    const world = newWorld();
    await pressAsk(world, chatsOf(10));
    fireEvent.click(buttonsOf(lastModal())[10]!);
    await wait(450);
    expect(sends()).toHaveLength(0);
  });

  it("a delete that did not go through sends nothing", async () => {
    const world = newWorld(null, false);
    await reachDeleteBox(world);
    await pressButton(0);
    await wait(450);
    expect(world.order).toEqual(["delete c3"]);
    expect(sends()).toHaveLength(0);
  });

  it("a question held and cancelled is not sent by a later screen", async () => {
    const world = newWorld();
    const first = await pressAsk(world, chatsOf(10));
    await act(async () => {
      (lastModal().props as { onCancel: () => void }).onCancel();
    });
    await wait(450);
    first.unmount();
    world.activeSlotIdRef.current = "c0";
    renderHook(() => useWorld(world, chatsOf(10)));
    await wait(450);
    expect(sends()).toHaveLength(0);
  });

  it("Ask anyway under the low-memory warning waits for the list, then goes into the fresh chat with its caption", async () => {
    const world = newWorld();
    const hook = renderHook(() => useWorld(world, chatsOf(10)));
    await act(async () => {
      await askAnyway(hook.result.current.onAskOllama, "where is the key", "where is the key");
    });
    expect(lastModal().type).toBe(ChatSlotPickerModal);
    expect(sends()).toHaveLength(0);
    fireEvent.click(buttonsOf(lastModal())[3]!);
    await pressButton(0);
    await wait(450);
    expect(sends()).toHaveLength(1);
    const payload = sends()[0]!.args[0] as { display_question?: string; chat_slot_id?: string };
    expect(payload.chat_slot_id).toBe("fresh");
    expect(payload.display_question).toBe("where is the key");
  });

  it("when the screen is rebuilt as the boxes close, the new screen sends the question, once", async () => {
    const world = newWorld();
    const old = await reachDeleteBox(world);
    await pressButton(0);
    // The old screen is thrown away and a new one built, already on the fresh chat.
    old.unmount();
    renderHook(() => useWorld(world, chatsOf(10)));
    await wait(450);
    expect(sends()).toHaveLength(1);
    expect((sends()[0]!.args[0] as { chat_slot_id?: string }).chat_slot_id).toBe("fresh");
  });
});

describe("Ask when no list is needed", () => {
  it("below ten chats: no list, the question goes as before", async () => {
    const world = newWorld();
    await pressAsk(world, chatsOf(9));
    expect(hoisted.modals).toHaveLength(0);
    expect(sends()).toHaveLength(1);
  });

  it("with a chat open at ten chats: no list, the question goes into that chat", async () => {
    const world = newWorld("c0");
    await pressAsk(world, chatsOf(10));
    expect(hoisted.modals).toHaveLength(0);
    expect(sends()).toHaveLength(1);
    expect((sends()[0]!.args[0] as { chat_slot_id?: string }).chat_slot_id).toBe("c0");
  });
});
