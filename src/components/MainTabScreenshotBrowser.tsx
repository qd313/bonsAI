/**
 * Title: Screenshot browser panel
 *
 * Purpose: The screen that opens when someone picks "browse recent" from the
 * attach menu next to the question box. It shows a grid of recent screenshots
 * to tap and attach, a "Paste clipboard" button that drops whatever is on the
 * clipboard into the question instead, and a refresh button. If screenshot
 * access is not allowed, or there is nothing to show yet, it explains why
 * instead of showing an empty grid, and offers a way to turn access on.
 *
 * Used for: MainTab, once a person opens the attach menu and chooses "browse
 * recent".
 *
 * Solves: Gives the picker its own self-contained, D-pad-friendly grid, with
 * its own loading, empty, and permission-denied states, instead of MainTab
 * having to hold all of that itself.
 *
 * Does not: Take the screenshot, or turn on the media-library permission —
 * both happen elsewhere. This file is only told whether they are allowed.
 */
import React, { useCallback } from "react";
import { toaster } from "@decky/api";
import { Button, Focusable } from "@decky/ui";
import type { ScreenshotItem } from "../types/bonsaiUi";
import { formatBytes, formatScreenshotTimestamp, toFileUri } from "../utils/mediaFormat";
import { readClipboardText, sanitizeClipboardStashText } from "../utils/clipboardStash";
import { formatDeckyRpcError } from "../utils/deckyCall";
import { BackChevronIcon, RefreshArrowIcon } from "./icons";
import { PermissionDenyAction } from "./PermissionDenyAction";
import type { BonsaiCapabilityKey } from "../utils/permissionDeepLink";

export type MainTabScreenshotBrowserProps = {
  fullBleedRowStyle: React.CSSProperties;
  presetButtonSurface: React.CSSProperties;
  screenshotBrowserHostRef: React.Ref<HTMLDivElement>;
  onCloseScreenshotBrowser: () => void;
  loadRecentScreenshots: (limit?: number) => Promise<void>;
  mediaError: string;
  mediaLibraryEnabled?: boolean;
  recentScreenshots: ScreenshotItem[];
  isLoadingRecentScreenshots: boolean;
  onSelectRecentScreenshot: (item: ScreenshotItem) => void;
  setUnifiedInput: React.Dispatch<React.SetStateAction<string>>;
  onNavigateToPermissions?: (capability: BonsaiCapabilityKey) => void;
};

/*
 * In: the current list of recent screenshots, whether the list is still
 * loading, any error text, whether media-library access is turned on, and
 * the callbacks for closing the panel, refreshing, picking a screenshot, and
 * pasting the clipboard.
 * Out: the panel — a small toolbar (back, paste clipboard, refresh), then
 * either an error, an explanation of why the grid is empty, or the grid of
 * screenshot buttons itself.
 * What can go wrong: a permission problem shows its own "turn this on"
 * prompt rather than a raw error message when there is somewhere to send the
 * person; pasting an empty clipboard shows a toast instead of pasting
 * nothing; a load or paste failure is shown as readable text, not thrown.
 *
 * 1. onPasteClipboardStash() reads the clipboard, cleans up what it finds,
 *    warns if it was empty, otherwise adds it to the question box and closes
 *    this panel.
 * 2. The panel itself: Escape or Backspace closes it.
 * 3. A small toolbar: Back, Paste clipboard, and Refresh (the last one
 *    disabled while already loading or while media-library access is off).
 * 4. An error, if there is one — as a permission prompt when the caller can
 *    jump the person to Permissions, or as plain text otherwise.
 * 5. If there are no screenshots yet and nothing is loading: a permission
 *    prompt when access is off, or an explanation of why the grid is empty
 *    when access is on but nothing has been found.
 * 6. Otherwise: the grid itself, one button per screenshot, each showing a
 *    thumbnail, its name, when it was taken, and its file size.
 */
