/**
 * Title: The setup the first-time setup screen started, as the Main tab's card follows it
 *
 * Purpose: When "OK, install on this Deck" is pressed on the first-time setup popup, the popup closes and the Main
 * tab's empty chat shows a card that follows the run (FirstRunSetupCard.tsx; board 5, tab 4: round 1 A's changing
 * line and Stop on the chat). This small store is what links the two: it starts the starter set with what was left
 * unticked, keeps that list for Start again, keeps a refused start's reason, and says whether the back end has
 * taken the start (so the card does not read an older run's status as this one's).
 *
 * Used for: first-run/FirstRunWhereAiRunsModal.tsx (beginFirstRunSetup) and main-tab/FirstRunSetupCard.tsx.
 *
 * Solves: The popup closes when the run starts, and the panel is rebuilt behind it, so the card needs something
 * that outlives both to know a first-time setup is going and what it left out.
 *
 * Does not: Survive a plugin reload (the card then does not show; the run goes on and the Ollama tab shows it, and a
 * reload restarts it with the same pieces left out, starter_left_out.py), or download anything itself.
 */
import { useSyncExternalStore } from "react";

import { callDeckyWithTimeout } from "../../shared/deckyCall";
import type { LocalOllamaSetupStatus } from "../ai-connection/OllamaWhereAiRunsSection.types";
import { LOCAL_OLLAMA_SETUP_PROFILE_TIER1_ESSENTIALS } from "../ai-connection/OllamaWhereAiRunsSection.constants";
import { startLocalOllamaSetup } from "../models/localOllamaStarterSet";
import type { StarterLeftOut } from "../models/starterSetLeftOut";

export type FirstRunSetupState = {
  /** A first-time setup was started on this load. */
  active: boolean;
  /** What the person left unticked, for Start again. */
  leaveOut: StarterLeftOut[];
  /** Why the back end refused the start, in its own words; empty when it did not. */
  refused: string;
  /** True once the back end has taken this start; until then the card shows the start's own first line. */
  accepted: boolean;
  /** The last status the start handed back (its first "Checking…" line, then the back end's own). */
  status: LocalOllamaSetupStatus | null;
  /** Counts starts, so the card reads afresh after Start again. */
  runId: number;
  /** True when the last Stop request failed or did not answer in time: the card says so, and Stop sends again. */
  stopFailed: boolean;
};

const IDLE: FirstRunSetupState = { active: false, leaveOut: [], refused: "", accepted: false, status: null, runId: 0, stopFailed: false };
let state: FirstRunSetupState = IDLE;
const listeners = new Set<() => void>();

function update(next: Partial<FirstRunSetupState>): void {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

/** Starts the starter set with what was left unticked, and shows the card on the Main tab. */
export function beginFirstRunSetup(leaveOut: readonly StarterLeftOut[]): void {
  const runId = state.runId + 1;
  update({ active: true, leaveOut: [...leaveOut], refused: "", accepted: false, status: null, runId, stopFailed: false });
  startLocalOllamaSetup(
    LOCAL_OLLAMA_SETUP_PROFILE_TIER1_ESSENTIALS,
    (status) => {
      if (state.runId !== runId) return;
      // The start's own first line carries no `accepted`; the back end's status of a run it has taken does.
      update({ status, accepted: state.accepted || status.accepted === true });
    },
    (reason) => {
      if (state.runId === runId) update({ refused: reason });
    },
    leaveOut,
  );
}

/** The card's Start again: the same run, the same pieces left out (what finished is not downloaded twice). */
export function startFirstRunSetupAgain(): void {
  beginFirstRunSetup(state.leaveOut);
}

/** Counts Stop presses for the whole app and is never reset, so an old press's late answer is told from a newer one. */
let stopPresses = 0;

/** How long a Stop request may go unanswered before the card says it could not stop (ms). */
const STOP_TIMEOUT_MS = 8000;

/**
 * The card's Stop: the same cancel the Ollama tab's Cancel sends. If the request is refused or does not answer within
 * 8 seconds the card says "Could not stop. Try again." and Stop stays pressable; the next press sends a new request.
 */
export function stopFirstRunSetup(): Promise<void> {
  const runId = state.runId;
  const press = ++stopPresses;
  if (state.stopFailed) update({ stopFailed: false });
  return callDeckyWithTimeout<[], { cancel_requested?: boolean }>("cancel_local_ollama_setup", [], STOP_TIMEOUT_MS).then(
    () => {
      // A Stop the back end took clears the words, whichever press it was.
      if (state.runId === runId && state.stopFailed) update({ stopFailed: false });
    },
    () => {
      // Only the newest press may say it failed: an old press answering late must not.
      if (state.runId === runId && press === stopPresses) update({ stopFailed: true });
    },
  );
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The setup the first-time screen started, for the card. */
export function useFirstRunSetup(): FirstRunSetupState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

/** Test only: no first-time setup started. */
export function resetFirstRunSetupForTests(): void {
  update(IDLE);
}
