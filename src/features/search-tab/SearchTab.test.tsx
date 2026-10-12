/**
 * Title: The Search tab, as a person uses it
 * Purpose: Mount the whole tab against a stand-in back end and pin what the Deck check looks at: the game
 *          row (All, then each game the chats mention); the eight word buttons with their counts; the notes
 *          list with its switches before a word is picked; A on "mantis" listing the matches in the four
 *          groups in order with the word lit and the ring on the first; Clear; a game narrowing the chats,
 *          the notes and the game notes; a note's switch saving and going back when it is refused; A on a
 *          chat match only saying the jump comes next; A on a setting opening it; a game note's neutral title
 *          until A, then its own words, and the ring coming back to its row after the tab is rebuilt; the
 *          game notes absent when the library is not installed; the lists read when the tab opens and when an
 *          answer ends.
 * Used for: SearchTab.tsx and the files beside it (plan 92, lane N3).
 * Does not: Walk the whole tab with the D-pad (SearchTab.walk.test.tsx) or touch a real back end.
 */
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
import { resetSearchSaved } from "./searchTabStore";
import { CHATS, GAME_NOTES, NOTES, pressOn, ringLabel, ringStop } from "./searchTabTestKit";
import type { SteamEl } from "../../test-harness/steamRing";

const NO_PACKS = { aliasSynonym: [], expansion: [] };

function tab(over: Partial<SearchTabProps> = {}) {
  return <SearchTab active isAsking={false} intentPackIndex={NO_PACKS} onSettingClick={vi.fn()} {...over} />;
}

/** A on the stop with this aria-label (or one that starts with it). */
function pressA(label: string | RegExp) {
  const el = screen.getByLabelText(label) as SteamEl;
  act(() => {
    pressOn(el, "onOKButton");
  });
}

const stopLabels = (container: HTMLElement, selector: string) =>
  Array.from(container.querySelectorAll(selector)).map((el) => el.getAttribute("aria-label"));

async function mountLoaded(over: Partial<SearchTabProps> = {}) {
  const view = render(tab(over));
  await screen.findByLabelText("Hollow Knight");
  return view;
}

beforeEach(() => {
  resetSearchSaved();
  api.listChatSlotQuestions.mockReset().mockResolvedValue(CHATS);
  api.listUserNotes.mockReset().mockResolvedValue(NOTES);
  api.saveUserNote.mockReset().mockImplementation(async ({ id, on }: { id: string; on: boolean }) => ({
    ok: true,
    note: { ...NOTES.find((n) => n.id === id)!, on },
  }));
  api.searchRagCorpusNotes.mockReset().mockResolvedValue({ installed: true, notes: GAME_NOTES, reason: "" });
});

describe("before a word is picked", () => {
  it("draws the game row: All, then each game the chats mention, the most asked about first", async () => {
    const { container } = await mountLoaded();
    expect(stopLabels(container, ".bonsai-search__game")).toEqual(["All games", "Hollow Knight", "Hades"]);
    expect(container.querySelector(".bonsai-search__game--on")?.textContent).toBe("All");
  });

  it("draws eight word buttons in two rows of four, each with its count", async () => {
    const { container } = await mountLoaded();
    const rows = Array.from(container.querySelectorAll("[data-bonsai-search-word-row]"));
    expect(rows).toHaveLength(2);
    const text = (row: Element) => Array.from(row.querySelectorAll(".bonsai-search__word")).map((b) => b.textContent);
    expect(text(rows[0]!)).toEqual(["mantis5", "charm3", "claw2", "greenpath2"]);
    expect(text(rows[1]!)).toEqual(["lords2", "battery1", "boon1", "build1"]);
  });

  it("lists every note the person kept, newest first, each with its switch, and the line about how notes are made", async () => {
    const { container } = await mountLoaded();
    await screen.findByLabelText(/Steel Soul/);
    const notes = Array.from(container.querySelectorAll(".bonsai-search__note"));
    expect(notes.map((n) => n.querySelector(".bonsai-search__hit-title")?.textContent)).toEqual([
      "I'm on a Steel Soul run (one life).",
      "No spoilers past the City of Tears, unless the mantis.",
      "Skip the story bits; I've seen them.",
      "I play with the back buttons mapped to dash.",
    ]);
    expect(notes.map((n) => n.querySelector(".bonsai-search__switch--on") !== null)).toEqual([true, false, true, true]);
    expect(container.querySelector(".bonsai-search__group small")?.textContent).toBe("3 on");
    expect(container.textContent).toContain("Ask reads the ones that are on. New notes come from what you say in a chat.");
  });

  it("narrows the notes to the picked game and keeps the ones for every game", async () => {
    const { container } = await mountLoaded();
    await screen.findByLabelText(/Steel Soul/);
    pressA("Hades");
    await waitFor(() => expect(container.querySelectorAll(".bonsai-search__note")).toHaveLength(2));
    expect(stopLabels(container, ".bonsai-search__note").map((l) => l!.split(",")[0])).toEqual([
      "Skip the story bits; I've seen them.",
      "I play with the back buttons mapped to dash.",
    ]);
  });

  it("says plainly when there are no notes", async () => {
    api.listUserNotes.mockResolvedValue([]);
    const { container } = await mountLoaded();
    await waitFor(() => expect(container.textContent).toContain("You have not kept any notes yet."));
  });

  it("flips a note's switch at once and saves it with its id and the new state", async () => {
    const { container } = await mountLoaded();
    await screen.findByLabelText(/Steel Soul/);
    pressA(/Steel Soul/);
    expect(api.saveUserNote).toHaveBeenCalledWith({ id: "n-4", on: false });
    expect(container.querySelector(".bonsai-search__note .bonsai-search__switch--on")).not.toBeNull();
    await waitFor(() => expect(container.querySelectorAll(".bonsai-search__switch--on")).toHaveLength(2));
  });

  it("puts the switch back and tells the person in the back end's own words when the save is refused", async () => {
    api.saveUserNote.mockResolvedValue({ ok: false, error: "That note is gone." });
    const { container } = await mountLoaded();
    await screen.findByLabelText(/Steel Soul/);
    pressA(/Steel Soul/);
    await waitFor(() => expect(toaster.toast).toHaveBeenCalledWith(expect.objectContaining({ body: "That note is gone." })));
    expect(container.querySelectorAll(".bonsai-search__switch--on")).toHaveLength(3);
  });
});