export function MainTabScreenshotBrowser({
  fullBleedRowStyle,
  presetButtonSurface,
  screenshotBrowserHostRef,
  onCloseScreenshotBrowser,
  loadRecentScreenshots,
  mediaError,
  mediaLibraryEnabled = true,
  recentScreenshots,
  isLoadingRecentScreenshots,
  onSelectRecentScreenshot,
  setUnifiedInput,
  onNavigateToPermissions,
}: MainTabScreenshotBrowserProps) {
  const onPasteClipboardStash = useCallback(async () => {
    try {
      const raw = await readClipboardText();
      const piece = sanitizeClipboardStashText(raw);
      if (!piece) {
        toaster.toast({ title: "Clipboard empty", body: "", duration: 2500 });
        return;
      }
      setUnifiedInput((prev) => {
        const base = (prev || "").trim();
        return base ? `${base}\n\n${piece}` : piece;
      });
      onCloseScreenshotBrowser();
      toaster.toast({ title: "Pasted from clipboard", body: "", duration: 2200 });
    } catch (e: unknown) {
      toaster.toast({ title: "Clipboard unavailable", body: formatDeckyRpcError(e), duration: 4000 });
    }
  }, [setUnifiedInput, onCloseScreenshotBrowser]);

  return (
    <Focusable
      className="bonsai-full-bleed-row"
      flow-children="vertical"
      ref={screenshotBrowserHostRef}
      onKeyDown={(ev: React.KeyboardEvent<HTMLDivElement>) => {
        if (ev.key === "Escape" || ev.key === "Backspace") {
          onCloseScreenshotBrowser();
          ev.preventDefault();
        }
      }}
      style={{
        ...fullBleedRowStyle,
        border: "1px solid rgba(255,255,255,0.14)",
        borderRadius: 8,
        background: "rgba(12, 18, 25, 0.96)",
        padding: 10,
        display: "grid",
        gap: 8,
        minHeight: 320,
        position: "relative",
      }}
    >
      <Focusable flow-children="horizontal" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button
          onClick={onCloseScreenshotBrowser}
          aria-label="Back"
          style={{ minWidth: 52, width: 52, minHeight: 34, padding: 0, ...presetButtonSurface }}
        >
          <BackChevronIcon size={20} />
        </Button>
        <Button
          onClick={() => {
            void onPasteClipboardStash();
          }}
          aria-label="Paste from clipboard into Ask field"
          style={{ minHeight: 34, padding: "0 12px", fontSize: 12, ...presetButtonSurface }}
        >
          Paste clipboard
        </Button>
        <Button
          onClick={() => {
            void loadRecentScreenshots(24);
          }}
          disabled={isLoadingRecentScreenshots || !mediaLibraryEnabled}
          aria-label="Refresh screenshots"
          style={{ minWidth: 52, width: 52, minHeight: 34, padding: 0, ...presetButtonSurface }}
        >
          <RefreshArrowIcon size={20} />
        </Button>
      </Focusable>

      {mediaError && onNavigateToPermissions ? (
        <PermissionDenyAction
          capability="media_library_access"
          message={mediaError}
          onJump={onNavigateToPermissions}
          compact
        />
      ) : mediaError ? (
        <div style={{ color: "#f09a8d", fontSize: 11, lineHeight: 1.35 }}>{mediaError}</div>
      ) : null}

      {recentScreenshots.length === 0 && !isLoadingRecentScreenshots ? (
        !mediaLibraryEnabled && onNavigateToPermissions ? (
          <PermissionDenyAction
            capability="media_library_access"
            message="Paste clipboard into Ask, or enable Media library access in Permissions to attach screenshots."
            onJump={onNavigateToPermissions}
            compact
          />
        ) : (
        <div style={{ color: "#9cb0c6", fontSize: 12, lineHeight: 1.4 }}>
          {mediaLibraryEnabled
            ? "No recent screenshots found. Open Steam Media and take a screenshot, then refresh — or use Paste clipboard."
            : "Paste clipboard into Ask, or enable Media library access in Permissions to attach screenshots."}
        </div>
        )
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 8,
            alignContent: "start",
            width: "100%",
            maxWidth: "100%",
            overflow: "hidden",
          }}
        >
          {recentScreenshots.map((item) => (
            <Button
              key={item.path}
              onClick={() => onSelectRecentScreenshot(item)}
              style={{
                minHeight: 144,
                ...presetButtonSurface,
                padding: 6,
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                justifyContent: "flex-start",
                gap: 4,
                textAlign: "left",
              }}
            >
              <img
                src={item.preview_data_uri || toFileUri(item.path)}
                alt={item.name}
                style={{
                  width: "100%",
                  height: 94,
                  objectFit: "cover",
                  borderRadius: 4,
                  background: "rgba(255,255,255,0.04)",
                }}
              />
              <span style={{ fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.name}
              </span>
              <span style={{ fontSize: 9, color: "#8ea2b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {formatScreenshotTimestamp(item.mtime)}
              </span>
              <span style={{ fontSize: 10, color: "#d9e6f4", fontWeight: 700 }}>
                Size: {formatBytes(item.size_bytes ?? 0)}
              </span>
            </Button>
          ))}
        </div>
      )}
    </Focusable>
  );
}
