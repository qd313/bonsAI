/**
 * Title: An answer inside a scrolling pane, in the Steam Deck's numbers
 * Purpose: Test helper for the answer-walk tests (plan 76 lane 3). Builds an answer bubble with its
 *          sections, hidden covers, underlined game words and a revealed cover's hide line inside a
 *          pane shaped like the Deck's own screen: the pane runs from y 88 to y 366, the dock starts
 *          at y 290 (so the readable band is 202 px), and every box follows the pane's scrollTop. The
 *          bubble has the Deck's own 9 px frame around its sections (`BUBBLE_FRAME_PX`), and after every
 *          landing the plugin's own lift off the dock runs (useDockClearanceOnFocus), as on the Deck.
 * Used for: the answerBubbleNavigation.*.test.ts walk tests.
 * Does not: know Steam's real scroll rule. On the device Steam glides the panel a moment AFTER a stop
 *           takes focus, and the Deck showed several landings (a cover moved 69 px down, then 37 px
 *           back up; a section's box pulled to the top of the pane). `steamScroll` models that
 *           glide, applied after the press returns, in three deliberately different rules, so a walk
 *           that only works under one of them is caught: "top" aligns a stop that is not wholly on
 *           screen to the top of the pane, "padded" puts a small stop 116 px below it (Steam's
 *           scroll padding), "center" also re-centres a small stop that was already on screen.
 */
import {
  focusFirstAnswerChunk,
  focusLastAnswerChunk,
  handleAnswerBubbleMoveDown,
  handleAnswerBubbleMoveUp,
  handleUpFromSpoilerCover,
} from "../utils/answerBubbleNavigation";
import { registerAnswerStop, resetAnswerStopRegistry } from "../utils/answerStopRegistry";
import { registerAnswerBubbleEl } from "../utils/answerBubbleElRegistry";
import { registerSpoilerFence, resetSpoilerFenceRegistry } from "../utils/spoilerFenceRegistry";
import { registerDrgGlossaryTermChip, resetDrgGlossaryTermRegistry } from "../utils/drgGlossaryTermRegistry";
import { resetUiDocument } from "../utils/uiDocument";
import { liftForFocus } from "../hooks/useDockClearanceOnFocus";

const KEY = "turn-1";
const ref = { current: 0 };
export const PANE_TOP = 88;
const DOCK_TOP = 290;
const PANE_BOTTOM = 366;
/** Steam's own scroll padding at the bottom of the Quick Access pane (useDockClearanceOnFocus.ts). */
const STEAM_SCROLL_PADDING_BOTTOM = 80;
/**
 * Steam's own scroll padding at the top of that pane: 116 px (docs/lessons-learned.md, "Steam's own scroll area
 * keeps 116 pixels clear at its own top"), so a small stop is wanted at y 204 (pane top 88 + 116), not at 88.
 */
const STEAM_SCROLL_PADDING_TOP = 116;
/** A stop whose bottom touches the margin line is on it, not in it (the Deck left words at 228.8 to 243.8 with the line at 244). */
const STEAM_TOP_SLACK_PX = 1;
/** A stop whose bottom is this far past the dock still counts as on screen to Steam (the Deck left 291 with the dock at 290). */
const STEAM_BOTTOM_SLACK_PX = 4;

/**
 * The bubble's own frame on the Deck: the inner padding (8 px, answerBubble.ts) and the 1 px border, above
 * the first section and below the last. The harness used to end the bubble exactly where its last section
 * ended, so the press the Deck spent scrolling that frame into view never happened here
 * (plan77-P77-WALK-COVERS-MIRROR-R2.json, plan77-P77-FINAL-SMOKE.json).
 */
const BUBBLE_FRAME_PX = 9;

