/**
 * Title: What draws the About tab
 *
 * Purpose: Runs while a person has the About tab open. It builds that
 * screen: the project's links (its code, its issue tracker, and the
 * upstream Ollama project it depends on) and the reply-language picker,
 * and it only rebuilds the screen when something on it actually changes.
 *
 * Used for: The tab bar's always-present About tab.
 *
 * How it works: the reply-language list is Steam's own, and closing it makes Decky throw the whole screen
 * away and build a new one, which reads the settings file. Nothing else on the screen is opened that way
 * without first writing down what it shows, so this list did not survive its own pick (Deck 2026-10-17 and
 * 2026-10-18: the button went back to Follow system and the file still said follow system). Two things
 * make the pick survive, the same two the Thinking pick and the downloads notice use:
 *   1. When Steam opens the list, the caller's `onReplyLanguageMenuOpened` takes the note of the screen
 *      (the shell's `captureSessionBeforeModal`).
 *   2. On a pick, the value is set, the waiting note is patched with it
 *      (`patchPendingSessionSettingsSnapshot`), and that one field goes straight to `save_settings`,
 *      because the settings hook's own 400 ms save is cancelled by the rebuild and a rebuilt screen counts
 *      what it restored as already saved.
 * Both ends write one line to the plugin log (`dbg_fe_log`, tag `about.replyLanguage.*`), so one pick on the
 * Deck shows whether Steam told us the list opened and whether the pick arrived.
 *
 * Solves: Keeps the three fixed project links defined in one place
 * instead of scattered through the main plugin screen's own code.
 *
 * Does not: Own which reply language is chosen — the caller supplies both
 * the current choice and what happens when it changes.
 */
import React, { useCallback, useMemo, useRef } from "react";

import { AboutTab } from "../../about/AboutTab";
import { GITHUB_ISSUES_URL, OLLAMA_UPSTREAM_REPO_URL } from "../../../shared/storageKeys";
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS } from "../../../shared/deckyCall";
import type { ReplyLanguageId } from "../../../shared/i18n/replyLanguage";
import { patchPendingSessionSettingsSnapshot } from "../bonsaiSessionSurvival";

const GITHUB_REPO_URL = GITHUB_ISSUES_URL.replace(/\/issues$/, "");

type AboutTabProps = React.ComponentProps<typeof AboutTab>;

export type UseAboutTabPayloadArgs = Omit<
  AboutTabProps,
  "githubRepoUrl" | "ollamaRepoUrl" | "githubIssuesUrl"
>;

/** One line into the Deck's plugin log. Never throws: a log that fails must not cost the pick. */
function logLanguageStep(tag: string, data: Record<string, unknown>): void {
  void callDeckyWithTimeout<[string, Record<string, unknown>], unknown>(
    "dbg_fe_log",
    [tag, data],
    DECKY_RPC_TIMEOUT_MS
  ).catch(() => {});
}

/**
 * Sends just the picked language to the settings file, right now. Same direct-save shape as
 * `saveThinkingEffortNow` and `turnOnDownloads`. A failed send is only logged: the settings hook's own
 * save still diffs against the disk.
 */
async function saveReplyLanguageNow(next: ReplyLanguageId): Promise<void> {
  try {
    await callDeckyWithTimeout<[{ reply_language: ReplyLanguageId }], unknown>(
      "save_settings",
      [{ reply_language: next }],
      DECKY_RPC_TIMEOUT_MS
    );
  } catch (err) {
    console.error("save_settings failed (reply language)", err);
  }
}

/**
 * In: the reply-language value and its setter, the call that takes the note of the screen when Steam's
 * list opens, plus a couple of display strings for the language picker.
 * Out: the finished About tab element, rebuilt only when one of those
 * values changes.
 * Can go wrong: a pick that arrives after the screen was rebuilt still reaches the file and the waiting
 * note, but cannot change the new screen's own state; the new screen picks it up from the note.
 */
export function useAboutTabPayload({
  replyLanguage,
  onReplyLanguageChange,
  onReplyLanguageMenuOpened,
  effectiveLang,
  steamClientLanguageLabel,
  t,
}: UseAboutTabPayloadArgs): React.ReactElement {
  // The shell's note-taking call changes as the screen changes; kept in a ref so the tab is not rebuilt for it.
  const menuOpenedRef = useRef(onReplyLanguageMenuOpened);
  menuOpenedRef.current = onReplyLanguageMenuOpened;
  const handleMenuOpened = useCallback(() => {
    logLanguageStep("about.replyLanguage.menuOpened", { hasNote: !!menuOpenedRef.current });
    menuOpenedRef.current?.();
  }, []);
  const handlePick = useCallback(
    (next: ReplyLanguageId) => {
      logLanguageStep("about.replyLanguage.pick", { picked: next, was: replyLanguage });
      onReplyLanguageChange(next);
      patchPendingSessionSettingsSnapshot({ replyLanguage: next });
      void saveReplyLanguageNow(next);
    },
    [replyLanguage, onReplyLanguageChange]
  );
  return useMemo(
    () => (
      <AboutTab
        githubRepoUrl={GITHUB_REPO_URL}
        ollamaRepoUrl={OLLAMA_UPSTREAM_REPO_URL}
        githubIssuesUrl={GITHUB_ISSUES_URL}
        replyLanguage={replyLanguage}
        onReplyLanguageChange={handlePick}
        onReplyLanguageMenuOpened={handleMenuOpened}
        effectiveLang={effectiveLang}
        steamClientLanguageLabel={steamClientLanguageLabel}
        t={t}
      />
    ),
    [replyLanguage, handlePick, handleMenuOpened, effectiveLang, steamClientLanguageLabel, t]
  );
}
