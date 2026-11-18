/**
 * Title: "Open sections as you walk": the ringed row read once a frame, as the Deck's recorder reads it (plan 106, lane F1)
 * Purpose: Pin row P105-SECTIONS-AUTO-01's glide check at the level the Deck measures it: after a landing that opens or
 *          closes a section above the ring, the ringed row's top, read at every frame for 300 ms, stays within 2 px of
 *          where the landing left it. On the Deck (plan105-P105-SECTIONS-AUTO-01-d3b.json) Up onto "Use local knowledge
 *          base" reopened Where AI runs above the ring; about 38 ms later the section drew its late status line ("The
 *          startup entry exists but is not turned on.", one line, 20.8 px there), and the row dropped by that much for
 *          7 frames until the late look caught it at about 150 ms. Here every reply from the back end takes 38 ms, as
 *          there, so a section that opens draws its late lines as it did on the Deck, and the frames show it.
 * Used for: holdTabBodyStop and keepHeldStop (src/shared/dpad/useTabBodyFocusScroll.ts), autoFold.ts.
 * Does not: Know the Deck's real heights (the walk's flow model: a line of words is 16 px). Model a ResizeObserver: one
 *           made in the plugin's own window is not driven by the panel's frames (panelFrames.ts says why), so the test
 *           setup's stand-in, which never fires, is the Deck's case.
 */
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { call } from "@decky/api";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../test-harness/steamRing");
  /* Steam's switch row: a stop of its own that keeps the move handlers it is given, as Decky's ToggleField does. */
  const ToggleField = (p: Record<string, unknown>) => {
    const { label, checked: _checked, onChange: _onChange, description: _d, disabled: _x, ...rest } = p;
    return <SteamRingFocusable {...rest} focusable aria-label={stubs.wordsOf(label)} data-decky-ui="ToggleField" />;
  };
  return { ...stubs, Focusable: SteamRingFocusable, ToggleField };
});

import type { FoldedLanding, FoldedTabWalk } from "../../test-harness/foldedTabWalk";
import { BOUND, DECK_PANE, OLLAMA_CASE, SETTINGS_CASE, resetAutoFoldWalk, switchOn, walk, type TabCase } from "../../test-harness/autoFoldWalk";
import { dispatchFakeRpc, ragCorpusStatusFixture, setRpcHandler } from "../../test-harness/fakeDeckyRpc";
import { framesOff, readEachFrame, settle } from "../../test-harness/panelFrames";

/** How long a reply from the back end took on the Deck: the late status line came in at about 38 ms. */
const REPLY_MS = 38;
/** The Deck's own late line under "Start the AI with the Deck" (the picture beside the evidence file). */
const LATE_LINE = "The startup entry exists but is not turned on.";
/** How long each landing is read, as the Deck check reads it ("every frame, and at 300 ms"). */
const READ_MS = 300;
/** The most the ringed row may move from where the landing left it, at any frame. */
const LIMIT_PX = 2;

const mockedCall = call as unknown as Mock<(method: string, ...args: unknown[]) => Promise<unknown>>;

beforeEach(() => {
  resetAutoFoldWalk();
  vi.useFakeTimers();
  /* Every reply arrives REPLY_MS after its call, as from the Deck's back end. */
  mockedCall.mockImplementation(
    (method: string, ...args: unknown[]) => new Promise((done) => setTimeout(done, REPLY_MS)).then(() => dispatchFakeRpc(method, args)),
  );
  setRpcHandler("get_ollama_local_autostart_status", () => ({ installed: true, enabled: false, running: true, reason: LATE_LINE }));
  /*
   * The library installed, as on the Deck ("Update knowledge base"): a knowledge section that opens reads "Not
   * installed" until its status comes back, then its installed lines, a block of another height.
   */
  setRpcHandler("get_rag_corpus_status", () =>
    ragCorpusStatusFixture({
      installed: true,
      corpus_version: "2026.11.10",
      game_count: 120,
      corpus_path: "/home/deck/.bonsai/rag/strategy.sqlite",
      use_local_knowledge_base: true,
      embeddings_populated: true,
    }),
  );
});
afterEach(() => {
  cleanup();
  mockedCall.mockImplementation((method: string, ...args: unknown[]) => dispatchFakeRpc(method, args));
  vi.useRealTimers();
});

