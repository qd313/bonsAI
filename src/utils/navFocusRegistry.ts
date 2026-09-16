/**
 * Title: Sending the controller's highlight to a different part of the screen
 *
 * Purpose: The Steam Deck's controller does not click on things — it moves a highlight ("focus")
 * from one control to the next, and Steam itself, not the plugin, decides which element that
 * highlight sits on. Most of the screen is one connected area, so the highlight moves normally
 * with the D-pad. A few places on the Main tab — the strip that shows what game is running, the
 * row of chat slots, and the permission-hint rows shown under the transcript — sit in their own
 * separate areas, and moving the highlight into one of those from the reply row needs a
 * different trick than an ordinary D-pad move. This file is that trick: each of those areas
 * registers itself here while it is on screen, and this file's `takeNavFocus()` is the one
 * approved way to move the controller's highlight into one of them.
 *
 * Used for: the handful of places in the Main tab's focus map (`liveTurnFocusGraph`) that jump
 * out of the reply row into one of those separate areas.
 *
 * Solves: the obvious way to move focus in the browser — calling `.focus()` on an element —
 * changes what the browser itself thinks is focused, but does not move Steam's own highlight.
 * The two can end up disagreeing: the browser says one control is focused while Steam's ring is
 * showing on a different one, or showing nowhere at all. When that happens, the highlight looks
 * stuck (or vanishes) while the player's D-pad presses are actually landing somewhere else that
 * never moved.
 *
 *   This has been measured on the Deck twice, in two different spots, not guessed at:
 *   - 2026-08-04: moving into the game-context strip with a plain `.focus()` changed the
 *     browser's own idea of what was focused, but Steam's ring stayed on the Retry button for a
 *     moment and then disappeared entirely. Three D-pad presses afterward all still went to the
 *     reply row, and each one was logged as a successful move.
 *   - 2026-09-04 (build 49241e7): the same mistake reappeared in a different row — the
 *     permission-hint row above the vac-check chat feature used a plain `.focus()` call
 *     (`focusDeckOwner`) instead of this file, and hit a second problem at the same time: on
 *     a real Deck, none of these rows carry the `tabindex` attribute Steam is supposed to look
 *     for, so `focusDeckOwner`'s safety check — "add `tabindex="-1"` if the row does not already
 *     have one" — stamped it onto the wrong element and removed that whole row from Steam's list
 *     of things the controller can reach at all.
 *
 *   The one call that actually moves Steam's own highlight is `navRef.current.TakeFocus()`
 *   (Steam calls this `BTakeFocus` internally), and that is what this file's `takeNavFocus()`
 *   calls. A plain `.focus()` is not a smaller or simpler version of the same thing — it moves
 *   something Steam does not see.
 *
 * Does not: replace `.focus()` for moves that stay inside one of these areas. Those already
 * work, because the highlight only needs this special handling when it crosses from one separate
 * area into another — the spoiler-text hiding feature is one example of a move that does not
 * need this file.
 *
 * Gotchas:
 *   - Removing a registration has to check that the thing being removed is still the thing that
 *     was registered, not just delete whatever is there (`unregisterNavFocus`). Two copies of the
 *     same screen element can briefly both be alive — reopening a panel, switching tabs, a
 *     development-only double-render — and if a newer copy registers first and an older copy's
 *     cleanup then deletes unconditionally, the newer, still-visible copy loses its registration
 *     and nothing can move the highlight to it any more. When that happened, the code that hit it
 *     fell back to a plain `.focus()` to cross into a different area, the same failure described
 *     above: the press is reported as handled, but
 *     nothing visibly moves.
 */

