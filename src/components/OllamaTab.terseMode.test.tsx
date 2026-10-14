/**
 * Title: Ollama tab, Terse is the Reply style slider's first stop
 * Purpose: Pin that the Ollama tab has no separate Terse switch any more (plan 93: Terse is the first stop of
 *          the Reply style slider, in every Ask mode), that the slider's header names the Terse stop when it
 *          is picked.
 * Used for: roadmap "Terse becomes the first stop of the Reply style slider" (plan 93, lane B13).
 * Does not: Prove the D-pad walk (OllamaTab.foldedWalk.test.tsx does, with Steam's scroll modelled), or
 *           prove what the AI is told (tests/test_terse_mode_prompt.py does).
 */
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { OllamaTab, type OllamaTabProps } from "./OllamaTab";
import { resetFoldedTabsForTests, setAllSections } from "../features/folded-tabs/foldedTabsStore";
import { OLLAMA_FOLD_TAB, OLLAMA_SECTIONS } from "../features/folded-tabs/ollamaTabFolds";

/* The tab folds (plan 91 § 2b): these checks are about the rows, so every section is open. */
beforeEach(() => {
  resetFoldedTabsForTests();
  setAllSections(OLLAMA_FOLD_TAB, OLLAMA_SECTIONS.map((s) => s.id), true);
});

const noop = () => {};

function props(overrides: Partial<OllamaTabProps> = {}): OllamaTabProps {
  return {
    ollamaIp: "",
    effectiveOllamaPcIp: "",
    onOllamaIpChange: noop,
    onPersistOllamaIp: noop,
    ollamaLocalOnDeck: false,
    setOllamaLocalOnDeck: noop,
    ollamaLocalAutostart: false,
    setOllamaLocalAutostart: noop,
    namedOllamaHosts: [],
    setNamedOllamaHosts: noop,
    onBeforeDeckyModal: noop,
    onCompleteDeckyModalClose: (close) => close(),
    onOpenOllamaModelsHub: noop,
    latencyWarningSeconds: 20,
    requestTimeoutSeconds: 60,
    latencyTimeoutsCustomEnabled: false,
    setLatencyTimeoutsCustomEnabled: noop,
    setLatencyWarningSeconds: noop,
    setRequestTimeoutSeconds: noop,
    ollamaKeepAlive: "5m",
    setOllamaKeepAlive: noop,
    modelPolicyTier: "open_source_only",
    useLocalKnowledgeBase: false,
    setUseLocalKnowledgeBase: noop,
    ragCorpusVersion: "",
    replyVerbosity: "balanced",
    setReplyVerbosity: noop,
    askThinkEffort: "off",
    setAskThinkEffort: noop,
    ...overrides,
  };
}

const SWITCH = '[label="Terse mode"]';

describe("Ollama tab: Terse is a stop on the Reply style slider, not a switch", () => {
  it("draws no Terse mode switch and no words 'Terse mode' anywhere in the open tab", () => {
    const { container } = render(<OllamaTab {...props()} />);
    expect(document.querySelector(SWITCH)).toBeNull();
    expect(container.textContent).not.toMatch(/Terse mode/i);
  });

  it("the slider's header names the Terse stop when it is picked", () => {
    const { container } = render(<OllamaTab {...props({ replyVerbosity: "terse" })} />);
    const header = container.querySelector(".bonsai-reply-verbosity-slider")?.textContent ?? "";
    expect(header).toMatch(/Reply style:\s*Terse/);
  });

  it("the Thinking row still follows the slider directly", () => {
    const { container } = render(<OllamaTab {...props()} />);
    const slider = container.querySelector(".bonsai-reply-verbosity-slider");
    const thinking = Array.from(container.querySelectorAll("div")).find((d) => d.textContent === "Thinking");
    expect(slider && thinking).toBeTruthy();
    expect(Boolean((slider as Node).compareDocumentPosition(thinking as Node) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
  });
});
