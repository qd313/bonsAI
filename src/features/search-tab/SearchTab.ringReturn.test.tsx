/**
 * Title: The Search tab hands the ring back through Steam, even to a stop drawn in the same moment
 * Purpose: Pin what the Deck check looks at (plan 93, lane B11; seen once on the Deck 2026-10-12): after a game
 *          note is closed, or a word button pressed, the new matches are drawn in the same moment the ring is
 *          sent to one of them. Steam may not have given that stop its nav node yet. The ring must then end on
 *          the stop (Steam's own marker, not the page's focus) once the node arrives, and must stay where it was
 *          when the node never does, instead of a plain `focus()` that leaves the ring on nothing.
 *          The stand-in here fills each stop's nav node only when the test lets it (the "gate").
 * Used for: useSearchNav.ts and SearchTab.tsx.
 * Does not: Walk the tab with the D-pad (SearchTab.walk.test.tsx) or touch a real back end.
 */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  listChatSlotQuestions: vi.fn(),
  listUserNotes: vi.fn(),
  saveUserNote: vi.fn(),
  searchRagCorpusNotes: vi.fn(),
}));
/** Steam fills a stop's nav node while the gate is open; while it is shut the fill waits for `open()`. */
const gate = vi.hoisted(() => {
  const state = { shut: false, queue: [] as Array<() => void> };
  return {
    state,
    open: () => {
      state.shut = false;
      state.queue.splice(0).forEach((f) => f());
    },
  };
});
vi.mock("./searchApi", () => api);
vi.mock("@decky/ui", async () => {
  const React = await import("react");
  const kit = await import("./searchTabTestKit");
  const base = kit.deckyUiForSearch();
  const Inner = base.Focusable as React.ComponentType<Record<string, unknown>>;
  const Late = React.forwardRef<HTMLDivElement, Record<string, unknown>>(function Late(props, ref) {
    const real = props.navRef as { current: unknown } | undefined;
    if (!real) return React.createElement(Inner, { ...props, ref });
    const local = {
      get current() {
        return real.current;
      },
      set current(v: unknown) {
        if (gate.state.shut) gate.state.queue.push(() => (real.current = v));
        else real.current = v;
      },
    };
    return React.createElement(Inner, { ...props, navRef: local, ref });
  });
  return { ...base, Focusable: Late };
});

import { SearchTab } from "./SearchTab";
import { resetSearchSaved } from "./searchTabStore";
import { CHATS, GAME_NOTES, NOTES, pressOn, ringStop } from "./searchTabTestKit";
import { NAV_WAIT_FRAMES } from "./useSearchNav";
import { putSteamRingOn, type SteamEl } from "../../test-harness/steamRing";

const NO_PACKS = { aliasSynonym: [], expansion: [] };
const tab = () => <SearchTab active isAsking={false} intentPackIndex={NO_PACKS} onSettingClick={vi.fn()} />;

function pressA(label: string | RegExp) {
  const el = screen.getByLabelText(label) as SteamEl;
  act(() => {
    pressOn(el, "onOKButton");
  });
}

/** Lets `n` animation frames pass. */
async function frames(n: number) {
  for (let i = 0; i < n; i++) await act(async () => void (await new Promise((r) => window.requestAnimationFrame(() => r(null)))));
}

beforeEach(() => {
  gate.state.shut = false;
  gate.state.queue = [];
  resetSearchSaved();
  api.listChatSlotQuestions.mockReset().mockResolvedValue(CHATS);
  api.listUserNotes.mockReset().mockResolvedValue(NOTES);
  api.saveUserNote.mockReset();
  api.searchRagCorpusNotes.mockReset().mockResolvedValue({ installed: true, notes: GAME_NOTES, reason: "" });
});
afterEach(() => gate.open());

describe("the ring comes back to a stop drawn in the same moment", () => {
  it("returns to the match after a closed game note, once Steam has given the redrawn stop its node", async () => {
    render(tab());
    await screen.findByLabelText("Hollow Knight");
    pressA(/^mantis, in 5 of your questions/);
    await screen.findByLabelText("A boss note · Hollow Knight");
    pressA("A boss note · Hollow Knight");
    expect(screen.getByLabelText("Close the note")).toBeTruthy();
    gate.state.shut = true;
    pressA("Close the note");
    const row = screen.getByLabelText("A boss note · Hollow Knight");
    /* Drawn, but with no node yet: the ring must not be put on it with a plain focus. */
    expect(ringStop()).not.toBe(row);
    expect(document.activeElement).not.toBe(row);
    await frames(2);
    act(() => gate.open());
    await waitFor(() => expect(ringStop()).toBe(row));
  });

  it("goes to the first match of a new word as soon as that stop has its node", async () => {
    render(tab());
    await screen.findByLabelText("Hollow Knight");
    gate.state.shut = true;
    pressA(/^charm, in 3 of your questions/);
    const first = await screen.findByLabelText(/Which charms are best early on/);
    expect(ringStop()).not.toBe(first);
    expect(document.activeElement).not.toBe(first);
    act(() => gate.open());
    await waitFor(() => expect(ringStop()).toBe(first));
  });

  it("leaves the ring where it was when the stop never gets a node, and does not plain-focus it", async () => {
    const { container } = render(tab());
    await screen.findByLabelText("Hollow Knight");
    /* The ring waits on the find box (a word button's class is rewritten when it is picked, which would drop the marker). */
    const held = screen.getByLabelText("Search for a word");
    act(() => putSteamRingOn(held));
    gate.state.shut = true;
    pressA(/^mantis, in 5 of your questions/);
    await screen.findByLabelText(/Is Greenpath safe/);
    const first = container.querySelector('[data-bonsai-search-group="chats"] ~ .bonsai-search__hit') as HTMLElement;
    expect(first).not.toBeNull();
    await frames(NAV_WAIT_FRAMES + 4);
    expect(ringStop()).toBe(held);
    expect(document.activeElement).not.toBe(first);
    /* The wait is bounded: a node that arrives long after is not chased. */
    act(() => gate.open());
    await frames(3);
    expect(ringStop()).toBe(held);
  });

  it("drops a wait when the person presses something else first", async () => {
    render(tab());
    await screen.findByLabelText("Hollow Knight");
    gate.state.shut = true;
    pressA(/^charm, in 3 of your questions/);
    const first = await screen.findByLabelText(/Which charms are best early on/);
    const box = screen.getByLabelText("Search for a word");
    fireEvent.focus(box);
    act(() => {
      pressOn(box as SteamEl, "onMoveDown");
    });
    act(() => gate.open());
    await frames(2);
    expect(ringStop()).not.toBe(first);
  });
});
