/**
 * Title: The Speed / Strategy / Expert menu
 *
 * Purpose: The small pop-up list that opens when someone taps the mode chip
 * next to the Ask bar, letting them pick how the AI should answer: Speed,
 * Strategy, or Expert. It draws itself just above that chip, sized to fit
 * its own text, and moves the D-pad ring onto its first row the moment it
 * opens.
 *
 * Used for: The unified Ask bar, wherever the mode chip lives, on both the
 * Steam Deck and desktop.
 *
 * Solves: This menu has to float above everything else and land in exactly
 * the right spot next to a chip that itself sits inside a cramped icon row.
 * Keeping it as its own small popover, positioned by reading the chip's own
 * on-screen position, means it never has to squeeze inside that row or rely
 * on Steam's own menu positioning, which did not fit reliably.
 *
 * Does not: Remember the chosen mode, or send anything to the AI. It only
 * reports back which mode was picked; the caller decides what to do with
 * that and where the choice is saved.
 *
 * Gotchas: The math that places the menu is worked out by hand from the
 * chip's and the menu's own on-screen positions, rather than left to the
 * browser. The menu opens upward, above the chip, so its vertical position
 * can come out negative relative to its container — that is intentional and
 * must not be clamped to zero: an earlier version did clamp it, and the menu
 * ended up drawn overlapping the text box instead of floating above the
 * chip.
 */
import React, { useLayoutEffect, useRef, useState } from "react";
import { Button } from "@decky/ui";
import { ASK_LABEL_COLOR, DECK_MENU_FONT_PX, DECK_MENU_GAP_PX, DECK_MENU_PANEL_BG, DECK_MENU_PANEL_MIN_WIDTH_PX, DECK_MENU_ROW_PAD_X_PX, DECK_MENU_ROW_PAD_Y_PX, DECK_MENU_ROW_SELECTED_BG } from "../features/unified-input/constants";
import { ASK_MODE_IDS, ASK_MODE_LABELS, type AskModeId } from "../data/askMode";

export type MainTabAskModeMenuPopoverProps = {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  hostRef: React.RefObject<HTMLElement | null>;
  firstMenuItemRef: React.MutableRefObject<HTMLElement | null>;
  selectedId: AskModeId;
  onSelect: (mode: AskModeId) => void;
  onRequestClose: () => void;
  onFocusModeChip: () => boolean;
};

type MenuPosition = {
  left: number;
  top: number;
  minWidth: number;
};

/**
 * Painted on the unified input host (not inside the 24px icon strip) with explicit left/top
 * from the mode chip rect — avoids QAM focus-graph scatter and wrong containing blocks.
 */
export function MainTabAskModeMenuPopover(props: MainTabAskModeMenuPopoverProps) {
  const {
    open,
    anchorRef,
    hostRef,
    firstMenuItemRef,
    selectedId,
    onSelect,
    onRequestClose,
    onFocusModeChip,
  } = props;

  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    /**
     * Absolute within the unified-input host (portal-to-body did not render inside the QAM
     * overlay). left/top are host-relative; the host gets overflow:visible while open.
     */
    const measure = () => {
      const anchor = anchorRef.current;
      const host = hostRef.current;
      const surface = surfaceRef.current;
      if (!anchor || !host) return;
      const a = anchor.getBoundingClientRect();
      const h = host.getBoundingClientRect();
      const menuW = Math.max(DECK_MENU_PANEL_MIN_WIDTH_PX, a.width, surface?.offsetWidth ?? 0);
      const menuH = surface?.offsetHeight ?? 0;
      /* Stay hidden until the surface has a measured height (rAF pass), otherwise the first
         paint lands at the wrong top for one frame. */
      if (menuH === 0) return;
      const nextPos: MenuPosition = {
        left: Math.max(0, a.right - h.left - menuW),
        /*
         * No lower clamp: the menu opens ABOVE the chip, i.e. above the host top → negative
         * host-relative top. The old Math.max(0, …) clamp pinned a 108px menu inside a ~70px
         * host, overlapping the text area and sliding under the Ask row (proven by geometry log).
         */
        top: a.top - h.top - menuH - DECK_MENU_GAP_PX,
        minWidth: menuW,
      };
      setMenuPos(nextPos);
    };
    measure();
    const id = requestAnimationFrame(() => {
      measure();
      itemRefs.current[0]?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [open, anchorRef, hostRef]);

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
      className="bonsai-ask-mode-menu bonsai-ask-mode-menu-floater"
      style={{
        position: "absolute",
        left: menuPos?.left ?? 0,
        top: menuPos?.top ?? 0,
        right: "auto",
        minWidth: menuPos?.minWidth ?? DECK_MENU_PANEL_MIN_WIDTH_PX,
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
        className="bonsai-ask-mode-menu-surface"
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
          className="bonsai-ask-mode-menu-list"
          role="menu"
          aria-label="Inference mode"
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
          {ASK_MODE_IDS.map((id, i) => {
            const isSelected = selectedId === id;
            return (
              <Button
                key={id}
                className={
                  "bonsai-ask-mode-menu-item-btn bonsai-ask-mode-menu-item" +
                  (isSelected ? " bonsai-ask-mode-menu-item--selected" : "")
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
                    if (i === ASK_MODE_IDS.length - 1) return true;
                    itemRefs.current[i + 1]?.focus();
                    return true;
                  },
                  onMoveLeft: () => true,
                  onMoveRight: () => true,
                  onOKButton: (evt: { stopPropagation: () => void }) => {
                    evt.stopPropagation();
                    onSelect(id);
                    onRequestClose();
                    onFocusModeChip();
                  },
                  onCancelButton: () => {
                    onRequestClose();
                    onFocusModeChip();
                    return true;
                  },
                } as Record<string, unknown>)}
                onClick={() => {
                  onSelect(id);
                  onRequestClose();
                  onFocusModeChip();
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
                  fontWeight: isSelected ? 700 : 500,
                  fontVariant: "small-caps",
                  textTransform: "lowercase",
                  letterSpacing: "0.03em",
                  lineHeight: 1.5,
                  borderRadius: 0,
                  border: "none",
                  backgroundColor: isSelected ? DECK_MENU_ROW_SELECTED_BG : DECK_MENU_PANEL_BG,
                  color: ASK_LABEL_COLOR,
                  cursor: "pointer",
                  boxSizing: "border-box",
                  textAlign: "left",
                }}
              >
                {ASK_MODE_LABELS[id].toLowerCase()}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
