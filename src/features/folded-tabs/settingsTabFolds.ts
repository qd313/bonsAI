/**
 * Title: The Settings tab's folded sections: their names, their summaries, and the rows' longer text
 *
 * Purpose: What the folded Settings tab (plan 91 § 2b, § 3c; plan 92 T1) says about itself: the eight
 * sections in order (Screenshot quality, Text size, Remember what I typed, Story spoilers,
 * Suggestion chips, Voice input, AI voice & personality, Data), each one's summary line
 * from the current settings, and the longer text of each row that the help strip shows, word for word
 * as the tab used to print it under or above the row.
 *
 * Used for: SettingsTab.tsx (the sections and summaries), the Settings section files (their rows' text),
 * and useSettingsTabFocus.ts (the chain of sections).
 *
 * Solves: Keeping the words in one place the strip, the tab and the tests all read, so a row's text
 * cannot drift between the tab and the checklist (the density board's data file,
 * docs/demos/mockup-board-2/src/42-tabs-data.js). Where the code's own words have moved on since that
 * file was written (the Text size row, plan 89), the code's words are the ones kept here.
 *
 * Does not: Draw anything or wire the D-pad (SettingsTab.tsx and useSettingsTabFocus.ts do).
 */
import {
  AI_CHARACTER_ACCENT_INTENSITY_OPTIONS,
  type AiCharacterAccentIntensityId,
} from "../../data/aiCharacterAccentIntensity";
import type {
  ChatTextSize,
  ScreenshotAttachmentPreset,
  VoiceSttModelId,
} from "../../data/bonsaiSettingsSchema";
import { summarizeSection } from "./sectionSummary";

/** The Settings tab's id, as its TabBodyFocusRoot and the fold store know it. */
export const SETTINGS_FOLD_TAB = "settings";

export const SETTINGS_SECTIONS = [
  { id: "screenshot", title: "Screenshot quality" },
  { id: "textsize", title: "Text size" },
  { id: "remember", title: "Remember what I typed" },
  { id: "spoilers", title: "Story spoilers (Strategy mode)" },
  { id: "chips", title: "Suggestion chips" },
  { id: "voiceinput", title: "Voice input" },
  { id: "character", title: "AI voice & personality" },
  { id: "data", title: "Data" },
] as const;

export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]["id"];

/** The sections a tab draws, in order. */
export function settingsSectionIds(): SettingsSectionId[] {
  return SETTINGS_SECTIONS.map((s) => s.id);
}

export const SCREENSHOT_PRESET_LABEL: Record<ScreenshotAttachmentPreset, string> = {
  low: "Save memory",
  mid: "Balanced",
  max: "Best detail",
};

export const CHAT_TEXT_SIZE_LABEL: Record<ChatTextSize, string> = {
  small: "Small",
  normal: "Normal",
  large: "Large",
};

/** The speech-to-text models' short names, as the drawing has them, and their full words (the buttons' labels for a screen reader). */
export const VOICE_STT_MODEL_SHORT_LABEL: Record<VoiceSttModelId, string> = {
  "tiny.en": "tiny.en · faster",
  "base.en": "base.en · better",
};
export const VOICE_STT_MODEL_FULL_LABEL: Record<VoiceSttModelId, string> = {
  "tiny.en": "tiny.en (faster, less accurate)",
  "base.en": "base.en (more accurate, recommended)",
};

/** The rows' longer text, as the tab printed it before it folded. */
export const SETTINGS_ROW_HELP = {
  screenshot: "For vision questions — lower quality uses less memory.",
  textSize:
    "How big the words are, everywhere in bonsAI: the tabs, the chat, the chips, the question box and Settings. Rows keep their height, so a long chat name is cut off sooner on Large.",
  remember: "On puts back what you typed in the question box when you reopen the plugin. Off clears it each time.",
  spoilers: "Strategy mode masks spoiler sections until you choose to reveal them.",
  chips:
    "The suggestion row above the question box shows one chip with the whole column, so its label reads more before it needs to scroll. Off shows two chips side by side — the default.",
  voiceInput:
    "Local speech-to-text for the Ask bar mic button. Enable the microphone permission in Permissions first. Audio is processed on-device and never saved.",
  character: "Preset, random, or custom character tone in replies.",
  developerTab: "Adds a Developer tab with logs, exports, and advanced tuning. Default off.",
} as const;

/** The accent row's strip text: the level in use, then the pointer to the menu. */
export function accentIntensityHelp(id: AiCharacterAccentIntensityId): string {
  const short = AI_CHARACTER_ACCENT_INTENSITY_OPTIONS.find((o) => o.id === id)?.shortLabel ?? "";
  return `${short} — use the menu for full descriptions.`;
}

export interface SettingsFoldValues {
  screenshotAttachmentPreset: ScreenshotAttachmentPreset;
  chatTextSize: ChatTextSize;
  rememberTyped: boolean;
  spoilerMasking: boolean;
  singleChip: boolean;
  voiceSttModel: VoiceSttModelId;
  aiCharacterEnabled: boolean;
  showDeveloperTab: boolean;
}

/** Each section's summary line, from the tab's current settings. */
export function settingsSectionSummaries(v: SettingsFoldValues): Record<SettingsSectionId, string> {
  return {
    screenshot: summarizeSection("Screenshot quality", [
      { kind: "choice", label: "Screenshot quality", value: SCREENSHOT_PRESET_LABEL[v.screenshotAttachmentPreset] },
    ]),
    textsize: summarizeSection("Text size", [{ kind: "choice", label: "Text size", value: CHAT_TEXT_SIZE_LABEL[v.chatTextSize] }]),
    remember: summarizeSection("Remember what I typed", [{ kind: "switch", label: "Remember what I typed", on: v.rememberTyped }]),
    spoilers: summarizeSection("Story spoilers (Strategy mode)", [
      { kind: "switch", label: "Hide spoilers until I tap", on: v.spoilerMasking },
    ]),
    chips: summarizeSection("Suggestion chips", [{ kind: "switch", label: "Show one chip instead of two", on: v.singleChip }]),
    voiceinput: summarizeSection("Voice input", [{ kind: "choice", label: "STT model", value: v.voiceSttModel }]),
    character: summarizeSection("AI voice & personality", [
      { kind: "switch", label: "AI voice & personality", on: v.aiCharacterEnabled },
    ]),
    data: summarizeSection("Data", [{ kind: "switch", label: "Show Developer tab", on: v.showDeveloperTab }]),
  };
}
