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
import { refocusPanelWindowIfLost, takeNavFocus, type NavRefHolder } from "./navFocusRegistry";
import {
  focusContextChipLadder,
  focusContextHint,
  focusSessionContextStrip,
} from "./liveTurnFocusGraph";
import { isDeckDirectionLeftEvent, isDownDeckButtonEvent, isUpDeckButtonEvent } from "./focusNavigation";
import { takeOpenQuestionText } from "./buildTurnHeaderElement";
import { elementHasGamepadFocus } from "./uiDocument";
import { focusUpPastLiveKbNotesBlock } from "./buildKbNotesBlockElement";
import { pressThenHandRingOn } from "./handRingOnWhenGone";
import { takeChipSlotFocus } from "../features/details-slot/detailsSlotStore";
import { topStripActive } from "../features/chat-title/deckyHeaderShape";

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
 * row is mounted just below the transcript, then the session context strip, then the slot above the
 * question box (the chips, or the Show details line standing in for them).
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
  if (focusSessionContextStrip()) return true;
  /*
   * Then the slot above the question box, whichever face it shows: the Show details line standing in
   * for the chips, or the chips. Left unclaimed this fell to Steam's own step, which reads no CSS and
   * so chose the hidden chip while the line held the slot -- an invisible stop, with the ring drawn on
   * screen staying on Show details, and never the line itself (plan81-QA-FREE-PLAY-01-NOGAME.json).
   */
  return takeChipSlotFocus();
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

/** The "N earlier" line's Steam nav node: the transcript is the only one that draws it. */
export const earlierPillNav: NavRefHolder = { current: null };

/**
 * One nav node per day line (plan 79). A shared holder would be filled by whichever day line Steam
 * mounted last, so the question's Up would climb to the wrong one; the holders are kept by day key so
 * they stay the same object across renders, as the question text's own are (buildTurnHeaderElement).
 */
const dayLineNavByKey = new Map<string, NavRefHolder>();
export function dayLineNav(dayKey: string): NavRefHolder {
  let holder = dayLineNavByKey.get(dayKey);
  if (!holder) {
    holder = { current: null };
    dayLineNavByKey.set(dayKey, holder);
  }
  return holder;
}

/**
 * The Steam nav node of a day's "Show N more" line (kept apart from the day line's own, so the
 * question drawn under it can send Up to exactly this line).
 */
export function moreLineNav(dayKey: string): NavRefHolder {
  return dayLineNav(`more:${dayKey}`);
}

/** The "N earlier" line's element while it is on screen, so a press from outside can tell it is there. */
let earlierLineEl: HTMLElement | null = null;
export function registerEarlierLineEl(el: HTMLElement | null, prev?: HTMLElement | null): void {
  if (el) earlierLineEl = el;
  else if (prev && earlierLineEl === prev) earlierLineEl = null;
}

/**
 * Hand the ring to the "N earlier" line, when it is drawn (Down from the chat slot row, plan 79).
 * The line is the first stop under the slot row whenever it shows, opened or closed, so the press
 * must land there and never on a question or day line below it. False when there is no line, which
 * leaves the first question's text as the target (fewer than two earlier questions).
 */
export function takeEarlierLine(): boolean {
  if (!earlierLineEl?.isConnected) return false;
  return takeHolderFocus(earlierPillNav);
}

/**
 * The "N earlier" pill's moves: Left holds still (above) and Down goes to the question below it
 * (plan 79). `nextTurnId` is the turn drawn right under the pill. Left alone, Steam entered that
 * turn's row on its first control, which is Retry, so Down stopped on Retry before the question
 * (docs/test-evidence/plan79-P79-M8-EARLIER-RETRY.json). The transfer goes onto the question text;
 * a next turn without Retry has no such stop, the call reports false and Down stays Steam's own.
 */
