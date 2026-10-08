/**
 * Title: Show details draws every chip, all the time, all the same size
 * Purpose: Pin the fix for the maintainer's report of 2026-10-08 (screen recording of an answer with
 *          seven chips under "This answer"): the row showed only the open chip and the two either
 *          side, faded by distance, so a step added or dropped a chip, the wrapped rows changed
 *          count and the whole answer above shifted about 28 px; the open chip was also drawn
 *          bigger and bolder, so chips changed width and the rows re-wrapped again.
 * Used for: ContextChipLadder.tsx.
 * Solves: "We should have all of the chips visible, not just 3 or 4." Counts what is drawn on
 *         screen after every step of a walk over nine chips (more than the old limit of six), reads
 *         each chip's own opacity, font size and weight, and checks the "Chip N of M" caption.
 * Does not: Measure positions (ContextChipLadder.stillRow.test.tsx does) or prove the wrap on the
 *           Deck: jsdom has no line breaking, so "the rows do not re-wrap" is checked as "no chip's
 *           size changes and none comes or goes".
 */
import React from "react";
import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ContextChipLadder } from "./ContextChipLadder";
import type { ContextChip, TransparencySnapshot } from "../utils/inputTransparency";

const hoisted = vi.hoisted(() => ({
  focusableProps: [] as Array<Record<string, unknown>>,
}));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const RealFocusable = stubs.Focusable;
  const CapturingFocusable = React.forwardRef<HTMLDivElement, Record<string, unknown>>(
    function CapturingFocusable(props, ref) {
      hoisted.focusableProps.push(props);
      return <RealFocusable {...props} ref={ref} />;
    }
  );
  return { ...stubs, Focusable: CapturingFocusable };
});

const OPEN_CHIP = "bonsai-chip-ladder-chip bonsai-chip-ladder-chip--active";

function openChipProps(): Record<string, unknown> {
  const matches = hoisted.focusableProps.filter((p) => p.className === OPEN_CHIP);
  return matches[matches.length - 1]!;
}

const LABELS = [
  "Keyword + meaning",
  "KB: 14 sections",
  "Reply style",
  "Thinking",
  "Spoiler risk",
  "Routed gemma4",
  "Game context",
  "Screenshot",
  "Developer details",
];

function chip(label: string, i: number): ContextChip {
  return {
    id: `chip-${i}`,
    rank: i + 1,
    label,
    attached: true,
    tier_class: "",
    body: { title: label, paths: [], bullets: [] },
  };
}

const SNAPSHOT = { context_chips: LABELS.map(chip) } as unknown as TransparencySnapshot;

function drawnChips(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(".bonsai-chip-ladder-chip")];
}

describe("Show details draws every chip, whatever the count", () => {
  it("shows all nine chips after every step of a walk from the first to the last", () => {
    const { container } = render(<ContextChipLadder snapshot={SNAPSHOT} onMoveDownFromLadder={() => true} />);

    for (let step = 0; step < LABELS.length; step += 1) {
      expect(
        drawnChips(container).map((el) => el.textContent),
        `chip ${step + 1} open`,
      ).toEqual(LABELS);
      expect(container.querySelector(".bonsai-chip-ladder")!.textContent).toContain(
        `Chip ${step + 1} of ${LABELS.length}`,
      );
      if (step < LABELS.length - 1) {
        act(() => {
          (openChipProps().onMoveDown as () => boolean)();
        });
      }
    }
  });

  it("draws no chip faded, at any step", () => {
    const { container } = render(<ContextChipLadder snapshot={SNAPSHOT} onMoveDownFromLadder={() => true} />);

    for (let step = 0; step < LABELS.length; step += 1) {
      for (const el of drawnChips(container)) {
        expect(["", "1"], `${el.textContent} with chip ${step + 1} open`).toContain(el.style.opacity);
      }
      act(() => {
        (openChipProps().onMoveDown as () => boolean)();
      });
    }
  });

  it("draws the open chip at the same size and weight as the rest, so no step changes a chip's width", () => {
    const { container } = render(<ContextChipLadder snapshot={SNAPSHOT} onMoveDownFromLadder={() => true} />);

    const seen = new Set<string>();
    for (let step = 0; step < LABELS.length - 1; step += 1) {
      for (const el of drawnChips(container)) seen.add(`${el.style.fontSize}/${el.style.fontWeight}`);
      act(() => {
        (openChipProps().onMoveDown as () => boolean)();
      });
    }
    expect([...seen]).toHaveLength(1);
  });

  it("still marks the open chip by its fill and border", () => {
    const { container } = render(<ContextChipLadder snapshot={SNAPSHOT} onMoveDownFromLadder={() => true} />);
    act(() => {
      (openChipProps().onMoveDown as () => boolean)();
    });

    const open = container.querySelectorAll<HTMLElement>(".bonsai-chip-ladder-chip--active");
    expect(open).toHaveLength(1);
    expect(open[0]!.textContent).toBe(LABELS[1]);
    const other = drawnChips(container).find((el) => el !== open[0])!;
    expect(open[0]!.style.background).not.toBe(other.style.background);
    expect(open[0]!.style.border).not.toBe(other.style.border);
  });
});
