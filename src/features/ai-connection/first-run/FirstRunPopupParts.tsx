/**
 * Title: The two controls the first-run popup is built from
 *
 * Purpose: A switch row and a button, each already a stop of the popup's walk (useFirstRunPopupNav.ts):
 * the switch is Steam's own ToggleField inside a Focusable that carries the stop's nav node and its four
 * move handlers, with the switch's help line under it; the button is a Decky Button inside such a
 * Focusable, pressed by A or by a finger, never twice for one press. A button has one of three looks: the
 * frosted glass of the plugin's other small buttons (Find LAN), Steam's blue primary button (the look of the
 * Beta Notice's "Got it", the foot's action) or Steam's plain button (the foot's Not now).
 *
 * Used for: FirstRunWhereAiRunsModal.tsx.
 *
 * Solves: A Decky Button never passes move handlers on, and a ToggleField's own handlers are not the
 * stop's, so each control sits in a Focusable (the same shape as the shared two-button box) and the walk
 * reaches it by that Focusable's nav node. The press guard is the Search tab's: A arrives as a Steam
 * button press and as a click, and a switch or a download must act once.
 *
 * Does not: Decide what a press does or where the ring goes next; the popup passes the action and the stop.
 */
import React, { useRef, type CSSProperties, type ReactNode } from "react";
import { Button, DialogButtonPrimary, Focusable, ToggleField } from "@decky/ui";

import { FOCUS_RING_BTN_CLASS, SETTINGS_GLASS_BTN } from "../../../styles/settingsGlassButton";
import { scaledSteamWords } from "../../../shared/text-size/scaledSteamWords";
import { textPx } from "../../../styles/textPx";
import type { SearchStopProps } from "../../search-tab/useSearchNav";

/** A click this soon after an A press is the same press seen twice (as on the Search tab). */
const SAME_PRESS_MS = 400;

/** The popup's help lines, under a switch, and small notes. */
export const FIRST_RUN_HELP_STYLE: CSSProperties = { fontSize: textPx(11), color: "#8fa0b4", lineHeight: 1.35, userSelect: "none" };

/** A switch that is a stop: Steam's ToggleField, 34 by 18 as Steam draws it, with its help line under it. */
export function PopupSwitch({
  stop,
  label,
  help,
  checked,
  disabled,
  onChange,
}: {
  stop: SearchStopProps;
  label: string;
  help: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}): React.ReactElement {
  const { ref, ...rest } = stop;
  return (
    <div data-bonsai-first-run-switch={label}>
      <Focusable ref={ref} {...(rest as Record<string, unknown>)}>
        <ToggleField
          label={scaledSteamWords(label, 14)}
          checked={checked}
          disabled={disabled}
          onChange={(raw: unknown) => onChange(raw === true || raw === 1)}
        />
      </Focusable>
      <div className="bonsai-prose" style={FIRST_RUN_HELP_STYLE}>
        {help}
      </div>
    </div>
  );
}

const BUTTON_BASE: CSSProperties = { ...SETTINGS_GLASS_BTN, minHeight: 32, height: 32, padding: "0 10px", textAlign: "center", justifyContent: "center", width: "100%" };
/** The foot's two looks are Steam's own, so only the size and the Text size step are ours. */
const BUTTON_STEAM: CSSProperties = {
  minHeight: 32,
  height: 32,
  padding: "0 10px",
  textAlign: "center",
  justifyContent: "center",
  width: "100%",
  fontSize: textPx(13),
};
const BUTTON_GREYED: CSSProperties = { opacity: 0.55 };

/** A button that is a stop. A greyed one stays a stop (it keeps the ring, the press does nothing). */
export function PopupButton({
  stop,
  label,
  ariaLabel,
  look = "glass",
  greyed = false,
  onPress,
  fill = true,
  buttonRef,
}: {
  stop: SearchStopProps;
  label: ReactNode;
  ariaLabel: string;
  /** "glass" (the default), "primary" (Steam's blue button, the action) or "plain" (Steam's grey button, Not now). */
  look?: "glass" | "primary" | "plain";
  greyed?: boolean;
  onPress: () => void;
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
  };
  const { ref, ...rest } = stop;
  const Look = look === "primary" ? DialogButtonPrimary : Button;
  return (
    <Focusable
      ref={(el: HTMLElement | null) => {
        ref(el);
        buttonRef?.(el);
      }}
      style={fill ? { flex: "1 1 0", minWidth: 0 } : { flex: "0 0 auto" }}
      {...({ ...rest, onOKButton: () => press(true) } as Record<string, unknown>)}
    >
      <Look
        className={FOCUS_RING_BTN_CLASS}
        onClick={() => press(false)}
        aria-label={ariaLabel}
        style={{
          ...(look === "glass" ? BUTTON_BASE : BUTTON_STEAM),
          ...(fill ? null : { width: "auto" }),
          ...(greyed ? BUTTON_GREYED : null),
        }}
      >
        {label}
      </Look>
    </Focusable>
  );
}
