/**
 * Title: Left out to Steam's menu: the one count every dead end shares (plan 105, lane C5)
 *
 * Purpose: Where bonsAI holds Left on purpose and nothing moves (the paperclip, an answer's sections, the first
 * suggestion chip, the "N earlier" line, a slider at its first stop and the rest), the first and second Left in a
 * row still hold the ring still, as the shipped fix made them (row LEFT-HOLDS-STILL-01), and the third goes to
 * Steam, which carries the ring out to its own side menu. The maintainer's call 19: "when Left has nowhere to go
 * inside bonsAI, the third Left in a row hands the press to Steam; the tab bar keeps wrapping."
 *
 * Used for: every such dead end's own Left handler (`leftAtEdge`), the sliders' first stop, and the "N earlier"
 * line's flip (`leftEdgePress`). Places where Steam already lets Left out on the first press are not counted:
 * the Deck showed them working (workshop:test-evidence/plan105-P105-M-LEFT-EDGES.json).
 *
 * Solves: Two shipped promises that pull apart. A stray Left must not throw the ring out of the plugin (the
 * 2026-09-16 fix, commits b7420f0 and 42aafe1); and a person pressing Left on purpose must reach Steam's menu,
 * the way other plugins let you out (roadmap, asked 2026-11-11). One or two stray Lefts hold; three in a row leave.
 *
 * Does not: Move the ring. The hand-off is a declined press: the handler returns false and Steam's own Left runs,
 * the same step that took the ring to the rail before the 2026-09-16 fix. No transfer, no `focus()`, no page
 * search. Does not count Right: the right ends keep holding.
 *
 * How it works:
 * 1. A run is Lefts in a row at one dead end that each moved nothing. `leftEdgePress(place)` adds one for a fresh
 *    press; the third returns "leave" and the run starts again from nothing.
 * 2. Held down, Left repeats. Only a fresh press counts: a repeat holds and never leaves. Steam marks a repeat
 *    in the press it sends to the panel's page (`vgp_onbuttondown`, `detail.is_repeat`); a listener on that page,
 *    in the capture phase, notes each Left it hears, fresh or repeat. A call counts when a fresh Left was heard
 *    since the last call, or when the handler itself was handed a press marked fresh. A call with only repeats
 *    heard is "repeat". A call with nothing heard at all is "unheard": not counted either (the safer side, so a
 *    held Left can never leave), but a place whose Left also does something (the "N earlier" line's flip) still
 *    does it, as before this file. The very first call, made before the listener could hear anything, counts:
 *    a held first press then counts once and its repeats, heard, do not.
 * 3. The run starts again on: any other button the plugin knows (Up, Down, Right, A, B, X, Y, View, Menu, the
 *    shoulders and triggers), heard at the same page; a finger on the screen; the panel hiding or showing; a
 *    Left at another place or with Steam's ring on another control than the last counted one; about two seconds
 *    with no Left (`LEFT_RUN_PAUSE_MS`, so two old Lefts and a stray one never leave); `leftActedInPlace()` (a
 *    slider step); and the hand-off itself, so after coming back with Right a stray Left holds again. A button
 *    code it does not know (stick or pad touches, the back buttons) neither counts nor starts the run again.
 * 4. The listeners go on the panel's document the first time a dead end is pressed, and again on a new
 *    document (a reload): no hook, no component.
 */
import { getUiDocument, uiGamepadFocusElement } from "./uiDocument";

/** The Left in a row that goes to Steam. */
export const LEFT_PRESSES_TO_LEAVE = 3;
/** With no Left for this long, a run starts again (consult 7: "about two seconds"). */
export const LEFT_RUN_PAUSE_MS = 2000;

/**
 * What one Left at a dead end does: hold and count it ("held"), hold a held-down repeat ("repeat"), hold a press the
 * page did not hear ("unheard"), or hand the press to Steam ("leave").
 */
export type LeftEdgeOutcome = "held" | "repeat" | "unheard" | "leave";

