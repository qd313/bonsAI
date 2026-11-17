/**
 * Title: The button the first-time setup popup is built from
 *
 * Purpose: One control, already a stop of the popup's walk (useFirstRunPopupNav.ts): a Decky Button inside a
 * Focusable that carries the stop's nav node and its four move handlers, pressed by A or by a finger, never twice for
 * one press. It has one of four looks: the frosted glass of the plugin's other small buttons (Find LAN), Steam's blue
 * primary button (the foot's action, the look of Steam's own "Got it"), the same glass in the foot's shape (Not now,
 * Use the AI on my PC, Back) or a whole row with its own layout (the checklist's tick rows and the Internet
 * downloads switch, firstRunChecklist.tsx and FirstRunDownloadsSwitch.tsx). The foot's two looks are the ones every
 * two-button box shares (styles/confirmBoxButtons.ts). A greyed button stays a stop; a press on it does nothing, or
 * what `onGreyPress` says (the first screen's grey OK moves the ring to the switch).
 *
 * Used for: FirstRunWhereAiRunsModal.tsx, FirstRunPcScreen.tsx, firstRunChecklist.tsx, FirstRunDownloadsSwitch.tsx.
 *
 * Solves: A Decky Button never passes move handlers on, so each control sits in a Focusable (the same shape as the
 * shared two-button box) and the walk reaches it by that Focusable's nav node. The press guard is the Search tab's:
 * A arrives as a Steam button press and as a click, and a switch or a download must act once.
 *
 * Does not: Decide what a press does or where the ring goes next; the screen passes the action and the stop.
 */
import React, { useRef, type CSSProperties, type ReactNode } from "react";
import { Button, DialogButtonPrimary, Focusable } from "@decky/ui";

import {
  CONFIRM_ACTION_BUTTON_STYLE,
  CONFIRM_FOOT_BUTTON_H_PX,
  CONFIRM_SAFE_BUTTON_STYLE,
} from "../../../styles/confirmBoxButtons";
import { FOCUS_RING_BTN_CLASS, SETTINGS_GLASS_BTN } from "../../../styles/settingsGlassButton";
import { textPx } from "../../../styles/textPx";
import type { SearchStopProps } from "../../search-tab/useSearchNav";

/** A click this soon after an A press is the same press seen twice (as on the Search tab). */
const SAME_PRESS_MS = 400;

/** The popup's help lines and small notes. */
export const FIRST_RUN_HELP_STYLE: CSSProperties = { fontSize: textPx(11), color: "#8fa0b4", lineHeight: 1.35, userSelect: "none" };

const BUTTON_BASE: CSSProperties = {
  ...SETTINGS_GLASS_BTN,
  boxSizing: "border-box",
  minHeight: CONFIRM_FOOT_BUTTON_H_PX,
  height: CONFIRM_FOOT_BUTTON_H_PX,
  padding: "0 10px",
  textAlign: "center",
  justifyContent: "center",
  width: "100%",
};
/** The foot's two looks are the ones every two-button box shares (confirmBoxButtons.ts). */
const FOOT_LOOKS: Record<"primary" | "plain", CSSProperties> = {
  primary: CONFIRM_ACTION_BUTTON_STYLE,
  plain: CONFIRM_SAFE_BUTTON_STYLE,
};
const BUTTON_GREYED: CSSProperties = { opacity: 0.55 };

/** A button that is a stop. A greyed one stays a stop (it keeps the ring; the press does nothing, or `onGreyPress`). */
export function PopupButton({
  stop,
  label,
  ariaLabel,
  look = "glass",
  rowStyle,
  greyed = false,
  onPress,
  onGreyPress,
  ariaChecked,
  fill = true,
  buttonRef,
}: {
  stop: SearchStopProps;
  label: ReactNode;
  ariaLabel: string;
  /** "glass" (the default), "primary" (Steam's blue button), "plain" (the foot's safe button) or "row" (`rowStyle`). */
  look?: "glass" | "primary" | "plain" | "row";
  /** The whole look of a "row" button: its height, layout and colours. */
  rowStyle?: CSSProperties;
  greyed?: boolean;
  onPress: () => void;
  /** What a press on a greyed button does instead of nothing. */
  onGreyPress?: () => void;
  /** Set on a switch: read out as a switch that is on or off. */
  ariaChecked?: boolean;
  /** Fill the width of its column (the foot buttons); false keeps the button as wide as its words. */
  fill?: boolean;
  /**
   * Told the stop's element (the Focusable around the button; null when it goes), for a return target the shell
   * can hand the ring back to. It is the wrapper, not the button: Steam's primary button may not pass a ref on.
   */
  buttonRef?: (el: HTMLElement | null) => void;
}): React.ReactElement {
  const lastOk = useRef(0);
  const press = (fromOk: boolean) => {
    const now = Date.now();
    if (!fromOk && now - lastOk.current < SAME_PRESS_MS) return;
    if (fromOk) lastOk.current = now;
    if (!greyed) onPress();
    else onGreyPress?.();
  };
  const { ref, ...rest } = stop;
  const Look = look === "primary" ? DialogButtonPrimary : Button;
  const lookStyle = look === "row" ? rowStyle : look === "glass" ? BUTTON_BASE : FOOT_LOOKS[look];
  const wrapStyle: CSSProperties = look === "row" ? { width: "100%" } : fill ? { flex: "1 1 0", minWidth: 0 } : { flex: "0 0 auto" };
  return (
    <Focusable
      ref={(el: HTMLElement | null) => {
        ref(el);
        buttonRef?.(el);
      }}
      style={wrapStyle}
      {...({ ...rest, onOKButton: () => press(true) } as Record<string, unknown>)}
    >
      <Look
        className={FOCUS_RING_BTN_CLASS}
        onClick={() => press(false)}
        aria-label={ariaLabel}
        {...(ariaChecked === undefined ? {} : { role: "switch", "aria-checked": ariaChecked })}
        style={{
          ...lookStyle,
          ...(fill || look === "row" ? null : { width: "auto" }),
          ...(greyed ? BUTTON_GREYED : null),
        }}
      >
        {label}
      </Look>
    </Focusable>
  );
}
