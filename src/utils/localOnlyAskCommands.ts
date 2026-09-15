/**
 * Title: Questions that do not need the AI, or a PC, to answer
 *
 * Purpose: A few special typed lines are not really questions for the AI at all — turning the content
 * filter on or off, running the Deck controller shortcut setup, or checking for VAC (anti-cheat)
 * problems. Those are handled directly by the back end without ever reaching the AI model, which
 * normally runs on a separate PC over the local network. This file recognizes that a typed line is
 * one of those special commands, so the screen knows in advance that it should not block sending it
 * just because the field for that PC's network address is empty.
 *
 * Used for: the code that starts a background AI question (useBonsaiAskOrchestration), checked right
 * before it actually sends anything.
 *
 * Solves: without this, the screen would demand a PC address even for a command that was never going
 * to use one, blocking the player from running it.
 *
 * Does not: run the command itself — recognizing one of these lines here has to keep matching exactly
 * how the back end's own command handlers recognize the same lines, but running them is entirely the
 * back end's job.
 */
import { INPUT_SANITIZER_COMMAND_DISABLE, INPUT_SANITIZER_COMMAND_ENABLE } from "../data/inputSanitizerCommands";

/** Match ``backend/services/shortcut_setup_commands.py`` / ``vac_check_commands`` slash handling. */
function normalizeAskWithOptionalLeadingSlash(text: string): string {
  let s = (text || "").trim().toLowerCase();
  if (s.startsWith("/")) {
    s = s.slice(1).trimStart();
  }
  return s;
}

function isSanitizerKeywordCommand(question: string): boolean {
  const key = (question || "").trim().toLowerCase();
  return key === INPUT_SANITIZER_COMMAND_DISABLE.toLowerCase() || key === INPUT_SANITIZER_COMMAND_ENABLE.toLowerCase();
}

const SHORTCUT_DECK = "bonsai:shortcut-setup-deck";
const SHORTCUT_STADIA = "bonsai:shortcut-setup-stadia";
const VAC_PREFIX = "bonsai:vac-check";

function isShortcutSetupCommand(question: string): boolean {
  const key = normalizeAskWithOptionalLeadingSlash(question);
  return key === SHORTCUT_DECK || key === SHORTCUT_STADIA;
}

/** True when the Ask line is a ``bonsai:vac-check`` command (same detection as ``parse_vac_check_command``). */
function isVacCheckCommand(question: string): boolean {
  let raw = (question || "").trim();
  if (raw.startsWith("/")) {
    raw = raw.slice(1).trimStart();
  }
  const low = raw.toLowerCase();
  const prefix = VAC_PREFIX.toLowerCase();
  if (low === prefix) return true;
  if (low.startsWith(`${prefix} `) || low.startsWith(`${prefix}\t`)) return true;
  return false;
}

/**
 * Ask lines that the backend handles without Ollama / LAN PC IP (see ``start_background_game_ai``).
 * When this is true, the Main tab must not block submission on an empty Ollama host field.
 */
export function questionBypassesOllamaPcIpRequirement(question: string): boolean {
  return isSanitizerKeywordCommand(question) || isShortcutSetupCommand(question) || isVacCheckCommand(question);
}
