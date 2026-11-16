/**
 * Title: The "What the AI remembers" card fits above the dock, and Down and Up read its text
 *
 * Purpose: Pin the fix for "the Session tab's What the AI remembers card is taller than the screen" at the level the
 *          Deck check reads it (P104-SESSION-CARD-01): with the long test chat's summary showing, the whole card is
 *          above the dock, Down reads its text to the end and then moves on to Rename, and Up reads it back to its top
 *          and then moves on to Sum up again. Block D0 measured the card on 2026-11-15
 *          (workshop:test-evidence/plan104-P104-M-SESSION-CARD.json, external screen): 669 points tall in a 610-point
 *          band, its last 51 points of text behind the dock, and the next Down left it for Rename.
 *          Two halves. First the card's height as arithmetic, every number read back out of the built stylesheet (the
 *          plan 84 lesson in docs/lessons-learned.md), for both screens, at every Text size, with its title line on one
 *          line or two. Then a walk on both screens in their measured numbers: Steam's glide after every landing under
 *          each of deckAnswerWalk.ts's rules (and none), then the plugin's own lift off the dock, bounded, no stop twice.
 * Used for: SessionSumUpSection.tsx (the card, its scrolling text and its Down and Up) and the card's rules in
 *           styles/sections/section-6.ts.
 * Does not: lay anything out. jsdom draws nothing, so the card's text has the height D0 measured (its 669 less the
 *           card's frame and title line), every box follows the pane's scrollTop, and the card's own height is the
 *           arithmetic below. It does not model the page losing the window's focus (the card's moves are the ones
 *           this section always made). Whether the title line really wraps, and how scrolled text looks, are the
 *           Deck check's.
 */
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const fake = await import("../../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../../test-harness/steamRing");
  return { ...fake, Focusable: SteamRingFocusable };
});

import { SessionSumUpSection } from "./SessionSumUpSection";
import type { ChatSumUpState } from "./chatSumUpModel";
import { buildBonsaiScopeStylesheet } from "../../../styles/bonsaiScopeStylesheet";
import { TEXT_SCALE } from "../../../shared/text-size/chatTextSize";
import { resetUiDocument } from "../../../shared/dpad/uiDocument";
import { liftForFocus } from "../../../shared/dpad/useDockClearanceOnFocus";
import { steamGlide, steamScrollIntoView, WALK_RULES, type SteamScrollRule } from "../../../test-harness/deckAnswerWalk";
import { pressOnRing } from "../../../test-harness/deckPopupFit";
import { putSteamRingOn, steamRingHolder } from "../../../test-harness/steamRing";

/** Both screens in the plugin's own points, as the Deck reported them with Show details open on the Session tab. */
const SCREENS = [
  /* plan103-P103-DETAILS-STRIP-01-try2.json (and the plan 103 rows after it): page 854 x 454, pane 52 to 454, dock 351. */
  { name: "the Deck's own screen", paneTop: 52, paneBottom: 454, dockTop: 351 },
  /* plan104-P104-M-SESSION-CARD.json: Steam's page 1500 x 843, pane top 52 and 713 tall, dock top 662. */
  { name: "the external screen", paneTop: 52, paneBottom: 765, dockTop: 662 },
] as const;
type Screen = (typeof SCREENS)[number];

/** The room revealBelowKeeping (chatPanelScroll.ts, its `padPx`) keeps between the card and the pane's top and the dock. */
const REVEAL_PAD = 8;

/** The long test chat's summary text with no limit: D0's 669-point card less its frame (18) and title line (20.5). */
const LONG_TEXT_PTS = 630.5;

const MORE_BELOW = "▾ More below (press Down)";

