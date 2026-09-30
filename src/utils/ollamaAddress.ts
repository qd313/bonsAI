/**
 * Title: Telling an https Ollama address apart
 *
 * Purpose: bonsAI only talks to Ollama over plain http. An address typed as https:// used to be
 * sent as http anyway, so the questions travelled unencrypted to a server the person thought was
 * secured. The back end now refuses it; this is the same check for the screen, so the address
 * field can say so as the person types, without waiting for a round trip.
 *
 * Used for: the Ollama tab's "PC address" field and its Test connection button.
 *
 * Solves: One place holds the words, and they match py_modules/backend/ollama_urls.py.
 *
 * Does not: Decide whether an address works. Only the back end tries it.
 */

/** Same words as HTTPS_NOT_SUPPORTED_MESSAGE in py_modules/backend/ollama_urls.py. */
export const OLLAMA_HTTPS_NOT_SUPPORTED_MESSAGE =
  "bonsAI can only talk to Ollama over http for now. Use an http:// address.";

export function isHttpsOllamaAddress(raw: string): boolean {
  return (raw || "").trim().toLowerCase().startsWith("https://");
}
