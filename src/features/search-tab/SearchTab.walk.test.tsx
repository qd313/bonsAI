/**
 * Title: Walking the Search tab with the D-pad
 * Purpose: Mount the real tab inside the real tab body root, in a pane that scrolls, and press the D-pad the
 *          way Steam calls the move handlers: Down from the first stop (what the tab bar's Down lands on) to the
 *          last and Up back out to the tab bar, in the two states the tab has (the notes list before a word,
 *          the matches after "mantis"). Steam's own scroll-into-view runs after every landing, modelled three
 *          ways (the Deck's exact rule is not known). The walk is bounded, no stop is visited twice in a leg, no
 *          press is dead, every stop is wholly on screen when it holds the ring, no press turns the page by half
 *          its height, Left and Right along a row reach every stop in it and hold still at both ends, and Up from
 *          the top leaves through the tab bar's nav node.
 * Used for: SearchTab.tsx, useSearchNav.ts, searchNav.ts (plan 92, lane N3; AGENTS.md "Adding a new control").
 * Does not: Know the Deck's real positions (the boxes are the drawing's sizes, laid out here in a column), or
 *           Steam's real spatial walk, which this tab does not use; the Deck row measures the real thing.
 */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  listChatSlotQuestions: vi.fn(),
  listUserNotes: vi.fn(),
  saveUserNote: vi.fn(),
  searchRagCorpusNotes: vi.fn(),
}));
vi.mock("./searchApi", () => api);
vi.mock("@decky/ui", async () => (await import("./searchTabTestKit")).deckyUiForSearch());

import { TabBodyFocusRoot, tabBodyNavFocusId } from "../plugin-shell/TabBodyFocusRoot";
import { SearchTab } from "./SearchTab";
import { resetSearchSaved } from "./searchTabStore";
import { CHATS, GAME_NOTES, NOTES, pressOn, ringStop } from "./searchTabTestKit";
import { registerNavFocus, resetNavFocusRegistry, takeNavFocus } from "../../shared/dpad/navFocusRegistry";
import { MONITOR_PANE_PX, OWN_SCREEN_PANE_PX } from "../../test-harness/tabBodyWalk";
import { putSteamRingOn, type SteamEl } from "../../test-harness/steamRing";

type SteamRule = "nearest" | "centerIfHidden" | "center";
const RULES: SteamRule[] = ["nearest", "centerIfHidden", "center"];

const PANE_TOP = 24;
const STEAM_PAD_TOP = 116;
const STEAM_PAD_BOTTOM = 80;
const WIDTH = 300;

function rect(top: number, left: number, width: number, height: number): DOMRect {
  return { top, bottom: top + height, left, right: left + width, width, height, x: left, y: top, toJSON: () => ({}) } as DOMRect;
}

type Mounted = {
  press: (key: "onMoveUp" | "onMoveDown" | "onMoveLeft" | "onMoveRight") => { moved: boolean; scrolled: number; label: string };
  label: () => string;
  scrollTop: () => number;
  visible: () => boolean;
  stopCount: () => number;
  unmount: () => void;
};

