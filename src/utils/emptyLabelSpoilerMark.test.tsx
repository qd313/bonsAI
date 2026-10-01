/**
 * A hidden block marked with "```bonsai-spoiler```" -- the label between two sets of backticks,
 * nothing between them -- used as BOTH the opening and the closing mark. Plan 78, found on the Deck
 * (Speed mode, Hades running): the small model wrote the pair by itself, the page showed the words
 * "bonsai-spoiler" twice as plain text, drew no cover, and the sentence between the marks was
 * readable. The mark is now a mark, never text: outside a block it opens one, inside it closes it.
 *
 * These render the answer the way the panel does and count covers and readable words; Copy and
 * Read aloud are checked on the same text.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";

import { buildAnswerBubbleElement } from "./buildAnswerBubbleElement";
import { expandOneLineSpoilerFences } from "./expandOneLineSpoilerFences";
import { resetAnswerStopRegistry } from "./answerStopRegistry";
import { SPOILER_HIDDEN_COPY_PLACEHOLDER, buildAnswerCopyText } from "./answerCopyText";
import { SPOILER_HIDDEN_SPOKEN_PHRASE, buildAnswerReadableText } from "./answerReadableText";
import { toastSafeText } from "./toastAnswerPreview";
import { resetSpoilerFenceOpenCountForTests } from "../components/MainTabBonsaiAiMarkdownChunk";

vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

const F = "`".repeat(3);
const M = `${F}bonsai-spoiler${F}`;
const SECRET = "the real secret ain't just about the moves";
const SECRET_LINE = `Listen, ${SECRET}; it's about how you play the game.`;
const BEFORE = "Right then, you wanna know the lot, not just some little skirmish.";
const AFTER = "So yeah, just keep your head up, play smart, and don't get caught slipping.";

/** The Deck's saved text: the mark opens, the mark closes. */
const DECK = `${BEFORE}\n\n${M}\n${SECRET_LINE}\n${M}\n\n${AFTER} That's the gist of it, yeah?`;

function renderAnswer(body: string, streaming = false) {
  const el = buildAnswerBubbleElement({
    body,
    streaming,
    spoilerMaskingEnabled: true,
    maxWidthCss: "100%",
    answerKey: "empty-label-mark",
  });
  expect(el).not.toBeNull();
  return render(el!);
}

function covers(container: HTMLElement): number {
  return container.querySelectorAll(".bonsai-spoiler-reveal-target").length;
}