export function earlierPillNavHandlers(
  nextTurnId: string | null | undefined,
  nav: NavRefHolder = earlierPillNav
): Record<string, unknown> {
  /* The line's own nav node, so the question's Up can hand the ring back to it (questionMoveUpOut).
     Day lines pass their own holder: each line needs one of its own. */
  const left: Record<string, unknown> = { ...earlierPillLeftNavHandlers(), navRef: nav };
  if (!nextTurnId) return left;
  const down = () => takeOpenQuestionText(nextTurnId);
  return {
    ...left,
    onMoveDown: down,
    onButtonDown: (button: unknown) => {
      if (isDownDeckButtonEvent(button)) return down();
      return (left.onButtonDown as (b: unknown) => boolean)(button);
    },
  };
}

/** Steam's transfer onto a nav node held in a ref, with the same window check `takeNavFocus` makes. */
export function takeHolderFocus(holder: NavRefHolder): boolean {
  const node = holder.current;
  if (!node || typeof node.TakeFocus !== "function") return false;
  refocusPanelWindowIfLost();
  try {
    return node.TakeFocus(true) !== false;
  } catch {
    return false;
  }
}

/**
 * Steam's ring onto the stop right above the chat: Up from the chat's first stop, and Up from the
 * suggestion chips on an empty chat. That was the saved-chats row until plan 84 step 5 removed it,
 * then the tab bar. Since plan 84 step 6 moved the tab bar into Steam's strip above Decky's bar, it is
 * the chat's name in Decky's bar; when Decky's bar could not be reshaped, the tab bar is still in
 * bonsAI's box right above the chat, and it is the tab bar. Both by their registered nav nodes. False
 * when nothing is registered, and the caller leaves the press to Steam.
 */
export function takeAboveTheChat(): boolean {
  if (topStripActive() && takeNavFocus("chat-name")) return true;
  return takeNavFocus("tab-bar");
}

/**
 * Where Up goes from the open question's text, past its row (plan 79). `above` is the nav node of
 * whatever is drawn right over the question's row: the previous turn's closed header or the "N
 * earlier" pill. With nothing over it, the stop above the chat (`takeAboveTheChat`), the same target
 * the first header's own Up has. Never Retry: an Up left to Steam picks Retry, the nearest stop in the row (Deck,
 * plan79-P79-M8-EARLIER-RETRY-AFTER.json). The transfer is Steam's own, since the target is a
 * different container.
 */
export function questionMoveUpOut(above: NavRefHolder | null | undefined): () => boolean {
  return () => (above ? takeHolderFocus(above) : takeAboveTheChat());
}

/**
 * The "N earlier" line's moves, which are `earlierPillNavHandlers` plus Up to the stop above the
 * chat (plan 79; the saved-chats row until plan 84 step 5, the tab bar since). The line is always the first stop in the transcript once there are earlier turns.
 * Opened or closed, nothing above it is a sibling for Steam to climb to, which is the shape that
 * ran 18 Up presses to the tab bar without the slot row ever taking the ring
 * (`firstArchivedHeaderMoveUp` below, measured 2026-09-04): so the line claims Up the same way the
 * first question row did before the line stayed on screen. `nextTurnId` is null while the day
 * lines are showing, since the next stop down is then a day line and Steam's own Down is right.
 */
export function earlierLineNavHandlers(nextTurnId: string | null | undefined): Record<string, unknown> {
  const base = earlierPillNavHandlers(nextTurnId);
  const up = () => takeAboveTheChat();
  return {
    ...base,
    onMoveUp: up,
    onButtonDown: (button: unknown) => {
      if (isUpDeckButtonEvent(button)) return up();
      return (base.onButtonDown as (b: unknown) => boolean)(button);
    },
  };
}

/**
 * What Down does on a closed question whose next turn may carry Retry (plan 79): the same transfer
 * onto that turn's question text, so the ring does not stop on Retry on the way in. Undefined when
 * no turn follows, which leaves Down exactly Steam's.
 */
