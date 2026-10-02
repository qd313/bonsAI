/**
 * Title: Down off the last chip of the Session tab's chip ladder moves on
 * Purpose: Pin the fix for the roadmap bug "In Show details' Session tab, Down from the last chip of
 *          the chip ladder does not move the ring" (plan 70 flow L6; measured again in plan 72 free
 *          play, docs/test-evidence/plan72-Z-FREEPLAY.json finding 1: seven Downs and a Right left
 *          the ring on "Chip 6 of 6", with the question box unreachable except by B).
 * Used for: buildDetailsPanelElement.tsx and SessionContextStrip.tsx, rendered for real inside
 *           MainTabChatTranscript.
 * Solves: The ladder's last Down used to be swallowed on purpose. It now hands the ring on through
 *         Steam's own transfer (a registered nav node's TakeFocus) to whatever sits below the
 *         panel: a permission hint row when one shows, else the suggestion chips, else the question
 *         box. A jsdom test cannot move Steam's ring; it proves the move props Steam calls are
 *         wired to those transfers, and that Up through the ladder is unchanged.
 * Does not: Prove it on the Deck.
 */
import React from "react";
import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import type { ContextChip, TransparencySnapshot } from "../utils/inputTransparency";
import { registerNavFocus, resetNavFocusRegistry, type NavFocusId } from "../utils/navFocusRegistry";

const hoisted = vi.hoisted(() => ({
  focusableProps: [] as Array<Record<string, unknown>>,
}));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const RealFocusable = stubs.Focusable;
  const CapturingFocusable = React.forwardRef<HTMLDivElement, Record<string, unknown>>(
    function CapturingFocusable(props, ref) {
      hoisted.focusableProps.push(props);
      return <RealFocusable {...props} ref={ref} />;
    }
  );
  return { ...stubs, Focusable: CapturingFocusable };
});

function chip(id: string, label: string): ContextChip {
  return {
    id,
    rank: 1,
    label,
    attached: true,
    tier_class: "",
    body: { title: label, paths: [], bullets: ["something"] },
  };
}

const SNAPSHOT = {
  route: "ollama",
  success: true,
  final_response: "Keep your distance and strafe.",
  context_chips: [chip("game_context", "Game context"), chip("routing", "Routed gemma3")],
  ask_diagnostics: null,
} as unknown as TransparencySnapshot;

function renderTranscript(overrides: Partial<MainTabChatTranscriptProps> = {}) {
  const props = {
    fullBleedRowStyle: {},
    isAsking: false,
    selectedAttachment: null,
    ollamaContext: {} as MainTabChatTranscriptProps["ollamaContext"],
    unifiedInput: "",
    showSlowWarning: false,
    latencyWarningSeconds: 30,
    ollamaResponse: "Keep your distance and strafe.",
    elapsedSeconds: null,
    lastApplied: null,
    canSaveDesktopNote: false,
    onOpenDesktopNoteSave: () => {},
    askMode: "speed",
    askThreadCollapsed: [],
    expandedTurnKey: "live",
    askThreadDisplayQuestion: "how do i dodge the exploders",
    lastExchange: { question: "how do i dodge the exploders", answer: "Keep your distance and strafe." },
    transparencySnapshot: SNAPSHOT,
    ...overrides,
  } as MainTabChatTranscriptProps;
  return render(<MainTabChatTranscript {...props} />);
}

/* Since plan 79 each chip is its own stop and carries the moves and B; the open chip holds them
   for the tests below (the ladder itself no longer has any). */
const OPEN_CHIP = "bonsai-chip-ladder-chip bonsai-chip-ladder-chip--active";

function latestPropsFor(className: string): Record<string, unknown> | undefined {
  const matches = hoisted.focusableProps.filter((p) => p.className === className);
  return matches[matches.length - 1];
}

/** Open Show details, switch to the Session tab, and return the chip ladder inside it. */
function openSessionTabLadder(container: HTMLElement): HTMLElement {
  fireEvent.click(container.querySelector('[aria-label="Show details"]')!);
  act(() => {
    (latestPropsFor("bonsai-details-tabs-row")?.onMoveRight as () => boolean)();
  });
  const ladder = container.querySelector(".bonsai-details-session-body .bonsai-chip-ladder");
  expect(ladder).not.toBeNull();
  return ladder as HTMLElement;
}

function press(direction: "onMoveDown" | "onMoveUp" | "onMoveRight"): boolean {
  let handled = false;
  act(() => {
    handled = (latestPropsFor(OPEN_CHIP)?.[direction] as () => boolean)();
  });
  return handled;
}

function counter(container: HTMLElement): string {
  return container.querySelector(".bonsai-details-session-body .bonsai-chip-ladder")?.textContent ?? "";
}

/** A registered nav node whose TakeFocus Steam would honour. */
function navNode(id: NavFocusId) {
  const takeFocus = vi.fn(() => true);
  registerNavFocus(id, { current: { TakeFocus: takeFocus } } as never);
  return takeFocus;
}

beforeEach(() => {
  hoisted.focusableProps = [];
  resetNavFocusRegistry();
});

afterEach(() => {
  resetNavFocusRegistry();
});

