/**
 * Title: Small D-pad nav helpers for the chat transcript
 * Purpose: A handful of standalone Focusable move handlers the transcript wires onto specific
 * rows — the permission-hint rows below it, the reply utility row's Down chain, the "N earlier"
 * pill's Left, and the first archived turn header's Up — each one fixing one measured device bug.
 * Used for: MainTabChatTranscript.tsx.
 * Solves: Keeps four small, independently-tested move handlers out of the transcript file's own
 * body, since none of them close over any of that component's state.
 * Does not: Decide when a row mounts or unmounts — the transcript still owns that; these only say
 * what a D-pad press on an already-mounted row should do.
 */
import { takeNavFocus } from "./navFocusRegistry";
import {
  focusContextChipLadder,
  focusContextHint,
  focusSessionContextStrip,
} from "./liveTurnFocusGraph";
import { isDeckDirectionLeftEvent } from "./focusNavigation";

/**
 * Hand the ring to whichever permission-hint row is mounted below the transcript — the
 * troubleshooting Ask hint's "Open Permissions", or the vac-check capability deny action's own
 * "Open Permissions" — using Steam's own transfer and nothing else.
 *
 * `focusChatPermissionHintRow` used to look these up by a registered *button* handle and land on it
 * with `focusDeckOwner`, a plain `.focus()` with a defensive `tabindex` stamp. Measured wrong on
 * device 2026-09-04 (build 49241e7, PERM-JUMP-01): the ring did not follow the DOM focus across the
 * container boundary (the standing rule this whole registry exists for), and separately the stamp
 * itself was corrupting — Steam's real Focusables carry no `tabindex` attribute on device at all, so
 * the "only stamp when one is missing" guard fired every time and the *wrapping* `.Panel.Focusable`
 * (the nearest ancestor `focusDeckOwner` climbs to, since the button itself lacked one) came away
 * `tabindex="-1"`, dropping the whole row out of Steam's nav graph. Both rows register a
 * `navRef` on their own wrapping Focusable (see MainTabChatTranscript.tsx's two `useEffect`s and
 * navFocusRegistry.ts), and this function is `takeNavFocus` only — no DOM query, no `.focus()`, no
 * tabindex of any kind.
 */
export function focusChatPermissionHintRow(): boolean {
  if (takeNavFocus("chat-perm-hint-troubleshoot")) return true;
  return takeNavFocus("chat-perm-hint-deny");
}

/**
 * Down from the reply utility row (Retry / Show details / Copy): this turn's own chip ladder or
 * collapsed hint first (closest, inside the turn's own Focusable), then whichever permission-hint
 * row is mounted just below the transcript, then the session context strip.
 *
 * Replaces a plain call to `focusDownFromReplyUtilityRow`, which only tried the ladder and hint
 * before falling to the strip — silently skipping the permission-hint rows because they are not
 * inside the live/turn slot `focusContextChipLadder`/`focusContextHint` search under. Filed
 * 2026-09-03: "The Open Permissions button under a blocked reply is not a D-pad stop"
 * (runs/PERM-JUMP-01-a-find-open-permissions.json — Down from Retry or Copy jumped straight to the
 * session strip).
 */
export function focusDownFromReplyUtilityRowOrPermHint(liveSlot: HTMLElement | null): boolean {
  if (focusContextChipLadder(liveSlot)) return true;
  if (focusContextHint(liveSlot)) return true;
  if (focusChatPermissionHintRow()) return true;
  return focusSessionContextStrip();
}

/**
 * Roadmap: "Left on the collapsed-history row throws the highlight out of the plugin". With the
 * ring on the "N earlier" pill, nothing claimed Left, so Steam's own "past the edge" navigation ran
 * and handed the ring to the Quick Access rail (measured twice,
 * docs/test-evidence/round35-BUG-left-from-earlier-pill-leaves-plugin.json and the retry file next
 * to it). There is no sibling to the pill's own left, so Left simply holds still — the same shape
 * given to the Ollama sliders for the identical escape (DeckFocusSlider.tsx, 2026-09-04): claim the
 * move on `onMoveLeft` itself, the handler Steam actually invokes, with the `onButtonDown` twin
 * only for the string-shaped presses tests and desktop keyboards deliver (focusNavigation.ts).
 */
export function earlierPillLeftNavHandlers(): Record<string, unknown> {
  return {
    onMoveLeft: () => true,
    onButtonDown: (button: unknown) => (isDeckDirectionLeftEvent(button) ? true : false),
  };
}

/**
 * Roadmap: "Up skips the answer sections and the chat slot row" — the archived-header half. With
 * the archive expanded, Up from the FIRST archived header ran 18 presses to the tab bar and
 * Decky's back button without the chat slot row ever taking the ring, though two Downs reach it
 * normally (measured 2026-09-04). `turnIndex` is only 0 for the header that genuinely has nothing
 * rendered above it in the transcript — when the "N earlier" pill hides the earlier turns, the
 * first VISIBLE header's `turnIndex` is `archivedRenderOffset` instead, so this stays undefined
 * for it and Up keeps its ordinary default there (onto the pill row, its real sibling above).
 * Every other header also gets undefined, so Up on those still lands on the header above them —
 * same shape as the preset chips' `exitUp` (MainTabPresetAnimatedChips.tsx).
 */
export function firstArchivedHeaderMoveUp(turnIndex: number): (() => boolean) | undefined {
  return turnIndex === 0 ? () => takeNavFocus("chat-slot-row") : undefined;
}
