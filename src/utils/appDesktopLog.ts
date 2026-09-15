/**
 * Title: Writing a line to the desktop log file
 *
 * Purpose: When something worth writing down happens on the AI side, this file can save it as one
 * line in a log file under Desktop/bonsAI_logs, sitting right on the player's own computer where
 * they can open and read it directly. It never waits for that write to finish, and never blocks
 * anything on screen while it happens — if the write is slow or fails, the person using the plugin
 * never notices.
 *
 * Used for: useCapturedFrontendErrors (so an on-screen error gets a record on disk too), the AI
 * question flow, and extra logging turned on for troubleshooting.
 *
 * Solves: gives a record of what happened that survives after the plugin's own window closes,
 * without making anything on screen wait for a disk write to finish.
 *
 * Does not: read the log back or show it anywhere in the plugin — see the Developer tab and the
 * back end's own way of reading its logs back for that. Two things must both allow it before
 * anything is sent: the player must have already granted the "write files" permission, and the
 * chosen log level (off, normal, or extra detail) must allow this particular line.
 */
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS } from "./deckyCall";
import type { BonsaiCapabilities, DesktopAppLogLevel } from "../data/bonsaiSettingsSchema";
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
