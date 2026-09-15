/**
 * Title: The attach menu
 *
 * Purpose: The small pop-up list that opens when someone taps the paperclip
 * next to the Ask bar. It offers two things: close the menu and take a new
 * screenshot, or attach a screenshot already on the system. It draws itself
 * just below the paperclip and moves the D-pad ring onto its first row —
 * skipping whichever one is greyed out — the moment it opens.
 *
 * Used for: The unified Ask bar, wherever the paperclip sits, on both the
 * Steam Deck and desktop.
 *
 * Solves: Like the mode menu next to it, this has to float in exactly the
 * right spot below a small icon inside a cramped row, so it is its own
 * small popover, positioned by reading the paperclip's own on-screen
 * position rather than relying on Steam's own menu placement.
 *
 * Does not: Take the screenshot or open the screenshot browser itself, and
 * does not talk to the backend at all. It only reports which of the two
 * actions was picked; the caller does the actual work.
 */
import React, { useLayoutEffect, useRef, useState } from "react";
import { Button } from "@decky/ui";
import {
  ASK_LABEL_COLOR,
  DECK_MENU_FONT_PX,
  DECK_MENU_GAP_PX,
  DECK_MENU_PANEL_BG,
  DECK_MENU_ROW_PAD_X_PX,
  DECK_MENU_ROW_PAD_Y_PX,
} from "../features/unified-input/constants";

export type AttachMenuActionId = "take_screenshot" | "browse_recent";

export type MainTabAttachMenuPopoverProps = {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  hostRef: React.RefObject<HTMLElement | null>;
  firstMenuItemRef: React.MutableRefObject<HTMLElement | null>;
  onSelect: (action: AttachMenuActionId) => void;
  onRequestClose: () => void;
  onFocusPaperclip: () => boolean;
  takeScreenshotDisabled?: boolean;
  browseDisabled?: boolean;
};

const ATTACH_MENU_ITEMS: { id: AttachMenuActionId; label: string }[] = [
  { id: "take_screenshot", label: "Close menu & take screenshot" },
  { id: "browse_recent", label: "Attach recent screenshot" },
];

/** Wider than default ask-mode menu — attach action labels need more room. */
const ATTACH_MENU_PANEL_MIN_WIDTH_PX = 168;

type MenuPosition = {
  left: number;
  top: number;
  minWidth: number;
};

/**
 * Inline attach menu below the paperclip — host-relative absolute positioning (no portal).
 */
export function MainTabAttachMenuPopover(props: MainTabAttachMenuPopoverProps) {
  const {
    open,
    anchorRef,
    hostRef,
    firstMenuItemRef,
    onSelect,
    onRequestClose,
    onFocusPaperclip,
    takeScreenshotDisabled = false,
    browseDisabled = false,
  } = props;

  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);

  const isItemDisabled = (id: AttachMenuActionId) =>
    id === "take_screenshot" ? takeScreenshotDisabled : browseDisabled;

  useLayoutEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    const measure = () => {
      const anchor = anchorRef.current;
      const host = hostRef.current;
      const surface = surfaceRef.current;
      if (!anchor || !host) return;
      const a = anchor.getBoundingClientRect();
      const h = host.getBoundingClientRect();
      const menuW = Math.max(ATTACH_MENU_PANEL_MIN_WIDTH_PX, a.width, surface?.offsetWidth ?? 0);
      const menuH = surface?.offsetHeight ?? 0;
      if (menuH === 0) return;
      const nextPos: MenuPosition = {
        left: Math.max(0, a.left - h.left),
        top: a.bottom - h.top + DECK_MENU_GAP_PX,
        minWidth: menuW,
      };
      setMenuPos(nextPos);
    };
    measure();
    const id = requestAnimationFrame(() => {
      measure();
      const firstEnabled = ATTACH_MENU_ITEMS.findIndex((item) => !isItemDisabled(item.id));
      const idx = firstEnabled >= 0 ? firstEnabled : 0;
      itemRefs.current[idx]?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [open, anchorRef, hostRef, takeScreenshotDisabled, browseDisabled]);

  useLayoutEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onRequestClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onRequestClose]);

  if (!open) return null;

  return (
    <div
      className="bonsai-attach-menu bonsai-attach-menu-floater"
      style={{
        position: "absolute",
        left: menuPos?.left ?? 0,
        top: menuPos?.top ?? 0,
        right: "auto",
        minWidth: menuPos?.minWidth ?? ATTACH_MENU_PANEL_MIN_WIDTH_PX,
        width: "max-content",
        zIndex: 200,
        pointerEvents: "auto",
        isolation: "isolate",
        boxSizing: "border-box",
        visibility: menuPos ? "visible" : "hidden",
      }}
    >
      <div
        ref={surfaceRef}
        className="bonsai-attach-menu-surface"
        style={{
          backgroundColor: DECK_MENU_PANEL_BG,
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 6,
          boxShadow: "0 8px 22px rgba(0,0,0,0.55)",
          boxSizing: "border-box",
          overflow: "hidden",
          mixBlendMode: "normal",
        }}
      >
        <div
          className="bonsai-attach-menu-list"
          role="menu"
          aria-label="Attach screenshot to Ask"
          style={{
            width: "100%",
            margin: 0,
            padding: 0,
            backgroundColor: DECK_MENU_PANEL_BG,
            display: "flex",
            flexDirection: "column",
            gap: 0,
            boxSizing: "border-box",
          }}
        >
          {ATTACH_MENU_ITEMS.map((item, i) => {
            const disabled = isItemDisabled(item.id);
            return (
              <Button
                key={item.id}
                className="bonsai-attach-menu-item-btn bonsai-attach-menu-item"
                disabled={disabled}
                ref={(el) => {
                  itemRefs.current[i] = el;
                  if (i === 0) firstMenuItemRef.current = el;
                }}
                {...({
                  onMoveUp: () => {
                    if (i === 0) {
                      onRequestClose();
                      onFocusPaperclip();
                      return true;
                    }
                    itemRefs.current[i - 1]?.focus();
                    return true;
                  },
                  onMoveDown: () => {
                    if (i === ATTACH_MENU_ITEMS.length - 1) return true;
                    itemRefs.current[i + 1]?.focus();
                    return true;
                  },
                  onMoveLeft: () => true,
                  onMoveRight: () => true,
                  onOKButton: (evt: { stopPropagation: () => void }) => {
                    if (disabled) return;
                    evt.stopPropagation();
                    onSelect(item.id);
                    onRequestClose();
                  },
                  onCancelButton: () => {
                    onRequestClose();
                    onFocusPaperclip();
                    return true;
                  },
                } as Record<string, unknown>)}
                onClick={() => {
                  if (disabled) return;
                  onSelect(item.id);
                  onRequestClose();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  width: "100%",
                  minHeight: 0,
                  margin: 0,
                  padding: `${DECK_MENU_ROW_PAD_Y_PX}px ${DECK_MENU_ROW_PAD_X_PX}px`,
                  fontSize: DECK_MENU_FONT_PX,
                  fontWeight: 500,
                  lineHeight: 1.5,
                  borderRadius: 0,
                  border: "none",
                  backgroundColor: DECK_MENU_PANEL_BG,
                  color: ASK_LABEL_COLOR,
                  cursor: disabled ? "default" : "pointer",
                  boxSizing: "border-box",
                  textAlign: "left",
                  opacity: disabled ? 0.45 : 1,
                }}
              >
                {item.label}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
