/**
 * Title: The Search tab's end of the jump into a chat and the way back
 * Purpose: Pin what the Search tab does on its side of plan 92 block 5: A on a chat match remembers the word, the
 *          game and the match and asks the plugin root to open that chat (no more "comes in the next step"
 *          toast); when the tab is drawn again after the Back line, the same word and game are in the box and
 *          Steam's ring goes to the same match once the chats have been read, even if the tab is thrown away and
 *          drawn a second time before it landed; and when it is opened by Y the ring goes to the find box.
 * Used for: SearchTab.tsx, useSearchJump.ts, searchJumpStore.ts.
 * Does not: Draw the chat or the Back line (MainTabChatTranscript.searchJump.test.tsx does).
 */
import { act, render, screen, waitFor } from "@testing-library/react";
import { toaster } from "@decky/api";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  listChatSlotQuestions: vi.fn(),
  listUserNotes: vi.fn(),
  saveUserNote: vi.fn(),
  searchRagCorpusNotes: vi.fn(),
}));
vi.mock("./searchApi", () => api);
vi.mock("@decky/ui", async () => (await import("./searchTabTestKit")).deckyUiForSearch());

import { SearchTab, type SearchTabProps } from "./SearchTab";
import { getSearchJump, openSearchTab, registerSearchTabSwitch, resetSearchJump, startSearchJump, backToSearch } from "./searchJumpStore";
import { readSearchSaved, resetSearchSaved } from "./searchTabStore";
import { CHATS, GAME_NOTES, NOTES, pressOn, ringLabel } from "./searchTabTestKit";
import type { SteamEl } from "../../test-harness/steamRing";

const NO_PACKS = { aliasSynonym: [], expansion: [] };
const tab = (over: Partial<SearchTabProps> = {}) => (
  <SearchTab active isAsking={false} intentPackIndex={NO_PACKS} onSettingClick={vi.fn()} {...over} />
);

function pressA(label: string | RegExp) {
  const el = screen.getByLabelText(label) as SteamEl;
  act(() => {
    pressOn(el, "onOKButton");
  });
}

const CLAW = /^Where do I find the Mantis Claw\?/;

beforeEach(() => {
  resetSearchSaved();
  resetSearchJump();
  api.listChatSlotQuestions.mockReset().mockResolvedValue(CHATS);
  api.listUserNotes.mockReset().mockResolvedValue(NOTES);
  api.saveUserNote.mockReset();
  api.searchRagCorpusNotes.mockReset().mockResolvedValue({ installed: true, notes: GAME_NOTES, reason: "" });
  (toaster.toast as ReturnType<typeof vi.fn>).mockClear();
});

async function pickMantis(over: Partial<SearchTabProps> = {}) {
  const view = render(tab(over));
  await screen.findByLabelText("Hollow Knight");
  pressA(/^mantis, in 5 of your questions/);
  await waitFor(() => expect(view.container.querySelector('[data-bonsai-search-group="game"]')).not.toBeNull());
  return view;
}

describe("A on a chat match", () => {
  it("remembers the word, the game and the match, and asks the root to open that chat, with no toast", async () => {
    const onOpenChat = vi.fn();
    await pickMantis({ onOpenChat });
    pressA(CLAW);
    expect(onOpenChat).toHaveBeenCalledTimes(1);
    expect(onOpenChat).toHaveBeenCalledWith("hk");
    expect(getSearchJump()).toEqual({
      slotId: "hk",
      turnId: "hk2",
      matchKey: "chat:hk:hk2",
      word: "mantis",
      game: null,
      revealPending: true,
      revealUntil: expect.any(Number),
    });
    expect(toaster.toast).not.toHaveBeenCalled();
  });

  it("keeps the picked game with the jump", async () => {
    const onOpenChat = vi.fn();
    const view = render(tab({ onOpenChat }));
    await screen.findByLabelText("Hollow Knight");
    pressA("Hollow Knight");
    pressA(/^mantis, in 4 of your questions/);
    await waitFor(() => expect(view.container.querySelector('[data-bonsai-search-group="chats"]')).not.toBeNull());
    pressA(CLAW);
    expect(getSearchJump()).toMatchObject({ slotId: "hk", game: "Hollow Knight", word: "mantis" });
  });
});

describe("coming back from the chat", () => {
  /** What the Back line leaves behind: the jump ended, the word and game saved, the match to put the ring on. */
  function pressBack(): void {
    registerSearchTabSwitch(() => {});
    startSearchJump({ slotId: "hk", turnId: "hk2", matchKey: "chat:hk:hk2", word: "mantis", game: "Hollow Knight" });
    expect(backToSearch()).toBe(true);
  }

  it("draws the tab with the same word and game and puts the ring on the same match once the chats are read", async () => {
    pressBack();
    expect(readSearchSaved()).toMatchObject({ typed: "mantis", game: "Hollow Knight" });
    render(tab());
    expect((await screen.findByLabelText("Search for a word") as HTMLInputElement).value).toBe("mantis");
    await waitFor(() => expect(ringLabel()).toMatch(CLAW));
    expect(getSearchJump()).toBeNull();
  });

  it("still lands the ring on the match when the tab is thrown away and drawn again before it did", async () => {
    pressBack();
    const first = render(tab());
    first.unmount();
    render(tab());
    await waitFor(() => expect(ringLabel()).toMatch(CLAW));
  });

  it("lands once: a later redraw of the tab does not pull the ring back to the match", async () => {
    pressBack();
    const view = render(tab());
    await waitFor(() => expect(ringLabel()).toMatch(CLAW));
    act(() => {
      pressOn(screen.getByLabelText("Search for a word") as SteamEl, "onMoveDown");
    });
    const where = ringLabel();
    view.rerender(tab({ isAsking: true }));
    view.rerender(tab({ isAsking: false }));
    await act(async () => {});
    expect(ringLabel()).toBe(where);
  });
});

describe("opened by Y", () => {
  it("puts the ring on the find box", async () => {
    registerSearchTabSwitch(() => {});
    expect(openSearchTab()).toBe(true);
    render(tab());
    await waitFor(() => expect(ringLabel()).toBe("Search for a word"));
  });
});
