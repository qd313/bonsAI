/**
 * Title: Text size changes the chat's words and nothing else
 * Purpose: Render the real chat (a question, its answer and the opened Show details panel) with the real
 *          stylesheet for each Text size, read the font size the browser would settle on, and check the
 *          question, the answer and the Show details text move by the chosen step while the tab bar's
 *          label, the chat's name, a chip and the Settings text do not move at all.
 * Used for: plan 87 F6, the Text size setting (Small 0.9, Normal 1, Large 1.15).
 * Does not: Lay anything out. jsdom has no layout, so whether Large still fits a long word in the 300 px
 *           column is the Deck check; the answer wraps anywhere, so a long word breaks and never spills.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";

import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import type { LastExchangeSnapshot } from "../types/backgroundAsk";
import type { ContextChip, TransparencySnapshot } from "../utils/inputTransparency";
import { buildBonsaiScopeStylesheet } from "../styles/bonsaiScopeStylesheet";
import { CHAT_TITLE_CSS } from "../features/chat-title/chatTitleStyles";
import { CHAT_TEXT_SCALE } from "../data/chatTextSize";
import { makeFontSizeReader } from "../test-harness/settledFontSize";
import type { ChatTextSize } from "../data/bonsaiSettingsSchema";

vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

const QUESTION = "how do i dodge the exploders";
const ANSWER = "Keep your distance and strafe.\n\nThen shoot them from range.";

const CHIP: ContextChip = {
  id: "game_context",
  rank: 1,
  label: "Game context",
  attached: true,
  tier_class: "",
  body: { title: "Game context", paths: [], bullets: ["Fought the exploders"] },
};

const SNAPSHOT = {
  route: "ollama",
  raw_question: QUESTION,
  sanitizer_action: "none",
  sanitizer_reason_codes: [],
  text_after_sanitizer: QUESTION,
  ollama_model: "llama3:8b",
  system_prompt: null,
  user_text_for_model: null,
  user_image_count: 0,
  attachment_paths: [],
  assistant_raw: null,
  assistant_after_attachment_format: null,
  final_response: ANSWER,
  applied: null,
  success: true,
  app_id: "",
  app_name: "",
  pc_ip: "",
  error_message: "",
  elapsed_seconds: 1.2,
  context_chips: [CHIP],
  ask_diagnostics: null,
} as unknown as TransparencySnapshot;

const LAST_EXCHANGE: LastExchangeSnapshot = { question: QUESTION, answer: ANSWER };

function renderChat() {
  const props: MainTabChatTranscriptProps = {
    fullBleedRowStyle: {},
    isAsking: false,
    selectedAttachment: null,
    ollamaContext: {} as MainTabChatTranscriptProps["ollamaContext"],
    unifiedInput: "",
    showSlowWarning: false,
    latencyWarningSeconds: 30,
    ollamaResponse: ANSWER,
    elapsedSeconds: null,
    lastApplied: null,
    canSaveDesktopNote: false,
    onOpenDesktopNoteSave: () => {},
    askMode: "speed",
    askThreadCollapsed: [],
    expandedTurnKey: "live",
    askThreadDisplayQuestion: QUESTION,
    lastExchange: LAST_EXCHANGE,
    transparencySnapshot: SNAPSHOT,
  };
  const view = render(
    <div className="bonsai-scope">
      <MainTabChatTranscript {...props} />
      {/* Things that live next to the chat and must not follow it. */}
      <div className="bonsai-tab-bar">
        <span className="bonsai-tab-bar__name">Main</span>
      </div>
      <div className="bonsai-chat-title">
        <span className="bonsai-chat-title__words">My chat</span>
      </div>
      <div className="bonsai-settings-section-stack">
        <div className="bonsai-prose" style={{ fontSize: 11 }}>
          Settings text
        </div>
      </div>
    </div>,
  );
  fireEvent.click(view.container.querySelector('[aria-label="Show details"], [aria-label="Hide details"]')!);
  return view;
}

type Measured = { question: number; answer: number; details: number; tabLabel: number; chatName: number; settings: number; chip: number };

function measure(size: ChatTextSize): Measured {
  const { container, unmount } = renderChat();
  const read = makeFontSizeReader(`${buildBonsaiScopeStylesheet()}\n${CHAT_TITLE_CSS}`, CHAT_TEXT_SCALE[size]);
  const one = (sel: string): Element => {
    const el = container.querySelector(sel);
    expect(el, sel).not.toBeNull();
    return el!;
  };
  const measured = {
    question: read(one(".bonsai-chat-turn-row-title")),
    answer: read(one(".bonsai-chat-ai-bubble .bonsai-md-p")),
    details: read(one(".bonsai-chip-body li")),
    tabLabel: read(one(".bonsai-tab-bar__name")),
    chatName: read(one(".bonsai-chat-title__words")),
    settings: read(one(".bonsai-settings-section-stack .bonsai-prose")),
    chip: read(one(".bonsai-chip-ladder-chip")),
  };
  unmount();
  return measured;
}

describe("Text size scales the chat's own words only", () => {
  const normal = measure("normal");

  it("steps the question, the answer and the Show details text by the chosen amount", () => {
    for (const size of ["small", "large"] as const) {
      const m = measure(size);
      const step = CHAT_TEXT_SCALE[size];
      expect(m.question).toBeCloseTo(normal.question * step, 5);
      expect(m.answer).toBeCloseTo(normal.answer * step, 5);
      expect(m.details).toBeCloseTo(normal.details * step, 5);
    }
    expect(measure("large").answer).toBeGreaterThan(normal.answer);
    expect(measure("small").answer).toBeLessThan(normal.answer);
  });

  it("leaves the tab bar label, the chat's name, a chip and the Settings text exactly where they were", () => {
    for (const size of ["small", "large"] as const) {
      const m = measure(size);
      expect(m.tabLabel).toBe(normal.tabLabel);
      expect(m.chatName).toBe(normal.chatName);
      expect(m.chip).toBe(normal.chip);
      expect(m.settings).toBe(normal.settings);
    }
  });

  it("reads Normal as today's sizes: 12 for the answer, 11 for the question and the details", () => {
    expect(normal.answer).toBe(12);
    expect(normal.question).toBe(11);
    expect(normal.details).toBe(11);
  });
});

describe("the scale lives in its own variable, apart from the UI scale", () => {
  it("is read by no rule outside the chat's own words", () => {
    const sheet = `${buildBonsaiScopeStylesheet()}\n${CHAT_TITLE_CSS}`;
    const text = sheet.replace(/\/\*[\s\S]*?\*\//g, "");
    const selectors: string[] = [];
    for (const m of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (m[2]!.includes("--bonsai-chat-text-scale")) selectors.push(m[1]!.trim());
    }
    expect(selectors.length).toBeGreaterThan(0);
    for (const s of selectors) {
      expect(s, "a rule outside the chat reads the chat text scale").toMatch(
        /bonsai-chat-ai-bubble|bonsai-ai-response|bonsai-chat-turn-row-title|bonsai-chip-body|bonsai-details-session-row|bonsai-md-/,
      );
      expect(s).not.toMatch(/tab-bar|chat-title|settings|chip-ladder-chip/);
    }
    expect(text).not.toMatch(/--bonsai-chat-text-scale[^;]*--bonsai-ui-scale|--bonsai-ui-scale[^;]*--bonsai-chat-text-scale/);
  });
});
