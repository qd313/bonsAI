/**
 * Title: Show details on the newest answer: this answer's chips, then the dashed Session chip
 * Purpose: Pin plan 105's drawing (the density board, tab 1, round 2 option A, decided 2026-10-11): no "This answer /
 *          Session · N" tabs row any more; Session is the last chip, drawn dashed, and the ring on it opens its box,
 *          Sum up this chat and the chat's questions, in the chip box's place. Proves the walk in all four directions
 *          plus A and B through the real transcript, first entry and re-entry, and the summed-up note's A, which
 *          opens the panel with the Session chip open. Until plan 105 this file pinned the tabs row (plan 62 3c).
 * Used for: MainTabChatTranscript.tsx (buildDetailsPanelElement), ContextChipLadder.tsx (the Session chip),
 *           SessionContextStrip.tsx (its box), liveTurnFocusGraph.ts (Up from below), and the chip ladder's own B.
 * Solves: A jsdom test cannot prove Steam's own gamepad ring moves (AGENTS.md, "The Steam Deck focus graph") -- what
 *         it CAN prove, and what this file proves, is that the exact onMoveUp/onMoveDown/onMoveLeft/onMoveRight/
 *         onOKButton/onCancelButton props Steam invokes on device are wired to the right targets. The same walk with
 *         the panel's page out of focus is MainTabChatTranscript.detailsStripLostFocus.test.tsx; with Steam's scroll
 *         modelled, ContextChipLadder.sessionWalk.test.tsx.
 * Does not: Prove any of it on the device (row P105-DETAILS-CHIPS-01).
 */
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render } from "@testing-library/react";

import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import type { LastExchangeSnapshot } from "../../../types/backgroundAsk";
import type { ContextChip, TransparencySnapshot } from "../../../types/inputTransparency";
import type { AskThreadCollapsedTurn, ChatSummaryMark } from "../../../types/bonsaiUi";
import { focusBottomOfNewestReply } from "../../../shared/dpad/liveTurnFocusGraph";

const hoisted = vi.hoisted(() => ({
  focusableProps: [] as Array<Record<string, unknown>>,
  /* Steam calls the handlers of the element holding focus, so a press needs each element's own. */
  propsByEl: new WeakMap<Element, Record<string, unknown>>(),
}));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../../test-harness/fakeDeckyUi");
  const RealFocusable = stubs.Focusable;
  const CapturingFocusable = React.forwardRef<HTMLDivElement, Record<string, unknown>>(
    function CapturingFocusable(props, ref) {
      hoisted.focusableProps.push(props);
      const keep = (el: HTMLDivElement | null) => {
        if (el) hoisted.propsByEl.set(el, props);
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
      };
      return <RealFocusable {...props} ref={keep} />;
    }
  );
  return {
    ...stubs,
    Focusable: CapturingFocusable,
  };
});

/* Two of the answer's chips, as the back end sends them since plan 105: full label, short name, box title. */
const CHIPS: ContextChip[] = [
  {
    id: "game_context",
    rank: 1,
    label: "Game context",
    attached: true,
    tier_class: "",
    body: { title: "Game context", paths: [], bullets: ["Fought the exploders"] },
  },
  {
    id: "spoiler_risk",
    rank: 2,
    label: "Spoiler risk: low",
    short_label: "Spoilers: low",
    attached: true,
    tier_class: "",
    body: { title: "Spoiler likelihood estimate", paths: [], bullets: ["Estimated band: low"] },
  },
];
const FIRST = "Game context";
const LAST_ANSWER_CHIP = "Spoilers: low";
const SESSION = "Session · 1";

function snapshot(overrides: Partial<TransparencySnapshot> = {}): TransparencySnapshot {
  return {
    route: "ollama",
    raw_question: "how do i dodge the exploders",
    sanitizer_action: "none",
    sanitizer_reason_codes: [],
    text_after_sanitizer: "how do i dodge the exploders",
    ollama_model: "llama3:8b",
    system_prompt: null,
    user_text_for_model: null,
    user_image_count: 0,
    attachment_paths: [],
    assistant_raw: null,
    assistant_after_attachment_format: null,
    final_response: "Keep your distance and strafe.",
    applied: null,
    success: true,
    app_id: "",
    app_name: "",
    pc_ip: "",
    error_message: "",
    elapsed_seconds: 1.2,
    context_chips: CHIPS,
    ask_diagnostics: null,
    ...overrides,
  };
}

