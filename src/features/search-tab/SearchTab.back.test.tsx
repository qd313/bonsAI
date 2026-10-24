/**
 * Title: B on the Search tab goes back to the tab the person came from
 * Purpose: Pin plan 92 block 5's "B on the Search tab returns to the tab you came from": B pressed on any stop of
 *          the tab (a game button, the find box, a word, a match, a note) is heard by the tab itself, switches
 *          to the tab noted when Search opened (Main when none was), and is claimed so it cannot close Quick
 *          Access; the open game note's own B still closes the note and does not leave the tab.
 * Used for: SearchTab.tsx, searchJumpStore.ts (leaveSearchTab).
 * Does not: Switch tabs for real (the test's switch records the tab asked for); the payload hook's test covers
 *           the noting of the tab before Search.
 */
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  listChatSlotQuestions: vi.fn(),
  listUserNotes: vi.fn(),
  saveUserNote: vi.fn(),
  searchRagCorpusNotes: vi.fn(),
}));
vi.mock("./searchApi", () => api);
vi.mock("@decky/ui", async () => (await import("./searchTabTestKit")).deckyUiForSearch());

import { SearchTab } from "./SearchTab";
import { noteTabBeforeSearch, registerSearchTabSwitch, resetSearchJump } from "./searchJumpStore";
import { resetSearchSaved } from "./searchTabStore";
import { CHATS, GAME_NOTES, NOTES, pressOn } from "./searchTabTestKit";
import type { SteamEl } from "../../test-harness/steamRing";

const NO_PACKS = { aliasSynonym: [], expansion: [] };
const tab = () => <SearchTab active isAsking={false} intentPackIndex={NO_PACKS} onSettingClick={vi.fn()} />;

/**
 * B as Steam delivers it: the stop that has the ring first, then each container around it, until one claims it.
 * True when one did (a claimed B is not left to close Quick Access).
 */
function pressB(el: HTMLElement): boolean {
  let at: HTMLElement | null = el;
  let claimed = false;
  act(() => {
    while (at && !claimed) {
      const handler = (at as SteamEl).__nav?.onCancelButton;
      if (handler && handler({ preventDefault: () => {} }) === true) claimed = true;
      at = at.parentElement;
    }
  });
  return claimed;
}

let switched: string[];

beforeEach(() => {
  resetSearchSaved();
  resetSearchJump();
  switched = [];
  registerSearchTabSwitch((id) => switched.push(id));
  api.listChatSlotQuestions.mockReset().mockResolvedValue(CHATS);
  api.listUserNotes.mockReset().mockResolvedValue(NOTES);
  api.saveUserNote.mockReset();
  api.searchRagCorpusNotes.mockReset().mockResolvedValue({ installed: true, notes: GAME_NOTES, reason: "" });
});

async function mountLoaded() {
  const view = render(tab());
  await screen.findByLabelText("Hollow Knight");
  return view;
}

describe("B on the Search tab", () => {
  it("from Main: B on a game button, a word, the find box and a note goes back to Main, and is claimed", async () => {
    noteTabBeforeSearch("main");
    await mountLoaded();
    await screen.findByLabelText(/Steel Soul/);
    for (const label of ["Hollow Knight", /^mantis, in 5 of your questions/, "Search for a word", /Steel Soul/]) {
      switched.length = 0;
      expect(pressB(screen.getByLabelText(label))).toBe(true);
      expect(switched).toEqual(["main"]);
    }
  });

  it("from About (the bumpers wrap round to Search): B goes back to About", async () => {
    noteTabBeforeSearch("about");
    await mountLoaded();
    expect(pressB(screen.getByLabelText("All games"))).toBe(true);
    expect(switched).toEqual(["about"]);
  });

  it("goes to Main when nobody noted where the person came from", async () => {
    await mountLoaded();
    expect(pressB(screen.getByLabelText("All games"))).toBe(true);
    expect(switched).toEqual(["main"]);
  });

  it("on a match under a picked word it goes back too", async () => {
    noteTabBeforeSearch("settings");
    const view = await mountLoaded();
    act(() => {
      pressOn(screen.getByLabelText(/^mantis, in 5 of your questions/) as SteamEl, "onOKButton");
    });
    await waitFor(() => expect(view.container.querySelector('[data-bonsai-search-group="game"]')).not.toBeNull());
    expect(pressB(screen.getByLabelText(/^Where do I find the Mantis Claw\?/))).toBe(true);
    expect(switched).toEqual(["settings"]);
  });

  it("the open game note's own B closes the note and does not leave the tab", async () => {
    noteTabBeforeSearch("main");
    const view = await mountLoaded();
    act(() => {
      pressOn(screen.getByLabelText(/^mantis, in 5 of your questions/) as SteamEl, "onOKButton");
    });
    await waitFor(() => expect(view.container.querySelector('[data-bonsai-search-group="game"]')).not.toBeNull());
    act(() => {
      pressOn(screen.getByLabelText("Mantis Lords, Three lords, two at once.") as SteamEl, "onOKButton");
    });
    expect(view.container.querySelector("[data-bonsai-search-sheet]")).not.toBeNull();
    expect(pressB(screen.getByLabelText("Mantis Lords, the note"))).toBe(true);
    expect(view.container.querySelector("[data-bonsai-search-sheet]")).toBeNull();
    expect(switched).toEqual([]);
  });
});
