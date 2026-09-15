/**
 * Title: Watching Steam's own Kids lock
 *
 * Purpose: Steam has its own "Kids" parental lock, and this file watches it for as long as the
 * plugin is open, so the rest of the plugin can lock itself down to match — without ever writing
 * the lock state to the plugin's own saved settings. It exists because Steam's own subscription
 * for this can behave in a few different unhelpful ways depending on the Deck, and this file has
 * to work correctly no matter which one happens.
 *
 * Used for: `useKidsLock` — locking and unlocking the current session to match Steam's own Kids
 * lock, without saving anything to the plugin's settings file.
 *
 * Solves: Steam's subscription for this can fire immediately during setup, throw right after
 * firing with no way to unsubscribe, or never fire at all on a Deck with no such API. This file
 * handles all three so callers always get an answer, or an honest "don't know yet", instead of
 * hanging.
 *
 * Does not: read what the lock actually restricts — the details are stored in a format Steam
 * does not document, so this file only reports whether the lock is on. It also does not decide
 * what "don't know yet" should mean for the caller; see the gotcha below.
 *
 * Gotchas:
 *   - `undefined` handed to a caller's callback specifically means "we do not know yet" — never
 *     "unlocked". Treating it as unlocked would fail open on a Deck this check has not actually
 *     reported on, which is exactly the Deck a person setting up parental controls would be
 *     using. A caller that wants to fail open decides that for itself (see `useKidsLock`); this
 *     file never makes that substitution on its own.
 *   - The two-second default wait before deciding "don't know"
 *     (`STEAM_PARENTAL_INITIAL_TIMEOUT_MS`) is a starting guess, not a measured value — it is
 *     flagged in the code as a placeholder until someone checks how long Steam actually takes to
 *     answer on a real Deck.
 */

export type SteamParentalSnapshot = {
  everEnabled: boolean;
  locked: boolean;
};

type ParentalSettingsPayload = {
  ever_enabled?: boolean;
  locked?: boolean;
  settings?: ArrayBuffer;
  strPlaintextPassword?: string;
};

type ParentalUnregisterable = {
  unregister: () => void;
};

type ParentalApi = {
  RegisterForParentalSettingsChanges: (
    cb: (payload: ParentalSettingsPayload) => void
  ) => ParentalUnregisterable;
};

/** Default wait for first callback when Steam is silent. Spike KML-0.1 default until measured. */
export const STEAM_PARENTAL_INITIAL_TIMEOUT_MS = 2000;

function getParentalApi(): ParentalApi | undefined {
  const steam = (globalThis as { SteamClient?: { Parental?: ParentalApi } }).SteamClient;
  const parental = steam?.Parental;
  if (!parental || typeof parental.RegisterForParentalSettingsChanges !== "function") {
    return undefined;
  }
  return parental;
}

function toSnapshot(payload: ParentalSettingsPayload): SteamParentalSnapshot {
  return {
    everEnabled: payload.ever_enabled === true,
    locked: payload.locked === true,
  };
}

/**
 * Feature: Subscribe to Steam parental lock changes for the plugin lifetime.
 * Input: change callback + optional first-fire timeout. Output: unsubscribe function.
 *
 * Survives: API absent → immediate UNKNOWN; sync fire inside register(); register() throws
 * after firing (no unregister handle); never fires → UNKNOWN after timeout. Unsubscribe
 * always clears the timeout and never throws.
 */
export function subscribeSteamParental(
  onChange: (snapshot: SteamParentalSnapshot | undefined) => void,
  options?: { initialTimeoutMs?: number }
): () => void {
  const timeoutMs = options?.initialTimeoutMs ?? STEAM_PARENTAL_INITIAL_TIMEOUT_MS;
  const parental = getParentalApi();
  if (!parental) {
    onChange(undefined);
    return () => {};
  }

  let closed = false;
  let sawFirst = false;
  let reg: ParentalUnregisterable | undefined;
  let timeoutId: number | undefined;

  const deliver = (snapshot: SteamParentalSnapshot | undefined) => {
    if (closed) return;
    onChange(snapshot);
  };

  const clearInitialTimeout = () => {
    if (typeof timeoutId === "number") {
      window.clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  };

  const onParental = (payload: ParentalSettingsPayload) => {
    if (closed) return;
    sawFirst = true;
    clearInitialTimeout();
    deliver(toSnapshot(payload));
  };

  try {
    reg = parental.RegisterForParentalSettingsChanges(onParental);
  } catch {
    // Callback may have already run synchronously; if not, treat as UNKNOWN.
    if (!sawFirst) {
      deliver(undefined);
    }
    return () => {
      closed = true;
      clearInitialTimeout();
    };
  }

  if (!sawFirst) {
    timeoutId = window.setTimeout(() => {
      timeoutId = undefined;
      if (!sawFirst && !closed) {
        deliver(undefined);
      }
    }, timeoutMs);
  }

  return () => {
    closed = true;
    clearInitialTimeout();
    try {
      reg?.unregister();
    } catch {
      /* ignore */
    }
    reg = undefined;
  };
}
