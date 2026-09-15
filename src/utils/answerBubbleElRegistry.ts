/**
 * Title: Finding an answer bubble's box on screen
 *
 * Purpose: Every reply the AI gives is drawn on screen as its own box, called a bubble. When the
 * D-pad walk between parts of a long reply needs to jump into a bubble, or needs to know which
 * bubble the player is currently looking at, it needs the real on-screen box for that reply, not
 * just its text. This file is the one place that keeps a note of "this reply's key points to this
 * box," so nothing else has to go looking for it on the page. Going looking would not work anyway:
 * the plugin's own window is a different page than the one Steam draws the chat into, so a normal
 * search of "the page" always comes back empty (see uiDocument.ts).
 *
 * Used for: buildAnswerBubbleElement, which notes the box down as it draws it; answerBubbleNavigation,
 * which walks between bubbles using that note; and liveTurnFocusGraph.
 *
 * Solves: without a shared note like this, the D-pad walk would have no way to get from "the reply
 * with this key" to "the box for it on screen."
 *
 * Does not: decide where the walk should land next — that is answerBubbleNavigation's job. This file
 * only remembers boxes and answers "where is this one."
 *
 * Gotchas:
 *   - Steam draws its own highlight ring around whatever the player is controlling with the D-pad or
 *     stick. That ring is Steam's own idea of where the player is, and it is not the same thing as
 *     the browser's ordinary idea of "the focused element" — the two can point at different places at
 *     once. Handing the ring from one part of the screen into a different part (for example, from the
 *     row of reply actions up into a glossary term chip inside a bubble) cannot be done by calling a
 *     plain `.focus()` — that only changes the browser's idea, and Steam keeps sending presses to
 *     wherever its own ring still is. `takeAnswerBubbleNavFocus` is the one call this project trusts
 *     to actually move Steam's ring across that kind of boundary, by calling `TakeFocus(true)` on the
 *     bubble's own navigation container. It is best-effort: the caller still has to land focus on a
 *     real element afterwards and check that it landed.
 *   - `resolveFocusedAnswerBubble` reads Steam's ring rather than the browser's `activeElement`, and
 *     that choice fixed a real bug. Two callers (`captureBubble` and `resolveAnswerBubbleEl`) use `??`
 *     to fall back when this returns nothing — but that fallback only catches an empty answer.
 *     Reading `activeElement` on the Steam Deck does not come back empty when it is wrong: it comes
 *     back pointing at a real box, often one left over from an earlier reply, so the fallback never
 *     fires and the wrong bubble gets noted down under the new reply's key. Everything downstream
 *     trusts that wrong note — a hidden-spoiler fence that is genuinely on screen is never found
 *     inside it, so pressing Down walks straight past the hidden text to the row of reply actions
 *     instead of revealing it. Measured on device 2026-08-26 (`runs/SPOILER-REVEAL-reachability.json`):
 *     a ten-step walk went bubble -> Helpful -> Retry -> ... and never reached a fence that should
 *     have been reachable. Turned out to be the same underlying bug as one already being tracked
 *     (MICRO-04), just one file further up the chain than first guessed.
 */
import { rememberUiDocument, uiGamepadFocusElement } from "./uiDocument";

const bubbleByKey = new Map<string, HTMLElement>();

/**
 * Steam's navigation node for each bubble, captured via the Focusable `navRef` prop.
 *
 * Exists for one caller: the reply-actions row handing the ring *into* the bubble (Up onto a
 * glossary chip). The bubble is a different navigation container, and a DOM `focus()` across that
 * boundary moves `activeElement` while Steam's ring stays put — `TakeFocus` first is the sanctioned
 * transfer, same shape as `utilityNavRef` in buildReplyActionsElement and the preset carousel's
 * navFocusRegistry entry.
 */
type BubbleNavHolder = { current: { TakeFocus?: (gamepad?: boolean) => unknown } | null };
const bubbleNavByKey = new Map<string, BubbleNavHolder>();

/** Called during buildAnswerBubbleElement's render; the holder fills in when Decky mounts it. */
export function registerAnswerBubbleNav(answerKey: string, holder: BubbleNavHolder): void {
  if (!answerKey) return;
  bubbleNavByKey.set(answerKey, holder);
}

/**
 * Hand Steam's gamepad focus to this bubble's navigation container. Best-effort by design: the
 * caller must still land focus on a concrete element afterwards and verify with `elementHasFocus`
 * — that verification, not this call, is what reports success.
 */
export function takeAnswerBubbleNavFocus(answerKey: string): void {
  try {
    bubbleNavByKey.get(answerKey)?.current?.TakeFocus?.(true);
  } catch {
    /* fall through — the caller's focus + verify decides the outcome */
  }
}

export function registerAnswerBubbleEl(answerKey: string, el: HTMLElement | null): void {
  if (!answerKey) return;
  // `el.isConnected` asks the node about its own tree. The previous `document.contains(el)` asked
  // SharedJSContext's shell document, which never contains our nodes, so nothing was ever stored
  // and every registry lookup missed (measured on device 2026-08-04).
  if (el && el.isConnected) {
    rememberUiDocument(el);
    bubbleByKey.set(answerKey, el);
    return;
  }
  bubbleByKey.delete(answerKey);
}

export function getRegisteredAnswerBubble(answerKey: string): HTMLElement | null {
  const el = bubbleByKey.get(answerKey);
  if (!el) return null;
  if (!el.isConnected) {
    bubbleByKey.delete(answerKey);
    return null;
  }
  return el;
}

/**
 * The answer bubble the gamepad ring is currently inside, or null when it is elsewhere.
 *
 * Reads the ring rather than `activeElement`, and the difference is not cosmetic. This is the FIRST
 * thing `captureBubble` and `resolveAnswerBubbleEl` try, and both use `??` to fall back — a guard
 * that only catches a *null* answer. `activeElement` on device does not come back null; it comes
 * back stale, often pointing into a previous turn's bubble. That returns a real, wrong element, the
 * fallback never fires, and `captureBubble` then re-registers the wrong bubble under this answer's
 * key. Everything downstream inherits it: `bubble.contains(fence)` is false for a fence that is on
 * screen and focusable, so the masked-spoiler diversion in `handleAnswerBubbleMoveDown` finds
 * nothing and Down walks straight past to the reply actions.
 *
 * That is the shape measured on device 2026-08-26 (`runs/SPOILER-REVEAL-reachability.json`): a
 * 10-step walk went bubble -> Helpful -> Retry -> ... and never reached a fence whose own
 * preconditions — Focusable, tabindex 0, inViewport, inScroller — all held.
 *
 * Same defect as MICRO-04, one file further up the chain than the roadmap's lead guessed.
 */
export function resolveFocusedAnswerBubble(): HTMLElement | null {
  const active = uiGamepadFocusElement();
  if (!active) return null;
  if (active.classList.contains("bonsai-chat-ai-bubble")) return active;
  return active.closest(".bonsai-chat-ai-bubble") as HTMLElement | null;
}