const SHEET = buildBonsaiScopeStylesheet().replace(/\/\*[\s\S]*?\*\//g, "");

/** What the one rule written as `<selector> {` declares, by property; empty when there is no such rule. */
function declared(selector: string): Map<string, string> {
  const out = new Map<string, string>();
  const at = SHEET.indexOf(`${selector} {`);
  if (at < 0) return out;
  for (const decl of SHEET.slice(SHEET.indexOf("{", at) + 1, SHEET.indexOf("}", at)).split(";")) {
    const colon = decl.indexOf(":");
    if (colon > 0) out.set(decl.slice(0, colon).trim(), decl.slice(colon + 1).replace("!important", "").trim());
  }
  return out;
}

/** The first length in `value`, in points. Anything but fixed points (a share of the screen) is refused. */
function pts(value: string | undefined, what: string): number {
  const first = (value ?? "").trim().split(/\s+/)[0] ?? "";
  const m = /^(-?[\d.]+)px$/.exec(first);
  if (!m) throw new Error(`${what} is written as "${value}": only fixed points fit both the Deck's screen and a monitor`);
  return Number(m[1]);
}

/** A font size written through textPx: its points times the Text size step. */
function fontPts(value: string | undefined, scale: number): number {
  const m = /^calc\(([\d.]+)px \* var\(--bonsai-text-scale, 1\)\)$/.exec(value ?? "");
  if (!m) throw new Error(`a font size written as "${value}"`);
  return Number(m[1]) * scale;
}

const CARD = ".bonsai-scope .bonsai-sumup-card";

/** The card's parts, top to bottom, in points, at Text size step `scale` with its title line on `headLines` lines. */
function cardParts(scale: number, headLines: number) {
  const card = declared(CARD);
  const head = declared(`${CARD}-head`);
  const text = declared(`${CARD}-text`);
  const more = declared(`${CARD}-more`);
  const lineHeight = Number(head.get("line-height") ?? card.get("line-height"));
  return {
    frame: 2 * (pts(card.get("border"), "the card's border") + pts(card.get("padding"), "the card's padding")),
    head: headLines * fontPts(head.get("font-size"), scale) * lineHeight + pts(head.get("margin-bottom"), "the gap under the title line"),
    textLimit: text.has("max-height") ? pts(text.get("max-height"), "the text's height limit") : Infinity,
    textScrolls: /^(auto|scroll)$/.test(text.get("overflow-y") ?? ""),
    more: more.has("height") ? pts(more.get("height"), "the More below row") : 0,
  };
}
type CardParts = ReturnType<typeof cardParts>;

/** The card at its tallest: its text at the limit, with the More below row under it. */
const tallest = (p: CardParts) => p.frame + p.head + p.textLimit + p.more;

describe("the card's height, worked out from its own rules, fits between the pane's top and the dock on both screens", () => {
  it("is written in fixed points, scrolls its text, and keeps Steam's ring inside the room the reveal leaves", () => {
    const normal = cardParts(1, 1);
    // Normal: a 1-point border and 8 of padding above and below (18), the 10-point title line at 1.45 and its 6-point
    // gap (20.5), the text's 190-point limit, and the 18-point More below row: 246.5 points.
    expect(normal.frame).toBe(18);
    expect(normal.head).toBeCloseTo(20.5, 5);
    expect(normal.textLimit).toBe(190);
    expect(normal.textScrolls).toBe(true);
    expect(normal.more).toBe(18);
    expect(tallest(normal)).toBeCloseTo(246.5, 5);
    // The ring is a 2-point outline 2 points outside the card: 4, inside the 8 the reveal keeps above and below.
    const ring = declared(`${CARD}:focus-visible`);
    expect(pts(ring.get("outline"), "the ring") + pts(ring.get("outline-offset"), "the ring's offset")).toBeLessThanOrEqual(REVEAL_PAD);
  });

  /*
   * The Deck's own screen leaves 299 points (351 - 52); the external screen 610 (662 - 52). The tallest case is Large
   * text (1.15) with the title line wrapped onto two lines: 18 + 2 x 11.5 x 1.45 + 6 + 190 + 18 = 265.35, and with the
   * reveal's 8 above and below, 281.35 of the Deck's 299 (17.65 to spare). Normal on one line: 262.5 of 299.
   */
  const cases = SCREENS.flatMap((screen) =>
    (Object.keys(TEXT_SCALE) as Array<keyof typeof TEXT_SCALE>).flatMap((size) => [1, 2].map((lines) => [screen.name, size, lines, screen] as const)),
  );
  it.each(cases)("%s, %s text, title on %i line(s): the tallest card and the reveal's room above and below fit", (_n, size, lines, screen) => {
    const band = screen.dockTop - screen.paneTop;
    expect(tallest(cardParts(TEXT_SCALE[size], lines)) + 2 * REVEAL_PAD).toBeLessThanOrEqual(band);
  });

  it("D0's card had no limit: its text alone made it 669 points, taller than either band", () => {
    const p = cardParts(1, 1);
    expect(p.frame + p.head + LONG_TEXT_PTS).toBeCloseTo(669, 5);
    expect(p.frame + p.head + Math.min(LONG_TEXT_PTS, p.textLimit) + p.more).toBeCloseTo(246.5, 5);
  });
});

/*
 * Where each part sits down the pane's content (its screen y at scroll 0, less the pane's top). D0 read the card's top
 * at 53 with the pane at scroll 782: content 783. The button and its reason line above the card keep the gaps plan 81
 * measured on the Deck (plan81-P81-M-L-SUMUP-try2.json: button 204.1 to 236.8, reason 242 to 274, card from 279.6),
 * and Rename and Keep sit 49.4 to 76.2 under the card's bottom, as they did there. D0's pane had 2485 of scroll.
 */
const CONTENT = { button: [707.5, 740.2], reason: [745.4, 777.4], cardTop: 783, rename: [49.4, 76.2], scrollHeight: 3198 } as const;

const SUMMARY = {
  text: Array.from({ length: 17 }, (_, i) => `- Topic ${i + 1}: what was asked, and the short answer the AI gave to it`).join("\n"),
  covers_through_turn_id: "t26",
  turns_covered: 26,
  oldest_turns_unread: 0,
  hidden_notes_left_out: 0,
  written_at: new Date().toISOString(),
  seconds: 30,
  model: "test",
  suggested_title: "Brotato and Steam Deck tips",
};

function summedUp(): ChatSumUpState {
  return {
    summary: SUMMARY,
    canSumUp: false,
    questionsAfterSummary: 0,
    summingUp: false,
    summingUpSeconds: null,
    otherJobRunning: false,
    startSumUp: () => {},
    stopSumUp: () => {},
  };
}

const rect = (top: number, bottom: number) =>
  ({ top, bottom, left: 0, right: 300, width: 300, height: bottom - top, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;

/** scrollTop as the browser keeps it, between 0 and `max`. */
function clampScroll(el: HTMLElement, max: () => number): void {
  let at = 0;
  Object.defineProperty(el, "scrollTop", { configurable: true, get: () => at, set: (v: number) => void (at = Math.max(0, Math.min(max(), v))) });
}

let upPastButton = 0;

/**
 * The Session tab on `screen` with the long chat's summary and its Rename offer, the ring on Sum up again (greyed,
 * with its reason line) as D0 started, everything settled. `textPts` is the text's own height with no limit.
 */
function openSessionTab(screen: Screen, rule: SteamScrollRule | undefined, textPts = LONG_TEXT_PTS) {
  const pane = document.createElement("div");
  pane.className = "TabContentsScroll";
  const clientHeight = screen.paneBottom - screen.paneTop;
  Object.defineProperty(pane, "scrollHeight", { value: CONTENT.scrollHeight, configurable: true });
  Object.defineProperty(pane, "clientHeight", { value: clientHeight, configurable: true });
  clampScroll(pane, () => CONTENT.scrollHeight - clientHeight);
  pane.getBoundingClientRect = () => rect(screen.paneTop, screen.paneBottom);
  const scope = document.createElement("div");
  scope.className = "bonsai-scope";
  pane.appendChild(scope);
  const dock = document.createElement("div");
  dock.className = "bonsai-main-tab-dock";
  dock.getBoundingClientRect = () => rect(screen.dockTop, screen.paneBottom);
  pane.appendChild(dock);
  document.body.appendChild(pane);

  const { container } = render(
    <SessionSumUpSection
      state={summedUp()}
      answerInFlight={false}
      onMoveUpFromButton={() => {
        upPastButton += 1;
        return true;
      }}
      onMoveDownPastSection={() => false}
    />,
    { container: scope },
  );
  const q = (sel: string) => container.querySelector<HTMLElement>(sel)!;
  const button = q(".bonsai-sumup-btn");
  const card = q(".bonsai-sumup-card");
  const [rename, keep] = Array.from(container.querySelectorAll<HTMLElement>(".bonsai-sumup-offer-btn"));
  const text = card.querySelector<HTMLElement>(".bonsai-sumup-card-text");

  // The card's text: D0's height, shown up to the limit its rule writes, scrolling inside that.
  const parts = cardParts(1, 1);
  const shown = () => Math.min(textPts, parts.textLimit);
  if (text) {
    Object.defineProperty(text, "scrollHeight", { configurable: true, value: textPts });
    Object.defineProperty(text, "clientHeight", { configurable: true, get: shown });
    clampScroll(text, () => textPts - shown());
    act(() => void text.dispatchEvent(new Event("scroll")));
  }
  const moreRow = () => card.querySelector<HTMLElement>(".bonsai-sumup-card-more");
  const cardHeight = () => parts.frame + parts.head + (text ? shown() : textPts) + (moreRow() ? parts.more : 0);

  const screenY = (contentY: number) => contentY - pane.scrollTop + screen.paneTop;
  const place = (el: HTMLElement, box: () => readonly [number, number]) => {
    el.getBoundingClientRect = () => rect(screenY(box()[0]), screenY(box()[1]));
    el.scrollIntoView = steamScrollIntoView(pane, el, screen.paneBottom);
  };
  const cardBox = () => [CONTENT.cardTop, CONTENT.cardTop + cardHeight()] as const;
  place(button, () => CONTENT.button);
  place(q(".bonsai-sumup-reason"), () => CONTENT.reason);
  place(card, cardBox);
  for (const choice of [rename!, keep!]) place(choice, () => [cardBox()[1] + CONTENT.rename[0], cardBox()[1] + CONTENT.rename[1]]);

  // D0's start: the ring on Sum up again, carried to Steam's 116-point line under the pane's top; then let it settle.
  pane.scrollTop = CONTENT.button[0] - (screen.paneTop + 116) + screen.paneTop;
  putSteamRingOn(button);
  act(() => void vi.runAllTimers());

  const stops = new Set<HTMLElement>([button, card, rename!, keep!]);
  /**
   * One press as the Deck delivers it: Steam calls the ring holder's move handler; a stop of this section the plugin
   * focused takes the ring (siblings in one container); on a landing Steam glides a moment later and the plugin's own
   * lift follows; then the plugin's settle passes run.
   */
  const press = (key: "onMoveDown" | "onMoveUp") => {
    const from = steamRingHolder();
    const taken = pressOnRing(key);
    const to = document.activeElement as HTMLElement | null;
    if (to && to !== from && stops.has(to)) putSteamRingOn(to);
    const landed = steamRingHolder();
    act(() => void vi.advanceTimersByTime(100));
    if (landed && landed !== from) {
      steamGlide(landed, pane, rule, { paneTop: screen.paneTop, dockTop: screen.dockTop });
      liftForFocus(landed);
    }
    act(() => void vi.runAllTimers());
    return taken;
  };
  const box = (el: HTMLElement) => el.getBoundingClientRect();
  const wholeInBand = (el: HTMLElement) => box(el).top >= screen.paneTop - 0.01 && box(el).bottom <= screen.dockTop + 0.01;
  /** The bottom of the card's text box on screen: its last line, when the text is at its end. */
  const textBottom = () => box(card).top + parts.frame / 2 + parts.head + (text ? shown() : textPts);
  const atEnd = () => !text || text.scrollTop >= textPts - shown() - 1;

  /**
   * Press `key` until the ring leaves the card, at most `limit` times. A press that keeps the ring on the card must be
   * taken, move the text the way it points by no more than the text shows at once, never come back to a place it has
   * been, and leave the whole card above the dock with the right sign under it.
   */
  const read = (key: "onMoveDown" | "onMoveUp", limit = 12) => {
    const problems: string[] = [];
    const places = [text?.scrollTop ?? 0];
    let reads = 0;
    let leftTo: HTMLElement | null = null;
    let lastLineAtEnd: number | null = null;
    for (let i = 1; i <= limit && !leftTo; i += 1) {
      const before = text?.scrollTop ?? 0;
      const taken = press(key);
      if (steamRingHolder() !== card) {
        leftTo = steamRingHolder();
        continue;
      }
      reads += 1;
      const now = text?.scrollTop ?? 0;
      const moved = now - before;
      if (taken !== true) problems.push(`press ${i}: not taken`);
      if (moved === 0 || (key === "onMoveDown") !== moved > 0) problems.push(`press ${i}: the text moved ${moved}`);
      if (Math.abs(moved) > shown()) problems.push(`press ${i}: moved ${Math.abs(moved)}, more than the ${shown()} that shows`);
      if (places.includes(now)) problems.push(`press ${i}: back at ${now}`);
      places.push(now);
      if (!wholeInBand(card)) problems.push(`press ${i}: the card at ${box(card).top} to ${box(card).bottom}`);
      const sign = moreRow()?.textContent ?? null;
      if (sign !== (atEnd() ? "" : MORE_BELOW)) problems.push(`press ${i}: the sign reads ${JSON.stringify(sign)}`);
      if (atEnd()) lastLineAtEnd = textBottom();
    }
    return { problems, places, reads, leftTo, lastLineAtEnd };
  };

  return { pane, button, card, rename: rename!, keep: keep!, text, press, read, wholeInBand, box, moreRow, atEnd, shown };
}

beforeEach(() => {
  upPastButton = 0;
  vi.useFakeTimers();
  resetUiDocument();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe.each(SCREENS)("on $name, with the long test chat's summary (D0's card)", (screen) => {
  it.each(WALK_RULES.map((rule) => [rule ?? "no glide", rule] as const))(
    "Down lands on the whole card, reads its text to the end and moves on to Rename; Up reads it back and returns to Sum up again (Steam's glide: %s)",
    (_name, rule) => {
      const s = openSessionTab(screen, rule);

      // Down from Sum up again: the whole card shows above the dock, its text from the top, a More below sign under it.
      expect(s.press("onMoveDown")).toBe(true);
      expect(steamRingHolder()).toBe(s.card);
      expect(s.wholeInBand(s.card), `the card at ${s.box(s.card).top} to ${s.box(s.card).bottom}`).toBe(true);
      expect(s.text?.scrollTop).toBe(0);
      expect(s.moreRow()?.textContent).toBe(MORE_BELOW);

      // Down reads the text to its end, the card staying whole above the dock, then moves on to Rename.
      const down = s.read("onMoveDown");
      expect(down.problems).toEqual([]);
      expect(down.reads).toBeGreaterThan(1);
      expect(down.places[down.places.length - 1]).toBeCloseTo(LONG_TEXT_PTS - s.shown(), 5);
      expect(down.lastLineAtEnd).not.toBeNull();
      expect(down.lastLineAtEnd!).toBeLessThanOrEqual(screen.dockTop);
      expect(down.leftTo).toBe(s.rename);
      expect(s.wholeInBand(s.rename)).toBe(true);

      // Up from Rename: back on the whole card, still at its end; Up reads it back to its top, then Sum up again.
      expect(s.press("onMoveUp")).toBe(true);
      expect(steamRingHolder()).toBe(s.card);
      expect(s.wholeInBand(s.card), `the card at ${s.box(s.card).top} to ${s.box(s.card).bottom}`).toBe(true);
      expect(s.atEnd()).toBe(true);
      const up = s.read("onMoveUp");
      expect(up.problems).toEqual([]);
      expect(up.places[up.places.length - 1]).toBe(0);
      expect(up.leftTo).toBe(s.button);
      /* The button is a small stop Steam glides to (the Deck put it at 204.1 after Up from the card, plan 81); it has
         no reveal of its own for its top, and this change leaves it as it was, so with no glide it is not judged. */
      if (rule) expect(s.wholeInBand(s.button)).toBe(true);
      expect(upPastButton).toBe(0);
    },
  );

  it("a short summary that fits shows no More below line, and Down from the card moves straight on to Rename", () => {
    const s = openSessionTab(screen, "top", 120);
    expect(s.press("onMoveDown")).toBe(true);
    expect(steamRingHolder()).toBe(s.card);
    expect(s.moreRow()).toBeNull();
    expect(s.box(s.card).bottom - s.box(s.card).top).toBeCloseTo(18 + 20.5 + 120, 5);
    expect(s.wholeInBand(s.card)).toBe(true);
    expect(s.press("onMoveDown")).toBe(true);
    expect(steamRingHolder()).toBe(s.rename);
  });

  it("one Down that Steam hands to both onButtonDown (as a GamepadEvent, button 10) and onMoveDown moves the text one step", () => {
    const s = openSessionTab(screen, "top");
    s.press("onMoveDown");
    const nav = (s.card as HTMLElement & { __nav?: Record<string, (e?: unknown) => unknown> }).__nav!;
    act(() => void nav.onButtonDown!({ detail: { button: 10 } }));
    expect(s.text!.scrollTop).toBe(0);
    act(() => void nav.onMoveDown!());
    expect(s.text!.scrollTop).toBe(96);
    expect(steamRingHolder()).toBe(s.card);
  });

  it("a finger scrolling the text moves the sign with it, and Up then reads from where the finger left it", () => {
    const s = openSessionTab(screen, "top");
    s.press("onMoveDown");
    const end = LONG_TEXT_PTS - s.shown();
    s.text!.scrollTop = end;
    act(() => void s.text!.dispatchEvent(new Event("scroll")));
    expect(s.moreRow()?.textContent).toBe("");
    expect(s.press("onMoveUp")).toBe(true);
    expect(steamRingHolder()).toBe(s.card);
    expect(s.text!.scrollTop).toBeLessThan(end);
    expect(s.moreRow()?.textContent).toBe(MORE_BELOW);
  });
});