describe("a hidden-block mark with nothing between the label and the closing backticks", () => {
  afterEach(() => {
    cleanup();
    resetAnswerStopRegistry();
    resetSpoilerFenceOpenCountForTests();
  });

  it("1. the Deck's exact shape: one cover, the sentence hidden, no mark text on the page", () => {
    const { container } = renderAnswer(DECK);
    expect(covers(container)).toBe(1);
    expect(container.textContent).not.toContain("real secret");
    expect(container.textContent).not.toContain("bonsai-spoiler");
    expect(container.textContent).not.toContain("`");
    expect(container.textContent).toContain("little skirmish");
    expect(container.textContent).toContain("keep your head up");
    expect(container.textContent).toContain("gist of it");
  });

  it("1. the cover opens onto exactly the hidden sentence", () => {
    const { container } = renderAnswer(DECK);
    fireEvent.click(container.querySelector(".bonsai-spoiler-reveal-target button") as HTMLElement);
    expect(container.textContent).toContain(SECRET);
    expect(container.textContent).not.toContain("bonsai-spoiler");
  });

  it("1. Copy and Read aloud hide it and keep the rest", () => {
    const copied = buildAnswerCopyText({ body: DECK });
    const spoken = buildAnswerReadableText({ body: DECK });
    for (const out of [copied, spoken]) {
      expect(out).not.toContain("real secret");
      expect(out).not.toContain("bonsai-spoiler");
      expect(out).not.toContain("`");
      expect(out).toContain("little skirmish");
      expect(out).toContain("gist of it");
    }
    expect(copied).toContain(SPOILER_HIDDEN_COPY_PLACEHOLDER);
    expect(spoken).toContain(SPOILER_HIDDEN_SPOKEN_PHRASE);
  });

  it("1. the text turns into one ordinary block", () => {
    expect(expandOneLineSpoilerFences(DECK)).toBe(
      `${BEFORE}\n\n${F}bonsai-spoiler\n${SECRET_LINE}\n${F}\n\n${AFTER} That's the gist of it, yeah?`
    );
  });

  it("2. only the first mark has arrived: everything after it is hidden, at every step", () => {
    const body = `${BEFORE}\n\n${M}\n${SECRET_LINE}`;
    const markEnd = body.indexOf(M) + M.length;
    for (let i = markEnd; i <= body.length; i++) {
      const { container, unmount } = renderAnswer(body.slice(0, i), true);
      expect(container.textContent, `after ${i} letters`).not.toContain("Listen");
      expect(container.textContent, `after ${i} letters`).not.toContain("bonsai-spoiler");
      unmount();
      resetAnswerStopRegistry();
    }
    for (const out of [buildAnswerCopyText({ body }), buildAnswerReadableText({ body })]) {
      expect(out).not.toContain("Listen");
      expect(out).not.toContain("bonsai-spoiler");
    }
  });

  it("2. the mark itself never shows while it is typed out", () => {
    // From the third backtick on, as for any ordinary opener (one or two lone backticks are drawn
    // for a moment by every fence, a longstanding quirk this fix does not touch).
    const start = DECK.indexOf(M) + 3;
    for (let i = start; i <= start + M.length + 1; i++) {
      const { container, unmount } = renderAnswer(DECK.slice(0, i), true);
      expect(container.textContent, `after ${i} letters`).not.toContain("bonsai-spoiler");
      expect(container.textContent, `after ${i} letters`).not.toContain("`");
      unmount();
      resetAnswerStopRegistry();
    }
  });

  it("3. the mark opens and an ordinary closing line closes", () => {
    const body = `${BEFORE}\n\n${M}\n${SECRET_LINE}\n${F}\n\n${AFTER}`;
    const { container } = renderAnswer(body);
    expect(covers(container)).toBe(1);
    expect(container.textContent).not.toContain("real secret");
    expect(container.textContent).not.toContain("bonsai-spoiler");
    expect(container.textContent).toContain("keep your head up");
    expect(buildAnswerCopyText({ body })).not.toContain("real secret");
    expect(buildAnswerReadableText({ body })).not.toContain("real secret");
  });

  it("4. an ordinary opener and the mark as the closer: the text after it stays readable", () => {
    const body = `${BEFORE}\n\n${F}bonsai-spoiler\n${SECRET_LINE}\n${M}\n\n${AFTER}`;
    const { container } = renderAnswer(body);
    expect(covers(container)).toBe(1);
    expect(container.textContent).not.toContain("real secret");
    expect(container.textContent).not.toContain("bonsai-spoiler");
    expect(container.textContent).toContain("keep your head up");
    for (const out of [buildAnswerCopyText({ body }), buildAnswerReadableText({ body })]) {
      expect(out).not.toContain("real secret");
      expect(out).not.toContain("bonsai-spoiler");
      expect(out).toContain("keep your head up");
    }
  });

  it("5. two pairs in one answer: two covers, the text between them readable", () => {
    const body = `${BEFORE}\n\n${M}\nFirst hidden line.\n${M}\n\nMiddle words stay.\n\n${M}\nSecond hidden line.\n${M}\n\n${AFTER}`;
    const { container } = renderAnswer(body);
    expect(covers(container)).toBe(2);
    expect(container.textContent).not.toContain("hidden line");
    expect(container.textContent).not.toContain("bonsai-spoiler");
    expect(container.textContent).toContain("Middle words stay.");
    expect(container.textContent).toContain("keep your head up");
    for (const out of [buildAnswerCopyText({ body }), buildAnswerReadableText({ body })]) {
      expect(out).not.toContain("hidden line");
      expect(out).toContain("Middle words stay.");
      expect(out).toContain("keep your head up");
    }
  });

  it("6. a mark glued to the end of a sentence is still a mark", () => {
    const body = `${BEFORE}${M}\n${SECRET_LINE}\n${M}\n${AFTER}`;
    const { container } = renderAnswer(body);
    expect(covers(container)).toBe(1);
    expect(container.querySelector(".bonsai-md-inline-code")).toBeNull();
    expect(container.textContent).not.toContain("real secret");
    expect(container.textContent).not.toContain("bonsai-spoiler");
    expect(container.textContent).toContain("little skirmish");
    expect(container.textContent).toContain("keep your head up");
    for (const out of [buildAnswerCopyText({ body }), buildAnswerReadableText({ body })]) {
      expect(out).not.toContain("real secret");
      expect(out).not.toContain("bonsai-spoiler");
    }
  });

  it("a mark with spaces after it, and a closing mark glued to the hidden words, still pair up", () => {
    const body = `${BEFORE}\n${M}  \n${SECRET_LINE}${M}\n${AFTER}`;
    const { container } = renderAnswer(body);
    expect(covers(container)).toBe(1);
    expect(container.textContent).not.toContain("real secret");
    expect(container.textContent).not.toContain("bonsai-spoiler");
    expect(container.textContent).toContain("keep your head up");
  });

  it("the toast preview hides it and keeps the words around it", () => {
    const out = toastSafeText(DECK);
    expect(out).not.toContain("real secret");
    expect(out).not.toContain("bonsai-spoiler");
    expect(out).toContain("little skirmish");
    expect(out).toContain("gist of it");
  });

  it("with covers switched off, Copy and Read aloud give the words and no mark text", () => {
    for (const out of [
      buildAnswerCopyText({ body: DECK, spoilerMaskingEnabled: false }),
      buildAnswerReadableText({ body: DECK, spoilerMaskingEnabled: false }),
    ]) {
      expect(out).toContain("real secret");
      expect(out).not.toContain("bonsai-spoiler");
      expect(out).not.toContain("`");
    }
  });

  it("7. answers with only ordinary blocks come out byte for byte unchanged", () => {
    for (const ok of [
      `${BEFORE}\n\n${F}bonsai-spoiler\n${SECRET_LINE}\n${F}\n\n${AFTER}`,
      `${F}bonsai-spoiler\nx\n${F}\n\n${F}bonsai-spoiler\ny\n${F}`,
      `> ${F}bonsai-spoiler\n> x\n> ${F}\n\nmore`,
      `${F}python\nprint(1)\n${F}\n\nplain`,
      `${F}bonsai-spoiler\nunfinished`,
    ]) {
      expect(expandOneLineSpoilerFences(ok)).toBe(ok);
    }
  });
});
