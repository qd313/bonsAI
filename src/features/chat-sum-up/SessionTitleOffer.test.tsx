/**
 * Title: The summary card offers a fresher chat title, and the D-pad can reach and answer it
 * Purpose: Pin plan 79 helper H's screen half at the level the Deck check looks at: the real summary
 *          card with a stored suggestion shows the offer; Rename hands the suggestion to the rename
 *          path; Keep closes the offer without renaming; a summary with no suggestion (which is also
 *          what a chat renamed by hand always has) shows nothing; and the two new buttons can be
 *          reached and left with the move handlers Steam calls, each stop visited once.
 * Used for: SessionSumUpSection.tsx and SessionTitleOffer.tsx.
 * Does not: Prove the ring on the Deck. jsdom has no layout and no Steam ring; the move handlers are
 *           called the way Steam calls them, and the hops between siblings are plain focus() calls,
 *           which is what the section does between its own stops.
 */
import React from "react";
import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SessionSumUpSection } from "./SessionSumUpSection";
import type { ChatSumUpState } from "./chatSumUpModel";
import { resetUiDocument } from "../../utils/uiDocument";

/* Every Focusable's latest props, by aria-label: how the tests press what Steam would press. */
const seen = vi.hoisted(() => ({ props: new Map<string, Record<string, unknown>>() }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const Real = stubs.Focusable;
  const Capturing = React.forwardRef<HTMLDivElement, Record<string, unknown>>(function Capturing(props, ref) {
    const label = props["aria-label"];
    if (typeof label === "string") seen.props.set(label, props);
    return <Real {...props} ref={ref} />;
  });
  return { ...stubs, Focusable: Capturing };
});

const SUMMARY = {
  text: "- Playing Half-Life 2\n- Stuck on the helicopter",
  covers_through_turn_id: "t4",
  turns_covered: 4,
  oldest_turns_unread: 0,
  hidden_notes_left_out: 0,
  written_at: new Date().toISOString(),
  seconds: 12,
  model: "test",
};

function stateWith(over: Partial<ChatSumUpState>): ChatSumUpState {
  return {
    summary: { ...SUMMARY, suggested_title: "Half-Life 2 weapons" },
    canSumUp: true,
    questionsAfterSummary: 0,
    summingUp: false,
    summingUpSeconds: null,
    otherJobRunning: false,
    startSumUp: () => {},
    stopSumUp: () => {},
    renameToSuggestedTitle: vi.fn(),
    keepTitle: vi.fn(),
    ...over,
  };
}

function section(state: ChatSumUpState, past: () => boolean = () => false): React.ReactElement {
  return (
    <SessionSumUpSection state={state} answerInFlight={false} onMoveUpFromButton={() => true} onMoveDownPastSection={past} />
  );
}

const RENAME = "Rename: Rename this chat to “Half-Life 2 weapons”?";
const KEEP = "Keep: leave the title as it is";
const CARD = "What the AI remembers";
const BUTTON = "Sum up again";

function el(container: HTMLElement, label: string): HTMLElement {
  return container.querySelector(`[aria-label="${label}"]`) as HTMLElement;
}

/** The ring starts on a stop: Decky stamps tabindex on the things it navigates, jsdom needs it too. */
function startOn(container: HTMLElement, label: string): void {
  const stop = el(container, label);
  stop.setAttribute("tabindex", "0");
  act(() => stop.focus());
}

/** Steam calls the move handler of the stop that holds the ring. */
function press(label: string, direction: "onMoveUp" | "onMoveDown" | "onMoveLeft" | "onMoveRight"): boolean {
  let handled = false;
  act(() => {
    handled = (seen.props.get(label)?.[direction] as () => boolean)();
  });
  return handled;
}

beforeEach(() => {
  seen.props.clear();
  resetUiDocument();
});
afterEach(() => {
  document.body.innerHTML = "";
});

