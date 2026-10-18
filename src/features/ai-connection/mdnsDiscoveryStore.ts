/**
 * Title: Find LAN search memory
 *
 * Purpose: Remembers, outside any screen component, that a Find LAN search is running, and what it found
 * (the hosts, or the message saying nothing was found). The Ollama tab's section reads it when it is built,
 * so a search started before the tab was rebuilt still shows "…" while it runs and its result once it ends.
 *
 * Used for: useMdnsOllamaDiscovery, which starts and ends the search here and reads it on mount. The tab
 * uses the one shared store (`tabMdnsDiscovery`); the first-run popup, which is not rebuilt, gets a private one.
 *
 * Solves: After A on Search the box closed, Steam rebuilt the Ollama tab, and the search's "running" flag and
 * its result, kept in the old copy of the tab, were thrown away: nothing showed, ever (Deck 2026-10-18,
 * plan96-P96-FINDLAN.json). Same shape as the knowledge base download (plan 64) and the voice install marker
 * (voiceInstallBusyStore.ts, plan 96).
 *
 * Does not: Talk to the back end or know how a search is done; it holds the state and tells listeners.
 */
import type { MdnsOllamaHost } from "./OllamaWhereAiRunsSection.types";

/** A search that has not ended after this long is treated as lost (the RPC itself gives up at 18 s). */
const SEARCH_MAX_AGE_MS = 25_000;
/** A finished result older than this is not shown again on a later rebuild. */
const RESULT_MAX_AGE_MS = 10 * 60 * 1000;

export type MdnsDiscoveryState = {
  discovering: boolean;
  hosts: MdnsOllamaHost[];
  message: string | null;
};

type Held = { startedAt: number; endedAt: number | null; hosts: MdnsOllamaHost[]; message: string | null };

export type MdnsDiscoveryStore = {
  /** What is known right now, or null when nothing was ever started (or it is too old to show). */
  read(now?: number): MdnsDiscoveryState | null;
  /** Mark a search as started; false when one is already running. */
  start(now?: number): boolean;
  /** Record how the running search ended. */
  finish(hosts: MdnsOllamaHost[], message: string | null, now?: number): void;
  /** Be told after every start and finish; the returned function stops it. */
  subscribe(listener: () => void): () => void;
  /** For tests only: forget everything. */
  reset(): void;
};

export function createMdnsDiscoveryStore(): MdnsDiscoveryStore {
  let held: Held | null = null;
  const listeners = new Set<() => void>();
  const tell = () => listeners.forEach((fn) => fn());
  const running = (now: number) => held !== null && held.endedAt === null && now - held.startedAt < SEARCH_MAX_AGE_MS;

  return {
    read(now = Date.now()) {
      if (!held) return null;
      if (held.endedAt === null) {
        return running(now) ? { discovering: true, hosts: [], message: null } : null;
      }
      if (now - held.endedAt >= RESULT_MAX_AGE_MS) return null;
      return { discovering: false, hosts: held.hosts, message: held.message };
    },
    start(now = Date.now()) {
      if (running(now)) return false;
      held = { startedAt: now, endedAt: null, hosts: [], message: null };
      tell();
      return true;
    },
    finish(hosts, message, now = Date.now()) {
      held = { startedAt: held?.startedAt ?? now, endedAt: now, hosts, message };
      tell();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    reset() {
      held = null;
      tell();
    },
  };
}

/** The Ollama tab's store: module-level, so it outlives the tab's own copies. */
export const tabMdnsDiscovery: MdnsDiscoveryStore = createMdnsDiscoveryStore();
