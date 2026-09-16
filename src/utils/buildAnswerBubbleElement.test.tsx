import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

import { buildAnswerBubbleElement, stopNavProps } from "./buildAnswerBubbleElement";
import { orderedAnswerStops, resetAnswerStopRegistry } from "./answerStopRegistry";
import { registerAnswerBubbleEl } from "./answerBubbleElRegistry";
import { registerReplyStop } from "./replyStopRegistry";
import { splitResponseIntoChunks } from "./splitResponseIntoChunks";
import { SPOILER_STREAM_MASK_LABEL } from "./streamMarkdownPrepare";

const ANSWER_KEY = "live";

/** Every React element in the tree whose className mentions `cls`, in render order. */
function collectByClassName(node: React.ReactNode, cls: string): React.ReactElement[] {
  const out: React.ReactElement[] = [];
  const walk = (n: React.ReactNode) => {
    if (Array.isArray(n)) {
      n.forEach(walk);
      return;
    }
    if (!n || typeof n !== "object" || !("props" in n)) return;
    const el = n as React.ReactElement;
    const className = (el.props as Record<string, unknown>).className;
    if (typeof className === "string" && className.split(/\s+/).includes(cls)) out.push(el);
    walk((el.props as { children?: React.ReactNode }).children);
  };
  walk(node);
  return out;
}


/*
 * Plain prose is a single section while streaming — prepareStreamMarkdown only closes a block at a
 * fence boundary — so a body with a fence in it is what produces a multi-section stack to walk.
 */
const FENCED_BODY = ["Intro line.", "", "```bash", "echo hi", "```", "", "Tail text"].join("\n");

function renderBubble(body: string, streaming: boolean) {
  const el = buildAnswerBubbleElement({
    body,
    streaming,
    spoilerMaskingEnabled: true,
    maxWidthCss: "100%",
    answerKey: ANSWER_KEY,
  });
  expect(el).not.toBeNull();
  return render(el!);
}

function stopsIn(container: HTMLElement): HTMLElement[] {
  const bubble = container.querySelector(".bonsai-chat-ai-bubble") as HTMLElement | null;
  expect(bubble).not.toBeNull();
  return orderedAnswerStops(ANSWER_KEY, bubble!);
}

