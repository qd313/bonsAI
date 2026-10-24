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
import React, { useCallback, useEffect, useRef } from "react";
import { pressThenHandRingOn } from "../../shared/dpad/handRingOnWhenGone";
import {
  registerNavFocus,
  takeNavFocus,
  unregisterNavFocus,
  type NavRefHolder,
} from "../../shared/dpad/navFocusRegistry";
import { toaster } from "@decky/api";
import { Button, Focusable } from "@decky/ui";
import type { ScreenshotItem } from "../../types/bonsaiUi";
import { formatBytes, formatScreenshotTimestamp, toFileUri } from "./mediaFormat";
import { readClipboardText, sanitizeClipboardStashText } from "./clipboardStash";
import { formatDeckyRpcError } from "../../shared/deckyCall";
import { BackChevronIcon, RefreshArrowIcon } from "../../shared/icons/icons";
import { PermissionDenyAction } from "../permissions/PermissionDenyAction";
import type { BonsaiCapabilityKey } from "../permissions/permissionDeepLink";
import { textPx } from "../../styles/textPx";

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
 * 2. The panel itself: B (Steam's cancel button) closes it and hands the
 *    ring to the question box; Escape or Backspace do the same from a
 *    keyboard. When it opens, the ring is handed into the grid (its first
 *    stop is the newest picture) once pictures are listed, else to the Back
 *    button, through Steam's own transfer (plan 96 F5: before this nothing in
 *    the picker could hold the ring, plan94-P94-SCREENSHOT-try2.json).
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

  /* Steam fills these in: the box and the grid as places the ring can be sent to. */
  const browserNav = useRef<NavRefHolder["current"]>(null);
  const gridNav = useRef<NavRefHolder["current"]>(null);
  useEffect(() => {
    registerNavFocus("screenshot-browser", browserNav);
    registerNavFocus("screenshot-grid", gridNav);
    return () => {
      unregisterNavFocus("screenshot-browser", browserNav);
      unregisterNavFocus("screenshot-grid", gridNav);
    };
  }, []);

  /*
   * Hand the ring into the picker when it opens: the paperclip menu's A unmounted the row that
   * held the ring, so nothing owned it (plan 94). The grid once pictures are listed (Steam's
   * transfer onto a container lands on its first stop, the newest picture), else the Back button.
   * Once only per open, and the grid is tried once more when its pictures arrive after the box.
   */
  const hasPictures = recentScreenshots.length > 0;
  const ringTakenRef = useRef<"none" | "browser" | "grid">("none");
  useEffect(() => {
    if (ringTakenRef.current === "grid") return;
    const take = () => {
      if (hasPictures && takeNavFocus("screenshot-grid")) {
        ringTakenRef.current = "grid";
        return;
      }
      if (ringTakenRef.current === "none" && takeNavFocus("screenshot-browser")) ringTakenRef.current = "browser";
    };
    // After the paint, so Steam has filled the nav refs in.
    const t = window.setTimeout(take, 0);
    return () => window.clearTimeout(t);
  }, [hasPictures, isLoadingRecentScreenshots]);

  /** Close the picker and put the ring on the question box: the control it was on is gone with the box. */
  const closeAndHandRingOn = useCallback(() => {
    onCloseScreenshotBrowser();
    window.setTimeout(() => {
      void takeNavFocus("unified-input");
    }, 0);
  }, [onCloseScreenshotBrowser]);

  return (
    <Focusable
      className="bonsai-full-bleed-row"
      flow-children="vertical"
      ref={screenshotBrowserHostRef}
      {...({
        navRef: browserNav,
        /*
         * B closes the picker only. `onCancelButton` is the one handler that consumes Steam's B (measured
         * for the glossary chip, 2026-08-28); without it B went to the page and backed out of the plugin.
         */
        onCancelButton: (e: unknown) => {
          (e as { preventDefault?: () => void })?.preventDefault?.();
          closeAndHandRingOn();
        },
      } as Record<string, unknown>)}
      onKeyDown={(ev: React.KeyboardEvent<HTMLDivElement>) => {
        if (ev.key === "Escape" || ev.key === "Backspace") {
          closeAndHandRingOn();
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
          onClick={closeAndHandRingOn}
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
          style={{ minHeight: 34, padding: "0 12px", fontSize: textPx(12), ...presetButtonSurface }}
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
        <div style={{ color: "#f09a8d", fontSize: textPx(11), lineHeight: 1.35 }}>{mediaError}</div>
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
        <div style={{ color: "#9cb0c6", fontSize: textPx(12), lineHeight: 1.4 }}>
          {mediaLibraryEnabled
            ? "No recent screenshots found. Open Steam Media and take a screenshot, then refresh — or use Paste clipboard."
            : "Paste clipboard into Ask, or enable Media library access in Permissions to attach screenshots."}
        </div>
        )
      ) : (
        <Focusable
          {...({ navRef: gridNav } as Record<string, unknown>)}
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
              onClick={(e: MouseEvent) =>
                // The picker closes with the picture chosen, taking the pressed button with it: hand the ring on.
                pressThenHandRingOn(e.currentTarget as HTMLElement | null, () => onSelectRecentScreenshot(item), () => {
                  void takeNavFocus("unified-input");
                })
              }
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
              <span style={{ fontSize: textPx(10), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.name}
              </span>
              <span style={{ fontSize: textPx(9), color: "#8ea2b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {formatScreenshotTimestamp(item.mtime)}
              </span>
              <span style={{ fontSize: textPx(10), color: "#d9e6f4", fontWeight: 700 }}>
                Size: {formatBytes(item.size_bytes ?? 0)}
              </span>
            </Button>
          ))}
        </Focusable>
      )}
    </Focusable>
  );
}
