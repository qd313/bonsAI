/**
 * Title: The back arrow keeps one size, and a long name spills to the right (plan 87 B7)
 * Purpose: Pin the Deck check for B7 at the level it looks at. Measured on the Deck 2026-10-09
 *          (docs/test-evidence/plan87-M1-BACK-BUTTON.json): Decky's back button was 40 points wide with a
 *          14-letter chat name and 32 to 33.5 with names of 51 to 60 letters, because the bar is a flex
 *          row and the long name's wide natural size squeezed the arrow. The wanted drawing: the arrow is
 *          one size whatever the name, and a long name uses the empty space on its right (the picture
 *          need not be symmetrical then).
 * Used for: chatTitleStyles.ts (the view's root and the empty space), ChatTitleView.tsx.
 * Solves: jsdom lays nothing out, so titleBarFlexModel.ts runs the browser's flex rule over the styles the
 *         view really renders (the `<style>` text in the DOM and the empty space's inline width), with the
 *         Deck's bar numbers (300 wide, 16 padding, arrow 40, a 10-point gap). The model was checked
 *         against Chrome with the old and the new numbers.
 * Does not: Measure real words: a letter is taken as 6.4 points in the Deck's 13-point heavy type (the
 *           60-letter name's scrollWidth was 386 on the Deck).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

vi.mock("@decky/ui", async () => await import("../../test-harness/fakeDeckyUi"));

import { ChatTitleView } from "./ChatTitleView";
import { resetChatNameNav } from "./chatNameNav";
import { publishChatTitle, resetChatTitleStore, setChatTitleTab, type ChatTitleChat } from "./chatTitleStore";
import { NAME_LINE_FURNITURE_PX } from "./chatTitleStyles";
import { layoutTitleBar } from "./titleBarFlexModel";

const ACTIONS = { previous: () => {}, next: () => {}, takeFirstStop: () => false };
const LETTER_PX = 6.4;
const SHORT = "wheatley fight";
const MID = "how do i beat the boss at the end of the first area";
const LONG = "How do I beat the boss in the Soul Sanctum in Hollow Knight?";

function chat(name: string): ChatTitleChat {
  return { name, place: 2, count: 5, unsaved: false, answerInFlight: false, chats: [] };
}

/** What the view draws for a name: the stylesheet text and the empty space's inline width. */
function drawn(name: string) {
  setChatTitleTab("main");
  publishChatTitle({}, chat(name), ACTIONS);
  const { container } = render(
    <div>
      <button>back</button>
      <ChatTitleView />
    </div>,
  );
  const css = container.querySelector("style")!.textContent ?? "";
  const mirror = container.querySelector<HTMLElement>(".bonsai-chat-title__mirror")!;
  return { css, mirrorWidth: parseFloat(mirror.style.width) };
}

/** The bar for a name, with the empty space at the Deck's measured 50 points. */
function barFor(name: string) {
  const { css } = drawn(name);
  cleanup();
  return layoutTitleBar(css, name.length * LETTER_PX + NAME_LINE_FURNITURE_PX, 50);
}

beforeEach(() => {
  resetChatTitleStore();
  resetChatNameNav();
});
afterEach(cleanup);

describe("the back arrow keeps one size whatever the chat's name", () => {
  it("is 40 points with a 14-letter name and with names of 51 and 60 letters", () => {
    const arrows = [SHORT, MID, LONG].map((n) => barFor(n).arrow);
    expect(arrows).toEqual([40, 40, 40]);
  });

  it("the view starts at the same place whatever the name", () => {
    const lefts = [SHORT, MID, LONG].map((n) => barFor(n).nameStart);
    expect(new Set(lefts).size).toBe(1);
  });
});

describe("a long name spills into the empty space on its right", () => {
  it("a name that fits keeps the empty space, so it stays centred", () => {
    const b = barFor(SHORT);
    expect(b.mirror).toBe(50);
    expect(b.name).toBeCloseTo(168, 0);
  });

  it("a long name's box grows into the empty space, further right than today's 168", () => {
    const b = barFor(LONG);
    expect(b.mirror).toBeLessThan(1);
    expect(b.name).toBeGreaterThan(210);
    expect(b.name + b.mirror).toBeCloseTo(218, 0);
  });
});