describe("picking a word", () => {
  async function pickMantis() {
    const view = await mountLoaded();
    pressA(/^mantis, in 5 of your questions/);
    await waitFor(() => expect(view.container.querySelector('[data-bonsai-search-group="game"]')).not.toBeNull());
    return view;
  }

  it("counts the matches and lists them in four groups in order: chats, notes, settings, game and help notes", async () => {
    const intentPackIndex = { aliasSynonym: [{ term: "mantis", target: "Settings > Display > Brightness", kind: "alias" as const }], expansion: [] };
    api.listChatSlotQuestions.mockResolvedValue(CHATS);
    const view = await mountLoaded({ intentPackIndex });
    pressA(/^mantis, in 5 of your questions/);
    await waitFor(() => expect(view.container.querySelector('[data-bonsai-search-group="game"]')).not.toBeNull());
    const ids = Array.from(view.container.querySelectorAll("[data-bonsai-search-group]")).map((g) => g.getAttribute("data-bonsai-search-group"));
    expect(ids).toEqual(["chats", "notes", "settings", "game"]);
    expect(view.container.querySelector(".bonsai-search__count-text")?.textContent).toBe("9 matches for “mantis”");
  });

  it("lights the word in each match, and shows the chat's name and the day under a chat match", async () => {
    const { container } = await pickMantis();
    const chatRows = Array.from(container.querySelectorAll(".bonsai-search__hit")).slice(0, 5);
    expect(chatRows).toHaveLength(5);
    for (const row of chatRows) {
      expect(row.querySelector(".bonsai-search__hit-title mark")?.textContent?.toLowerCase()).toBe("mantis");
    }
    const sub = chatRows[0]!.querySelector("small")!.textContent!;
    expect(sub.startsWith("Hollow Knight help · ")).toBe(true);
    expect(container.querySelector('[data-bonsai-search-group="chats"] small')?.textContent).toBe("5");
  });

  it("puts the ring on the first match", async () => {
    await pickMantis();
    expect(ringLabel().startsWith("Where do I find the Mantis Claw?")).toBe(true);
  });

  it("does not search for one letter, and searches as a word is typed", async () => {
    const { container } = await mountLoaded();
    const box = screen.getByLabelText("Search for a word") as HTMLInputElement;
    fireEvent.change(box, { target: { value: "s" } });
    expect(container.querySelector("[data-bonsai-search-results]")).toBeNull();
    fireEvent.change(box, { target: { value: "soul" } });
    await waitFor(() => expect(container.querySelector(".bonsai-search__count-text")?.textContent).toContain("for “soul”"));
    await waitFor(() => expect(api.searchRagCorpusNotes).toHaveBeenLastCalledWith("soul", ""));
    expect(api.searchRagCorpusNotes).not.toHaveBeenCalledWith("s", "");
  });

  it("says Nothing has the word, with Clear still there, when nothing holds it", async () => {
    api.searchRagCorpusNotes.mockResolvedValue({ installed: true, notes: [], reason: "" });
    const { container } = await mountLoaded();
    fireEvent.change(screen.getByLabelText("Search for a word"), { target: { value: "zzzz" } });
    expect(container.querySelector(".bonsai-search__count-text")?.textContent).toBe("Nothing has “zzzz”");
    expect(screen.getByLabelText("Clear the search")).toBeTruthy();
  });

  it("Clear empties the box, brings the notes list back and puts the ring on the find box", async () => {
    const { container } = await pickMantis();
    pressA("Clear the search");
    expect((screen.getByLabelText("Search for a word") as HTMLInputElement).value).toBe("");
    expect(container.querySelector("[data-bonsai-search-results]")).toBeNull();
    expect(container.querySelector("[data-bonsai-search-notes]")).not.toBeNull();
    expect(ringLabel()).toBe("Search for a word");
  });

  it("A on a chat match does nothing but say the jump comes in the next step", async () => {
    await pickMantis();
    const before = (toaster.toast as ReturnType<typeof vi.fn>).mock.calls.length;
    pressA(/^Where do I find the Mantis Claw\?/);
    expect(toaster.toast).toHaveBeenCalledTimes(before + 1);
    expect(toaster.toast).toHaveBeenLastCalledWith(expect.objectContaining({ body: "Jumping to a chat comes in the next step" }));
    expect(api.saveUserNote).not.toHaveBeenCalled();
  });

  it("A on a note match flips its switch and nothing else", async () => {
    await pickMantis();
    pressA(/^No spoilers past the City of Tears/);
    expect(api.saveUserNote).toHaveBeenCalledWith({ id: "n-3", on: true });
  });

  it("A on a setting opens it in Steam, as the Main tab's card did", async () => {
    const onSettingClick = vi.fn();
    await mountLoaded({ onSettingClick });
    fireEvent.change(screen.getByLabelText("Search for a word"), { target: { value: "brightness" } });
    const row = await screen.findByLabelText("Brightness, Settings > Display");
    expect(row.querySelector("small")?.textContent).toBe("Settings > Display");
    pressA("Brightness, Settings > Display");
    expect(onSettingClick).toHaveBeenCalledWith("Settings > Display > Brightness");
  });
});

