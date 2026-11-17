/**
 * Title: The Show details chips and the Session chip, walked with the D-pad while the panel's page may lack focus
 * Purpose: Pin rows P103-DETAILS-STRIP-01 and P105-DETAILS-CHIPS-01 at the level the Deck check looks at, where Steam's
 *          ring is. Plan 103 F1 gave the details panel's ways in their own Steam stops: with the panel's page out of the
 *          browser's focus a plain focus() does not carry Steam's ring, so a hop onto the panel said "did not land" and
 *          the chain under the answer went on to the suggestion chips past the open panel. Plan 105 took the "This
 *          answer / Session" strip away: Down from "Hide details" (or from the notes line) lands on the open chip, and
 *          Session is the grid's last chip, dashed, its box the chat's Session view with Sum up this chat on top.
 * Used for: ContextChipLadder.tsx (the grid's root hands Steam's transfer to the open chip's own node, the Session chip
 *           included), buildDetailsPanelElement.tsx (the Session chip's way into its box and back), focusPerTurnRow.ts
 *           (`registerRowNav`), and the chains in MainTabChatTranscript.tsx and liveTurnFocusGraph.ts that reach them.
 * Solves: With the page's focus and without it: Down from "Hide details" lands on the first chip, or on the notes line
 *         and then the first chip; Right and Left walk every chip once, Session last, its box opening in the chip box's
 *         place and closing again; on chips wrapped onto rows, Down crosses to the Session chip and goes into its box
 *         onto Sum up, and Up walks back out; B on the Session chip and on an answer chip closes the panel with the ring
 *         on "Show details"; coming back, Down from "Hide details" lands on the chip left open, Session included. Every
 *         walk visits no stop twice and claims no press the ring did not follow. The page sends no focus events while
 *         it lacks focus, as on the Deck (transcriptPanelWalk.tsx).
 * Does not: Scroll (the pane holds the whole turn); the walk with Steam's scroll modelled is
 *           ContextChipLadder.sessionWalk.test.tsx.
 */
import { describe, expect, it, vi } from "vitest";

import { dockChipsStop, transcriptPanelEachTest, type ChipLayout, type TranscriptWalk } from "../../../test-harness/transcriptPanelWalk";
import { chatProps } from "../../../test-harness/earlierListTestKit";
import { registerNavFocus } from "../../../shared/dpad/navFocusRegistry";
import { focusBottomOfNewestReply } from "../../../shared/dpad/liveTurnFocusGraph";
import type { KbAttachedNote, TransparencySnapshot } from "../../../types/inputTransparency";

vi.mock("@decky/ui", async () => (await import("../../../test-harness/transcriptPanelWalk")).panelDeckyUi());

import { MainTabChatTranscript, type MainTabChatTranscriptProps } from "./MainTabChatTranscript";

const QUESTION = "how do I get more charm notches";
const ANSWER_PLAIN = "Buy them from Salubra in the Forgotten Crossroads, and look for the ones hidden in the world.";
const ANSWER_NAMING_NOTE = "Charms and notches go together: buy notches from Salubra and find the rest in the world.";
const NOTE: KbAttachedNote = {
  name: "Charms and notches",
  kind: "mechanic",
  card: "Summary: every charm costs notches; Salubra sells more.",
  trust_tier: "wiki_verified",
  source_host: "hollowknight.wiki",
  source_license: "CC-BY-SA-3.0",
  domain: "strategy",
  game_title: "Hollow Knight",
};
/** Four chips in the Show details grid, in this order, then the Session chip (one row, or rows of two). */
const CHIPS = ["Game context", "Notes", "Model", "Tips"].map((label, i) => ({
  label, rank: i + 1, id: `chip-${i + 1}`, attached: true, tier_class: "", body: { title: label, paths: [], bullets: [] },
}));

const HIDE = "Hide details";
const NOTES = "notes line";
const DOCK = "suggestion chips";
const FIRST_CHIP = "Game context";
const SESSION = "Session · 1";
const SUM_UP = "Sum up";
const ALL_CHIPS = [...CHIPS.map((c) => c.label), SESSION];