const LAST_EXCHANGE: LastExchangeSnapshot = {
  question: "how do i dodge the exploders",
  answer: "Keep your distance and strafe.",
};

function renderTranscript(overrides: Partial<MainTabChatTranscriptProps> = {}) {
  const props: MainTabChatTranscriptProps = {
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
    lastExchange: LAST_EXCHANGE,
    transparencySnapshot: snapshot(),
    ...overrides,
  };
  return render(<MainTabChatTranscript {...props} />);
}

function clickShowDetails(container: HTMLElement) {
  const toggle = container.querySelector('[aria-label="Show details"], [aria-label="Hide details"]');
  expect(toggle).not.toBeNull();
  fireEvent.click(toggle!);
}

/*
 * `hoisted.focusableProps` is append-only across every re-render within one test (only `beforeEach` clears it), so
 * `.findLast()`-style reading is what "call the handler Steam would invoke right now" means.
 */
function latestPropsFor(className: string): Record<string, unknown> | undefined {
  const matches = hoisted.focusableProps.filter((p) => p.className === className);
  return matches[matches.length - 1];
}

/* The Show details / Hide details line; its class carries a "--disabled" suffix while asking. */
function dividerProps(): Record<string, unknown> | undefined {
  const matches = hoisted.focusableProps.filter((p) =>
    String(p.className ?? "").startsWith("bonsai-chat-details-divider")
  );
  return matches[matches.length - 1];
}

/** The props Steam would call on the element holding the ring. */
function ringProps(): Record<string, unknown> | undefined {
  const ring = document.activeElement;
  return ring ? hoisted.propsByEl.get(ring) : undefined;
}

/** The answer's own chips and the Session chip, in drawn order, inside the panel's grid. */
function outerChips(container: HTMLElement): HTMLElement[] {
  const grid = container.querySelector(".bonsai-chip-ladder > .bonsai-chip-ladder-grid");
  return [...(grid?.children ?? [])] as HTMLElement[];
}
function chipNamed(container: HTMLElement, name: string): HTMLElement {
  const el = outerChips(container).find((c) => c.textContent === name);
  expect(el, `no chip "${name}"`).toBeTruthy();
  return el!;
}
/** The box of the answer's open chip, the panel's own (the Session box holds a box of its own further down). */
function answerChipBox(container: HTMLElement): HTMLElement | null {
  const panel = container.querySelector(".bonsai-chip-ladder");
  return ([...(panel?.children ?? [])] as HTMLElement[]).find((c) => c.classList.contains("bonsai-chip-body")) ?? null;
}
function openChipText(container: HTMLElement): string {
  return container.querySelector(".bonsai-chip-ladder > .bonsai-chip-ladder-grid > .bonsai-chip-ladder-chip--active")?.textContent ?? "";
}

/** Put the ring on a chip of the panel, as a landing from outside does. */
async function ringOnChip(container: HTMLElement, name: string) {
  const el = chipNamed(container, name);
  el.setAttribute("tabindex", "-1");
  await act(async () => {
    el.focus();
  });
}

/** One press on whatever holds the ring, the way Steam calls it, letting the ladder's hand-off run. */
async function press(key: "onMoveUp" | "onMoveDown" | "onMoveLeft" | "onMoveRight" | "onOKButton"): Promise<unknown> {
  const handler = ringProps()?.[key] as (() => unknown) | undefined;
  expect(handler, `the stop holding the ring has no ${key}`).toBeTypeOf("function");
  let out: unknown;
  await act(async () => {
    out = handler!();
  });
  return out;
}

/* An answer with a "From the notes" block under it; the answer names the note's subject (kbNoteUsedByAnswer.ts). */
const WITH_NOTES: Partial<MainTabChatTranscriptProps> = {
  ollamaResponse: "Keep your distance from the Glyphid Exploder and strafe.",
  lastExchange: {
    question: "how do i dodge the exploders",
    answer: "Keep your distance from the Glyphid Exploder and strafe.",
  },
  transparencySnapshot: snapshot({
    final_response: "Keep your distance from the Glyphid Exploder and strafe.",
    kb_attached_notes: [
      {
        name: "Glyphid Exploder",
        kind: "enemy",
        card: "Explodes on contact; shoot its glowing sac.",
        trust_tier: "wiki_verified",
        source_host: "deeprockgalactic.wiki.gg",
        source_license: "CC-BY-SA-3.0",
        domain: "strategy",
        game_title: "Deep Rock Galactic",
      },
    ],
  }),
};

