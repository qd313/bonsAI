/**
 * Title: The Kids lock — following Steam's own parental control for this session
 *
 * Purpose: Watches Steam's own parental lock and, for as long as it is on,
 * turns off every one of the plugin's five permissions for this session —
 * writing files, the screenshot and video library, Steam's logs, talking
 * to Steam's own servers, and the microphone — no matter what the person
 * had actually granted. It does not touch the saved permissions
 * themselves, only what they are allowed to do while the lock is active.
 *
 * Used for: The plugin's main screen, to work out which permissions are
 * actually in effect, and the banner on the Permissions tab; also tells
 * the back end whenever the lock's state changes.
 *
 * Solves: Deciding safely when Steam has not actually said whether the
 * lock is on. If Steam's answer is momentarily unclear, this treats the
 * lock as off — unless it has already seen the lock turned on this
 * session, in which case it stays locked until Steam explicitly reports it
 * as off again. A dropped connection, a timeout, or an unrelated error can
 * never quietly turn the lock back off on its own.
 *
 * Does not: Save the lock's state to the settings file — it is not a saved
 * setting, only a live read of Steam's own state for as long as the plugin
 * is open. Does not filter or change anything the AI says, and does not
 * read Steam's parental-control data directly; it goes through whatever
 * already decodes that elsewhere.
 */
import { useEffect, useRef, useState } from "react";

import type { BonsaiCapabilities } from "../data/bonsaiSettingsSchema";
import { callDeckyWithTimeout } from "../utils/deckyCall";
import { subscribeSteamParental } from "../utils/steamParental";

const DENIED_CAPABILITIES: BonsaiCapabilities = {
  filesystem_write: false,
  media_library_access: false,
  steam_logs_read: false,
  steam_web_api: false,
  microphone_access: false,
};

/** Stored caps when unlocked; all-deny when Kids lock is active (does not mutate storage). */
export function effectiveCapabilities(
  stored: BonsaiCapabilities,
  kidsLockActive: boolean
): BonsaiCapabilities {
  return kidsLockActive ? DENIED_CAPABILITIES : stored;
}

async function pushKidsLockState(active: boolean): Promise<void> {
  try {
    await callDeckyWithTimeout<[boolean], { ok?: boolean }>("set_kids_lock_state", [active]);
  } catch {
    try {
      await callDeckyWithTimeout<[boolean], { ok?: boolean }>("set_kids_lock_state", [active]);
    } catch (e) {
      if (typeof console !== "undefined" && typeof console.error === "function") {
        console.error("[bonsAI] set_kids_lock_state failed", e);
      }
    }
  }
}

/**
 * Feature: Long-lived Steam parental subscription with fail-open latch.
 * Input: none. Output: whether Kids lock is active this session.
 *
 * Latch rules: UNKNOWN → unlocked (unless already latched); once `locked: true` is seen,
 * only an explicit `locked: false` clears — never timeout/error/unregister.
 */
export function useKidsLock(): boolean {
  const [active, setActive] = useState(false);
  const latchedRef = useRef(false);
  const activeRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const apply = (next: boolean) => {
      if (cancelled) return;
      if (activeRef.current === next) return;
      activeRef.current = next;
      setActive(next);
      void pushKidsLockState(next);
    };

    const unsub = subscribeSteamParental((snapshot) => {
      if (cancelled) return;

      if (snapshot === undefined) {
        // UNKNOWN: fail open only when not latched (timeout after true must not clear).
        if (!latchedRef.current) {
          apply(false);
        }
        return;
      }

      if (snapshot.locked) {
        latchedRef.current = true;
        apply(true);
        return;
      }

      latchedRef.current = false;
      apply(false);
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  return active;
}
