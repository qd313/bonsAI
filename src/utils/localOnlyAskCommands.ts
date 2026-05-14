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
