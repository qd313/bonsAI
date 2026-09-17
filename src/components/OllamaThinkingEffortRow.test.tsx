/**
 * Title: Thinking effort row tests
 * Purpose: Pin that the row draws its four choices with the right labels and description text,
 *          and that pressing one calls `onChange` with both the choice and the actual button
 *          element that was pressed -- the piece the one-time Thinking notice (plan 57 step 2)
 *          needs to put the D-pad ring back where it was, with no page search.
 * Used for: plan 57 step 2 (lane B).
 * Solves: Nothing pinned that `onChange` receives a real button handle rather than just the
 *         chosen id, which is what lets the caller avoid searching the page for it afterward.
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

  it("calls onChange with the choice and the actual button pressed", () => {
    const onChange = vi.fn();
    const { getByText } = render(
      <OllamaThinkingEffortRow value="off" onChange={onChange} onMoveUp={() => true} onMoveDown={() => true} />
    );
    const button = getByText("Balanced").closest("button") as HTMLButtonElement;

    fireEvent.click(button);

    expect(onChange).toHaveBeenCalledWith("medium", button);
  });
});