export function closedQuestionMoveDown(nextTurnId: string | null | undefined): (() => boolean) | undefined {
  return nextTurnId ? () => takeOpenQuestionText(nextTurnId) : undefined;
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
 * same shape as the preset chips' `exitUp` (MainTabPresetAnimatedChips.tsx). The target was the chat
 * slot row; since plan 84 step 5 removed it, it is the stop above the chat (`takeAboveTheChat`).
 */
export function firstArchivedHeaderMoveUp(turnIndex: number): (() => boolean) | undefined {
  return turnIndex === 0 ? () => takeAboveTheChat() : undefined;
}

/**
 * The troubleshooting hint row's own moves: [Open Permissions] [Dismiss] side by side.
 *
 * Plan 70, PERMS-CLEAN-06 (docs/test-evidence/plan70-PERMS-CLEAN-05-06.json): Right from Open
 * Permissions did nothing, twice, so Dismiss was visible but out of reach. The row's
 * `flow-children="horizontal"` hint alone does not make Steam walk a row sideways, the same finding
 * as the chip row (presetRowNav.ts, 2026-09-01), so Left and Right are claimed here and move between
 * the two buttons with a plain focus() -- two siblings in this one container. Both ends hold still:
 * Steam's own "past the edge" is the Quick Access rail.
 *
 * Down goes to the ban-lookup row when it sits below, else to the slot above the question box (the
 * chips, or the Show details line standing in for them: left to Steam, the press chose a hidden chip,
 * plan81-QA-FREE-PLAY-01-NOGAME.json). The old Down aimed at the session context strip, which plan 62
 * removed. Up is unchanged.
 */
export function troubleshootHintRowNavHandlers(buttons: {
  current: (HTMLElement | null)[];
}): Record<string, unknown> {
  const step = (from: number, to: number): boolean => {
    const [src, dst] = [buttons.current[from], buttons.current[to]];
    if (src && dst?.isConnected && elementHasGamepadFocus(src)) {
      try {
        dst.focus();
      } catch {
        /* holds still; the press stays claimed either way */
      }
    }
    return true;
  };
  return {
    onMoveRight: () => step(0, 1),
    onMoveLeft: () => step(1, 0),
    onMoveUp: focusUpPastLiveKbNotesBlock,
    onMoveDown: () => takeNavFocus("chat-perm-hint-deny") || takeChipSlotFocus(),
  };
}

/**
 * Down from the ban-lookup row: the last row under a blocked reply, so what follows is the slot above
 * the question box (the chips, or the Show details line standing in for them). Left to Steam the press
 * chose the hidden chip while the line held the slot (plan81-QA-FREE-PLAY-01-NOGAME.json).
 */
export function vacDenyRowMoveDown(): boolean {
  return focusSessionContextStrip() || takeChipSlotFocus();
}

/**
 * Up from the ban-lookup row: the troubleshooting hint sits right above it when both show, and
 * walking Up used to skip it (plan70-PERMS-CLEAN-05-06.json).
 */
export function vacDenyRowMoveUp(): boolean {
  return takeNavFocus("chat-perm-hint-troubleshoot") || focusUpPastLiveKbNotesBlock();
}

/**
 * A on the troubleshooting hint's Dismiss removes the whole hint, button included, and left the ring
 * on nothing (plan70-L5-PERMS-CLEAN-06.json). Once the hint is gone, hand the ring to the next row
 * down through Steam's own transfer: the ban-lookup row when it shows, else the chip's slot, which is
 * the Show details line while an answer is read (the chips are hidden then, plan 79), else the chips.
 */
export function dismissHintKeepingRing(
  buttons: { current: (HTMLElement | null)[] },
  dismiss: () => void,
): void {
  pressThenHandRingOn(buttons.current[1], dismiss, () => {
    void (
      takeNavFocus("chat-perm-hint-deny") ||
      takeChipSlotFocus()
    );
  });
}
