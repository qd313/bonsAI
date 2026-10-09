/**
 * Title: Up and Down between the rating choices and the speaker, on the real row
 * Purpose: Pin plan 79's "Up and Down between the rating choices and the speaker button go to the
 *          wrong place". Measured on the Deck (docs/test-evidence/plan79-P79-M7-RATING-ROW.json):
 *          under a reply rated "Not really", Up from "Bad info" landed on the speaker instead of
 *          "Helpful", Down from the speaker landed on whichever choice was left last, and Up from
 *          any choice never reached "Helpful" or "Not really" at all. The maintainer's rule: the
 *          plain geometry of the drawn rows.
 * Used for: MainTabChatTranscript.tsx and buildReplyActionsElement.tsx together, the real row.
 * Solves: Nothing in the older walk tests (MainTabChatTranscript.upWalk.test.tsx) pressed anything
 *         between the thumbs row and the choices below it except the greyed-thumbs skip, which is
 *         the very behaviour this bug is about.
 * Does not: Model Steam's scroll. Every hop tested here is a handler's own answer (the row names
 *           the button it wants and asks Steam's transfer for it), so no landing depends on where
 *           the page happens to be scrolled. Steam's own sideways step between siblings is modelled
 *           by `sideways()` below, and Steam's own Down from one choice row to the next by hand.
 *           A greyed button takes the ring on the Deck (replyStopRegistry.ts), so the Button stub
 *           here marks it aria-disabled rather than the native attribute that would refuse focus.
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";

import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";
import type { TransparencySnapshot } from "../utils/inputTransparency";
import { resetUiDocument } from "../utils/uiDocument";

type Dir = "onMoveUp" | "onMoveDown" | "onMoveLeft" | "onMoveRight";
type NavEl = HTMLElement & { __nav?: Partial<Record<Dir, () => unknown>> };

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const Base = stubs.Focusable;
  const BaseButton = stubs.Button as React.ComponentType<Record<string, unknown>>;
  /* Keeps the four move handlers on the element and fills `navRef` the way Steam does. */
  const NavFocusable = React.forwardRef<HTMLDivElement, Record<string, unknown>>(
    function NavFocusable(props, ref) {
      const { onMoveUp, onMoveDown, onMoveLeft, onMoveRight, navRef, ...rest } = props as Record<string, unknown> & {
        navRef?: { current: unknown };
      };
      const setRef = (el: HTMLDivElement | null) => {
        if (el) {
          (el as NavEl).__nav = {
            onMoveUp: onMoveUp as () => unknown,
            onMoveDown: onMoveDown as () => unknown,
            onMoveLeft: onMoveLeft as () => unknown,
            onMoveRight: onMoveRight as () => unknown,
          };
          if (navRef) {
            navRef.current = {
              TakeFocus: () => {
                const first = el.querySelector<HTMLElement>("button, [tabindex]");
                (first ?? el).focus();
                return true;
              },
            };
          }
        }
        if (typeof ref === "function") ref(el);
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
      };
      return <Base {...rest} ref={setRef} />;
    },
  );
  /* A greyed button still takes the ring on the Deck (measured 2026-09-16), unlike a native one. */
  const DeckButton = React.forwardRef<HTMLButtonElement, Record<string, unknown>>(function DeckButton(
    { disabled, ...rest },
    ref,
  ) {
    return <BaseButton {...rest} aria-disabled={disabled ? true : undefined} ref={ref} />;
  });
  return { ...stubs, Focusable: NavFocusable, Button: DeckButton };
});

const QUESTION = "what is a good first upgrade in Hollow Knight";
const ANSWER = ["Get the Nail upgrades first.", "Then Pale Ore for the next one."].join("\n\n");

function snapshot(): TransparencySnapshot {
  return {
    route: "ollama",
    raw_question: QUESTION,
    sanitizer_action: "none",
    sanitizer_reason_codes: [],
    text_after_sanitizer: QUESTION,
    ollama_model: "llama3:8b",
    system_prompt: null,
    user_text_for_model: null,
    user_image_count: 0,
    attachment_paths: [],
    assistant_raw: null,
    assistant_after_attachment_format: null,
    final_response: ANSWER,
    applied: null,
    success: true,
    app_id: "",
    app_name: "",
    pc_ip: "",
    error_message: "",
    elapsed_seconds: 1.2,
    context_chips: [],
    ask_diagnostics: null,
  } as TransparencySnapshot;
}

const TURN: AskThreadCollapsedTurn = {
  id: "turn-newest",
  question: QUESTION,
  answer: ANSWER,
  transparency: snapshot(),
};