/** The tab in a scrolling pane, laid out in a column at the drawing's sizes, with Steam's scroll after every landing. */
async function mountWalk(viewport: number, steam: SteamRule, word: string): Promise<Mounted> {
  const view = render(
    <div className="Tabs_TabContentsScroll" data-pane="">
      <TabBodyFocusRoot id="search">
        <SearchTab active isAsking={false} intentPackIndex={{ aliasSynonym: [], expansion: [] }} onSettingClick={vi.fn()} />
      </TabBodyFocusRoot>
    </div>,
  );
  await screen.findByLabelText("Hollow Knight");
  if (word) {
    const box = screen.getByLabelText("Search for a word") as HTMLInputElement;
    fireEvent.change(box, { target: { value: word } });
    await waitFor(() => expect(view.container.querySelector('[data-bonsai-search-group="game"]')).not.toBeNull());
  }
  const pane = view.container.querySelector<HTMLElement>("[data-pane]")!;
  const root = pane.querySelector<HTMLElement>(".bonsai-search")!;
  const inset = parseFloat(pane.querySelector<HTMLElement>("[data-bonsai-tab-body-inset]")!.style.height) || 0;

  /* The boxes, in the pane's own coordinates, top to bottom, at the drawing's sizes. */
  const boxes = new Map<HTMLElement, [number, number, number, number]>();
  let y = inset;
  const stack = (el: HTMLElement | null, h: number, gap = 5) => {
    if (el) boxes.set(el, [y, 0, WIDTH, h]);
    y += h + gap;
  };
  const kids = Array.from(root.children) as HTMLElement[];
  for (const kid of kids) {
    if (kid.tagName === "STYLE") continue;
    if (kid.classList.contains("bonsai-search__title")) stack(null, 20);
    else if (kid.classList.contains("bonsai-search__games")) {
      Array.from(kid.children).forEach((g, k) => boxes.set(g as HTMLElement, [y, 6 + k * 74, 70, 22]));
      y += 27;
    } else if (kid.classList.contains("bonsai-search__find")) {
      stack(kid.querySelector("input"), 30);
      for (const row of Array.from(kid.querySelectorAll(".bonsai-search__words"))) {
        Array.from(row.children).forEach((w, k) => boxes.set(w as HTMLElement, [y, 6 + k * 71, 66, 24]));
        y += 29;
      }
    } else if (kid.classList.contains("bonsai-search__hint")) y += 36;
    else if (kid.classList.contains("bonsai-search__notes") || kid.classList.contains("bonsai-search__results")) {
      for (const part of Array.from(kid.children) as HTMLElement[]) {
        if (part.classList.contains("bonsai-search__count")) {
          const clear = part.querySelector<HTMLElement>(".bonsai-search__clear")!;
          boxes.set(clear, [y, 230, 60, 20]);
          y += 25;
        } else if (part.classList.contains("bonsai-search__group")) y += 22;
        else if (part.classList.contains("bonsai-search__hint")) y += 30;
        else stack(part, part.classList.contains("bonsai-search__note") ? 44 : 40, 4);
      }
    }
  }
  const contentHeight = y + 8;

  let scrollTop = 0;
  Object.defineProperty(pane, "scrollTop", {
    configurable: true,
    get: () => scrollTop,
    set: (v: number) => {
      scrollTop = Math.max(0, Math.min(Math.max(0, contentHeight - viewport), v));
    },
  });
  Object.defineProperty(pane, "scrollHeight", { configurable: true, get: () => contentHeight });
  Object.defineProperty(pane, "clientHeight", { configurable: true, value: viewport });
  pane.getBoundingClientRect = () => rect(PANE_TOP, 0, WIDTH, viewport);
  for (const [el, [top, left, width, height]] of boxes) {
    el.getBoundingClientRect = () => rect(PANE_TOP + top - scrollTop, left, width, height);
  }

  const steamScrolls = (el: HTMLElement) => {
    const bandTop = PANE_TOP + STEAM_PAD_TOP;
    const bandBottom = PANE_TOP + viewport - STEAM_PAD_BOTTOM;
    const r = el.getBoundingClientRect();
    if (r.top >= bandTop - 0.5 && r.bottom <= bandBottom + 0.5) return;
    const overlaps = r.bottom > bandTop && r.top < bandBottom;
    if (steam === "nearest" || (steam === "centerIfHidden" && overlaps)) scrollTop += r.top < bandTop ? r.top - bandTop : r.bottom - bandBottom;
    else scrollTop += r.top + r.height / 2 - (PANE_TOP + viewport / 2);
    scrollTop = Math.max(0, Math.min(Math.max(0, contentHeight - viewport), scrollTop));
  };

  act(() => {
    takeNavFocus(tabBodyNavFocusId("search"));
  });
  steamScrolls(ringStop()!);

  const label = () => ringStop()?.getAttribute("aria-label") ?? "";
  const visible = () => {
    const r = ringStop()!.getBoundingClientRect();
    return r.top >= PANE_TOP - 0.5 && r.bottom <= PANE_TOP + viewport + 0.5;
  };
  return {
    press: (key) => {
      const before = ringStop()!;
      const scrollBefore = scrollTop;
      act(() => {
        pressOn(before as SteamEl, key);
      });
      const after = ringStop()!;
      if (after !== before) steamScrolls(after);
      return { moved: after !== before, scrolled: Math.abs(scrollTop - scrollBefore), label: after.getAttribute("aria-label") ?? "" };
    },
    label,
    scrollTop: () => scrollTop,
    visible,
    stopCount: () => boxes.size,
    unmount: () => view.unmount(),
  };
}

let tabBar: { TakeFocus: ReturnType<typeof vi.fn> };

beforeEach(() => {
  resetSearchSaved();
  resetNavFocusRegistry();
  tabBar = { TakeFocus: vi.fn(() => true) };
  registerNavFocus("tab-bar", { current: tabBar });
  api.listChatSlotQuestions.mockReset().mockResolvedValue(CHATS);
  api.listUserNotes.mockReset().mockResolvedValue(NOTES);
  api.saveUserNote.mockReset();
  api.searchRagCorpusNotes.mockReset().mockResolvedValue({ installed: true, notes: GAME_NOTES, reason: "" });
});

afterEach(() => resetNavFocusRegistry());

