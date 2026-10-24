/**
 * Title: The suggestion chips while the panel's page has lost the browser's focus (plan 97, L14 round two)
 * Purpose: Pin the Deck's second finding of row P97-L14-FREEZE (workshop:test-evidence/plan97-P97-L14-FREEZE.json,
 *          plan97-P97-L14-FREEZE-up-dead.png) at the level the Deck check looks at, where Steam's ring is: with the
 *          page's focus gone and a game up, Up from the chips ("How do I use Nitra?") moved only the page's focus
 *          onto the notes block "Starting out in Hollow Knight" while the ring stayed on the chip, twelve presses
 *          running, and Left and Right only moved the page's focus between chip and block.
 * Used for: presetRowFocusNav.tsx and presetRowNav.ts (the chips' moves), focusPerTurnRow.ts (the rows above the
 *           dock, Steam's transfer first), buildKbNotesBlockElement.tsx (the notes block's own nav node).
 * Solves: The real chip row (its focus root and its D-pad graph) and the real notes block are drawn inside a page
 *         whose focus a test takes away (lostFocusPanel.tsx), with the block inside the newest turn's slot the way
 *         the transcript draws it. Every press must either reach its stop by Steam's transfer or be declined, so
 *         Steam's own step (the chip beside it, along the row) moves the ring; the ring and the page's focus agree.
 * Does not: Draw the chips' animations (the row's styles all share this graph) or walk on up into the answer.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { Button } from "@decky/ui";

import { mountPanelPage, type MoveKey, type PanelPage } from "../../test-harness/lostFocusPanel";
import { resetNavFocusRegistry } from "../../shared/dpad/navFocusRegistry";
import type { KbAttachedNote } from "../../types/inputTransparency";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const { withPanelNav } = await import("../../test-harness/lostFocusPanel");
  return { ...stubs, Focusable: withPanelNav(stubs.Focusable), Button: withPanelNav(stubs.Button) };
});

import { PresetRowFocusRoot, usePresetRowNav } from "./presetRowFocusNav";
import { buildKbNotesBlockElement } from "../knowledge-library/buildKbNotesBlockElement";

const NOTE: KbAttachedNote = {
  name: "Starting out in Hollow Knight",
  kind: "guide",
  card: "Start with the Nail.",
  trust_tier: "wiki",
  source_host: "hollowknight.wiki",
  source_license: "CC BY-SA",
  domain: "game",
  game_title: "Hollow Knight",
};
const CHIPS = ["How do I use Nitra?", "How do I use Red Sugar?", "How do I beat Glyphid Dreadnought?"];

function World() {
  const nav = usePresetRowNav(CHIPS.length);
  return (
    <>
      <div className="bonsai-chat-turn-slot">
        {buildKbNotesBlockElement({
          turnKey: "live",
          notes: [NOTE],
          open: false,
          onToggle: () => {},
          onMoveUp: () => false,
          onMoveDown: () => false,
          headerRef: () => {},
        })}
      </div>
      <PresetRowFocusRoot className="bonsai-preset-carousel">
        {CHIPS.map((text, i) => (
          <Button key={text} ref={nav.setButtonRef[i]} {...nav.handlersFor(i, CHIPS.length)} aria-label={text}>
            {text}
          </Button>
        ))}
      </PresetRowFocusRoot>
    </>
  );
}

let page: PanelPage;

function chip(i: number): HTMLElement {
  return page.host.querySelector<HTMLElement>(`button[aria-label="${CHIPS[i]}"]`)!;
}
function block(): HTMLElement {
  return page.host.querySelector<HTMLElement>(".bonsai-kb-notes-block")!;
}
function nameOf(el: HTMLElement | null): string {
  if (!el) return "nothing";
  if (el === block()) return "notes block";
  return el.getAttribute("aria-label") ?? el.tagName;
}
/** Steam's own step along the chip row: the chip beside the ring that way, none past an end. */
function steamRowStep(key: MoveKey) {
  return (from: HTMLElement): HTMLElement | null => {
    const at = CHIPS.findIndex((_, i) => chip(i) === from);
    if (at < 0) return null;
    if (key === "onMoveLeft") return at > 0 ? chip(at - 1) : null;
    if (key === "onMoveRight") return at < CHIPS.length - 1 ? chip(at + 1) : null;
    return null;
  };
}
function press(key: MoveKey): "claimed" | "declined" {
  let out: "claimed" | "declined" = "declined";
  act(() => {
    out = page.press(key, steamRowStep(key));
  });
  return out;
}
function expectTogether(label: string) {
  expect(page.ring(), `${label}: no ring`).toBeTruthy();
  expect(nameOf(page.active()), `${label}: the page's focus left the ring`).toBe(nameOf(page.ring()));
}
/** A bounded walk along the row: no chip twice, the ring and the page's focus together after every press. */
function walk(key: MoveKey): string[] {
  const seen = [nameOf(page.ring())];
  for (let i = 0; i < 6; i++) {
    const before = page.ring();
    press(key);
    expectTogether(`${key} from ${seen[seen.length - 1]}`);
    if (page.ring() === before) return seen;
    const name = nameOf(page.ring());
    expect(seen.includes(name), `${name} visited twice walking ${key}`).toBe(false);
    seen.push(name);
  }
  throw new Error(`walk ${key} did not stop: ${seen.join(" -> ")}`);
}

beforeEach(() => {
  resetNavFocusRegistry();
  page = mountPanelPage();
  render(<World />, { container: page.host });
});
afterEach(() => {
  cleanup();
  page.remove();
  document.body.innerHTML = "";
});

describe("P97-L14-FREEZE (round two): the chips with the page's focus gone", () => {
  it("Up from a chip lands on the notes block above by Steam's transfer, three times out of three", () => {
    for (let round = 1; round <= 3; round++) {
      act(() => page.steamMove(chip(0)));
      page.setFocused(false);
      page.transfers.length = 0;

      expect(press("onMoveUp"), `round ${round}`).toBe("claimed");

      expect(nameOf(page.ring()), `round ${round}`).toBe("notes block");
      expectTogether(`round ${round}`);
      expect(page.transfers.map(nameOf)).toEqual(["notes block"]);
    }
  });

  it("Left and Right walk the chips one at a time, no chip twice, the ring and the page's focus together", () => {
    act(() => page.steamMove(chip(0)));
    page.setFocused(false);

    expect(walk("onMoveRight")).toEqual(CHIPS);
    expect(walk("onMoveLeft")).toEqual([...CHIPS].reverse());
  });
});

describe("with the page's focus present, the chips' moves are unchanged", () => {
  it("Up lands on the notes block, and Left and Right are the plugin's own claimed hops", () => {
    act(() => page.steamMove(chip(1)));
    expect(press("onMoveUp")).toBe("claimed");
    expect(nameOf(page.ring())).toBe("notes block");

    act(() => page.steamMove(chip(1)));
    act(() => {
      expect(page.press("onMoveLeft")).toBe("claimed");
    });
    expect(nameOf(page.ring())).toBe(CHIPS[0]);
    act(() => {
      expect(page.press("onMoveRight")).toBe("claimed");
    });
    expect(nameOf(page.ring())).toBe(CHIPS[1]);
    expectTogether("Right");
  });
});