export type NavFocusId = "session-context-strip" | "chat-slot-row" | "preset-carousel" | "unified-input"
  | "tab-bar"
  /** The settings-results card's own row nearest the question box (plan 45 step 3 / plan 56 lane
   *  E2) — Up from the box takes Steam's ring here; see MainTabUnifiedAskBar.tsx. */
  | "settings-results-card"
  /** The troubleshooting Ask hint and vac-check deny rows below the transcript — see
   *  MainTabChatTranscript.tsx's `focusChatPermissionHintRow`. Two ids, not one, because both rows
   *  can in principle be mounted at once and a single shared id would let the later-mounted row's
   *  registration silently clobber the other's. */
  | "chat-perm-hint-troubleshoot" | "chat-perm-hint-deny"
  /** One per Permissions-tab capability row — see permissionJumpRegistry.ts's `focusOwnerById`.
   *  Recurred 2026-09-05 (build 4/517804a, PERM-JUMP-01 step 3): the jump landed on "Back to Main"
   *  instead of the armed toggle, because `focusOwnerById` climbed to a registered element and
   *  called a plain `.focus()` on it — the same cross-container failure this whole file exists
   *  for, just in a file neither chat fix had touched yet. */
  | "permissions-row-game-context-read" | "permissions-row-filesystem-write"
  | "permissions-row-steam-web-api" | "permissions-row-microphone-access"
  /** One per tab body except Main (TabBodyFocusRoot): the collapsing bar's Down hands the ring here. */
  | `tab-body:${string}`;

/** The object Steam assigns to a `navRef`: a thin wrapper over the nav node. */
type SteamNavNode = { TakeFocus?: (gamepad?: boolean) => unknown };

/** What a caller passes in — a React ref object Steam populates. */
export type NavRefHolder = { current: SteamNavNode | null | undefined };

const navRefs = new Map<NavFocusId, NavRefHolder>();

/**
 * Register a `navRef` holder for a focus target.
 *
 * Pass the same object to the component's `navRef` prop. Steam fills in `.current` once the node is
 * mounted and navigable; until then `takeNavFocus` simply reports false and the caller falls back.
 * Pair every call with `unregisterNavFocus(id, thatSameHolder)` in the effect's cleanup — never a
 * bare delete, for the reason written on that function.
 */
export function registerNavFocus(id: NavFocusId, holder: NavRefHolder): void {
  navRefs.set(id, holder);
}

/**
 * Drop a registration on unmount — but ONLY if this holder is still the one registered.
 *
 * The identity check is the whole point, and it is not defensive coding. Every caller registers in
 * a `useEffect` and unregisters in its cleanup, and React does not promise that an old instance's
 * cleanup runs before a new instance's setup. Whenever two instances of the same component are
 * briefly alive at once — a panel reopen, a tab switch, a remount under a new key, StrictMode's
 * double-invoke — the order can be: new instance registers, THEN old instance's cleanup runs. With
 * the old unconditional `delete`, that cleanup wiped the live instance's entry, and the id was left
 * with no registration at all while its component sat on screen.
 *
 * What that cost a user, measured as a symptom rather than a cause: `takeNavFocus` then returns
 * false, the caller falls through to its next option — which for several of these hops is a plain
 * `focus()` across a container boundary — and a plain `focus()` moves `document.activeElement`
 * without moving Steam's ring, while the handler still reports the press as handled. The press
 * arrives, nothing visibly moves, and Steam's ring and the page's own focus end up on different
 * elements. That is the exact signature recorded for the "Down stops half way and the Ask button
 * cannot be reached" bug, including why reopening the panel does not clear it (the same racing
 * order happens again) and why restarting the loader does (the module, and this Map, are new).
 */
export function unregisterNavFocus(id: NavFocusId, holder: NavRefHolder): void {
  if (navRefs.get(id) === holder) navRefs.delete(id);
}

/**
 * Hand gamepad focus to a registered target. Returns false when the target is not mounted, when
 * Decky did not populate the ref, or when Steam declines the move — in every one of those cases the
 * caller should fall through to its next option rather than treat the press as handled.
 */
export function takeNavFocus(id: NavFocusId): boolean {
  const node = navRefs.get(id)?.current;
  if (!node || typeof node.TakeFocus !== "function") return false;
  try {
    // `true` marks this as a gamepad-sourced move, which is what a D-pad press is.
    return node.TakeFocus(true) !== false;
  } catch {
    return false;
  }
}

/** Test-only reset. */
export function resetNavFocusRegistry(): void {
  navRefs.clear();
}