describe("a game narrows the matches", () => {
  it("narrows the chats, the notes and the game notes to the picked game", async () => {
    api.searchRagCorpusNotes.mockImplementation(async (_word: string, game: string) => ({
      installed: true,
      notes: game === "Hollow Knight" ? GAME_NOTES : [],
      reason: "",
    }));
    const { container } = await mountLoaded();
    pressA("Hades");
    pressA(/^mantis, in 1 of your questions/);
    await waitFor(() => expect(api.searchRagCorpusNotes).toHaveBeenLastCalledWith("mantis", "Hades"));
    const ids = () => Array.from(container.querySelectorAll("[data-bonsai-search-group]")).map((g) => g.getAttribute("data-bonsai-search-group"));
    expect(ids()).toEqual(["chats"]);
    expect(container.querySelector(".bonsai-search__count-text")?.textContent).toBe("1 match for “mantis”");
    pressA("Hollow Knight");
    await waitFor(() => expect(ids()).toEqual(["chats", "notes", "game"]));
    expect(container.querySelector('[data-bonsai-search-group="chats"] small')?.textContent).toBe("4");
    expect(api.searchRagCorpusNotes).toHaveBeenLastCalledWith("mantis", "Hollow Knight");
  });

  it("makes the word buttons from the narrowed questions", async () => {
    const { container } = await mountLoaded();
    pressA("Hades");
    const labels = () => Array.from(container.querySelectorAll(".bonsai-search__word-text")).map((e) => e.textContent);
    expect(labels()).toEqual(["battery", "boon", "build", "dash", "frame", "limit", "mantis", "save"]);
  });
});

