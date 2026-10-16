/**
 * Title: The Developer tab's folded sections: their names, their summaries, and the rows' longer text
 *
 * Purpose: What the folded Developer tab (plan 91 § 2b, plan 92 lane T2) says about itself: the six
 * sections in order (Knowledge base, Diagnostics, Navigation, Logging & exports, Animations,
 * Integrations), each one's summary line from the current settings, the labels the tab's choice rows
 * show, and the longer text of each row that the strip shows, word for word as the tab used to print it
 * under or above the row (the density board's data file, docs/demos/mockup-board-2/src/42-tabs-data.js,
 * lists every one).
 *
 * Used for: DeveloperTab.tsx and the Developer section files (the sections and summaries, the rows'
 * text), and developerTabFolds.test.ts (which checks the words against the board's data file).
 *
 * Solves: Keeping the words in one place the strip, the tab and the tests all read, so a row's text cannot
 * drift between the tab and the checklist. Also takes the label tables out of DeveloperTab.tsx, which
 * is the file that was 666 lines.
 *
 * Does not: Draw anything or wire the D-pad (DeveloperTab.tsx and useDeveloperTabFocus.ts do).
 */
import {
  TAB_RESUME_RECENT_WINDOW_MS,
  type DesktopAppLogLevel,
  type StreamScrambleColor,
  type StreamScrambleStyle,
  type TabResumeMode,
} from "../../data/bonsaiSettingsSchema";
import { summarizeSection, type SummaryRow } from "./sectionSummary";

/** The Developer tab's id, as its TabBodyFocusRoot and the fold store know it. */
export const DEVELOPER_FOLD_TAB = "developer";

export const DEVELOPER_SECTIONS = [
  { id: "kb", title: "Knowledge base" },
  { id: "diagnostics", title: "Diagnostics" },
  { id: "navigation", title: "Navigation" },
  { id: "logging", title: "Logging & exports" },
  { id: "animations", title: "Animations" },
  { id: "integrations", title: "Integrations" },
] as const;

export type DeveloperSectionId = (typeof DEVELOPER_SECTIONS)[number]["id"];

/** The sections on screen: the knowledge-base one only when a seed-install callback was passed in. */
export function developerSectionsShown(hasSeedKb: boolean): (typeof DEVELOPER_SECTIONS)[number][] {
  return DEVELOPER_SECTIONS.filter((s) => s.id !== "kb" || hasSeedKb);
}

export function developerSectionTitle(id: DeveloperSectionId): string {
  return DEVELOPER_SECTIONS.find((s) => s.id === id)?.title ?? id;
}

export const desktopAppLogLevelLabel: Record<DesktopAppLogLevel, string> = {
  off: "Off",
  default: "Default",
  verbose: "Verbose",
};
export const desktopAppLogLevelDescription: Record<DesktopAppLogLevel, string> = {
  off: "No app activity log file on Desktop.",
  default: "Summary events (connection tests, asks, settings changes).",
  verbose: "Default events plus RPC details, setup log lines, and frontend errors.",
};

const TAB_RESUME_RECENT_WINDOW_MINUTES = Math.round(TAB_RESUME_RECENT_WINDOW_MS / 60000);

// Labelled by roadmap option letter on purpose: this control exists to compare D15 A/B/C
// on-device, so the mapping back to the decision record should be readable from the Deck.
export const tabResumeModeLabel: Record<TabResumeMode, string> = {
  always_main: "A · Main",
  resume: "B · Resume",
  resume_recent: `C · ${TAB_RESUME_RECENT_WINDOW_MINUTES} min`,
};
export const tabResumeModeDescription: Record<TabResumeMode, string> = {
  always_main: "Every reopen starts on Main, whatever tab you left from.",
  resume: "Reopen lands on the tab you left. Shipped default.",
  resume_recent: `Reopen resumes the tab within ${TAB_RESUME_RECENT_WINDOW_MINUTES} minutes, then falls back to Main.`,
};

