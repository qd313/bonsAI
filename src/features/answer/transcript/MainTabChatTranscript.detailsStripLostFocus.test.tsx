/**
 * Title: The Show details strip and its chips, walked with the D-pad while the panel's page may lack focus (plan 103 F1, part 2)
 * Purpose: Pin row P103-DETAILS-STRIP-01 at the level the Deck check looks at, where Steam's ring is. The strip ("This
 *          answer / Session") and the chip grid's root were stops the plugin knew only by their element: with the
 *          panel's page out of the browser's focus a plain focus() does not carry Steam's ring, so both hops said "did
 *          not land" and the chain under the answer went on to its last step, a transfer onto the suggestion chips: Down
 *          from "Hide details" (or from the notes line) skipped the open panel, and Up from the chips skipped it too.
 *          On the Deck (workshop:test-evidence/plan103-P103-M-DETAILS-STRIP.json, 15 tries) the page never lost its
 *          focus and the strip was always reached, by the first Down without a notes line and by the second with one;
 *          this pins that order and the lost-focus path the code showed.
 * Used for: buildDetailsPanelElement.tsx (the strip's own Steam nav node), ContextChipLadder.tsx (the grid's root
 *           hands Steam's transfer to the open chip's own node), focusPerTurnRow.ts (`registerRowNav`), and the chains
 *           in MainTabChatTranscript.tsx and liveTurnFocusGraph.ts that reach them.
 * Solves: With the page's focus and without it: Down from "Hide details" lands on the strip, or on the notes line
 *         and then the strip; Right on the strip shows Session and keeps the ring there; Down from the strip lands on
 *         the open chip; the walk to the chips and back visits no stop twice; B on the strip and on a chip closes
 *         the panel with the ring on "Show details"; on chips wrapped onto two rows every step (Down between rows,
 *         Left, Right) moves the ring and Down leaves to the suggestion chips (the second opinion's fix-up: a chip
 *         step used to claim the press with the ring left behind). The page sends no focus events while it lacks
 *         focus, as on the Deck (transcriptPanelWalk.tsx).
 * Does not: Scroll (the pane holds the whole turn).
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
/** Four chips in the Show details grid, in this order (one row, or two of two). */
const CHIPS = ["Game context", "Notes", "Model", "Tips"].map((label, i) => ({
  label, rank: i + 1, id: `chip-${i + 1}`, attached: true, tier_class: "", body: { title: label, paths: [], bullets: [] },
}));

const HIDE = "Hide details";
const STRIP = "details strip";
const NOTES = "notes line";
const DOCK = "suggestion chips";
const FIRST_CHIP = "Game context";