beforeEach(() => {
  hoisted.focusableProps = [];
  hoisted.propsByEl = new WeakMap();
});

describe("Show details on the newest answer: this answer's chips, then the Session chip", () => {
  it("opens on the chips with a dashed Session · 1 chip last, the first chip open, and no tabs row", () => {
    const { container } = renderTranscript();
    clickShowDetails(container);

    expect(container.querySelector(".bonsai-details-tabs-row")).toBeNull();
    expect(container.textContent).not.toContain("This answer");
    expect(outerChips(container).map((c) => c.textContent)).toEqual([FIRST, LAST_ANSWER_CHIP, SESSION]);
    const session = chipNamed(container, SESSION);
    expect(session.classList.contains("bonsai-chip-ladder-chip--session")).toBe(true);
    expect(session.style.borderStyle).toBe("dashed");
    expect(openChipText(container)).toBe(FIRST);
    expect(answerChipBox(container)?.textContent).toContain("Fought the exploders");
    expect(container.querySelector(".bonsai-details-session-body")).toBeNull();
  });

  it("an older, hand-expanded turn has no Session chip: the bare chips, as before", () => {
    const olderTurn: AskThreadCollapsedTurn = { id: "older-1", question: "an older question", answer: "an older answer", transparency: snapshot() };
    const newestTurn: AskThreadCollapsedTurn = {
      id: "newest-1",
      question: "how do i dodge the exploders",
      answer: "Keep your distance and strafe.",
      transparency: snapshot(),
    };
    const { container } = renderTranscript({
      expandedTurnKey: "older-1",
      askThreadCollapsed: [olderTurn, newestTurn],
      transparencySnapshot: null,
      // No live turn: an empty display question and no lastExchange, or the pair collapses behind "N earlier".
      askThreadDisplayQuestion: "",
      lastExchange: null,
    });
    clickShowDetails(container);

    expect(outerChips(container).map((c) => c.textContent)).toEqual([FIRST, LAST_ANSWER_CHIP]);
    expect(container.querySelector(".bonsai-chip-ladder-chip--session")).toBeNull();
    expect(container.textContent).not.toContain("Session ·");
  });
});

