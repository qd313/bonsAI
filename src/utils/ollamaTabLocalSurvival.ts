/**
 * Title: Remembering the Ollama tab across a panel close and reopen
 *
 * Purpose: Opening certain modals tears down and rebuilds the quick-access panel, which would
 * normally reset the Ollama tab to its starting state. This file remembers what that tab looked
 * like right before the panel closes — the connection status, the list of hosts found on the
 * local network, any discovery message, and whether the "install Ollama locally" menu was open —
 * and hands it back so the tab looks the same when the panel reopens.
 *
 * Used for: the Ollama tab's connection status, the hosts it found on the local network, and
 * whether its local-install menu was left open.
 *
 * Solves: without this, opening a modal from the Ollama tab (or the panel closing and reopening
 * on its own) would throw away in-progress connection state the person was in the middle of
 * looking at.
 *
 * Does not: remember the actual Ollama address the plugin talks to — that is saved permanently
 * elsewhere (`usePluginSettings` and `persistOllamaIp.ts`), so it is never lost on a panel close
 * in the first place.
 *
 * How it works: `createTabLocalSurvival()` does the actual remembering; this file only gives it
 * the Ollama tab's own snapshot shape and exports tab-specific names for it.
 */
import type { DeveloperConnectionStatus } from "../components/DeveloperTab";
import { createTabLocalSurvival } from "./createTabLocalSurvival";

export type OllamaTabLocalSnapshot = {
  connectionStatus: DeveloperConnectionStatus | null;
  mdnsHosts: Array<{ label: string; host: string; port: number; verified?: boolean }>;
  mdnsDiscoveryMessage: string | null;
  localInstallMenuOpen: boolean;
};

const survival = createTabLocalSurvival<OllamaTabLocalSnapshot>();

export function registerOllamaTabLocalGetter(fn: () => OllamaTabLocalSnapshot): void {
  survival.registerGetter(fn);
}

export function unregisterOllamaTabLocalGetter(): void {
  survival.unregisterGetter();
}

export function captureOllamaTabLocalSnapshot(): OllamaTabLocalSnapshot | null {
  return survival.captureSnapshot();
}

export function peekOllamaTabLocalPending(): OllamaTabLocalSnapshot | null {
  return survival.peekPending();
}

export function consumeOllamaTabLocalPending(): OllamaTabLocalSnapshot | null {
  return survival.consumePending();
}

export function clearOllamaTabLocalSurvival(): void {
  survival.clear();
}
