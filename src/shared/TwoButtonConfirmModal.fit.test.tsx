/**
 * Title: The shared two-button box fits the Deck's own screen, and Up and Down read its words
 *
 * Purpose: On a fresh install the starter-models box was taller than the Deck's screen: Steam slid it up to show
 * the button with the ring, its title went under Steam's top bar, and Up did nothing
 * (workshop:test-evidence/readme-STARTER-BOX-TOO-TALL.md). Checked here on the drawn box, with Steam's popup laid
 * out in the Deck's measured numbers and Steam's glide onto the ring's button modelled (deckPopupFit.ts): the box
 * fits the room Steam leaves (worked out as arithmetic from the box's own styles, on Normal text and on Large, the
 * largest, with a title on one line or two), its title, first line, a "More below" sign and its buttons all show
 * when it opens under every glide rule, Down and Up from either button move the words a step at a time and end
 * where the words end without ever going back over themselves (the sign goes once the end shows), and a box whose
 * words fit looks and walks as before, with no sign.
 *
 * Does not: open a real Steam box. Where Steam's own first focus lands and how the words look scrolled are the
 * stand-in look and the maintainer's check (P103-STARTER-BOX-01).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, renderHook, waitFor } from "@testing-library/react";

vi.mock("@decky/ui", async () => {
  const fake = await import("../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../test-harness/steamRing");
  return { ...fake, Focusable: SteamRingFocusable };
});

import { TwoButtonConfirmModal } from "./TwoButtonConfirmModal";
import { TEXT_SCALE_VAR } from "./text-size/chatTextSize";
import { usePublishTextScale } from "./text-size/usePublishTextScale";
import { steamRingHolder } from "../test-harness/steamRing";
import { WALK_RULES, type SteamScrollRule } from "../test-harness/deckAnswerWalk";
import { DECK_POPUP_ROOM, layOutDeckPopup, pressOnRing, walkWords, type DeckPopup } from "../test-harness/deckPopupFit";

afterEach(() => {
  document.documentElement.style.removeProperty(TEXT_SCALE_VAR);
});

const TITLE = "Turn on internet downloads?";
/** The fresh-install starter box's words with no limit, read off the Deck's picture: 20 lines of 17.4 and 8 gaps of 8. */
const TALL_WORDS_PX = 412;