/**
 * The pane's readable band ends at the dock; a game running lifts the dock's action row, so a test can move it.
 * `dockLift` (on unless set false) runs the plugin's own lift off the dock (useDockClearanceOnFocus's
 * `liftForFocus`, which leaves an answer's sections to the walk) after every landing, as the Deck does.
 * The lift's own scroll request moves the panel as the Deck measured on 2026-10-01
 * unless `liftScrollsToEnd` is false, which leaves it still, as the older measurement had it (see
 * `scrollIntoViewOf`).
 */
export interface DeckAnswerOptions {
  dockTop?: number;
  dockLift?: boolean;
  liftScrollsToEnd?: boolean;
  /**
   * Steam's glide as the Deck measured it under the "padded" rule: a small stop lying wholly inside the 116 px top
   * margin is moved down to the margin line even though it is on screen, and a stop 1 to 4 px past the dock is
   * left where it is. Off unless set: switched on, 18 older walk tests fail, every one with the dock at 262 under
   * "padded" (a small section is carried to y 204 and its bottom is then cut off by a dock that high); plan 81
   * helper K left them for the Up-landing and lift fixes (see answerBubbleNavigation.steamTopMargin.test.ts).
   */
  steamTopMargin?: boolean;
  /**
   * Where the pane starts on the screen and ends. The default is the no-game Deck (88 to 366 in the setup's
   * numbers); a running game makes the page 534 high and puts the pane at 128 to 534 with the dock at 330
   * (plan81-P81-M-K2K3-GAME.json). Steam's top margin is 116 below `paneTop`.
   */
  paneTop?: number;
  paneBottom?: number;
}

export type Box = [top: number, bottom: number];

/**
 * An answer inside a scroll pane, in the Deck's numbers. A box is given as [top, bottom] in the
 * answer's own coordinates (its screen y when the panel is scrolled to 0), and follows the scroll.
 */
export type SteamScrollRule = "top" | "padded" | "center";

