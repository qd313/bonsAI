import React, { useLayoutEffect, useRef } from "react";
import { Focusable } from "@decky/ui";
import { ASK_LABEL_COLOR } from "../features/unified-input/constants";
import { ASK_MODE_IDS, ASK_MODE_LABELS, type AskModeId } from "../data/askMode";

export type MainTabAskModeMenuPopoverProps = {
  open: boolean;
  firstMenuItemRef: React.MutableRefObject<HTMLDivElement | null>;
  selectedId: AskModeId;
  onSelect: (mode: AskModeId) => void;
  onRequestClose: () => void;
  /** Focus mode chip after closing (e.g. D-pad up from Speed closes menu without changing mode). */
  onFocusModeChip: () => boolean;
};

/** Gap under mode chip; was 4px — +1px lowers whole dropdown. */
const MENU_GAP_PX = 6;
/** Horizontal padding per row (mirrored in `index.tsx` via `--bonsai-ask-mode-menu-pad-x` / `-pad-y`). */
const MENU_ROW_PAD_X_PX = 6;
const MENU_ROW_PAD_Y_PX = 8;
/** Minimum dropdown width: at least chip width (`100%` of anchor) or this many CSS pixels, whichever is larger. */
const MENU_PANEL_MIN_WIDTH_PX = 14;
const MENU_ROW_GAP_PX = 0;

/** Solid panel aligned with `.bonsai-glass-panel` family (see `index.tsx` §7–8). */
const MENU_PANEL_BG = "rgb(28, 36, 44)";
const MENU_ROW_SELECTED_BG = "rgb(40, 50, 62)";
const MENU_FONT_PX = 13;

/**
 * Anchored under the mode chip (`position: relative` on `askModeMenuAnchorRef`).
 * Plain div + scoped CSS forces opaque paint; Decky `Focusable` alone can composite semi-transparent in QAM.
 */
export function MainTabAskModeMenuPopover(props: MainTabAskModeMenuPopoverProps) {
  const {
    open,
    firstMenuItemRef,
    selectedId,
    onSelect,
    onRequestClose,
    onFocusModeChip,
  } = props;

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
      className="bonsai-ask-mode-menu-floater"
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        marginTop: MENU_GAP_PX,
        // `max(100%, Npx)` gives a stable pixel floor; `100%` alone tracks the chip anchor.
        minWidth: `max(100%, ${MENU_PANEL_MIN_WIDTH_PX}px)`,
        width: "max-content",
        zIndex: 100,
        pointerEvents: "auto",
        isolation: "isolate",
        boxSizing: "border-box",
      }}
    >
      <div
        className="bonsai-ask-mode-menu-surface"
        style={{
          backgroundColor: MENU_PANEL_BG,
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 6,
          boxShadow: "0 8px 22px rgba(0,0,0,0.55)",
          boxSizing: "border-box",
          overflow: "hidden",
          mixBlendMode: "normal",
          ["--bonsai-ask-mode-menu-pad-x" as string]: `${MENU_ROW_PAD_X_PX}px`,
          ["--bonsai-ask-mode-menu-pad-y" as string]: `${MENU_ROW_PAD_Y_PX}px`,
          ["--bonsai-ask-mode-menu-list-pad-y" as string]: `${MENU_ROW_GAP_PX}px`,
        }}
      >
        <Focusable
          className="bonsai-ask-mode-menu-list"
          flow-children="vertical"
          role="menu"
          aria-label="Inference mode"
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
          {ASK_MODE_IDS.map((id, i) => {
            const isSelected = selectedId === id;
            return (
              <Focusable
                key={id}
                role="menuitem"
                className={
                  "bonsai-ask-mode-menu-item" + (isSelected ? " bonsai-ask-mode-menu-item--selected" : "")
                }
                ref={(el) => {
                  itemRefs.current[i] = el;
                  if (i === 0) firstMenuItemRef.current = el;
                }}
                {...({
                  onMoveUp: () => {
                    if (i === 0) {
                      onRequestClose();
                      onFocusModeChip();
                      return true;
                    }
                    itemRefs.current[i - 1]?.focus();
                    return true;
                  },
                  onMoveDown: () => {
                    if (id === "deep") return true;
                    itemRefs.current[i + 1]?.focus();
                    return true;
                  },
                  onMoveLeft: () => true,
                  onMoveRight: () => true,
                  onOKButton: (evt: { stopPropagation: () => void }) => {
                    evt.stopPropagation();
                    onSelect(id);
                    onRequestClose();
                  },
                } as Record<string, unknown>)}
                onActivate={() => {
                  onSelect(id);
                  onRequestClose();
                }}
                onClick={() => {
                  onSelect(id);
                  onRequestClose();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  width: "100%",
                  minHeight: 0,
                  padding: `${MENU_ROW_PAD_Y_PX}px ${MENU_ROW_PAD_X_PX}px`,
                  fontSize: MENU_FONT_PX,
                  fontWeight: isSelected ? 700 : 500,
                  fontVariant: "small-caps",
                  textTransform: "lowercase",
                  letterSpacing: "0.03em",
                  lineHeight: 1.5,
                  borderRadius: 0,
                  borderTop: "none",
                  backgroundColor: isSelected ? MENU_ROW_SELECTED_BG : MENU_PANEL_BG,
                  color: ASK_LABEL_COLOR,
                  cursor: "pointer",
                  boxSizing: "border-box",
                }}
              >
                {ASK_MODE_LABELS[id].toLowerCase()}
              </Focusable>
            );
          })}
        </Focusable>
      </div>
    </div>
  );
}
