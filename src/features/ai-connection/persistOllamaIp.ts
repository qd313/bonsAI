/**
 * Title: Remembering the network Ollama address, only when it is actually in use
 *
 * Purpose: The plugin can talk to an AI model running on the Deck itself, or to one running on
 * another PC on the same network. This file makes sure the remembered network address only gets
 * overwritten while the Deck is actually set to talk to that other PC — never while it is set to
 * run models on the Deck itself.
 *
 * Used for: the Ollama tab, and settings save, whenever the Deck is not set to run models
 * locally (`ollamaLocalOnDeck` is false).
 *
 * Solves: without this check, switching the Deck to run models locally and back again could
 * overwrite the remembered network address with something stale or wrong, even though the
 * person never touched it.
 *
 * Does not: check whether that address actually works — a separate connection check does that.
 */
/** Persist LAN Ollama host to localStorage only when routing Ask to a remote PC (not local-on-Deck). */
export function persistOllamaIpIfRoutingToLan(
  ollamaLocalOnDeck: boolean,
  saveIp: (ip: string) => void,
  ip: string
): void {
  if (ollamaLocalOnDeck) return;
  saveIp(ip);
}
