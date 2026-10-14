/**
 * Title: The Search tab leaves no timer behind when it goes away
 * Purpose: After the tab is drawn from outside (Y), it looks again at 150 ms and 450 ms whether the ring is still
 *          on it. If the tab is thrown away inside that wait, no look may run afterwards: a look that outlives
 *          the tab reads the panel's document after it is gone ("error after teardown" in SearchTab.jump.test.tsx
 *          under load, plan 93).
 * Used for: SearchTab.tsx.
 * Does not: Check where the ring goes (SearchTab.jump.test.tsx does).
 */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  listChatSlotQuestions: vi.fn(),
  listUserNotes: vi.fn(),
  saveUserNote: vi.fn(),
  searchRagCorpusNotes: vi.fn(),
}));
const looks = vi.hoisted(() => ({ count: 0 }));
vi.mock("./searchApi", () => api);
vi.mock("@decky/ui", async () => (await import("./searchTabTestKit")).deckyUiForSearch());
vi.mock("../../utils/uiDocument", async (orig) => {
  const real = await orig<typeof import("../../utils/uiDocument")>();
  return {
    ...real,
    uiGamepadFocusElement: () => {
      looks.count++;
      return real.uiGamepadFocusElement();
    },
  };
});

import { SearchTab } from "./SearchTab";
import { openSearchTab, registerSearchTabSwitch, resetSearchJump } from "./searchJumpStore";
import { resetSearchSaved } from "./searchTabStore";
import { CHATS, GAME_NOTES, NOTES } from "./searchTabTestKit";

const NO_PACKS = { aliasSynonym: [], expansion: [] };

beforeEach(() => {
  looks.count = 0;
  resetSearchSaved();
  resetSearchJump();
  api.listChatSlotQuestions.mockReset().mockResolvedValue(CHATS);
  api.listUserNotes.mockReset().mockResolvedValue(NOTES);
  api.searchRagCorpusNotes.mockReset().mockResolvedValue({ installed: true, notes: GAME_NOTES, reason: "" });
});

describe("the arrival look", () => {
  it("runs while the tab stays, and never after it is thrown away", async () => {
    registerSearchTabSwitch(vi.fn());
    openSearchTab();
    const first = render(<SearchTab active isAsking={false} intentPackIndex={NO_PACKS} onSettingClick={vi.fn()} />);
    await screen.findByLabelText("Hollow Knight");
    await new Promise((r) => setTimeout(r, 600));
    expect(looks.count).toBe(2);
    first.unmount();

    looks.count = 0;
    resetSearchJump();
    registerSearchTabSwitch(vi.fn());
    openSearchTab();
    const second = render(<SearchTab active isAsking={false} intentPackIndex={NO_PACKS} onSettingClick={vi.fn()} />);
    second.unmount();
    await new Promise((r) => setTimeout(r, 600));
    expect(looks.count).toBe(0);
  });
});
