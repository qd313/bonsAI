/**
 * Title: The chip with the ring takes the row, in the real chip row
 *
 * Purpose: Pin plan 105 lane B3's second half (board 5, tab 5, round 2's C, picked 2026-11-16) at the
 *          level the Deck check looks at: with the ring on a chip whose words do not fit, that chip's
 *          slot widens and its neighbour is cut to its first word and "..."; a chip that fits never
 *          changes; the ring stays on the chip through the change and Left and Right still reach each
 *          neighbour (a bounded walk, no stop twice in a row); a chip that was never given the ring by
 *          Steam (a touch press) never widens; and the row's height never changes. jsdom has no
 *          layout, so the widths the row reads off the live elements are given by a stand-in that
 *          follows the slot's own CSS length, as the other layout tests do.
 * Used for: usePresetChipWiden (usePresetChipWiden.ts), presetChipWiden.ts, the static and decode rows.
 * Does not: Prove the look on the Deck. The check this owes (P105-CHIP-SOFT-ENDS-01): with the ring
 *           on a long chip it shows every word on one line, the ring holds, nothing changes height, and
 *           Left and Right still reach each neighbour; with a recording.
 */
import React from "react";
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MainTabPresetAnimatedChips } from "./MainTabPresetAnimatedChips";
import type { PresetPrompt } from "./presets";
import { resetNavFocusRegistry } from "../../shared/dpad/navFocusRegistry";
import { buildSection4Section } from "../../styles/sections/section-4";

type Handlers = Partial<Record<"onMoveLeft" | "onMoveRight", () => boolean>> & {
  onGamepadFocus?: () => void;
  onGamepadBlur?: () => void;
};
type NavEl = HTMLElement & { __nav?: Handlers };

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  /* The chip buttons keep their Steam handlers on the element, so a test can deliver a press and a
     ring move the way Steam does (the stub otherwise drops them). */
  const Button = React.forwardRef<HTMLButtonElement, Record<string, unknown>>(function ButtonWithNav(props, ref) {
    const setRef = (el: HTMLButtonElement | null) => {
      if (el) (el as NavEl).__nav = props as Handlers;
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = el;
    };
    return <stubs.Button {...props} ref={setRef} />;
  });
  return { ...stubs, Button };
});

const PX_PER_CHAR = 6.45;
const CHROME_PX = 18; // 8 + 8 padding and a 1 px border each side
const ROW_PX = 300;
const REST_PX = 147; // (300 - 6) / 2

const LONG_A = "Which Ollama model fits my Steam Deck best for long chats"; // 57 chars: about 368 px
const LONG_B = "How do I fix Steam Input for this game when the buttons swap"; // 60 chars: about 387 px
const SHORT = "Battery tips"; // 12 chars: about 77 px, fits

const seed = (text: string): PresetPrompt => ({ text, category: "general" });

/** The width a slot has right now, read from its own CSS length: px when open, the equal share at rest. */
function slotPx(slot: Element | null): number {
  const basis = (slot as HTMLElement | null)?.style.getPropertyValue("--bonsai-chip-basis") ?? "";
  return basis.endsWith("px") ? parseFloat(basis) : REST_PX;
}
const wordsPx = (el: Element) => Math.round((el.textContent ?? "").length * PX_PER_CHAR);

/** jsdom has no layout: give the row, the buttons and their words widths that follow the slot's own length. */
function standInForLayout() {
  const offset = vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(function (this: HTMLElement) {
    return this.tagName === "BUTTON" ? slotPx(this.closest(".bonsai-preset-carousel-slot")) : 0;
  });
  const client = vi.spyOn(Element.prototype, "clientWidth", "get").mockImplementation(function (this: Element) {
    if (this.classList.contains("bonsai-preset-across")) return ROW_PX;
    if (this.classList.contains("bonsai-preset-chip-text")) {
      const room = slotPx(this.closest(".bonsai-preset-carousel-slot")) - CHROME_PX;
      const words = this.classList.contains("bonsai-preset-chip-text--marquee")
        ? wordsPx(this.firstElementChild ?? this)
        : wordsPx(this);
      return Math.max(0, Math.min(room, words));
    }
    return 0;
  });
  const scroll = vi.spyOn(Element.prototype, "scrollWidth", "get").mockImplementation(function (this: Element) {
    return this.classList.contains("bonsai-preset-chip-text-run") ||
      (this.classList.contains("bonsai-preset-chip-text") && !this.classList.contains("bonsai-preset-chip-text--marquee"))
      ? wordsPx(this)
      : 0;
  });
  return () => {
    offset.mockRestore();
    client.mockRestore();
    scroll.mockRestore();
  };
}

