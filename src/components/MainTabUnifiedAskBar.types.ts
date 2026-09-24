/**
 * Title: The Ask bar's own prop shape
 *
 * Purpose: The prop type MainTabUnifiedAskBar takes, and the one small
 * helper that turns a screenshot media-permission error message into the
 * capability key the Permissions screen needs to jump to the right toggle.
 *
 * Used for: MainTabUnifiedAskBar.tsx only, and this file's own tests, which
 * build a props object to render the bar against.
 *
 * Solves: Keeps the (long) prop list and its one small helper out of the way
 * of the component body itself, so the file that draws the bar reads mostly
 * as drawing code.
 *
 * Does not: Decide anything about the bar's behavior — this is a type and a
 * pure string-matching function, nothing else.
 */
import React from "react";

import type { AskAttachment } from "../types/bonsaiUi";
import type { AskModeId } from "../data/askMode";
import type { BonsaiCapabilityKey } from "../utils/permissionDeepLink";

export type MainTabUnifiedAskBarProps = {
  fullBleedRowStyle: React.CSSProperties;
  presetCarouselHostRef: React.RefObject<HTMLDivElement | null>;
  unifiedInputHostRef: React.Ref<HTMLDivElement>;
  unifiedInputFieldLayerRef: React.Ref<HTMLDivElement>;
  unifiedInputMeasureRef: React.Ref<HTMLDivElement>;
  attachActionHostRef: React.Ref<HTMLDivElement>;
  askBarHostRef: React.Ref<HTMLDivElement>;
  unifiedInputSurfacePx: number;
  unifiedInput: string;
  usesNativeMultilineField: boolean;
  setIsUnifiedInputFocused: (v: boolean) => void;
  isUnifiedInputFocused: boolean;
  setUnifiedInput: React.Dispatch<React.SetStateAction<string>>;
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
  filteredSettings: string[];
  selectedIndex: number;
  onSettingClick: (settingPath: string, index?: number) => void;
  isAsking: boolean;
  ollamaIp: string;
  onAskOllama: (overrideQuestion?: string, opts?: { threadQuestionDisplay?: string }) => void | Promise<void>;
  onOpenScreenshotBrowser: () => void | Promise<void>;
  onTakeScreenshot: () => void | Promise<void>;
  onCancelAsk: () => void;
  onMicInput: () => void;
  voiceRecording?: boolean;
  selectedAttachment: AskAttachment | null;
  setSelectedAttachment: React.Dispatch<React.SetStateAction<AskAttachment | null>>;
  clearUnifiedInput: () => void;
  showSearchClearButton: boolean;
  mediaError: string;
  isCapturingScreenshot?: boolean;
  mediaLibraryEnabled?: boolean;
  aiCharacterPadClass?: boolean;
  aiCharacterAvatarPresetId?: string | null;
  aiCharacterAvatarBadgeLetter?: string | null;
  onOpenCharacterPicker?: () => void;
  aiCharacterDebugLine?: string | null;
  askMode: AskModeId;
  onAskModeChange: (mode: AskModeId) => void;
  isQamSetting: (settingPath: string) => boolean;
  onFocusHandlersReady?: (handlers: { focusUnifiedTextField: () => boolean }) => void;
  onNavigateToPermissions?: (capability: BonsaiCapabilityKey) => void;
};

export function screenshotMediaErrorCapability(message: string): BonsaiCapabilityKey {
  if (message.includes("Read game & screenshot context")) return "steam_logs_read";
  return "media_library_access";
}
