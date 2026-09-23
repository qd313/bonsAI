/**
 * Title: Permission jump registry tests
 * Purpose: Pin the arm/return-tab story (unchanged) and the honest focus-transfer contract that
 *          replaced a registered-element `focusDeckOwner`-shaped focus loop.
 * Used for: permissionJumpRegistry.ts regression coverage.
 * Solves: The prior `focusOwnerById` collected every candidate under a registered element and
 *         called a plain `.focus()` on each, then `return true` unconditionally — a DOM focus that
 *         does not carry Steam's gamepad ring across the tab-switch boundary, and a lie that meant
 *         `restorePermissionJumpFocusWithRetry`'s retry schedule could never learn an attempt had
 *         failed. Measured on device 2026-09-05 (build 4/517804a, PERM-JUMP-01 step 3): the ring
 *         landed on "Back to Main" instead of the armed toggle. `focusOwnerById` is now
 *         `takeNavFocus` on the row's own registered nav id, tested here through the real
 *         `navFocusRegistry` — a fake nav node standing in for what Steam would populate, the same
 *         style `useMainTabAskBarFocus.test.ts` and `MainTabChatTranscript.permissionHintFocus.test.ts`
 *         use — never a DOM `.focus()`.
 * Does not: Cover PermissionToggleHost's own registration lifecycle — see
 *           PermissionsTab.permissionRowNavRegistration.test.tsx for mount/unmount.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  armPermissionJump,
  consumePermissionJumpReturnTab,
  peekPermissionJumpFocusTarget,
  peekPermissionJumpReturnTab,
  registerPermissionRowNavFocus,
  resetPermissionJumpRegistry,
  restorePermissionJumpFocusWithRetry,
} from "./permissionJumpRegistry";
import { resetNavFocusRegistry } from "./navFocusRegistry";

/** Stands in for whatever Steam populates a `navRef.current` with once a Focusable mounts. */
function fakeNavHolder(result = true) {
  return { current: { TakeFocus: vi.fn(() => result) } };
}

describe("permissionJumpRegistry", () => {
  beforeEach(() => {
    resetPermissionJumpRegistry();
    resetNavFocusRegistry();
    vi.useRealTimers();
  });

  it("arms return tab and focus target together", () => {
    armPermissionJump("main", "microphone_access");
    expect(peekPermissionJumpReturnTab()).toBe("main");
    expect(peekPermissionJumpFocusTarget()).toBe("microphone_access");
  });

  it("consumes return tab once", () => {
    armPermissionJump("settings", "filesystem_write");
    expect(consumePermissionJumpReturnTab()).toBe("settings");
    expect(peekPermissionJumpReturnTab()).toBeNull();
  });

  it("reports false, honestly, when no row has registered a nav node at all", async () => {
    vi.useFakeTimers();
    armPermissionJump("main", "steam_web_api");

    let claimed: boolean | null = null;
    restorePermissionJumpFocusWithRetry((ok) => {
      claimed = ok;
    });
    await vi.runAllTimersAsync();

    expect(claimed).toBe(false);
    // Consumed either way, same as before — a jump that never lands does not stay armed forever.
    expect(peekPermissionJumpFocusTarget()).toBeNull();
  });

  it("reports false when the registered row's own nav node declines the move", async () => {
    vi.useFakeTimers();
    const declines = fakeNavHolder(false);
    registerPermissionRowNavFocus("steam_web_api", declines);
    armPermissionJump("main", "steam_web_api");

    let claimed: boolean | null = null;
    let attempts = 0;
    restorePermissionJumpFocusWithRetry((ok, n) => {
      claimed = ok;
      attempts = n;
    });
    await vi.runAllTimersAsync();

    expect(claimed).toBe(false);
    // Every one of the three scheduled attempts ran, and each genuinely called TakeFocus — the
    // retry schedule getting a real chance is the whole point of the honest return value.
    expect(attempts).toBe(3);
    expect(declines.current.TakeFocus).toHaveBeenCalledTimes(3);
  });

  it("restores focus via the row's own registered nav node, not a DOM focus() call", async () => {
    vi.useFakeTimers();
    const claims = fakeNavHolder(true);
    registerPermissionRowNavFocus("steam_web_api", claims);
    armPermissionJump("main", "steam_web_api");

    let claimed: boolean | null = null;
    restorePermissionJumpFocusWithRetry((ok) => {
      claimed = ok;
    });
    await vi.runAllTimersAsync();

    expect(claimed).toBe(true);
    expect(claims.current.TakeFocus).toHaveBeenCalledWith(true);
    expect(peekPermissionJumpFocusTarget()).toBeNull();
    // No DOM node anywhere was focused — the transfer is Steam's own, not ours.
    expect(document.activeElement).toBe(document.body);
  });

  it("succeeds on a later retry once the row's nav node starts claiming the move", async () => {
    vi.useFakeTimers();
    const holder = fakeNavHolder(false);
    registerPermissionRowNavFocus("microphone_access", holder);
    armPermissionJump("settings", "microphone_access");

    let claimed: boolean | null = null;
    let attempts = 0;
    restorePermissionJumpFocusWithRetry((ok, n) => {
      claimed = ok;
      attempts = n;
    });

    // First attempt (0ms) declines; before the second, the row's TakeFocus starts succeeding —
    // exactly the "Steam's nav node populates a frame or two after DOM mount" case the later
    // delays exist for.
    await vi.advanceTimersByTimeAsync(0);
    holder.current.TakeFocus.mockReturnValue(true);
    await vi.runAllTimersAsync();

    expect(claimed).toBe(true);
    // The whole schedule runs now, success or not — see the next test for why.
    expect(attempts).toBe(3);
  });

  /*
   * Timed on the Deck 2026-09-23 (plan 64, PERM-JUMP-01): the 0ms attempt put the ring on the armed
   * switch, the tab's own first button ("Back to Main") took it about 22ms later, and a schedule
   * that stopped at its first success never took it back.
   */
  it("keeps re-taking the ring at the later delays after a first success, since the tab can steal it", async () => {
    vi.useFakeTimers();
    const claims = fakeNavHolder(true);
    registerPermissionRowNavFocus("game_context_read", claims);
    armPermissionJump("main", "game_context_read");

    restorePermissionJumpFocusWithRetry();
    await vi.advanceTimersByTimeAsync(0);
    expect(claims.current.TakeFocus).toHaveBeenCalledTimes(1);
    // Still armed between attempts, so the later ones run.
    expect(peekPermissionJumpFocusTarget()).toBe("game_context_read");

    await vi.runAllTimersAsync();
    expect(claims.current.TakeFocus).toHaveBeenCalledTimes(3);
    expect(peekPermissionJumpFocusTarget()).toBeNull();
  });
});
