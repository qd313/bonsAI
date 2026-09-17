/**
 * Title: Thinking effort row tests
 * Purpose: Pin that the row draws its four choices with the right labels and description text,
 *          and that pressing one calls `onChange` with the choice that was pressed.
 * Used for: plan 57 step 2 (lane B).
 * Solves: Nothing pinned that pressing a button reports the right choice to the caller.
 * Does not: Cover the D-pad ring returning to this row after its one-time Thinking notice closes
 *           -- that goes through the real modal return-focus registry now, not a button handle
 *           passed through `onChange`, and is pinned in useThinkingNoticeGate.test.tsx instead.
 */
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OllamaThinkingEffortRow } from "./OllamaThinkingEffortRow";
import { ASK_THINK_EFFORT_DESCRIPTIONS } from "../data/askThinkEffort";

describe("OllamaThinkingEffortRow", () => {
  it("draws the four choices", () => {
    const { getByText } = render(
      <OllamaThinkingEffortRow value="off" onChange={() => {}} onMoveUp={() => true} onMoveDown={() => true} />
    );

    expect(getByText("Off")).toBeTruthy();
    expect(getByText("Brief")).toBeTruthy();
    expect(getByText("Balanced")).toBeTruthy();
    expect(getByText("Deep")).toBeTruthy();
  });

  it("shows the description for the currently selected level", () => {
    const { getByText } = render(
      <OllamaThinkingEffortRow value="medium" onChange={() => {}} onMoveUp={() => true} onMoveDown={() => true} />
    );

    expect(getByText(ASK_THINK_EFFORT_DESCRIPTIONS.medium)).toBeTruthy();
  });

  it("calls onChange with the choice that was pressed", () => {
    const onChange = vi.fn();
    const { getByText } = render(
      <OllamaThinkingEffortRow value="off" onChange={onChange} onMoveUp={() => true} onMoveDown={() => true} />
    );
    const button = getByText("Balanced").closest("button") as HTMLButtonElement;

    fireEvent.click(button);

    expect(onChange).toHaveBeenCalledWith("medium");
  });
});
