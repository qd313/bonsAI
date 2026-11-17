/**
 * Title: The Show details chips with the Session chip last, walked as Steam delivers the presses, its scroll modelled
 * Purpose: Pin row P105-DETAILS-CHIPS-01 at the level the Deck check looks at: the usual eight short-named chips and
 *          the dashed Session chip, at the widths the density board measures (tab 1, round 2 option A), in three rows
 *          of four, three and two, Session last; every walk visits each stop once, with no press that does nothing,
 *          ends in the Session box on Sum up this chat when it should, and leaves no stop it lands on behind the dock
 *          or off the pane's top. Up from Sum up comes back to the Session chip.
 * Used for: ContextChipLadder.tsx (the Session chip and its moves), with chipLadderGrid.ts and useChipLadderReveal.ts,
 *           rendered into a pane in the Deck's numbers (deckChipLadderPane.ts) with Steam's own glide on focus
 *           (deckAnswerWalk.ts's rules) and the plugin's lift after every press. The Session box is a stand-in with one
 *           stop, Sum up, reached the way buildDetailsPanelElement.tsx wires it (`session.enter`, and Up from it by
 *           the ladder's own root, which hands the ring to its open chip).
 * Does not: Draw the real Session view (MainTabChatTranscript.sessionChip.test.tsx walks that), or measure text: the
 *           widths are the drawing's.
 */
import React from "react";
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Focusable } from "@decky/ui";

import { ContextChipLadder, type SessionChip } from "./ContextChipLadder";
import type { ContextChip, TransparencySnapshot } from "../../../types/inputTransparency";
import { resetUiDocument } from "../../../shared/dpad/uiDocument";
import { focusRowElement } from "../../../shared/dpad/focusPerTurnRow";
import { deckChipLadderPane } from "../../../test-harness/deckChipLadderPane";
import { WALK_RULES } from "../../../test-harness/deckAnswerWalk";

