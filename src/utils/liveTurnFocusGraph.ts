/**
 * Title: Live turn focus graph
 * Purpose: D-pad focus helpers for the live Ask turn (answer bubble → strategy branches → checklist → reply actions).
 * Used for: Main-tab chat transcript focus graph on Steam Deck.
 * Solves: Decky focus lives on `.Panel.Focusable`; inner button focus and querySelector hops fail on device.
 * Does not: Register reply stop DOM nodes (see replyStopRegistry) or render turn UI.
 */

import { focusRegisteredReplyStop, type ReplyStopId } from "./replyStopRegistry";
import { elementHasFocus, getUiDocument } from "./uiDocument";
import { focusRowElement } from "./focusPerTurnRow";
import { takeNavFocus } from "./navFocusRegistry";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function deckNavHandlers(handlers: Record<string, () => boolean | void>): Record<string, unknown> {
  return handlers as unknown as Record<string, unknown>;
}

/**
 * Deck gamepad focus lives on `.Panel.Focusable`, not the inner native `<button>`.
 * Focusing the inner node often "succeeds" for activeElement checks while Decky still
 * treats the previous Focusable as the owner — then the next D-pad hop skips siblings.
 */
export function focusDeckOwner(el: HTMLElement | null | undefined): boolean {
  if (!el) return false;
  const panel = (
    el.matches(".Panel.Focusable") ? el : el.closest(".Panel.Focusable")
  ) as HTMLElement | null;
  const target = panel ?? el;
  /*
   * Stamp a synthetic tabindex only on a plain element of ours (no `.Panel.Focusable` found at all,
   * so `target` fell back to `el` itself) — never on a genuine Steam Focusable (`panel` non-null).
   *
   * The guard used to be "stamp whenever one is missing", on the theory that Decky's own Focusables
   * always carry a real `tabindex` (so an absent one safely meant "ours to manage") — see
   * REPLY-DOWN-01 (2026-08-04, docs/testing.md), the first time that theory cost a working stop:
   * `focusRegisteredReplyStop` stamped `tabindex="-1"` straight onto Retry and its row using the
   * same reasoning. That is fixed there by skipping native `<button>`/`<a>`/etc. (replyStopRegistry.ts
   * `ensureFocusable`), but this function has no such element-type check, and the theory itself is
   * false on at least one build: measured on device 2026-09-04 (build 49241e7, PERM-JUMP-01's redo)
   * with the ring genuinely on Retry, Copy and Open Permissions in turn, every one of them read
   * `tabindex: null` — real Steam Focusables carry no `tabindex` attribute at all here. The old guard
   * therefore fired on every one of them, and stamping the wrapping `.Panel.Focusable` a caller had
   * climbed to (`panel`) is what corrupted `.bonsai-chat-vac-deny-row` and dropped it from Steam's
   * nav graph. `panel` already tells us, independent of the tabindex attribute, whether `target` is
   * one of Steam's own nodes: if climbing (or a direct match) found one, it needs nothing from us —
   * Steam manages its own focus semantics regardless of what the DOM attribute says — and only the
   * `el`-is-not-a-Focusable-at-all fallback case is genuinely ours to make focusable.
   *
   * Trade-off, stated rather than hidden: a bare `.Panel.Focusable` that has no tabindex on device
   * AND no natively-focusable descendant to fall back to (the `el.focus()` a few lines down) now
   * honestly reports `false` instead of a stamp-assisted `true` that never actually carried Steam's
   * ring anyway — every caller in this file already treats `false` as "try the next option", so that
   * is a safe direction to be wrong in. What is UNKNOWN, not measured, is whether this file's other
   * `focusDeckOwner` targets (`.bonsai-context-hint`, `.bonsai-chip-ladder`, a session-context row)
   * are in that no-fallback shape on this same build — if one of them starts returning `false` where
   * it used to return a stamp-assisted `true`, that is this trade-off, not a new defect, and the fix
   * is the same one PERM-JUMP-01 needed: a registered `navRef` for that target instead of a page
   * query plus a plain `focus()`.
   */
  if (!panel && !target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
  // Asked of the element's own document: the global one belongs to SharedJSContext (uiDocument.ts),
  // so the old `contains(document.activeElement)` check reported failure on every successful move.
  if (elementHasFocus(target)) return true;
  el.focus({ preventScroll: true });
  return elementHasFocus(el);
}

export function queryLiveTurnSlot(root?: HTMLElement | Document | null): HTMLElement | null {
  // Note the fallbacks resolve to the UI document, not the global one — see uiDocument.ts.
  const scope = root ?? getUiDocument();
  const header =
    scope.querySelector?.(".bonsai-chat-turn-row-header--live") ??
    getUiDocument().querySelector(".bonsai-chat-turn-row-header--live");
  return (header?.closest(".bonsai-chat-turn-slot") as HTMLElement | null) ?? null;
}

/**
 * Slot for any turn by id — the archived-turn counterpart to `queryLiveTurnSlot`.
 *
 * Every helper below takes a slot and searches inside it, so they work on an archived turn as
 * soon as one can be resolved. Needed because a completed Ask is now archived and expanded rather
 * than left live (useChatSlots.applySlotTranscript), which put Show details and the chip ladder on
 * a slot that `queryLiveTurnSlot` cannot see. Without this the row renders with no move handlers
 * and D-pad Down escapes to whatever follows in document order.
 */
export function queryTurnSlot(
  turnId: string,
  root?: HTMLElement | Document | null
): HTMLElement | null {
  const scope = root ?? getUiDocument();
  const selector = `[data-bonsai-turn-id="${turnId}"]`;
  const header =
    scope.querySelector?.(selector) ?? getUiDocument().querySelector(selector);
  return (header?.closest(".bonsai-chat-turn-slot") as HTMLElement | null) ?? null;
}

function focusablesIn(container: ParentNode): HTMLElement[] {
  const all = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  const visible = all.filter((el) => el.getClientRects().length > 0);
  return visible.length > 0 ? visible : all;
}

function branchButtons(liveSlot: HTMLElement | null): HTMLElement[] {
  const branch = liveSlot?.querySelector(".bonsai-strategy-branch-picker");
  if (!branch) return [];
  const preferred = Array.from(
    branch.querySelectorAll<HTMLElement>("button.bonsai-strategy-branch-btn, button.bonsai-chat-secondary-btn")
  ).filter((b) => !(b as HTMLButtonElement).disabled);
  if (preferred.length) return preferred;
  return Array.from(branch.querySelectorAll<HTMLElement>("button")).filter(
    (b) => !(b as HTMLButtonElement).disabled
  );
}

function focusLiveAnswerBubble(liveSlot: HTMLElement | null): boolean {
  const bubble = liveSlot?.querySelector<HTMLElement>(".bonsai-chat-ai-bubble");
  return focusDeckOwner(bubble);
}

function focusStrategyBranchButton(
  liveSlot: HTMLElement | null,
  which: "first" | "last" | number
): boolean {
  const buttons = branchButtons(liveSlot);
  if (!buttons.length) return false;
  const target =
    typeof which === "number"
      ? buttons[which]
      : which === "first"
        ? buttons[0]
        : buttons[buttons.length - 1];
  return focusDeckOwner(target);
}

function focusStrategyChecklistToggle(liveSlot: HTMLElement | null, which: "first" | "last"): boolean {
  const panel = liveSlot?.querySelector(".bonsai-strategy-checklist-panel");
  if (!panel) return false;
  const toggles = focusablesIn(panel);
  const target = which === "first" ? toggles[0] : toggles[toggles.length - 1];
  return focusDeckOwner(target);
}

function focusReplyThumbsRow(liveSlot: HTMLElement | null): boolean {
  return focusReplyHelpful(liveSlot);
}

/**
 * Focus a reply-actions cell via the mount-time ref registry.
 * `document.querySelector` returns null on Deck for these nodes (proven ok/found:false);
 * registered Button refs are the reliable focus targets.
 */
function focusReplyStop(
  _liveSlot: HTMLElement | null,
  stop: ReplyStopId,
): boolean {
  return focusRegisteredReplyStop(stop);
}

export function focusReplyHelpful(liveSlot: HTMLElement | null): boolean {
  return focusReplyStop(liveSlot, "helpful");
}

export function focusReplyNotReally(liveSlot: HTMLElement | null): boolean {
  return focusReplyStop(liveSlot, "not-really");
}

export function focusReplyRetry(liveSlot: HTMLElement | null): boolean {
  return focusReplyStop(liveSlot, "retry");
}

export function focusReplyShowDetails(liveSlot: HTMLElement | null): boolean {
  return focusReplyStop(liveSlot, "show-details");
}

/** The Read aloud / Stop line, one row above Show details (plan 42 step 3). */
export function focusReplyReadAloud(liveSlot: HTMLElement | null): boolean {
  return focusReplyStop(liveSlot, "read-aloud");
}

/**
 * The Show reasoning line between an open question and its answer (plan 57).
 *
 * Mounted only on a turn whose model thought before it answered, so this reports false on every
 * ordinary turn and the caller carries on to whatever it would have done — which is how the
 * question header's Down keeps working unchanged on a turn with no reasoning.
 */
export function focusReplyShowReasoning(liveSlot: HTMLElement | null): boolean {
  return focusReplyStop(liveSlot, "show-reasoning");
}

function focusReplyCopy(liveSlot: HTMLElement | null): boolean {
  return focusReplyStop(liveSlot, "copy");
}

/**
 * Retry -> Copy: whichever of the utility row's columns is actually mounted.
 *
 * Show details is no longer one of them — it is the line below the row now (D76) — so it is not
 * tried here. Callers that mean the line ask for it by name.
 */
export function focusReplyUtilityRow(liveSlot: HTMLElement | null): boolean {
  if (focusReplyRetry(liveSlot)) return true;
  return focusReplyCopy(liveSlot);
}

/**
 * Focus one of OUR OWN bare `.Panel.Focusable` rows, the ones this plugin renders itself.
 *
 * `focusDeckOwner` above deliberately will not do this, and it is right not to: it climbs to the
 * nearest `.Panel.Focusable` ancestor, which is often one of Steam's, and stamping a `tabindex` on
 * one of those is what dropped a permission row out of Steam's navigation on 2026-09-04. But our
 * own rows -- the chip ladder, the details tabs row, the "From the notes" block -- carry no
 * `tabindex` on device either and hold nothing natively focusable inside them, so `focusDeckOwner`
 * honestly reports false for them and the caller's move dies. Measured on the Deck 2026-09-21: the
 * chip ladder was in exactly that state and Up/Down past it walked out of the plugin entirely.
 *
 * The distinction that makes this safe is ownership, not shape. This only ever touches an element
 * whose own class list says it is ours, never an ancestor, and never Steam's. It is the same thing
 * the transcript's own per-turn helper does, which is measured carrying Steam's ring correctly.
 */
export function focusOwnBonsaiRow(el: HTMLElement | null | undefined): boolean {
  if (!el) return false;
  const ours = Array.from(el.classList).some((c) => c.startsWith("bonsai-"));
  if (!ours) return false;
  return focusRowElement(el);
}

/**
 * The lowest stop inside the newest reply on screen -- what Up from the dock should reach.
 *
 * Roadmap: "Walking up from the question box skips every reply row". Measured on the Deck
 * 2026-09-21: Up from the suggestion chip went straight to the chat slot row, stepping over the
 * question row, the thinking line, every answer section, Read aloud, Show details and the notes
 * block. The cause is a leftover, not a missing handler. The chips' own `exitUp` aimed at the
 * session context strip, which WAS the last stop above the dock -- until plan 62 3c folded that
 * strip into the Show details panel as a tab and removed it. With nothing registered under that
 * name any more, `takeNavFocus` correctly reported false every time and the fallback to the chat
 * slot row ran on every press, which is the whole bug.
 *
 * Tried in bottom-up order, so Up lands on the nearest thing above the dock rather than the top of
 * the reply: the open details panel's own content first (the chip ladder for "This answer", the
 * session list for "Session"), then the tabs row itself, then the notes block, then the Show
 * details line, then the reply's utility row. Each one reports false when it is not mounted, so a
 * closed panel, a reply with no notes and an empty chat all fall through cleanly.
 */
export function focusBottomOfNewestReply(): boolean {
  const doc = getUiDocument();
  const slots = doc.querySelectorAll<HTMLElement>(".bonsai-chat-turn-slot");
  const slot = slots.length > 0 ? slots[slots.length - 1] : null;
  if (!slot) return false;
  const bottomUp = [
    ".bonsai-details-session-body",
    ".bonsai-chip-ladder",
    ".bonsai-details-tabs-row",
    ".bonsai-kb-notes-block",
  ];
  for (const selector of bottomUp) {
    if (focusOwnBonsaiRow(slot.querySelector<HTMLElement>(selector))) return true;
  }
  if (focusReplyShowDetails(slot)) return true;
  return focusReplyUtilityRow(slot);
}

export function focusLastReplyChip(liveSlot: HTMLElement | null): boolean {
  const reply = liveSlot?.querySelector(".bonsai-chat-reply-actions");
  if (!reply) return false;
  const chips = reply.querySelectorAll<HTMLElement>(
    ".bonsai-chat-reply-actions-row--chips button.bonsai-chat-secondary-btn"
  );
  const last = chips[chips.length - 1];
  return focusDeckOwner(last);
}

/**
 * After answer bubble scroll is exhausted: branch → checklist → thumbs → Retry/Copy → the Read
 * aloud line → Show details. The last two are the fallback for an answer with no thumbs and no
 * corner buttons, so the ring never falls through to Steam's geometry guess past the new line.
 */
export function focusDownFromLiveAnswerBubble(liveSlot: HTMLElement | null): boolean {
  if (focusStrategyBranchButton(liveSlot, "first")) return true;
  if (focusStrategyChecklistToggle(liveSlot, "first")) return true;
  if (focusReplyThumbsRow(liveSlot)) return true;
  if (focusReplyUtilityRow(liveSlot)) return true;
  if (focusReplyReadAloud(liveSlot)) return true;
  return focusReplyShowDetails(liveSlot);
}

/** Up from thumbs / reply chrome: checklist → branch → answer bubble. */
export function focusUpFromReplyActions(liveSlot: HTMLElement | null): boolean {
  if (focusStrategyChecklistToggle(liveSlot, "last")) return true;
  if (focusStrategyBranchButton(liveSlot, "last")) return true;
  return focusLiveAnswerBubble(liveSlot);
}

export function focusContextChipLadder(liveSlot: HTMLElement | null): boolean {
  const ladder = liveSlot?.querySelector<HTMLElement>(".bonsai-chip-ladder");
  return focusDeckOwner(ladder);
}

export function focusContextHint(liveSlot: HTMLElement | null): boolean {
  const hint =
    liveSlot?.querySelector<HTMLElement>(".bonsai-context-hint") ??
    liveSlot?.querySelector<HTMLElement>(".bonsai-context-hint button");
  return focusDeckOwner(hint);
}

/**
 * The session context strip lives outside the reply row's navigation container, so it needs Steam's
 * own transfer rather than a DOM focus — see navFocusRegistry for the measurement. The `focusDeckOwner`
 * fallback stays for the case where Decky has not populated the nav ref yet; it moves
 * `activeElement` even when it cannot move the gamepad ring, which is still better than nothing for
 * the mouse and touch paths.
 */
export function focusSessionContextStrip(): boolean {
  if (takeNavFocus("session-context-strip")) return true;
  const doc = getUiDocument();
  const strip =
    doc.querySelector<HTMLElement>(".bonsai-session-context-strip") ??
    doc.querySelector<HTMLElement>(".bonsai-session-context-strip button");
  return focusDeckOwner(strip);
}

/**
 * Last turn row inside the expanded session context strip.
 *
 * The strip's own chip ladder sits below those rows, and the ladder swallows Up at its first chip.
 * Without a target here the press had nowhere to go and the ring stayed in the ladder — the trap
 * recorded on device 2026-08-23. Rows are ordinary siblings, so once focus is on one, Steam's own
 * navigation carries it the rest of the way up to the header.
 */
export function focusLastSessionContextRow(): boolean {
  const rows = getUiDocument().querySelectorAll<HTMLElement>(".bonsai-session-context-row");
  return focusDeckOwner(rows.length ? rows[rows.length - 1] : null);
}

/*
 * `focusAskDiagnostics` was removed 2026-08-28 (roadmap: "Fold Show diagnostics into Show
 * details"). The standalone "Ask diagnostics" block it targeted is gone — the same JSON now
 * renders inside the chip ladder's "Developer details" chip, which `focusContextChipLadder` below
 * already reaches. Nothing replaces this stop; the Down chain just has one fewer link.
 */

/** Down from utility row: inline ladder → collapsed hint → session strip. */
export function focusDownFromReplyUtilityRow(liveSlot: HTMLElement | null): boolean {
  if (focusContextChipLadder(liveSlot)) return true;
  if (focusContextHint(liveSlot)) return true;
  return focusSessionContextStrip();
}

/**
 * Any currently-mounted inline chip ladder, regardless of which turn (live or archived) owns it.
 *
 * Only one turn is ever expanded at a time, so at most one `.bonsai-chip-ladder` sits in the
 * transcript — querying without a specific slot means the caller does not need to know which turn
 * it belongs to.
 *
 * The session context strip renders a ladder of its own with the same class, so the match has to
 * exclude anything inside the strip. Taking the first DOM match instead is what trapped the ring
 * on device 2026-08-23 (`DeckRecord_20260823_170847_game.mkv`): with *Show details* collapsed there
 * is no inline ladder at all, so the strip's own ladder was the only match, and the strip header's
 * Up handler — which routes through here — fed focus straight back down into the strip it was
 * trying to leave. Nothing above the strip was reachable until the panel was closed.
 */
export function focusAnyContextChipLadder(): boolean {
  const ladders = Array.from(
    getUiDocument().querySelectorAll<HTMLElement>(".bonsai-chip-ladder"),
  );
  const inlineLadder = ladders.find((el) => !el.closest(".bonsai-session-context-strip"));
  return focusDeckOwner(inlineLadder ?? null);
}

/**
 * Up from whatever sits below the ladder (session context strip, formerly also the standalone Ask
 * diagnostics block removed 2026-08-28): ladder → collapsed hint → utility row (Retry / Show
 * details).
 *
 * This is the missing reverse of `focusDownFromReplyUtilityRow`. Without it, Up from the session
 * context strip had no explicit handler and fell through to Steam's default geometry navigation,
 * which landed on Show/Hide details directly and skipped the ladder — once a chip carousel
 * scrolled past its last chip and exited downward, there was no way back in.
 */
export function focusUpFromBelowContextChipLadder(liveSlot: HTMLElement | null): boolean {
  if (focusAnyContextChipLadder()) return true;
  if (focusContextHint(liveSlot)) return true;
  /* The Show details line sits directly above the chips now, so it is the first thing above. */
  if (focusReplyShowDetails(liveSlot)) return true;
  return focusReplyUtilityRow(liveSlot);
}

/*
 * `focusSpoilerRevealIn` was removed 2026-08-04. It focused the first masked fence in a bubble on
 * every Down press regardless of where that fence was, and the answer-bubble Down handler already
 * diverts to fences that are actually on screen — see handleAnswerBubbleMoveDown and
 * spoilerFenceRegistry.
 */