/** Down to the last row, then Up to the first, and Up once more out of the tab. */
async function legs(viewport: number, steam: SteamRule, word: string) {
  const w = await mountWalk(viewport, steam, word);
  const down: string[] = [w.label()];
  const bound = w.stopCount() + 4;
  const moves: number[] = [];
  let presses = 0;
  for (; presses < bound; presses++) {
    const p = w.press("onMoveDown");
    if (!p.moved) break;
    down.push(p.label);
    moves.push(p.scrolled);
    expect(w.visible(), `${p.label} must be wholly on screen`).toBe(true);
  }
  const lastDownPress = presses;
  const up: string[] = [w.label()];
  for (presses = 0; presses < bound; presses++) {
    const p = w.press("onMoveUp");
    if (!p.moved) break;
    up.push(p.label);
    moves.push(p.scrolled);
    expect(w.visible(), `${p.label} must be wholly on screen`).toBe(true);
  }
  return { w, down, up, moves, lastDownPress, upPresses: presses };
}

describe.each([
  ["before a word is picked", ""],
  ["after 'mantis' is picked", "mantis"],
])("walking the tab %s", (_name, word) => {
  for (const [viewport, screenName] of [[OWN_SCREEN_PANE_PX, "the Deck's own screen"], [MONITOR_PANE_PX, "a monitor"]] as const) {
    for (const steam of RULES) {
      it(`on ${screenName}, Steam's rule "${steam}": Down reaches the last stop and Up the first, no stop twice, none off screen, no press turns the page half its height`, async () => {
        const { w, down, up, moves, lastDownPress, upPresses } = await legs(viewport, steam, word);
        expect(new Set(down).size, "no stop visited twice going Down").toBe(down.length);
        expect(new Set(up).size, "no stop visited twice going Up").toBe(up.length);
        /* Up lands on the stop nearest in x, so it need not retrace Down, but it climbs the same rows to the game row. */
        expect(up).toHaveLength(down.length);
        expect(["All games", "Hollow Knight", "Hades"]).toContain(up[up.length - 1]);
        expect(up[up.length - 2]).toBe("Search for a word");
        expect(down[0]).toBe("All games");
        expect(down[1]).toBe("Search for a word");
        expect(lastDownPress, "the walk ends by holding still, inside its bound").toBeLessThan(w.stopCount() + 4);
        expect(upPresses).toBeLessThan(w.stopCount() + 4);
        expect(Math.max(...moves)).toBeLessThan(viewport / 2);
        /* The press that ended the Up leg was Up from the top row: it left through the tab bar's nav node, once. */
        expect(tabBar.TakeFocus).toHaveBeenCalledTimes(1);
        w.unmount();
      });
    }
  }

  it("Left and Right along every row reach every stop in it and hold still at both ends", async () => {
    const w = await mountWalk(MONITOR_PANE_PX, "nearest", word);
    let rows = 0;
    for (let guard = 0; guard < 60; guard++) {
      const here = w.label();
      const seen = new Set<string>([here]);
      for (let k = 0; k < 8; k++) {
        const p = w.press("onMoveLeft");
        if (!p.moved) break;
        expect(seen.has(p.label), `${p.label} twice going Left`).toBe(false);
        seen.add(p.label);
      }
      expect(w.press("onMoveLeft").moved, "Left holds still at the start of the row").toBe(false);
      const seenRight = new Set<string>([w.label()]);
      for (let k = 0; k < 8; k++) {
        const p = w.press("onMoveRight");
        if (!p.moved) break;
        expect(seenRight.has(p.label), `${p.label} twice going Right`).toBe(false);
        seenRight.add(p.label);
      }
      expect(w.press("onMoveRight").moved, "Right holds still at the end of the row").toBe(false);
      expect(seenRight.size).toBeGreaterThanOrEqual(seen.size);
      rows++;
      const down = w.press("onMoveDown");
      if (!down.moved) break;
    }
    expect(rows).toBeGreaterThan(5);
    w.unmount();
  });
});

describe("no press depends on Steam's flow-children", () => {
  /*
   * On the Deck Steam moves the ring between a Focusable's children only along that container's flow-children,
   * not by where they sit (the About tab's links: a group with no column flow gave Down nowhere to go, and a walk
   * test whose stand-ins moved by geometry passed). Here every stop is wired by hand: it carries all four move
   * handlers, and each one claims the press, so Steam's own flow is never asked. The stand-ins here do not move
   * by geometry at all: a press moves only when the stop's own handler moves it.
   */
  for (const word of ["", "mantis"]) {
    it(`every stop ${word ? "after a word is picked" : "before a word is picked"} carries all four move handlers, and each claims the press`, async () => {
      const w = await mountWalk(MONITOR_PANE_PX, "nearest", word);
      const seen = new Set<string>();
      for (let guard = 0; guard < 200; guard++) {
        const here = ringStop() as SteamEl;
        if (seen.has(w.label())) break;
        seen.add(w.label());
        for (const key of ["onMoveUp", "onMoveDown", "onMoveLeft", "onMoveRight"] as const) {
          expect(typeof here.__nav?.[key], `${w.label()}: ${key}`).toBe("function");
          let claimed: boolean | undefined;
          act(() => {
            claimed = pressOn(here, key);
          });
          expect(claimed, `${w.label()}: ${key} claims the press`).toBe(true);
          /* Back onto the stop under test: the next direction starts from the same place. */
          act(() => {
            putSteamRingOn(here);
          });
        }
        if (!w.press("onMoveDown").moved) break;
      }
      expect(seen.size).toBeGreaterThanOrEqual(8);
      w.unmount();
    });
  }
});

