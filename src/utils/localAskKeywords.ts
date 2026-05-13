/**
 * Keywords handled entirely on the Deck without calling Ollama (must stay aligned with
 * ``main.py`` / ``start_background_game_ai`` ``is_local_ask_command``).
 */

const VAC_PREFIX = "bonsai:vac-check";
const SHORTCUT_DECK = "bonsai:shortcut-setup-deck";
const SHORTCUT_STADIA = "bonsai:shortcut-setup-stadia";

/**
 * True when the Ask line is a backend “local” command so an empty Ollama PC IP field is allowed.
 *
 * Slash handling matches ``normalize_command_input_with_slash`` (shortcut + vac); sanitizer
 * commands use trim + lowercase only, like ``classify_sanitizer_command``.
 */
export function isPcIpOptionalForLocalAsk(question: string): boolean {
  const q = (question || "").trim();
  if (!q) {
    return false;
  }

  const key = q.toLowerCase();
  if (key === "bonsai:disable-sanitize" || key === "bonsai:enable-sanitize") {
    return true;
  }

  let slashKey = key;
  if (slashKey.startsWith("/")) {
    slashKey = slashKey.slice(1).trimStart();
  }
  if (slashKey === SHORTCUT_DECK || slashKey === SHORTCUT_STADIA) {
    return true;
  }

  if (slashKey === VAC_PREFIX || slashKey.startsWith(`${VAC_PREFIX} `) || slashKey.startsWith(`${VAC_PREFIX}\t`)) {
    return true;
  }

  return false;
}
