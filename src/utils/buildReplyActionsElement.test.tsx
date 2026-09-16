/**
 * Title: Reply actions element tests
 * Purpose: Cover the reply action row's controls — the refine chip row (specifically that the
 *          unfenced-spoiler chip renders and reports its id back through onChip) and the Copy
 *          control (renders only when getAnswerCopyText is supplied).
 * Used for: buildReplyActionsElement.tsx regression coverage.
 * Solves: The chip row had no render test at all before this file — every existing chip's wiring
 *         was only exercised indirectly through data-layer tests.
 * Does not: Cover D-pad focus hops between rows — see liveTurnFocusGraph tests for that.
 */
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { buildReplyActionsElement } from "./buildReplyActionsElement";
import { registerAnswerBubbleEl } from "./answerBubbleElRegistry";
import { registerAnswerStop, resetAnswerStopRegistry } from "./answerStopRegistry";
import {
  registerDrgGlossaryTermChip,
  resetDrgGlossaryTermRegistry,
} from "./drgGlossaryTermRegistry";
import { resetUiDocument } from "./uiDocument";

vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

afterEach(() => {
  cleanup();
});

/*
 * Move handlers live on nested Focusable rows inside the returned tree (the utility row's own
 * onMoveUp/onMoveDown, not the outer reply-actions Focusable's), and the fake Decky harness strips
 * onMove* before it ever reaches the DOM (see fakeDeckyUi.tsx) — so a handler can only be reached by
 * walking the unrendered React element tree and reading it off the matching node's props, the same
 * technique buildTurnHeaderElement.test.tsx uses for the single-Focusable case.
 */
function findByClassName(node: React.ReactNode, className: string): React.ReactElement | null {
  if (node == null || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findByClassName(child, className);
      if (found) return found;
    }
    return null;
  }
  if (!React.isValidElement(node)) return null;
  const props = node.props as Record<string, unknown>;
  if (typeof props.className === "string" && props.className.split(" ").includes(className)) {
    return node;
  }
  return findByClassName(props.children as React.ReactNode, className);
}

/** Every element carrying `className`, in tree order — for when more than one row shares a class. */
function findAllByClassName(node: React.ReactNode, className: string, out: React.ReactElement[] = []): React.ReactElement[] {
  if (node == null || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    for (const child of node) findAllByClassName(child, className, out);
    return out;
  }
  if (!React.isValidElement(node)) return out;
  const props = node.props as Record<string, unknown>;
  if (typeof props.className === "string" && props.className.split(" ").includes(className)) {
    out.push(node);
  }
  findAllByClassName(props.children as React.ReactNode, className, out);
  return out;
}

/** A bubble with `count` registered `.bonsai-answer-stop` sections, under answerKey "live". */
function registerBubbleWithStops(count: number): HTMLElement[] {
  const bubble = document.createElement("div");
  bubble.className = "bonsai-chat-ai-bubble";
  document.body.appendChild(bubble);
  registerAnswerBubbleEl("live", bubble);

  const stops: HTMLElement[] = [];
  for (let i = 0; i < count; i++) {
    const stop = document.createElement("div");
    stop.className = "bonsai-answer-stop";
    bubble.appendChild(stop);
    registerAnswerStop("live", i, stop);
    stops.push(stop);
  }
  return stops;
}

/* jsdom reports every rect as 0×0, so geometry-reading helpers (elementIsWithinViewportOf) need it
   supplied — same helper shape as answerBubbleNavigation.test.ts's stubRect. */
