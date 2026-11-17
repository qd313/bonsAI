/**
 * Title: A chip's decode runs in step with its slide
 *
 * Purpose: Pin plan 105 lane B3's first half (roadmap, "Chip decode in step with the scroll", the
 *          maintainer, 2026-10-22: when a chip's decode runs it pauses and settles slightly). The
 *          decode used to draw its scrambled letters in a plain clipped box and swap it for the
 *          sliding label only when the last letter locked. A long chip then stood still while its
 *          hidden tail decoded, waited 1.5 s more, and slid; a short chip's words shifted as the
 *          scrambled glyphs gave way to the real, narrower words. Now the sliding label is there from
 *          the first frame: the real words are in it, invisible, so the chip is exactly as wide as
 *          its settled self from frame 0, and the scramble is drawn over them, clipped to that width.
 *          Nothing is swapped at the end and the slide's time line is not restarted. jsdom lays
 *          nothing out, so the words' width is given by a stand-in, as in the other chip tests.
 * Used for: PresetChipScrollText / PresetChipText in presetChipButton.tsx, DecodePresetChipButton in
 *           presetDecodeChipButton.tsx, the decode row in presetDecodeSlots.tsx.
 * Does not: Prove the look on the Deck. The check this owes (P105-CHIP-DECODE-STEP-01): a long
 *           chip's decode runs along its slide without a pause and settle, and a short chip's width
 *           does not change from the first frame to the last; with a recording.
 */
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MainTabPresetAnimatedChips } from "./MainTabPresetAnimatedChips";
import type { PresetPrompt } from "./presets";
import { PRESET_DECODE_CHAR_MS } from "./presetChipDecodeText";
import { PRESET_MARQUEE_DELAY_S } from "./presetRowLayout";

const PX_PER_CHAR = 6.45;
/** The first chip starts its reveal this long after the row appears (slotStaggerMs). */
const STAGGER_MS = 750;
const ROOM_PX = 131; // a chip of the two across: 147 less 16 of padding
const LONG = "How can I get the best frame rate with the lowest battery use here"; // 66 chars: 426 px of words
const SHORT = "Battery tips"; // 12 chars: fits

const seed = (text: string): PresetPrompt => ({ text, category: "general" });

/** The words' own width, read the way the scroller does: from the real words, never from the scramble. */
const realWords = (run: Element) => run.querySelector("[data-bonsai-chip-words]")?.textContent ?? run.textContent ?? "";

function standInForLayout() {
  const words = vi.spyOn(Element.prototype, "scrollWidth", "get").mockImplementation(function (this: Element) {
    return this.classList.contains("bonsai-preset-chip-text-run") ? Math.round(realWords(this).length * PX_PER_CHAR) : 0;
  });
  const room = vi.spyOn(Element.prototype, "clientWidth", "get").mockImplementation(function (this: Element) {
    return this.classList.contains("bonsai-preset-chip-text--marquee") ? ROOM_PX : 0;
  });
  return () => {
    words.mockRestore();
    room.mockRestore();
  };
}

