/**
 * Title: The mic hint row under the question box
 *
 * Purpose: The message shown when the microphone button is pressed while the Voice input permission
 * is off ("Enable Voice input (microphone) in Permissions to use speech-to-text."), with its two
 * buttons side by side: Open Permissions and Dismiss. Owns the row's D-pad moves so the ring never
 * strands there.
 *
 * Used for: MainTab.tsx, drawn under the ask bar while `micPermissionDenied` is set.
 *
 * Solves: Plan 94 block 5 (workshop:test-evidence/plan94-P94-VOICE-PERM.json): the two buttons were
 * stacked with no move handlers, so Down from Open Permissions landed on Dismiss instead of leaving
 * the row, and A on Dismiss removed the row with the ring still on it, leaving the ring on nothing.
 * Same shape and same cure as the transcript's troubleshooting hint (ChatTranscriptHintRows.tsx):
 * a wrapping Focusable registered as a nav node, Left and Right between the two buttons, Up to the
 * question box through Steam's own transfer, and Dismiss handing the ring on once the row is gone.
 *
 * Does not: Decide when the row shows (useVoiceAskInput.ts does), or do the jump to the Permissions
 * tab (the caller's `onNavigateToPermissions`, see usePermissionJump.ts).
 */
import { useEffect, useRef } from "react";
import { Button, Focusable } from "@decky/ui";

import type { BonsaiCapabilityKey } from "../permissions/permissionDeepLink";
import { PERMISSION_DENY_MESSAGES } from "../permissions/permissionDeepLink";
import { pressThenHandRingOn } from "../../shared/dpad/handRingOnWhenGone";
import {
  registerNavFocus,
  takeNavFocus,
  unregisterNavFocus,
  type NavRefHolder,
} from "../../shared/dpad/navFocusRegistry";
import { elementHasGamepadFocus } from "../../shared/dpad/uiDocument";
import { FOCUS_RING_BTN_CLASS } from "../../styles/settingsGlassButton";
import { textPx } from "../../styles/textPx";

type Props = {
  fullBleedRowStyle?: React.CSSProperties;
  onNavigateToPermissions: (capability: BonsaiCapabilityKey) => void;
  onDismiss?: () => void;
};

/** The ring's next home when it leaves this row upward, or when Dismiss removes the row under it. */
function takeQuestionBox(): boolean {
  return takeNavFocus("unified-input");
}

/**
 * The row's own moves: [Open Permissions] [Dismiss] side by side, the same plain-focus step between
 * two siblings in one container the troubleshooting hint uses (chatTranscriptNavHelpers.ts). Up goes
 * to the question box above through Steam's transfer; Down holds still, since nothing sits under this
 * row but the dock. Both ends hold still too, so a press never hands the ring out to the rail.
 */
export function micHintRowNavHandlers(buttons: { current: (HTMLElement | null)[] }): Record<string, unknown> {
  const step = (from: number, to: number): boolean => {
    const [src, dst] = [buttons.current[from], buttons.current[to]];
    if (src && dst?.isConnected && elementHasGamepadFocus(src)) {
      try {
        dst.focus();
      } catch {
        /* holds still; the press stays claimed either way */
      }
    }
    return true;
  };
  return {
    onMoveRight: () => step(0, 1),
    onMoveLeft: () => step(1, 0),
    onMoveUp: () => takeQuestionBox() || true,
    onMoveDown: () => true,
  };
}

/** A on Dismiss: remove the row, then hand the ring to the question box once the button is gone. */
export function dismissMicHintKeepingRing(buttons: { current: (HTMLElement | null)[] }, dismiss: () => void): void {
  pressThenHandRingOn(buttons.current[1], dismiss, () => {
    void takeQuestionBox();
  });
}

/*
 * In: the jump to Permissions and the dismiss action from the voice hook.
 * Out: one row, the message over its two buttons.
 * What can go wrong: with no dismiss action only the Open Permissions button is drawn; the moves
 * then hold still sideways.
 */
export function MainTabMicPermissionHintRow({ fullBleedRowStyle, onNavigateToPermissions, onDismiss }: Props) {
  const navRef = useRef<NavRefHolder["current"]>(null);
  useEffect(() => {
    registerNavFocus("chat-perm-hint-mic", navRef);
    return () => unregisterNavFocus("chat-perm-hint-mic", navRef);
  }, []);
  const buttonEls = useRef<(HTMLElement | null)[]>([null, null]);
  const buttonRefs = useRef(
    [0, 1].map((i) => (el: HTMLElement | null) => {
      buttonEls.current[i] = el;
    }),
  ).current;
  /*
   * Each button sits in its own Focusable with all four moves (the About links' shape): on the Deck, Down
   * from Open Permissions still reached Dismiss with the handlers on the row alone, because a move between
   * two stops inside one container is Steam's own and the row's handler never ran (plan 96 block D,
   * workshop:test-evidence/plan96-P96-F11-HINT-RING.json). Here Down and the outer ends hold still, Up goes
   * to the question box, and Left/Right step between the two buttons.
   */
  const stepTo = (to: number) => (): boolean => {
    const dst = buttonEls.current[to];
    if (dst?.isConnected) {
      try {
        dst.focus();
      } catch {
        /* holds still */
      }
    }
    return true;
  };
  const wrapNav = (i: number): Record<string, unknown> => ({
    onMoveUp: () => takeQuestionBox() || true,
    onMoveDown: () => true,
    onMoveLeft: i === 1 ? stepTo(0) : () => true,
    onMoveRight: i === 0 ? stepTo(1) : () => true,
  });

  return (
    <Focusable
      className="bonsai-mic-perm-hint-row"
      flow-children="horizontal"
      {...({ navRef, ...micHintRowNavHandlers(buttonEls) } as Record<string, unknown>)}
    >
      <div
        className="bonsai-full-bleed-row"
        style={{
          ...fullBleedRowStyle,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          color: "#f09a8d",
          fontSize: textPx(11),
          lineHeight: 1.4,
        }}
      >
        <div>{PERMISSION_DENY_MESSAGES.microphone_access}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Focusable className="bonsai-mic-perm-hint-btn-wrap" {...(wrapNav(0) as Record<string, unknown>)}>
            <Button
              focusable
              ref={buttonRefs[0]}
              className={FOCUS_RING_BTN_CLASS}
              onClick={() => onNavigateToPermissions("microphone_access")}
              style={{ fontSize: textPx(11), padding: "4px 10px", minHeight: 34 }}
            >
              Open Permissions
            </Button>
          </Focusable>
          {onDismiss ? (
            <Focusable className="bonsai-mic-perm-hint-btn-wrap" {...(wrapNav(1) as Record<string, unknown>)}>
              <Button
                focusable
                ref={buttonRefs[1]}
                className={FOCUS_RING_BTN_CLASS}
                onClick={() => dismissMicHintKeepingRing(buttonEls, onDismiss)}
                style={{ fontSize: textPx(11), padding: "4px 10px", minHeight: 34 }}
              >
                Dismiss
              </Button>
            </Focusable>
          ) : null}
        </div>
      </div>
    </Focusable>
  );
}
