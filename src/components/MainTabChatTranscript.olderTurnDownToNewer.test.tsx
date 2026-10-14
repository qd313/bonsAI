/**
 * Title: Down from an opened older answer reaches the newer turns below it, as Up does
 *
 * Purpose: Pin plan 93's Deck finding (docs/test-evidence/plan93-P93-O4-MIRROR.json): with an older turn
 * opened from the "N earlier" list and newer turns drawn below it, Down from the answer's "Show details"
 * line jumped straight to the chip slot above the question box, past the "Today" day line and the newer
 * question; Up from the slot stopped on both. Down now visits what is drawn below the turn first.
 *
 * Used for: the older (archived) turn's Down chain in MainTabChatTranscript.tsx and `firstNavBelow` in
 * buildEarlierList.tsx.
 *
 * Solves: a walk test on the real rendered transcript, with the chip slot registered the way the dock
 * registers it (so it takes the ring when asked, as on the Deck) and Steam's scroll-into-view modelled
 * three ways (earlierListTestKit's `steamScroll`). Two shapes: the next turn behind a day line, and the
 * next turn straight below. Down and Up visit the same stops, mirror images, none twice, all on screen.
 *
 * Does not: model the chip slot's own row; the walk ends once the slot has the ring.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup } from "@testing-library/react";

import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";
import { registerNavFocus, resetNavFocusRegistry } from "../utils/navFocusRegistry";
import { resetUiDocument } from "../utils/uiDocument";
import {
  NOW, activate, focusOn, lineEl, nameOf, openEarlier, press, renderChat, seconds, steamScroll, turn, walk,
  type ScrollRule,
} from "./earlierListTestKit";
import { chipRowExitUp } from "../features/preset-carousel/presetRowFocusNav";

vi.mock("@decky/ui", async () => (await import("./earlierListNavStub")).deckyUiWithNavNodes());

/** Three questions yesterday, three today, then the newest (also today). */
const TURNS: AskThreadCollapsedTurn[] = [
  ...[1, 2, 3, 4, 5].map((n) => turn(`m${n}`, `monday question ${n}`, seconds(8, 28, 8 + n))),
  ...[1, 2, 3].map((n) => turn(`y${n}`, `yesterday question ${n}`, seconds(9, 1, 8 + n))),
  ...[1, 2, 3].map((n) => turn(`d${n}`, `today question ${n}`, seconds(9, 2, 6 + n))),
  turn("n1", "what is a good first upgrade in Hollow Knight", seconds(9, 2, 11), true),
];

const SLOT = "chip slot";
const NEWEST = "row:what is a good first upgrade in Hollow Knight";

/** The dock's chip slot, registered as the dock registers it: asked to take the ring, it does. */
function chipSlot(): HTMLElement {
  const chip = document.createElement("button");
  chip.setAttribute("aria-label", SLOT);
  document.body.appendChild(chip);
  registerNavFocus("preset-carousel", { current: { TakeFocus: () => (chip.focus(), true) } });
  return chip;
}

/** Yesterday's day opened, question `open` opened in it; Today and the newest stay closed. */
function olderOpen(open: string) {
  const out = renderChat({}, TURNS, open);
  openEarlier(out.container, out.stamp);
  activate(lineEl(out.container, "Yesterday · 3"));
  out.stamp();
  return out;
}

function dividerOf(container: HTMLElement): HTMLElement {
  const divider = container.querySelector<HTMLElement>(".bonsai-chat-details-divider");
  if (!divider) throw new Error("the open answer has no Show details line");
  return divider;
}

describe("Down from an opened older answer, newer turns below it (plan 93)", () => {
  beforeEach(() => {
    resetUiDocument();
    resetNavFocusRegistry();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
    vi.useRealTimers();
  });

  it.each(["top", "padded", "center"] as ScrollRule[])(
    "next turn behind a day line, %s rule: Down goes Show details, the day line, the newer question, the slot; Up comes back",
    (rule) => {
      const chip = chipSlot();
      const { container } = olderOpen("y3");
      const model = steamScroll(container, rule);
      const seenVisible: boolean[] = [];
      const after = () => {
        model.after();
        if (document.activeElement !== chip) seenVisible.push(model.visible(document.activeElement!));
      };
      focusOn(dividerOf(container));
      model.after();

      const down = walk(container, "Down", after);
      if (process.env.WALK_DEBUG) console.log("DOWN", rule, down.join(" > "));
      // The newest question is closed, so its Down is Steam's own: the walk model ends on it there. Its
      // Down on the Deck reaches the slot; take the slot from it the way that press does.
      expect(down.slice(1)).toEqual(["line:Today · 3", NEWEST]);
      expect(new Set(down).size).toBe(down.length);

      act(() => {
        chip.focus();
      });
      act(() => {
        chipRowExitUp();
      });
      model.after();
      const up = walk(container, "Up", after);
      if (process.env.WALK_DEBUG) console.log("UP  ", rule, up.join(" > "));
      expect(up.slice(0, down.length)).toEqual([...down].reverse());
      expect(seenVisible.every(Boolean)).toBe(true);
    },
  );

  it("next turn straight below: Down from Show details lands on that turn's question, not the slot; Up comes back", () => {
    chipSlot();
    const { container } = olderOpen("y2");
    const divider = dividerOf(container);
    focusOn(divider);

    expect(press(container, "Down")).toBe(true);
    expect(nameOf(document.activeElement)).toBe("row:yesterday question 3");
    expect(press(container, "Up")).toBe(true);
    expect(document.activeElement).toBe(divider);
  });
});