describe("a chip's decode runs in step with its slide", () => {
  let restore: () => void;
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date", "performance", "requestAnimationFrame", "cancelAnimationFrame"],
    });
    restore = standInForLayout();
  });
  afterEach(() => {
    restore();
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  function renderDecodeRow(texts: string[]) {
    const view = render(
      <MainTabPresetAnimatedChips
        seeds={texts.map(seed)}
        setUnifiedInput={vi.fn()}
        animationMode="decode"
        presetSingleChip={false}
      />,
    );
    const run = () => view.container.querySelector<HTMLElement>(".bonsai-preset-carousel-slot .bonsai-preset-chip-text-run");
    // One frame at a time, as the screen runs: React commits between frames, and the reveal paints on the next.
    const step = (ms: number) => {
      for (let left = ms; left > 0; left -= 16) act(() => void vi.advanceTimersByTime(Math.min(16, left)));
    };
    return { ...view, run, step };
  }

  it("the sliding label is there from the first letter, and the very same one slides at the end", () => {
    const { run, step } = renderDecodeRow([LONG, SHORT, "z"]);
    step(STAGGER_MS + 60); // the decode has begun
    const first = run();
    expect(first).not.toBeNull();
    expect(first!.dataset.scrollPhase).toBe("waiting");
    step(PRESET_DECODE_CHAR_MS * LONG.length + 200); // the last letter has locked
    expect(run()).toBe(first); // nothing swapped at the end of the decode
  });

  it("is as wide as its settled words from the first frame: the real words are in it, hidden, all the way", () => {
    const { run, step } = renderDecodeRow([LONG, SHORT, "z"]);
    for (let t = 0; t < STAGGER_MS + PRESET_DECODE_CHAR_MS * LONG.length + 400; t += 50) {
      step(50);
      const words = run()?.querySelector<HTMLElement>("[data-bonsai-chip-words]");
      if (!words) continue;
      expect(words.textContent).toBe(LONG);
    }
    // While it decodes the real words are invisible (the scramble is drawn over them) and afterwards they show.
    const settled = run()!.querySelector<HTMLElement>("[data-bonsai-chip-words]")!;
    expect(settled.style.visibility).not.toBe("hidden");
    // The scramble layer is gone and holds no letters, so nothing is drawn twice over the words.
    expect(run()!.querySelector(".bonsai-preset-chip-text--churn")).toBeNull();
    expect(run()!.textContent).toBe(LONG);
  });

  it("hides the real words while the scramble is drawn, so the person sees the decode and not both", () => {
    const { run, step } = renderDecodeRow([LONG, SHORT, "z"]);
    step(STAGGER_MS + 300);
    const words = run()!.querySelector<HTMLElement>("[data-bonsai-chip-words]")!;
    expect(words.style.visibility).toBe("hidden");
    const layer = run()!.querySelector<HTMLElement>(".bonsai-preset-chip-text--churn")!;
    expect(layer.textContent!.length).toBeGreaterThan(0);
  });

  it("the slide's time line runs from the start of the decode: the words begin to move 1.5 s in, not 1.5 s after the last letter", () => {
    const { run, step } = renderDecodeRow([LONG, SHORT, "z"]);
    step(STAGGER_MS);
    const startedAt = Date.now();
    const decodeMs = PRESET_DECODE_CHAR_MS * LONG.length;
    // 66 letters take 2.8 s: the slide has already begun while the last of them are still locking.
    expect(PRESET_MARQUEE_DELAY_S * 1000).toBeLessThan(decodeMs);
    let movedAt: number | null = null;
    for (let t = 0; t < decodeMs + 3000 && movedAt === null; t += 50) {
      step(50);
      if (run()!.dataset.scrollPhase === "scrolling") movedAt = Date.now() - startedAt;
    }
    expect(movedAt).not.toBeNull();
    expect(movedAt!).toBeLessThanOrEqual(PRESET_MARQUEE_DELAY_S * 1000 + 100);
    expect(movedAt!).toBeLessThan(decodeMs);
  });

  /**
   * The Deck (plan105-P105-CHIP-DECODE-STEP-01, D3a, 2026-11-17): two chips of 38 and 31 letters slid 0.55 s and
   * 0.45 s after the last LETTER THE PERSON CAN SEE had settled. The scramble past the chip's right edge is
   * hidden, so the decode the eye follows ends when the locked letters reach that edge, not at the last
   * letter; a slide timed from the reveal's start (1.5 s) left that gap still.
   */
  it("the words begin to slide within 0.2 s of the last visible letter settling, with no still wait", () => {
    for (const words of ["Any known issues running this on Deck?", "What are the best FSR settings?"]) {
      const { run, container, step, unmount } = renderDecodeRow([words, SHORT, "z"]);
      step(STAGGER_MS);
      const startedAt = Date.now();
      let visibleEndedAt: number | null = null;
      let slidAt: number | null = null;
      for (let t = 0; t < 4000 && slidAt === null; t += 16) {
        step(16);
        const locked = container.querySelector(".bonsai-preset-chip-churn-layer > span")?.textContent ?? "";
        if (visibleEndedAt === null && locked.length * PX_PER_CHAR >= ROOM_PX) visibleEndedAt = Date.now() - startedAt;
        if (run()?.dataset.scrollPhase === "scrolling") slidAt = Date.now() - startedAt;
      }
      expect(visibleEndedAt).not.toBeNull();
      expect(slidAt).not.toBeNull();
      expect(slidAt! - visibleEndedAt!).toBeLessThanOrEqual(200);
      expect(slidAt!).toBeGreaterThanOrEqual(visibleEndedAt!); // never before the visible words are written
      unmount();
    }
  });

  it("a chip that only just overflows slides within 0.2 s of its last letter", () => {
    const words = "Which Steam Deck setting?"; // 25 letters: 161 px in a 131 px room
    const { run, step } = renderDecodeRow([words, SHORT, "z"]);
    step(STAGGER_MS);
    const startedAt = Date.now();
    const lastLetterAt = PRESET_DECODE_CHAR_MS * words.length;
    let slidAt: number | null = null;
    for (let t = 0; t < 4000 && slidAt === null; t += 16) {
      step(16);
      if (run()?.dataset.scrollPhase === "scrolling") slidAt = Date.now() - startedAt;
    }
    expect(slidAt).not.toBeNull();
    expect(slidAt! - lastLetterAt).toBeLessThanOrEqual(200);
  });

  it("a short chip's label keeps one width from its first frame to its last, and never slides", () => {
    const { container, step } = renderDecodeRow([SHORT, LONG, "z"]);
    const widths = new Set<number>();
    for (let t = 0; t < STAGGER_MS + PRESET_DECODE_CHAR_MS * SHORT.length + 600; t += 50) {
      step(50);
      const run = container.querySelector<HTMLElement>(".bonsai-preset-carousel-slot .bonsai-preset-chip-text-run");
      if (!run) continue;
      widths.add(run.scrollWidth);
      expect(run.dataset.scrollPhase).toBe("fits");
    }
    expect(Array.from(widths)).toEqual([Math.round(SHORT.length * PX_PER_CHAR)]);
  });

  it("a click while it decodes still fills the box with the whole words, never the scramble", () => {
    const setUnifiedInput = vi.fn();
    const view = render(
      <MainTabPresetAnimatedChips seeds={[seed(LONG), seed(SHORT), seed("z")]} setUnifiedInput={setUnifiedInput} animationMode="decode" />,
    );
    act(() => void vi.advanceTimersByTime(STAGGER_MS + 300));
    const button = view.container.querySelector<HTMLButtonElement>("button.bonsai-preset-glass")!;
    act(() => button.click());
    expect(setUnifiedInput).toHaveBeenCalledWith(expect.stringContaining(LONG));
  });
});
