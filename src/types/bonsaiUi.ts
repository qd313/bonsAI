/**
 * Title: Shapes of things on the Ask screen
 *
 * Purpose: Names the shape of several pieces of data the Ask screen
 * passes around — an attached screenshot, a game-context marker, a
 * branch picker or checklist parsed out of a Strategy answer, and, the
 * largest one, a single finished question-and-answer pair as it is kept
 * in the on-screen conversation history.
 *
 * Used for: Wherever the frontend needs to describe one of these shapes —
 * the Ask screen, the screenshot picker, and the code that keeps the
 * on-screen conversation in sync with what actually happened.
 *
 * Does not: Define anything about how a chat is saved to disk — see the
 * chat-slot data shapes for that. These are the shapes used while a
 * conversation is actively on screen.
 */
import type { ChatSlotTurnTransparency, TransparencySnapshot } from "../utils/inputTransparency";

export type AppliedResult = {
  tdp_watts: number | null;
  gpu_clock_mhz: number | null;
  errors: string[];
};

export type AskAttachment = {
  path: string;
  name: string;
  source: "capture" | "recent" | "picker";
  preview_data_uri?: string;
  size_bytes?: number;
  app_id?: string;
};

export type ScreenshotItem = {
  path: string;
  name: string;
  mtime: number;
  size_bytes?: number;
  source: string;
  app_id?: string;
  preview_data_uri?: string;
  capture_method?: string;
};

export type OllamaContextUi = { app_id: string; app_context: "active" | "none" } | null;

/** Parsed from Ollama when Ask mode is Strategy Guide and the model emitted a branch picker block. */
export type StrategyGuideBranchesPayload = {
  question: string;
  options: { id: string; label: string }[];
};

/** Parsed from Strategy follow-up replies (`bonsai-strategy-checklist` fence). */
export type StrategyChecklistPayload = {
  title: string;
  items: { id: string; label: string }[];
};

export type StrategyChecklistState = StrategyChecklistPayload & {
  checkedIds: string[];
  appId?: string;
  appName?: string;
};

/**
 * One completed Ask round shown in the session thread.
 *
 * `transparency` is the full snapshot for a turn archived live this session, but a turn
 * restored from a chat slot (`chatSlotTurns.ts`) only ever carries the trimmed
 * `ChatSlotTurnTransparency` shape the backend persisted alongside it — see
 * `transparency_snapshot_for_chat_slot` in transparency_service.py.
 */
export type AskThreadCollapsedTurn = {
  id: string;
  question: string;
  /**
   * The caption the user saw for this question, when it differs from `question` (the composed
   * prompt — e.g. a branch pick shows "I'm at: …" but sends "[Strategy follow-up] I'm at: …").
   * Header rendering prefers this; everything that reasons about the turn (spoiler unwrap, copy
   * text, follow-up context) keeps reading `question`.
   */
  questionDisplay?: string;
  answer: string;
  transparency?: TransparencySnapshot | ChatSlotTurnTransparency | null;
  /**
   * AppID this turn was asked against. Optional so older session-survival snapshots still parse.
   * Stored per turn rather than read from live context because "named bosses are not spoilers"
   * is a per-game rule — reusing the current AppID would apply one game's allowlist entry to
   * another game's answer after the player switches titles.
   */
  appId?: string;
  /** True when the user consented to spoilers for this turn (unwrap all fences in history). */
  spoilerConsentEffective?: boolean;
};

/** Accordion key for the Ask transcript: archived turn id, live turn, or all collapsed. */
export type AskThreadExpandedTurnKey = string | "live" | null;