/** Press `direction` until the ring lands on `name`; throws if it never does. */
function pressUntil(w: FoldedTabWalk, direction: "down" | "up", name: string): FoldedLanding {
  for (let i = 0; i < BOUND; i++) {
    const l = w.press(direction);
    if (!l) break;
    if (l.name === name) return l;
  }
  throw new Error(`never landed on ${name} going ${direction}`);
}

/**
 * The landing on `name` walking `direction`, as the Deck made it: the walk reaches the stop, goes back one, lets every
 * reply and timer settle (the Deck's presses were 0.45 to 0.7 s apart), then presses again; the row is then read at
 * every frame for READ_MS. `base` is its top as the landing left it.
 */
async function landAndRead(t: TabCase, direction: "down" | "up", name: string) {
  switchOn();
  const w = walk(t, DECK_PANE, "nearest");
  w.enter();
  if (direction === "up") w.walk("down", BOUND);
  pressUntil(w, direction, name);
  w.press(direction === "up" ? "down" : "up");
  await settle();
  const landing = w.press(direction);
  expect(landing?.name).toBe(name);
  const l = landing!;
  const base = l.stop.getBoundingClientRect().top;
  const readings = await readEachFrame(READ_MS, () => l.stop.getBoundingClientRect().top);
  return { w, l, base, readings };
}

describe("the ringed row read at every frame after a landing that changes a section above it", () => {
  it("Up onto Use local knowledge base: Where AI runs reopens above and draws its late status line; the row never moves", async () => {
    const { w, l, base, readings } = await landAndRead(OLLAMA_CASE, "up", "Use local knowledge base");
    expect(Math.abs(l.held), "Where AI runs opened above the ring and the row was held").toBeGreaterThan(1);
    /* The late line did come in during the frames read, above the row. */
    const where = w.container.querySelector<HTMLElement>('[data-bonsai-fold-section="where"]')!;
    expect(where.textContent).toContain(LATE_LINE);
    expect(framesOff(readings, base, LIMIT_PX)).toEqual([]);
    w.unmount();
  });

  /* The other landings the Deck measured (plan105-P105-SECTIONS-AUTO-01.json), and Up onto Reply style (4 px there). */
  const others: [TabCase, "down" | "up", string][] = [
    [OLLAMA_CASE, "down", "Keep models loaded"],
    [OLLAMA_CASE, "up", "Custom timeouts"],
    [OLLAMA_CASE, "up", "Reply style"],
    [SETTINGS_CASE, "down", "AI voice & personality"],
    [SETTINGS_CASE, "down", "Character"],
  ];
  for (const [t, direction, name] of others) {
    it(`${t.name}, ${direction} onto ${name}: the row never moves`, async () => {
      const { w, base, readings } = await landAndRead(t, direction, name);
      expect(framesOff(readings, base, LIMIT_PX)).toEqual([]);
      w.unmount();
    });
  }

  it("a press before the late line comes in: the line is left to the plan, the plugin turns nothing for the old landing", async () => {
    switchOn();
    const w = walk(OLLAMA_CASE, DECK_PANE, "nearest");
    w.enter();
    w.walk("down", BOUND);
    pressUntil(w, "up", "Use local knowledge base");
    w.press("down");
    await settle();
    expect(w.press("up")?.name).toBe("Use local knowledge base");
    /* The next press comes before the reply that draws Where AI runs' late line. */
    expect(w.press("up")).not.toBeNull();
    const scroll = w.scrollTop();
    const scrolls = await readEachFrame(READ_MS, () => w.scrollTop());
    const where = w.container.querySelector<HTMLElement>('[data-bonsai-fold-section="where"]')!;
    expect(where.textContent).toContain(LATE_LINE);
    expect(scrolls.every((s) => s === scroll)).toBe(true);
    w.unmount();
  });
});
