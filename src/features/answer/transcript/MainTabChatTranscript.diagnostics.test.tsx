/**
 * Title: Fold diagnostics into details tests
 * Purpose: Pin the merged Show details / Show diagnostics surface — one entry point, diagnostics
 *          reachable only via the Developer details chip, same verbose-logging gate as before.
 * Used for: Regression coverage for roadmap "Fold Show diagnostics into Show details".
 * Solves: The two-button shape (Show details next to Show diagnostics) cost a QA cycle on
 *         2026-08-17 because neither name said which was which.
 * Does not: Cover the D-pad focus graph change — see liveTurnFocusGraph.test.ts.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";

import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import type { LastExchangeSnapshot } from "../../../types/backgroundAsk";
import type { AskDiagnosticsSnapshot, ContextChip, TransparencySnapshot } from "../../../types/inputTransparency";

/*
 * Same reasoning as MainTabChatTranscript.strategyPanels.test.tsx: `Focusable`/`Button` have to
 * render as real DOM nodes or this suite passes for the wrong reason.
 */
vi.mock("@decky/ui", async () => import("../../../test-harness/fakeDeckyUi"));

const DEVELOPER_CHIP: ContextChip = {
  id: "developer",
  rank: 999,
  label: "Developer details",
  attached: true,
  tier_class: "",
  body: {
    title: "Full transparency snapshot",
    paths: [],
    bullets: ["Raw RPC snapshot JSON below"],
  },
};

const ASK_DIAGNOSTICS: AskDiagnosticsSnapshot = {
  models_before_policy: ["llama3:8b", "llama3:70b"],
  models_after_policy: ["llama3:8b"],
  model_succeeded: "llama3:8b",
  policy_tier: "foss",
};

function snapshot(overrides: Partial<TransparencySnapshot> = {}): TransparencySnapshot {
  return {
    route: "ollama",
    raw_question: "how do i dodge the exploders",
    sanitizer_action: "none",
    sanitizer_reason_codes: [],
    text_after_sanitizer: "how do i dodge the exploders",
    ollama_model: "llama3:8b",
    system_prompt: null,
    user_text_for_model: null,
    user_image_count: 0,
    attachment_paths: [],
    assistant_raw: null,
    assistant_after_attachment_format: null,
    final_response: "Keep your distance and strafe.",
    applied: null,
    success: true,
    app_id: "",
    app_name: "",
    pc_ip: "",
    error_message: "",
    elapsed_seconds: 1.2,
    context_chips: [DEVELOPER_CHIP],
    ask_diagnostics: ASK_DIAGNOSTICS,
    ...overrides,
  };
}

const LAST_EXCHANGE: LastExchangeSnapshot = {
  question: "how do i dodge the exploders",
  answer: "Keep your distance and strafe.",
};

function renderTranscript(overrides: Partial<MainTabChatTranscriptProps>) {
  const props: MainTabChatTranscriptProps = {
    fullBleedRowStyle: {},
    isAsking: false,
    selectedAttachment: null,
    ollamaContext: {} as MainTabChatTranscriptProps["ollamaContext"],
    unifiedInput: "",
    showSlowWarning: false,
    latencyWarningSeconds: 30,
    ollamaResponse: "Keep your distance and strafe.",
    elapsedSeconds: null,
    lastApplied: null,
    canSaveDesktopNote: false,
    onOpenDesktopNoteSave: () => {},
    askMode: "speed",
    expandedTurnKey: "live",
    askThreadDisplayQuestion: "how do i dodge the exploders",
    lastExchange: LAST_EXCHANGE,
    onRetryLastResponse: () => {},
    ...overrides,
  };
  return render(<MainTabChatTranscript {...props} />);
}

function clickShowDetails(container: HTMLElement) {
  const toggle = container.querySelector('[aria-label="Show details"]');
  expect(toggle).not.toBeNull();
  fireEvent.click(toggle!);
}

/*
 * Roadmap: "Fold Show diagnostics into Show details" (closed 2026-08-28). Two adjacent buttons
 * (Show details / Show diagnostics) used to do overlapping jobs — this suite pins the merged
 * shape: exactly one entry point, and the raw ask_diagnostics dump reachable only by opening it
 * and landing on the "Developer details" chip, still gated on desktop verbose logging.
 */
describe("Show diagnostics folded into Show details", () => {
  it("never renders the old standalone Ask diagnostics control", () => {
    const { container } = renderTranscript({
      transparencySnapshot: snapshot(),
      desktopAskVerboseLogging: true,
    });

    // Before Show details is opened.
    expect(container.querySelector(".bonsai-ask-diagnostics")).toBeNull();
    expect(container.textContent).not.toContain("Show diagnostics");

    clickShowDetails(container);

    // And after — the second button never comes back.
    expect(container.querySelector(".bonsai-ask-diagnostics")).toBeNull();
    expect(container.textContent).not.toContain("Show diagnostics");
    expect(container.textContent).not.toContain("Hide diagnostics");
  });

  it("shows the raw ask_diagnostics JSON inside the Developer details chip once details are open", () => {
    const { container } = renderTranscript({
      transparencySnapshot: snapshot(),
      desktopAskVerboseLogging: true,
    });

    clickShowDetails(container);

    expect(container.textContent).toContain("Developer details");
    expect(container.textContent).toContain("models_before_policy");
    expect(container.textContent).toContain("llama3:70b");
  });

  it("keeps the diagnostics JSON out of the chip body when desktop verbose logging is off", () => {
    const { container } = renderTranscript({
      transparencySnapshot: snapshot(),
      desktopAskVerboseLogging: false,
    });

    clickShowDetails(container);

    // The chip itself (and its lightweight summary) still renders — only the raw dump is gated.
    expect(container.textContent).toContain("Developer details");
    expect(container.textContent).not.toContain("models_before_policy");
  });

  it("keeps the diagnostics JSON out when the backend returned none, even with logging on", () => {
    const { container } = renderTranscript({
      transparencySnapshot: snapshot({ ask_diagnostics: null }),
      desktopAskVerboseLogging: true,
    });

    clickShowDetails(container);

    expect(container.textContent).toContain("Developer details");
    expect(container.textContent).not.toContain("models_before_policy");
  });
});
