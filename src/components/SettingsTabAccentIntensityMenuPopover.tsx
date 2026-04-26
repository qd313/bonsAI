import React, { useLayoutEffect, useRef } from "react";
import { Focusable } from "@decky/ui";
import { ASK_LABEL_COLOR } from "../features/unified-input/constants";
import {
  AI_CHARACTER_ACCENT_INTENSITY_OPTIONS,
  type AiCharacterAccentIntensityId,
} from "../data/aiCharacterAccentIntensity";

export type SettingsTabAccentIntensityMenuPopoverProps = {
  open: boolean;
  firstMenuItemRef: React.MutableRefObject<HTMLDivElement | null>;
  selectedId: AiCharacterAccentIntensityId;
  onSelect: (id: AiCharacterAccentIntensityId) => void;
  onRequestClose: () => void;
  onFocusTrigger: () => boolean;
};

const MENU_GAP_PX = 6;
const MENU_ROW_PAD_X_PX = 6;
const MENU_ROW_PAD_Y_PX = 8;
const MENU_PANEL_MIN_WIDTH_PX = 14;
const MENU_ROW_GAP_PX = 0;
const MENU_PANEL_BG = "rgb(28, 36, 44)";
const MENU_ROW_SELECTED_BG = "rgb(40, 50, 62)";
const MENU_FONT_PX = 13;

/** Settings-tab inline menu; mirrors MainTabAskModeMenuPopover paint model for Steam compositing. */
export function SettingsTabAccentIntensityMenuPopover(props: SettingsTabAccentIntensityMenuPopoverProps) {
  const { open, firstMenuItemRef, selectedId, onSelect, onRequestClose, onFocusTrigger } = props;
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useLayoutEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      itemRefs.current[0]?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

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
      className="bonsai-accent-intensity-menu-floater"
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        marginTop: MENU_GAP_PX,
        minWidth: `max(100%, ${MENU_PANEL_MIN_WIDTH_PX}px)`,
        width: "max-content",
        zIndex: 100,
        pointerEvents: "auto",
        isolation: "isolate",
        boxSizing: "border-box",
      }}
    >
      <div
        className="bonsai-accent-intensity-menu-surface"
        style={{
          backgroundColor: MENU_PANEL_BG,
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 6,
          boxShadow: "0 8px 22px rgba(0,0,0,0.55)",
          boxSizing: "border-box",
          overflow: "hidden",
          mixBlendMode: "normal",
          ["--bonsai-accent-intensity-menu-pad-x" as string]: `${MENU_ROW_PAD_X_PX}px`,
          ["--bonsai-accent-intensity-menu-pad-y" as string]: `${MENU_ROW_PAD_Y_PX}px`,
          ["--bonsai-accent-intensity-menu-list-pad-y" as string]: `${MENU_ROW_GAP_PX}px`,
        }}
      >
        <Focusable
          className="bonsai-accent-intensity-menu-list"
          flow-children="vertical"
          role="menu"
          aria-label="Accent intensity"
          onCancel={onRequestClose}
          style={{
            width: "100%",
            margin: 0,
            padding: `${MENU_ROW_GAP_PX}px 0`,
            backgroundColor: MENU_PANEL_BG,
            display: "flex",
            flexDirection: "column",
            gap: 0,
            boxSizing: "border-box",
          }}
        >
          {AI_CHARACTER_ACCENT_INTENSITY_OPTIONS.map((opt, i) => {
            const isSelected = selectedId === opt.id;
            return (
              <Focusable
                key={opt.id}
                role="menuitem"
                className={
                  "bonsai-accent-intensity-menu-item" + (isSelected ? " bonsai-accent-intensity-menu-item--selected" : "")
                }
                ref={(el) => {
                  itemRefs.current[i] = el;
                  if (i === 0) firstMenuItemRef.current = el;
                }}
                {...({
                  onMoveUp: () => {
                    if (i === 0) {
                      onRequestClose();
                      onFocusTrigger();
                      return true;
                    }
                    itemRefs.current[i - 1]?.focus();
                    return true;
                  },
                  onMoveDown: () => {
                    if (i === AI_CHARACTER_ACCENT_INTENSITY_OPTIONS.length - 1) return true;
                    itemRefs.current[i + 1]?.focus();
                    return true;
                  },
                  onMoveLeft: () => true,
                  onMoveRight: () => true,
                  onOKButton: (evt: { stopPropagation: () => void }) => {
                    evt.stopPropagation();
                    onSelect(opt.id);
                    onRequestClose();
                  },
                } as Record<string, unknown>)}
                onActivate={() => {
                  onSelect(opt.id);
                  onRequestClose();
                }}
                onClick={() => {
                  onSelect(opt.id);
                  onRequestClose();
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  justifyContent: "center",
                  width: "100%",
                  minHeight: 0,
                  padding: `${MENU_ROW_PAD_Y_PX}px ${MENU_ROW_PAD_X_PX}px`,
                  fontSize: MENU_FONT_PX,
                  fontWeight: isSelected ? 700 : 500,
                  fontVariant: "small-caps",
                  textTransform: "lowercase",
                  letterSpacing: "0.03em",
                  lineHeight: 1.4,
                  borderRadius: 0,
                  borderTop: "none",
                  backgroundColor: isSelected ? MENU_ROW_SELECTED_BG : MENU_PANEL_BG,
                  color: ASK_LABEL_COLOR,
                  cursor: "pointer",
                  boxSizing: "border-box",
                }}
              >
                <span>{opt.shortLabel}</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 400,
                    fontVariant: "normal",
                    textTransform: "none",
                    letterSpacing: "0.02em",
                    color: "rgba(200, 210, 220, 0.85)",
                    marginTop: 3,
                    lineHeight: 1.35,
                    maxWidth: 260,
                  }}
                >
                  {opt.description}
                </span>
              </Focusable>
            );
          })}
        </Focusable>
      </div>
    </div>
  );
}
