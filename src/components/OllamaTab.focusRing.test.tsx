/**
 * Title: Ollama tab buttons show a ring when the D-pad is on them
 * Purpose: Pin the fix for roadmap "The highlight goes invisible on some tabs, starting with Down from
 *          'Update AI & models'" (measured on the Deck 2026-10-02, plan79-P79-M2-OLLAMA-INVISIBLE.json:
 *          13 of 28 presses on this tab had focus on a fully visible button and drew nothing).
 * Used for: The AI models button and the Thinking choices.
 * Solves: Steam marks the focused control with its `gpfocus` class and shows focus on its own buttons
 *         by changing their fill. These buttons set their fill inline (the glass look), and an inline
 *         style always beats a class rule, so Steam's cue never appeared and nothing else drew one.
 *         The two buttons that did show a ring carry the plugin's ring class.
 * Does not: See pixels. jsdom has no paint engine (design-language.md rule 6). What it does do is run
 *           the CSS cascade, so this renders the real tab inside `.bonsai-scope` with the plugin's real
 *           stylesheet, puts Steam's focus class on the button, and reads the computed outline: it
 *           proves a rule draws a solid outline on that button while Steam says it is focused, and
 *           draws none while it is not. Whether the outline is clipped by a box around it is a Deck
 *           check.
 */
import { render } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { OllamaTab, type OllamaTabProps } from "./OllamaTab";
import { buildBonsaiScopeStylesheet } from "../styles/bonsaiScopeStylesheet";

const noop = () => {};

function props(): OllamaTabProps {
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
    terseMode: false,
    setTerseMode: noop,
    askThinkEffort: "off",
    setAskThinkEffort: noop,
  };
}

/** The outline the cascade gives `el`, with and without Steam's focus marker on it. */
function outlineWhen(el: HTMLElement, focused: boolean): string {
  el.classList.toggle("gpfocus", focused);
  const outline = getComputedStyle(el).outline;
  el.classList.remove("gpfocus");
  return outline;
}

describe("Ollama tab: a focused button always shows a ring", () => {
  let sheet: HTMLStyleElement;
  beforeAll(() => {
    sheet = document.createElement("style");
    sheet.textContent = buildBonsaiScopeStylesheet();
    document.head.appendChild(sheet);
  });
  afterAll(() => sheet.remove());

  function renderTab() {
    return render(
      <div className="bonsai-scope">
        <OllamaTab {...props()} />
      </div>,
    );
  }

  it.each(["AI models"])(
    "%s draws a solid outline while Steam has focus on it, and none otherwise",
    (label) => {
      const button = renderTab().getByLabelText(label);
      expect(outlineWhen(button, true)).toMatch(/solid/);
      expect(outlineWhen(button, false)).toBe("");
    },
  );

  it("every Thinking choice draws a solid outline while Steam has focus on it", () => {
    const choices = renderTab().getAllByLabelText(/^Set thinking to /);
    expect(choices.length).toBeGreaterThanOrEqual(3);
    for (const choice of choices) {
      expect(outlineWhen(choice, true), choice.getAttribute("aria-label") ?? "").toMatch(/solid/);
    }
  });
});
