/**
 * Title: Ollama tab modal return-focus wiring
 * Purpose: Pin that the two "Set ... model try order..." buttons arm and register themselves with
 *          the modal return-focus registry, the same way Settings -> Data's two confirm-modal
 *          openers already do.
 * Used for: plan 55 bug B2 -- closing the try-order picker put the ring on the Ollama tab's outer
 *           frame instead of back on the button that opened it.
 * Solves: Neither button ever called `rememberModalReturnFocus` nor registered a ref with the
 *         registry, so there was nothing for the picker's already-correct close path to restore
 *         focus to.
 * Does not: Exercise the picker modal itself -- the test harness's `showModal` stub discards its
 *           argument rather than rendering it (src/test-harness/fakeDeckyUi.tsx). This only proves
 *           the wiring the fix depends on is in place.
 */
import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OllamaTab, type OllamaTabProps } from "./OllamaTab";
import {
  peekModalReturnFocus,
  resetModalReturnFocusRegistry,
  restoreModalReturnFocus,
} from "../features/plugin-shell/modalReturnFocusRegistry";

function buildProps(overrides: Partial<OllamaTabProps> = {}): OllamaTabProps {
  return {
    ollamaIp: "",
    effectiveOllamaPcIp: "",
    onOllamaIpChange: () => {},
    onPersistOllamaIp: () => {},
    ollamaLocalOnDeck: false,
    setOllamaLocalOnDeck: () => {},
    ollamaLocalAutostart: false,
    setOllamaLocalAutostart: () => {},
    namedOllamaHosts: [],
    setNamedOllamaHosts: () => {},
    onBeforeDeckyModal: () => {},
    onCompleteDeckyModalClose: (close) => close(),
    onOpenOllamaModelsHub: () => {},
    onOpenRoutingOrderModal: () => {},
    latencyWarningSeconds: 20,
    requestTimeoutSeconds: 60,
    latencyTimeoutsCustomEnabled: false,
    setLatencyTimeoutsCustomEnabled: () => {},
    setLatencyWarningSeconds: () => {},
    setRequestTimeoutSeconds: () => {},
    ollamaKeepAlive: "5m",
    setOllamaKeepAlive: () => {},
    modelPolicyTier: "open_source_only",
    useLocalKnowledgeBase: false,
    setUseLocalKnowledgeBase: () => {},
    ragCorpusVersion: "",
    replyVerbosity: "balanced",
    setReplyVerbosity: () => {},
    askThinkEffort: "off",
    setAskThinkEffort: () => {},
    ...overrides,
  };
}

describe("OllamaTab modal return focus", () => {
  beforeEach(() => {
    resetModalReturnFocusRegistry();
  });

  it("remembers ollama-text-try-order when Set text model try order... is pressed", () => {
    const { getByText } = render(<OllamaTab {...buildProps()} />);
    fireEvent.click(getByText("Set text model try order…"));
    expect(peekModalReturnFocus()).toBe("ollama-text-try-order");
  });

  it("remembers ollama-vision-try-order when Set vision model try order... is pressed", () => {
    const { getByText } = render(<OllamaTab {...buildProps()} />);
    fireEvent.click(getByText("Set vision model try order…"));
    expect(peekModalReturnFocus()).toBe("ollama-vision-try-order");
  });

  it("registers the text try-order button so the registry can focus it back", () => {
    const { getByText } = render(<OllamaTab {...buildProps()} />);
    const button = getByText("Set text model try order…");
    const focus = vi.spyOn(button, "focus");

    fireEvent.click(button);
    restoreModalReturnFocus();

    expect(focus).toHaveBeenCalled();
  });

  it("registers the vision try-order button so the registry can focus it back", () => {
    const { getByText } = render(<OllamaTab {...buildProps()} />);
    const button = getByText("Set vision model try order…");
    const focus = vi.spyOn(button, "focus");

    fireEvent.click(button);
    restoreModalReturnFocus();

    expect(focus).toHaveBeenCalled();
  });

  it("does not cross-wire the two try-order buttons", () => {
    const { getByText } = render(<OllamaTab {...buildProps()} />);
    const textButton = getByText("Set text model try order…");
    const visionButton = getByText("Set vision model try order…");
    const textFocus = vi.spyOn(textButton, "focus");
    const visionFocus = vi.spyOn(visionButton, "focus");

    fireEvent.click(visionButton);
    restoreModalReturnFocus();

    expect(visionFocus).toHaveBeenCalled();
    expect(textFocus).not.toHaveBeenCalled();
  });
});