/** The row as the person sees it: each slot's width and the words its chip shows. */
function readRow(container: HTMLElement) {
  const slots = Array.from(container.querySelectorAll<HTMLElement>(".bonsai-preset-carousel-slot"));
  return {
    slots,
    widths: slots.map((s) => slotPx(s)),
    words: slots.map((s) => s.querySelector(".bonsai-preset-chip-text")?.textContent ?? ""),
    buttons: slots.map((s) => s.querySelector<HTMLButtonElement>("button")!),
  };
}

describe("the chip with the ring takes the row", () => {
  let restore: () => void;
  beforeEach(() => {
    vi.useFakeTimers();
    restore = standInForLayout();
  });
  afterEach(() => {
    restore();
    vi.useRealTimers();
    resetNavFocusRegistry();
    document.body.innerHTML = "";
  });

  function renderRow(texts: string[], mode: "static" | "decode" = "static") {
    const view = render(
      <MainTabPresetAnimatedChips
        seeds={texts.map(seed)}
        setUnifiedInput={vi.fn()}
        animationMode={mode}
        presetSingleChip={false}
      />,
    );
    // A decode chip is written letter by letter first; the widths are read once it has settled.
    if (mode === "decode") act(() => void vi.advanceTimersByTime(4_000));
    return view;
  }
  /** Steam puts the ring on a chip: its own gamepad-focus call, and the browser focus that goes with it. */
  const ringOn = (button: HTMLButtonElement) =>
    act(() => {
      (button as NavEl).__nav?.onGamepadFocus?.();
      button.focus();
    });
  const ringOff = (button: HTMLButtonElement) =>
    act(() => {
      (button as NavEl).__nav?.onGamepadBlur?.();
      button.blur();
    });

  for (const mode of ["static", "decode"] as const) {
    it(`${mode}: a long chip under the ring widens to show every word and its neighbour shrinks to its first word`, () => {
      const { container } = renderRow([LONG_A, LONG_B, SHORT], mode);
      const at = readRow(container);
      expect(at.widths).toEqual([REST_PX, REST_PX]);
      const longWords = at.words[0]!;

      ringOn(at.buttons[0]!);

      const open = readRow(container);
      // The chip takes the row less a stub for its neighbour, and its own words are all there, uncut.
      expect(open.widths[0]).toBeGreaterThan(REST_PX);
      expect(open.widths[1]).toBeLessThan(REST_PX);
      expect(open.widths[0]! + open.widths[1]! + 6).toBe(ROW_PX);
      expect(open.words[0]).toBe(longWords);
      // The neighbour is cut to its first word and an ellipsis; nothing else about it changed.
      expect(open.words[1]).toBe("How…");
      // The ring is still on the chip, which is the very same button.
      expect(document.activeElement).toBe(open.buttons[0]);
      expect(open.buttons[0]).toBe(at.buttons[0]);
    });
  }

  it("the row goes back to equal chips, and the neighbour gets its words back, when the ring leaves", () => {
    const { container } = renderRow([LONG_A, LONG_B, SHORT]);
    const rest = readRow(container);
    ringOn(rest.buttons[0]!);
    ringOff(rest.buttons[0]!);
    const after = readRow(container);
    expect(after.widths).toEqual([REST_PX, REST_PX]);
    expect(after.words).toEqual(rest.words);
  });

  it("never changes a chip whose words fit, even with the ring on it", () => {
    const { container } = renderRow([SHORT, LONG_B, LONG_A]);
    const rest = readRow(container);
    ringOn(rest.buttons[0]!);
    const after = readRow(container);
    expect(after.widths).toEqual([REST_PX, REST_PX]);
    expect(after.words).toEqual(rest.words);
  });

  it("takes the whole row but a stub when the words are longer than the row, and the words still slide inside", () => {
    const huge = "How can I get the best frame rate with the lowest battery use in a very heavy game on Steam Deck";
    const { container } = renderRow([huge, SHORT, LONG_A]);
    ringOn(readRow(container).buttons[0]!);
    const open = readRow(container);
    expect(open.widths[0]! + open.widths[1]! + 6).toBe(ROW_PX);
    expect(open.widths[1]).toBe(30);
    // Longer than even the widened chip, so the chip's own slide is still there to show the rest.
    expect(container.querySelector(".bonsai-preset-carousel-slot .bonsai-preset-chip-text-run")).not.toBeNull();
  });

  it("walks the row with Left and Right: each chip is reached once, none is skipped, the ring never leaves", () => {
    const { container } = renderRow([LONG_A, LONG_B, SHORT]);
    const press = (key: "onMoveLeft" | "onMoveRight") => {
      const here = document.activeElement as NavEl;
      let claimed = false;
      act(() => {
        claimed = here.__nav?.[key]?.() ?? false;
      });
      // Steam moves the ring and calls the new chip's gamepad-focus handler; the stub has no ring, so stand in.
      const now = document.activeElement as NavEl;
      if (now !== here) {
        act(() => {
          here.__nav?.onGamepadBlur?.();
          now.__nav?.onGamepadFocus?.();
        });
      }
      return claimed;
    };
    const first = readRow(container).buttons;
    ringOn(first[0]!);
    const visited: number[] = [0];
    const buttons = () => readRow(container).buttons;
    expect(press("onMoveRight")).toBe(true);
    visited.push(buttons().indexOf(document.activeElement as HTMLButtonElement));
    expect(press("onMoveLeft")).toBe(true);
    visited.push(buttons().indexOf(document.activeElement as HTMLButtonElement));
    expect(visited).toEqual([0, 1, 0]);
    // The chip with the ring is the open one, each time; its neighbour is the stub.
    press("onMoveRight");
    const open = readRow(container);
    expect(open.widths[1]).toBeGreaterThan(open.widths[0]!);
    expect(open.words[0]).toBe("Which…");
    expect(buttons()).toEqual(first); // the very same buttons throughout
    expect(document.activeElement).toBe(first[1]);
  });

  it("does not widen on a touch press: a button focused by a pointer is not the ring", () => {
    const { container } = renderRow([LONG_A, LONG_B, SHORT]);
    const rest = readRow(container);
    const focusVisible = vi.spyOn(Element.prototype, "matches").mockImplementation(function (this: Element, sel: string) {
      return sel === ":focus-visible" ? false : Element.prototype.matches.call(this, sel);
    });
    act(() => rest.buttons[0]!.focus());
    focusVisible.mockRestore();
    expect(readRow(container).widths).toEqual([REST_PX, REST_PX]);
  });

  it("never changes the row's height: only widths move", () => {
    const { container } = renderRow([LONG_A, LONG_B, SHORT]);
    const heightBefore = container.querySelector<HTMLElement>(".bonsai-preset-across")!.style.height;
    ringOn(readRow(container).buttons[0]!);
    const row = container.querySelector<HTMLElement>(".bonsai-preset-across")!;
    expect(row.style.height).toBe(heightBefore);
    for (const slot of readRow(container).slots) {
      expect(Array.from(slot.style)).toEqual(["--bonsai-chip-basis"]);
    }
  });
});

describe("the stylesheet that lets a slot widen", () => {
  const css = buildSection4Section();
  const slotRule = css.match(/\.bonsai-preset-across > \.bonsai-preset-carousel-slot \{([^}]*)\}/);

  it("gives each slot its own length (a custom property), which is an equal share when nothing is open", () => {
    expect(slotRule).toBeTruthy();
    expect(slotRule![1]).toMatch(/flex: 0 1 var\(--bonsai-chip-basis, calc\(\(100% - 6px\) \/ 2\)\) !important/);
  });

  it("takes 0.16 s to open and close, and none at all when the system asks for less motion", () => {
    expect(slotRule![1]).toMatch(/transition: flex-basis 160ms/);
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{\s*\.bonsai-scope \.bonsai-preset-across > \.bonsai-preset-carousel-slot \{\s*transition: none !important;/,
    );
  });

  it("animates only the slot's width: nothing in the rule can change its height", () => {
    expect(slotRule![1]).not.toMatch(/height|padding|margin|transform/);
  });
});
