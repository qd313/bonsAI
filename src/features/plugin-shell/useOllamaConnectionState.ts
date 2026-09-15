/**
 * Title: Where the AI is running, and how to reach it
 *
 * Purpose: Keeps track of the address the person typed for a computer
 * running the AI, works out the actual address to use (that typed one, or
 * a fixed local address when the AI is set to run on the Deck itself), and
 * remembers the last time the plugin checked whether that address could be
 * reached.
 *
 * Used for: The plugin's main screen, which passes this down to the Ollama
 * tab, the model routing-order popup, and the code that sends a question
 * to the AI.
 *
 * Solves: Keeps four connection-related pieces of state — the typed
 * address, the address actually in use, the last reachability check, and a
 * counter used to reset the Ollama tab — together as one clearly named
 * piece, instead of scattered loose across the plugin's main screen.
 *
 * Does not: Actually talk to the AI, or decide whether the address is
 * reachable — that check lives on the Ollama tab. Does not save the
 * address to disk by itself either — see pluginStorage for where that
 * happens.
 */
import { useCallback, useMemo, useState } from "react";

import { OLLAMA_LOCAL_ON_DECK_DEFAULT_PCIP } from "../../data/bonsaiSettingsSchema";
import type { DeveloperConnectionStatus } from "../../components/DeveloperTab";
import { peekBonsaiSessionPendingRestore } from "../../utils/bonsaiSessionSurvival";
import { persistOllamaIpIfRoutingToLan as persistOllamaIpIfRoutingToLanUtil } from "../../utils/persistOllamaIp";
import { loadSavedIp, saveIp } from "./pluginStorage";

export type UseOllamaConnectionStateArgs = {
  /** When true the plugin talks to the on-Deck runtime and the entered IP is ignored. */
  ollamaLocalOnDeck: boolean;
};

export type OllamaConnectionState = {
  /** The host the user typed, restored from a survived session or from local storage. */
  ollamaIp: string;
  setOllamaIp: React.Dispatch<React.SetStateAction<string>>;
  /** The host Ask actually uses: the local runtime address when on-Deck, else the trimmed entry. */
  effectiveOllamaPcIp: string;
  /** Writes the IP to local storage only when routing to LAN, so on-Deck use cannot clobber it. */
  persistOllamaIpIfRoutingToLan: (ip: string) => void;
  lastConnectionStatus: DeveloperConnectionStatus | null;
  setLastConnectionStatus: React.Dispatch<React.SetStateAction<DeveloperConnectionStatus | null>>;
  /** Bumped to remount the Ollama tab, discarding its internal state. */
  ollamaTabResetKey: number;
  resetOllamaTab: () => void;
};

export function useOllamaConnectionState({
  ollamaLocalOnDeck,
}: UseOllamaConnectionStateArgs): OllamaConnectionState {
  const [lastConnectionStatus, setLastConnectionStatus] = useState<DeveloperConnectionStatus | null>(null);
  const [ollamaTabResetKey, setOllamaTabResetKey] = useState(0);
  const [ollamaIp, setOllamaIp] = useState(
    () => peekBonsaiSessionPendingRestore()?.ollamaIp ?? loadSavedIp()
  );

  const effectiveOllamaPcIp = useMemo(
    () => (ollamaLocalOnDeck ? OLLAMA_LOCAL_ON_DECK_DEFAULT_PCIP : ollamaIp.trim()),
    [ollamaLocalOnDeck, ollamaIp]
  );

  const persistOllamaIpIfRoutingToLan = useCallback(
    (ip: string) => {
      persistOllamaIpIfRoutingToLanUtil(ollamaLocalOnDeck, saveIp, ip);
    },
    [ollamaLocalOnDeck]
  );

  const resetOllamaTab = useCallback(() => {
    setOllamaTabResetKey((k) => k + 1);
  }, []);

  return {
    ollamaIp,
    setOllamaIp,
    effectiveOllamaPcIp,
    persistOllamaIpIfRoutingToLan,
    lastConnectionStatus,
    setLastConnectionStatus,
    ollamaTabResetKey,
    resetOllamaTab,
  };
}
