/**
 * Title: The opened reasoning block drops the model's own marks
 * Purpose: Pin that the Show reasoning block reads the whole thinking without the stray backtick
 *          marks and the raw "Thinking Process" heading, while keeping every line of real content
 *          (the rule checklist stays here: this is the whole record the person chose to open).
 * Used for: buildReasoningFoldElement.tsx's buildReasoningOpenBlock.
 * Solves: backticks around a quoted tag showed in the opened reasoning in 3 of 6 Deck tries
 *         (docs/test-evidence/plan70-THINKING-SPOILER-01-try2.json: '`<bonsai-status>`').
 * Does not: test the fold row or its controller wiring; MainTabChatTranscript.reasoningFold.test.tsx does.
 */
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import { buildReasoningOpenBlock } from "./buildReasoningFoldElement";

describe("the opened reasoning block", () => {
  it("draws the saved thinking without the heading, backticks or bold marks, rules kept", () => {
    const saved = [
      "Thinking Process:",
      "",
      "1.  **Analyze the Request:** The user wants the Hornet fight.",
      "2.  **Determine Constraints:**",
      "    *   Must start with `<bonsai-status>`.",
    ].join("\n");
    const { container } = render(buildReasoningOpenBlock("t1", saved));
    expect(container.textContent).toBe(
      [
        "1.  Analyze the Request: The user wants the Hornet fight.",
        "2.  Determine Constraints:",
        "    • Must start with <bonsai-status>.",
      ].join("\n"),
    );
  });
});