describe("the walk touches every word button", () => {
  it("visits all eight word buttons with Down and Right, each once", async () => {
    const w = await mountWalk(OWN_SCREEN_PANE_PX, "nearest", "");
    const seen: string[] = [w.label()];
    w.press("onMoveDown"); // the find box
    const first = w.press("onMoveDown");
    expect(first.label).toMatch(/^(mantis|charm|claw|greenpath), in /);
    /* To the row's left end, then the whole row, then Down onto the second row and its whole length. */
    while (w.press("onMoveLeft").moved);
    seen.length = 0;
    seen.push(w.label());
    for (let k = 0; k < 3; k++) seen.push(w.press("onMoveRight").label);
    w.press("onMoveDown");
    while (w.press("onMoveLeft").moved);
    seen.push(w.label());
    for (let k = 0; k < 3; k++) seen.push(w.press("onMoveRight").label);
    expect(seen.map((s) => s.split(",")[0])).toEqual(["mantis", "charm", "claw", "greenpath", "lords", "battery", "boon", "build"]);
    expect(new Set(seen).size).toBe(8);
    w.unmount();
  });
});

describe("the walk the Deck did (plan 92, build 649daecc)", () => {
  /*
   * On the Deck, Down on a game button stepped to the next game, Up on a word in the first row stepped to the word
   * before it, and Up from the find box went to the last game. Every one of those presses measured the find box
   * through a `ref` on Steam's text field, which holds the component, not the input; the measuring threw and Steam
   * stepped along its own order. The kit's text field now hands its `ref` the component, as Steam's does, and a
   * throwing handler steps along the page's order, as Steam did.
   */
  it("Down from All lands on the find box, not on the next game", async () => {
    const w = await mountWalk(OWN_SCREEN_PANE_PX, "nearest", "");
    expect(w.label()).toBe("All games");
    expect(w.press("onMoveDown").label).toBe("Search for a word");
    w.unmount();
  });

  it("Down from the third game button lands on the find box", async () => {
    const w = await mountWalk(OWN_SCREEN_PANE_PX, "nearest", "");
    w.press("onMoveRight");
    expect(w.press("onMoveRight").label).toBe("Hades");
    expect(w.press("onMoveDown").label).toBe("Search for a word");
    w.unmount();
  });

  it("Up from the find box lands on All when no game is picked, not on the game the ring last left", async () => {
    const w = await mountWalk(OWN_SCREEN_PANE_PX, "nearest", "");
    w.press("onMoveRight");
    w.press("onMoveRight");
    w.press("onMoveDown");
    expect(w.press("onMoveUp").label).toBe("All games");
    w.unmount();
  });

  it("Up from the find box lands on the picked game", async () => {
    const w = await mountWalk(OWN_SCREEN_PANE_PX, "nearest", "");
    expect(w.press("onMoveRight").label).toBe("Hollow Knight");
    act(() => {
      pressOn(ringStop()!, "onOKButton");
    });
    await waitFor(() => expect(screen.getByLabelText("Hollow Knight").getAttribute("aria-pressed")).toBe("true"));
    /* The stand-in's ring is a class, which the button's new class list (the gold look) wipes; Steam keeps its own. */
    act(() => putSteamRingOn(screen.getByLabelText("Hollow Knight")));
    w.press("onMoveRight");
    w.press("onMoveDown");
    expect(w.label()).toBe("Search for a word");
    expect(w.press("onMoveUp").label).toBe("Hollow Knight");
    w.unmount();
  });

  it("Up from the third word of the first row lands on the find box; Down from it lands on the third word below", async () => {
    const w = await mountWalk(OWN_SCREEN_PANE_PX, "nearest", "");
    const word = (p: { label: string }) => p.label.split(",")[0];
    w.press("onMoveDown");
    expect(word(w.press("onMoveDown"))).toBe("mantis");
    w.press("onMoveRight");
    expect(word(w.press("onMoveRight"))).toBe("claw");
    expect(word(w.press("onMoveDown"))).toBe("boon");
    expect(word(w.press("onMoveUp"))).toBe("claw");
    expect(w.press("onMoveUp").label).toBe("Search for a word");
    w.unmount();
  });
});
