/**
 * Title: Walking Show details' chips puts the ring on one chip at a time
 * Purpose: Pin the fix for the roadmap bug "Moving through the Show details chips puts the ring on
 *          the whole block, not the chip, and it jumps" (plan 79, docs/test-evidence/
 *          plan79-P79-M3-DETAILS-RING.json): on the Deck, every press in the ladder put Steam's
 *          focus on the whole ladder, a box 290 wide and 169 to 337 tall that changed size on every
 *          press and reached down behind the question box, never on the 28 px chip.
 * Used for: ContextChipLadder.tsx and buildDetailsPanelElement.tsx, rendered for real inside
 *           MainTabChatTranscript with the seven chips the maintainer walked.
 * Solves: Walks the panel the way Steam does: each press calls the move handler of the element that
 *         holds focus right now, and nothing else. At every landing in the ladder the element
 *         holding focus must be one chip (so the ring's box is that chip's box), the chip the
 *         "Chip N of 7" label names, never the ladder or anything holding the open chip's panel.
 *         The walk is bounded and no stop may come round twice.
 * Does not: Model Steam's scroll-into-view (deckAnswerWalk.ts): every press here is claimed by an
 *           explicit move handler, so where the panel scrolls cannot change which element takes
 *           focus, and jsdom has no boxes to compare. "The box is the chip's" is checked as "the
 *           focused element is the chip itself and holds nothing but its label".
 */
import React from "react";
import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import type { ContextChip, TransparencySnapshot } from "../utils/inputTransparency";
import { registerNavFocus, resetNavFocusRegistry } from "../utils/navFocusRegistry";

/* Steam calls the move handlers of the element holding focus, so the walk needs each element's own. */
const hoisted = vi.hoisted(() => ({ propsByEl: new WeakMap<Element, Record<string, unknown>>() }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const RealFocusable = stubs.Focusable;
  const CapturingFocusable = React.forwardRef<HTMLDivElement, Record<string, unknown>>(
    function CapturingFocusable(props, ref) {
      const keep = (el: HTMLDivElement | null) => {
        if (el) hoisted.propsByEl.set(el, props);
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
      };
      return <RealFocusable {...props} ref={keep} />;
    }
  );
  return { ...stubs, Focusable: CapturingFocusable };
});

const LABELS = [
  "Keyword + meaning",
  "Reply style",
  "Thinking",
  "Spoiler risk",
  "Routed gemma4",
  "Game context",
  "Developer details",
];

function chip(label: string, i: number): ContextChip {
  return {
    id: `chip-${i}`,
    rank: i + 1,
    label,
    attached: true,
    tier_class: "",
    // Bodies of different lengths: the open chip's panel grows and shrinks as on the Deck.
    body: { title: label, paths: [], bullets: Array.from({ length: (i * 3) % 5 }, (_, n) => `${label} line ${n}`) },
  };
}