/* Steam calls the move handlers of the element holding focus, so the walk needs each element's own. */
const hoisted = vi.hoisted(() => ({ propsByEl: new WeakMap<Element, Record<string, unknown>>() }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../../test-harness/fakeDeckyUi");
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

/* The drawing's usual eight chips (their widths off the built board) and a box height for each. */
const DRAWN: Array<[short: string, width: number, box: number]> = [
  ["KB search", 59.5, 90],
  ["14 sections", 65.4, 55],
  ["TDP 12 W", 58.2, 55],
  ["Balanced", 56.5, 55],
  ["Thought 16 s", 73.8, 87],
  ["Spoilers: high", 76.2, 135],
  ["gemma4:e2b", 74.5, 55],
  ["Developer", 61.2, 254],
];
/* The Session chip as drawn ("Session · 100", 73.1 wide) and its box: Sum up and two of the chat's questions. */
const SESSION = "Session · 2";
const SESSION_W = 73.1;
const SESSION_BOX = 122;
const SUM_UP = "Sum up this chat";
const LABELS = DRAWN.map(([short]) => short);

function chips(): ContextChip[] {
  return DRAWN.map(([short], i) => ({
    id: `chip-${i}`,
    rank: i + 1,
    label: `${short} (full wording)`,
    short_label: short,
    attached: true,
    tier_class: "",
    body: { title: short, paths: [], bullets: [] },
  }));
}

type Dir = "Left" | "Right" | "Up" | "Down";
type Screen = { paneTop?: number; paneBottom?: number; dockTop?: number; ladderDocTop: number };

/* The monitor run's screen (deckChipLadderPane.ts's defaults), and the Deck's own small screen with no game. */
const MONITOR: Screen = { ladderDocTop: 389.5 };
const SMALL: Screen = { paneBottom: 366, dockTop: 290, ladderDocTop: 300 };

function mount(rule: (typeof WALK_RULES)[number], steamTopMargin: boolean, screen: Screen, startOpen = false) {
  const scene = deckChipLadderPane({
    ...screen,
    rowWidth: 287.2,
    scrollTop: screen === SMALL ? 0 : 50,
    chipWidths: { ...Object.fromEntries(DRAWN.map(([l, w]) => [l, w])), [SESSION]: SESSION_W },
    boxHeights: { ...Object.fromEntries(DRAWN.map(([l, , b]) => [l, b])), [SESSION]: SESSION_BOX },
    rule,
    steamTopMargin,
  });
  const above = document.createElement("button");
  above.textContent = "Hide details";
  const below = document.createElement("button");
  below.textContent = "suggestion chip";
  document.body.append(above, below);
  let open = startOpen;
  let sumUpEl: HTMLElement | null = null;
  let ladderEl: HTMLElement | null = null;
  let draw: () => void = () => {};
  const session = (): SessionChip => ({
    label: SESSION,
    open,
    onOpenChange: (next) => {
      if (next === open) return;
      open = next;
      draw();
    },
    box: (
      <Focusable className="bonsai-details-session-body">
        <Focusable
          className="bonsai-sumup-btn"
          ref={(el: HTMLElement | null) => {
            sumUpEl = el;
          }}
          {...({ onMoveUp: () => (ladderEl ? focusRowElement(ladderEl) : false), onMoveDown: () => true } as Record<string, unknown>)}
        >
          {SUM_UP}
        </Focusable>
      </Focusable>
    ),
    enter: () => (sumUpEl ? focusRowElement(sumUpEl) : false),
  });
  const snapshot = { context_chips: chips() } as unknown as TransparencySnapshot;
  const ui = () => (
    <ContextChipLadder
      snapshot={snapshot}
      session={session()}
      onMoveUpFromLadder={() => {
        above.focus();
        return true;
      }}
      onMoveDownFromLadder={() => {
        below.focus();
        return true;
      }}
    />
  );
  const { container, rerender } = render(ui(), { container: scene.host });
  ladderEl = container.querySelector<HTMLElement>(".bonsai-chip-ladder")!;
  /* Sum up sits 9 px into its box (the box's border and padding), 33 px tall, wherever the box is drawn. */
  const placeSumUp = () => {
    if (!sumUpEl) return;
    sumUpEl.getBoundingClientRect = () => {
      const b = scene.detailsBox();
      return { top: b.top + 9, bottom: b.top + 42, left: 10, right: 277, width: 267, height: 33, x: 10, y: b.top + 9, toJSON: () => ({}) } as DOMRect;
    };
  };
  /* Lay out what is drawn now: a box that just opened is a new element, laid out afresh. */
  const place = () => {
    scene.install(ladderEl!);
    placeSumUp();
  };
  draw = () => rerender(ui());
  place();
  /* Draw again now the chips have widths, so the ladder measures and packs them. */
  act(() => draw());
  place();
  return { scene, ladder: ladderEl, above, below, place, sumUp: () => sumUpEl, isOpen: () => open };
}
type Mounted = ReturnType<typeof mount>;

function nameOf(m: Mounted, el: Element | null): string {
  if (el === m.above) return "Hide details";
  if (el === m.below) return "suggestion chip";
  if (el && el === m.sumUp()) return SUM_UP;
  if (el?.classList.contains("bonsai-chip-ladder-chip")) return el.textContent ?? "";
  return `other ${el?.className ?? "nothing"}`;
}

/** The ring arrives on a chip from outside the grid, then Steam's glide and the passes settle. */
function arriveOn(m: Mounted, label: string) {
  const target = [...m.ladder.querySelectorAll<HTMLElement>(".bonsai-chip-ladder-chip")].find((c) => c.textContent === label)!;
  target.setAttribute("tabindex", "-1");
  (document.activeElement as HTMLElement | null)?.blur();
  act(() => target.focus());
  m.place();
  m.scene.settle();
  act(() => {
    vi.runAllTimers();
  });
}

/**
 * One press, as Steam delivers it: the focused element's own handler (and the work it queued: the ladder's root hands
 * the ring on to its open chip a moment after it takes focus), then its glide, the lift and the passes.
 */
async function press(m: Mounted, dir: Dir): Promise<boolean> {
  const ring = document.activeElement;
  const handler = ring ? (hoisted.propsByEl.get(ring)?.[`onMove${dir}`] as (() => boolean) | undefined) : undefined;
  let claimed = false;
  await act(async () => {
    claimed = Boolean(handler?.());
  });
  m.place();
  m.scene.settle();
  act(() => {
    vi.runAllTimers();
  });
  return claimed;
}

/** Everything wrong with where the ring landed in the panel: off the pane's top, behind the dock, not the open chip. */
function landingProblems(m: Mounted, name: string): string[] {
  const ring = document.activeElement as HTMLElement;
  if (!m.ladder.contains(ring)) return [];
  const r = ring.getBoundingClientRect();
  const problems: string[] = [];
  if (r.top < m.scene.paneTop - 0.5) problems.push(`${name}: top ${r.top} above the pane's ${m.scene.paneTop}`);
  if (r.bottom > m.scene.dockTop + 0.5) problems.push(`${name}: bottom ${r.bottom} behind the dock at ${m.scene.dockTop}`);
  if (ring.classList.contains("bonsai-chip-ladder-chip") && !ring.classList.contains("bonsai-chip-ladder-chip--active")) {
    problems.push(`${name} is not the open chip`);
  }
  return problems;
}

/** Press one way until the ring leaves the grid or reaches `until`; every stop, and what broke the rules. */
async function walk(m: Mounted, dir: Dir, until: string, limit = 14) {
  const stops = [nameOf(m, document.activeElement)];
  const problems: string[] = [];
  for (let i = 1; i <= limit && stops[stops.length - 1] !== until; i += 1) {
    const before = document.activeElement;
    const scroll = m.scene.pane.scrollTop;
    if (!(await press(m, dir))) {
      problems.push(`press ${i}: not claimed on ${stops[stops.length - 1]}`);
      break;
    }
    const name = nameOf(m, document.activeElement);
    if (document.activeElement === before && m.scene.pane.scrollTop === scroll) problems.push(`press ${i}: dead on ${name}`);
    if (document.activeElement !== before) {
      if (stops.includes(name)) problems.push(`press ${i}: ${name} visited twice`);
      stops.push(name);
      problems.push(...landingProblems(m, name).map((p) => `press ${i}: ${p}`));
    }
  }
  return { stops, problems };
}

beforeEach(() => {
  hoisted.propsByEl = new WeakMap();
  vi.useFakeTimers();
  resetUiDocument();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("P105-DETAILS-CHIPS-01: the chips as drawn, Session last", () => {
  it("wraps the eight chips and the Session chip into three rows, four, three and two, Session last and dashed", () => {
    const m = mount(undefined, false, MONITOR);
    expect(m.scene.rowCount()).toBe(3);
    const tops = [...LABELS, SESSION].map((l) => m.scene.chipBox(l).top);
    const rows = [...new Set(tops)];
    expect(tops.map((t) => rows.indexOf(t))).toEqual([0, 0, 0, 0, 1, 1, 1, 2, 2]);
    const chipsDrawn = [...m.ladder.querySelectorAll<HTMLElement>(".bonsai-chip-ladder-grid > .bonsai-chip-ladder-chip")];
    const session = chipsDrawn.find((c) => c.textContent === SESSION)!;
    expect(Number(session.style.order)).toBe(chipsDrawn.length - 1);
    expect(session.style.borderStyle).toBe("dashed");
    expect(m.scene.chipBox(SESSION).left).toBeGreaterThan(m.scene.chipBox("Developer").right);
  });

  /* React rewrites a chip's `border` as it opens and closes; a dash kept apart from it was reset to solid. */
  it("keeps the Session chip dashed and grey as the ring opens it and leaves it again", async () => {
    const m = mount(undefined, false, MONITOR);
    const session = () => [...m.ladder.querySelectorAll<HTMLElement>(".bonsai-chip-ladder-chip--session")][0]!;
    const look = () => [session().style.borderTopStyle, session().style.color];
    expect(look()).toEqual(["dashed", "rgb(159, 183, 213)"]);
    arriveOn(m, "Developer");
    expect(await press(m, "Right")).toBe(true);
    expect(m.isOpen()).toBe(true);
    expect(session().classList.contains("bonsai-chip-ladder-chip--active")).toBe(true);
    expect(look()).toEqual(["dashed", "rgb(159, 183, 213)"]);
    expect(await press(m, "Left")).toBe(true);
    expect(m.isOpen()).toBe(false);
    expect(look()).toEqual(["dashed", "rgb(159, 183, 213)"]);
  });
});

describe.each(
  [MONITOR, SMALL].flatMap((screen) =>
    WALK_RULES.flatMap((rule) =>
      [false, true].map((margin) => [screen === SMALL ? "the Deck's own screen" : "the monitor", rule ?? "no glide", margin, screen, rule] as const),
    ),
  ),
)("on %s, Steam's glide %s, top margin %s", (_screen, _rule, steamTopMargin, screen, rule) => {
  it("Right visits every chip once, Session last, then goes into its box onto Sum up; no stop behind the dock", async () => {
    const m = mount(rule, steamTopMargin, screen);
    arriveOn(m, LABELS[0]!);
    const right = await walk(m, "Right", SUM_UP);
    expect(right.problems).toEqual([]);
    expect(right.stops).toEqual([...LABELS, SESSION, SUM_UP]);
    expect(m.isOpen()).toBe(true);
  });

  it("Down from the row's right end crosses a row a press onto Session, then into its box; Up walks back out to Hide details", async () => {
    const m = mount(rule, steamTopMargin, screen);
    arriveOn(m, "Balanced");
    const down = await walk(m, "Down", SUM_UP);
    expect(down.problems).toEqual([]);
    expect(down.stops).toEqual(["Balanced", "gemma4:e2b", SESSION, SUM_UP]);
    const up = await walk(m, "Up", "Hide details");
    expect(up.problems).toEqual([]);
    expect(up.stops).toEqual([SUM_UP, SESSION, "Spoilers: high", "14 sections", "Hide details"]);
  });

  it("Left from the Session chip visits every chip back to the first once, and closes the Session box", async () => {
    const m = mount(rule, steamTopMargin, screen, true);
    arriveOn(m, SESSION);
    expect(m.scene.detailsBox().bottom - m.scene.detailsBox().top).toBe(SESSION_BOX);
    const left = await walk(m, "Left", "Hide details");
    expect(left.problems).toEqual([]);
    expect(left.stops).toEqual([SESSION, ...[...LABELS].reverse(), "Hide details"]);
    expect(m.isOpen()).toBe(false);
  });

  it("Down from an answer chip on the Session chip's row leaves the panel, as the bottom row always did", async () => {
    const m = mount(rule, steamTopMargin, screen);
    arriveOn(m, "Developer");
    /* Developer's tall box shows its end on the first Down where it is hidden; the next Down always moves on. */
    const down = await walk(m, "Down", "suggestion chip");
    expect(down.problems).toEqual([]);
    expect(down.stops).toEqual(["Developer", "suggestion chip"]);
  });
});
