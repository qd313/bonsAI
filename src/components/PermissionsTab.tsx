/**
 * Title: Permissions tab
 *
 * Purpose: The Permissions tab — the screen where you turn on the things the
 * AI is allowed to touch: saving files to your desktop, looking up your
 * Steam ban status, using the microphone, and reading game screenshots and
 * Proton logs to help with troubleshooting. Every one of these starts off
 * for a new install. Turning a toggle on here is what lets the Python side
 * of the plugin do that thing at all when Ask needs it; leaving it off
 * blocks the request outright, not just hides a button. The screen also
 * shows a Back button when you arrived here by tapping a "why is this off"
 * link from somewhere else, and a banner that greys out every switch when
 * Steam's parental controls are locked.
 *
 * Used for: The Permissions tab in index.tsx.
 *
 * Solves: One screen where a person agrees to each sensitive capability
 * before Ask or settings can use it, instead of the plugin doing these
 * things silently.
 *
 * Does not: Actually enforce these toggles. What happens here only decides
 * what gets saved; the Python side's capabilities service is what checks a
 * toggle before it lets a request through.
 *
 * Gotchas: A permission row can also be the destination of a jump from a
 * different tab (a "why is voice off" link, say). Landing there has to move
 * Steam's own idea of what is focused, not just call a DOM `.focus()` on the
 * toggle — a plain focus() left the ring on the button the user jumped from
 * while the browser's own idea of focus moved to the toggle, so the next
 * D-pad press went nowhere useful. See the comment on PermissionToggleHost
 * below for how that jump is wired and what it looked like broken on the
 * Deck.
 */
import React, { useEffect, useRef } from "react";
import { Focusable, PanelSection, PanelSectionRow, ToggleField, Button } from "@decky/ui";
import type { BonsaiCapabilities } from "../data/bonsaiSettingsSchema";
import type { PermissionFocusTargetId } from "../utils/permissionDeepLink";
import { permissionJumpReturnTabLabel } from "../utils/permissionDeepLink";
import {
  registerPermissionRowNavFocus,
  unregisterPermissionRowNavFocus,
  restorePermissionJumpFocusWithRetry,
} from "../utils/permissionJumpRegistry";
import type { NavRefHolder } from "../utils/navFocusRegistry";

type Props = {
  capabilities: BonsaiCapabilities;
  setCapabilities: React.Dispatch<React.SetStateAction<BonsaiCapabilities>>;
  /** When set, show a Back control that returns to the tab the user jumped from. */
  permissionJumpReturnTab?: string | null;
  onReturnFromPermissionJump?: () => void;
  /** Steam parental lock — greys toggles without mutating stored capabilities. */
  kidsLockActive?: boolean;
};

const ROWS: {
  key: keyof BonsaiCapabilities;
  focusId: PermissionFocusTargetId;
  title: string;
  description: string;
}[] = [
  {
    key: "filesystem_write",
    focusId: "filesystem_write",
    title: "Save files to Desktop",
    description: "Notes, logs, and exports under Desktop/bonsAI_logs. Off blocks those writes.",
  },
  {
    key: "steam_web_api",
    focusId: "steam_web_api",
    title: "Steam ban lookup",
    description: "For the bonsai:vac-check command. API key lives in Developer → Integrations.",
  },
  {
    key: "microphone_access",
    focusId: "microphone_access",
    title: "Voice input (microphone)",
    description:
      "Record from this device's microphone for local speech-to-text in the Ask bar. Audio stays on-device and is never saved.",
  },
];

const KIDS_LOCK_BANNER =
  "Parental controls active. Steam reports that parental controls are locked " +
  "on this account, so bonsAI keeps every high-impact permission off — no file " +
  "writes, no screenshots or game logs, no microphone, no Steam ban lookups. Ask " +
  "still works with your local AI. These switches turn back on by themselves when " +
  "Steam's parental controls are unlocked. bonsAI does not filter what the AI says.";

function gameContextReadEnabled(caps: BonsaiCapabilities): boolean {
  return caps.media_library_access && caps.steam_logs_read;
}

