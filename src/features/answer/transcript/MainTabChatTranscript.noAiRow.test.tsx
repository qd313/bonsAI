/**
 * Title: "Open the Ollama tab" under the "AI is not set up" answer
 * Purpose: Pin roadmap Bug "With no AI installed, a question is answered with a message that blames
 *          the Model policy tier and has no button to the Ollama tab" (P96-F1) at the level the Deck
 *          check looks at: the answer on screen has a row under it, the row's button jumps to the
 *          Ollama tab, and Down from the answer's own Retry / Copy row reaches it.
 * Used for: MainTabChatTranscript.tsx, ChatTranscriptHintRows.tsx and noAiSetUpNotice.ts, the real
 *           rendered transcript. Steam's own node is modelled the one way it matters here: a
 *           Focusable that is mounted fills its `navRef` holder, as Steam does, so a registered id
 *           only answers `takeNavFocus` while the row is drawn.
 * Solves: Without the row the holder stays empty, so Down from the answer finds nothing and the
 *         button text is missing -- both checks below fail on the old code.
 * Does not: Prove the ring lands on the Ollama tab's first control after the jump; that is the
 *           Deck check (P96-F1-NO-AI).
 */
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";

vi.mock("@decky/ui", async () => {
  const fake = await import("../../../test-harness/fakeDeckyUi");
  /* A mounted Focusable fills its navRef holder, as Steam does; the fake never does. */
  const Focusable = React.forwardRef<HTMLDivElement, Record<string, unknown>>(function F(props, ref) {
    const { children, navRef, ...rest } = props as { children?: React.ReactNode; navRef?: { current: unknown } };
    React.useEffect(() => {
      if (navRef) navRef.current = { TakeFocus: (globalThis as { __takeFocus?: () => boolean }).__takeFocus };
      return () => {
        if (navRef) navRef.current = null;
      };
    }, [navRef]);
    const Base = fake.Focusable as React.ElementType;
    return (
      <Base ref={ref} {...rest}>
        {children}
      </Base>
    );
  });
  return { ...fake, Focusable };
});

import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import type { TransparencySnapshot } from "../../../types/inputTransparency";
import { focusDownFromReplyUtilityRowOrPermHint } from "../../../shared/dpad/chatTranscriptNavHelpers";
import { resetNavFocusRegistry } from "../../../shared/dpad/navFocusRegistry";

const NO_AI_ANSWER =
  "The AI is not set up on this Deck yet. Open the Ollama tab and use Install Ollama, or point bonsAI at a PC running Ollama.";
const TIER_ANSWER = "No models in the fallback list match your Model policy tier. Install a permitted Ollama model.";

const takeFocus = vi.fn(() => true);
(globalThis as { __takeFocus?: () => boolean }).__takeFocus = takeFocus;

function renderTranscript(overrides: Partial<MainTabChatTranscriptProps> = {}) {
  const props: MainTabChatTranscriptProps = {
    fullBleedRowStyle: {},
    isAsking: false,
    selectedAttachment: null,
    ollamaContext: {} as MainTabChatTranscriptProps["ollamaContext"],
    unifiedInput: "",
    showSlowWarning: false,
    latencyWarningSeconds: 30,
    ollamaResponse: NO_AI_ANSWER,
    elapsedSeconds: null,
    lastApplied: null,
    canSaveDesktopNote: true,
    onOpenDesktopNoteSave: () => {},
    askMode: "speed",
    askThreadCollapsed: [],
    expandedTurnKey: "live",
    askThreadDisplayQuestion: "What is a good first weapon",
    transparencySnapshot: { raw_question: "What is a good first weapon" } as TransparencySnapshot,
    ...overrides,
  };
  return render(<MainTabChatTranscript {...props} />);
}

afterEach(() => {
  cleanup();
  takeFocus.mockClear();
  resetNavFocusRegistry();
});

const openOllamaButton = (root: ParentNode) =>
  Array.from(root.querySelectorAll("button")).find((b) => b.textContent === "Open the Ollama tab") ?? null;

describe("the Open the Ollama tab row under the AI-is-not-set-up answer", () => {
  it("is drawn under that answer and its button jumps to the Ollama tab", () => {
    const onNavigateToOllama = vi.fn();
    const { container } = renderTranscript({ onNavigateToOllama });
    const button = openOllamaButton(container);
    expect(button).not.toBeNull();
    fireEvent.click(button!);
    expect(onNavigateToOllama).toHaveBeenCalledTimes(1);
  });

  it("is a D-pad stop: Down from the answer's own Retry / Copy row takes Steam's transfer to it", () => {
    renderTranscript({ onNavigateToOllama: () => {} });
    expect(takeFocus).not.toHaveBeenCalled();
    expect(focusDownFromReplyUtilityRowOrPermHint(null)).toBe(true);
    expect(takeFocus).toHaveBeenCalledTimes(1);
  });

  it("is not drawn under an ordinary answer, an answer the tier message words, or without a way to jump", () => {
    const ordinary = renderTranscript({ ollamaResponse: "Use the nail first.", onNavigateToOllama: () => {} });
    expect(openOllamaButton(ordinary.container)).toBeNull();
    ordinary.unmount();
    const tier = renderTranscript({ ollamaResponse: TIER_ANSWER, onNavigateToOllama: () => {} });
    expect(openOllamaButton(tier.container)).toBeNull();
    tier.unmount();
    const noJump = renderTranscript({});
    expect(openOllamaButton(noJump.container)).toBeNull();
  });

  it("goes away while the next question is being answered", () => {
    const { container } = renderTranscript({ isAsking: true, onNavigateToOllama: () => {} });
    expect(openOllamaButton(container)).toBeNull();
  });

  it("takes the place of the troubleshooting hint rather than sitting beside it", () => {
    const { container } = renderTranscript({
      onNavigateToOllama: () => {},
      onNavigateToPermissions: () => {},
      unifiedInput: "why is my game crashing",
      gameContextReadEnabled: false,
    });
    expect(openOllamaButton(container)).not.toBeNull();
    expect(container.textContent).not.toContain("Troubleshooting Ask detected");
  });
});
