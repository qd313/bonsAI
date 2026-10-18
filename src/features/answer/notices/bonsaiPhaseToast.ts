/**
 * Title: Phase toast manager
 * Purpose: Show and replace single-stack Decky toasts for in-flight Ask phase updates.
 * Used for: bonsaiReplyReadyToast and Ask progress notifications.
 * Solves: Avoid stacking multiple phase toasts during long background Ask polls.
 * Does not: Open QAM or navigate tabs — see bonsaiReplySurface.
 */
import { toaster, type ToastData, type ToastNotification } from "@decky/api";

let activePhaseToast: ToastNotification | null = null;

/** Dismiss the current bonsAI phase toast, if any. */
export function dismissPhaseToast(): void {
  try {
    activePhaseToast?.dismiss();
  } catch {
    /* best-effort */
  }
  activePhaseToast = null;
}

/** Replace any prior bonsAI phase toast (no stack) and show the next one. */
export function showPhaseToast(data: ToastData): ToastNotification {
  dismissPhaseToast();
  const notification = toaster.toast(data);
  activePhaseToast = notification;
  return notification;
}

/** Test-only: read whether a phase toast is currently held. */
export function peekActivePhaseToast(): ToastNotification | null {
  return activePhaseToast;
}