function PermissionToggleHost({
  focusId,
  children,
}: {
  focusId: PermissionFocusTargetId;
  children: React.ReactNode;
}) {
  /*
   * Registered as this row's own Steam nav node (navFocusRegistry.ts), not an element ref: a jump
   * here arrives from a different tab, a different navigation container, and a plain DOM `.focus()`
   * on a queried element does not carry Steam's gamepad ring across that boundary. Measured on
   * device 2026-09-05 (build 4/517804a, PERM-JUMP-01 step 3): the ring landed on "Back to Main"
   * instead of this row's toggle. `Focusable` needs no `focusable` of its own here — the `ToggleField`
   * inside is the real stop, the same shape `session-context-strip` and the chat permission-hint
   * rows already use successfully.
   */
  const navRef = useRef<NavRefHolder["current"]>(null);
  useEffect(() => {
    registerPermissionRowNavFocus(focusId, navRef);
    return () => unregisterPermissionRowNavFocus(focusId, navRef);
  }, [focusId]);

  return (
    <Focusable
      {...({ navRef } as Record<string, unknown>)}
      className="bonsai-settings-bleed"
      style={{ width: "100%" }}
      data-bonsai-permission-focus={focusId}
    >
      {children}
    </Focusable>
  );
}

/**
 * The whole Permissions screen: the optional Back button, the parental-controls
 * banner, and one row per toggle.
 *
 * In: the capabilities object read from settings, a setter to update it, and
 * — only when the user arrived here through a "go check permissions" link
 * from another tab — which tab to return to and a callback that jumps back
 * there. Also whether Steam's parental controls are currently locked.
 * Out: the tab's rows: one combined "read game & screenshot context" toggle
 * that actually sets two capabilities at once, plus one row per entry in
 * ROWS.
 *
 * What can go wrong: none of these toggles do anything by themselves —
 * turning one on only changes what gets saved. Enforcement happens later,
 * wherever a specific request checks whether its capability is on. New
 * installs start with everything off; a settings file saved before these
 * toggles existed is treated by the backend as fully allowed until this tab
 * is opened and saved once, after which only what is actually set here
 * applies.
 */
export const PermissionsTab: React.FC<Props> = ({
  capabilities,
  setCapabilities,
  permissionJumpReturnTab,
  onReturnFromPermissionJump,
  kidsLockActive = false,
}) => {
  useEffect(() => {
    restorePermissionJumpFocusWithRetry();
  }, []);

  const showBack = Boolean(permissionJumpReturnTab && onReturnFromPermissionJump);
  const backLabel = permissionJumpReturnTab
    ? permissionJumpReturnTabLabel(permissionJumpReturnTab)
    : "";

  return (
    <>
      <PanelSection title="Permissions">
        {showBack ? (
          <PanelSectionRow>
            <Button
              onClick={() => onReturnFromPermissionJump?.()}
              style={{ minHeight: 34, fontSize: 12, padding: "6px 12px" }}
            >
              Back to {backLabel}
            </Button>
          </PanelSectionRow>
        ) : null}
        {kidsLockActive ? (
          <PanelSectionRow>
            <Focusable
              className="bonsai-settings-bleed"
              style={{ fontSize: 12, color: "#f0c674", lineHeight: 1.45, marginBottom: 4 }}
              data-bonsai-kids-lock-banner="1"
            >
              {KIDS_LOCK_BANNER}
            </Focusable>
          </PanelSectionRow>
        ) : null}
        <PanelSectionRow>
          <div className="bonsai-settings-bleed" style={{ fontSize: 12, color: "#9fb7d5", lineHeight: 1.45, marginBottom: 4 }}>
            High-impact actions stay off until you enable them here. AI requests on your home network are not
            gated by these toggles. Model policy and routing live on the <strong>Ollama</strong> tab. Docs,
            GitHub, and Steam settings links always open when you tap them.
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <PermissionToggleHost focusId="game_context_read">
            <ToggleField
              label="Read game & screenshot context"
              description="Lets bonsAI attach Steam screenshots and, on troubleshooting Asks, auto-attach local game/Proton log excerpts. One permission for screenshots and logs."
              checked={kidsLockActive ? false : gameContextReadEnabled(capabilities)}
              disabled={kidsLockActive}
              onChange={(checked) => {
                if (kidsLockActive) return;
                setCapabilities((prev) => ({
                  ...prev,
                  media_library_access: checked,
                  steam_logs_read: checked,
                }));
              }}
            />
          </PermissionToggleHost>
        </PanelSectionRow>
        {ROWS.map((row) => (
          <PanelSectionRow key={row.key}>
            <PermissionToggleHost focusId={row.focusId}>
              <ToggleField
                label={row.title}
                description={row.description}
                checked={kidsLockActive ? false : capabilities[row.key]}
                disabled={kidsLockActive}
                onChange={(checked) => {
                  if (kidsLockActive) return;
                  setCapabilities((prev) => ({ ...prev, [row.key]: checked }));
                }}
              />
            </PermissionToggleHost>
          </PanelSectionRow>
        ))}
      </PanelSection>
    </>
  );
};