describe("the game and help notes", () => {
  async function openGroup() {
    const view = await mountLoaded();
    pressA(/^mantis, in 5 of your questions/);
    await waitFor(() => expect(view.container.querySelector('[data-bonsai-search-group="game"]')).not.toBeNull());
    return view;
  }

  it("shows a note whose name holds the word by name and snippet, and any other by a neutral title with no snippet", async () => {
    const { container } = await openGroup();
    const rows = Array.from(container.querySelectorAll('[data-bonsai-search-group="game"] ~ .bonsai-search__hit'));
    expect(rows).toHaveLength(2);
    expect(rows[0]!.querySelector(".bonsai-search__hit-title")?.textContent).toBe("Mantis Lords");
    expect(rows[0]!.querySelector("small")?.textContent).toBe("Three lords, two at once.");
    expect(rows[1]!.querySelector(".bonsai-search__hit-title")?.textContent).toBe("A boss note · Hollow Knight");
    expect(rows[1]!.querySelector("small")).toBeNull();
    expect(container.textContent).not.toContain("Sanctum Warden");
    expect(container.textContent).not.toContain("The mantis wait here too.");
  });

  it("A opens a note in its own words, with its real name, and Close puts the ring back on its row", async () => {
    const { container } = await openGroup();
    pressA("A boss note · Hollow Knight");
    expect(container.querySelector("[data-bonsai-search-sheet]")).not.toBeNull();
    expect(container.querySelector(".bonsai-search__sheet-name")?.textContent).toBe("Sanctum Warden");
    expect(container.textContent).toContain("Spoiler text of the Warden.");
    expect(container.querySelector("[data-bonsai-search-results]")).toBeNull();
    expect(ringLabel()).toBe("Close the note");
    pressA("Close the note");
    expect(container.querySelector("[data-bonsai-search-sheet]")).toBeNull();
    expect(ringLabel()).toBe("A boss note · Hollow Knight");
  });

  it("B on the note goes back the same way", async () => {
    const { container } = await openGroup();
    pressA("Mantis Lords, Three lords, two at once.");
    act(() => {
      pressOn(screen.getByLabelText("Mantis Lords, the note") as SteamEl, "onCancelButton");
    });
    expect(container.querySelector("[data-bonsai-search-sheet]")).toBeNull();
    expect(ringLabel()).toBe("Mantis Lords, Three lords, two at once.");
  });

  it("comes back to the same word, game and open note when the tab is rebuilt, and Close still finds the row", async () => {
    const first = await openGroup();
    pressA("A boss note · Hollow Knight");
    first.unmount();
    const second = render(tab());
    expect(second.container.querySelector("[data-bonsai-search-sheet]")).not.toBeNull();
    pressA("Close the note");
    expect((screen.getByLabelText("Search for a word") as HTMLInputElement).value).toBe("mantis");
    await waitFor(() => expect(second.container.querySelector('[data-bonsai-search-group="game"]')).not.toBeNull());
    await waitFor(() => expect(ringLabel()).toBe("A boss note · Hollow Knight"));
  });

  it("leaves the group out when the library is not installed, and says nothing about it", async () => {
    api.searchRagCorpusNotes.mockResolvedValue({ installed: false, notes: [], reason: "The knowledge library is not installed." });
    const { container } = await mountLoaded();
    pressA(/^mantis, in 5 of your questions/);
    await waitFor(() => expect(api.searchRagCorpusNotes).toHaveBeenCalled());
    await waitFor(() => expect(container.querySelector('[data-bonsai-search-group="notes"]')).not.toBeNull());
    expect(container.querySelector('[data-bonsai-search-group="game"]')).toBeNull();
    expect(container.textContent).not.toContain("not installed");
  });
});

describe("when the lists are read", () => {
  it("reads the chats and the notes when the tab opens, and again when an answer finishes", async () => {
    const view = await mountLoaded({ isAsking: false });
    expect(api.listChatSlotQuestions).toHaveBeenCalledTimes(1);
    expect(api.listUserNotes).toHaveBeenCalledTimes(1);
    view.rerender(tab({ isAsking: true }));
    expect(api.listChatSlotQuestions).toHaveBeenCalledTimes(1);
    view.rerender(tab({ isAsking: false }));
    await waitFor(() => expect(api.listChatSlotQuestions).toHaveBeenCalledTimes(2));
    expect(api.listUserNotes).toHaveBeenCalledTimes(2);
  });

  it("reads nothing while the tab is not the one showing, and reads when it becomes so", async () => {
    const view = render(tab({ active: false }));
    await act(async () => {});
    expect(api.listChatSlotQuestions).not.toHaveBeenCalled();
    view.rerender(tab({ active: true }));
    await screen.findByLabelText("Hollow Knight");
    expect(api.listChatSlotQuestions).toHaveBeenCalledTimes(1);
  });

  it("shows no word buttons and no games before any chat has been read, and does not fall over", async () => {
    api.listChatSlotQuestions.mockResolvedValue([]);
    const { container } = render(tab());
    await waitFor(() => expect(api.listUserNotes).toHaveBeenCalled());
    expect(container.querySelectorAll(".bonsai-search__word")).toHaveLength(0);
    expect(within(container).getByLabelText("All games")).toBeTruthy();
    expect(ringStop()).toBeNull();
  });
});
