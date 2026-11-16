/**
 * Title: The question box's Up reaches "Ask anyway" first while the low-memory warning shows (row P104-M5-WARNING-FOCUS)
 * Purpose: Pin what the Deck showed on 2026-11-15 (workshop:test-evidence/plan104-P104-MEMORY-01.json): with the
 *          low-memory warning on screen, the ring sat on the question box and "Ask anyway" took two Up presses,
 *          through a suggestion chip. Here the real transcript draws the warning and its row, a stand-in question
 *          box carries the real ask box's move handlers (useMainTabAskBarFocus), and the chips' stand-in carries the
 *          real chips' Up (chipRowExitUp). One Up from the box must land on "Ask anyway", with the panel's page
 *          holding the browser's focus and without it, and the walk on up must stay bounded with Steam's glide.
 * Used for: ChatTranscriptHintRows.tsx (the row registers itself as "ask-anyway") and useMainTabAskBarFocus.ts
 *           (the box's Up asks for that stop before the chips).
 * Solves: Without the change the first Up lands on the chips; the first test below fails on the old code.
 * Does not: Model where Steam puts an unowned ring on the first press after an answer (on the Deck that is the
 *           question box; nothing here decides it), the real ask box's other parts (paperclip, mode button, the
 *           AI's own suggestion chip), or real pixel sizes: every element is a 4 px row in drawn order, so the glide
 *           checks that no landing loops or hides under Steam's scroll, not where on screen each stop ends up.
 */
import { useEffect, useRef } from "react";
import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Focusable } from "@decky/ui";

import { dockChipsStop, transcriptPanelEachTest, type TranscriptWalk } from "../../../test-harness/transcriptPanelWalk";
import type { PanelNavEl } from "../../../test-harness/lostFocusPanel";
import { DECK_SCREEN, steamGlide, type SteamScrollRule } from "../../../test-harness/deckAnswerWalk";
import { chatProps } from "../../../test-harness/earlierListTestKit";
import { resetFakeDeckyRpc, setRpcHandler } from "../../../test-harness/fakeDeckyRpc";
import { registerNavFocus, takeNavFocus, unregisterNavFocus } from "../../../shared/dpad/navFocusRegistry";
import { useMainTabAskBarFocus } from "../../ask/bar/useMainTabAskBarFocus";
import { chipRowExitUp } from "../../preset-carousel/presetRowFocusNav";

vi.mock("@decky/ui", async () => (await import("../../../test-harness/transcriptPanelWalk")).panelDeckyUi());

import { MainTabChatTranscript, type MainTabChatTranscriptProps } from "./MainTabChatTranscript";

const QUESTION = "how do I get past the first troll fight";
const WARNING =
  "Not enough free memory to start the AI. The Deck has about 3,401 MB free and the AI needs about 5,872 MB, so loading it would use more than is free (bonsAI keeps at least 2,000 MB back). To make room, close the game, pick a smaller model on the Ollama tab, or use the AI on a PC. Asking anyway may freeze the Deck.";
const ASK_ANYWAY = "Ask anyway";
const CHIPS = "suggestion chips";
const BOX = "question box";
const STAMP = ".bonsai-answer-stop, .bonsai-chat-turn-row-body, .bonsai-chat-details-divider";
/** The Deck's pane with the dock at 290 (deckAnswerWalk.ts): the band a stop must sit in after Steam's glide. */
const DOCK_TOP = 290;
/** Each drawn 4 px row stands 40 px tall in the glide's pane, so the turn is several times the band and must scroll. */
const ROW_SCALE = 10;

const panel = transcriptPanelEachTest();
const page = () => panel.page();