export const streamScrambleStyleLabel: Record<StreamScrambleStyle, string> = {
  settle: "Settle",
  chip: "Chip pace",
  tail: "Fixed tail",
};
export const streamScrambleStyleDescription: Record<StreamScrambleStyle, string> = {
  settle: "Each letter scrambles for a moment after it arrives, then settles.",
  chip: "Letters settle one at a time at the decode chips' pace, so a long answer stays scrambled until near the end.",
  tail: "The last 10 letters are always scrambled.",
};

export const streamScrambleColorLabel: Record<StreamScrambleColor, string> = {
  same: "Same",
  dim: "Dimmer",
  green: "Green",
  cyan: "Cyan",
};
export const streamScrambleColorAriaLabel: Record<StreamScrambleColor, string> = {
  same: "Same as text",
  dim: "Dimmer",
  green: "bonsAI green",
  cyan: "Streaming cyan",
};

/** The rows' names, as the tab draws them and the summary writes them. */
export const DEVELOPER_ROW_LABELS = {
  installSeedKb: "Install seed knowledge base",
  hybrid: "Hybrid retrieval (meaning search)",
  hud: "On-screen debug HUD",
  warm: "Warm the Ask model at boot",
  steamInput: "Jump to Steam Input (running game)",
  tabToOpenOn: "Tab to open on",
  appLog: "App activity logging to Desktop",
  autoSave: "Auto-save chat to Desktop notes",
  verbose: "Verbose Ask logging to Desktop notes",
  forceChips: "Force session RAG chips",
  frozenChips: "Frozen test chips",
  presetAnimation: "Preset suggestions",
  scramble: "Scramble animation",
  howLettersSettle: "How letters settle",
  settleTime: "How long each letter scrambles",
  scrambleColour: "Scrambled letter colour",
  steamWebApiKey: "Steam Web API key",
} as const;

/** The rows' longer text (the strip shows it while the ring is on the row), as the tab printed it before it folded. */
export const DEVELOPER_ROW_HELP = {
  installSeedKb:
    "Public HF/GitHub download is not live yet. build.ps1 copies a seed corpus (DRG Survivor + OoT alias sample) to the Deck. Install it into ~/.bonsai/rag for Phase 1 testing. Hybrid retrieval also needs vectorized seed + nomic-embed-text on your Ask Ollama host.",
  hybrid:
    "On, the knowledge base ranks cards by keyword match and meaning together. Off, it uses keyword match only — cards still attach, and Show details says Keyword search (hybrid disabled). Turn it off to tell a retrieval problem apart from an embedding one.",
  hud: "Shows a small translucent log at the bottom of the plugin (focus, tab changes, ingest). Off by default so Settings and connection UI stay readable.",
  warm: "Loads the default Ask model into memory when the plugin starts, so the first question skips the cold load. Only ever warms a model of 3B parameters or under, and skips quietly if memory is tight — no error, no stuck status line.",
  steamInput:
    "Experimental: opens per-game controller configuration for the running game. Requires a focused/running title.",
  tabToOpenOnTail: "Takes effect the next time you close and reopen the plugin.",
  appLogTail: "Writes bonsai-app-YYYY-MM-DD.log under Desktop/bonsAI_logs/.",
  appLogNeedsPermission: "Enable Save files to Desktop in Permissions to save logs.",
  autoSave: "Append Q+A to Desktop/bonsAI_logs/bonsai-chat-YYYY-MM-DD.md (UTC). Needs Save files to Desktop.",
  verbose: "Full Ollama trace to bonsai-ask-trace-*.md under Desktop/bonsAI_logs. Can be large/sensitive.",
  forceChips:
    "Always fill preset carousel slots from the knowledge base instead of a 30% chance each, and reseed the chips immediately. For verifying SESSION-RAG-CHIPS-01 without waiting on the roll. Needs Use local knowledge base on and a covered game running.",
  frozenNone:
    "None pinned — the carousel is sampling normally. A pinned batch replaces the carousel with exact questions in order and stops it reseeding, so a QA row is one press per case instead of typing the sentence. Set the list from the host while preparing a run.",
  frozenPinned: (count: number) =>
    `${count} pinned. The carousel is showing these and will not reseed. Session RAG chips are suppressed while a batch is active, so corpus-chip checks cannot pass until you clear it.`,
  scramble:
    "New answer text scrambles through symbols for a moment before it settles into letters, like the decode chips. Off by default.",
  steamWebApiKey:
    "For the bonsai:vac-check command. Enable Steam ban lookup in Permissions. Stored on this device.",
} as const;