describe("the walk through the chips and into the Session box", () => {
  it("Down from Hide details lands on the first chip, with no tabs row in between", async () => {
    const { container } = renderTranscript();
    clickShowDetails(container);
    const onMoveDown = dividerProps()?.onMoveDown as () => boolean;
    await act(async () => {
      expect(onMoveDown()).toBe(true);
    });
    expect(document.activeElement).toBe(chipNamed(container, FIRST));
  });

  /*
   * The device shape (plan 87 era, still true): the ladder's root carries no tabindex on the Deck, so a page search
   * by class that leans on focusDeckOwner finds nothing to focus. Only the by-name route may carry the press.
   */
  it("Down from Hide details reaches the chips by name, not by hunting for their class", async () => {
    const { container } = renderTranscript();
    clickShowDetails(container);
    const ladder = container.querySelector(".bonsai-chip-ladder") as HTMLElement;
    ladder.classList.remove("bonsai-chip-ladder");
    expect(container.querySelector(".bonsai-chip-ladder")).toBeNull();

    await act(async () => {
      expect((dividerProps()?.onMoveDown as () => boolean)()).toBe(true);
    });
    expect(ladder.contains(document.activeElement)).toBe(true);
  });

  it("with the panel shut, Down from Show details finds no chips", () => {
    const { container } = renderTranscript();
    act(() => {
      (dividerProps()?.onMoveDown as () => boolean)();
    });
    expect(container.querySelector(".bonsai-chip-ladder")).toBeNull();
  });

  it("Right walks every chip once, Session last, and the ring on Session draws its box in the chip box's place", async () => {
    const { container } = renderTranscript();
    clickShowDetails(container);
    await ringOnChip(container, FIRST);
    const seen = [document.activeElement?.textContent];
    for (let i = 0; i < 4 && document.activeElement?.textContent !== SESSION; i += 1) {
      expect(await press("onMoveRight")).toBe(true);
      expect(seen).not.toContain(document.activeElement?.textContent);
      seen.push(document.activeElement?.textContent);
      expect(openChipText(container), "the open box follows the ring").toBe(document.activeElement?.textContent);
    }
    expect(seen).toEqual([FIRST, LAST_ANSWER_CHIP, SESSION]);

    const box = container.querySelector(".bonsai-details-session-body") as HTMLElement;
    expect(box).not.toBeNull();
    expect(container.querySelector(".bonsai-chip-ladder")!.contains(box)).toBe(true);
    /* No answer chip's box beside it (the box holds its own question's chips and their box, further down). */
    expect(answerChipBox(container)).toBeNull();
    expect(box.textContent).toContain("Sum up this chat");
    expect(box.querySelector(".bonsai-details-session-row")?.textContent).toBe("how do i dodge the exploders");
  });

  it("Down on the Session chip puts the ring on Sum up this chat, and Up from Sum up brings it back to the Session chip", async () => {
    const { container } = renderTranscript();
    clickShowDetails(container);
    await ringOnChip(container, SESSION);
    expect(await press("onMoveDown")).toBe(true);
    const sumUp = container.querySelector(".bonsai-sumup-btn") as HTMLElement;
    expect(document.activeElement).toBe(sumUp);

    expect(await press("onMoveUp")).toBe(true);
    expect(document.activeElement).toBe(chipNamed(container, SESSION));
    expect(openChipText(container)).toBe(SESSION);
  });

  it("Right and A on the Session chip put the ring on Sum up this chat too", async () => {
    const { container } = renderTranscript();
    clickShowDetails(container);
    for (const key of ["onMoveRight", "onOKButton"] as const) {
      await ringOnChip(container, SESSION);
      expect(await press(key), key).toBe(true);
      expect(document.activeElement, key).toBe(container.querySelector(".bonsai-sumup-btn"));
    }
  });

  it("Left from the Session chip goes back to the last answer chip, and that chip's box comes back", async () => {
    const { container } = renderTranscript();
    clickShowDetails(container);
    await ringOnChip(container, SESSION);
    expect(await press("onMoveLeft")).toBe(true);
    expect(document.activeElement).toBe(chipNamed(container, LAST_ANSWER_CHIP));
    expect(container.querySelector(".bonsai-details-session-body")).toBeNull();
    expect(answerChipBox(container)?.textContent).toContain("Spoiler likelihood estimate");
  });

  it("Up from the first chip leaves for Hide details, with no tabs row in between", async () => {
    const { container } = renderTranscript();
    clickShowDetails(container);
    await ringOnChip(container, FIRST);
    expect(await press("onMoveUp")).toBe(true);
    expect(document.activeElement).toBe(container.querySelector('[aria-label="Hide details"]'));
  });
});

