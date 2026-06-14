import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS } from "./deckyCall";
import type { BonsaiCapabilities, DesktopAppLogLevel } from "./settingsAndResponse";

export type AppDesktopLogFields = Record<string, string | number | boolean | null>;

function appLogLevelAllows(configured: DesktopAppLogLevel, eventLevel: "default" | "verbose"): boolean {
  if (configured === "off") return false;
  if (eventLevel === "default") return configured === "default" || configured === "verbose";
  return configured === "verbose";
}

/** Fire-and-forget append to Desktop/bonsAI_logs/bonsai-app-*.log when settings allow. */
export function appendAppDesktopLog(
  configuredLevel: DesktopAppLogLevel,
  filesystemWrite: boolean,
  level: "default" | "verbose",
  category: string,
  message: string,
  fields?: AppDesktopLogFields
): void {
  if (!filesystemWrite) return;
  if (!appLogLevelAllows(configuredLevel, level)) return;
  void callDeckyWithTimeout<
    [{ level: string; category: string; message: string; fields?: AppDesktopLogFields }],
    { success?: boolean; skipped?: boolean }
  >(
    "append_app_log",
    [{ level, category, message, fields: fields ?? undefined }],
    DECKY_RPC_TIMEOUT_MS
  ).catch(() => {});
}

export type AppDesktopLogPrefs = {
  desktopAppLogLevel: DesktopAppLogLevel;
  capabilities: Pick<BonsaiCapabilities, "filesystem_write">;
};

export function appendAppDesktopLogWithPrefs(
  prefs: AppDesktopLogPrefs,
  level: "default" | "verbose",
  category: string,
  message: string,
  fields?: AppDesktopLogFields
): void {
  appendAppDesktopLog(
    prefs.desktopAppLogLevel,
    prefs.capabilities.filesystem_write,
    level,
    category,
    message,
    fields
  );
}
