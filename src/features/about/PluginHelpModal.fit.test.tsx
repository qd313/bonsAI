/**
 * Title: The quick-start box ("Using bonsAI") fits the Deck's own screen, and Up and Down read its words
 *
 * Purpose: On 2026-11-10 the box that "How to use bonsAI — open quick start" opens on the Main tab was taller than
 * the Deck's own screen: Steam slid it up to show its buttons, so its title and first lines sat above the top edge,
 * under Steam's top bar, and Up moved nothing (workshop:test-evidence/plan103-P103-QUICKSTART-01.json). Checked here
 * on the drawn box, laid out in the Deck's measured numbers with Steam's glide onto the ring's button
 * (deckPopupFit.ts): it adds up to no more than the room Steam leaves, read off its own styles, on Normal text and
 * on Large (the largest); it opens with its title, the bold heading at the top of its words, a "More below" sign
 * and both buttons on screen, the ring on Got it as before, under every glide rule; Down reads to the last line a
 * step at a time and Up brings the heading back, the ring staying on Got it; B, Got it and Cancel each close it,
 * once.
 *
 * Does not: open a real Steam box or wrap lines. The words' own height is their line counts read off the Deck's
 * picture of 2026-11-10 (seven lines in the highlighted box, ten in the list) times the line heights written on
 * the text; on Large the same counts are a floor, since bigger letters can only wrap into more lines. The look on
 * the Deck is the maintainer's check (P103-QUICKSTART-02).
 */
import type React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, renderHook, waitFor } from "@testing-library/react";

const seen = vi.hoisted(() => ({ b: undefined as (() => void) | undefined }));

vi.mock("@decky/ui", async () => {
  const fake = await import("../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../test-harness/steamRing");
  /** B on the Deck is the box's own onCancel on ModalRoot: kept so a test can press it. */
  function ModalRootHearingB(props: { onCancel?: () => void; children?: React.ReactNode }) {
    seen.b = props.onCancel;
    return <fake.ModalRoot {...props} />;
  }
  return { ...fake, Focusable: SteamRingFocusable, ModalRoot: ModalRootHearingB };
});

import { PluginHelpModal } from "./PluginHelpModal";
import { TEXT_SCALE_VAR } from "../../shared/text-size/chatTextSize";
import { usePublishTextScale } from "../../shared/text-size/usePublishTextScale";
import { makeFontSizeReader } from "../../test-harness/settledFontSize";
import { steamRingHolder, type SteamEl } from "../../test-harness/steamRing";
import { WALK_RULES, type SteamScrollRule } from "../../test-harness/deckAnswerWalk";
import { DECK_POPUP_ROOM, layOutDeckPopup, pressOnRing, walkWords, type DeckPopup } from "../../test-harness/deckPopupFit";

afterEach(() => {
  seen.b = undefined;
  document.documentElement.style.removeProperty(TEXT_SCALE_VAR);
});

const TITLE = "Using bonsAI";
const HEADING = "First, choose where the AI runs";

/** A size written in points on the text ("10px"); anything else is refused, as deckPopupFit refuses it. */
function pt(value: string): number {
  const m = /^([\d.]+)px$/.exec(value);
  if (!m) throw new Error(`"${value}" is not written in points`);
  return Number(m[1]);
}

/**
 * The quick-start words as written: the highlighted box (its border, padding, the gap under its bold heading and
 * one line of its text), the list (one line of it and the gap between its points), and the gaps between the two.
 */
