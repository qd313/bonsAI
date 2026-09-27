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

function renderTranscript() {
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
  } as MainTabChatTranscriptProps;
  return render(<MainTabChatTranscript {...props} />);
}

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
    handled = (latestPropsFor("bonsai-chip-ladder")?.[direction] as () => boolean)();
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