function renderTurn(overrides: Partial<MainTabChatTranscriptProps> = {}) {
  const props: MainTabChatTranscriptProps = {
    fullBleedRowStyle: {},
    isAsking: false,
    selectedAttachment: null,
    ollamaContext: {} as MainTabChatTranscriptProps["ollamaContext"],
    unifiedInput: "",
    showSlowWarning: false,
    latencyWarningSeconds: 30,
    ollamaResponse: "",
    elapsedSeconds: null,
    lastApplied: null,
    canSaveDesktopNote: false,
    onOpenDesktopNoteSave: () => {},
    askMode: "strategy",
    askThreadCollapsed: [TURN],
    expandedTurnKey: TURN.id,
    askThreadDisplayQuestion: "",
    lastExchange: { question: QUESTION, answer: ANSWER },
    transparencySnapshot: snapshot(),
    liveReplyFeedbackRating: "down",
    onReplyFeedback: () => {},
    onReplyMicroAction: () => {},
    strategyGuideBranches: null,
    onAskOllama: async () => {},
    ...overrides,
  };
  const out = render(<MainTabChatTranscript {...props} />);
  out.container
    .querySelectorAll<HTMLElement>('[data-decky-ui="Focusable"]')
    .forEach((el) => el.setAttribute("tabindex", "0"));
  return out;
}

/** One press, the way Steam runs it: the focused element's handler, then each container's, until one claims it. */
function press(dir: Dir): boolean {
  let el = document.activeElement as NavEl | null;
  let handled = false;
  act(() => {
    while (el) {
      const h = el.__nav?.[dir];
      if (h && h() === true) {
        handled = true;
        return;
      }
      el = el.parentElement as NavEl | null;
    }
  });
  return handled;
}

/** Steam's own step to the next or previous sibling in the horizontal row, for a press no handler claimed. */
function sideways(dir: "onMoveLeft" | "onMoveRight"): void {
  const active = document.activeElement as HTMLElement;
  const row = active.closest<HTMLElement>('[flow-children="horizontal"]');
  const buttons = Array.from(row?.querySelectorAll<HTMLElement>("button") ?? []);
  const next = buttons[buttons.indexOf(active) + (dir === "onMoveRight" ? 1 : -1)];
  if (next) act(() => next.focus());
}

/** A Left/Right press: a handler's own answer if one claims it, otherwise Steam's sibling step. */
function pressSideways(dir: "onMoveLeft" | "onMoveRight"): void {
  if (!press(dir)) sideways(dir);
}

function byLabel(container: HTMLElement, label: string): HTMLElement {
  const el = container.querySelector<HTMLElement>(`[aria-label="${label}"]`);
  if (!el) throw new Error(`no element labelled ${label}`);
  return el;
}

function focusOn(el: HTMLElement): void {
  act(() => el.focus());
  expect(document.activeElement).toBe(el);
}

const STOP_LABELS = [
  "Mark reply helpful",
  "Mark reply not helpful",
  "Read aloud",
  "Copy reply text",
  "Bad info",
  "Wrong game or topic",
  "Spoiled it",
  "Too long",
  "Too short",
  "Show details",
];

/** Which of the row's stops holds the ring, by its label. */
function where(): string {
  const active = document.activeElement as HTMLElement;
  const label = active.getAttribute("aria-label") ?? "";
  return STOP_LABELS.includes(label) ? label : `(somewhere else: ${label || active.className})`;
}