/** A finished answer on the live turn, not rated, its Show details panel listing four chips. */
function props(answer: string, notes: KbAttachedNote[], over: Partial<MainTabChatTranscriptProps> = {}): MainTabChatTranscriptProps {
  return chatProps(
    {
      askMode: "speed",
      ollamaResponse: answer,
      askThreadDisplayQuestion: QUESTION,
      lastExchange: { question: QUESTION, answer },
      liveReplyFeedbackRating: null,
      transparencySnapshot: {
        route: "ollama",
        success: true,
        final_response: answer,
        context_chips: CHIPS,
        kb_attached_notes: notes,
      } as unknown as TransparencySnapshot,
      ...over,
    },
    [],
    "live",
  );
}

const panel = transcriptPanelEachTest();
/** The current test's panel page. */
const page = () => panel.page();

const STAMP = [
  ".bonsai-answer-stop", ".bonsai-chat-turn-row-body", ".bonsai-chat-details-divider", ".bonsai-kb-notes-block",
  ".bonsai-chip-ladder-chip", ".bonsai-spoiler-reveal-target", ".bonsai-sumup-btn", ".bonsai-details-session-row",
].join(", ");
function stopName(el: HTMLElement): string | null {
  if (el.classList.contains("bonsai-kb-notes-block")) return NOTES;
  if (el.classList.contains("bonsai-sumup-btn")) return SUM_UP;
  if (el.classList.contains("bonsai-answer-stop")) return `section ${el.getAttribute("data-bonsai-chunk-index")}`;
  if (el.classList.contains("bonsai-chat-turn-row-body")) return "question";
  if (el.classList.contains("bonsai-details-session-row")) return "session row";
  return null;
}
/** Draw the screen with the dock's chips under it, open Show details, and leave the ring on "Hide details". */
async function drawWithDetailsOpen(p: MainTabChatTranscriptProps, chips?: ChipLayout): Promise<TranscriptWalk> {
  const screen = panel.draw(<MainTabChatTranscript {...p} />, STAMP, stopName, chips);
  /* Drawn after the chat, so Steam's own Down from the chat's last stop would reach it, as it does the dock. */
  registerNavFocus("preset-carousel", dockChipsStop(page(), () => focusBottomOfNewestReply()).nav);
  screen.put("Show details");
  expect(await screen.button("onOKButton")).toBe(true);
  expect(screen.nameOf(page().ring())).toBe(HIDE);
  return screen;
}
/** The words on the open chip of the panel's own grid. */
function openChip(): string {
  return page().host.querySelector(".bonsai-chip-ladder > .bonsai-chip-ladder-grid > .bonsai-chip-ladder-chip--active")?.textContent ?? "";
}
function sessionBoxDrawn(): boolean {
  return page().host.querySelector(".bonsai-chip-ladder .bonsai-details-session-body") !== null;
}