const SNAPSHOT = {
  route: "ollama",
  success: true,
  final_response: "Keep your distance and strafe.",
  context_chips: LABELS.map(chip),
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

/** The suggestion chip below the panel, reached only through Steam's own transfer. */
function suggestionChip(): HTMLElement {
  const button = document.createElement("button");
  button.className = "bonsai-preset-glass";
  button.textContent = "Check Steam players for bans";
  document.body.appendChild(button);
  registerNavFocus("preset-carousel", {
    current: {
      TakeFocus: () => {
        button.focus();
        return true;
      },
    },
  } as never);
  return button;
}

type Dir = "Up" | "Down";

/** One D-pad press, as Steam delivers it: the focused element's own handler, or nothing. */
async function press(dir: Dir): Promise<boolean> {
  const ring = document.activeElement;
  const handler = ring ? (hoisted.propsByEl.get(ring)?.[`onMove${dir}`] as (() => boolean) | undefined) : undefined;
  let claimed = false;
  await act(async () => {
    claimed = Boolean(handler?.());
  });
  return claimed;
}

function name(container: HTMLElement, el: Element | null, suggestion: HTMLElement): string {
  if (!el) return "nothing";
  if (el === suggestion) return "suggestion chip";
  if (el.classList.contains("bonsai-details-tabs-row")) return "tabs row";
  if (el.classList.contains("bonsai-chip-ladder-chip")) return `chip ${el.textContent}`;
  if (el.classList.contains("bonsai-chip-ladder")) return "the whole ladder";
  return container.contains(el) ? `other ${el.className}` : "outside";
}

/** Everything wrong with where the ring sits, if it is inside the ladder. */
function ladderLandingProblems(container: HTMLElement, ring: Element | null): string[] {
  const ladder = container.querySelector(".bonsai-chip-ladder");
  if (!ladder || !ring || !ladder.contains(ring)) return [];
  const problems: string[] = [];
  if (!ring.classList.contains("bonsai-chip-ladder-chip")) {
    return [`focus is on ${ring === ladder ? "the whole ladder" : ring.className}, not on a chip`];
  }
  if (ring.children.length > 0 || !LABELS.includes(ring.textContent ?? "")) {
    problems.push(`the focused chip holds more than its label: "${ring.textContent}"`);
  }
  const counter = /Chip (\d+) of 7/.exec(ladder.textContent ?? "");
  const named = counter ? LABELS[Number(counter[1]) - 1] : undefined;
  if (named !== ring.textContent) problems.push(`label names ${named}, ring on ${ring.textContent}`);
  if (!ring.classList.contains("bonsai-chip-ladder-chip--active")) problems.push("ring chip is not the open chip");
  return problems;
}

async function walk(container: HTMLElement, dir: Dir, suggestion: HTMLElement, limit = 14) {
  const stops = [name(container, document.activeElement, suggestion)];
  const problems: string[] = [];
  for (let i = 1; i <= limit; i += 1) {
    const before = document.activeElement;
    if (!(await press(dir))) {
      problems.push(`press ${i}: dead (${stops[stops.length - 1]})`);
      break;
    }
    const ring = document.activeElement;
    if (ring === before) problems.push(`press ${i}: the ring did not move`);
    const label = name(container, ring, suggestion);
    if (stops.includes(label)) problems.push(`press ${i}: ${label} visited twice`);
    stops.push(label);
    problems.push(...ladderLandingProblems(container, ring).map((p) => `press ${i}: ${p}`));
    if (ring === suggestion || label === "tabs row") break;
  }
  return { stops, problems };
}

beforeEach(() => {
  resetNavFocusRegistry();
});

afterEach(() => {
  resetNavFocusRegistry();
  document.body.innerHTML = "";
});

describe("Show details' chip ladder: the ring sits on one chip", () => {
  it("Down from the tabs row visits each chip once, the ring on that chip, then the suggestion chip", async () => {
    const { container } = renderTranscript();
    const suggestion = suggestionChip();
    fireEvent.click(container.querySelector('[aria-label="Show details"]')!);
    const tabs = container.querySelector<HTMLElement>(".bonsai-details-tabs-row")!;
    tabs.setAttribute("tabindex", "-1");
    tabs.focus();

    const down = await walk(container, "Down", suggestion);
    expect(down.problems).toEqual([]);
    expect(down.stops).toEqual(["tabs row", ...LABELS.map((l) => `chip ${l}`), "suggestion chip"]);
  });

  it("Up from the last chip visits each chip once on the way back to the tabs row", async () => {
    const { container } = renderTranscript();
    const suggestion = suggestionChip();
    fireEvent.click(container.querySelector('[aria-label="Show details"]')!);
    const tabs = container.querySelector<HTMLElement>(".bonsai-details-tabs-row")!;
    tabs.setAttribute("tabindex", "-1");
    tabs.focus();
    for (let i = 0; i < LABELS.length; i += 1) await press("Down");
    expect(name(container, document.activeElement, suggestion)).toBe(`chip ${LABELS[6]}`);

    const up = await walk(container, "Up", suggestion);
    expect(up.problems).toEqual([]);
    expect(up.stops).toEqual([...LABELS.map((l) => `chip ${l}`).reverse(), "tabs row"]);
  });

  it("focus handed to the ladder by name, as Up from below does, lands on the open chip", async () => {
    const { container } = renderTranscript();
    const suggestion = suggestionChip();
    fireEvent.click(container.querySelector('[aria-label="Show details"]')!);
    const ladder = container.querySelector<HTMLElement>(".bonsai-chip-ladder")!;
    ladder.setAttribute("tabindex", "-1");
    await act(async () => {
      ladder.focus();
    });
    expect(name(container, document.activeElement, suggestion)).toBe(`chip ${LABELS[0]}`);
    expect(ladderLandingProblems(container, document.activeElement)).toEqual([]);
  });
});
