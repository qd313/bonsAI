/**
 * Title: One connection test to Ollama, as a plain function
 *
 * Purpose: Asks the back end whether Ollama answers at one address (this Deck's own, or a PC's) and
 * hands back the result in the shape the Ollama tab shows ("Connected, Ollama v0.x, 3 models" or the
 * reason it did not answer). An https address is refused here, never tried, and the wait is long for
 * this Deck's own address because testing it can itself start the service.
 *
 * Used for: the first-run "Where should the AI run?" popup (FirstRunWhereAiRunsModal.tsx), which has no
 * Ollama tab around it to own the test.
 *
 * Solves: The popup needs the same test the Ollama tab's section runs, with the same refusals and the
 * same waits, without mounting that whole section.
 *
 * Does not: Keep any state, stop an older test whose answer arrives late (the caller compares its own
 * counter), or save the address; the tab's own copy of this logic stays where it is until the section
 * is split.
 */
import { callDeckyWithTimeout, formatDeckyRpcError } from "../../../shared/deckyCall";
import { OLLAMA_LOCAL_ON_DECK_DEFAULT_PCIP } from "../../settings/bonsaiSettingsSchema";
import { isHttpsOllamaAddress, OLLAMA_HTTPS_NOT_SUPPORTED_MESSAGE } from "../ollamaAddress";
import {
  LOCAL_LOOPBACK_CONNECTION_TEST_RPC_EXTRA_MS,
  TEST_CONNECTION_TIMEOUT_SECONDS,
} from "../OllamaWhereAiRunsSection.constants";
import type { ConnectionStatus } from "../OllamaWhereAiRunsSection.types";

/** The address a test goes to: this Deck's own when the AI runs here, else the typed PC address. */
export function probeTarget(ollamaLocalOnDeck: boolean, pcAddress: string): string {
  return ollamaLocalOnDeck ? OLLAMA_LOCAL_ON_DECK_DEFAULT_PCIP : pcAddress.trim();
}

/** In: the address (from probeTarget). Out: the answer, which never throws; an empty address gives null. */
export async function probeOllama(target: string): Promise<ConnectionStatus | null> {
  if (!target) return null;
  if (isHttpsOllamaAddress(target)) return { reachable: false, error: OLLAMA_HTTPS_NOT_SUPPORTED_MESSAGE };
  const loopbackLike =
    target === OLLAMA_LOCAL_ON_DECK_DEFAULT_PCIP ||
    /^\s*127\.0\.0\.1\s*(:\s*\d+)?\s*$/i.test(target) ||
    /^\s*localhost\s*(:\s*\d+)?\s*$/i.test(target);
  const rpcDeadlineMs =
    TEST_CONNECTION_TIMEOUT_SECONDS * 1000 + (loopbackLike ? LOCAL_LOOPBACK_CONNECTION_TEST_RPC_EXTRA_MS : 3000);
  try {
    return await callDeckyWithTimeout<[string, number], ConnectionStatus>(
      "test_ollama_connection",
      [target, TEST_CONNECTION_TIMEOUT_SECONDS],
      rpcDeadlineMs,
    );
  } catch (e: unknown) {
    return { reachable: false, error: formatDeckyRpcError(e) };
  }
}