describe("B closes the whole panel from anywhere inside", () => {
  it("from the Session chip: consumes the press and returns focus to Show details", async () => {
    const { container } = renderTranscript();
    clickShowDetails(container);
    await ringOnChip(container, SESSION);
    let prevented = false;
    act(() => {
      (ringProps()?.onCancelButton as (e: unknown) => void)({ preventDefault: () => (prevented = true) });
    });
    expect(prevented).toBe(true);
    expect(container.querySelector(".bonsai-chip-ladder")).toBeNull();
    expect(document.activeElement).toBe(container.querySelector('[aria-label="Show details"]'));
  });

  it("from one of the answer's chips: also closes the whole panel, not just the chips", async () => {
    const { container } = renderTranscript();
    clickShowDetails(container);
    await ringOnChip(container, FIRST);
    act(() => {
      (ringProps()?.onCancelButton as (e: unknown) => void)({ preventDefault: () => {} });
    });
    expect(container.querySelector(".bonsai-chip-ladder")).toBeNull();
    expect(document.activeElement).toBe(container.querySelector('[aria-label="Show details"]'));
  });

  it("from inside the Session box: also closes the whole panel", async () => {
    const { container } = renderTranscript();
    clickShowDetails(container);
    await ringOnChip(container, SESSION);
    act(() => {
      (latestPropsFor("bonsai-details-session-body")?.onCancelButton as (e: unknown) => void)({ preventDefault: () => {} });
    });
    expect(container.querySelector(".bonsai-details-session-body")).toBeNull();
    expect(document.activeElement).toBe(container.querySelector('[aria-label="Show details"]'));
  });

  /*
   * Plan 74 lane 3, bug 1 (the "B on the notes block" entry, and the B-on-"Hide details" half of "Three D-pad slips
   * seen in the plan 68 Deck pass"; testing row PLAN72-F-UP). Neither stop had a B of its own, so B fell through to
   * Steam's back-out: the ring went to the tab bar and the panel stayed open.
   */
  it("from the notes block: closes the whole panel and returns focus to Show details", () => {
    const { container } = renderTranscript(WITH_NOTES);
    clickShowDetails(container);
    const notesBlock = container.querySelector(".bonsai-kb-notes-block") as HTMLElement;
    expect(notesBlock).not.toBeNull();
    notesBlock.focus();
    let prevented = false;
    act(() => {
      (latestPropsFor("bonsai-kb-notes-block")?.onCancelButton as (e: unknown) => void)({ preventDefault: () => (prevented = true) });
    });
    expect(prevented).toBe(true);
    expect(container.querySelector(".bonsai-chip-ladder")).toBeNull();
    expect(document.activeElement).toBe(container.querySelector('[aria-label="Show details"]'));
  });

  it("from the Hide details line itself: closes the whole panel and the ring stays on the line", () => {
    const { container } = renderTranscript();
    clickShowDetails(container);
    const divider = container.querySelector('[aria-label="Hide details"]') as HTMLElement;
    let prevented = false;
    act(() => {
      (dividerProps()?.onCancelButton as (e: unknown) => void)({ preventDefault: () => (prevented = true) });
    });
    expect(prevented).toBe(true);
    expect(container.querySelector(".bonsai-chip-ladder")).toBeNull();
    /* The very same node, not a rebuilt one: the ring sitting on it has nowhere to be lost to. */
    expect(divider.isConnected).toBe(true);
    expect(divider.getAttribute("aria-label")).toBe("Show details");
  });

  it("with the panel shut, neither the notes block nor Show details takes B -- it stays Steam's", () => {
    renderTranscript(WITH_NOTES);
    expect(latestPropsFor("bonsai-kb-notes-block")?.onCancelButton).toBeUndefined();
    expect(dividerProps()).toBeDefined();
    expect(dividerProps()?.onCancelButton).toBeUndefined();
  });
});

describe("coming back into the panel", () => {
  it("B then A with the Session chip open opens it again, and Down from Hide details lands on the Session chip", async () => {
    const { container } = renderTranscript();
    clickShowDetails(container);
    await ringOnChip(container, SESSION);
    act(() => {
      (ringProps()?.onCancelButton as (e: unknown) => void)({ preventDefault: () => {} });
    });
    clickShowDetails(container);
    expect(openChipText(container)).toBe(SESSION);
    expect(container.querySelector(".bonsai-details-session-body")).not.toBeNull();
    await act(async () => {
      expect((dividerProps()?.onMoveDown as () => boolean)()).toBe(true);
    });
    expect(document.activeElement).toBe(chipNamed(container, SESSION));
  });

  it("Up from below the chat lands on the Session box's last stop while it is open, else on the open chip", async () => {
    const { container } = renderTranscript();
    clickShowDetails(container);
    await ringOnChip(container, LAST_ANSWER_CHIP);
    (document.activeElement as HTMLElement).blur();
    await act(async () => {
      expect(focusBottomOfNewestReply()).toBe(true);
    });
    expect(document.activeElement).toBe(chipNamed(container, LAST_ANSWER_CHIP));

    await ringOnChip(container, SESSION);
    (document.activeElement as HTMLElement).blur();
    await act(async () => {
      expect(focusBottomOfNewestReply()).toBe(true);
    });
    /* The box's last stop: the open question's own chips, at the bottom of the Session box. */
    const boxChips = container.querySelector(".bonsai-details-session-body .bonsai-chip-ladder") as HTMLElement;
    expect(boxChips.contains(document.activeElement)).toBe(true);
    expect(document.activeElement?.classList.contains("bonsai-chip-ladder-chip")).toBe(true);
  });
});

/*
 * Plan 68: the note under the answer that came right after the chat summed itself up, and the warning line when
 * summing up failed. Both are read straight off the saved answer's own `chatSummary`, on an open archived turn.
 */
