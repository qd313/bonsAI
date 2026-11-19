/**
 * Title: Removing the knowledge library: that it is being removed, outside the section
 *
 * Purpose: Remove deletes the library from disk, which takes seconds, and the box that confirms it closing rebuilds the
 * Ollama tab before the delete answers. This holds at module level that a removal is out, so a rebuilt copy of the
 * section still says "Removing the library…" under its buttons and ignores a second Remove, and runs the removal
 * itself (the delete, the toasts, telling whichever copy is on screen) so no copy has to be alive when it answers.
 *
 * Used for: KnowledgeBaseSection.tsx (starts the removal, ignores Remove while one is out) and KbLibraryResultLines.tsx
 * (draws the line).
 *
 * Solves: After Remove was confirmed the row kept showing the library as installed, with Update and Remove, until the
 * delete answered, and Remove could be confirmed again meanwhile.
 *
 * Does not: draw anything, ask "Remove knowledge base?" (the section's box does), or decide what a removed library
 * looks like (kbLibrarySignal.ts tells the screen).
 */
import { toaster } from "@decky/api";
import { useSyncExternalStore } from "react";

import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS, formatDeckyRpcError } from "../../shared/deckyCall";
import { announceKbLibraryChange } from "./kbLibrarySignal";

let removing = false;
const listeners = new Set<() => void>();

function setRemoving(on: boolean): void {
  removing = on;
  listeners.forEach((listener) => listener());
}

/** True while a removal is out and unanswered. */
export const kbRemovalInFlight = (): boolean => removing;

/**
 * Delete the library. Ignored while a removal is already out. The line under the buttons is up from the call until the
 * answer; on success the screen on show is told (the switch goes off), on failure the "Remove failed" toast shows and
 * the line goes back to what it was.
 */
export function removeKbLibrary(): void {
  if (removing) return;
  setRemoving(true);
  void callDeckyWithTimeout<[], { ok?: boolean }>("remove_rag_corpus", [], DECKY_RPC_TIMEOUT_MS)
    .then(() => {
      // The copy that pressed the button may be gone (the box closing rebuilt the tab): tell whichever copy is on screen.
      announceKbLibraryChange({ installed: false });
      toaster.toast({ title: "Knowledge base removed", body: "Corpus deleted from disk.", duration: 3000 });
    })
    .catch((e) => toaster.toast({ title: "Remove failed", body: formatDeckyRpcError(e), duration: 5000 }))
    .finally(() => setRemoving(false));
}

/** Whether a removal is out, redrawing the caller when that changes. */
export function useKbRemoving(): boolean {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => removing,
  );
}

/** Test-only reset. */
export function resetKbRemovalForTests(): void {
  removing = false;
  listeners.clear();
}
