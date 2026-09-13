/**
 * Title: Permission deep-link mapper
 * Purpose: Map capability keys to Permissions-tab focus targets and standard deny copy.
 * Used for: Permission jump from deny surfaces; Connection doctor will reuse the same mechanism.
 * Solves: One shared mapping from backend capability keys to the right Permissions toggle row.
 * Does not: Navigate tabs or move focus — see permissionJumpRegistry and usePermissionJump.
 */
import type { BonsaiCapabilities } from "../data/bonsaiSettingsSchema";

/** Keys aligned with `capabilities.py` CAPABILITY_KEYS and `BonsaiCapabilities`. */
export type BonsaiCapabilityKey = keyof BonsaiCapabilities;

/**
 * Focus targets in PermissionsTab. `game_context_read` is the combined media + Proton log toggle.
 * Connection doctor and other tab deep links should reuse these ids.
 */
export type PermissionFocusTargetId =
  | "game_context_read"
  | "filesystem_write"
  | "steam_web_api"
  | "microphone_access";

const CAPABILITY_TO_FOCUS: Record<BonsaiCapabilityKey, PermissionFocusTargetId> = {
  media_library_access: "game_context_read",
  steam_logs_read: "game_context_read",
  filesystem_write: "filesystem_write",
  steam_web_api: "steam_web_api",
  microphone_access: "microphone_access",
};

/** Standard user-facing deny copy per capability (override per site when context needs it). */
export const PERMISSION_DENY_MESSAGES: Record<BonsaiCapabilityKey, string> = {
  filesystem_write: "Enable Save files to Desktop in Permissions to use this action.",
  media_library_access: "Enable Media library access in Permissions to attach screenshots.",
  steam_logs_read:
    "Enable Read game & screenshot context in Permissions to auto-attach Proton logs and screenshots.",
  steam_web_api: "Enable Steam ban lookup in Permissions to use bonsai:vac-check.",
  microphone_access: "Enable Voice input (microphone) in Permissions to use speech-to-text.",
};

/** Toggle labels as shown in PermissionsTab — used for Back banner and docs. */
export const PERMISSION_TOGGLE_LABELS: Record<PermissionFocusTargetId, string> = {
  game_context_read: "Read game & screenshot context",
  filesystem_write: "Save files to Desktop",
  steam_web_api: "Steam ban lookup",
  microphone_access: "Voice input (microphone)",
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

/** True when an Ask reply is the VAC-check capability-off guidance (no outbound HTTP ran). */
export function isVacCheckCapabilityDenyResponse(text: string): boolean {
  return text.includes("**Steam Web API is off for bonsAI.**");
}