/** Steam's button numbers (`@decky/ui`, `components/FooterLegend.d.ts`, `GamepadButton`; as focusNavigation.ts). */
const DIR_LEFT = 11;
/** Every other button the plugin knows: A, B, X, Y, the shoulders, the triggers, Up, Down, Right, View, Menu. */
const OTHER_BUTTONS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14]);

type Run = { count: number; place: string | null; stop: Element | null; lastAt: number };
const empty = (): Run => ({ count: 0, place: null, stop: null, lastAt: 0 });
let run: Run = empty();
/** What the panel's page heard of Left since the last call at a dead end: a fresh press, a repeat. */
let heardFresh = false;
let heardRepeat = false;
const listening = new WeakSet<Document>();

function restart(): void {
  run = empty();
}

/** The button number and the repeat mark of a press, from Steam's event or its detail; null for anything else. */
function readPress(evt: unknown): { button: number; repeat: boolean | null } | null {
  const detail = (evt as { detail?: { button?: unknown; is_repeat?: unknown } } | null | undefined)?.detail;
  if (!detail || typeof detail.button !== "number") return null;
  return { button: detail.button, repeat: typeof detail.is_repeat === "boolean" ? detail.is_repeat : null };
}

function onPress(evt: Event): void {
  const press = readPress(evt);
  if (!press) return;
  if (press.button === DIR_LEFT) {
    if (press.repeat === true) heardRepeat = true;
    else heardFresh = true;
  } else if (OTHER_BUTTONS.has(press.button)) {
    heardFresh = false;
    heardRepeat = false;
    restart();
  }
}

/** Listen on the panel's document once; true when this call put the listeners on (nothing could be heard yet). */
function listen(doc: Document): boolean {
  if (listening.has(doc)) return false;
  listening.add(doc);
  doc.addEventListener("vgp_onbuttondown", onPress, true);
  doc.addEventListener("pointerdown", restart, true);
  doc.addEventListener("visibilitychange", restart);
  return true;
}

/**
 * In: the dead end's name (one per kind of place, e.g. "ask-paperclip") and, when Steam hands the move handler
 * its press, that press. Out: "held" (claim it, the run counted one), "repeat" (claim it, a held-down Left that
 * does not count), "unheard" (claim it, nothing heard for it, not counted) or "leave" (decline it, so Steam's own
 * Left takes the ring out).
 * Can go wrong: nothing; with no panel document yet the global one is used.
 */
export function leftEdgePress(place: string, evt?: unknown): LeftEdgeOutcome {
  const firstHearing = listen(getUiDocument());
  const own = readPress(evt);
  const said = own?.button === DIR_LEFT && own.repeat !== null;
  const fresh = said ? !own!.repeat : heardFresh || firstHearing;
  const heard = said || heardFresh || heardRepeat || firstHearing;
  heardFresh = false;
  heardRepeat = false;
  const now = Date.now();
  const stop = uiGamepadFocusElement();
  if (run.place !== place || run.stop !== stop || now - run.lastAt > LEFT_RUN_PAUSE_MS) {
    run = { count: 0, place, stop, lastAt: now };
  }
  run.lastAt = now;
  if (!fresh) return heard ? "repeat" : "unheard";
  run.count += 1;
  if (run.count < LEFT_PRESSES_TO_LEAVE) return "held";
  restart();
  return "leave";
}

/** A dead end's Left: true holds the ring (the press is claimed), false hands the press to Steam. */
export function leftAtEdge(place: string, evt?: unknown): boolean {
  return leftEdgePress(place, evt) !== "leave";
}

/** A Left that changed something without moving the ring (a slider step): it is not part of a run. */
export function leftActedInPlace(): void {
  restart();
}

/** Test-only: forget the run and what was heard (the listeners stay on documents a test throws away). */
export function resetLeftEdgeForTests(): void {
  restart();
  heardFresh = false;
  heardRepeat = false;
}
