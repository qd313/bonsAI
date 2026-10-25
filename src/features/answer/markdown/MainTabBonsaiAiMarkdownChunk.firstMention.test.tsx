/**
 * Title: Only the first mention of a game word is underlined
 * Purpose: Pins the maintainer's request of 2026-10-25: in one answer a glossary word is a tappable
 * chip only where it first appears; every later mention (any spelling of the same word) is plain.
 * Used for: MainTabBonsaiAiMarkdownChunk, buildAnswerBubbleElement/buildAnswerSections and
 * StreamMarkdownPieces, all drawn with the Hollow Knight answer that showed eleven underlines.
 * Solves: The chip count on screen, not just the matcher: each case draws the reply and counts the
 * chips a person would see.
 * Does not: Check the D-pad walk over the chips (answerBubbleNavigation tests do).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

import { MainTabBonsaiAiMarkdownChunk } from "./MainTabBonsaiAiMarkdownChunk";
import { StreamMarkdownPieces } from "../stream/StreamMarkdownPieces";
import { buildAnswerBubbleElement } from "../bubble/buildAnswerBubbleElement";
import { resetAnswerStopRegistry } from "../../../shared/dpad/answerStopRegistry";
import { registerAnswerBubbleEl } from "../../../shared/dpad/answerBubbleElRegistry";
import { clearGlossary } from "../../../test-harness/glossaryTestTerms";
import { HK_ANSWER, HK_APP_ID, HK_FIRST_MENTIONS, primeHollowKnight } from "../../../test-harness/hollowKnightGlossary";

vi.mock("@decky/ui", async () => import("../../../test-harness/fakeDeckyUi"));

const CHIP = ".bonsai-drg-glossary-term";
const chipTexts = (root: ParentNode): string[] =>
  Array.from(root.querySelectorAll(CHIP)).map((el) => el.textContent ?? "");

beforeEach(() => {
  clearGlossary();
  primeHollowKnight();
  resetAnswerStopRegistry();
  registerAnswerBubbleEl("hk", null);
});

afterEach(() => {
  cleanup();
  clearGlossary();
});

describe("first mention only: one piece of markdown", () => {
  it("underlines five words in the reported Hollow Knight answer, not eleven", () => {
    const { container } = render(<MainTabBonsaiAiMarkdownChunk source={HK_ANSWER} appId={HK_APP_ID} />);
    expect(chipTexts(container)).toEqual(HK_FIRST_MENTIONS);
    // Later mentions are still there as plain words.
    expect(container.textContent).toBe(HK_ANSWER);
  });

  it("counts another spelling of a word as the same word, whatever its case", () => {
    const { container } = render(
      <MainTabBonsaiAiMarkdownChunk source="A charm helps. CHARMS help. Charm again." appId={HK_APP_ID} />
    );
    expect(chipTexts(container)).toEqual(["charm"]);
  });

  it("looks for the first mention inside bold and list items too, but never in a link or code", () => {
    const source = "Use `bench` or [bench](https://x.test) first.\n\n- a **bench** here\n- a bench there";
    const { container } = render(<MainTabBonsaiAiMarkdownChunk source={source} appId={HK_APP_ID} />);
    expect(chipTexts(container)).toEqual(["bench"]);
    // The one chip is the bold one: nothing in the code or the link used up the first mention.
    expect(container.querySelector(`strong ${CHIP}`)).toBeTruthy();
  });
});

describe("first mention only: a whole reply drawn in several pieces", () => {
  const SECTIONED = [
    "The Mothwing Cloak is a dash, and you spend Geo on charms.",
    "```bash\necho hi\n```",
    "Charms cost notches. A bench lets you swap charms; the Mothwing Cloak and Geo are covered above.",
    "```bash\necho bye\n```",
    "At the end: Geo, notches and a bench once more.",
  ].join("\n\n");

  const drawSectioned = (streaming: boolean) =>
    render(
      buildAnswerBubbleElement({
        body: SECTIONED,
        streaming,
        spoilerMaskingEnabled: true,
        maxWidthCss: "100%",
        answerKey: "hk",
        appId: HK_APP_ID,
      })!
    ).container;

  it("does not underline in a later section a word an earlier section already underlined", () => {
    const container = drawSectioned(false);
    expect(container.querySelectorAll(".bonsai-answer-stop").length).toBeGreaterThan(2);
    expect(chipTexts(container)).toEqual(["Mothwing Cloak", "Geo", "charms", "notches", "bench"]);
  });

  it("does the same while the reply is still arriving", () => {
    const container = drawSectioned(true);
    expect(container.querySelectorAll(".bonsai-answer-stop").length).toBeGreaterThan(2);
    const texts = chipTexts(container);
    expect(new Set(texts.map((t) => t.toLowerCase())).size).toBe(texts.length);
    expect(texts.slice(0, 2)).toEqual(["Mothwing Cloak", "Geo"]);
  });

  it("splits a live tail into pieces without underlining a word twice", () => {
    const source = [
      "The Mothwing Cloak is a dash.",
      "Charms cost notches, so a bench matters.",
      "The Mothwing Cloak, charms and notches again; Geo too.",
    ].join("\n\n");
    const { container } = render(<StreamMarkdownPieces source={source} appId={HK_APP_ID} />);
    expect(container.querySelectorAll(".bonsai-md-p").length).toBe(3);
    expect(chipTexts(container)).toEqual(["Mothwing Cloak", "Charms", "notches", "bench", "Geo"]);
  });
});

describe("first mention only: while the reply streams in", () => {
  it("never moves a word's underline to a later spot as more text arrives", () => {
    // The reply in paragraphs, grown one word at a time, looking at the chips after every word.
    const paragraphs = HK_ANSWER.replace(/\. /g, ".\n\n");
    const words = paragraphs.split(/(?<= )/);
    const { container, rerender } = render(<StreamMarkdownPieces source="" appId={HK_APP_ID} />);
    let previous: string[] = [];
    let text = "";
    for (const w of words) {
      text += w;
      rerender(<StreamMarkdownPieces source={text.trimEnd()} appId={HK_APP_ID} />);
      const now = chipTexts(container);
      // What was underlined stays underlined, in the same order; new words only join at the end.
      expect(now.slice(0, previous.length)).toEqual(previous);
      expect(HK_FIRST_MENTIONS.slice(0, now.length)).toEqual(now);
      previous = now;
    }
    expect(previous).toEqual(HK_FIRST_MENTIONS);
  });
});

describe("first mention only: spoiler blocks", () => {
  it("leaves a covered spoiler's words out of the count, so the visible mention is the underlined one", () => {
    const source = "Intro.\n\n```bonsai-spoiler\nThe bench saves your game.\n```\n\nSit on a bench to rest.";
    const { container } = render(
      <MainTabBonsaiAiMarkdownChunk source={source} appId={HK_APP_ID} spoilerMaskingEnabled />
    );
    expect(chipTexts(container)).toEqual(["bench"]);
  });

  it("underlines a word once inside a spoiler that is open from the start, not once per mention", () => {
    const source = "Sit on a bench.\n\n```bonsai-spoiler\nThe bench saves. The bench heals.\n```";
    const { container } = render(
      <MainTabBonsaiAiMarkdownChunk source={source} appId={HK_APP_ID} spoilerMaskingEnabled spoilerDefaultExpanded />
    );
    // Once outside, and once for the first mention inside the open block.
    expect(chipTexts(container)).toEqual(["bench", "bench"]);
  });
});
