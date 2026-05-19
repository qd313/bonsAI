import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { appendAppDesktopLogWithPrefs, type AppDesktopLogPrefs } from "../utils/appDesktopLog";

/**
 * Feeds the Debug tab with uncaught errors without crashing the plugin shell.
 * Decky keeps the panel mounted across tab switches, so listeners stay global for the plugin lifetime.
 */
export function useCapturedFrontendErrors(
  appLogPrefs?: AppDesktopLogPrefs | null
): [string[], Dispatch<SetStateAction<string[]>>] {
  const [capturedErrors, setCapturedErrors] = useState<string[]>([]);
  const appLogPrefsRef = useRef(appLogPrefs);
  useEffect(() => {
    appLogPrefsRef.current = appLogPrefs ?? null;
  }, [appLogPrefs]);

  useEffect(() => {
    const onErr = (e: Event) => {
      const errEvent = e as ErrorEvent;
      const msg = errEvent?.error?.stack ?? errEvent?.error?.message ?? errEvent?.message ?? String(e);
      setCapturedErrors((p) => [msg, ...p]);
      const prefs = appLogPrefsRef.current;
      if (prefs) {
        appendAppDesktopLogWithPrefs(prefs, "verbose", "frontend.error", "uncaught error", {
          message_len: msg.length,
        });
      }
      try {
        console.error("GLOBAL ERROR", e);
      } catch {
        /* ignore */
      }
    };

    const onRejection = (e: PromiseRejectionEvent) => {
      const reason = e?.reason ?? e;
      const msg = reason?.stack ?? reason?.message ?? String(reason);
      setCapturedErrors((p) => ["(unhandledrejection) " + msg, ...p]);
      const prefs = appLogPrefsRef.current;
      if (prefs) {
        appendAppDesktopLogWithPrefs(prefs, "verbose", "frontend.error", "unhandled rejection", {
          message_len: msg.length,
        });
      }
      try {
        console.error("UNHANDLED REJECTION", e);
      } catch {
        /* ignore */
      }
    };

    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return [capturedErrors, setCapturedErrors];
}