function helpText(page: HTMLElement) {
  const size = makeFontSizeReader("");
  const box = page.querySelector<HTMLElement>("p")!;
  const heading = box.querySelector<HTMLElement>("strong")!;
  const list = page.querySelector<HTMLElement>("ul")!;
  const point = list.querySelector<HTMLElement>("li")!;
  const lineOf = (el: HTMLElement) => size(el) * Number(el.style.lineHeight);
  const edge = pt(box.style.borderTopWidth) + pt(box.style.paddingTop);
  return {
    heading,
    /** One line of the highlighted box and of the list. */
    boxLine: lineOf(box),
    listLine: lineOf(list),
    /** Where the heading starts inside the words: under the box's border and padding. */
    headingTop: edge,
    /**
     * The words' own height with no limit. Line counts from the Deck's picture (plan103-P103-QUICKSTART-01-1.png):
     * the box is the heading and six lines (1 + 2 + 2 + 1), the list five points of two lines each. On Normal that
     * is 2 x 11 + 6 + 7 x 18.85 = 159.95, then 12 + 10 of gap, then 10 x 18.2 + 4 x 5.85 = 205.4: 387.35 points.
     * The picture agrees: the box ends at y 222 and the list runs from y 255 to 563, 205.2 points.
     */
    naturalPx:
      2 * edge +
      pt(heading.style.marginBottom) +
      7 * lineOf(box) +
      pt(box.style.marginBottom) +
      pt((box.parentElement as HTMLElement).style.gap) +
      10 * lineOf(list) +
      4 * size(point) * Number(point.style.marginBottom.replace(/em$/, "")),
  };
}

/** The box as "How to use bonsAI" opens it, laid out on the Deck's screen with Steam's glide done. */
function drawOnDeck(rule?: SteamScrollRule) {
  const onClose = vi.fn();
  const view = render(<PluginHelpModal onClose={onClose} />);
  const text = helpText(view.container);
  const box = layOutDeckPopup(view.container, TITLE, { words: text.naturalPx, rule });
  box.glide();
  return { view, box, text, onClose };
}

/** The same, once the ring has settled where the box opens it: on Got it. */
async function openOnDeck(rule?: SteamScrollRule) {
  const drawn = drawOnDeck(rule);
  const gotIt = drawn.view.getByText("Got it");
  await waitFor(() => expect(steamRingHolder()).toBe(gotIt));
  drawn.box.glide();
  return { ...drawn, gotIt, cancel: drawn.view.getByText("Cancel") };
}

/** Title, the bold heading at the top of the words, and both buttons, each on screen right now. */
function opening(box: DeckPopup, text: ReturnType<typeof helpText>) {
  return {
    title: box.shows(box.titleBox()),
    heading: box.readable(box.wordsAt(text.headingTop, text.headingTop + text.boxLine)),
    buttons: box.shows(box.buttonsBox()),
  };
}

/** A on the stop with the ring, the way Steam delivers it: the nearest Focusable's onOKButton. */
function pressA(): void {
  const chain: SteamEl[] = [];
  for (let at = steamRingHolder() as SteamEl | null; at; at = at.parentElement as SteamEl | null) chain.push(at);
  const ok = chain.find((el) => el.__nav?.onOKButton)?.__nav?.onOKButton;
  act(() => void ok?.());
}

