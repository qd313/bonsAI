/**
 * Title: A long chip leaves one pause after its words stop, in the real row
 *
 * Purpose: Pin plan 81 helper E (roadmap, "Long suggestion chips: pause at the end", the
 *          maintainer's call 7 in D124): on the Deck every long chip stood still 3.2 to 10.2 s after
 *          its words stopped, because the row replaced a chip on its own beat (a length-based hold)
 *          and the scroll only set a floor. These tests read the row the way the screen shows it
 *          with fake timers: from the moment a chip's words reach their end (the label's scroll
 *          phase reads "end") to the moment the chip leaves (fade style: its spot starts to fade
 *          out; plain and decode styles: the words are replaced). The label's real width is set
 *          wider than the row's own character estimate, as it is on the Deck, so a stay time worked
 *          out from a character count would be wrong here.
 * Used for: presetChipStay.ts, the fade / plain / decode rows (MainTabPresetAnimatedChips.tsx,
 *           presetDecodeSlots.tsx), PresetChipScrollText in presetChipButton.tsx.
 * Does not: Prove it on the Deck. The check this owes: with a game running, over 200 s, every long
 *           chip leaves 1.2 to 1.9 s after its words stop; a chip under the ring never changes; a
 *           short chip's words are centred within 2 px.
 */
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MainTabPresetAnimatedChips } from "../../components/MainTabPresetAnimatedChips";
import { setFrozenTestChips, type PresetPrompt } from "../../data/presets";
import { PRESET_CHIP_END_PAUSE_MS, presetHoldMs } from "./presetRowLayout";
import { slotStaggerMs } from "./presetChipShared";

/** Wider than the row's own estimate (6.45), as real words are on the Deck. */
const REAL_PX_PER_CHAR = 7.2;

function standInForLayout(roomPx: number) {
  const words = vi.spyOn(Element.prototype, "scrollWidth", "get").mockImplementation(function (this: Element) {
    return this.classList.contains("bonsai-preset-chip-text-run")
      ? Math.round((this.textContent ?? "").length * REAL_PX_PER_CHAR)
      : 0;
  });
  const room = vi.spyOn(Element.prototype, "clientWidth", "get").mockImplementation(function (this: Element) {
    return this.classList.contains("bonsai-preset-chip-text--marquee") ? roomPx : 0;
  });
  return () => {
    words.mockRestore();
    room.mockRestore();
  };
}

const seed = (text: string): PresetPrompt => ({ text, category: "general" });
/** Long chips of different lengths, so no two share a time line. */
const LONGS = [64, 71, 78, 85, 92, 99].map((n, i) => String.fromCharCode(97 + i).repeat(n));

type Style = "fade" | "static" | "decode";

/**
 * Plays a row and returns, for every long chip seen, the milliseconds from its words reaching their
 * end to the chip leaving. Polled every 50 ms of fake time.
 */
function playRow(style: Style, single: boolean, forMs: number): number[] {
  const view = render(
    <MainTabPresetAnimatedChips
      seeds={LONGS.slice(0, 3).map(seed)}
      setUnifiedInput={vi.fn()}
      animationMode={style}
      fadeAnimationEnabled={style === "fade"}
      presetSingleChip={single}
    />,
  );
  const slots = () => Array.from(view.container.querySelectorAll<HTMLElement>(".bonsai-preset-carousel-slot"));
  type Seen = { text: string | null; endedAt: number | null; opacity: string };
  const seen: Seen[] = slots().map(() => ({ text: null, endedAt: null, opacity: "0" }));
  const gaps: number[] = [];
  for (let t = 0; t < forMs; t += 50) {
    act(() => {
      vi.advanceTimersByTime(50);
    });
    slots().forEach((slot, i) => {
      const run = slot.querySelector<HTMLElement>(".bonsai-preset-chip-text-run");
      const text = run?.textContent ?? null;
      const was = seen[i]!;
      const opacity = slot.style.opacity;
      const fadeStarted = style === "fade" && was.opacity === "1" && opacity === "0";
      const replaced = style !== "fade" && was.text !== null && text !== was.text;
      if (was.endedAt !== null && (fadeStarted || replaced)) gaps.push(t - was.endedAt);
      if (text !== was.text) {
        was.text = text;
        was.endedAt = null;
      }
      if (was.endedAt === null && run?.dataset.scrollPhase === "end") was.endedAt = t;
      was.opacity = opacity;
    });
  }
  return gaps;
}

