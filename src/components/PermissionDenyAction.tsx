/**
 * Title: "You need to turn this on" message and button
 *
 * Purpose: The small message and Open Permissions button that appears
 * wherever something is blocked because a permission is off — trying to
 * browse screenshots, use the microphone, or read game logs, say. It shows
 * why the action is blocked and gives a button that jumps straight to the
 * Permissions tab and highlights the right switch, instead of leaving a
 * person to hunt for it themselves.
 *
 * Used for: The screenshot browser, chat hints, the microphone banner, the
 * Developer tab, and anywhere else a blocked action needs to explain itself.
 *
 * Solves: Before this existed, a blocked action could only say so in a
 * passing toast message, with no way to act on it. One reusable message and
 * button means every blocked action can send someone straight to the fix.
 *
 * Does not: Do the jump itself — the caller passes in the function that
 * actually moves to the Permissions tab (see usePermissionJump); this file
 * only shows the message and the button that calls it.
 *
 * Gotchas: The button has to be reachable from more than one place — a
 * caller elsewhere in the reply row can hand the D-pad ring to this button
 * directly, from a different container entirely. That kind of hand-off
 * cannot be done by asking the browser to focus a queried element; it needs
 * Steam's own transfer mechanism (see navFocusRegistry.ts's navRef and
 * takeNavFocus), which is why this component does not forward a ref of its
 * own — one would not have worked for that case anyway.
 */
import { Button } from "@decky/ui";

import type { BonsaiCapabilityKey } from "../utils/permissionDeepLink";
import { PERMISSION_DENY_MESSAGES } from "../utils/permissionDeepLink";

export type PermissionDenyActionProps = {
  capability: BonsaiCapabilityKey;
  message?: string;
  onJump: (capability: BonsaiCapabilityKey) => void;
  /** Tighter layout for screenshot browser and chat rows. */
  compact?: boolean;
  buttonLabel?: string;
};

export function PermissionDenyAction({
  capability,
  message,
  onJump,
  compact = false,
  buttonLabel = "Open Permissions",
}: PermissionDenyActionProps) {
  const text = message ?? PERMISSION_DENY_MESSAGES[capability];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: compact ? "column" : "column",
        gap: compact ? 6 : 8,
        color: compact ? "#f09a8d" : "#c8d8ea",
        fontSize: compact ? 11 : 12,
        lineHeight: 1.4,
      }}
    >
      <div>{text}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {/*
         * `focusable` makes this a genuine D-pad stop. Without it, Steam treats the row as a
         * pass-through container rather than a Focusable leaf, so Down/Up jump straight past it —
         * measured 2026-09-03 (runs/PERM-JUMP-01-a-find-open-permissions.json): Down from Retry or
         * Copy landed on the session context strip and Right from Copy did not move at all. Same
         * shape as the chat-slot row's 2026-08-30 bug (ChatSlotRow.tsx).
         *
         * No ref forwarded from here on purpose. A caller that needs to hand Steam's ring to this
         * button from another container (the chat transcript's reply-row Down/Up chain, for one)
         * cannot do it with an element ref anyway — measured on device 2026-09-04 (build 49241e7):
         * a plain DOM `.focus()` moves `activeElement` but not the gamepad ring across containers,
         * and stamping a synthetic `tabindex` to make that focus "stick" corrupted the wrapping
         * Focusable instead (Steam's own Focusables carry no `tabindex` attribute at all on device,
         * so the "only stamp when absent" guard never held back). The sanctioned transfer is a
         * `navRef` on the caller's own wrapping Focusable and `takeNavFocus` — see
         * navFocusRegistry.ts — which does not need anything from this component.
         */}
        <Button
          focusable
          onClick={() => onJump(capability)}
          style={{ fontSize: 11, padding: compact ? "4px 10px" : "6px 12px", minHeight: 34 }}
        >
          {buttonLabel}
        </Button>
      </div>
    </div>
  );
}
