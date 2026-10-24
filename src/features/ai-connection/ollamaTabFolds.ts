/**
 * Title: The Ollama tab's five folded sections: their names, their summaries, and the rows' longer text
 *
 * Purpose: What the folded Ollama tab (plan 91 § 2b) says about itself: the five sections in order
 * (Where AI runs; Knowledge base (offline); Reply style; Connection tuning; AI models), each one's
 * summary line from the current settings, and the longer text of each row that the strip shows, word
 * for word as the tab used to print it under or above the row.
 *
 * Used for: OllamaTab.tsx (the sections and summaries), OllamaWhereAiRunsSection.tsx and
 * KnowledgeBaseSection.tsx (their rows' text).
 *
 * Solves: Keeping the words in one place the strip, the tab and the tests all read, so a row's text
 * cannot drift between the tab and the checklist (the density board's data file,
 * docs/demos/mockup-board-2/src/42-tabs-data.js).
 *
 * Does not: Draw anything or wire the D-pad (OllamaTab.tsx does).
 */
import { ASK_THINK_EFFORT_LABELS, type AskThinkEffortId } from "../settings/askThinkEffort";
import { OLLAMA_KEEP_ALIVE_CHIP_LABEL } from "./ollamaKeepAlive";
import type { OllamaKeepAliveDuration } from "../settings/bonsaiSettingsSchema";
import { REPLY_VERBOSITY_LABELS, type ReplyVerbosityId } from "../settings/replyVerbosity";
import { summarizeSection } from "../folded-tabs/sectionSummary";

/** The Ollama tab's id, as its TabBodyFocusRoot and the fold store know it. */
export const OLLAMA_FOLD_TAB = "ollama";

export const OLLAMA_SECTIONS = [
  { id: "where", title: "Where AI runs" },
  { id: "kb", title: "Knowledge base (offline)" },
  { id: "reply", title: "Reply style" },
  { id: "tuning", title: "Connection tuning" },
  { id: "models", title: "AI models" },
] as const;

export type OllamaSectionId = (typeof OLLAMA_SECTIONS)[number]["id"];

/** The rows' longer text, as the tab printed it before it folded. */
export const OLLAMA_ROW_HELP = {
  pcAddress:
    "Just the PC's address, for example 192.168.1.20. bonsAI adds Ollama's usual port (11434) when you leave it out.",
  runOnDeck: "Off: use a PC on your home network. On: AI runs on this device.",
  autostart:
    "Starts the local AI when the Deck starts, and lets it keep the answering part and the note-searching part in memory at once — so questions come back about seven tenths of a second sooner.",
  setupBusy:
    "Install in progress — first-time setup can take up to 5 minutes. Keep Wi‑Fi on and avoid sleep or reboot until it finishes.",
  setupFirstTime:
    "First-time Install Ollama can take up to 5 minutes (download and setup). Use stable Wi‑Fi and AC power where possible.",
  useKnowledgeBase:
    "Ground Strategy and troubleshooting Asks with downloaded offline cards (keyword or Keyword + meaning search).",
  replyStyle:
    "Terse gives three short lines and a menu of choices to dig deeper, in Speed, Strategy and Expert. It shortens what you see, not how hard the AI thinks. Caveman is blunt and brief, Balanced is the default, Detailed explains more.",
  timeouts: "Warning = slow-reply nudge. Timeout = abort if still busy.",
  keepAlive: "How long Ollama keeps the model in memory after a prompt (VRAM on the host).",
} as const;

export interface OllamaFoldValues {
  ollamaLocalOnDeck: boolean;
  ollamaLocalAutostart: boolean;
  useLocalKnowledgeBase: boolean;
  replyVerbosity: ReplyVerbosityId;
  askThinkEffort: AskThinkEffortId;
  latencyTimeoutsCustomEnabled: boolean;
  ollamaKeepAlive: OllamaKeepAliveDuration;
}

/** Each section's summary line, from the tab's current settings. */
export function ollamaSectionSummaries(v: OllamaFoldValues): Record<OllamaSectionId, string> {
  return {
    where: summarizeSection("Where AI runs", [
      { kind: "switch", label: "Run AI on this Deck", on: v.ollamaLocalOnDeck },
      { kind: "switch", label: "Start the AI with the Deck", on: v.ollamaLocalAutostart },
    ]),
    kb: summarizeSection("Knowledge base (offline)", [
      { kind: "switch", label: "Use local knowledge base", on: v.useLocalKnowledgeBase },
    ]),
    reply: summarizeSection("Reply style", [
      { kind: "slider", label: "Reply style", value: REPLY_VERBOSITY_LABELS[v.replyVerbosity] },
      { kind: "choice", label: "Thinking", value: ASK_THINK_EFFORT_LABELS[v.askThinkEffort] },
    ]),
    tuning: summarizeSection("Connection tuning", [
      { kind: "switch", label: "Custom timeouts", on: v.latencyTimeoutsCustomEnabled },
      { kind: "slider", label: "Keep models loaded", value: OLLAMA_KEEP_ALIVE_CHIP_LABEL[v.ollamaKeepAlive] },
    ]),
    models: "",
  };
}
