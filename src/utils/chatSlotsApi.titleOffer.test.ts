/**
 * Title: What the screen sends the back end for the title offer's two choices
 * Purpose: The back end tells a title typed by hand from a yes to the offer by these exact fields
 *          (`from_title_offer`, `keep_title_offer` on the ordinary `rename_chat_slot` call), so the
 *          shape is pinned here: a plain rename carries neither, a yes carries the first, and Keep
 *          carries the second with no label at all (it must never be able to rename).
 * Used for: renameChatSlot and keepChatTitle in chatSlotsApi.ts.
 * Does not: Run the back end; tests/test_chat_summary_title.py proves what it does with them.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const call = vi.hoisted(() => ({ fn: vi.fn(async (..._a: unknown[]) => ({ ok: true, slot: { id: "s", label: "x", turns: [] } })) }));
vi.mock("./deckyCall", () => ({ callDeckyWithTimeout: (...a: unknown[]) => call.fn(...a) }));

import { keepChatTitle, renameChatSlot } from "./chatSlotsApi";

beforeEach(() => call.fn.mockClear());

describe("the rename call's payload", () => {
  it("a title typed by hand carries no offer field", async () => {
    await renameChatSlot("s", "my name");
    expect(call.fn).toHaveBeenCalledWith("rename_chat_slot", [{ slot_id: "s", label: "my name" }]);
  });

  it("a yes to the offer says so", async () => {
    await renameChatSlot("s", "Half-Life 2 weapons", { fromTitleOffer: true });
    expect(call.fn).toHaveBeenCalledWith("rename_chat_slot", [
      { slot_id: "s", label: "Half-Life 2 weapons", from_title_offer: true },
    ]);
  });

  it("Keep sends no label, so it can never rename", async () => {
    expect(await keepChatTitle("s")).toBe(true);
    const payload = (call.fn.mock.calls[0]![1] as Array<Record<string, unknown>>)[0]!;
    expect(payload).toEqual({ slot_id: "s", keep_title_offer: true });
    expect(payload).not.toHaveProperty("label");
  });
});