function stubRect(el: HTMLElement, top: number, bottom: number): void {
  el.getBoundingClientRect = () =>
    ({
      top,
      bottom,
      left: 0,
      right: 0,
      width: 0,
      height: bottom - top,
      x: 0,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect;
}

describe("buildReplyActionsElement refine chip row", () => {
  it("renders the unfenced-spoiler chip alongside the other refine chips once rated down", () => {
    const onChip = vi.fn();
    const el = buildReplyActionsElement({
      replyKey: "r1",
      rating: "down",
      onRate: () => {},
      showFeedback: true,
      onChip,
    });
    expect(el).not.toBeNull();
    render(el!);

    expect(screen.getByLabelText("Bad information")).toBeTruthy();
    expect(screen.getByLabelText("Misidentified game/problem")).toBeTruthy();
    expect(screen.getByLabelText("Unfenced spoiler")).toBeTruthy();
  });

  it("reports unfenced_spoiler through onChip when that chip is pressed", () => {
    const onChip = vi.fn();
    const el = buildReplyActionsElement({
      replyKey: "r1",
      rating: "down",
      onRate: () => {},
      showFeedback: true,
      onChip,
    });
    render(el!);

    fireEvent.click(screen.getByLabelText("Unfenced spoiler"));

    expect(onChip).toHaveBeenCalledWith("unfenced_spoiler");
  });

  it("does not render refine chips before the reply is rated down", () => {
    const onChip = vi.fn();
    const el = buildReplyActionsElement({
      replyKey: "r1",
      rating: null,
      onRate: () => {},
      showFeedback: true,
      onChip,
    });
    render(el!);

    expect(screen.queryByLabelText("Unfenced spoiler")).toBeNull();
  });
});

/*
 * Copy left this row for the answer bubble's bottom-right corner (D77). What it does when pressed
 * is unchanged and still covered by ReplyCopyButton.test.tsx; where it lives is covered by
 * buildAnswerBubbleElement.test.tsx. What is pinned here is that the row does not offer it.
 */
describe("buildReplyActionsElement no longer offers Copy", () => {
  it("renders no Copy button, and no row at all when Retry is absent", () => {
    const el = buildReplyActionsElement({
      replyKey: "live",
      rating: null,
      onRate: () => {},
      showFeedback: false,
      onToggleTransparency: () => {},
    });
    expect(findByClassName(el, "bonsai-chat-reply-actions-row--utility")).toBeNull();
    expect(JSON.stringify(el)).not.toContain("Copy");
  });

  it("returns null when there is nothing to show at all", () => {
    const el = buildReplyActionsElement({
      replyKey: "live",
      rating: null,
      onRate: () => {},
      showFeedback: false,
    });
    expect(el).toBeNull();
  });
});

/*
 * Up from the utility row (Retry / Show details), the last fallback before yielding to Steam.
 * Measured shape, already documented on `upIntoGlossaryChip`: with no thumbs row, no refinement
 * chips and no DRG glossary chip in view, Up used to yield and land on the bare answer bubble — a
 * second Up was needed to reach its last section. Same double landing as Down from the turn header
 * (roadmap: "Down from the chat slot lands on the whole reply before its first section"), approached
 * from underneath.
 */
/*
 * These used to build the row with only `onToggleTransparency`, because Show details lived in it.
 * It is the line below the row now (D76), so the row needs Retry to exist at all — the press being
 * checked (Up out of the row, into the answer) is unchanged.
 */
/*
 * Up out of the bottom of the reply block, into the answer.
 *
 * This used to be the button row's own onMoveUp. The row is gone (D76, D77) — Show details is the
 * line at the bottom now, and it inherited the same last-resort chain, so the press being checked
 * is unchanged even though the element carrying it is not.
 */
describe("buildReplyActionsElement Up from the bottom of the reply into the answer", () => {
  afterEach(() => {
    resetAnswerStopRegistry();
    resetUiDocument();
    registerAnswerBubbleEl("live", null);
    document.body.innerHTML = "";
  });

  it("lands on the bubble's last section when no thumbs, chips or glossary chip claim the press", () => {
    const stops = registerBubbleWithStops(2);
    const el = buildReplyActionsElement({
      replyKey: "live",
      rating: null,
      onRate: () => {},
      showFeedback: false, // no thumbs row
      onToggleTransparency: () => {},
    });

    const line = findByClassName(el, "bonsai-chat-details-divider");
    expect(line).not.toBeNull();
    const onMoveUp = (line!.props as Record<string, unknown>).onMoveUp as () => boolean;

    expect(onMoveUp()).toBe(true);
    expect(document.activeElement).toBe(stops[stops.length - 1]);
  });

  it("still yields to Steam when the answer has no registered sections at all", () => {
    // No bubble registered under "live" — the pre-fix behavior (yield, Steam lands on the bubble)
    // stays correct for the one case that genuinely has nothing to enter.
    const el = buildReplyActionsElement({
      replyKey: "live",
      rating: null,
      onRate: () => {},
      showFeedback: false,
      onToggleTransparency: () => {},
    });

    const line = findByClassName(el, "bonsai-chat-details-divider");
    const onMoveUp = (line!.props as Record<string, unknown>).onMoveUp as () => boolean;

    expect(onMoveUp()).toBe(false);
  });
});

/*
 * Up from the thumbs row (Helpful / Not really) — measured broken on device 2026-09-04 (build
 * f9a4c17, CHAT-REPLY-ENTRY-01): with the ring on Helpful, Up landed on the bare
 * `.bonsai-chat-ai-bubble`, never the last `.bonsai-answer-stop`. The thumbs row's own `onMoveUp`
 * (and the outer reply-actions container's, the same function) was a bare `() => false` that always
 * yielded to Steam — unlike the utility row above, which already had a last-resort chain. Every
 * ordinary reply has a thumbs row, so this was the path that mattered on device and the utility-row
 * fix alone never ran for it. `moveUpFromReply` now gets the same chain, minus the hop to the
 * utility row itself (thumbs sits above it, not below): `onMoveUpFromReply` (if a caller ever
 * supplies it) → the DRG glossary chip → the bubble's last section.
 */
describe("buildReplyActionsElement Up from the thumbs row into the answer", () => {
  afterEach(() => {
    resetAnswerStopRegistry();
    resetDrgGlossaryTermRegistry();
    resetUiDocument();
    registerAnswerBubbleEl("live", null);
    document.body.innerHTML = "";
  });

  /* Both the outer container and the thumbs row wire the identical `moveUpFromReply` callback
     (buildReplyActionsElement.tsx: the container's own onMoveUp, and the thumbs row's), so reading
     it off the outer element is exactly the handler Up-from-Helpful/Not-really actually calls. */
  function moveUpFromReplyOf(el: React.ReactElement | null): () => boolean {
    return (el!.props as Record<string, unknown>).onMoveUp as () => boolean;
  }

  it("lands on the bubble's last section when no glossary chip is in view", () => {
    const stops = registerBubbleWithStops(2);
    const el = buildReplyActionsElement({
      replyKey: "live",
      rating: null,
      onRate: () => {},
      showFeedback: true, // thumbs row renders (Helpful / Not really)
    });

    expect(moveUpFromReplyOf(el)()).toBe(true);
    expect(document.activeElement).toBe(stops[stops.length - 1]);
  });

  it("falls back to the bubble when the answer has no registered sections at all", () => {
    // No bubble registered under "live" — nothing to enter, so Up must still report false rather
    // than claim a press it did nothing with.
    const el = buildReplyActionsElement({
      replyKey: "live",
      rating: null,
      onRate: () => {},
      showFeedback: true,
    });

    expect(moveUpFromReplyOf(el)()).toBe(false);
  });

  it("still prefers a DRG glossary chip in view over the bubble's last section", () => {
    const stops = registerBubbleWithStops(2);
    const bubble = document.querySelector(".bonsai-chat-ai-bubble") as HTMLElement;

    // findScrollablePanel needs a `[class*="TabContentsScroll"]` ancestor to resolve at all — see
    // chatPanelScroll.ts; jsdom's own scrollHeight/clientHeight both read 0 either way.
    const scroll = document.createElement("div");
    scroll.className = "TabContentsScroll";
    document.body.appendChild(scroll);
    scroll.appendChild(bubble);
    stubRect(scroll, 0, 250);

    const chip = document.createElement("div");
    stubRect(chip, 100, 150); // inside the 0-250 viewport band
    stops[0]!.appendChild(chip);
    registerDrgGlossaryTermChip("kiting-1", chip);

    // The ring's own rect matters to findNextDrgGlossaryTermChipInView's reading-order check: a ring
    // that trivially "contains" the chip (document.body, jsdom's un-focused default) reads as
    // already inside it and the chip is skipped for "up". A ring below the chip, outside the bubble
    // — Helpful, in the real layout — is what makes the chip legitimately "before" it going up.
    const ringStandIn = document.createElement("button");
    stubRect(ringStandIn, 400, 432);
    document.body.appendChild(ringStandIn);
    ringStandIn.tabIndex = -1;
    ringStandIn.focus();

    const el = buildReplyActionsElement({
      replyKey: "live",
      rating: null,
      onRate: () => {},
      showFeedback: true,
    });

    expect(moveUpFromReplyOf(el)()).toBe(true);
    expect(document.activeElement).toBe(chip);
    expect(document.activeElement).not.toBe(stops[stops.length - 1]);
  });

  /*
   * Measured on device 2026-09-05 (round35-spoiler-block-down-and-up.json): Up from Helpful walked
   * straight past a two-button branch picker into the answer's own paragraphs, disagreeing with
   * Down, which reaches the buttons first. `focusUpFromReplyActions` (liveTurnFocusGraph.ts) already
   * ships this hand-off and is already tested there directly; this proves moveUpFromReply now calls
   * it ahead of the glossary chip and the bubble fallback whenever a branch picker is mounted.
   */
  it("reaches a branch button before the bubble's last section when a branch picker is mounted", () => {
    registerBubbleWithStops(2);
    const slot = document.createElement("div");
    slot.className = "bonsai-chat-turn-slot";
    document.body.appendChild(slot);
    const header = document.createElement("div");
    header.className = "bonsai-chat-turn-row-header--live";
    slot.appendChild(header);
    const branchPicker = document.createElement("div");
    branchPicker.className = "bonsai-strategy-branch-picker";
    const branchButton = document.createElement("button");
    branchButton.type = "button";
    branchButton.textContent = "B. Pick this branch";
    branchPicker.appendChild(branchButton);
    slot.appendChild(branchPicker);

    const el = buildReplyActionsElement({
      replyKey: "live",
      rating: null,
      onRate: () => {},
      showFeedback: true,
    });

    expect(moveUpFromReplyOf(el)()).toBe(true);
    expect(document.activeElement).toBe(branchButton);
  });

  /* No branch picker or checklist mounted at all: CHAT-REPLY-ENTRY-01's shape is unchanged. */
  it("still lands on the bubble's last section when no branch picker or checklist exists", () => {
    const stops = registerBubbleWithStops(2);
    const slot = document.createElement("div");
    slot.className = "bonsai-chat-turn-slot";
    document.body.appendChild(slot);
    const header = document.createElement("div");
    header.className = "bonsai-chat-turn-row-header--live";
    slot.appendChild(header);

    const el = buildReplyActionsElement({
      replyKey: "live",
      rating: null,
      onRate: () => {},
      showFeedback: true,
    });

    expect(moveUpFromReplyOf(el)()).toBe(true);
    expect(document.activeElement).toBe(stops[stops.length - 1]);
  });
});

/*
 * Show details is a line across the bottom of the reply, not a button in the row (D76). It reads as
 * the end of the answer and gives the row its width back.
 */
describe("buildReplyActionsElement Show details line", () => {
  const build = (over: Record<string, unknown> = {}) =>
    buildReplyActionsElement({
      replyKey: "live",
      rating: null,
      onRate: () => {},
      showFeedback: false,
      onToggleTransparency: () => {},
      ...over,
    });

  it("renders a line, and no button row of any kind", () => {
    const el = build();
    expect(findByClassName(el, "bonsai-chat-details-divider")).not.toBeNull();
    expect(findByClassName(el, "bonsai-chat-reply-actions-row--utility")).toBeNull();
  });

  it("reads Show details when closed and Hide details when open", () => {
    const closed = findByClassName(build(), "bonsai-chat-details-divider");
    expect(JSON.stringify(closed!.props)).toContain("Show details");
    const open = findByClassName(build({ transparencyOpen: true }), "bonsai-chat-details-divider");
    expect(JSON.stringify(open!.props)).toContain("Hide details");
  });

  it("presses the toggle once", () => {
    const onToggleTransparency = vi.fn();
    const line = findByClassName(build({ onToggleTransparency }), "bonsai-chat-details-divider");
    const press = (line!.props as Record<string, unknown>).onOKButton as () => void;
    press();
    expect(onToggleTransparency).toHaveBeenCalledTimes(1);
  });

  it("does nothing while the answer is still running", () => {
    const line = findByClassName(build({ askInFlight: true }), "bonsai-chat-details-divider");
    const props = line!.props as Record<string, unknown>;
    expect(props.onOKButton).toBeUndefined();
    expect(props.onClick).toBeUndefined();
    expect(String(props.className)).toContain("bonsai-chat-details-divider--disabled");
  });

  it("is the last thing in the block, after the thumbs", () => {
    const el = build({ showFeedback: true });
    const children = React.Children.toArray(
      (el!.props as { children?: React.ReactNode }).children
    ).filter(Boolean) as React.ReactElement[];
    const last = children[children.length - 1]!;
    expect(String((last.props as Record<string, unknown>).className)).toContain(
      "bonsai-chat-details-divider"
    );
  });
});

/*
 * Read aloud / Stop is a line of the same shape as Show details (plan 42 step 3), sitting one row
 * above it. Only renders when the caller supplies onReadAloudToggle — a turn with nothing to read
 * gets no line at all.
 */
describe("buildReplyActionsElement Read aloud line", () => {
  const build = (over: Record<string, unknown> = {}) =>
    buildReplyActionsElement({
      replyKey: "live",
      rating: null,
      onRate: () => {},
      showFeedback: false,
      ...over,
    });

  const findReadAloudLine = (el: React.ReactElement | null) =>
    findAllByClassName(el, "bonsai-chat-details-divider").find((node) =>
      String((node.props as Record<string, unknown>)["aria-label"]).match(/Read aloud|Stop/)
    ) ?? null;

  it("renders nothing when the caller has no toggle to offer", () => {
    const el = build();
    expect(findReadAloudLine(el)).toBeNull();
  });

  it("renders a line reading the given label", () => {
    const el = build({ onReadAloudToggle: () => {}, readAloudLabel: "Read aloud" });
    const line = findReadAloudLine(el);
    expect(line).not.toBeNull();
    expect(JSON.stringify(line!.props)).toContain("Read aloud");
  });

  it("reads Stop once the caller says this answer is the one speaking", () => {
    const el = build({ onReadAloudToggle: () => {}, readAloudLabel: "Stop" });
    const line = findReadAloudLine(el);
    expect(JSON.stringify(line!.props)).toContain("Stop");
  });

  it("presses the toggle once", () => {
    const onReadAloudToggle = vi.fn();
    const line = findReadAloudLine(build({ onReadAloudToggle }));
    const press = (line!.props as Record<string, unknown>).onOKButton as () => void;
    press();
    expect(onReadAloudToggle).toHaveBeenCalledTimes(1);
  });

  it("sits above Show details when both render", () => {
    const el = build({ onReadAloudToggle: () => {}, onToggleTransparency: () => {} });
    const lines = findAllByClassName(el, "bonsai-chat-details-divider");
    expect(lines.length).toBe(2);
    expect(String((lines[0]!.props as Record<string, unknown>)["aria-label"])).toMatch(
      /Read aloud|Stop/
    );
    expect(String((lines[1]!.props as Record<string, unknown>)["aria-label"])).toMatch(
      /Show details|Hide details/
    );
  });
});