describe("answer bubble section stops", () => {
  beforeEach(() => {
    resetAnswerStopRegistry();
    registerAnswerBubbleEl(ANSWER_KEY, null);
  });

  afterEach(() => {
    cleanup();
  });

  it("registers one stop per streamed section", () => {
    const { container } = renderBubble(FENCED_BODY, true);

    // Closed prose, the closed fence, and the live tail.
    expect(stopsIn(container)).toHaveLength(3);
  });

  it("registers one stop per chunk once the answer is final", () => {
    const { container } = renderBubble(FENCED_BODY, false);

    expect(stopsIn(container)).toHaveLength(splitResponseIntoChunks(FENCED_BODY).length);
  });

  /*
   * T3, the moment streaming stops. The layout is rebuilt from splitResponseIntoChunks, so the
   * section boundaries change and focus may jump — that is the accepted trade (locked option C).
   * What must not happen is the registry keeping the stream layout's entries: a walk that focuses an
   * unmounted node swallows the press and leaves the user stuck.
   */
  it("rebuilds the stops when streaming finishes, leaving none of the old ones behind", () => {
    const { container, rerender } = renderBubble(FENCED_BODY, true);
    const streamed = stopsIn(container);
    expect(streamed.length).toBeGreaterThan(0);

    rerender(
      buildAnswerBubbleElement({
        body: FENCED_BODY,
        streaming: false,
        spoilerMaskingEnabled: true,
        maxWidthCss: "100%",
        answerKey: ANSWER_KEY,
      })!
    );

    const final = stopsIn(container);
    expect(final).toHaveLength(splitResponseIntoChunks(FENCED_BODY).length);
    for (const stop of final) {
      expect(stop.isConnected).toBe(true);
      expect(stop.hasAttribute("data-bonsai-stream-preview")).toBe(false);
    }
  });

  /* An open fence holds the body back behind a wait chip, and that chip is a stop like any other —
     otherwise Down would have nothing to land on for as long as the model stays inside the fence. */
  it("makes the wait chip a stop while a fence is still open", () => {
    const { container } = renderBubble("Intro line.\n\n```bash\necho hi", true);

    const stops = stopsIn(container);
    expect(stops).toHaveLength(2);
    expect(stops[1]!.className).toContain("bonsai-ai-response-chunk--stream-wait");
  });

  /*
   * Up from a revealed spoiler's collapse control (nothing masked left to park on) goes through
   * `focusFirstAnswerChunk` — "back to the top of the answer" per the comment on `moveUp` below —
   * which used to land on the bare bubble itself, a stop of its own. One press should reach the
   * first real section instead, the same fix as Down from the turn header (roadmap: "Down from the
   * chat slot lands on the whole reply before its first section").
   */
  it("Up from a revealed spoiler's collapse control lands on the first section, not the bare bubble", () => {
    const el = buildAnswerBubbleElement({
      body: FENCED_BODY,
      streaming: false,
      spoilerMaskingEnabled: true,
      maxWidthCss: "100%",
      answerKey: ANSWER_KEY,
    });
    expect(el).not.toBeNull();
    const { container } = render(el!);
    const stops = stopsIn(container);
    expect(stops.length).toBeGreaterThan(1);

    // The shape Decky actually renders for a revealed fence's collapse control: its own Focusable
    // (MainTabBonsaiAiMarkdownChunk.tsx), so it carries "Panel Focusable" itself.
    const collapse = document.createElement("div");
    collapse.className = "bonsai-spoiler-collapse-target Panel Focusable";
    collapse.tabIndex = -1;
    stops[0]!.appendChild(collapse);
    collapse.focus();

    const onMoveUp = (el!.props as Record<string, unknown>).onMoveUp as () => boolean;
    expect(onMoveUp()).toBe(true);
    expect(document.activeElement).toBe(stops[0]);
  });

  /*
   * Down once the bubble itself has nothing left. Measured on device 2026-09-05
   * (round35-spoiler-block-down-and-up.json): with a branch picker the very next sibling, Down
   * happened to reach it through Steam's own sibling geometry — but that is neither guaranteed nor
   * testable off device, and Up from the reply-actions row (buildReplyActionsElement.tsx) now names
   * the same hand-off explicitly via `focusUpFromReplyActions`. This is the Down-side match:
   * `focusDownFromLiveAnswerBubble` (liveTurnFocusGraph.ts, already shipped and tested) is tried
   * before yielding, so both edges of the bubble are named rather than one named and one guessed.
   */
  it("Down reaches a branch button once the bubble has nothing left, via focusDownFromLiveAnswerBubble", () => {
    const slot = document.createElement("div");
    slot.className = "bonsai-chat-turn-slot";
    document.body.appendChild(slot);
    const header = document.createElement("div");
    header.className = "bonsai-chat-turn-row-header--live";
    slot.appendChild(header);
    const bubbleMount = document.createElement("div");
    slot.appendChild(bubbleMount);

    const el = buildAnswerBubbleElement({
      body: "Just one short paragraph.",
      streaming: false,
      spoilerMaskingEnabled: true,
      maxWidthCss: "100%",
      answerKey: ANSWER_KEY,
    });
    expect(el).not.toBeNull();
    render(el!, { container: bubbleMount });

    const branchPicker = document.createElement("div");
    branchPicker.className = "bonsai-strategy-branch-picker";
    const branchButton = document.createElement("button");
    branchButton.type = "button";
    branchButton.textContent = "A. Pick this branch";
    branchPicker.appendChild(branchButton);
    slot.appendChild(branchPicker);

    try {
      // No `.TabContentsScroll` ancestor in this fixture, so the in-bubble walk
      // (handleAnswerBubbleMoveDown) finds no scroll container and returns false immediately —
      // exactly the "nothing left inside the bubble" case this test targets.
      const onMoveDown = (el!.props as Record<string, unknown>).onMoveDown as () => boolean;
      expect(onMoveDown()).toBe(true);
      expect(document.activeElement).toBe(branchButton);
    } finally {
      slot.remove();
    }
  });

  /*
   * "A greyed-out button still takes the highlight" — measured on the greyed Ask button 2026-09-05
   * (round35-CHECK-stop-press.json) and true of every greyed button in this codebase, including the
   * Helpful / Not really pair on a stopped reply (round35-stopped-notice-and-greyed-buttons.png).
   * Fix: step over a disabled reply stop instead of landing on it. `focusRegisteredReplyStop`
   * already reports false when its `.focus()` call does not stick — a disabled `<button>` refuses
   * focus on device exactly as it does in jsdom (see the comment on the Button stub in
   * fakeDeckyUi.tsx) — so once Down names its target explicitly (the change above) rather than
   * leaving it to Steam's own geometry, a disabled Helpful is skipped for free and the chain
   * continues to Retry, which stays live on a stopped reply.
   */
  it("Down from the last section lands on Retry when the thumbs are greyed", () => {
    const slot = document.createElement("div");
    slot.className = "bonsai-chat-turn-slot";
    document.body.appendChild(slot);
    const header = document.createElement("div");
    header.className = "bonsai-chat-turn-row-header--live";
    slot.appendChild(header);
    const bubbleMount = document.createElement("div");
    slot.appendChild(bubbleMount);

    const el = buildAnswerBubbleElement({
      body: "Just one short paragraph.",
      streaming: false,
      spoilerMaskingEnabled: true,
      maxWidthCss: "100%",
      answerKey: ANSWER_KEY,
    });
    expect(el).not.toBeNull();
    render(el!, { container: bubbleMount });

    const helpful = document.createElement("button");
    helpful.type = "button";
    helpful.disabled = true;
    helpful.textContent = "Helpful";
    slot.appendChild(helpful);
    const retry = document.createElement("button");
    retry.type = "button";
    retry.textContent = "Retry same prompt";
    slot.appendChild(retry);
    registerReplyStop("helpful", helpful);
    registerReplyStop("retry", retry);

    try {
      const onMoveDown = (el!.props as Record<string, unknown>).onMoveDown as () => boolean;
      expect(onMoveDown()).toBe(true);
      expect(document.activeElement).toBe(retry);
      expect(document.activeElement).not.toBe(helpful);
    } finally {
      registerReplyStop("helpful", null);
      registerReplyStop("retry", null);
      slot.remove();
    }
  });

  /* Same fixture, thumbs live: unchanged from today, Down lands on Helpful. */
  it("Down from the last section still lands on Helpful when the thumbs are live", () => {
    const slot = document.createElement("div");
    slot.className = "bonsai-chat-turn-slot";
    document.body.appendChild(slot);
    const header = document.createElement("div");
    header.className = "bonsai-chat-turn-row-header--live";
    slot.appendChild(header);
    const bubbleMount = document.createElement("div");
    slot.appendChild(bubbleMount);

    const el = buildAnswerBubbleElement({
      body: "Just one short paragraph.",
      streaming: false,
      spoilerMaskingEnabled: true,
      maxWidthCss: "100%",
      answerKey: ANSWER_KEY,
    });
    expect(el).not.toBeNull();
    render(el!, { container: bubbleMount });

    const helpful = document.createElement("button");
    helpful.type = "button";
    helpful.textContent = "Helpful";
    slot.appendChild(helpful);
    const retry = document.createElement("button");
    retry.type = "button";
    retry.textContent = "Retry same prompt";
    slot.appendChild(retry);
    registerReplyStop("helpful", helpful);
    registerReplyStop("retry", retry);

    try {
      const onMoveDown = (el!.props as Record<string, unknown>).onMoveDown as () => boolean;
      expect(onMoveDown()).toBe(true);
      expect(document.activeElement).toBe(helpful);
    } finally {
      registerReplyStop("helpful", null);
      registerReplyStop("retry", null);
      slot.remove();
    }
  });

  /*
   * Measured on the Deck 2026-09-16 (plan56-GREYED-STEP-OVER-01-thumbs.json, steps 4 and 5): Left
   * from an answer paragraph moved the ring onto Steam's own Quick Access rail — out of the plugin
   * entirely — and Right brought it back onto the reply's container. No paragraph stop wired either
   * direction, so once Steam's own move handler returned nothing, Steam's default spatial search
   * took over and found the rail. Nothing inside a paragraph is reached by Left/Right today —
   * glossary chips and spoiler fences are only ever offered on a Down or Up press (see
   * handleAnswerBubbleMoveDown/Up above) — so claiming both directions and holding still is safe:
   * there is nothing here for them to do. The last section's existing Right-into-Copy hand-off
   * (`rightIntoCopy`, tested below under "Copy in the answer bubble's corner") still overrides this
   * default, since it is applied after `stopNavProps` in `stopAttrs`.
   */
  describe("answer stop Left/Right hold still instead of leaving the bubble", () => {
    beforeEach(() => {
      resetAnswerStopRegistry();
      registerAnswerBubbleEl(ANSWER_KEY, null);
    });
    afterEach(() => {
      cleanup();
    });

    it("claims Left on every section", () => {
      const el = buildAnswerBubbleElement({
        body: FENCED_BODY,
        streaming: false,
        spoilerMaskingEnabled: true,
        maxWidthCss: "100%",
        answerKey: ANSWER_KEY,
      });
      const sections = collectByClassName(el, "bonsai-answer-stop");
      expect(sections.length).toBeGreaterThan(1);
      for (const section of sections) {
        const onMoveLeft = (section.props as Record<string, unknown>).onMoveLeft as () => boolean;
        expect(onMoveLeft).toBeTypeOf("function");
        expect(onMoveLeft()).toBe(true);
      }
    });

    it("claims Right on every section when there is no copy icon to send it to", () => {
      const el = buildAnswerBubbleElement({
        body: FENCED_BODY,
        streaming: false,
        spoilerMaskingEnabled: true,
        maxWidthCss: "100%",
        answerKey: ANSWER_KEY,
        // No getAnswerCopyText: showCornerCopy is false, so even the last section gets no
        // rightIntoCopy override — every section should hold still on Right too.
      });
      const sections = collectByClassName(el, "bonsai-answer-stop");
      for (const section of sections) {
        const onMoveRight = (section.props as Record<string, unknown>).onMoveRight as () => boolean;
        expect(onMoveRight).toBeTypeOf("function");
        expect(onMoveRight()).toBe(true);
      }
    });

    it("still lets every section but the last claim Right when a copy icon is offered", () => {
      const el = buildAnswerBubbleElement({
        body: FENCED_BODY,
        streaming: false,
        spoilerMaskingEnabled: true,
        maxWidthCss: "100%",
        answerKey: ANSWER_KEY,
        getAnswerCopyText: () => "copy text",
      });
      const sections = collectByClassName(el, "bonsai-answer-stop");
      expect(sections.length).toBeGreaterThan(1);
      for (const section of sections.slice(0, -1)) {
        const onMoveRight = (section.props as Record<string, unknown>).onMoveRight as () => boolean;
        expect(onMoveRight()).toBe(true);
      }
    });
  });

  /*
   * Directions ride `onMoveDown`/`onMoveUp` — the handlers Steam actually invokes for a D-pad
   * press on device. Measured 2026-08-27: a real press dispatches no DOM keyboard event into the
   * plugin, and the previous `onButtonDown`-only wiring never moved the ring on hardware, which
   * is how the spoiler fence stayed unreachable through three shipped fixes. `onButtonDown`
   * remains for string-shaped presses only; a GamepadEvent direction must be a no-op there so a
   * press that somehow reaches both handlers cannot double-step.
   */
  describe("what a section does with a press", () => {
    const gamepad = (button: number) => ({ type: "gamepadbuttondown", detail: { button } });
    const DIR_UP = 9;
    const DIR_DOWN = 10;
    const OK = 1;

    it("walks on onMoveDown / onMoveUp, the handlers Steam invokes for the D-pad", () => {
      const down = vi.fn(() => true);
      const up = vi.fn(() => true);
      const props = stopNavProps(down, up);

      expect((props.onMoveDown as () => boolean)()).toBe(true);
      expect(down).toHaveBeenCalledTimes(1);

      expect((props.onMoveUp as () => boolean)()).toBe(true);
      expect(up).toHaveBeenCalledTimes(1);
    });

    it("does not double-step: a GamepadEvent direction on onButtonDown is a no-op", () => {
      const down = vi.fn(() => true);
      const up = vi.fn(() => true);
      const onButtonDown = stopNavProps(down, up).onButtonDown as (b: unknown) => boolean;

      expect(onButtonDown(gamepad(DIR_DOWN))).toBe(false);
      expect(onButtonDown(gamepad(DIR_UP))).toBe(false);
      expect(down).not.toHaveBeenCalled();
      expect(up).not.toHaveBeenCalled();
    });

    it("still walks on a string-shaped press, which desktop keyboards deliver", () => {
      const down = vi.fn(() => true);
      const onButtonDown = stopNavProps(down, () => false).onButtonDown as (b: unknown) => boolean;

      expect(onButtonDown("ArrowDown")).toBe(true);
      expect(down).toHaveBeenCalledTimes(1);
    });

    /* A on a section must not act — a spoiler wait chip is the section that makes this matter. */
    it("ignores A", () => {
      const down = vi.fn(() => true);
      const up = vi.fn(() => true);
      const onButtonDown = stopNavProps(down, up).onButtonDown as (b: unknown) => boolean;

      expect(onButtonDown(gamepad(OK))).toBe(false);
      expect(down).not.toHaveBeenCalled();
      expect(up).not.toHaveBeenCalled();
    });

    /* Returning false is what lets the press fall through and leave the bubble at either end. */
    it("reports the walk's own answer, so an exhausted walk yields", () => {
      const onMoveDown = stopNavProps(
        () => false,
        () => false
      ).onMoveDown as () => boolean;

      expect(onMoveDown()).toBe(false);
    });

    /*
     * `.bonsai-spoiler-collapse-target` never takes the ring itself — the D-pad walk parks on the
     * stop that contains it — so A on the stop has to reach in for it. Regression guard for "A
     * revealed spoiler cannot be re-hidden with the controller".
     */
    describe("A on a stop containing a revealed spoiler's collapse control", () => {
      function stopWithGpFocus(): HTMLElement {
        const stop = document.createElement("div");
        stop.className = "gpfocus bonsai-answer-stop";
        document.body.appendChild(stop);
        return stop;
      }

      it("collapses it", () => {
        const stop = stopWithGpFocus();
        const collapseTarget = document.createElement("div");
        collapseTarget.className = "bonsai-spoiler-collapse-target";
        const button = document.createElement("button");
        const onClick = vi.fn();
        button.addEventListener("click", onClick);
        collapseTarget.appendChild(button);
        stop.appendChild(collapseTarget);

        try {
          const onActivate = stopNavProps(() => false, () => false).onActivate as () => void;
          onActivate();
          expect(onClick).toHaveBeenCalledTimes(1);
        } finally {
          stop.remove();
        }
      });

      it("does nothing when the ring sits on a masked reveal target instead", () => {
        const stop = stopWithGpFocus();
        const revealTarget = document.createElement("div");
        revealTarget.className = "bonsai-spoiler-reveal-target";
        const button = document.createElement("button");
        const onClick = vi.fn();
        button.addEventListener("click", onClick);
        revealTarget.appendChild(button);
        stop.appendChild(revealTarget);

        try {
          const onActivate = stopNavProps(() => false, () => false).onActivate as () => void;
          expect(() => onActivate()).not.toThrow();
          expect(onClick).not.toHaveBeenCalled();
        } finally {
          stop.remove();
        }
      });

      it("does nothing when the ring sits on a wait chip", () => {
        const stop = stopWithGpFocus();
        stop.innerHTML = '<div class="bonsai-ai-response-chunk--stream-wait">Working…</div>';

        try {
          const onActivate = stopNavProps(() => false, () => false).onActivate as () => void;
          expect(() => onActivate()).not.toThrow();
        } finally {
          stop.remove();
        }
      });
    });
  });

  it("drops every stop when the bubble unmounts", () => {
    const { container } = renderBubble(FENCED_BODY, true);
    const bubble = container.querySelector(".bonsai-chat-ai-bubble") as HTMLElement;
    expect(orderedAnswerStops(ANSWER_KEY, bubble)).not.toHaveLength(0);

    cleanup();

    expect(orderedAnswerStops(ANSWER_KEY, bubble)).toHaveLength(0);
  });

  it("unwraps spoiler fences when consent is effective even if masking is off", () => {
    const body = [
      "Intro.",
      "",
      "```bonsai-spoiler",
      "Secret boss pattern.",
      "```",
    ].join("\n");
    const el = buildAnswerBubbleElement({
      body,
      streaming: false,
      spoilerMaskingEnabled: false,
      maxWidthCss: "100%",
      answerKey: ANSWER_KEY,
      spoilerConsentEffective: true,
    });
    const { container } = render(el!);
    expect(container.textContent).toContain("Secret boss pattern.");
    expect(container.textContent).not.toContain("bonsai-spoiler");
  });

  /* R4: the spoiler mask chip must not flash for a fence the turn already qualifies to unwrap
     once it closes — DRG Survivor's AppID is on the low-narrative allowlist. */
  it("streams a low-narrative-title spoiler fence as prose instead of a mid-stream mask chip", () => {
    const body = [
      "Here is the plan.",
      "",
      "```bonsai-spoiler",
      "Dodge the charge and focus the crystal",
    ].join("\n");
    const el = buildAnswerBubbleElement({
      body,
      streaming: true,
      spoilerMaskingEnabled: true,
      maxWidthCss: "100%",
      answerKey: ANSWER_KEY,
      appId: "2321470",
    });
    const { container } = render(el!);
    expect(container.textContent).toContain("Dodge the charge and focus the crystal");
    expect(container.textContent).not.toContain(SPOILER_STREAM_MASK_LABEL);
  });

  // Gap 2 (plan 54): a name-first question ("wheatley fight") the local regex cannot read must
  // stream the same way once the backend's named entity is set, or the box would show the mask
  // chip while streaming and then snap open the instant it finishes.
  it("streams a fence naming the backend's asked entity as prose instead of a mid-stream mask chip", () => {
    const body = [
      "Here is the plan.",
      "",
      "```bonsai-spoiler",
      "Wheatley starts lying the moment you reach the surface",
    ].join("\n");
    const el = buildAnswerBubbleElement({
      body,
      streaming: true,
      spoilerMaskingEnabled: true,
      maxWidthCss: "100%",
      answerKey: ANSWER_KEY,
      askQuestion: "wheatley fight",
      askedEntity: "Wheatley",
    });
    const { container } = render(el!);
    expect(container.textContent).toContain("Wheatley starts lying the moment you reach the surface");
    expect(container.textContent).not.toContain(SPOILER_STREAM_MASK_LABEL);
  });

  it("still shows the mid-stream mask chip on a narrative title with no entity named", () => {
    const body = [
      "Here is the plan.",
      "",
      "```bonsai-spoiler",
      "The true ending is that the dwarf retires",
    ].join("\n");
    const el = buildAnswerBubbleElement({
      body,
      streaming: true,
      spoilerMaskingEnabled: true,
      maxWidthCss: "100%",
      answerKey: ANSWER_KEY,
      askQuestion: "Where should I go?",
      appId: "1174180",
    });
    const { container } = render(el!);
    expect(container.textContent).toContain(SPOILER_STREAM_MASK_LABEL);
    expect(container.textContent).not.toContain("dwarf retires");
  });
});

