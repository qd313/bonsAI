/**
 * Title: At ten chats, LT and RT never step onto the new-chat spot (plan 87 F2)
 * Purpose: The new-chat spot is an empty chat that becomes a saved one when the first question is asked
 *          there (MainTab.tsx), which makes a new chat. At ten chats that has to go through the picker,
 *          never through a silent create, so the walk with LT and RT stops at the newest chat instead
 *          of reaching the spot. With nine chats the spot is still the first stop, as before.
 * Used for: useChatSwitchActions.ts.
 * Does not: Draw anything; the moves are called on the actions the hook hands the store.
 */
import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

import { chatRow } from "./chatTitleTestFixtures";
import { useChatSwitchActions } from "./useChatSwitchActions";

const chats = (n: number) => Array.from({ length: n }, (_, i) => chatRow(`c${i}`, `Chat ${i}`));

async function press(count: number, step: "previous" | "next", active: string) {
  const setAtCreate = vi.fn();
  const onSelectSlot = vi.fn(async () => undefined);
  const { result } = renderHook(() =>
    useChatSwitchActions({
      summaries: chats(count),
      activeSlotId: active,
      atCreate: false,
      setAtCreate,
      onSelectSlot,
    }),
  );
  await result.current[step]();
  return { setAtCreate, onSelectSlot };
}

describe("LT from the newest chat", () => {
  it("steps onto the new-chat spot while there are fewer than ten chats", async () => {
    const { setAtCreate, onSelectSlot } = await press(9, "previous", "c0");
    expect(setAtCreate).toHaveBeenCalledWith(true);
    expect(onSelectSlot).not.toHaveBeenCalled();
  });

  it("stays on the newest chat at ten chats: the spot would need a new chat", async () => {
    const { setAtCreate, onSelectSlot } = await press(10, "previous", "c0");
    expect(setAtCreate).not.toHaveBeenCalled();
    expect(onSelectSlot).not.toHaveBeenCalled();
  });
});

describe("RT and LT between saved chats at ten", () => {
  it("still walk the chats", async () => {
    const next = await press(10, "next", "c0");
    expect(next.onSelectSlot).toHaveBeenCalledWith("c1");
    const previous = await press(10, "previous", "c4");
    expect(previous.onSelectSlot).toHaveBeenCalledWith("c3");
  });
});