describe.each([
  ["with the page's focus", true],
  ["with the page's focus gone", false],
])("P103-DETAILS-STRIP-01 and P105-DETAILS-CHIPS-01, %s", (_label, focused) => {
  describe.each([
    ["no notes line above the chips", ANSWER_PLAIN, [] as KbAttachedNote[], [HIDE, FIRST_CHIP]],
    ["a notes line between Hide details and the chips", ANSWER_NAMING_NOTE, [NOTE], [HIDE, NOTES, FIRST_CHIP]],
  ])("%s", (_shape, answer, notes, toChips) => {
    it("Down from Hide details reaches the first chip, three times running, through the notes line when one is drawn", async () => {
      const s = await drawWithDetailsOpen(props(answer, notes));
      for (let i = 0; i < 3; i++) {
        page().setFocused(focused);
        expect(await s.walk("onMoveDown", FIRST_CHIP)).toEqual(toChips);
        page().setFocused(true);
        s.put(HIDE);
      }
    });

    it("Right walks every chip once, Session last, its box opening in the chip box's place; Left walks back", async () => {
      const s = await drawWithDetailsOpen(props(answer, notes));
      page().setFocused(focused);
      await s.walk("onMoveDown", FIRST_CHIP);
      expect(await s.walk("onMoveRight", SESSION)).toEqual(ALL_CHIPS);
      expect(openChip()).toBe(SESSION);
      expect(sessionBoxDrawn()).toBe(true);
      expect(await s.walk("onMoveLeft", FIRST_CHIP)).toEqual([...ALL_CHIPS].reverse());
      expect(openChip()).toBe(FIRST_CHIP);
      expect(sessionBoxDrawn()).toBe(false);
    });

    it("B on the Session chip, and B on an answer chip, close the panel and leave the ring on Show details", async () => {
      const s = await drawWithDetailsOpen(props(answer, notes));
      page().setFocused(focused);
      await s.walk("onMoveDown", FIRST_CHIP);
      await s.walk("onMoveRight", SESSION);
      expect(await s.button("onCancelButton")).toBe(true);
      expect(page().host.querySelector(".bonsai-chip-ladder")).toBeNull();
      expect(s.nameOf(page().ring())).toBe("Show details");

      page().setFocused(true);
      expect(await s.button("onOKButton")).toBe(true);
      /* Opened again on the Session chip, left open; Left back to an answer chip, then its B. */
      expect(openChip()).toBe(SESSION);
      page().setFocused(focused);
      await s.walk("onMoveDown", SESSION);
      expect(await s.press("onMoveLeft")).toBe("claimed");
      expect(s.nameOf(page().ring())).toBe("Tips");
      expect(await s.button("onCancelButton")).toBe(true);
      expect(page().host.querySelector(".bonsai-chip-ladder")).toBeNull();
      expect(s.nameOf(page().ring())).toBe("Show details");
    });
  });

  it("Down from Hide details lands on the chip that was open, the ring and the page's focus together", async () => {
    const s = await drawWithDetailsOpen(props(ANSWER_PLAIN, []));
    await s.walk("onMoveDown", FIRST_CHIP);
    /* A step to the next chip, made with the page's focus: chip steps are plain hops between siblings. */
    await s.press("onMoveRight");
    expect(s.nameOf(page().ring())).toBe("Notes");
    page().setFocused(focused);
    await s.press("onMoveUp");
    expect(s.nameOf(page().ring())).toBe(HIDE);
    await s.press("onMoveDown");
    expect(s.nameOf(page().ring())).toBe("Notes");
    expect(s.nameOf(page().active())).toBe("Notes");
  });

  it("chips on rows of two: Down crosses the rows onto the Session chip and into its box onto Sum up, and Up walks back out", async () => {
    const s = await drawWithDetailsOpen(props(ANSWER_PLAIN, []), { chipsPerRow: 2 });
    page().setFocused(focused);
    const down = await s.walk("onMoveDown", SUM_UP);
    expect(down).toEqual([HIDE, FIRST_CHIP, "Model", SESSION, SUM_UP]);
    expect(sessionBoxDrawn()).toBe(true);
    expect(await s.walk("onMoveUp", HIDE)).toEqual([...down].reverse());
  });

  it("chips on rows of three: Down from an answer chip on the Session chip's row leaves for the suggestion chips, and Up comes back", async () => {
    const s = await drawWithDetailsOpen(props(ANSWER_PLAIN, []), { chipsPerRow: 3 });
    page().setFocused(focused);
    const down = await s.walk("onMoveDown", DOCK);
    expect(down).toEqual([HIDE, FIRST_CHIP, "Tips", DOCK]);
    expect(sessionBoxDrawn()).toBe(false);
    expect(await s.walk("onMoveUp", HIDE)).toEqual([...down].reverse());
  });

  it("chips on rows of two: Right and Left step chip to chip and the ring follows every step", async () => {
    const s = await drawWithDetailsOpen(props(ANSWER_PLAIN, []), { chipsPerRow: 2 });
    page().setFocused(focused);
    await s.walk("onMoveDown", FIRST_CHIP);
    for (const [key, lands] of [["onMoveRight", "Notes"], ["onMoveRight", "Model"], ["onMoveLeft", "Notes"], ["onMoveLeft", FIRST_CHIP]] as const) {
      expect(await s.press(key), `${key} onto ${lands}`).toBe("claimed");
      expect(s.nameOf(page().ring())).toBe(lands);
      expect(s.nameOf(page().active())).toBe(lands);
    }
  });

  it("a covered answer's caption is no stop: Down from Hide details goes straight to the chips", async () => {
    const covered = "```bonsai-spoiler\nThat is Charms and notches.\n```";
    const s = await drawWithDetailsOpen(props(covered, [NOTE], { strategySpoilerMaskingEnabled: true }));
    expect(page().host.querySelector(".bonsai-kb-notes-covered-caption")).not.toBeNull();
    page().setFocused(focused);
    expect(await s.walk("onMoveDown", FIRST_CHIP)).toEqual([HIDE, FIRST_CHIP]);
  });
});
