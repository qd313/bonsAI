/**
 * Title: The "Open sections as you walk" switch, read and changed without a new prop
 *
 * Purpose: The Developer switch that makes a folded tab's sections open and close as the D-pad walks through them
 * (plan 105, lane C2) is read in two places several files below usePluginSettings: the folded tabs' landing rule
 * (folded-tabs/autoFold.ts), at every landing, and the switch's own row on the Developer tab, which also changes
 * it. Both read it from here, and the row changes it through the function published with the value.
 *
 * Used for: usePluginSettings.ts publishes the value and its change function whenever the value changes;
 * autoFold.ts reads the value (peekOpenSectionsAsYouWalk); DeveloperTab.tsx reads both through
 * useOpenSectionsAsYouWalk.
 *
 * Solves: Threading a new value and setter down through index.tsx and the Developer tab's payload hook would add
 * two to what scripts/shell_seam.mjs counts as "things the main screen hands down to its tabs", a number that may
 * only shrink. The same shape as developerTabSignal.ts and settingsLoadedSignal.ts, with the change function
 * alongside, because here a row also writes the setting.
 *
 * Does not: Save anything itself. The change function is usePluginSettings' own setter, so the setting saves like
 * every other. Before the hook has published (a test drawing a tab alone), the value is off and a change does
 * nothing.
 */
import { useSyncExternalStore } from "react";

let on = false;
let change: ((value: boolean) => void) | null = null;
const listeners = new Set<() => void>();

/** Called by usePluginSettings each time its value changes, with its own setter for the setting. */
export function publishOpenSectionsAsYouWalk(value: boolean, setter: (value: boolean) => void): void {
  change = setter;
  if (on === value) return;
  on = value;
  listeners.forEach((listener) => listener());
}

/** A synchronous read, for code that only needs the value at the moment it runs (the landing rule). */
export function peekOpenSectionsAsYouWalk(): boolean {
  return on;
}

/** Turn the switch on or off through the settings hook; nothing happens before the hook has published. */
export function changeOpenSectionsAsYouWalk(value: boolean): void {
  change?.(value);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The value and the way to change it, re-rendering the caller whenever the value changes. */
export function useOpenSectionsAsYouWalk(): [boolean, (value: boolean) => void] {
  return [useSyncExternalStore(subscribe, peekOpenSectionsAsYouWalk), changeOpenSectionsAsYouWalk];
}

/** Test-only reset: off, no change function, no listeners. */
export function resetOpenSectionsAsYouWalkForTests(): void {
  on = false;
  change = null;
  listeners.clear();
}
