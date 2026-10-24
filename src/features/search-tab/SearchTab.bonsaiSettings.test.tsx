/**
 * Title: The Search tab finds bonsAI's own settings
 * Purpose: Pin what a person sees when they search for one of bonsAI's own settings (plan 96, lane N2): "mic" lists
 *          Voice input in a "bonsAI settings" group above Steam's "Settings" group; "spoiler" lists Story spoilers;
 *          "text size" lists Text size; "brightness" lists only Steam's rows; Steam's group keeps the rows and the
 *          order it had; one letter searches nothing; the count line counts the new rows too; every new row is a
 *          stop that carries and claims all four moves and the D-pad walks down through it into Steam's rows in
 *          order and back; A on a row switches to the setting's tab (opening its section and landing the ring is
 *          bonsaiSettingJump.test.ts).
 * Used for: SearchTab.tsx, SearchResults.tsx, bonsaiSettingsIndex.ts.
 * Does not: Draw Steam's rows differently (searchModel.test.ts), or check the jump past the tab switch (bonsaiSettingJump.test.ts).
 */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
import { matchSettings } from "./searchModel";
import { registerSearchTabSwitch, resetSearchJump } from "./searchJumpStore";
import { resetSearchSaved } from "./searchTabStore";
import { CHATS, NOTES, pressOn, ringLabel } from "./searchTabTestKit";
import type { SteamEl } from "../../test-harness/steamRing";

const NO_PACKS = { aliasSynonym: [], expansion: [] };

async function searchFor(word: string) {
  const view = render(<SearchTab active isAsking={false} intentPackIndex={NO_PACKS} onSettingClick={vi.fn()} />);
  await screen.findByLabelText("Hollow Knight");
  fireEvent.change(screen.getByLabelText("Search for a word"), { target: { value: word } });
  await waitFor(() => expect(view.container.querySelector("[data-bonsai-search-results]")).not.toBeNull());
  return view;
}

const groupIds = (c: HTMLElement) => Array.from(c.querySelectorAll("[data-bonsai-search-group]")).map((g) => g.getAttribute("data-bonsai-search-group"));
/** A group's rows: the hits between its heading and the next heading. */
function rowsOf(c: HTMLElement, id: string): HTMLElement[] {
  const out: HTMLElement[] = [];
  let el = c.querySelector(`[data-bonsai-search-group="${id}"]`)?.nextElementSibling ?? null;
  while (el && !el.hasAttribute("data-bonsai-search-group")) {
    if (el.classList.contains("bonsai-search__hit")) out.push(el as HTMLElement);
    el = el.nextElementSibling;
  }
  return out;
}
const rowTitles = (c: HTMLElement, id: string) => rowsOf(c, id).map((r) => r.querySelector(".bonsai-search__hit-title")?.textContent ?? "");

beforeEach(() => {
  resetSearchSaved();
  resetSearchJump();
  api.listChatSlotQuestions.mockReset().mockResolvedValue(CHATS);
  api.listUserNotes.mockReset().mockResolvedValue(NOTES);
  api.saveUserNote.mockReset();
  api.searchRagCorpusNotes.mockReset().mockResolvedValue({ installed: false, notes: [], reason: "" });
});