describe("the title offer on the summary card", () => {
  it("shows one quiet question with Rename and Keep when the summary holds a suggestion", () => {
    const { container } = render(section(stateWith({})));
    expect(container.querySelector(".bonsai-sumup-offer-question")?.textContent).toBe(
      "Rename this chat to “Half-Life 2 weapons”?",
    );
    expect(el(container, RENAME).textContent).toBe("Rename");
    expect(el(container, KEEP).textContent).toBe("Keep");
  });

  it("shows nothing extra when the summary holds no suggestion (title still fits, or typed by hand)", () => {
    const { container } = render(section(stateWith({ summary: { ...SUMMARY } })));
    expect(container.querySelector(".bonsai-sumup-offer")).toBeNull();
    expect(container.querySelector(".bonsai-sumup-card--offered")).toBeNull();
    expect(el(container, CARD)).not.toBeNull();
  });

  it("no card and no offer before the first summary", () => {
    const { container } = render(section(stateWith({ summary: null })));
    expect(container.querySelector(".bonsai-sumup-offer")).toBeNull();
  });

  it("Rename hands the suggested title to the rename path and does not Keep", () => {
    const state = stateWith({});
    const { container } = render(section(state));
    fireEvent.click(el(container, RENAME));
    expect(state.renameToSuggestedTitle).toHaveBeenCalledWith("Half-Life 2 weapons");
    expect(state.keepTitle).not.toHaveBeenCalled();
  });

  it("A on Rename (Steam's activate) does the same as a click", () => {
    const state = stateWith({});
    render(section(state));
    act(() => {
      (seen.props.get(RENAME)?.onOKButton as () => void)();
    });
    expect(state.renameToSuggestedTitle).toHaveBeenCalledWith("Half-Life 2 weapons");
  });

  it("Keep closes the offer without renaming", () => {
    const state = stateWith({});
    const { container } = render(section(state));
    fireEvent.click(el(container, KEEP));
    expect(state.keepTitle).toHaveBeenCalledTimes(1);
    expect(state.renameToSuggestedTitle).not.toHaveBeenCalled();
  });

  it("the offer is gone once the reloaded summary no longer holds a suggestion", () => {
    const state = stateWith({});
    const { container, rerender } = render(section(state));
    expect(container.querySelector(".bonsai-sumup-offer")).not.toBeNull();
    rerender(section({ ...state, summary: { ...SUMMARY } }));
    expect(container.querySelector(".bonsai-sumup-offer")).toBeNull();
  });
});

describe("walking the Sum up section with the D-pad when an offer shows", () => {
  /*
   * button -> Down -> card -> Down -> Rename -> Right -> Keep -> Down -> out of the section.
   * Each stop is visited once going down and once coming back up; Left at Rename and Right at Keep
   * are claimed (true) so Steam's past-the-edge move cannot hand the ring out of the plugin.
   */
  it("goes down through the card to Rename and Keep, then leaves, visiting no stop twice", () => {
    const past = vi.fn(() => true);
    const { container } = render(section(stateWith({}), past));
    const visited: string[] = [];
    const ring = () => document.activeElement?.getAttribute("aria-label") ?? "";
    startOn(container, BUTTON);
    visited.push(ring());
    expect(press(BUTTON, "onMoveDown")).toBe(true);
    visited.push(ring());
    expect(press(CARD, "onMoveDown")).toBe(true);
    visited.push(ring());
    expect(press(RENAME, "onMoveRight")).toBe(true);
    visited.push(ring());
    expect(visited).toEqual([BUTTON, CARD, RENAME, KEEP]);
    expect(new Set(visited).size).toBe(visited.length);
    expect(past).not.toHaveBeenCalled();
    expect(press(KEEP, "onMoveDown")).toBe(true);
    expect(past).toHaveBeenCalledTimes(1);
  });

  it("goes back up: Keep -> Left -> Rename -> Up -> card -> Up -> button; the edges are claimed", () => {
    const { container } = render(section(stateWith({})));
    const ring = () => document.activeElement?.getAttribute("aria-label") ?? "";
    startOn(container, KEEP);
    expect(press(KEEP, "onMoveRight")).toBe(true);
    expect(ring()).toBe(KEEP);
    expect(press(KEEP, "onMoveLeft")).toBe(true);
    expect(ring()).toBe(RENAME);
    expect(press(RENAME, "onMoveLeft")).toBe(true);
    expect(ring()).toBe(RENAME);
    expect(press(RENAME, "onMoveUp")).toBe(true);
    expect(ring()).toBe(CARD);
    expect(press(CARD, "onMoveUp")).toBe(true);
    expect(ring()).toBe(BUTTON);
  });

  it("with no offer the card's Down still leaves the section as before", () => {
    const past = vi.fn(() => true);
    render(section(stateWith({ summary: { ...SUMMARY } }), past));
    expect(press(CARD, "onMoveDown")).toBe(true);
    expect(past).toHaveBeenCalledTimes(1);
  });
});
