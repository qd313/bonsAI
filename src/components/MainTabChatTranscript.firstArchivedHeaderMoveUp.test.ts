/**
 * Title: First archived header: Up leaves for the stop above the chat
 * Purpose: Pin the fix for roadmap "Up skips the answer sections and the chat slot row" (the
 *          archived-header half) — Up from the first archived header must hand the ring to the
 *          stop above the chat through the registry, the same shape the preset chips' `exitUp` uses.
 *          That stop was the chat slot row; plan 84 step 5 removed the row, and it is the tab bar now.
 * Used for: MainTabChatTranscript.tsx's firstArchivedHeaderMoveUp(turnIndex), wired onto
 *           buildTurnHeaderElement's new onMoveUp prop for the archived-turn header.
 * Solves: With the archive expanded, Up from the first archived header ran 18 presses to the tab
 *         bar and Decky's back button without the chat slot row ever taking the ring, though two
 *         Downs reach it normally (measured 2026-09-04). `turnIndex` (renderIndex plus the pill's
 *         offset) is 0 only for the header that genuinely has nothing rendered above it.
 * Does not: Prove the fix on-device. The Deck check this owes: with the archive expanded, put the
 *           ring on the first archived question and press Up — it should land on the tab bar (the
 *           chat slot row before plan 84 step 5), not walk out of the plugin.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { firstArchivedHeaderMoveUp } from "./MainTabChatTranscript";
import { registerNavFocus, unregisterNavFocus, resetNavFocusRegistry } from "../utils/navFocusRegistry";

/** Stands in for whatever Steam populates a `navRef.current` with once a Focusable mounts. */
function fakeNavHolder(result = true) {
  return { current: { TakeFocus: vi.fn(() => result) } };
}

afterEach(() => {
  resetNavFocusRegistry();
});

describe("firstArchivedHeaderMoveUp", () => {
  it("is undefined for any header that is not the first — Up keeps its ordinary default", () => {
    expect(firstArchivedHeaderMoveUp(1)).toBeUndefined();
    expect(firstArchivedHeaderMoveUp(2)).toBeUndefined();
  });

  it("hands Up from the first header to the tab bar above the chat, the saved-chats row being gone", () => {
    const holder = fakeNavHolder(true);
    registerNavFocus("tab-bar", holder);

    const onMoveUp = firstArchivedHeaderMoveUp(0);
    expect(onMoveUp).toBeTypeOf("function");
    expect(onMoveUp!()).toBe(true);
    expect(holder.current.TakeFocus).toHaveBeenCalledWith(true);

    unregisterNavFocus("tab-bar", holder);
  });

  it("reports the press unhandled when nothing is registered above the chat", () => {
    const onMoveUp = firstArchivedHeaderMoveUp(0);
    expect(onMoveUp!()).toBe(false);
  });
});
