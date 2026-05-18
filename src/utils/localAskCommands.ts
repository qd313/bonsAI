/**
 * Mirrors ``main.py`` / ``start_background_game_ai`` local-command detection: these Asks never
 * touch Ollama, so the LAN PC IP field may be empty.
 *
 * Keep aligned with:
 * - ``classify_sanitizer_command`` (trim + casefold, no leading-slash strip)
 * - ``classify_shortcut_setup_command`` / ``normalize_command_input_with_slash``
 * - ``parse_vac_check_command`` in ``vac_check_commands.py``
 */
import { INPUT_SANITIZER_COMMAND_DISABLE, INPUT_SANITIZER_COMMAND_ENABLE } from "../data/inputSanitizerCommands";

const CF_DISABLE = INPUT_SANITIZER_COMMAND_DISABLE.toLowerCase();
const CF_ENABLE = INPUT_SANITIZER_COMMAND_ENABLE.toLowerCase();
const CF_SHORTCUT_DECK = "bonsai:shortcut-setup-deck";
const CF_SHORTCUT_STADIA = "bonsai:shortcut-setup-stadia";
const CF_VAC_PREFIX = "bonsai:vac-check";

function normalizeSanitizerKey(text: string): string {
  return (text || "").trim().toLowerCase();
}

function normalizeShortcutKey(text: string): string {
  let s = (text || "").trim().toLowerCase();
  if (s.startsWith("/")) {
    s = s.slice(1).trimStart();
  }
  return s;
}

function isSanitizerKeywordCommand(text: string): boolean {
  const k = normalizeSanitizerKey(text);
  return k === CF_DISABLE || k === CF_ENABLE;
}

function isShortcutSetupCommand(text: string): boolean {
  const k = normalizeShortcutKey(text);
  return k === CF_SHORTCUT_DECK || k === CF_SHORTCUT_STADIA;
}

function isVacCheckCommand(text: string): boolean {
  let raw = (text || "").trim();
  if (raw.startsWith("/")) {
    raw = raw.slice(1).trimStart();
  }
  const low = raw.toLowerCase();
  if (low === CF_VAC_PREFIX) return true;
  return low.startsWith(`${CF_VAC_PREFIX} `) || low.startsWith(`${CF_VAC_PREFIX}\t`);
}

/** True when the Ask is handled entirely on the plugin backend without an Ollama endpoint. */
export function isLocalAskCommandWithoutOllama(text: string): boolean {
  return isSanitizerKeywordCommand(text) || isShortcutSetupCommand(text) || isVacCheckCommand(text);
}