describe("the summed-up note and the warning line (plan 68)", () => {
  const summedTurn = (id: string, question: string, chatSummary?: ChatSummaryMark): AskThreadCollapsedTurn => ({
    id,
    question,
    answer: "Keep your distance and strafe.",
    transparency: snapshot(),
    ...(chatSummary ? { chatSummary } : {}),
  });
  const archivedOnly = {
    transparencySnapshot: null,
    askThreadDisplayQuestion: "",
    lastExchange: null,
  } as const;

  it("the newest answer's note is a D-pad stop with the drawn words", () => {
    const { container } = renderTranscript({
      ...archivedOnly,
      expandedTurnKey: "newest-1",
      askThreadCollapsed: [summedTurn("older-1", "an older question"), summedTurn("newest-1", "how do i dodge", "written")],
    });
    expect(container.textContent).toContain("The chat summed itself up before this answer. Press to read what it kept.");
    expect(latestPropsFor("bonsai-chat-summary-note")?.onOKButton).toBeTypeOf("function");
  });

  it("an older answer's note is plain text, not a stop", () => {
    const { container } = renderTranscript({
      ...archivedOnly,
      expandedTurnKey: "older-1",
      askThreadCollapsed: [summedTurn("older-1", "an older question", "written"), summedTurn("newest-1", "how do i dodge")],
    });
    expect(container.textContent).toContain("The chat summed itself up here.");
    expect(latestPropsFor("bonsai-chat-summary-note")).toBeUndefined();
  });

  it("A on the note opens Show details with the Session chip open and moves the ring to Sum up this chat", () => {
    vi.useFakeTimers();
    try {
      const { container } = renderTranscript({
        ...archivedOnly,
        expandedTurnKey: "newest-1",
        askThreadCollapsed: [summedTurn("newest-1", "how do i dodge", "written")],
      });
      expect(container.querySelector(".bonsai-details-session-body")).toBeNull();
      act(() => {
        (latestPropsFor("bonsai-chat-summary-note")?.onOKButton as () => void)();
      });
      expect(openChipText(container)).toBe(SESSION);
      const button = container.querySelector(".bonsai-sumup-btn");
      expect(button).not.toBeNull();
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(document.activeElement).toBe(button);
    } finally {
      vi.useRealTimers();
    }
  });

  it("a failed summary draws the warning line and no note", () => {
    const { container } = renderTranscript({
      ...archivedOnly,
      expandedTurnKey: "newest-1",
      askThreadCollapsed: [summedTurn("newest-1", "how do i dodge", "failed")],
    });
    expect(container.textContent).toContain(
      "Couldn't sum up the chat this time, so this answer only knows the newest turns. It will try again on your next question."
    );
    expect(container.textContent).not.toContain("summed itself up");
  });

  // Plan 103 lane B2: the line says why, in the words of the way the call ended.
  it.each([
    ["timed_out", "The AI took too long to sum up the chat"],
    ["no_room", "The chat was too long for the AI's room to sum it up"],
    ["unreachable", "The AI did not answer when the chat was summed up"],
    ["cut_off", "The AI stopped answering partway through summing up the chat"],
    ["model_error", "The AI ran into a problem while summing up the chat"],
    ["empty", "The AI sent back nothing when the chat was summed up"],
  ])("a summary that failed as %s says why on the line the player reads", (reason, start) => {
    const { container } = renderTranscript({
      ...archivedOnly,
      expandedTurnKey: "newest-1",
      askThreadCollapsed: [summedTurn("newest-1", "how do i dodge", `failed:${reason}`)],
    });
    expect(container.textContent).toContain(
      `${start}, so this answer only knows the newest turns. It will try again on your next question.`
    );
    expect(container.textContent).not.toContain("Couldn't sum up");
  });

  it("a failure reason the screen has no sentence for keeps the older line", () => {
    const { container } = renderTranscript({
      ...archivedOnly,
      expandedTurnKey: "newest-1",
      askThreadCollapsed: [summedTurn("newest-1", "how do i dodge", "failed:something_new")],
    });
    expect(container.textContent).toContain("Couldn't sum up the chat this time, so this answer only knows");
  });

  it("an ordinary answer has neither", () => {
    const { container } = renderTranscript({
      ...archivedOnly,
      expandedTurnKey: "newest-1",
      askThreadCollapsed: [summedTurn("newest-1", "how do i dodge")],
    });
    expect(container.textContent).not.toContain("summed itself up");
    expect(container.textContent).not.toContain("Couldn't sum up");
  });
});
