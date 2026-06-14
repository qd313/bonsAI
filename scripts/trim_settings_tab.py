"""Strip Ollama sections from SettingsTab after Ollama tab extraction."""
from pathlib import Path

src_path = Path(__file__).resolve().parents[1] / "src/components/SettingsTab.tsx"
lines = src_path.read_text(encoding="utf-8").splitlines()

# Keep lines 1-36 imports (adjust imports), 93-127 types/constants for settings-only, 1066-end for JSX after Where AI runs
# Line numbers 1-based; convert to 0-indexed

new_imports = """import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  PanelSection,
  PanelSectionRow,
  ToggleField,
  Button,
  Focusable,
  showModal,
  ConfirmModal,
} from "@decky/ui";
import {
  SCREENSHOT_ATTACHMENT_PRESET_OPTIONS,
  type ScreenshotAttachmentPreset,
  type UnifiedInputPersistenceMode,
} from "../utils/settingsAndResponse";
import {
  AI_CHARACTER_ACCENT_INTENSITY_OPTIONS,
  type AiCharacterAccentIntensityId,
} from "../data/aiCharacterAccentIntensity";
import { formatAiCharacterSelectionLine } from "../data/characterCatalog";
import { SettingsTabAccentIntensityMenuPopover } from "./SettingsTabAccentIntensityMenuPopover";
import { ASK_LABEL_COLOR_50 } from "../features/unified-input/constants";
import {
  consumeSettingsTabLocalPending,
  peekSettingsTabLocalPending,
  registerSettingsTabLocalGetter,
  unregisterSettingsTabLocalGetter,
} from "../utils/settingsTabLocalSurvival";
"""

props_block = """
const persistenceModeLabel: Record<UnifiedInputPersistenceMode, string> = {
  persist_all: "Remember everything",
  persist_search_only: "Remember search only",
  no_persist: "Don't remember",
};
const persistenceModeShortLabel: Record<UnifiedInputPersistenceMode, string> = {
  persist_all: "All",
  persist_search_only: "Search",
  no_persist: "None",
};
const persistenceModeOptions: UnifiedInputPersistenceMode[] = [
  "persist_all",
  "persist_search_only",
  "no_persist",
];
const persistenceModeDescription: Record<UnifiedInputPersistenceMode, string> = {
  persist_all: "Restore all typed text when you reopen the plugin.",
  persist_search_only: "Restore only text from Steam settings search.",
  no_persist: "Never restore typed text on reopen.",
};
const screenshotPresetLabel: Record<ScreenshotAttachmentPreset, string> = {
  low: "Save memory",
  mid: "Balanced",
  max: "Best detail",
};

const accentIntensityOutline: Record<AiCharacterAccentIntensityId, string> = {
  subtle: "#eab308",
  balanced: "#f97316",
  heavy: "#b91c1c",
  unleashed: "#a855f7",
};

export type SettingsTabProps = {
  screenshotAttachmentPreset: ScreenshotAttachmentPreset;
  setScreenshotAttachmentPreset: (v: ScreenshotAttachmentPreset) => void;

  unifiedInputPersistenceMode: UnifiedInputPersistenceMode;
  setUnifiedInputPersistenceMode: (v: UnifiedInputPersistenceMode) => void;

  aiCharacterEnabled: boolean;
  setAiCharacterEnabled: (v: boolean) => void;
  aiCharacterRandom: boolean;
  aiCharacterPresetId: string;
  aiCharacterCustomText: string;
  aiCharacterAccentIntensity: AiCharacterAccentIntensityId;
  setAiCharacterAccentIntensity: (v: AiCharacterAccentIntensityId) => void;

  showDeveloperTab: boolean;
  setShowDeveloperTab: (v: boolean) => void;

  strategySpoilerMaskingEnabled: boolean;
  setStrategySpoilerMaskingEnabled: (v: boolean) => void;
  strategySpoilerAutoRevealAfterConsent: boolean;
  setStrategySpoilerAutoRevealAfterConsent: (v: boolean) => void;

  onOpenCharacterPicker: () => void;
  onResetSession: () => void;
  onClearAllPluginData: () => void | Promise<void>;
};
"""

component_start = """
export const SettingsTab: React.FC<SettingsTabProps> = ({
  screenshotAttachmentPreset,
  setScreenshotAttachmentPreset,
  unifiedInputPersistenceMode,
  setUnifiedInputPersistenceMode,
  aiCharacterEnabled,
  setAiCharacterEnabled,
  aiCharacterRandom,
  aiCharacterPresetId,
  aiCharacterCustomText,
  aiCharacterAccentIntensity,
  setAiCharacterAccentIntensity,
  showDeveloperTab,
  setShowDeveloperTab,
  strategySpoilerMaskingEnabled,
  setStrategySpoilerMaskingEnabled,
  strategySpoilerAutoRevealAfterConsent,
  setStrategySpoilerAutoRevealAfterConsent,
  onOpenCharacterPicker,
  onResetSession,
  onClearAllPluginData,
}) => {
  const [accentIntensityMenuOpen, setAccentIntensityMenuOpen] = useState(
    () => peekSettingsTabLocalPending()?.accentIntensityMenuOpen ?? false
  );
  const accentIntensityMenuAnchorRef = useRef<HTMLDivElement>(null);
  const accentIntensityMenuFirstItemRef = useRef<HTMLDivElement>(null);
  const accentIntensityMenuToggleOnceRef = useRef(false);
  const screenshotDimensionNavRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const local = consumeSettingsTabLocalPending();
    if (!local) return;
    setAccentIntensityMenuOpen(local.accentIntensityMenuOpen);
  }, []);

  useEffect(() => {
    registerSettingsTabLocalGetter(() => ({
      accentIntensityMenuOpen,
    }));
    return () => unregisterSettingsTabLocalGetter();
  }, [accentIntensityMenuOpen]);

  const toggleAccentIntensityMenu = useCallback(() => {
    if (accentIntensityMenuToggleOnceRef.current) return;
    accentIntensityMenuToggleOnceRef.current = true;
    setAccentIntensityMenuOpen((o) => !o);
    requestAnimationFrame(() => {
      accentIntensityMenuToggleOnceRef.current = false;
    });
  }, []);
  const closeAccentIntensityMenu = useCallback(() => setAccentIntensityMenuOpen(false), []);
  const focusAccentIntensityTrigger = useCallback((): boolean => {
    const btn = accentIntensityMenuAnchorRef.current?.querySelector<HTMLElement>("button.bonsai-accent-intensity-trigger");
    if (!btn) return false;
    btn.focus();
    return true;
  }, []);

  return (
    <div className="bonsai-tab-panel-shell bonsai-tab-panel-shell--tight bonsai-settings-section-stack">
"""

# JSX from screenshot quality onward (line 1066+)
jsx_tail = "\n".join(lines[1065:])

out = new_imports + props_block + component_start + jsx_tail
src_path.write_text(out, encoding="utf-8")
print("SettingsTab trimmed")
