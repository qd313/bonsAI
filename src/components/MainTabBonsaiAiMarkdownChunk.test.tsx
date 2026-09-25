import { describe, expect, it, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";

import { beforeEach } from "vitest";
import {
  MainTabBonsaiAiMarkdownChunk,
  anySpoilerFenceOpen,
  resetSpoilerFenceOpenCountForTests,
  subscribeToSpoilerFenceOpenChange,
} from "./MainTabBonsaiAiMarkdownChunk";
import { DRG_SURVIVOR_APP_ID } from "../data/drgGlossaryTerms";
import { SCRAMBLE_SLOT_MARK } from "../features/stream-scramble/streamScrambleMath";

/*
 * `@decky/ui`'s `Focusable` has to render as a real DOM node with a working `ref`, or this suite
 * would pass for the wrong reason — see src/test-harness/fakeDeckyUi.tsx.
 */
vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

const SPOILER_SOURCE =
  "Opening line.\n\n```bonsai-spoiler\nSecret content here.\n```\n\nHere's the lowdown: more text.";

const DRG_KITING_SOURCE =
  "Mining is not a side activity, so a run spent only kiting is a run that ends underpowered.";

describe("MainTabBonsaiAiMarkdownChunk spoiler fence DOM shape", () => {
  /*
   * Regression guard for the D-pad-unreachable masked spoiler (roadmap: "D-pad cannot reach the
   * spoiler reveal — recurring, and the recurrence is itself the bug").
   *
   * react-markdown wraps every fenced code block's `code` output in `pre` regardless of what `code`
   * renders, so the masked fence's own `Focusable` — a real button, not monospace text — ended up
   * nested inside `<pre class="bonsai-md-fenced-pre">`. That box declares `overflow-x: auto`, which
   * gives the fence a scroll/formatting-context ancestor its own styles never asked for, and is
   * exactly the kind of coupling between the `pre:` and `code:` renderers in this one file that a
   * per-file review of `spoilerFenceRegistry.ts` — which owns none of this markup — would never see.
   * This test would have failed before the `pre:` renderer was taught to skip the wrapper for a
   * masked spoiler fence.
   */
  it("does not nest the masked fence's Focusable inside a <pre>", () => {
    const { container } = render(
      <MainTabBonsaiAiMarkdownChunk source={SPOILER_SOURCE} spoilerMaskingEnabled={true} />
    );
    const fence = container.querySelector(".bonsai-spoiler-reveal-target");
    expect(fence).toBeTruthy();
    expect(fence?.closest("pre")).toBeNull();
  });

  it("still masks the fence body until revealed", () => {
    const { container } = render(
      <MainTabBonsaiAiMarkdownChunk source={SPOILER_SOURCE} spoilerMaskingEnabled={true} />
    );
    expect(container.textContent).not.toContain("Secret content here.");
    expect(container.textContent).toContain("Spoiler — tap to show");
  });

  it("renders spoiler content inline, unwrapped, when masking is off", () => {
    const { container } = render(
      <MainTabBonsaiAiMarkdownChunk source={SPOILER_SOURCE} spoilerMaskingEnabled={false} />
    );
    expect(container.querySelector(".bonsai-spoiler-reveal-target")).toBeNull();
    expect(container.textContent).toContain("Secret content here.");
  });

  it("does not disturb an ordinary (non-spoiler) fenced code block", () => {
    const source = "Before.\n\n```json\n{\"a\": 1}\n```\n\nAfter.";
    const { container } = render(
      <MainTabBonsaiAiMarkdownChunk source={source} spoilerMaskingEnabled={true} />
    );
    const pre = container.querySelector("pre.bonsai-md-fenced-pre");
    expect(pre).toBeTruthy();
    expect(pre?.textContent).toContain('{"a": 1}');
  });
});

describe("MainTabBonsaiAiMarkdownChunk DRG Survivor glossary markup", () => {
  /*
   * Roadmap: "DRG Survivor glossary terms" — a reply that uses "kiting" should let the user tap it
   * for a definition, but only when the turn's game is DRG Survivor. Scoped to that one AppID on
   * purpose (see data/drgGlossaryTerms.ts); a reply about any other game must render the word plain.
   */
  it("marks up a curated term as a tappable chip when the turn's game is DRG Survivor", () => {
    const { container } = render(
      <MainTabBonsaiAiMarkdownChunk source={DRG_KITING_SOURCE} appId={DRG_SURVIVOR_APP_ID} />
    );
    const chip = container.querySelector(".bonsai-drg-glossary-term");
    expect(chip).toBeTruthy();
    expect(chip?.textContent).toBe("kiting");
    // The rest of the sentence renders untouched around the chip.
    expect(container.textContent).toContain("Mining is not a side activity");
    expect(container.textContent).toContain("ends underpowered.");
  });

  it("leaves the same text plain for a non-DRG-Survivor turn", () => {
    const { container } = render(
      <MainTabBonsaiAiMarkdownChunk source={DRG_KITING_SOURCE} appId="570" />
    );
    expect(container.querySelector(".bonsai-drg-glossary-term")).toBeNull();
    expect(container.textContent).toContain("kiting");
  });

  it("leaves the same text plain when no AppID is supplied at all", () => {
    const { container } = render(<MainTabBonsaiAiMarkdownChunk source={DRG_KITING_SOURCE} />);
    expect(container.querySelector(".bonsai-drg-glossary-term")).toBeNull();
  });

  it("tapping the chip twice opens the full definition with an explain-further chip", () => {
    const onDrgGlossaryExplainFurther = vi.fn();
    const { container } = render(
      <MainTabBonsaiAiMarkdownChunk
        source={DRG_KITING_SOURCE}
        appId={DRG_SURVIVOR_APP_ID}
        onDrgGlossaryExplainFurther={onDrgGlossaryExplainFurther}
      />
    );
    // First tap shows the short peek; the second escalates to the full definition.
    fireEvent.click(container.querySelector(".bonsai-drg-glossary-term-text")!);
    fireEvent.click(container.querySelector(".bonsai-drg-glossary-term-text")!);
    expect(document.querySelector(".bonsai-drg-glossary-explain-further")).toBeTruthy();
    fireEvent.click(document.querySelector(".bonsai-drg-glossary-explain-further")!);
    expect(onDrgGlossaryExplainFurther).toHaveBeenCalledTimes(1);
    expect(onDrgGlossaryExplainFurther.mock.calls[0][0]).toMatchObject({ id: "kiting" });
  });

  it("does not mark up terms that only appear inside an unrevealed spoiler fence", () => {
    const source =
      "Opening about kiting.\n\n```bonsai-spoiler\nOverclock the boss weapon.\n```\n\nDone.";
    const { container } = render(
      <MainTabBonsaiAiMarkdownChunk source={source} appId={DRG_SURVIVOR_APP_ID} spoilerMaskingEnabled={true} />
    );
    // The plain-text "kiting" outside the fence still gets marked up.
    expect(container.querySelector(".bonsai-drg-glossary-term")?.textContent).toBe("kiting");
    // The masked spoiler body is not in the DOM at all yet, so "overclock" cannot appear twice.
    expect(container.querySelectorAll(".bonsai-drg-glossary-term")).toHaveLength(1);
  });
});

/*
 * Plan 58 phase 1: whether a spoiler fence is open has to be readable from outside this file —
 * MainTabChatTranscript.tsx's "From the notes" block stays off a fenced reply until this reads
 * true. See anySpoilerFenceOpen's own comment for why this is a plain module tally rather than a
 * prop threaded down from buildAnswerBubbleElement.tsx.
 */
describe("the open-spoiler tally other files read", () => {
  beforeEach(() => {
    resetSpoilerFenceOpenCountForTests();
  });

  it("is false before anything is revealed", () => {
    render(<MainTabBonsaiAiMarkdownChunk source={SPOILER_SOURCE} spoilerMaskingEnabled={true} />);
    expect(anySpoilerFenceOpen()).toBe(false);
  });

  it("turns true once the fence is revealed, and false again once it is hidden", () => {
    const { container } = render(
      <MainTabBonsaiAiMarkdownChunk source={SPOILER_SOURCE} spoilerMaskingEnabled={true} />
    );
    fireEvent.click(container.querySelector(".bonsai-spoiler-reveal-target button")!);
    expect(anySpoilerFenceOpen()).toBe(true);

    fireEvent.click(container.querySelector(".bonsai-spoiler-expanded button")!);
    expect(anySpoilerFenceOpen()).toBe(false);
  });

  it("turns false again once the revealed fence unmounts", () => {
    const { container, unmount } = render(
      <MainTabBonsaiAiMarkdownChunk source={SPOILER_SOURCE} spoilerMaskingEnabled={true} />
    );
    fireEvent.click(container.querySelector(".bonsai-spoiler-reveal-target button")!);
    expect(anySpoilerFenceOpen()).toBe(true);
    unmount();
    expect(anySpoilerFenceOpen()).toBe(false);
  });

  it("notifies every subscriber on each open/close change", () => {
    const { container } = render(
      <MainTabBonsaiAiMarkdownChunk source={SPOILER_SOURCE} spoilerMaskingEnabled={true} />
    );
    const calls: boolean[] = [];
    const unsubscribe = subscribeToSpoilerFenceOpenChange(() => calls.push(anySpoilerFenceOpen()));

    fireEvent.click(container.querySelector(".bonsai-spoiler-reveal-target button")!);
    fireEvent.click(container.querySelector(".bonsai-spoiler-expanded button")!);

    expect(calls).toEqual([true, false]);
    unsubscribe();
  });

  it("stays true while a second fence is still open after the first one closes", () => {
    const twoFences =
      "```bonsai-spoiler\nFirst secret.\n```\n\nBetween.\n\n```bonsai-spoiler\nSecond secret.\n```";
    const { container } = render(
      <MainTabBonsaiAiMarkdownChunk source={twoFences} spoilerMaskingEnabled={true} />
    );
    const revealButtons = container.querySelectorAll(".bonsai-spoiler-reveal-target button");
    expect(revealButtons).toHaveLength(2);
    fireEvent.click(revealButtons[0]);
    fireEvent.click(revealButtons[1]);
    expect(anySpoilerFenceOpen()).toBe(true);

    fireEvent.click(container.querySelectorAll(".bonsai-spoiler-expanded button")[0]);
    // One of the two is still open.
    expect(anySpoilerFenceOpen()).toBe(true);

    fireEvent.click(container.querySelectorAll(".bonsai-spoiler-expanded button")[0]);
    expect(anySpoilerFenceOpen()).toBe(false);
  });
});

describe("MainTabBonsaiAiMarkdownChunk, the scramble's slot (plan 69)", () => {
  it("swaps the slot mark for an empty span inside the bold the text ends in, and hands it to the ref", () => {
    const slotRef = vi.fn();
    const { container } = render(
      <MainTabBonsaiAiMarkdownChunk source={`Use **the ${SCRAMBLE_SLOT_MARK}**`} scrambleSlotRef={slotRef} />
    );
    const slot = container.querySelector("strong > .bonsai-stream-scramble");
    expect(slot).not.toBeNull();
    expect(slot!.childNodes).toHaveLength(0);
    expect(slotRef).toHaveBeenCalledWith(slot);
    expect(container.textContent).toBe("Use the ");
  });

  it("puts the slot inside the list item the text ends in, not on a line after the list", () => {
    const { container } = render(
      <MainTabBonsaiAiMarkdownChunk source={`- one\n- tw${SCRAMBLE_SLOT_MARK}`} scrambleSlotRef={vi.fn()} />
    );
    const items = container.querySelectorAll("li");
    expect(items).toHaveLength(2);
    expect(items[1]!.querySelector(".bonsai-stream-scramble")).not.toBeNull();
  });
});
