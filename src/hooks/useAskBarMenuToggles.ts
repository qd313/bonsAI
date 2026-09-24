/**
 * Title: Ask bar menu toggles
 *
 * Purpose: The open/close functions for the Ask bar's two popover menus
 * (the Ask-mode picker and the attach menu), and the effect that marks the
 * nearest `.bonsai-scope` ancestor while either one is open.
 *
 * Used for: MainTabUnifiedAskBar.tsx's mode-menu button and attach
 * (paperclip) button.
 *
 * Solves: Keeps the two menus' toggle/close handlers -- each of which
 * closes the other menu first, and each guarded against running twice for
 * a single press -- together in one place, out of the component body.
 *
 * Does not: Own the menus' open/closed state itself, or their anchor and
 * first-item refs -- MainTabUnifiedAskBar.tsx still declares those, since
 * the rendered popovers (MainTabAskModeMenuPopover, MainTabAttachMenuPopover)
 * need direct access to the same refs and state.
 */
import React, { useCallback, useLayoutEffect } from "react";

import type { AttachMenuActionId } from "../components/MainTabAttachMenuPopover";

export type AskBarMenuTogglesArgs = {
  unifiedInputHostRef: React.Ref<HTMLDivElement>;
  askModeMenuOpen: boolean;
  attachMenuOpen: boolean;
  setAskModeMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setAttachMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  askModeToggleOnceRef: React.MutableRefObject<boolean>;
  attachMenuToggleOnceRef: React.MutableRefObject<boolean>;
  onTakeScreenshot: () => void | Promise<void>;
  onOpenScreenshotBrowser: () => void | Promise<void>;
};

/*
 * In: the Ask bar's host ref, both menus' open state and setters, the
 * once-per-press guard refs, and the two attach actions.
 * Out: toggleAskModeMenu, closeAskModeMenu, toggleAttachMenu, closeAttachMenu,
 * onAttachMenuSelect -- handed straight to the mode-menu button, the
 * paperclip button, and the two popovers.
 * What can go wrong: nothing computed here beyond the toggle guards; a
 * missing host ref just means the scope-class effect finds no `.bonsai-scope`
 * ancestor and does nothing.
 */
export function useAskBarMenuToggles({
  unifiedInputHostRef,
  askModeMenuOpen,
  attachMenuOpen,
  setAskModeMenuOpen,
  setAttachMenuOpen,
  askModeToggleOnceRef,
  attachMenuToggleOnceRef,
  onTakeScreenshot,
  onOpenScreenshotBrowser,
}: AskBarMenuTogglesArgs) {
  const toggleAskModeMenu = useCallback(() => {
    if (askModeToggleOnceRef.current) return;
    askModeToggleOnceRef.current = true;
    setAttachMenuOpen(false);
    setAskModeMenuOpen((o) => !o);
    queueMicrotask(() => {
      askModeToggleOnceRef.current = false;
    });
  }, []);
  const closeAskModeMenu = useCallback(() => setAskModeMenuOpen(false), []);
  const toggleAttachMenu = useCallback(() => {
    if (attachMenuToggleOnceRef.current) return;
    attachMenuToggleOnceRef.current = true;
    setAskModeMenuOpen(false);
    setAttachMenuOpen((o) => !o);
    queueMicrotask(() => {
      attachMenuToggleOnceRef.current = false;
    });
  }, []);
  const closeAttachMenu = useCallback(() => setAttachMenuOpen(false), []);
  const onAttachMenuSelect = useCallback(
    (action: AttachMenuActionId) => {
      if (action === "take_screenshot") void onTakeScreenshot();
      else void onOpenScreenshotBrowser();
    },
    [onTakeScreenshot, onOpenScreenshotBrowser],
  );

  useLayoutEffect(() => {
    const hostEl =
      unifiedInputHostRef && typeof unifiedInputHostRef === "object" && "current" in unifiedInputHostRef
        ? (unifiedInputHostRef as React.RefObject<HTMLDivElement | null>).current
        : null;
    const scope = hostEl?.closest(".bonsai-scope");
    if (!scope) return;
    scope.classList.toggle("bonsai-ask-menu-open-scope", askModeMenuOpen || attachMenuOpen);
    return () => scope.classList.remove("bonsai-ask-menu-open-scope");
  }, [askModeMenuOpen, attachMenuOpen, unifiedInputHostRef]);

  return { toggleAskModeMenu, closeAskModeMenu, toggleAttachMenu, closeAttachMenu, onAttachMenuSelect };
}