/*
 * Copy sits in the answer's corner, not in a button row (D77). What it does when pressed is
 * ReplyCopyButton's business; what is pinned here is that it appears on a finished answer only,
 * and that the ring can get to it and back.
 */
describe("Copy in the answer bubble's corner", () => {
  beforeEach(() => {
    resetAnswerStopRegistry();
    registerAnswerBubbleEl(ANSWER_KEY, null);
  });
  afterEach(() => {
    cleanup();
    resetAnswerStopRegistry();
  });

  const build = (streaming: boolean, withCopy = true) =>
    buildAnswerBubbleElement({
      body: FENCED_BODY,
      streaming,
      spoilerMaskingEnabled: true,
      maxWidthCss: "100%",
      answerKey: ANSWER_KEY,
      getAnswerCopyText: withCopy ? () => "copied text" : undefined,
    });

  it("draws the icon on a finished answer", () => {
    const { container } = render(build(false)!);
    const icon = container.querySelector(".bonsai-reply-copy-corner");
    expect(icon).not.toBeNull();
    expect(icon!.getAttribute("aria-label")).toBe("Copy reply text");
    /* Icon only — the word "Copy" would draw a pill over the answer's own text. */
    expect(icon!.textContent).toBe("");
  });

  /*
   * Roadmap "The copy button sits on top of the code box instead of beside it" (measured on the
   * Deck 2026-09-12): the fix in section-6.ts reserves room below a trailing code box using the
   * selector `.bonsai-answer-stop:last-child > .bonsai-md-fenced-pre:last-child`. jsdom cannot
   * check the paint that rule produces (design-language.md rule 6), but it can check the rule
   * actually targets a shape the bubble renders — proving the fix's selector is not hollow.
   */
  it("puts the fenced code block as the last child of the last section when the answer ends in code", () => {
    const codeTailBody = ["Intro line.", "", "```bash", "echo hi", "```"].join("\n");
    const el = buildAnswerBubbleElement({
      body: codeTailBody,
      streaming: false,
      spoilerMaskingEnabled: true,
      maxWidthCss: "100%",
      answerKey: ANSWER_KEY,
      getAnswerCopyText: () => "copied text",
    });
    const { container } = render(el!);
    // Same selector shape the section-6.ts copy-icon-room rule targets.
    const target = container.querySelector(
      ".bonsai-answer-stop:last-child > .bonsai-md-fenced-pre:last-child"
    );
    expect(target).not.toBeNull();
  });

  it("does not match the code-tail shape when the answer ends in ordinary text", () => {
    // FENCED_BODY ends in "Tail text" after its fence, so the fence is not the last block.
    const { container } = render(build(false)!);
    const target = container.querySelector(
      ".bonsai-answer-stop:last-child > .bonsai-md-fenced-pre:last-child"
    );
    expect(target).toBeNull();
  });

  it("draws nothing while the answer is still arriving", () => {
    const { container } = render(build(true)!);
    expect(container.querySelector(".bonsai-reply-copy-corner")).toBeNull();
  });

  it("draws nothing when no copy text is supplied", () => {
    const { container } = render(build(false, false)!);
    expect(container.querySelector(".bonsai-reply-copy-corner")).toBeNull();
  });

  /*
   * Measured on the Deck 2026-09-06 (runs/reply-block-copy-trap.json): with the icon absolutely
   * positioned over the last section's corner, Steam's geometry navigation treated the two
   * overlapping boxes as each being below the other and Down bounced between them forever — the
   * reply could not be walked past. In flow it is unambiguously last.
   */
  it("sits after the bubble as its own step, never inside it", () => {
    const { container } = render(build(false)!);
    const bubble = container.querySelector(".bonsai-chat-ai-bubble")!;
    const slot = container.querySelector(".bonsai-reply-copy-corner-slot")!;
    /* Inside the bubble it was a dead end going Down, and could land behind the Ask bar with the
       ring on it and nothing visible — measured twice on the Deck 2026-09-06. */
    expect(bubble.contains(slot)).toBe(false);
    /* DOCUMENT_POSITION_FOLLOWING — it comes after the answer, so Down reaches it then moves on. */
    expect(bubble.compareDocumentPosition(slot) & 4).toBeTruthy();
  });

  /*
   * Read off the React tree, not the DOM: the test harness strips every Steam nav prop before it
   * reaches a div (fakeDeckyUi.tsx), so onMoveRight is invisible to a rendered query.
   *
   * Every section now claims Right (it holds still rather than leaking to Steam's own rail — see
   * "answer stop Left/Right hold still" above), so the last section is no longer the only one that
   * carries the prop. What is still true, and what this checks, is that only the LAST section's
   * Right actually reaches into the copy icon — every earlier one holds without moving focus.
   */
  it("moves into the copy icon on Right from the last section only", () => {
    const el = build(false)!;
    render(el); // mounts the copy icon so its replyStop ref actually registers
    const sections = collectByClassName(el, "bonsai-answer-stop");
    expect(sections.length).toBeGreaterThan(1);
    for (const section of sections) {
      const onMoveRight = (section.props as Record<string, unknown>).onMoveRight as () => boolean;
      expect(onMoveRight).toBeTypeOf("function");
    }
    const last = sections[sections.length - 1]!;
    expect(((last.props as Record<string, unknown>).onMoveRight as () => boolean)()).toBe(true);
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Copy reply text");
  });

  it("offers Left back out of the icon", () => {
    const slot = collectByClassName(build(false)!, "bonsai-reply-copy-corner-slot");
    expect(slot).toHaveLength(1);
    expect((slot[0]!.props as Record<string, unknown>).onMoveLeft).toBeTypeOf("function");
  });

  it("marks the bubble so the stylesheet can keep the last line clear of the icon", () => {
    const finished = render(build(false)!).container;
    expect(finished.querySelector(".bonsai-chat-ai-bubble--with-copy")).not.toBeNull();
    cleanup();
    const streaming = render(build(true)!).container;
    expect(streaming.querySelector(".bonsai-chat-ai-bubble--with-copy")).toBeNull();
  });

  /*
   * The icon draws inside the bubble's corner, overlapping the last section's box by a few
   * pixels — the same overlap that once made Steam's geometry bounce Down between two boxes
   * (runs/reply-block-copy-trap.json). So Down names its target instead of leaving it to Steam.
   */
  it("names where Down goes from the icon: the reply block below it", () => {
    const target = document.createElement("div");
    target.tabIndex = 0;
    document.body.appendChild(target);
    registerReplyStop("show-details", target);
    try {
      const slot = collectByClassName(build(false)!, "bonsai-reply-copy-corner-slot");
      const onMoveDown = (slot[0]!.props as Record<string, unknown>).onMoveDown as () => boolean;
      expect(onMoveDown()).toBe(true);
      expect(document.activeElement).toBe(target);
    } finally {
      registerReplyStop("show-details", null);
      target.remove();
    }
  });

  /*
   * No copy icon to reach: every section's Right now holds still (claims the press, moves
   * nothing) rather than being entirely unset — see "answer stop Left/Right hold still" above.
   */
  it("holds still on Right when there is no icon to send it to", () => {
    const sections = collectByClassName(build(false, false)!, "bonsai-answer-stop");
    for (const section of sections) {
      const onMoveRight = (section.props as Record<string, unknown>).onMoveRight as () => boolean;
      expect(onMoveRight()).toBe(true);
    }
  });

  /*
   * Measured on the Deck 2026-09-12: on a restored answer with no thumbs row, Down from the Copy
   * corner went straight to Show details and the Read aloud line above it could not be reached from
   * above at all. `downOutOfCopy` now tries the thumbs, then Read aloud, then Show details.
   */
  it("Down from the icon reaches the Read aloud line when there is no thumbs row to stop at first", () => {
    const readAloud = document.createElement("div");
    readAloud.tabIndex = 0;
    document.body.appendChild(readAloud);
    const showDetails = document.createElement("div");
    showDetails.tabIndex = 0;
    document.body.appendChild(showDetails);
    registerReplyStop("read-aloud", readAloud);
    registerReplyStop("show-details", showDetails);
    try {
      const slot = collectByClassName(build(false)!, "bonsai-reply-copy-corner-slot");
      const onMoveDown = (slot[0]!.props as Record<string, unknown>).onMoveDown as () => boolean;
      expect(onMoveDown()).toBe(true);
      expect(document.activeElement).toBe(readAloud);
    } finally {
      registerReplyStop("read-aloud", null);
      registerReplyStop("show-details", null);
      readAloud.remove();
      showDetails.remove();
    }
  });

  it("Down from the icon still goes to the thumbs row when it is mounted", () => {
    const helpful = document.createElement("div");
    helpful.tabIndex = 0;
    document.body.appendChild(helpful);
    const readAloud = document.createElement("div");
    readAloud.tabIndex = 0;
    document.body.appendChild(readAloud);
    registerReplyStop("helpful", helpful);
    registerReplyStop("read-aloud", readAloud);
    try {
      const slot = collectByClassName(build(false)!, "bonsai-reply-copy-corner-slot");
      const onMoveDown = (slot[0]!.props as Record<string, unknown>).onMoveDown as () => boolean;
      expect(onMoveDown()).toBe(true);
      expect(document.activeElement).toBe(helpful);
    } finally {
      registerReplyStop("helpful", null);
      registerReplyStop("read-aloud", null);
      helpful.remove();
      readAloud.remove();
    }
  });
});
