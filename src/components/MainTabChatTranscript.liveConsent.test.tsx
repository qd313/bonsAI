/**
 * Title: A live answer honours "spoilers are okay" from its first streamed word
 * Purpose: Pin roadmap "spoilers are okay still covers the live answer" (CONST-SPOIL-CONSENT-01,
 *          live half, plan 81 helper S). On the Deck, a question that said "spoilers are okay"
 *          showed a "Spoiler hidden until complete" chip for 2.25 s and then a tap-to-show cover
 *          for 1.35 s while the answer was still arriving; only the finished answer was plain.
 * Used for: MainTabChatTranscript.tsx (the live facts handed to the answer bubble) reading the
 *           turn's consent from the pending poll (`ollamaContext.spoiler_consent`) instead of
 *           only from `lastExchange`, which is empty until the answer completes.
 * Solves: The live bubble knew the turn's consent only at completion, so every hidden block that
 *         streamed in before then was covered.
 * Does not: Prove the look or the timing on the Deck; that is the Deck check (scenario
 *           spoiler-live, 250 ms reads: 0 chip, 0 cover).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import { resetSpoilerFenceOpenCountForTests } from "./MainTabBonsaiAiMarkdownChunk";

const QUESTION = "Give me a plan for the next area in Hollow Knight, spoilers are okay.";
const FACT = "the Hollow Knight was sealed inside the Black Egg Temple";
const INTRO = "Here is the plan.\n\n";

/* The partials a stream passes through: fence just opened, fence part filled, fence closed. */
const PARTIALS: [string, string][] = [
  ["the opening mark only", `${INTRO}\`\`\`bonsai-spoiler`],
  ["a half sentence inside the block", `${INTRO}\`\`\`bonsai-spoiler\nStory fact: ${FACT.slice(0, 20)}`],
  ["the block still open", `${INTRO}\`\`\`bonsai-spoiler\nStory fact: ${FACT}.`],
  ["the block just closed", `${INTRO}\`\`\`bonsai-spoiler\nStory fact: ${FACT}.\n\`\`\`\n\nThen pick one.`],
];

function livePartial(partial: string, consent: boolean | undefined): MainTabChatTranscriptProps {
  return {
    fullBleedRowStyle: {},
    isAsking: true,
    selectedAttachment: null,
    ollamaContext: {
      app_id: "",
      app_context: "none",
      app_name: "Hollow Knight",
      asked_entity: "",
      ...(consent === undefined ? {} : { spoiler_consent: consent }),
    },
    unifiedInput: "",
    showSlowWarning: false,
    latencyWarningSeconds: 30,
    ollamaResponse: "",
    elapsedSeconds: null,
    lastApplied: null,
    canSaveDesktopNote: false,
    onOpenDesktopNoteSave: () => {},
    askMode: "strategy",
    askThreadCollapsed: [],
    expandedTurnKey: "live",
    askThreadDisplayQuestion: QUESTION,
    lastExchange: null,
    isStreamingPreview: true,
    streamDisplayText: partial,
    strategySpoilerMaskingEnabled: true,
    onAskOllama: async () => {},
  };
}

function coverOrChip(container: HTMLElement): string[] {
  const found: string[] = [];
  if (container.querySelector(".bonsai-spoiler-reveal-target")) found.push("cover");
  if (container.textContent?.includes("tap to show")) found.push("tap to show");
  if (container.textContent?.includes("Spoiler hidden until complete")) found.push("chip");
  return found;
}

beforeEach(() => resetSpoilerFenceOpenCountForTests());

describe("a live answer asked with spoiler consent", () => {
  it.each(PARTIALS)("shows no chip and no cover at any partial: %s", (_label, partial) => {
    const { container } = render(<MainTabChatTranscript {...livePartial(partial, true)} />);
    expect(coverOrChip(container)).toEqual([]);
    expect(container.textContent).toContain("Here is the plan.");
  });

  it("shows the hidden block's words as plain text from the first streamed word", () => {
    const { container } = render(<MainTabChatTranscript {...livePartial(PARTIALS[2][1], true)} />);
    expect(container.textContent).toContain(FACT);
  });

  it("covers the same stream when the turn has no consent (control)", () => {
    const covered = PARTIALS.map(([, partial]) => {
      const { container, unmount } = render(<MainTabChatTranscript {...livePartial(partial, undefined)} />);
      const found = coverOrChip(container);
      unmount();
      return found.length > 0;
    });
    /* At least the part-filled and closed shapes must be covered or chipped without consent. */
    expect(covered.slice(1).every(Boolean)).toBe(true);
  });

  it("does not let a stale earlier exchange's consent decide a live turn that has none", () => {
    const props = livePartial(PARTIALS[3][1], false);
    props.lastExchange = {
      question: "earlier question, spoilers are okay",
      answer: "earlier answer",
      spoilerConsentEffective: true,
    };
    const { container } = render(<MainTabChatTranscript {...props} />);
    expect(coverOrChip(container).length).toBeGreaterThan(0);
  });
});