describe("a word that is one of bonsAI's own settings", () => {
  it("lists Voice input for mic, in a bonsAI settings group above Steam's Settings group", async () => {
    const { container } = await searchFor("mic");
    const ids = groupIds(container);
    expect(ids).toContain("bonsai");
    expect(ids).toContain("settings");
    expect(ids.indexOf("bonsai")).toBeLessThan(ids.indexOf("settings"));
    expect(rowTitles(container, "bonsai")).toContain("Voice input");
    expect(rowTitles(container, "bonsai")[0]).toBe("Voice input");
    expect(container.querySelector('[data-bonsai-search-group="bonsai"]')?.textContent).toContain("bonsAI settings");
    const row = screen.getByLabelText("Voice input, bonsAI Settings > Voice input");
    expect(row.querySelector("small")?.textContent).toBe("bonsAI Settings > Voice input");
  });

  it("lists Story spoilers for spoiler", async () => {
    const { container } = await searchFor("spoiler");
    /* A kept note mentions spoilers too (the fixture's), so it is listed as well; the bonsAI row is the only one in its group. */
    expect(groupIds(container)).toEqual(["notes", "bonsai"]);
    expect(rowTitles(container, "bonsai")).toEqual(["Story spoilers"]);
  });

  it("lists Text size for text size", async () => {
    const { container } = await searchFor("text size");
    expect(rowTitles(container, "bonsai")).toEqual(["Text size"]);
  });

  it("lists only Steam's rows for brightness", async () => {
    const { container } = await searchFor("brightness");
    expect(groupIds(container)).toEqual(["settings"]);
  });

  it("does not search for one letter", async () => {
    const view = render(<SearchTab active isAsking={false} intentPackIndex={NO_PACKS} onSettingClick={vi.fn()} />);
    await screen.findByLabelText("Hollow Knight");
    fireEvent.change(screen.getByLabelText("Search for a word"), { target: { value: "m" } });
    expect(view.container.querySelector('[data-bonsai-search-group="bonsai"]')).toBeNull();
  });

  it("leaves Steam's group exactly as it was: the same rows in the same order", async () => {
    const { container } = await searchFor("mic");
    const expected = matchSettings("mic", NO_PACKS).map((s) => s.title);
    expect(expected.length).toBeGreaterThan(1);
    expect(rowTitles(container, "settings")).toEqual(expected);
    expect(container.querySelector('[data-bonsai-search-group="settings"] small')?.textContent).toBe(String(expected.length));
  });

  it("counts the new rows in the line over the matches", async () => {
    const { container } = await searchFor("mic");
    const own = rowTitles(container, "bonsai").length;
    const steam = rowTitles(container, "settings").length;
    expect(own).toBeGreaterThanOrEqual(2);
    expect(container.querySelector(".bonsai-search__count-text")?.textContent).toBe(`${own + steam} matches for “mic”`);
  });

  it("stays out of the way of a chat match for the same word", async () => {
    const { container } = await searchFor("mantis");
    expect(groupIds(container)).not.toContain("bonsai");
  });
});

describe("the new rows are stops like the others", () => {
  it("every row carries all four move handlers, and each claims the press", async () => {
    const { container } = await searchFor("mic");
    const rows = rowsOf(container, "bonsai");
    expect(rows.length).toBeGreaterThanOrEqual(2);
    for (const row of rows) {
      for (const key of ["onMoveUp", "onMoveDown", "onMoveLeft", "onMoveRight"] as const) {
        const el = row as SteamEl;
        expect(typeof el.__nav?.[key], `${row.getAttribute("aria-label")}: ${key}`).toBe("function");
        let claimed: boolean | undefined;
        act(() => {
          claimed = pressOn(el, key);
        });
        expect(claimed, `${row.getAttribute("aria-label")}: ${key}`).toBe(true);
      }
    }
  });

  it("Down walks from the Clear button through the bonsAI rows into Steam's rows, in order, and Up comes back", async () => {
    const { container } = await searchFor("mic");
    expect(rowsOf(container, "bonsai").length).toBeGreaterThanOrEqual(2);
    const expected = [...rowsOf(container, "bonsai"), ...rowsOf(container, "settings")].map((r) => r.getAttribute("aria-label")!);
    act(() => {
      pressOn(screen.getByLabelText("Clear the search") as SteamEl, "onMoveDown");
    });
    const visited: string[] = [];
    for (let i = 0; i < expected.length; i++) {
      visited.push(ringLabel());
      act(() => {
        pressOn(screen.getByLabelText(ringLabel()) as SteamEl, "onMoveDown");
      });
    }
    expect(visited).toEqual(expected);
    for (let i = visited.length - 1; i > 0; i--) {
      act(() => {
        pressOn(screen.getByLabelText(ringLabel()) as SteamEl, "onMoveUp");
      });
      expect(ringLabel()).toBe(visited[i - 1]);
    }
  });
});

describe("A on a row", () => {
  it("goes to the tab the setting lives on, with the shell's own tab switch", async () => {
    const switchTab = vi.fn();
    registerSearchTabSwitch(switchTab);
    await searchFor("mic");
    act(() => {
      pressOn(screen.getByLabelText("Voice input, bonsAI Settings > Voice input") as SteamEl, "onOKButton");
    });
    expect(switchTab).toHaveBeenCalledWith("settings");
    act(() => {
      pressOn(screen.getByLabelText("Voice input (microphone), bonsAI Permissions") as SteamEl, "onOKButton");
    });
    expect(switchTab).toHaveBeenLastCalledWith("permissions");
  });
});
