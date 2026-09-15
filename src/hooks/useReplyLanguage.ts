/**
 * Title: Which language the screen's own text is shown in
 *
 * Purpose: Asks the back end what language Ask replies and the screen's
 * own wording should use — the person's chosen override if they set one,
 * or Steam's own language otherwise — and hands back a small helper,
 * called `t`, that every piece of on-screen text is passed through to be
 * translated. A phrase with no translation yet always falls back to
 * English rather than showing a blank or a broken key.
 *
 * Used for: The plugin's main screen, and the reply-language rows on the
 * About and Settings tabs.
 *
 * Solves: Keeps every piece of on-screen wording following the person's
 * language choice, worked out in one place, rather than each screen file
 * figuring out the current language for itself.
 *
 * Does not: Decide what language the AI itself replies in, or how that
 * choice reaches the AI — both live on the back end. This file only reads
 * what the back end has already decided, for the screen's own text.
 */
import { useCallback, useEffect, useState } from "react";
import { callDeckyWithTimeout } from "../utils/deckyCall";
import {
  REPLY_LANGUAGE_FOLLOW_SYSTEM,
  type ReplyLanguageId,
} from "../data/replyLanguage";
import { t as translate } from "../utils/i18n";
import type { UiStringKey } from "../i18n/keys";
import type { UiStringVars } from "../i18n/catalog";

export type ReplyLanguageSnapshot = {
  override: ReplyLanguageId;
  steam_client_language: string;
  effective: string;
  display_name: string;
};

const DEFAULT_SNAPSHOT: ReplyLanguageSnapshot = {
  override: REPLY_LANGUAGE_FOLLOW_SYSTEM,
  steam_client_language: "english",
  effective: "english",
  display_name: "English",
};

/** Effective Ask reply language + ``t()`` helper (backend snapshot is authoritative). */
export function useReplyLanguage(replyLanguage: ReplyLanguageId) {
  const [snapshot, setSnapshot] = useState<ReplyLanguageSnapshot>(DEFAULT_SNAPSHOT);

  const refresh = useCallback(async () => {
    try {
      const snap = await callDeckyWithTimeout<[], ReplyLanguageSnapshot>(
        "get_reply_language_snapshot",
        []
      );
      if (snap && typeof snap.effective === "string") {
        setSnapshot(snap);
      }
    } catch {
      /* keep prior snapshot */
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [replyLanguage, refresh]);

  const effectiveLang = snapshot.effective || "english";

  const t = useCallback(
    (key: UiStringKey, vars?: UiStringVars) => translate(key, effectiveLang, vars),
    [effectiveLang],
  );

  return {
    snapshot,
    effectiveLang,
    steamClientLanguage: snapshot.steam_client_language,
    steamClientLanguageLabel: snapshot.display_name,
    refresh,
    t,
  };
}