/** The ask box's text field: the real box's four moves (useMainTabAskBarFocus), its own nav node "unified-input". */
function QuestionBox() {
  const refs = {
    unifiedInputFieldLayerRef: useRef<HTMLDivElement>(null),
    attachActionHostRef: useRef<HTMLDivElement>(null),
    askBarHostRef: useRef<HTMLElement>(null),
    presetCarouselHostRef: useRef<HTMLDivElement>(null),
  };
  const { unifiedInputDeckNavHandlers } = useMainTabAskBarFocus(refs, false);
  const navRef = useRef(null);
  useEffect(() => {
    registerNavFocus("unified-input", navRef);
    return () => unregisterNavFocus("unified-input", navRef);
  }, []);
  return (
    <Focusable {...({ navRef, ...unifiedInputDeckNavHandlers } as Record<string, unknown>)}>
      <textarea aria-label={BOX} tabIndex={0} />
    </Focusable>
  );
}

function props(over: Partial<MainTabChatTranscriptProps>): MainTabChatTranscriptProps {
  return chatProps(
    {
      ollamaResponse: WARNING,
      askThreadDisplayQuestion: QUESTION,
      lastExchange: { question: QUESTION, answer: WARNING },
      liveReplyFeedbackRating: null,
      onRetryLastResponse: () => {},
      onAskOllama: async () => {},
      ...over,
    },
    [],
    "live",
  );
}

/**
 * The screen as the Deck drew it: the transcript in the pane, then the chips, then the question box under them.
 * The chips' Down is the real chips' (the question box); their Up is the real chipRowExitUp.
 */
function drawScreen(over: Partial<MainTabChatTranscriptProps> = {}): TranscriptWalk {
  const s = panel.draw(<MainTabChatTranscript {...props(over)} />, STAMP, () => null);
  registerNavFocus("preset-carousel", dockChipsStop(page(), chipRowExitUp).nav);
  (s.byName(CHIPS) as PanelNavEl).__nav!.onMoveDown = () => takeNavFocus("unified-input");
  const dock = page().doc.createElement("div");
  page().host.appendChild(dock);
  act(() => {
    render(<QuestionBox />, { container: dock });
  });
  return s;
}

/**
 * Steam's glide after every press (deckAnswerWalk.ts's `steamGlide`, under `rule`), in a pane with the Deck's top
 * and the dock at 290, every row `ROW_SCALE` times its drawn height so the turn is taller than the band, scrolled
 * to its end as after an answer. Returns a check that the ringed stop, when it is inside the pane, sits wholly in
 * the readable band, and a reading of how far the pane scrolled.
 */
function withSteamGlide(rule: SteamScrollRule): { onScreen: () => void; scrolled: () => number } {
  const pg = page();
  const pane = pg.host.querySelector<HTMLElement>(".TabContentsScroll")!;
  let scroll = 0;
  Object.defineProperty(pane, "scrollTop", { get: () => scroll, set: (v: number) => (scroll = v), configurable: true });
  const proto = (pg.doc.defaultView as unknown as { Element: typeof Element }).Element.prototype;
  const drawn = proto.getBoundingClientRect;
  proto.getBoundingClientRect = function onDeckScreen(this: Element) {
    const r = drawn.call(this);
    if (this === pane || !pane.contains(this)) return r;
    const top = r.top * ROW_SCALE + DECK_SCREEN.paneTop - scroll;
    const height = r.height * ROW_SCALE;
    return { ...r, top, bottom: top + height, height, y: top } as DOMRect;
  };
  const contentHeight = pane.querySelectorAll("*").length * 4 * ROW_SCALE;
  scroll = Math.max(0, contentHeight - (DOCK_TOP - DECK_SCREEN.paneTop));
  const start = scroll;
  const press = pg.press.bind(pg);
  pg.press = (key, step) => {
    const out = press(key, step);
    const ring = pg.ring();
    if (ring && pane.contains(ring)) steamGlide(ring, pane, rule, { paneTop: DECK_SCREEN.paneTop, dockTop: DOCK_TOP });
    return out;
  };
  const onScreen = () => {
    const ring = pg.ring();
    if (!ring || !pane.contains(ring)) return;
    const r = ring.getBoundingClientRect();
    expect(r.top >= DECK_SCREEN.paneTop && r.bottom <= DOCK_TOP, `${ring.textContent?.slice(0, 30)} at ${r.top}-${r.bottom}`).toBe(true);
  };
  return { onScreen, scrolled: () => start - scroll };
}

