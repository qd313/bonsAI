/** Persist LAN Ollama host to localStorage only when routing Ask to a remote PC (not local-on-Deck). */
export function persistOllamaIpIfRoutingToLan(
  ollamaLocalOnDeck: boolean,
  saveIp: (ip: string) => void,
  ip: string
): void {
  if (ollamaLocalOnDeck) return;
  saveIp(ip);
}
