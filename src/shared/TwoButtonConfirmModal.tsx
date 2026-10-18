/**
 * Title: The shared two-button confirm box (the action on the left, Cancel on the right)
 *
 * Purpose: Every "are you sure?" box in the plugin (clear cache, clear all data, delete a chat, turn on
 * internet downloads, remove the knowledge base, remove a model, the AI models screen's Tier 2 and
 * large-model questions, the try-order reset) shows the same thing: a title, a line or two of words, and
 * exactly two buttons side by side. The action is on the left in the look of the Beta Notice's "Got it"
 * (Steam's own primary button); Cancel is on the right, in Steam's plain button, and the ring starts on
 * Cancel, so an A pressed by habit changes nothing. B is Cancel. Left and Right step between the two and
 * hold still at the ends. The maintainer's rule of 2026-10-18: Cancel on the right in every box.
 *
 * Used for: SettingsTabDataSection.tsx, downloadNotice.tsx, KnowledgeBaseSection.tsx, PullModelsTryOrder.tsx,
 * usePullModelDeleteConfirm.tsx, usePullModelSubmitSelected.tsx, usePullModelTier2Confirm.tsx,
 * usePullModelToggleSelection.tsx and useChatSlotDeleteConfirm.tsx, each through showModal.
 *
 * Solves: Steam's own ConfirmModal always draws a Cancel button beside its OK button, so a box built as
 * "safe choice first" ended with three buttons (Keep cache / Clear / Cancel; plan 93 bug, measured on the
 * Deck 2026-10-13, workshop:test-evidence/plan93-P93-M9-CONFIRM-BOXES.json). Built on ModalRoot, the base a
 * ConfirmModal is made from, the buttons are ours, so there are exactly two. The ring cannot start on the
 * right-hand button by order alone (Steam starts a box on its first button, which is the action here), so
 * the box hands the ring to Cancel's nav node a moment after it mounts, the way the first-run popup does.
 *
 * Does not: do anything itself, close itself, or move the ring after it closes. The caller passes onCancel
 * (Cancel and B) and onAction and closes the box from both, through the plugin's own close path
 * (onCompleteDeckyModalClose), which sends the ring back to the control that opened the box; that memory
 * lives in modalReturnFocusRegistry.ts, outside every component, because closing a Decky box rebuilds the
 * tab behind it. There is no red button: a removing action looks like every other action, and its words
 * (Remove, Clear all data, Delete) say what it does.
 *
 * Gotchas:
 * - The action stays first in the DOM and Cancel second; the row's flow-children="horizontal" walks them in
 *   that order, which is also the order on screen. Moving Cancel first and reversing the row would change
 *   what Steam's own Left and Right do, which nothing here has measured.
 * - Both buttons answer all four directions with a handler (Steam calls it), so nothing depends on Steam's
 *   own step: Left and Right hand the ring to the other button by its nav node, the ends hold still, and
 *   Up and Down hold still too (one row, nothing above or below to reach).
 * - Each button is wired for A (onOKButton on its Focusable) and for a finger (onClick), so a guard makes
 *   sure one press acts once, and B after a press does nothing more.
 */
import React, { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { Button, DialogButtonPrimary, Focusable, ModalRoot } from "@decky/ui";

import { takeHolderFocus } from "./dpad/chatTranscriptNavHelpers";
import type { NavRefHolder } from "./dpad/navFocusRegistry";
import { FOCUS_RING_BTN_CLASS } from "../styles/settingsGlassButton";
import { textPx } from "../styles/textPx";

export type TwoButtonConfirmModalProps = {
  title: string;
  /** The words under the title. Passed through as given; the caller keeps its own text and colours. */
  body: ReactNode;
  /** The action button's label, e.g. "Clear" or "Download". */
  actionLabel: string;
  /** Cancel and B. */
  onCancel: () => void;
  /** The action button. */
  onAction: () => void;
};

/** How many frames the box waits, after its first two, for Cancel's nav node before it gives the ring up. */
const RING_WAIT_FRAMES = 8;

/** The words on both buttons. Layout only: the colours and the fill are Steam's own. */
const BUTTON_STYLE: CSSProperties = { width: "100%", fontSize: textPx(13) };

type Hands = {
  onMoveLeft: () => boolean;
  onMoveRight: () => boolean;
};

const Choice: React.FC<{
  primary?: boolean;
  onChoose: () => void;
  navRef: NavRefHolder;
  hands: Hands;
  children: ReactNode;
}> = ({ primary = false, onChoose, navRef, hands, children }) => {
  const Look = primary ? DialogButtonPrimary : Button;
  return (
    <div className="bonsai-settings-focus-btn-host" style={{ flex: 1, minWidth: 0 }}>
      <Focusable
        onOKButton={onChoose}
        {...({ navRef, ...hands, onMoveUp: () => true, onMoveDown: () => true } as Record<string, unknown>)}
      >
        <Look className={FOCUS_RING_BTN_CLASS} onClick={onChoose} style={BUTTON_STYLE}>
          {children}
        </Look>
      </Focusable>
    </div>
  );
};

export function TwoButtonConfirmModal({ title, body, actionLabel, onCancel, onAction }: TwoButtonConfirmModalProps) {
  const done = useRef(false);
  const once = (act: () => void) => () => {
    if (done.current) return;
    done.current = true;
    act();
  };
  const actionNav = useRef<NavRefHolder["current"]>(null);
  const cancelNav = useRef<NavRefHolder["current"]>(null);

  // The ring starts on Cancel. Two frames: the box mounts, then Steam finishes its own first focus pass
  // (which lands on the action, the first button); then Cancel's nav node is taken, waiting a few more
  // frames if Steam has not filled it yet. Mount only: running again would pull the ring back.
  useEffect(() => {
    const frame = (run: () => void): number => window.requestAnimationFrame(run);
    let id = 0;
    let waited = 0;
    const take = () => {
      if (takeHolderFocus(cancelNav) || ++waited >= RING_WAIT_FRAMES) return;
      id = frame(take);
    };
    id = frame(() => {
      id = frame(take);
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

  return (
    <ModalRoot onCancel={once(onCancel)}>
      <div className="bonsai-prose" style={{ fontSize: textPx(12), lineHeight: 1.45, color: "#cdd9e6", textAlign: "left" }}>
        <div style={{ fontSize: textPx(16), fontWeight: 700, color: "#ffffff", marginBottom: 10 }}>{title}</div>
        <div style={{ marginBottom: 10 }}>{body}</div>
        <Focusable flow-children="horizontal" style={{ display: "flex", flexDirection: "row", gap: 8 }}>
          <Choice
            primary
            onChoose={once(onAction)}
            navRef={actionNav}
            hands={{ onMoveLeft: () => true, onMoveRight: () => takeHolderFocus(cancelNav) || true }}
          >
            {actionLabel}
          </Choice>
          <Choice
            onChoose={once(onCancel)}
            navRef={cancelNav}
            hands={{ onMoveLeft: () => takeHolderFocus(actionNav) || true, onMoveRight: () => true }}
          >
            Cancel
          </Choice>
        </Focusable>
      </div>
    </ModalRoot>
  );
}