describe.each([
  ["with the page's focus", true],
  ["with the page's focus gone", false],
])("the low-memory warning's row comes first going up, %s", (_label, focused) => {
  it("one Up from the question box lands on Ask anyway, not on the suggestion chips", async () => {
    const s = drawScreen();
    s.put(BOX);
    page().setFocused(focused);
    expect(await s.press("onMoveUp")).toBe("claimed");
    expect(s.nameOf(page().ring())).toBe(ASK_ANYWAY);
    expect(s.nameOf(page().active())).toBe(ASK_ANYWAY);
  });

  it.each(["top", "padded", "center"] as SteamScrollRule[])(
    "walking Up from the box under Steam's %s glide: Ask anyway first, no stop twice, every landing on screen, chips never",
    async (rule) => {
      const s = drawScreen();
      const { onScreen, scrolled } = withSteamGlide(rule);
      s.put(BOX);
      page().setFocused(focused);
      const trail: string[] = [BOX];
      for (let i = 0; i < 24; i++) {
        const before = page().ring();
        await s.press("onMoveUp");
        if (page().ring() === before) break;
        const now = s.nameOf(page().ring());
        expect(trail, `${now} visited twice: ${trail.join(" -> ")}`).not.toContain(now);
        trail.push(now);
        onScreen();
      }
      expect(trail[1]).toBe(ASK_ANYWAY);
      expect(trail).not.toContain(CHIPS);
      expect(trail.length).toBeGreaterThan(2);
      expect(scrolled(), "the walk never made Steam scroll: the glide was not tested").toBeGreaterThan(0);
    },
  );

  it("Down from Ask anyway still reaches the chips, then the question box: the chips are not lost", async () => {
    const s = drawScreen();
    s.put(ASK_ANYWAY);
    page().setFocused(focused);
    const trail = await s.walk("onMoveDown", BOX, 4);
    expect(trail).toEqual([ASK_ANYWAY, CHIPS, BOX]);
  });

  it("A on Ask anyway, reached by one Up from the box, arms and asks; B there is left to Steam", async () => {
    resetFakeDeckyRpc();
    setRpcHandler("arm_ollama_ask_anyway", () => ({ armed: true }));
    const onAskOllama = vi.fn(async () => {});
    const s = drawScreen({ onAskOllama });
    s.put(BOX);
    page().setFocused(focused);
    await s.press("onMoveUp");
    expect(await s.button("onCancelButton")).toBe(false);
    expect(onAskOllama).not.toHaveBeenCalled();
    expect(s.nameOf(page().ring())).toBe(ASK_ANYWAY);
    (page().ring() as HTMLButtonElement).click(); // A on a Steam button is its click
    await vi.waitFor(() => expect(onAskOllama).toHaveBeenCalledWith(QUESTION, { threadQuestionDisplay: QUESTION }));
  });

  it("B on the question box is not claimed by a plugin handler either", async () => {
    const s = drawScreen();
    s.put(BOX);
    page().setFocused(focused);
    expect(await s.button("onCancelButton")).toBe(false);
  });
});

describe("without the warning, the box's Up is as it was", () => {
  it("under an ordinary answer the first Up from the box is the chips", async () => {
    const answer = "Block the troll's overhead slam, then hit its legs.";
    const s = drawScreen({ ollamaResponse: answer, lastExchange: { question: QUESTION, answer } });
    s.put(BOX);
    expect(await s.press("onMoveUp")).toBe("claimed");
    expect(s.nameOf(page().ring())).toBe(CHIPS);
  });

  it("while the question is asked again (the row is gone) the first Up from the box is the chips", async () => {
    const s = drawScreen({ isAsking: true });
    s.put(BOX);
    await s.press("onMoveUp");
    expect(s.nameOf(page().ring())).toBe(CHIPS);
  });
});