describe("the Session tab's chip ladder: Down off the last chip", () => {
  it("steps the chips first, then hands the ring to the suggestion chips through Steam's transfer", () => {
    const presets = navNode("preset-carousel");
    const input = navNode("unified-input");
    const { container } = renderTranscript();
    openSessionTabLadder(container);
    expect(counter(container)).toContain("Chip 1 of 2");

    expect(press("onMoveDown")).toBe(true);
    expect(counter(container)).toContain("Chip 2 of 2");
    expect(presets).not.toHaveBeenCalled();

    expect(press("onMoveDown")).toBe(true);
    expect(presets).toHaveBeenCalledTimes(1);
    expect(input).not.toHaveBeenCalled();
  });

  it("Right off the last chip moves on the same way", () => {
    const presets = navNode("preset-carousel");
    const { container } = renderTranscript();
    openSessionTabLadder(container);
    press("onMoveDown");
    expect(press("onMoveRight")).toBe(true);
    expect(presets).toHaveBeenCalledTimes(1);
  });

  it("lands on a permission hint row first when one shows below the chat", () => {
    const presets = navNode("preset-carousel");
    const { container } = renderTranscript();
    /* After the render: the transcript registers its own (here empty) holder for this id on mount. */
    const hint = navNode("chat-perm-hint-troubleshoot");
    openSessionTabLadder(container);
    press("onMoveDown");
    expect(press("onMoveDown")).toBe(true);
    expect(hint).toHaveBeenCalledTimes(1);
    expect(presets).not.toHaveBeenCalled();
  });

  it("with no suggestion chips, goes to the question box", () => {
    const input = navNode("unified-input");
    const { container } = renderTranscript();
    openSessionTabLadder(container);
    press("onMoveDown");
    expect(press("onMoveDown")).toBe(true);
    expect(input).toHaveBeenCalledTimes(1);
  });

  it("Up still steps back through the chips before leaving the ladder", () => {
    navNode("preset-carousel");
    const { container } = renderTranscript();
    openSessionTabLadder(container);
    press("onMoveDown");
    expect(counter(container)).toContain("Chip 2 of 2");
    expect(press("onMoveUp")).toBe(true);
    expect(counter(container)).toContain("Chip 1 of 2");
    expect(press("onMoveUp")).toBe(true);
    expect(document.activeElement?.classList.contains("bonsai-details-session-row")).toBe(true);
  });
});

/*
 * The same dead end one level up: a chat where no question attached anything extra has no rows and
 * no chips in the Session tab, so Sum up (or the summary card under it) is its last stop, and Down
 * there used to be swallowed. It now leaves by the same route as the last chip.
 */
const NO_CHIPS = { ...SNAPSHOT, context_chips: [] } as unknown as TransparencySnapshot;

const SUMMARY = {
  text: "- Beat the first boss",
  covers_through_turn_id: "t4",
  turns_covered: 4,
  oldest_turns_unread: 0,
  hidden_notes_left_out: 0,
  written_at: new Date().toISOString(),
  seconds: 12,
  model: "test",
};

function sumUpState(summary: typeof SUMMARY | null) {
  return {
    summary,
    canSumUp: true,
    questionsAfterSummary: 0,
    summingUp: false,
    summingUpSeconds: null,
    otherJobRunning: false,
    startSumUp: () => {},
    stopSumUp: () => {},
  };
}

function openEmptySessionTab(summary: typeof SUMMARY | null): HTMLElement {
  const { container } = renderTranscript({
    transparencySnapshot: NO_CHIPS,
    chatSumUp: sumUpState(summary),
  } as Partial<MainTabChatTranscriptProps>);
  fireEvent.click(container.querySelector('[aria-label="Show details"]')!);
  act(() => {
    (latestPropsFor("bonsai-details-tabs-row")?.onMoveRight as () => boolean)();
  });
  expect(container.querySelector(".bonsai-details-session-body")).not.toBeNull();
  expect(container.querySelector(".bonsai-details-session-row")).toBeNull();
  expect(container.querySelector(".bonsai-chip-ladder")).toBeNull();
  return container;
}

function pressOn(className: string): boolean {
  let handled = false;
  act(() => {
    handled = (latestPropsFor(className)?.onMoveDown as () => boolean)();
  });
  return handled;
}

describe("the Session tab with no rows and no chips: Down off its last stop", () => {
  it("from Sum up this chat, hands the ring to the suggestion chips", () => {
    const presets = navNode("preset-carousel");
    openEmptySessionTab(null);
    expect(pressOn("bonsai-sumup-btn")).toBe(true);
    expect(presets).toHaveBeenCalledTimes(1);
  });

  it("from the summary card, the same way; the button still steps onto the card first", () => {
    const presets = navNode("preset-carousel");
    const container = openEmptySessionTab(SUMMARY);
    expect(pressOn("bonsai-sumup-btn")).toBe(true);
    expect(document.activeElement).toBe(container.querySelector(".bonsai-sumup-card"));
    expect(presets).not.toHaveBeenCalled();
    expect(pressOn("bonsai-sumup-card")).toBe(true);
    expect(presets).toHaveBeenCalledTimes(1);
  });

  it("lands on a permission hint row first, and falls back to the question box", () => {
    openEmptySessionTab(null);
    const input = navNode("unified-input");
    expect(pressOn("bonsai-sumup-btn")).toBe(true);
    expect(input).toHaveBeenCalledTimes(1);
    const hint = navNode("chat-perm-hint-deny");
    expect(pressOn("bonsai-sumup-btn")).toBe(true);
    expect(hint).toHaveBeenCalledTimes(1);
    expect(input).toHaveBeenCalledTimes(1);
  });

  it("with nothing below to take it, leaves the press to Steam's own navigation", () => {
    openEmptySessionTab(null);
    expect(pressOn("bonsai-sumup-btn")).toBe(false);
  });
});