describe("a long chip leaves one pause after its words stop", () => {
  let restore: () => void;
  beforeEach(() => {
    setFrozenTestChips(LONGS);
    vi.useFakeTimers();
  });
  afterEach(() => {
    restore();
    vi.useRealTimers();
    setFrozenTestChips([]);
    document.body.innerHTML = "";
  });

  const styles: Style[] = ["fade", "static", "decode"];
  for (const style of styles) {
    it(`${style}, one chip: every long chip leaves 1.2 to 1.9 s after its words stop`, () => {
      restore = standInForLayout(284);
      const gaps = playRow(style, true, 150_000);
      expect(gaps.length).toBeGreaterThanOrEqual(4);
      for (const gap of gaps) {
        expect(gap).toBeGreaterThanOrEqual(PRESET_CHIP_END_PAUSE_MS - 300);
        expect(gap).toBeLessThanOrEqual(PRESET_CHIP_END_PAUSE_MS + 400);
      }
    });

    it(`${style}, two chips of different lengths: each leaves after its own words stop`, () => {
      restore = standInForLayout(131);
      const gaps = playRow(style, false, 150_000);
      expect(gaps.length).toBeGreaterThanOrEqual(8);
      for (const gap of gaps) {
        expect(gap).toBeGreaterThanOrEqual(PRESET_CHIP_END_PAUSE_MS - 300);
        // A neighbour's change just then holds the later one back by under half a second at most.
        expect(gap).toBeLessThanOrEqual(PRESET_CHIP_END_PAUSE_MS + 450);
      }
    });
  }

  it("two long chips of the same length leave on their own time lines, a few hundred ms apart, not 2.5 s", () => {
    restore = standInForLayout(131);
    const same = ["x", "y", "z", "w"].map((c) => c.repeat(80));
    setFrozenTestChips(same);
    const view = render(
      <MainTabPresetAnimatedChips
        seeds={same.slice(0, 3).map(seed)}
        setUnifiedInput={vi.fn()}
        animationMode="static"
        fadeAnimationEnabled={false}
      />,
    );
    const words = () =>
      Array.from(view.container.querySelectorAll<HTMLElement>(".bonsai-preset-chip-text-run")).map((r) => r.textContent);
    const changes: number[] = [];
    let before = words();
    for (let t = 0; t < 120_000; t += 50) {
      act(() => vi.advanceTimersByTime(50));
      const now = words();
      if (now.some((w, i) => w !== before[i])) changes.push(t);
      before = now;
    }
    // Both lengths are the same, so both chips want to leave at the same moment. They still keep a
    // little apart (never together), but nowhere near the 2.5 s the row used to force between them.
    const apart = changes.slice(1).map((t, n) => t - changes[n]!).filter((d) => d > 0);
    expect(changes.length).toBeGreaterThanOrEqual(8);
    expect(Math.min(...apart)).toBeGreaterThanOrEqual(300);
    expect(Math.min(...apart)).toBeLessThan(1_000);
  });

  it("a chip under the ring does not change, and leaves soon after the ring does", () => {
    restore = standInForLayout(284);
    const view = render(
      <MainTabPresetAnimatedChips
        seeds={LONGS.slice(0, 3).map(seed)}
        setUnifiedInput={vi.fn()}
        animationMode="static"
        fadeAnimationEnabled={false}
        presetSingleChip
      />,
    );
    const button = () => view.container.querySelector<HTMLElement>("button.bonsai-preset-glass")!;
    const words = () => view.container.querySelector<HTMLElement>(".bonsai-preset-chip-text-run")!;
    act(() => vi.advanceTimersByTime(5_000));
    const held = words().textContent;
    button().classList.add("gpfocus"); // Steam's ring, the marker the row reads on the Deck
    act(() => vi.advanceTimersByTime(60_000));
    expect(words().textContent).toBe(held);
    expect(words().dataset.scrollPhase).toBe("end");
    button().classList.remove("gpfocus");
    act(() => vi.advanceTimersByTime(600));
    expect(words()?.textContent).not.toBe(held);
  });

  it("a chip whose words fit keeps the stay time it always had", () => {
    restore = standInForLayout(284);
    setFrozenTestChips([]);
    const view = render(
      <MainTabPresetAnimatedChips
        seeds={[seed("Short one"), seed("Short two"), seed("Short three")]}
        setUnifiedInput={vi.fn()}
        animationMode="fade"
        presetSingleChip
      />,
    );
    const opacity = () => view.container.querySelector<HTMLElement>(".bonsai-preset-carousel-slot")!.style.opacity;
    // Fade-in starts after the first spot's stagger and takes 1 s; the hold follows; then the fade-out.
    const fadeOutAt = slotStaggerMs(0) + 1000 + presetHoldMs("Short one", 1);
    act(() => vi.advanceTimersByTime(fadeOutAt - 100));
    expect(opacity()).toBe("1");
    act(() => vi.advanceTimersByTime(200));
    expect(opacity()).toBe("0");
  });
});