describe("the quick-start box on the Deck's own screen", () => {
  it("adds up to no more than the room Steam leaves, read off its own styles: on Normal text and on Large (the largest)", () => {
    // Normal: frame 26 + 26, the 16-point title at 1.45 (23.2), its 10-point gap, the words capped at 240 with the
    // "More below" row inside that, their 10-point gap, the 32-point buttons: 367.2 of the 403.5 points the Deck
    // leaves (534 tall, less Steam's bars and the popup layer's room). The words alone want 387.35.
    const normal = drawOnDeck();
    expect(normal.text.naturalPx).toBeCloseTo(387.35, 5);
    expect(normal.box.parts.title).toBeCloseTo(23.2, 5);
    expect(normal.box.parts.titleGap).toBe(10);
    expect(normal.box.parts.words + normal.box.parts.more).toBe(240);
    expect(normal.box.parts.wordsGap).toBe(10);
    expect(normal.box.parts.buttons).toBe(32);
    expect(normal.box.boxHeight).toBeCloseTo(367.2, 5);
    expect(DECK_POPUP_ROOM).toBe(403.5);
    expect(normal.box.boxHeight).toBeLessThanOrEqual(DECK_POPUP_ROOM);
    normal.view.unmount();

    // Large (1.15): only the letters grow. The title is 26.68 (370.68 in all); the words' 240 and the buttons' 32
    // stay, though the words now want at least 437.95.
    const published = renderHook(() => usePublishTextScale("large"));
    const large = drawOnDeck();
    expect(large.text.naturalPx).toBeCloseTo(387.35 + 0.15 * (7 * 18.85 + 10 * 18.2 + 4 * 5.85), 5);
    expect(large.box.parts.title).toBeCloseTo(16 * 1.15 * 1.45, 5);
    expect(large.box.parts.words + large.box.parts.more).toBe(240);
    expect(large.box.parts.buttons).toBe(32);
    expect(large.box.boxHeight).toBeCloseTo(370.68, 5);
    expect(large.box.boxHeight).toBeLessThanOrEqual(DECK_POPUP_ROOM);
    published.unmount();
  });

  it.each(WALK_RULES.map((rule) => [rule ?? "no glide", rule] as const))(
    "opens whole under Steam's glide rule %s: the title, the bold heading, a More below sign and both buttons on screen, the ring on Got it",
    async (_name, rule) => {
      const { box, text, gotIt } = await openOnDeck(rule);
      expect(opening(box, text)).toEqual({ title: true, heading: true, buttons: true });
      expect(text.heading.textContent).toBe(HEADING);
      expect(box.moreSign()).toBe("▾ More below (press Down)");
      expect(steamRingHolder()).toBe(gotIt);
      expect(box.layer.scrollTop).toBe(0);
    },
  );

  it.each(WALK_RULES.map((rule) => [rule ?? "no glide", rule] as const))(
    "Down from Got it reads to the last line a step at a time and the sign goes; Up brings the heading back; the ring stays on Got it (glide %s)",
    async (_name, rule) => {
      const { box, text, gotIt } = await openOnDeck(rule);
      const natural = text.naturalPx;
      const down = walkWords(box, "onMoveDown");
      expect(down.problems).toEqual([]);
      expect(down.ended).toBe(true);
      // 387.35 - 222 = 165.35 to scroll, 64 a press: three presses, each shorter than the 222 that shows.
      expect(down.places).toEqual([0, 64, 128, natural - box.parts.words]);
      expect(box.readable(box.wordsAt(natural - text.listLine, natural))).toBe(true);
      expect(box.words.textContent).toMatch(/About \(links\)\.$/);
      expect(box.moreSign()).toBe("");

      const up = walkWords(box, "onMoveUp");
      expect(up.problems).toEqual([]);
      expect(up.ended).toBe(true);
      expect(box.words.scrollTop).toBe(0);
      expect(opening(box, text)).toEqual({ title: true, heading: true, buttons: true });
      expect(box.moreSign()).toBe("▾ More below (press Down)");
      expect(steamRingHolder()).toBe(gotIt);
    },
  );

  it("on Large text, the largest, it still opens whole and Down still reads to the last line", async () => {
    const published = renderHook(() => usePublishTextScale("large"));
    const { box, text } = await openOnDeck("top");
    expect(opening(box, text)).toEqual({ title: true, heading: true, buttons: true });
    const down = walkWords(box, "onMoveDown");
    expect(down.problems).toEqual([]);
    expect(down.ended).toBe(true);
    expect(box.readable(box.wordsAt(text.naturalPx - text.listLine, text.naturalPx))).toBe(true);
    expect(walkWords(box, "onMoveUp").problems).toEqual([]);
    expect(opening(box, text)).toEqual({ title: true, heading: true, buttons: true });
    published.unmount();
  });

  it("B closes it, once: a press after it does nothing more", async () => {
    const { onClose } = await openOnDeck();
    expect(seen.b).toBeTypeOf("function");
    act(() => seen.b?.());
    expect(onClose).toHaveBeenCalledTimes(1);
    pressA();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("A on Got it, where the ring opens, closes it once; so does A on Cancel, one step Right", async () => {
    const first = await openOnDeck();
    pressA();
    expect(first.onClose).toHaveBeenCalledTimes(1);
    first.view.unmount();

    const second = await openOnDeck();
    expect(pressOnRing("onMoveRight")).toBe(true);
    expect(steamRingHolder()).toBe(second.cancel);
    pressA();
    expect(second.onClose).toHaveBeenCalledTimes(1);
  });
});
