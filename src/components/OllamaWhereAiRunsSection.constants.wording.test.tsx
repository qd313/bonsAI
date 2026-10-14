/**
 * Title: The starter-set box's time and power hint is short
 *
 * Purpose: Plan 93 lane B9 (the maintainer, 2026-10-13: every warning should be much shorter). The hint
 * under the starter-set and Install Ollama download boxes was 48 words; it is now one short paragraph.
 * Drawn the way the box draws it, at most 40 words, and it still says the three things a person needs:
 * it takes a while, keep Ollama running with the Deck awake and online, and plug in.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LOCAL_SETUP_NETWORK_AND_POWER_HINT } from "./OllamaWhereAiRunsSection.constants";
import { starterSetBoxBody } from "../hooks/localOllamaStarterSet";

describe("the starter-set box time and power hint", () => {
  it("is at most 40 words and keeps the keep-awake, keep-online and plug-in advice", () => {
    const { container } = render(<>{LOCAL_SETUP_NETWORK_AND_POWER_HINT}</>);
    const text = container.textContent ?? "";
    expect(text.split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(40);
    expect(text).toContain("Downloads can take a while.");
    expect(text).toContain("Keep Ollama running and the Deck awake and online until they finish.");
    expect(text).toContain("Plug in if you can.");
    expect(text).not.toMatch(/Tier.?1 batches|powering down/);
  });

  it("is what the starter-set box shows", () => {
    const { container } = render(starterSetBoxBody(false));
    expect(container.textContent).toContain("Downloads can take a while.");
  });
});
