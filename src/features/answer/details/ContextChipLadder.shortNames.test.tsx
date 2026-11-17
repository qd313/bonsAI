/**
 * Title: Show details chips: short names on the chips, the full wording kept in the box
 * Purpose: Pin plan 105's drawing (the density board, tab 1, round 2 option A): each chip says only the fact
 *          ("Thought 16 s", "gemma4:e2b"), and the box that opens under the chip keeps the chip's full wording
 *          in grey under its title. A chip saved before plan 105 has no short name and still shows its full label.
 * Used for: ContextChipLadder.tsx (the chip's words) and ChipExpandedBody.tsx (the line under the box's title),
 *           reading `short_label` from the back end (chip_short_labels.py).
 * Does not: Walk the D-pad, or measure the chips' sizes (ContextChipLadder.drawnSize.test.tsx).
 */
import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ContextChipLadder } from "./ContextChipLadder";
import type { ContextChip, TransparencySnapshot } from "../../../types/inputTransparency";

function chip(id: string, label: string, title: string, shortLabel?: string): ContextChip {
  return {
    id,
    rank: 1,
    label,
    ...(shortLabel === undefined ? {} : { short_label: shortLabel }),
    attached: true,
    tier_class: "",
    body: { title, paths: [], bullets: ["one fact"] },
  };
}

/* The board's thinking and model chips as the back end now sends them, an older saved chip with no short name,
   and a chip whose label is its title and already short. */
const CHIPS = [
  chip("reasoning", "Thinking: Balanced · 16 s · ~445 tokens", "Reasoning", "Thought 16 s"),
  chip("model", "Routed gemma4:e2b-it-qat", "Model source policy", "gemma4:e2b"),
  chip("tdp", "Read current TDP", "Power context"),
  chip("local_command", "Local note command", "Local note command", ""),
];

function draw() {
  const snapshot = { context_chips: CHIPS.map((c, i) => ({ ...c, rank: i + 1 })) } as unknown as TransparencySnapshot;
  const { container } = render(<ContextChipLadder snapshot={snapshot} />);
  const chips = () => [...container.querySelectorAll<HTMLElement>(".bonsai-chip-ladder-chip")];
  const open = (i: number) => {
    const el = chips()[i]!;
    el.setAttribute("tabindex", "-1");
    act(() => el.focus());
  };
  const box = () => container.querySelector<HTMLElement>(".bonsai-chip-body")!;
  const fullLine = () => box().querySelector(".bonsai-chip-body-full")?.textContent ?? null;
  return { chips, open, box, fullLine };
}

describe("the chips say only the fact", () => {
  it("draws each chip's short name, and the full label where an older chip has none", () => {
    const { chips } = draw();
    expect(chips().map((c) => c.textContent)).toEqual([
      "Thought 16 s",
      "gemma4:e2b",
      "Read current TDP",
      "Local note command",
    ]);
  });
});

describe("each box keeps the chip's full wording under its title", () => {
  it("shows the full wording in grey under the open chip's title, chip by chip", () => {
    const { open, box, fullLine } = draw();
    expect(box().textContent).toContain("Reasoning");
    expect(fullLine()).toBe("Thinking: Balanced · 16 s · ~445 tokens");
    open(1);
    expect(box().textContent).toContain("Model source policy");
    expect(fullLine()).toBe("Routed gemma4:e2b-it-qat");
    open(2);
    expect(box().textContent).toContain("Power context");
    expect(fullLine()).toBe("Read current TDP");
  });

  it("draws the line small and grey, as the board does, inside the title block", () => {
    const { box } = draw();
    const line = box().querySelector<HTMLElement>(".bonsai-chip-body-full")!;
    expect(line.style.color).toBe("rgb(159, 183, 213)");
    expect(line.style.fontWeight).toBe("400");
    expect(line.style.fontSize).toContain("10px");
  });

  it("does not repeat a label that is the box's own title", () => {
    const { open, box, fullLine } = draw();
    open(3);
    expect(fullLine()).toBeNull();
    expect(box().textContent?.match(/Local note command/g)).toHaveLength(1);
  });
});
