/**
 * Title: Is the player already looking at the reply?
 *
 * Purpose: This file answers one small question for the rest of the plugin: is the part of the
 * screen that would show a finished AI answer currently visible to the player? It exists so the
 * "your reply is ready" notification can check first and skip itself when the player is already
 * looking right at the answer. It also remembers, for one tap, that a notification asked to bring
 * the player back to the main tab, so the screen can act on that request the next time it opens.
 *
 * Used for: bonsaiReplyReadyToast, to decide whether to show a notification at all, and the main tab
 * itself, to know whether it should jump to the reply the moment it opens.
 *
 * Solves: without this, the "reply is ready" notification could not tell whether the player was
 * already looking at the answer, and would either notify every time regardless or never at all.
 *
 * Does not: check whether a question has finished being answered — see useBackgroundGameAi and
 * bonsaiAskCompletionWatch for that. This file only tracks whether the screen for it is showing.
 */
import { useLayoutEffect } from "react";
import { Navigation, QuickAccessTab } from "@decky/ui";

let replySurfaceVisible = false;
let pendingFocusMainTab = false;

/** True when QAM is open and bonsAI Main tab is showing the reply surface. */
export function isReplySurfaceVisible(): boolean {
  return replySurfaceVisible;
}

export function setReplySurfaceVisible(visible: boolean): void {
  replySurfaceVisible = visible;
}

/**
 * Keep the flag in step with the panel while it is mounted, and clear it when the panel goes.
 *
 * The clearing is the part that matters. Closing the Quick Access Menu, or backing out of bonsAI to
 * Decky's list, unmounts the panel, and nothing mounted is left to write `false`. The flag then held
 * its last value, true, so a reply finishing in the background read as "already on screen" and the
 * notification skipped itself. On the Deck 2026-09-23 (plan 64) it never appeared in two tries,
 * one closing the menu with the controller's shortcut and one backing out with B.
 */
export function useReplySurfaceVisibility(visible: boolean): void {
  useLayoutEffect(() => {
    replySurfaceVisible = visible;
    return () => {
      replySurfaceVisible = false;
    };
  }, [visible]);
}

/** Open Decky QAM from a toast tap; remounted Content should consume pending Main focus. */
export function openBonsaiReplyFromToast(): void {
  pendingFocusMainTab = true;
  try {
    Navigation.OpenQuickAccessMenu(QuickAccessTab.Decky);
  } catch {
    /* best-effort — toast still notified the user */
  }
}

/** Returns true once after toast onClick requested Main tab focus. */
export function consumePendingFocusMainTab(): boolean {
  if (!pendingFocusMainTab) return false;
  pendingFocusMainTab = false;
  return true;
}

/** Test-only reset. */
export function resetReplySurfaceState(): void {
  replySurfaceVisible = false;
  pendingFocusMainTab = false;
}