/** The strip's words for "Tab to open on": the picked mode's line, then when it takes effect. */
export function tabToOpenOnHelp(mode: TabResumeMode): string {
  return `${tabResumeModeDescription[mode]} ${DEVELOPER_ROW_HELP.tabToOpenOnTail}`;
}

/** The strip's words for "App activity logging": the picked level's line, where it writes, and the permission it needs. */
export function appLogHelp(level: DesktopAppLogLevel, filesystemWrite: boolean): string {
  const base = `${desktopAppLogLevelDescription[level]} ${DEVELOPER_ROW_HELP.appLogTail}`;
  return filesystemWrite ? base : `${base} ${DEVELOPER_ROW_HELP.appLogNeedsPermission}`;
}

/** The values the section summaries read: the tab's current settings, nothing else. */
export interface DeveloperFoldValues {
  hasSeedKb: boolean;
  ragHybridRetrievalEnabled: boolean;
  showOnscreenDebugHud: boolean;
  devPreloadAskModel: boolean;
  tabResumeMode: TabResumeMode;
  desktopAppLogLevel: DesktopAppLogLevel;
  desktopDebugNoteAutoSave: boolean;
  desktopAskVerboseLogging: boolean;
  devForceSessionRagChips: boolean;
  presetChipAnimation: string;
  scrambleEnabled: boolean;
}

/**
 * The animations section's summary rows: the preset animation and the scramble switch. The scramble's own
 * three rows (how letters settle, for how long, their colour) are details of the switch, shown only while it is
 * on, and are left out of the line so it stays short.
 */
function animationsSummaryRows(v: DeveloperFoldValues): SummaryRow[] {
  return [
    { kind: "choice", label: DEVELOPER_ROW_LABELS.presetAnimation, value: v.presetChipAnimation },
    { kind: "switch", label: DEVELOPER_ROW_LABELS.scramble, on: v.scrambleEnabled },
  ];
}

/** Each section's summary line, from the tab's current settings. */
export function developerSectionSummaries(v: DeveloperFoldValues): Record<DeveloperSectionId, string> {
  const title = developerSectionTitle;
  return {
    kb: summarizeSection(title("kb"), [
      { kind: "button", label: DEVELOPER_ROW_LABELS.installSeedKb },
      { kind: "switch", label: DEVELOPER_ROW_LABELS.hybrid, on: v.ragHybridRetrievalEnabled },
    ]),
    diagnostics: summarizeSection(title("diagnostics"), [
      { kind: "switch", label: DEVELOPER_ROW_LABELS.hud, on: v.showOnscreenDebugHud },
      { kind: "switch", label: DEVELOPER_ROW_LABELS.warm, on: v.devPreloadAskModel },
      { kind: "button", label: DEVELOPER_ROW_LABELS.steamInput },
    ]),
    navigation: summarizeSection(title("navigation"), [
      { kind: "choice", label: DEVELOPER_ROW_LABELS.tabToOpenOn, value: tabResumeModeLabel[v.tabResumeMode] },
    ]),
    logging: summarizeSection(title("logging"), [
      { kind: "choice", label: DEVELOPER_ROW_LABELS.appLog, value: desktopAppLogLevelLabel[v.desktopAppLogLevel] },
      { kind: "switch", label: DEVELOPER_ROW_LABELS.autoSave, on: v.desktopDebugNoteAutoSave },
      { kind: "switch", label: DEVELOPER_ROW_LABELS.verbose, on: v.desktopAskVerboseLogging },
      { kind: "switch", label: DEVELOPER_ROW_LABELS.forceChips, on: v.devForceSessionRagChips },
    ]),
    animations: summarizeSection(title("animations"), animationsSummaryRows(v)),
    integrations: summarizeSection(title("integrations"), []),
  };
}
