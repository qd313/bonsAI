import React, { useLayoutEffect, useRef, useState } from "react";
import { Button } from "@decky/ui";
import { ASK_LABEL_COLOR } from "../features/unified-input/constants";

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

const MENU_GAP_PX = 6;
const MENU_ROW_PAD_X_PX = 10;
const MENU_ROW_PAD_Y_PX = 8;
const MENU_PANEL_MIN_WIDTH_PX = 168;

const MENU_PANEL_BG = "rgb(28, 36, 44)";
const MENU_FONT_PX = 13;

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
      const menuW = Math.max(MENU_PANEL_MIN_WIDTH_PX, a.width, surface?.offsetWidth ?? 0);
      const menuH = surface?.offsetHeight ?? 0;
      if (menuH === 0) return;
      const nextPos: MenuPosition = {
        left: Math.max(0, a.left - h.left),
        top: a.bottom - h.top + MENU_GAP_PX,
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
        minWidth: menuPos?.minWidth ?? MENU_PANEL_MIN_WIDTH_PX,
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
          backgroundColor: MENU_PANEL_BG,
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
            backgroundColor: MENU_PANEL_BG,
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
                  padding: `${MENU_ROW_PAD_Y_PX}px ${MENU_ROW_PAD_X_PX}px`,
                  fontSize: MENU_FONT_PX,
                  fontWeight: 500,
                  lineHeight: 1.5,
                  borderRadius: 0,
                  border: "none",
                  backgroundColor: MENU_PANEL_BG,
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
