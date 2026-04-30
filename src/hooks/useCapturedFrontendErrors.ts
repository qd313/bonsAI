import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

/**
 * Feeds the Debug tab with uncaught errors without crashing the plugin shell.
 * Decky keeps the panel mounted across tab switches, so listeners stay global for the plugin lifetime.
 */
export function useCapturedFrontendErrors(): [string[], Dispatch<SetStateAction<string[]>>] {
  const [capturedErrors, setCapturedErrors] = useState<string[]>([]);

  useEffect(() => {
    const onErr = (e: Event) => {
      const errEvent = e as ErrorEvent;
      const msg = errEvent?.error?.stack ?? errEvent?.error?.message ?? errEvent?.message ?? String(e);
      setCapturedErrors((p) => [msg, ...p]);
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
