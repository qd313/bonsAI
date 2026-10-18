/**
 * Title: Knowing which Permissions row unblocks which action
 *
 * Purpose: When something a person tries to do is blocked because a permission is off — for
 * example, saving a file when "Save files to Desktop" is off — this file knows which
 * row on the Permissions tab controls that permission, and the exact sentence to show explaining
 * what to turn on.
 *
 * Used for: the "jump to Permissions" links shown wherever a permission blocks an action, and
 * planned to be reused by an upcoming connection-troubleshooting feature.
 *
 * Solves: without one shared list, each place that shows a permission-denied message would have
 * to work out on its own which Permissions row to send the person to, and the wording could
 * drift between places that are supposed to say the same thing.
 *
 * Does not: actually move the controller's highlight to that row or switch tabs — that is
 * `permissionJumpRegistry.ts` and `usePermissionJump`. This file only says where to go.
 *
 * Gotchas:
 *   - Two separate back-end permissions — reading the media library and reading Steam's own logs
 *     — show as one combined row on the Permissions tab ("Read game & screenshot context"), so
 *     both keys map to the same `game_context_read` target here.
 */
import type { BonsaiCapabilities } from "../settings/bonsaiSettingsSchema";

/** Keys aligned with `capabilities.py` CAPABILITY_KEYS and `BonsaiCapabilities`. */
export type BonsaiCapabilityKey = keyof BonsaiCapabilities;

/**
 * Focus targets in PermissionsTab. `game_context_read` is the combined media + Proton log toggle.
 * Connection doctor and other tab deep links should reuse these ids.
 */
export type PermissionFocusTargetId =
  | "game_context_read"
  | "filesystem_write"
  | "microphone_access"
  | "internet_downloads";

const CAPABILITY_TO_FOCUS: Record<BonsaiCapabilityKey, PermissionFocusTargetId> = {
  media_library_access: "game_context_read",
  steam_logs_read: "game_context_read",
  filesystem_write: "filesystem_write",
  microphone_access: "microphone_access",
  internet_downloads: "internet_downloads",
};

/** Standard user-facing deny copy per capability (override per site when context needs it). */
export const PERMISSION_DENY_MESSAGES: Record<BonsaiCapabilityKey, string> = {
  filesystem_write: "Enable Save files to Desktop in Permissions to use this action.",
  media_library_access: "Enable Media library access in Permissions to attach screenshots.",
  steam_logs_read:
    "Enable Read game & screenshot context in Permissions to auto-attach Proton logs and screenshots.",
  microphone_access: "Enable Voice input (microphone) in Permissions to use speech-to-text.",
  internet_downloads: "Enable Internet downloads in Permissions to download.",
};

/** Toggle labels as shown in PermissionsTab — used for Back banner and docs. */
export const PERMISSION_TOGGLE_LABELS: Record<PermissionFocusTargetId, string> = {
  game_context_read: "Read game & screenshot context",
  filesystem_write: "Save files to Desktop",
  microphone_access: "Voice input (microphone)",
  internet_downloads: "Internet downloads",
};
const TAB_LABELS: Record<string, string> = {
  main: "Main",
  ollama: "Ollama",
  settings: "Settings",
  permissions: "Permissions",
  developer: "Developer",
  about: "About",
};

/** Human label for a shell tab id when showing "Back to …". */
export function permissionJumpReturnTabLabel(tabId: string): string {
  return TAB_LABELS[tabId] ?? tabId;
}

/** Resolve the Permissions toggle row that unblocks a denied capability. */
export function resolvePermissionFocusTarget(capability: BonsaiCapabilityKey): PermissionFocusTargetId {
  return CAPABILITY_TO_FOCUS[capability];
}
