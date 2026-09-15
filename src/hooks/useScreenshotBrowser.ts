/**
 * Title: Screenshot browser
 *
 * Purpose: Runs the "attach a screenshot" panel on the Ask screen — showing
 * recent game screenshots, taking a new one on the spot, and picking one to
 * send with the next question. It keeps working correctly even though
 * opening a Decky panel on top of the plugin throws the plugin's own screen
 * away and rebuilds it from scratch when the panel closes.
 *
 * Used for: The Attach button on the Ask screen and the screenshot browser
 * panel it opens.
 *
 * Solves: Steam's screenshot folder and the plugin's own capture both list
 * the same picture; this hook is the one place that reads both permissions
 * and both sources correctly, so callers do not each have to get it right.
 *
 * Does not: Send the picture to the AI, or decide whether it is relevant —
 * it only lists, captures, and marks one as "ready to attach".
 */
import { useCallback, useRef, useState } from "react";
import { toaster } from "@decky/api";
import { Navigation, Router } from "@decky/ui";
import type { AskAttachment, ScreenshotItem } from "../types/bonsaiUi";
import { callDeckyWithTimeout, formatDeckyRpcError } from "../utils/deckyCall";
import { peekBonsaiSessionPendingRestore } from "../utils/bonsaiSessionSurvival";

type RecentScreenshotsResponse = {
  success: boolean;
  items: ScreenshotItem[];
  error?: string;
};

/**
 * In: the raw screenshot list from the backend, which can list the same
 * picture twice — once from Steam's own screenshot folder, once from a
 * copy the plugin made of its own capture.
 * Out: the same list with duplicates collapsed to one entry each,
 * preferring the Steam folder's copy over the plugin's mirror.
 * Can go wrong: two screenshots are matched as duplicates by the timestamp
 * in their file name (or, failing that, their file path); a file whose
 * name and path both lack that timestamp falls back to a key built from
 * its own path, so it can only ever match itself.
 */
function dedupeScreenshotItems(items: ScreenshotItem[]): ScreenshotItem[] {
  const captureTimestampKey = (item: ScreenshotItem): string => {
    const fromName = /(\d{8}-\d{6})/.exec(item.name)?.[1];
    if (fromName) return fromName;
    const fromPath = /(\d{8}-\d{6})/.exec(item.path)?.[1];
    return fromPath ?? `${item.path}|${item.mtime}|${item.size_bytes ?? 0}`;
  };
  const byKey = new Map<string, ScreenshotItem>();
  const order: string[] = [];
  for (const item of items) {
    const key = captureTimestampKey(item);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, item);
      order.push(key);
      continue;
    }
    const preferNew =
      (existing.source !== "steam_recent" && item.source === "steam_recent") ||
      (existing.name.startsWith("bonsai-game-") && !item.name.startsWith("bonsai-game-"));
    if (preferNew) {
      byKey.set(key, item);
    }
  }
  return order.map((key) => byKey.get(key)!);
}

export type UseScreenshotBrowserOptions = {
  getIsAsking: () => boolean;
  mediaLibraryAccess: boolean;
  filesystemWrite: boolean;
};

/**
 * In: whether a question is currently being asked (so a capture cannot
 * start mid-Ask), and the two permission flags that gate saving files.
 * Out: everything the screen needs — the current list, loading and
 * capturing flags, any error message, the picture chosen to attach, and
 * every action button's handler.
 * Can go wrong: none of the steps roll back on a partial failure — if the
 * panel opens but the list fails to load, it stays open showing the error
 * instead of closing itself.
 *
 * 1. State: is the panel open, any error message, the loaded list, a
 *    loading flag, a capturing flag, and the chosen attachment — all
 *    seeded from a saved snapshot if the plugin is being rebuilt after a
 *    Decky panel closed, so a run in progress is not lost.
 * 2. `loadRecentScreenshots()` asks the backend for the running game's
 *    most recent screenshots, then removes duplicates before storing them.
 * 3. `onTakeScreenshot()` checks permission first, asks Steam to take and
 *    save a screenshot, closes the side menu so the flash is not hidden
 *    behind it, shows a toast either way, and reloads the list on success.
 * 4. `onOpenScreenshotBrowser()` opens the panel and loads the list, but
 *    only when permission is granted — otherwise it shows an inline
 *    message instead of calling the backend at all.
 * 5. `onCloseScreenshotBrowser()` closes the panel and clears any error.
 * 6. `onSelectRecentScreenshot()` marks a screenshot as the pending
 *    attachment for the next question, closes the panel, and confirms
 *    with a toast.
 * 7. `restoreScreenshotBrowserSnapshot()` puts every piece of this hook's
 *    state back at once, for the same Decky-remount recovery as step 1.
 * 8. Every piece above is handed back together as one object.
 */
