/**
 * Title: Names the plugin remembers things under, on this device
 *
 * Purpose: Some things the plugin remembers are kept on the device itself
 * (in the browser storage Steam's panel runs on) rather than saved to the
 * settings file — the last question typed, whether the welcome disclaimer
 * has been dismissed, which tab to reopen on, which saved chat was open
 * last. Each of those needs an exact, unchanging name to be stored and
 * found again under. This file is that list of names, plus a couple of
 * outside web addresses (the GitHub issues page, the Ollama project) used
 * in more than one place.
 *
 * Used for: every place in the plugin that reads or writes one of these
 * remembered values, and the plugin's own startup code, which reads several
 * of them the moment the panel opens.
 *
 * Solves: a name used in two places has to be spelled identically in both,
 * or the plugin would write under one name and read from another. Keeping
 * every name in this one file instead of typing it fresh wherever it is
 * needed is what keeps that from happening.
 *
 * Does not: actually read or write anything. Every name here is inert until
 * some other file's own get/set code uses it — see the comment on each name
 * for which feature it belongs to.
 */
export const UNIFIED_INPUT_STORAGE_KEY = "bonsai:last-query";
export const IP_STORAGE_KEY = "bonsai:pc-ip";
export const IP_DEFAULT = "192.168.1.";
export const DISCLAIMER_STORAGE_KEY = "bonsai:disclaimer-accepted";
export const PLUGIN_HELP_DISMISSED_STORAGE_KEY = "bonsai:plugin-help-dismissed";
/** Last tab the user was on, so reopening the plugin resumes there instead of Main (D15 option B). */
export const LAST_TAB_STORAGE_KEY = "bonsai:last-tab";
/** Epoch ms the last tab was recorded at; only D15 option C (`resume_recent`) reads it. */
export const LAST_TAB_AT_STORAGE_KEY = "bonsai:last-tab-at";
/**
 * Synchronous mirror of the `tab_resume_mode` setting. `settings.json` is the source of truth;
 * the opening tab is picked on the first render, before `load_settings` can answer.
 */
export const TAB_RESUME_MODE_STORAGE_KEY = "bonsai:tab-resume-mode";
export const LOCAL_RUNTIME_BETA_DISMISSED_STORAGE_KEY = "bonsai:local-runtime-beta-dismissed-v1";
/**
 * Which saved chat the session is in, so a QAM close/reopen resumes it.
 *
 * The turns themselves live on disk in the slot file; this is only the pointer. It was previously
 * carried by the modal-survival snapshot alone, which is written when a Decky modal opens — and a
 * QAM close/reopen is not that, so the pointer came back null and the thread read as empty while
 * the slot on disk still held every turn (SESSION-CONTEXT-COUNT-01).
 *
 * `bonsai:`-prefixed deliberately: `clearBonsaiBrowserStorage` removes the whole prefix, so
 * *Clear all plugin data* takes this with it and needs no separate line.
 */
export const ACTIVE_CHAT_SLOT_STORAGE_KEY = "bonsai:active-chat-slot";

/**
 * When each installed Ollama tag was first seen installed, so the pull picker can badge a model
 * **New** for 30 days. Client-side on purpose: nothing on disk records when a pull happened, and
 * a stale badge is worth less than a settings round-trip. `bonsai:`-prefixed so
 * `clearBonsaiBrowserStorage` takes it with *Clear all plugin data*.
 */
export const PULL_MODEL_NEW_BADGE_STORAGE_KEY = "bonsai:pull-model-new-badge-v1";

export const GITHUB_ISSUES_URL = "https://github.com/qd313/bonsAI/issues";
export const OLLAMA_UPSTREAM_REPO_URL = "https://github.com/ollama/ollama";