export function deckAnswer(sections: Box[], scrollTop = 0, steamScroll?: SteamScrollRule, options: DeckAnswerOptions = {}) {
  const dockTopY = options.dockTop ?? DOCK_TOP;
  const paneTopY = options.paneTop ?? PANE_TOP;
  const paneBottomY = options.paneBottom ?? paneTopY + (PANE_BOTTOM - PANE_TOP);
  const pane = document.createElement("div");
  pane.className = "TabContentsScroll";
  Object.defineProperty(pane, "scrollHeight", { value: 2000, configurable: true });
  Object.defineProperty(pane, "clientHeight", { value: paneBottomY - paneTopY, configurable: true });
  const rect = (top: number, bottom: number) =>
    ({ top, bottom, left: 0, right: 0, width: 0, height: bottom - top, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;
  pane.getBoundingClientRect = () => rect(paneTopY, paneBottomY);
  document.body.appendChild(pane);
  const dock = document.createElement("div");
  dock.className = "bonsai-main-tab-dock";
  dock.getBoundingClientRect = () => rect(dockTopY, paneBottomY);
  pane.appendChild(dock);
  pane.scrollTop = scrollTop;

  /*
   * The pane's scrollIntoView, which jsdom lacks; only the plugin's lift off the dock calls it (block "end").
   * It does what the Deck measured on 2026-10-01: the end lands Steam's 80 px of scroll padding above the
   * pane's bottom, with the lift's own scroll-margin above that. The margin used to be the dock's strip plus 6,
   * which ended an element 86 px above the dock (a 180 px first section at y 24 to 204 with the dock at 290,
   * plan78-P78-DOWN-SHORT-SECTION.json; the choices and Helpful at 172 to 204, plan81-P81-M-K2K3-NOGAME.json);
   * the lift now leaves Steam's 80 out of it, so an element ends 6 px above the dock (plan 81, K3).
   * The margin is read off the element, so the model follows whatever the lift asks. `liftScrollsToEnd: false` leaves the panel still instead, as the Deck
   * measured inside the answer on 2026-09-06 (useDockClearanceOnFocus.ts); every walk passes under both.
   */
  const scrollIntoViewOf = (el: HTMLElement) => (arg?: boolean | ScrollIntoViewOptions) => {
    if (!(options.liftScrollsToEnd ?? true) || typeof arg !== "object" || arg.block !== "end") return;
    const target = paneBottomY - STEAM_SCROLL_PADDING_BOTTOM - (parseFloat(el.style.scrollMarginBottom) || 0);
    pane.scrollTop = Math.max(0, pane.scrollTop + el.getBoundingClientRect().bottom - target);
  };
  const place = (el: HTMLElement, [top, bottom]: Box) => {
    el.getBoundingClientRect = () => rect(top - pane.scrollTop, bottom - pane.scrollTop);
    el.scrollIntoView = scrollIntoViewOf(el);
  };
  /* The Deck's shape: bubble > inner (the padding) > the section stack > the sections. */
  const frame = BUBBLE_FRAME_PX;
  const first = sections[0]![0];
  const last = sections[sections.length - 1]![1];
  const bubble = document.createElement("div");
  bubble.className = "bonsai-chat-ai-bubble Panel Focusable";
  bubble.setAttribute("tabindex", "0");
  place(bubble, [first - frame, last + frame]);
  pane.appendChild(bubble);
  registerAnswerBubbleEl(KEY, bubble);
  const inner = document.createElement("div");
  inner.className = "bonsai-chat-ai-bubble-inner";
  place(inner, [first - (frame - 1), last + (frame - 1)]);
  bubble.appendChild(inner);
  const stack = document.createElement("div");
  stack.className = "bonsai-ai-response-stack bonsai-ai-response-stack--in-bubble";
  place(stack, [first, last]);
  inner.appendChild(stack);

  const stops = sections.map((box, i) => {
    const stop = document.createElement("div");
    stop.className = "bonsai-answer-stop Panel Focusable";
    stop.setAttribute("tabindex", "0"); // Decky stamps this on the nodes Steam navigates
    place(stop, box);
    stack.appendChild(stop);
    registerAnswerStop(KEY, i, stop);
    return stop;
  });

  let fenceSeq = 0;
  /** A still-hidden cover, the shape MainTabBonsaiAiMarkdownChunk.tsx draws; `reveal` is what A calls. */
  const cover = (section: HTMLElement, box: Box, reveal?: () => void): HTMLElement => {
    const el = document.createElement("div");
    el.className = "bonsai-spoiler-reveal-target Panel Focusable";
    el.setAttribute("tabindex", "0");
    place(el, box);
    section.appendChild(el);
    fenceSeq += 1;
    registerSpoilerFence(`cover-${fenceSeq}`, el, reveal);
    return el;
  };
  /** An underlined game word (a glossary chip), a Focusable inside the section's text. */
  const word = (section: HTMLElement, box: Box): HTMLElement => {
    const el = document.createElement("div");
    el.className = "bonsai-drg-glossary-term Panel Focusable";
    el.setAttribute("tabindex", "0");
    place(el, box);
    section.appendChild(el);
    registerDrgGlossaryTermChip(`word-${fenceSeq++}`, el);
    return el;
  };
  /** A revealed cover's "tap to hide" line: a Focusable that is not a stop and not registered. */
  const hideLine = (section: HTMLElement, box: Box): HTMLElement => {
    const el = document.createElement("div");
    el.className = "bonsai-spoiler-collapse-target Panel Focusable";
    el.setAttribute("tabindex", "0");
    place(el, box);
    section.appendChild(el);
    return el;
  };

  /** A control under the answer, outside its bubble (a choice button, Helpful, Show details): Steam glides to it and the lift runs. */
  const control = (box: Box): HTMLElement => {
    const el = document.createElement("div");
    el.className = "bonsai-reply-control Panel Focusable";
    el.setAttribute("tabindex", "0");
    place(el, box);
    pane.appendChild(el);
    return el;
  };

  /* Steam's glide to a stop that just took focus, applied once the press that moved the ring is over. */
  let landed: HTMLElement | null = null;
  pane.addEventListener("focusin", (event) => {
    landed = event.target as HTMLElement;
  });
  const glide = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const height = r.bottom - r.top;
    const small = height < 100;
    const measured = options.steamTopMargin ?? false;
    const inside = r.top >= paneTopY && r.bottom <= dockTopY + (measured ? STEAM_BOTTOM_SLACK_PX : 0);
    // The top margin: a small stop lying wholly above the 116 px line is moved down to it even though it is on
    // screen (the Deck: a cover at y 104 ended at 204, and one at 147 to 202 ended at 204). One that straddles
    // the line is left alone (the Deck kept covers at 167 to 222 and 182 to 237).
    const marginLine = paneTopY + STEAM_SCROLL_PADDING_TOP;
    const inTopMargin = measured && r.bottom < marginLine - STEAM_TOP_SLACK_PX;
    // A stop taller than the band got no glide on the Deck (plan77-BLOCK2-GAME.json: a 348 px box in a
    // 206 px band stayed exactly where the walk left it), so none is modelled for one.
    if (height > dockTopY - paneTopY) return;
    let target: number | null = null;
    if (steamScroll === "center" && small) target = paneTopY + (dockTopY - paneTopY - height) / 2;
    else if (steamScroll === "padded" && small && (!inside || inTopMargin)) target = marginLine;
    else if (!inside) target = paneTopY;
    if (target !== null) pane.scrollTop = Math.max(0, pane.scrollTop + r.top - target);
  };
  const settle = () => {
    const el = landed;
    landed = null;
    if (!el || el === bubble) return;
    if (steamScroll) glide(el);
    // The plugin's own lift, whose last pass (900 ms) comes after Steam's glide (150 ms).
    if (options.dockLift ?? true) liftForFocus(el);
  };

  const top = (el: HTMLElement) => el.getBoundingClientRect().top;
  const bottom = (el: HTMLElement) => el.getBoundingClientRect().bottom;
  /** The press Steam routes to the answer, the way buildAnswerBubbleElement's moveDown/moveUp do. */
  const down = () => {
    const handled = handleAnswerBubbleMoveDown(bubble, ref, sections.length, KEY);
    settle();
    return handled;
  };
  const up = () => {
    const ring = document.activeElement as HTMLElement | null;
    const handled = ring?.closest(".bonsai-spoiler-reveal-target, .bonsai-spoiler-collapse-target")
      ? handleUpFromSpoilerCover(bubble, sections.length, KEY)
      : handleAnswerBubbleMoveUp(bubble, ref, sections.length, KEY);
    settle();
    return handled;
  };
  /** Put the ring on `el` the way Steam does when a press lands there (the glide follows). */
  const land = (el: HTMLElement) => {
    el.focus();
    settle();
  };
  /** The ring enters the answer from the row above (the turn header's Down), then Steam's glide follows. */
  const enterFromAbove = () => {
    const handled = focusFirstAnswerChunk(KEY);
    settle();
    return handled;
  };
  /** The ring enters the answer from the row below (Up out of Show details), then Steam's glide follows. */
  const enterFromBelow = () => {
    const handled = focusLastAnswerChunk(KEY);
    settle();
    return handled;
  };
  return {
    pane, bubble, stops, cover, word, hideLine, control, top, bottom, down, up, land, enterFromAbove, enterFromBelow,
    dockTop: dockTopY, paneTop: paneTopY,
  };
}

/** Clear every registry and the page, for a test's beforeEach. */
export function resetDeckAnswerWalk(): void {
  resetAnswerStopRegistry();
  resetSpoilerFenceRegistry();
  resetDrgGlossaryTermRegistry();
  resetUiDocument();
  document.body.innerHTML = "";
}

/*
 * Whole-answer walks (plan 77 helper E). A shape is the answer's sections and hidden covers in page
 * coordinates; `walkAnswer` presses one way until the answer yields and reports every landing, so a
 * test can compare a walk Down with the walk Up and check each landing against the Deck's rule.
 */
export interface AnswerShape {
  sections: Box[];
  /** Covers as [section index, box]. */
  covers: Array<[number, Box]>;
  /** Where the panel is when the ring first lands on the answer. */
  start: number;
}

/** The Soul Sanctum answer, in the Deck's numbers: cover 1 + text, text, a lone cover, closing text. */
export const SOUL_SANCTUM: AnswerShape = {
  sections: [[265, 441], [449, 614], [622, 693], [701, 790]],
  covers: [[0, [273, 328]], [2, [630, 685]]],
  start: 69,
};

/** A cover-only section first, a section taller than the band with a cover at its head, a lone cover. */
export const THREE_COVERS: AnswerShape = {
  sections: [[265, 320], [328, 560], [568, 640], [648, 730]],
  covers: [[0, [267, 316]], [1, [336, 391]], [2, [576, 632]]],
  start: 100,
};

/** Two covers in the first section, one after the other, then a paragraph and a lone cover. */
export const TWO_COVERS_IN_ONE_SECTION: AnswerShape = {
  sections: [[265, 470], [478, 620], [628, 699]],
  covers: [[0, [273, 328]], [0, [336, 391]], [2, [636, 691]]],
  start: 69,
};

/** A cover deep inside a section taller than the band, between two short sections. */
export const DEEP_COVER: AnswerShape = {
  sections: [[265, 320], [328, 700], [708, 770]],
  covers: [[1, [520, 575]]],
  start: 100,
};

/**
 * Three boxes with no covers, each 135-146 px tall and so shorter than the band, laid out the way the
 * Deck's Soul Sanctum answer was (plan77-P77-WALK-COVERS-MIRROR-FREEPLAY.json): once one is fully read
 * the next starts below the dock. Down should land on the next box in one press.
 */
export const THREE_BOXES: AnswerShape = {
  sections: [[236, 382], [390, 525], [533, 668]],
  covers: [],
  start: 130,
};

/** One box 348 px tall in a 206 px band (dock at y 294), the game-running answer of plan77-BLOCK2-GAME.json. */
export const TALL_348: AnswerShape = {
  sections: [[300, 648]],
  covers: [],
  start: 100,
};

/** The same tall box with a short section above it and one below, so the walk enters and leaves it. */
export const TALL_348_BETWEEN: AnswerShape = {
  sections: [[236, 292], [300, 648], [656, 712]],
  covers: [],
  start: 100,
};

/**
 * The final smoke run's answer (plan77-P77-FINAL-SMOKE.json, `step3_down_list`), in page coordinates
 * worked out from each landing's y and scrollTop: a 222 px box (the Deck read 221) with its cover 24 px
 * down, a section that is only its cover (a 55 px cover with 8 px above and below, as the Deck's lone cover
 * measured), and a 90 px last box. Down from the cover-only section landed on the last box at y 201 to 291
 * (scrollTop 357) and the next press only scrolled it to 121 to 211 (scrollTop 437).
 */
export const FINAL_SMOKE: AnswerShape = {
  sections: [[265, 487], [487, 558], [558, 648]],
  covers: [[0, [289, 344]], [1, [495, 550]]],
  start: 0,
};

/**
 * Block 3 round 2's answer (plan77-P77-WALK-COVERS-MIRROR-R2.json, `down_list`): a 131 px box holding
 * cover 1, a 105 px box, a cover-only section and a 60 px last box. Down from cover 2 (y 204 to 259,
 * scrollTop 268) landed on the last box at 230 to 290 (scrollTop 305), and the next press only scrolled it
 * to 150 to 210 (scrollTop 385).
 */
export const ROUND_TWO: AnswerShape = {
  sections: [[228, 359], [359, 464], [464, 535], [535, 595]],
  covers: [[0, [251, 306]], [2, [472, 527]]],
  start: 0,
};

/**
 * Walk 2 of plan 78's Deck run (plan78-P78-DOWN-SHORT-SECTION.json): the Mantis Lords answer, two sections
 * of 180 and 195 px and no cover, worked out from the landings (section 1 at y 24 to 204 at scrollTop 256,
 * section 2 at 95 to 290 at 365). The reasoning line sat at 249 to 263 with the panel at 0, so the ring
 * comes into the answer from above with the panel at 0.
 */
export const MANTIS_LORDS: AnswerShape = {
  sections: [[280, 460], [460, 655]],
  covers: [],
  start: 0,
};

/**
 * Plan 78's Deck answer with a cover deep in a tall section (plan78-P78-TALL-SECTION-LOOP-BEFORE.json): one
 * 446 px section starting at content y 206 (page 294), its 55 px cover 383 px down, then the summary note
 * outside the answer. Down from the reasoning line (263-278, panel at 0) landed on the cover at 229 to 284,
 * scrollTop 448, the section's opening never on screen; Up from below was cover, then the section read upward.
 */
export const TALL_446: AnswerShape = {
  sections: [[294, 740]],
  covers: [[0, [677, 732]]],
  start: 0,
};

/**
 * The second such answer (plan78-QA-FREE-PLAY-01-NOGAME-try2.json, answer B): a 416 px section with its
 * cover 353 px down, then a section that is only a cover. Down from the reasoning line landed on cover 1 at
 * 229 to 284, scrollTop 418, then cover 2.
 */
export const TALL_416: AnswerShape = {
  sections: [[294, 710], [710, 781]],
  covers: [[0, [647, 702]], [1, [718, 773]]],
  start: 0,
};

/** Every Steam scroll rule the harness models, and none. */
export const WALK_RULES: Array<SteamScrollRule | undefined> = [undefined, "top", "padded", "center"];

/**
 * A dock at the Deck's 290, and a higher one at 262. A running game was once measured to lift it; on
 * 2026-10-01 it sat at 290 with Deep Rock running too (plan78-QA-FREE-PLAY-01-GAME-try3.json), so 262 is
 * kept as the harder case: a narrower band.
 */
export const WALK_DOCKS = [290, 262];

export function shapedAnswer(
  shape: AnswerShape,
  rule: SteamScrollRule | undefined,
  dockTop: number,
  options: Omit<DeckAnswerOptions, "dockTop"> = {}
) {
  const a = deckAnswer(shape.sections, shape.start, rule, { ...options, dockTop });
  const covers = shape.covers.map(([section, box]) => a.cover(a.stops[section]!, box));
  const label = (el: Element | null): string => {
    const c = covers.indexOf(el as HTMLElement);
    if (c >= 0) return `cover${c + 1}`;
    const s = a.stops.indexOf(el as HTMLDivElement);
    return s >= 0 ? `section${s + 1}` : "other";
  };
  return { ...a, covers, label };
}
export type ShapedAnswer = ReturnType<typeof shapedAnswer>;

/**
 * True when `el` is fully inside the readable band (below the tab header, above the dock), or, being
 * taller than it, shows the edge the walk enters it by: its top going Down, its bottom going Up (a
 * section taller than the band is read from its end when entered from below, so the reading is not
 * skipped past).
 */
export function fullyVisible(a: ShapedAnswer, el: HTMLElement, dir: "down" | "up"): boolean {
  const top = a.top(el);
  const bottom = a.bottom(el);
  const band = a.dockTop - a.paneTop;
  if (bottom - top > band) {
    return dir === "up" ? bottom <= a.dockTop + 4 && bottom > a.paneTop : top >= a.paneTop - 1 && top < a.dockTop;
  }
  // The bottom edge gets revealBelowDock's own 4 px of slack: a sliver that small is not "behind the dock".
  return top >= a.paneTop - 1 && bottom <= a.dockTop + 4;
}

/** The section holding the ring (or the ring itself, when it is a section), or null outside the answer. */
function sectionOf(a: ShapedAnswer, el: Element): HTMLDivElement | null {
  return a.stops.find((stop) => stop.contains(el)) ?? null;
}

/**
 * Press until the answer yields. `presses` names the ring after every press, `stops` folds the repeats
 * of a press that only scrolled, and `problems` lists what broke the rules: a dead press (nothing moved),
 * a landing that is not fully visible (a press that only scrolls is not a landing: the ring keeps the
 * stop it landed on, which slides as the panel moves), a press that leaves the ring in place while the
 * panel goes the wrong way, and a press that only scrolled while the ring's section fits the band: the
 * Deck's repeated stop (reading by scrolling is for a section taller than the band), also listed on its own
 * in `scrollOnly`. A stop taking the ring back after leaving it shows up in `stops`. `landings` is `stops`
 * without the hand-offs from a cover or word back to the section holding it, which are that section's
 * reading going on.
 * `checkVisible` false skips the visibility rule, for a shape (a cover deep in a tall section) where the
 * ring is meant to sit on a box whose top is far above the screen.
 */
export function walkAnswer(a: ShapedAnswer, dir: "down" | "up", limit = 40, checkVisible = true) {
  const presses: string[] = [a.label(document.activeElement)];
  const landings: string[] = [presses[0]!];
  const problems: string[] = [];
  const scrollOnly: string[] = [];
  let yielded = false;
  for (let i = 1; i <= limit; i += 1) {
    const before = document.activeElement;
    const scrollBefore = a.pane.scrollTop;
    if (!(dir === "down" ? a.down() : a.up())) {
      yielded = true;
      break;
    }
    const ring = document.activeElement as HTMLElement;
    const named = a.label(ring);
    presses.push(named);
    if (ring === before && a.pane.scrollTop === scrollBefore) problems.push(`press ${i}: dead (${named})`);
    // A press that leaves the ring where it is must at least carry the panel the way the press points
    // (reading a long section by scrolling); a panel that slides back and forth is a loop in the making.
    const moved = a.pane.scrollTop - scrollBefore;
    if (ring === before && (dir === "down" ? moved < 0 : moved > 0)) problems.push(`press ${i}: scrolled the wrong way (${named})`);
    const section = sectionOf(a, ring);
    const height = section ? a.bottom(section) - a.top(section) : 0;
    if (ring === before && moved !== 0 && section && height <= a.dockTop - a.paneTop) {
      const press = `press ${i}: only scrolled ${Math.abs(moved)} px on ${named}, whose section fits the band (${height} px)`;
      scrollOnly.push(press);
      problems.push(press);
    }
    // The ring handed from a cover or word to the section holding it, because a scroll carried that stop off
    // the screen, is the section's reading going on, not a landing: the section stays where the scroll left
    // it (the Deck's Up walk, plan78-P78-TALL-SECTION-LOOP-BEFORE.json: cover, then the section at -72 to
    // 374). It must still be on screen.
    const handedToItsSection = before instanceof HTMLElement && ring !== before && ring.contains(before);
    if (checkVisible && handedToItsSection && !(a.bottom(ring) > a.paneTop && a.top(ring) < a.dockTop)) {
      problems.push(`press ${i}: ${named} off screen after the hand-off (${a.top(ring)}..${a.bottom(ring)})`);
    }
    if (ring !== before && !handedToItsSection) landings.push(named);
    if (checkVisible && ring !== before && !handedToItsSection && !fullyVisible(a, ring, dir)) {
      problems.push(`press ${i}: ${named} not fully visible (${a.top(ring)}..${a.bottom(ring)}, band ${a.paneTop}..${a.dockTop})`);
    }
  }
  const stops = presses.filter((name, i) => i === 0 || name !== presses[i - 1]);
  return { presses, stops, landings, problems, scrollOnly, yielded };
}