describe("Up and Down between the rating choices, the thumbs and the corner icons (plan 79, plan 84 step 3)", () => {
  beforeEach(() => resetUiDocument());
  afterEach(() => cleanup());

  it("Up from the first choice row lands on the thumb drawn above it, not on the speaker", () => {
    const { container } = renderTurn();
    focusOn(byLabel(container, "Bad info"));
    expect(press("onMoveUp")).toBe(true);
    expect(where()).toBe("Mark reply helpful");

    focusOn(byLabel(container, "Wrong game or topic"));
    expect(press("onMoveUp")).toBe(true);
    expect(where()).toBe("Mark reply not helpful");
  });

  it("Up from the second choice row lands on the choice above it", () => {
    const { container } = renderTurn();
    focusOn(byLabel(container, "Spoiled it"));
    expect(press("onMoveUp")).toBe(true);
    expect(where()).toBe("Bad info");
    focusOn(byLabel(container, "Too long"));
    expect(press("onMoveUp")).toBe(true);
    expect(where()).toBe("Wrong game or topic");
    focusOn(byLabel(container, "Too short"));
    expect(press("onMoveUp")).toBe(true);
    expect(where()).toBe("Wrong game or topic");
  });

  it("Down from each thumb lands on the choice under it", () => {
    const { container } = renderTurn();
    focusOn(byLabel(container, "Mark reply helpful"));
    expect(press("onMoveDown")).toBe(true);
    expect(where()).toBe("Bad info");

    focusOn(byLabel(container, "Mark reply not helpful"));
    expect(press("onMoveDown")).toBe(true);
    expect(where()).toBe("Wrong game or topic");
  });

  /*
   * Plan 84 step 3: the speaker is in the answer's corner now, so a Down from it (or from Copy) has to
   * land on the rows under the answer. With the reply rated down the thumbs are greyed and skipped, and
   * the first choice is the next stop -- stepping over the whole block to Show details would leave the
   * choices unreachable from above.
   */
  it("Down from either corner icon lands on the first choice, whichever choice was left last", () => {
    const { container } = renderTurn();
    for (const lastLeft of ["Bad info", "Wrong game or topic", "Spoiled it", "Too short"]) {
      for (const icon of ["Read aloud", "Copy reply text"]) {
        focusOn(byLabel(container, lastLeft));
        focusOn(byLabel(container, icon));
        expect(press("onMoveDown")).toBe(true);
        expect(where()).toBe("Bad info");
      }
    }
  });

  it("Right from Not really goes nowhere (no speaker beside it any more) and Left is Helpful", () => {
    const { container } = renderTurn();
    focusOn(byLabel(container, "Mark reply not helpful"));
    pressSideways("onMoveRight");
    expect(where()).toBe("Mark reply not helpful");
    pressSideways("onMoveLeft");
    expect(where()).toBe("Mark reply helpful");
  });

  /*
   * Up from Show details through every stop into the thumbs, then Down from Helpful back to Show
   * details: each stop once on the way up, each once on the way down, Steam's own Down between the
   * two choice rows stepped by hand (the Deck's table: Bad info, Down, Spoiled it).
   */
  it("walks Up from Show details to Helpful, and Down again, visiting no stop twice", () => {
    const { container } = renderTurn();
    const up: string[] = [];
    focusOn(byLabel(container, "Show details"));
    up.push(where());
    for (let i = 0; i < 6; i++) {
      if (!press("onMoveUp")) break;
      up.push(where());
      if (where() === "Mark reply helpful") break;
    }
    expect(up).toEqual(["Show details", "Spoiled it", "Bad info", "Mark reply helpful"]);
    expect(new Set(up).size).toBe(up.length);

    /* Down: Helpful's own hop to Bad info, then Steam's own two steps (the Deck's table: Bad info
       Down is Spoiled it, Spoiled it Down is Show details), which no handler of ours claims. */
    const down: string[] = [where()];
    expect(press("onMoveDown")).toBe(true);
    down.push(where());
    expect(press("onMoveDown")).toBe(false);
    focusOn(byLabel(container, "Spoiled it"));
    down.push(where());
    expect(press("onMoveDown")).toBe(false);
    focusOn(byLabel(container, "Show details"));
    down.push(where());
    expect(down).toEqual(["Mark reply helpful", "Bad info", "Spoiled it", "Show details"]);
    expect(new Set(down).size).toBe(down.length);
  });

  it("walks the corner: the speaker, Copy, Down to Bad info, Up to Helpful -- no stop twice", () => {
    const { container } = renderTurn();
    const seen: string[] = [];
    focusOn(byLabel(container, "Read aloud"));
    seen.push(where());
    expect(press("onMoveRight")).toBe(true);
    seen.push(where());
    expect(press("onMoveDown")).toBe(true);
    seen.push(where());
    expect(press("onMoveUp")).toBe(true);
    seen.push(where());
    expect(seen).toEqual(["Read aloud", "Copy reply text", "Bad info", "Mark reply helpful"]);
    expect(new Set(seen).size).toBe(seen.length);
  });

  /*
   * Plan 84 step 3 follow-up: a newest answer with a summed-up note, rated "Not really". Down from the
   * note used to reach the speaker in the thumbs row; with the speaker in the corner it has to land on
   * the first choice, not step over the whole block to Show details.
   */
  it("Down from the summed-up note lands on the first choice, not Show details", () => {
    const { container } = renderTurn({
      askThreadCollapsed: [{ ...TURN, chatSummary: "written" }],
    });
    const note = container.querySelector<HTMLElement>(".bonsai-chat-summary-note");
    expect(note).not.toBeNull();
    focusOn(note!);
    expect(press("onMoveDown")).toBe(true);
    expect(where()).toBe("Bad info");
  });

  it("with the choices not showing, the routes are today's: Down from Helpful goes to Show details", () => {
    const { container } = renderTurn({ liveReplyFeedbackRating: null });
    focusOn(byLabel(container, "Mark reply helpful"));
    expect(press("onMoveDown")).toBe(true);
    expect(where()).toBe("Show details");
    expect(press("onMoveUp")).toBe(true);
    expect(where()).toBe("Mark reply helpful");
  });
});
