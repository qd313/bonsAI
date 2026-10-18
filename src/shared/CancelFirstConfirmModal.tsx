/**
 * Title: The shared two-button confirm box (Cancel first)
 *
 * Purpose: Every "are you sure?" box in the plugin (clear cache, clear all data, turn on internet
 * downloads, remove the knowledge base, remove a model, the AI models screen's Tier 2 and large-model
 * questions, the try-order reset) shows the same thing: a title, a line or two of words, and exactly two
 * buttons side by side, Cancel and the action. Steam puts the ring on Cancel when the box opens, so an A
 * pressed by habit changes nothing, and B is Cancel. It is the "Delete chat?" box (ChatSlotDeleteModal.tsx)
 * with the title, words and action label handed in.
 *
 * Used for: SettingsTabDataSection.tsx, downloadNotice.tsx, KnowledgeBaseSection.tsx, PullModelsTryOrder.tsx,
 * usePullModelDeleteConfirm.tsx, usePullModelSubmitSelected.tsx, usePullModelTier2Confirm.tsx and
 * usePullModelToggleSelection.tsx, each through showModal.
 *
 * Solves: Steam's own ConfirmModal always draws a Cancel button beside its OK button, so a box built as
 * "safe choice first" ended with three buttons (Keep cache / Clear / Cancel; plan 93 bug, measured on the
 * Deck 2026-10-13, workshop:test-evidence/plan93-P93-M9-CONFIRM-BOXES.json). Built on ModalRoot, the base a
 * ConfirmModal is made from, the buttons are ours, so there are exactly two and Cancel is the first one.
 *
 * Does not: do anything itself, close itself, or move the ring after it closes. The caller passes onCancel
 * (Cancel and B) and onAction and closes the box from both, through the plugin's own close path
 * (onCompleteDeckyModalClose), which sends the ring back to the control that opened the box; that memory
 * lives in modalReturnFocusRegistry.ts, outside every component, because closing a Decky box rebuilds the
 * tab behind it.
 *
 * Gotchas:
 * - Cancel must stay first in the DOM order; that is what puts the ring on it.
 * - The two buttons sit in one Focusable with flow-children="horizontal", the same as the Delete chat box:
 *   without it Right from Cancel did nothing and only Down reached the action.
 * - Each button is wired for A (onOKButton on its Focusable) and for a finger (onClick), so a guard makes
 *   sure one press acts once, and B after a press does nothing more.
 */
import React, { useRef, type ReactNode } from "react";
import { Button, Focusable, ModalRoot } from "@decky/ui";

import { SETTINGS_GLASS_BTN, SETTINGS_GLASS_BTN_DANGER } from "../styles/settingsGlassButton";
import { textPx } from "../styles/textPx";

export type CancelFirstConfirmModalProps = {
  title: string;
  /** The words under the title. Passed through as given; the caller keeps its own text and colours. */
  body: ReactNode;
  /** The action button's label, e.g. "Clear" or "Download". */
  actionLabel: string;
  /** Draw the action in the red the Delete button uses (removing or wiping something). */
  danger?: boolean;
  /** Cancel and B. */
  onCancel: () => void;
  /** The action button. */
  onAction: () => void;
};

const Choice: React.FC<{ onChoose: () => void; danger?: boolean; children: ReactNode }> = ({
  onChoose,
  danger = false,
  children,
}) => (
  <div className="bonsai-settings-focus-btn-host" style={{ flex: 1, minWidth: 0 }}>
    <Focusable onOKButton={onChoose}>
      <Button
        className="bonsai-settings-focus-btn"
        onClick={onChoose}
        style={{ ...(danger ? SETTINGS_GLASS_BTN_DANGER : SETTINGS_GLASS_BTN), width: "100%" }}
      >
        {children}
      </Button>
    </Focusable>
  </div>
);

export function CancelFirstConfirmModal({
  title,
  body,
  actionLabel,
  danger = false,
  onCancel,
  onAction,
}: CancelFirstConfirmModalProps) {
  const done = useRef(false);
  const once = (act: () => void) => () => {
    if (done.current) return;
    done.current = true;
    act();
  };
  return (
    <ModalRoot onCancel={once(onCancel)}>
      <div className="bonsai-prose" style={{ fontSize: textPx(12), lineHeight: 1.45, color: "#cdd9e6", textAlign: "left" }}>
        <div style={{ fontSize: textPx(16), fontWeight: 700, color: "#ffffff", marginBottom: 10 }}>{title}</div>
        <div style={{ marginBottom: 10 }}>{body}</div>
        <Focusable flow-children="horizontal" style={{ display: "flex", flexDirection: "row", gap: 8 }}>
          <Choice onChoose={once(onCancel)}>Cancel</Choice>
          <Choice danger={danger} onChoose={once(onAction)}>
            {actionLabel}
          </Choice>
        </Focusable>
      </div>
    </ModalRoot>
  );
}
