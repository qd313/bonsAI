/**
 * Title: Up from the summary card lands on a "Sum up again" that shows, with the page focused and without
 *
 * Purpose: Pin P104-M11 at the level the Deck check reads it: with the card shown whole at the pane's top on the
 *          Deck's own screen (pane 52 to 454, dock 351), Up from the card's top puts the ring on "Sum up again" and
 *          the button is on screen, not 15.5 points above the pane where the card's top-of-pane place leaves it.
 *          Steam's glide is left out on purpose: the button used to rely on it alone. With the panel's page focused,
 *          the plugin's own hop lands and the button brings its own top back at once. Without the focus (plan 97's
 *          state, lostFocusPanel.tsx) the hop is declined and Steam's own move carries the ring, with no focus event
 *          on the Deck; the button's settle passes, run while the ring sits on it, bring it back then.
 * Used for: SessionSumUpSection.tsx (focusSumUpButton, topBackUnderPane).
 * Does not: model Steam's glide (SessionSumUpSection.cardFit.test.tsx walks the same Up under every glide rule) or
 *           Steam's spatial step: the declined press is handed the button, the stop above the card. jsdom still
 *           fires focus events while the page lacks focus, which the Deck does not; the fix does not listen for them.
 *           Boxes follow the pane's scroll from the card's measured place (plan104-P104-M-SESSION-CARD.json: top at
 *           content 783) and plan 81's measured gaps above it; the card is the 246.5-point fitted card.
 */
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const fake = await import("../../../test-harness/fakeDeckyUi");
  const { withPanelNav } = await import("../../../test-harness/lostFocusPanel");
  return { ...fake, Focusable: withPanelNav(fake.Focusable) };
});

import { SessionSumUpSection } from "./SessionSumUpSection";
import type { ChatSumUpState } from "./chatSumUpModel";
import { mountPanelPage, type PanelPage } from "../../../test-harness/lostFocusPanel";

/** The Deck's own screen with Show details open (plan103-P103-DETAILS-STRIP-01-try2.json). */
const PANE_TOP = 52;
const PANE_BOTTOM = 454;
const DOCK_TOP = 351;
/** Down the pane's content: the button and its reason line keep plan 81's gaps above the card's top (783). */
const CONTENT = { button: [707.5, 740.2], reason: [745.4, 777.4], card: [783, 783 + 246.5] } as const;

let page: PanelPage;

beforeEach(() => {
  vi.useFakeTimers();
  page = mountPanelPage();
});

afterEach(() => {
  page.remove();
  vi.useRealTimers();
});

/** The Session tab with the long chat's summary, on the Deck's own screen, the ring on the card shown at the top. */
function cardAtTheTop() {
  const doc = page.doc;
  const pane = doc.createElement("div");
  pane.className = "_TabContentsScroll";
  const scrollMax = 3198 - (PANE_BOTTOM - PANE_TOP);
  let at = 0;
  Object.defineProperty(pane, "scrollTop", { configurable: true, get: () => at, set: (v: number) => void (at = Math.max(0, Math.min(scrollMax, v))) });
  Object.defineProperty(pane, "scrollHeight", { value: 3198, configurable: true });
  Object.defineProperty(pane, "clientHeight", { value: PANE_BOTTOM - PANE_TOP, configurable: true });
  pane.getBoundingClientRect = () => ({ top: PANE_TOP, bottom: PANE_BOTTOM }) as DOMRect;
  const scope = doc.createElement("div");
  scope.className = "bonsai-scope";
  const dock = doc.createElement("div");
  dock.className = "bonsai-main-tab-dock";
  dock.getBoundingClientRect = () => ({ top: DOCK_TOP, bottom: PANE_BOTTOM }) as DOMRect;
  pane.append(scope, dock);
  doc.body.appendChild(pane);

  const state: ChatSumUpState = {
    summary: {
      text: "- Hollow Knight: charms explained\n- Brotato: surviving wave 18",
      covers_through_turn_id: "t26",
      turns_covered: 26,
      oldest_turns_unread: 0,
      hidden_notes_left_out: 0,
      written_at: new Date().toISOString(),
      seconds: 30,
      model: "test",
    },
    canSumUp: false,
    questionsAfterSummary: 0,
    summingUp: false,
    summingUpSeconds: null,
    otherJobRunning: false,
    startSumUp: () => {},
    stopSumUp: () => {},
  };
  const { container } = render(
    <SessionSumUpSection state={state} answerInFlight={false} onMoveUpFromButton={() => true} onMoveDownPastSection={() => false} />,
    { container: scope },
  );
  const q = (sel: string) => container.querySelector<HTMLElement>(sel)!;
  const place = (el: HTMLElement, [top, bottom]: readonly [number, number]) => {
    el.getBoundingClientRect = () => ({ top: top - pane.scrollTop + PANE_TOP, bottom: bottom - pane.scrollTop + PANE_TOP }) as DOMRect;
  };
  const button = q(".bonsai-sumup-btn");
  const card = q(".bonsai-sumup-card");
  place(button, CONTENT.button);
  place(q(".bonsai-sumup-reason"), CONTENT.reason);
  place(card, CONTENT.card);
  // Where Up out of the card's text leaves it: whole, 8 under the pane's top (60 to 306.5).
  pane.scrollTop = CONTENT.card[0] - (PANE_TOP + 8) + PANE_TOP;
  page.steamMove(card);
  act(() => void vi.runAllTimers());
  const box = (el: HTMLElement) => el.getBoundingClientRect();
  expect(box(card).top).toBe(60);
  expect(box(button).top).toBeCloseTo(-15.5, 5);
  return { button, card, box };
}

describe("Up from the summary card onto Sum up again, on the Deck's own screen, with no glide from Steam", () => {
  it("with the panel's page focused: the plugin's hop lands and the button shows whole", () => {
    const { button, box } = cardAtTheTop();
    act(() => void expect(page.press("onMoveUp")).toBe("claimed"));
    act(() => void vi.runAllTimers());
    expect(page.ring()).toBe(button);
    expect(page.active()).toBe(button);
    expect(box(button).top, `the button at ${box(button).top}`).toBeGreaterThanOrEqual(PANE_TOP);
    expect(box(button).bottom).toBeLessThanOrEqual(DOCK_TOP);
  });

  it("with the page out of the browser's focus: Steam's own move carries the ring, and the button still shows whole", () => {
    const { button, card, box } = cardAtTheTop();
    page.setFocused(false);
    act(() => void expect(page.press("onMoveUp", (from) => (from === card ? button : null))).toBe("declined"));
    act(() => void vi.runAllTimers());
    expect(page.ring()).toBe(button);
    expect(page.active()).toBe(button);
    expect(box(button).top, `the button at ${box(button).top}`).toBeGreaterThanOrEqual(PANE_TOP);
    expect(box(button).bottom).toBeLessThanOrEqual(DOCK_TOP);
  });
});
