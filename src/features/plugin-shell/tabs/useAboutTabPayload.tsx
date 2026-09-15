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
 * Solves: Keeps the three fixed project links defined in one place
 * instead of scattered through the main plugin screen's own code.
 *
 * Does not: Own which reply language is chosen — the caller supplies both
 * the current choice and what happens when it changes.
 */
import React, { useMemo } from "react";

import { AboutTab } from "../../../components/AboutTab";
import { GITHUB_ISSUES_URL, OLLAMA_UPSTREAM_REPO_URL } from "../../../data/storageKeys";

const GITHUB_REPO_URL = GITHUB_ISSUES_URL.replace(/\/issues$/, "");

type AboutTabProps = React.ComponentProps<typeof AboutTab>;

export type UseAboutTabPayloadArgs = Omit<
  AboutTabProps,
  "githubRepoUrl" | "ollamaRepoUrl" | "githubIssuesUrl"
>;

/**
 * In: the reply-language value and its setter, plus a couple of display
 * strings for the language picker.
 * Out: the finished About tab element, rebuilt only when one of those
 * values changes.
 * Can go wrong: nothing — this only wires values into the tab component.
 */
export function useAboutTabPayload({
  replyLanguage,
  onReplyLanguageChange,
  effectiveLang,
  steamClientLanguageLabel,
  t,
}: UseAboutTabPayloadArgs): React.ReactElement {
  return useMemo(
    () => (
      <AboutTab
        githubRepoUrl={GITHUB_REPO_URL}
        ollamaRepoUrl={OLLAMA_UPSTREAM_REPO_URL}
        githubIssuesUrl={GITHUB_ISSUES_URL}
        replyLanguage={replyLanguage}
        onReplyLanguageChange={onReplyLanguageChange}
        effectiveLang={effectiveLang}
        steamClientLanguageLabel={steamClientLanguageLabel}
        t={t}
      />
    ),
    [replyLanguage, onReplyLanguageChange, effectiveLang, steamClientLanguageLabel, t]
  );
}
