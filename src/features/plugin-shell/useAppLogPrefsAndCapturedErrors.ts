/**
 * Title: Desktop log prefs, captured frontend errors, and the tab-open log line
 *
 * Purpose: Bundles the desktop-log preference object every `appendAppDesktopLogWithPrefs` call
 * needs, the Debug tab's captured-error list that reads it, and the one log line written each
 * time the Developer or Settings tab opens.
 *
 * Used for: `index.tsx`, wherever it logs (this hook's own tab-open line, and
 * `useBonsaiAskOrchestration`'s `onExternalFailure` callback, which reads `appLogPrefs` back
 * out).
 *
 * Solves: Nothing new — the same memo, hook call, and effect `Content` used to declare inline,
 * moved out as one feature's state plus its effects.
 *
 * Does not: Decide what counts as verbose logging, or write the log line itself —
 * `appDesktopLog.ts` does both; this only builds the prefs object and calls it.
 */
import { useEffect, useMemo, type Dispatch, type SetStateAction } from "react";

import { appendAppDesktopLogWithPrefs, type AppDesktopLogPrefs } from "../../utils/appDesktopLog";
import { useCapturedFrontendErrors } from "../../hooks/useCapturedFrontendErrors";

export type UseAppLogPrefsAndCapturedErrorsArgs = {
  desktopAppLogLevel: AppDesktopLogPrefs["desktopAppLogLevel"];
  filesystemWrite: boolean;
  currentTab: string;
  settingsLoaded: boolean;
};

export type AppLogPrefsAndCapturedErrors = {
  appLogPrefs: AppDesktopLogPrefs;
  capturedErrors: string[];
  setCapturedErrors: Dispatch<SetStateAction<string[]>>;
};

/*
 * In: the log level and filesystem-write permission the prefs object carries, plus the current
 * tab and whether settings have loaded, for the tab-open log line.
 * Out: the prefs object (read again later by the Ask orchestration hook's external-failure
 * logging), and the captured-error list the Debug tab draws.
 * What can go wrong: the tab-open effect fires on every tab switch into Developer or Settings,
 * not just the first -- that repetition is deliberate, matching the device evidence recorded
 * where this effect was written.
 */
export function useAppLogPrefsAndCapturedErrors({
  desktopAppLogLevel,
  filesystemWrite,
  currentTab,
  settingsLoaded,
}: UseAppLogPrefsAndCapturedErrorsArgs): AppLogPrefsAndCapturedErrors {
  const appLogPrefs = useMemo(
    () => ({
      desktopAppLogLevel,
      capabilities: { filesystem_write: filesystemWrite },
    }),
    [desktopAppLogLevel, filesystemWrite]
  );
  const [capturedErrors, setCapturedErrors] = useCapturedFrontendErrors(appLogPrefs);

  useEffect(() => {
    if (!settingsLoaded) return;
    if (currentTab !== "developer" && currentTab !== "settings") return;
    appendAppDesktopLogWithPrefs(appLogPrefs, "verbose", "ui.tab", `opened ${currentTab} tab`);
  }, [currentTab, settingsLoaded, appLogPrefs]);

  return { appLogPrefs, capturedErrors, setCapturedErrors };
}