/** The box with the ring where it opens (Cancel), laid out on the Deck's screen, Steam's glide done. */
async function openOnDeck(wordsNaturalPx: number, rule?: SteamScrollRule, titleLines = 1) {
  const view = render(
    <TwoButtonConfirmModal
      title={TITLE}
      body={<div>bonsAI will connect to https://ollama.com to download Ollama (size not known ahead of time).</div>}
      actionLabel="Turn on and download"
      onCancel={vi.fn()}
      onAction={vi.fn()}
    />,
  );
  const cancel = view.getByText("Cancel");
  await waitFor(() => expect(steamRingHolder()).toBe(cancel));
  const box = layOutDeckPopup(view.container, TITLE, { words: wordsNaturalPx, rule, titleLines });
  box.glide();
  return { view, box, cancel, action: view.getByText("Turn on and download") };
}

/** Title, first line of words and the buttons, each on screen right now. */
function opening(box: DeckPopup) {
  return { title: box.shows(box.titleBox()), firstLine: box.readable(box.wordsAt(0, box.line)), buttons: box.shows(box.buttonsBox()) };
}

describe("the shared two-button box on the Deck's own screen", () => {
  it("adds up to no more than the room Steam leaves, read off its own styles: on Normal text, and on Large (the largest) with a title on one line or two", async () => {
    const first = await openOnDeck(TALL_WORDS_PX);
    const normal = first.box;
    // Normal: the 16-point title at 1.45, its 10-point gap, the words' limit, their 10-point gap, the 32-point buttons.
    // Scrolling words: 222 of them and the 18-point "More below" row, 240 together. 52 of frame, 23.2 + 10 + 240 +
    // 10 + 32 drawn: 367.2 of the 403.5 points the Deck's screen leaves (534 tall, less Steam's bars and the layer's room).
    expect(normal.parts.title).toBeCloseTo(23.2, 5);
    expect(normal.parts.titleGap).toBe(10);
    expect(normal.parts.words + normal.parts.more).toBe(240);
    expect(normal.parts.wordsGap).toBe(10);
    expect(normal.parts.buttons).toBe(32);
    expect(normal.boxHeight).toBeCloseTo(367.2, 5);
    expect(DECK_POPUP_ROOM).toBe(403.5);
    expect(normal.boxHeight).toBeLessThanOrEqual(DECK_POPUP_ROOM);
    first.view.unmount();

    // Large, the largest Text size (1.15): only the letters grow. The title is 26.68 (370.7 in all), or 53.36 on two
    // lines (397.4, 6.1 to spare); the words' 240 and the buttons' 32 stay as they are.
    const published = renderHook(() => usePublishTextScale("large"));
    const largeOne = await openOnDeck(TALL_WORDS_PX);
    expect(largeOne.box.parts.title).toBeCloseTo(16 * 1.15 * 1.45, 5);
    expect(largeOne.box.boxHeight).toBeCloseTo(370.68, 5);
    expect(largeOne.box.boxHeight).toBeLessThanOrEqual(DECK_POPUP_ROOM);
    largeOne.view.unmount();
    const large = (await openOnDeck(TALL_WORDS_PX, undefined, 2)).box;
    expect(large.parts.title).toBeCloseTo(2 * 16 * 1.15 * 1.45, 5);
    expect(large.parts.words + large.parts.more).toBe(240);
    expect(large.parts.buttons).toBe(32);
    expect(large.boxHeight).toBeCloseTo(397.36, 5);
    expect(large.boxHeight).toBeLessThanOrEqual(DECK_POPUP_ROOM);
    published.unmount();
  });

  it.each(WALK_RULES.map((rule) => [rule ?? "no glide", rule] as const))(
    "opens whole even when its words are taller than the screen, under Steam's glide rule %s: title, first line, a More below sign and the ring's button all show",
    async (_name, rule) => {
      const { box, cancel } = await openOnDeck(TALL_WORDS_PX, rule);
      expect(opening(box)).toEqual({ title: true, firstLine: true, buttons: true });
      expect(box.moreSign()).toBe("▾ More below (press Down)");
      expect(steamRingHolder()).toBe(cancel);
      expect(box.layer.scrollTop).toBe(0);
    },
  );

  it.each(WALK_RULES.map((rule) => [rule ?? "no glide", rule] as const))(
    "Down from Cancel reads the words to their end a step at a time (the sign goes at the end) and Up brings the first line back, the ring staying on Cancel (glide %s)",
    async (_name, rule) => {
      const { box, cancel } = await openOnDeck(TALL_WORDS_PX, rule);
      const down = walkWords(box, "onMoveDown");
      expect(down.problems).toEqual([]);
      expect(down.ended).toBe(true);
      expect(down.places.length).toBeGreaterThan(1);
      expect(box.readable(box.wordsAt(TALL_WORDS_PX - box.line, TALL_WORDS_PX))).toBe(true);
      expect(box.moreSign()).toBe("");
      const up = walkWords(box, "onMoveUp");
      expect(up.problems).toEqual([]);
      expect(up.ended).toBe(true);
      expect(opening(box)).toEqual({ title: true, firstLine: true, buttons: true });
      expect(steamRingHolder()).toBe(cancel);
    },
  );

  it("Up and Down from the action move the same words, and Right still takes the ring back to Cancel", async () => {
    const { box, cancel, action } = await openOnDeck(TALL_WORDS_PX, "top");
    expect(pressOnRing("onMoveLeft")).toBe(true);
    expect(steamRingHolder()).toBe(action);
    const down = walkWords(box, "onMoveDown");
    expect(down.problems).toEqual([]);
    expect(box.words.scrollTop).toBe(TALL_WORDS_PX - box.parts.words);
    expect(walkWords(box, "onMoveUp").problems).toEqual([]);
    expect(box.words.scrollTop).toBe(0);
    expect(pressOnRing("onMoveRight")).toBe(true);
    expect(steamRingHolder()).toBe(cancel);
  });

  it("with words that fit, looks and walks as before: the words' box is as tall as its words, no sign, and Up and Down hold still", async () => {
    const { box, cancel } = await openOnDeck(35, "top");
    expect(box.parts.words).toBe(35);
    expect(box.parts.wordsGap).toBe(10);
    expect(box.moreSign()).toBeNull();
    for (const key of ["onMoveUp", "onMoveDown"] as const) {
      expect(pressOnRing(key)).toBe(true);
      expect(box.words.scrollTop).toBe(0);
      expect(steamRingHolder()).toBe(cancel);
    }
    expect(opening(box)).toEqual({ title: true, firstLine: true, buttons: true });
  });
});
