/**
 * Title: The "Notes were used" line comes clear of the dock with "Show details" (plan 104 F1, part 2)
 * Purpose: Pin row P104-COVERED-CAPTION-01 at the level the Deck check looks at: with the ring on "Show details"
 *          under an answer its spoiler cover hides wholly, the plain line "Notes were used for this answer — show
 *          the spoiler to see them" drawn directly under it is above the dock. On the Deck's own screen
 *          (workshop:test-evidence/plan103-P103-COVERED-NOTES-01.json) the line sat at y 360 to 390, behind the dock,
 *          because only the control holding the ring is lifted clear (useDockClearanceOnFocus.ts) and "Show details"
 *          itself was already clear.
 * Used for: useDockClearanceOnFocus.ts (`setLineRidingUnder`, and the lift leaving room for that line) and
 *           buildKbNotesBlockElement.tsx (the caption says which control it rides under).
 * Solves: The real caption, drawn by its own builder, in a pane shaped like the Deck's (deckAnswerWalk.ts: every box
 *         follows the scroll, Steam's glide under each modelled rule, the lift's scroll request both moving the pane
 *         and not), under a "Show details" line registered as the reply stop the way the reply row registers it.
 * Does not: Draw the real reply row or the transcript (the line above is a stand-in control), or model the page
 *           without the browser's focus: the lift runs on the focus event, which such a page never gets, for every
 *           control alike. The line stays words, never a stop: that is checked here, and walked in
 *           MainTabChatTranscript.detailsStripLostFocus.test.tsx ("a covered answer's caption is no stop").
 */
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WALK_RULES, deckAnswer, resetDeckAnswerWalk, type Box } from "../../test-harness/deckAnswerWalk";
import { registerReplyStop } from "../../shared/dpad/replyStopRegistry";
import { buildKbNotesBlockElement } from "./buildKbNotesBlockElement";

vi.mock("@decky/ui", async () => import("../../test-harness/fakeDeckyUi"));

beforeEach(resetDeckAnswerWalk);
afterEach(() => {
  cleanup();
  registerReplyStop("show-details", null);
});

interface Screen {
  name: string;
  paneTop: number;
  paneBottom: number;
  dockTop: number;
  /** "Show details", "Mark reply helpful" and the caption, in screen y with the pane where it starts. */
  showDetails: Box;
  helpful: Box;
  caption: Box;
}

/*
 * The caption's top sits 18 px under the line's bottom: the line's 2 px margin, the turn's 6 px row gap and the
 * caption's own 8 px margin (section-6.ts, answerBubble.ts, the caption builder), as the Deck drew it under
 * "Hide details" (workshop:test-evidence/plan104-P103-DETAILS-STRIP-01-d-try1.png). Two lines of words: 30 px.
 */
const SCREENS: Screen[] = [
  {
    name: "the Deck's own screen, the line clear and the caption behind the dock (the 10 November reading)",
    paneTop: 52, paneBottom: 454, dockTop: 351,
    showDetails: [326, 342], helpful: [270, 300], caption: [360, 390],
  },
  {
    name: "the Deck's own screen, the line itself behind the dock",
    paneTop: 52, paneBottom: 454, dockTop: 351,
    showDetails: [352, 368], helpful: [296, 326], caption: [386, 416],
  },
  {
    name: "a game running (pane 128 to 534, dock 330)",
    paneTop: 128, paneBottom: 534, dockTop: 330,
    showDetails: [310, 326], helpful: [254, 284], caption: [344, 374],
  },
  {
    name: "the external screen (pane 52 to 766, dock 662)",
    paneTop: 52, paneBottom: 766, dockTop: 662,
    showDetails: [640, 656], helpful: [584, 614], caption: [674, 704],
  },
];

/** A wholly covered answer, its rating row and "Show details", and the real caption drawn under them. */
function coveredAnswer(screen: Screen, rule: (typeof WALK_RULES)[number], liftScrollsToEnd: boolean) {
  const [lineTop] = screen.showDetails;
  const a = deckAnswer([[lineTop - 240, lineTop - 160]], 0, rule, {
    dockTop: screen.dockTop,
    paneTop: screen.paneTop,
    paneBottom: screen.paneBottom,
    liftScrollsToEnd,
    steamTopMargin: true,
  });
  a.cover(a.stops[0]!, [lineTop - 232, lineTop - 168]);
  const helpful = a.control(screen.helpful);
  const showDetails = a.control(screen.showDetails);
  showDetails.classList.add("bonsai-chat-details-divider");
  registerReplyStop("show-details", showDetails);
  const holder = document.createElement("div");
  a.pane.appendChild(holder);
  render(
    buildKbNotesBlockElement({
      turnKey: "turn-1",
      notes: [],
      covered: true,
      open: false,
      onToggle: () => {},
      onMoveUp: () => false,
      onMoveDown: () => false,
      headerRef: () => {},
    })!,
    { container: holder },
  );
  const caption = holder.querySelector<HTMLElement>(".bonsai-kb-notes-covered-caption")!;
  a.place(caption, screen.caption);
  return { ...a, helpful, showDetails, caption };
}

describe.each(SCREENS)("ring on Show details under a wholly covered answer, $name", (screen) => {
  describe.each(WALK_RULES)("Steam scroll rule: %s", (rule) => {
    it.each([
      ["the lift's scroll request moves the pane", true],
      ["the lift's scroll request leaves the pane still", false],
    ])("the caption under the line is above the dock, and the line stays on screen (%s)", (_how, scrolls) => {
      const a = coveredAnswer(screen, rule, scrolls);
      expect(a.caption.textContent).toBe("Notes were used for this answer — show the spoiler to see them");
      a.land(a.showDetails);
      expect(a.bottom(a.caption), "the caption's bottom against the dock").toBeLessThanOrEqual(screen.dockTop);
      expect(a.top(a.showDetails), "Show details under the pane's top").toBeGreaterThanOrEqual(screen.paneTop);
      expect(a.bottom(a.showDetails), "Show details above the dock").toBeLessThanOrEqual(screen.dockTop);
    });
  });

  it("the caption is words, not a stop: no Focusable, no tabindex, no button", () => {
    const a = coveredAnswer(screen, undefined, true);
    expect(a.caption.closest('[data-decky-ui="Focusable"]')).toBeNull();
    expect(a.caption.closest("[tabindex]")).toBeNull();
    expect(a.caption.querySelector("button, [tabindex]")).toBeNull();
  });

  it("the caption rides only with the line it sits under: the ring on Helpful, clear of the dock, moves nothing", () => {
    const a = coveredAnswer(screen, undefined, true);
    const before = a.pane.scrollTop;
    a.land(a.helpful);
    expect(a.pane.scrollTop).toBe(before);
  });
});
