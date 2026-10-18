/**
 * Title: Text size changes every word, once
 * Purpose: Render the real chat (a question, its answer and the opened Show details panel) next to the tab
 *          bar's label, the chat's name in Decky's bar and a Settings text, with the real stylesheet for each
 *          Text size, read the font size the browser would settle on, and check every one of them moves by
 *          the chosen step (Small 0.9, Large 1.15) and none of them by the step twice. Normal must read
 *          today's numbers exactly.
 * Used for: plan 87 F6 (the Text size setting) and plan 89 S1 (it now reaches every word in the plugin).
 * Does not: Lay anything out. jsdom has no layout, so whether Large still fits a long word in the 300 px
 *           column is the Deck check; the answer wraps anywhere, so a long word breaks and never spills.
 *           The words written inline (chips, Settings labels) are in textSizeInline.test.tsx.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";

import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import type { LastExchangeSnapshot } from "../types/backgroundAsk";
import type { ContextChip, TransparencySnapshot } from "../utils/inputTransparency";
import { buildBonsaiScopeStylesheet } from "../styles/bonsaiScopeStylesheet";
import { CHAT_TITLE_CSS } from "../features/chat-title/chatTitleStyles";
import { TEXT_SCALE, textScaleValue, withTextScale } from "../shared/text-size/chatTextSize";
import { ChatTitleView } from "../features/chat-title/ChatTitleView";
import { publishChatTitle, resetChatTitleStore, setChatTitleTab, setChatTitleTextScale } from "../features/chat-title/chatTitleStore";
import { makeFontSizeReader } from "../test-harness/settledFontSize";
import type { ChatTextSize } from "../features/settings/bonsaiSettingsSchema";

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

function renderChat(size: ChatTextSize) {
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
    <div className="bonsai-scope" style={withTextScale({}, size)}>
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

type Measured = { question: number; answer: number; details: number; tabLabel: number; chatName: number; settings: number };

function measure(size: ChatTextSize): Measured {
  const { container, unmount } = renderChat(size);
  /* No step handed in: each element reads it off the box it sits in, as the browser would. */
  const read = makeFontSizeReader(`${buildBonsaiScopeStylesheet()}\n${CHAT_TITLE_CSS}`);
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
  };
  unmount();
  return measured;
}

type Surface = keyof Measured;
/* LB and RB are button marks in a box of fixed width, like an icon, not words: they keep their size. */
const UNSCALED_ON_PURPOSE = [/bonsai-tab-bar__shoulder/];
const ALL: Surface[] = ["question", "answer", "details", "tabLabel", "chatName", "settings"];

describe("Text size scales every word by the chosen step", () => {
  const normal = measure("normal");

  it("steps the question, the answer, the Show details text, the tab bar label, the chat's name and the Settings text by the chosen amount", () => {
    for (const size of ["small", "large"] as const) {
      const m = measure(size);
      const step = TEXT_SCALE[size];
      for (const key of ALL) expect(m[key], `${size}: ${key}`).toBeCloseTo(normal[key] * step, 5);
    }
    for (const key of ALL) {
      expect(measure("large")[key], key).toBeGreaterThan(normal[key]);
      expect(measure("small")[key], key).toBeLessThan(normal[key]);
    }
  });

  it("scales each word once: no word moves by the step squared", () => {
    const large = measure("large");
    for (const key of ALL) {
      const ratio = large[key] / normal[key];
      expect(ratio, key).toBeCloseTo(TEXT_SCALE.large, 5);
      expect(Math.abs(ratio - TEXT_SCALE.large ** 2), key).toBeGreaterThan(0.1);
    }
  });

  it("reads Normal as today's sizes: 12 for the answer, 11 for the question and the details, 11 for the tab bar's label, 13 for the chat's name, 12 for Settings text", () => {
    expect(normal.answer).toBe(12);
    expect(normal.question).toBe(11);
    expect(normal.details).toBe(11);
    expect(normal.tabLabel).toBe(11);
    expect(normal.chatName).toBe(13);
    expect(normal.settings).toBe(12);
  });
});

describe("the scale lives in its own variable, apart from the UI scale", () => {
  it("is read by every font size the stylesheets write, and never as the UI scale", () => {
    const sheet = `${buildBonsaiScopeStylesheet()}
${CHAT_TITLE_CSS}`;
    const text = sheet.replace(/\/\*[\s\S]*?\*\//g, "");
    const loose: string[] = [];
    let reading = 0;
    for (const m of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const head = m[1]!.trim();
      if (head.startsWith("@")) continue;
      for (const d of m[2]!.split(/;(?![^(]*\))/)) {
        const colon = d.indexOf(":");
        if (colon < 0 || d.slice(0, colon).trim() !== "font-size") continue;
        const value = d.slice(colon + 1).trim().replace(/\s*!important$/, "");
        if (value.includes("--bonsai-text-scale")) reading += 1;
        else if (!/^(inherit|[\d.]+em)$/.test(value) && !UNSCALED_ON_PURPOSE.some((re) => re.test(head))) loose.push(`${head} { font-size: ${value} }`);
      }
    }
    expect(reading).toBeGreaterThan(40);
    expect(loose, "a font size that does not follow the Text size setting").toEqual([]);
    expect(text).not.toMatch(/--bonsai-chat-text-scale/);
  });
});

describe("the chat's name in Decky's bar, which sits outside bonsAI's box", () => {
  const css = `${buildBonsaiScopeStylesheet()}\n${CHAT_TITLE_CSS}`;
  const ACTIONS = { previous: () => {}, next: () => {}, takeFirstStop: () => false };

  function drawTitle(step: string | null) {
    resetChatTitleStore();
    setChatTitleTab("main");
    publishChatTitle({}, { name: "Boss help", place: 2, count: 5, unsaved: false, answerInFlight: false, chats: [] }, ACTIONS);
    setChatTitleTextScale(step);
    return render(<ChatTitleView />);
  }

  it("follows the step the plugin root hands it through the title store: name 13 and small line 8 on Normal, scaled on Small and Large", () => {
    const read = makeFontSizeReader(css);
    for (const size of ["small", "normal", "large"] as const) {
      const { container, unmount } = drawTitle(textScaleValue(size));
      const words = container.querySelector(".bonsai-chat-title__words")!;
      const sub = container.querySelector(".bonsai-chat-title__sub")!;
      expect(read(words), `${size}: name`).toBeCloseTo(13 * TEXT_SCALE[size], 5);
      expect(read(sub), `${size}: small line`).toBeCloseTo(8 * TEXT_SCALE[size], 5);
      unmount();
    }
  });

  it("reads exactly today's sizes before the plugin root has said anything", () => {
    const read = makeFontSizeReader(css);
    const { container } = drawTitle(null);
    expect(read(container.querySelector(".bonsai-chat-title__words")!)).toBe(13);
    expect(read(container.querySelector(".bonsai-chat-title__sub")!)).toBe(8);
  });
});