/** A finished answer on the live turn, not rated, its Show details panel listing three chips. */
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
  ".bonsai-details-tabs-row", ".bonsai-chip-ladder-chip", ".bonsai-spoiler-reveal-target",
].join(", ");
function stopName(el: HTMLElement): string | null {
  if (el.classList.contains("bonsai-details-tabs-row")) return STRIP;
  if (el.classList.contains("bonsai-kb-notes-block")) return NOTES;
  if (el.classList.contains("bonsai-answer-stop")) return `section ${el.getAttribute("data-bonsai-chunk-index")}`;
  if (el.classList.contains("bonsai-chat-turn-row-body")) return "question";
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
function activeTab(): string {
  return page().host.querySelector(".bonsai-details-tab--active")?.textContent ?? "";
}

describe.each([
  ["with the page's focus", true],
  ["with the page's focus gone", false],
])("P103-DETAILS-STRIP-01, %s", (_label, focused) => {
  describe.each([
    ["no notes line above the strip", ANSWER_PLAIN, [] as KbAttachedNote[], [HIDE, STRIP]],
    ["a notes line between Hide details and the strip", ANSWER_NAMING_NOTE, [NOTE], [HIDE, NOTES, STRIP]],
  ])("%s", (_shape, answer, notes, toStrip) => {
    it("Down from Hide details reaches the strip, three times running, through the notes line when one is drawn", async () => {
      const s = await drawWithDetailsOpen(props(answer, notes));
      for (let i = 0; i < 3; i++) {
        page().setFocused(focused);
        expect(await s.walk("onMoveDown", STRIP)).toEqual(toStrip);
        page().setFocused(true);
        s.put(HIDE);
      }
    });

    it("Right on the strip shows Session and keeps the ring on the strip; Left goes back to This answer", async () => {
      const s = await drawWithDetailsOpen(props(answer, notes));
      page().setFocused(focused);
      await s.walk("onMoveDown", STRIP);
      expect(await s.press("onMoveRight")).toBe("claimed");
      expect(activeTab()).toMatch(/^Session · /);
      expect(s.nameOf(page().ring())).toBe(STRIP);
      expect(await s.press("onMoveLeft")).toBe("claimed");
      expect(activeTab()).toBe("This answer");
      expect(s.nameOf(page().ring())).toBe(STRIP);
    });

    it("walks Down from Hide details past the strip and the open chip to the suggestion chips, and Up back, no stop twice", async () => {
      const s = await drawWithDetailsOpen(props(answer, notes));
      page().setFocused(focused);
      const down = await s.walk("onMoveDown", DOCK);
      expect(down).toEqual([...toStrip, FIRST_CHIP, DOCK]);
      expect(await s.walk("onMoveUp", HIDE)).toEqual([...down].reverse());
    });

    it("B on the strip, and B on the open chip, close the panel and leave the ring on Show details", async () => {
      const s = await drawWithDetailsOpen(props(answer, notes));
      page().setFocused(focused);
      await s.walk("onMoveDown", STRIP);
      expect(await s.button("onCancelButton")).toBe(true);
      expect(page().host.querySelector(".bonsai-details-tabs-row")).toBeNull();
      expect(s.nameOf(page().ring())).toBe("Show details");

      page().setFocused(true);
      expect(await s.button("onOKButton")).toBe(true);
      page().setFocused(focused);
      await s.walk("onMoveDown", FIRST_CHIP);
      expect(s.nameOf(page().ring())).toBe(FIRST_CHIP);
      expect(await s.button("onCancelButton")).toBe(true);
      expect(page().host.querySelector(".bonsai-chip-ladder")).toBeNull();
      expect(s.nameOf(page().ring())).toBe("Show details");
    });
  });

  it("Down from the strip lands on the chip that was open, the ring and the page's focus together", async () => {
    const s = await drawWithDetailsOpen(props(ANSWER_PLAIN, []));
    await s.walk("onMoveDown", FIRST_CHIP);
    /* A step to the next chip, made with the page's focus: chip steps are plain hops between siblings. */
    await s.press("onMoveRight");
    expect(s.nameOf(page().ring())).toBe("Notes");
    page().setFocused(focused);
    await s.press("onMoveUp");
    expect(s.nameOf(page().ring())).toBe(STRIP);
    await s.press("onMoveDown");
    expect(s.nameOf(page().ring())).toBe("Notes");
    expect(s.nameOf(page().active())).toBe("Notes");
  });

  /* The second opinion's fix-up: a step between chips was a plain focus whose failure was ignored. */
  it("chips on two rows: Down crosses to the second row, then leaves to the suggestion chips, and Up comes back", async () => {
    const s = await drawWithDetailsOpen(props(ANSWER_PLAIN, []), { chipsPerRow: 2 });
    page().setFocused(focused);
    const down = await s.walk("onMoveDown", DOCK);
    expect(down).toEqual([HIDE, STRIP, FIRST_CHIP, "Model", DOCK]);
    expect(await s.walk("onMoveUp", HIDE)).toEqual([...down].reverse());
  });

  it("chips on two rows: Right and Left step chip to chip and the ring follows every step", async () => {
    const s = await drawWithDetailsOpen(props(ANSWER_PLAIN, []), { chipsPerRow: 2 });
    page().setFocused(focused);
    await s.walk("onMoveDown", FIRST_CHIP);
    for (const [key, lands] of [["onMoveRight", "Notes"], ["onMoveRight", "Model"], ["onMoveLeft", "Notes"], ["onMoveLeft", FIRST_CHIP]] as const) {
      expect(await s.press(key), `${key} onto ${lands}`).toBe("claimed");
      expect(s.nameOf(page().ring())).toBe(lands);
      expect(s.nameOf(page().active())).toBe(lands);
    }
  });

  it("a covered answer's caption is no stop: Down from Hide details goes straight to the strip", async () => {
    const covered = "```bonsai-spoiler\nThat is Charms and notches.\n```";
    const s = await drawWithDetailsOpen(props(covered, [NOTE], { strategySpoilerMaskingEnabled: true }));
    expect(page().host.querySelector(".bonsai-kb-notes-covered-caption")).not.toBeNull();
    page().setFocused(focused);
    expect(await s.walk("onMoveDown", STRIP)).toEqual([HIDE, STRIP]);
  });
});