export function useScreenshotBrowser({
  getIsAsking,
  mediaLibraryAccess,
  filesystemWrite,
}: UseScreenshotBrowserOptions) {
  const [isScreenshotBrowserOpen, setIsScreenshotBrowserOpen] = useState(
    () => peekBonsaiSessionPendingRestore()?.isScreenshotBrowserOpen ?? false,
  );
  const [mediaError, setMediaError] = useState(
    () => peekBonsaiSessionPendingRestore()?.mediaError ?? "",
  );
  const [recentScreenshots, setRecentScreenshots] = useState<ScreenshotItem[]>(
    () => peekBonsaiSessionPendingRestore()?.recentScreenshots ?? [],
  );
  const [isLoadingRecentScreenshots, setIsLoadingRecentScreenshots] = useState(
    () => peekBonsaiSessionPendingRestore()?.isLoadingRecentScreenshots ?? false,
  );
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<AskAttachment | null>(
    () => peekBonsaiSessionPendingRestore()?.selectedAttachment ?? null,
  );
  const screenshotBrowserHostRef = useRef<HTMLDivElement>(null);

  const loadRecentScreenshots = useCallback(async (limit: number = 24) => {
    const runningApp = Router.MainRunningApp;
    const appId = runningApp?.appid?.toString() ?? "";
    setIsLoadingRecentScreenshots(true);
    setMediaError("");
    try {
      const response = await callDeckyWithTimeout<[string, number], RecentScreenshotsResponse>(
        "list_recent_screenshots",
        [appId, limit],
      );
      if (response.success) {
        const rawItems = response.items ?? [];
        setRecentScreenshots(dedupeScreenshotItems(rawItems));
      } else {
        setRecentScreenshots([]);
        setMediaError(response.error ?? "Failed to list recent screenshots.");
      }
    } catch (e: unknown) {
      setRecentScreenshots([]);
      setMediaError(formatDeckyRpcError(e));
    } finally {
      setIsLoadingRecentScreenshots(false);
    }
  }, []);

  const onTakeScreenshot = useCallback(async () => {
    if (getIsAsking() || isCapturingScreenshot) return;
    setMediaError("");
    if (!mediaLibraryAccess && !filesystemWrite) {
      const permissionMsg =
        "Enable Read game & screenshot context in Permissions to save game screenshots.";
      setMediaError(permissionMsg);
      toaster.toast({ title: "Screenshot not saved", body: permissionMsg, duration: 4500 });
      return;
    }
    const runningApp = Router.MainRunningApp;
    const appId = runningApp?.appid?.toString() ?? "";
    setIsCapturingScreenshot(true);
    try {
      const rpcPromise = callDeckyWithTimeout<
        [string],
        { success?: boolean; item?: ScreenshotItem; error?: string }
      >("take_steam_screenshot", [appId]);
      Navigation.CloseSideMenus();
      const response = await rpcPromise;
      if (!response?.success || !response.item?.path) {
        const failMsg = response?.error ?? "Could not save a game screenshot.";
        setMediaError(failMsg);
        toaster.toast({
          title: "Screenshot not saved",
          body: failMsg,
          duration: 5500,
        });
        return;
      }
      setMediaError("");
      toaster.toast({
        title: "Screenshot saved",
        body: "Find it under Attach → Attach recent screenshot.",
        duration: 3200,
      });
      await loadRecentScreenshots(24);
    } catch (e: unknown) {
      const errMsg = formatDeckyRpcError(e);
      setMediaError(errMsg);
      toaster.toast({
        title: "Screenshot not saved",
        body: errMsg,
        duration: 5500,
      });
    } finally {
      setIsCapturingScreenshot(false);
    }
  }, [getIsAsking, isCapturingScreenshot, mediaLibraryAccess, filesystemWrite, loadRecentScreenshots]);

  const onOpenScreenshotBrowser = useCallback(async () => {
    if (getIsAsking()) return;
    setIsScreenshotBrowserOpen(true);
    setMediaError("");
    if (!mediaLibraryAccess) {
      setMediaError("Enable Media library access in Permissions to attach screenshots.");
      return;
    }
    await loadRecentScreenshots(24);
  }, [getIsAsking, mediaLibraryAccess, loadRecentScreenshots]);

  const onCloseScreenshotBrowser = useCallback(() => {
    setIsScreenshotBrowserOpen(false);
    setMediaError("");
  }, []);

  const onSelectRecentScreenshot = useCallback((item: ScreenshotItem) => {
    setSelectedAttachment({
      path: item.path,
      name: item.name,
      source: "recent",
      preview_data_uri: item.preview_data_uri,
      size_bytes: item.size_bytes,
      app_id: item.app_id,
    });
    setIsScreenshotBrowserOpen(false);
    setMediaError("");
    toaster.toast({
      title: "Screenshot attached",
      body: "Recent screenshot ready for your next Ask.",
      duration: 2800,
    });
  }, []);

  const restoreScreenshotBrowserSnapshot = useCallback(
    (snap: {
      selectedAttachment: AskAttachment | null;
      isScreenshotBrowserOpen: boolean;
      mediaError: string;
      recentScreenshots: ScreenshotItem[];
      isLoadingRecentScreenshots: boolean;
    }) => {
      setSelectedAttachment(snap.selectedAttachment);
      setIsScreenshotBrowserOpen(snap.isScreenshotBrowserOpen);
      setMediaError(snap.mediaError);
      setRecentScreenshots(snap.recentScreenshots);
      setIsLoadingRecentScreenshots(snap.isLoadingRecentScreenshots);
    },
    [],
  );

  return {
    screenshotBrowserHostRef,
    isScreenshotBrowserOpen,
    mediaError,
    recentScreenshots,
    isLoadingRecentScreenshots,
    isCapturingScreenshot,
    selectedAttachment,
    setSelectedAttachment,
    setMediaError,
    loadRecentScreenshots,
    onTakeScreenshot,
    onOpenScreenshotBrowser,
    onCloseScreenshotBrowser,
    onSelectRecentScreenshot,
    restoreScreenshotBrowserSnapshot,
  };
}
