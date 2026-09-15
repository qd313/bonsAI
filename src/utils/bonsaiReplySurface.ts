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
