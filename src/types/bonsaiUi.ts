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

export type OllamaContextUi =
  | {
      app_id: string;
      app_context: "active" | "none";
      /** The running game's name, so a name-only game can open its spoiler box while streaming. */
      app_name?: string;
      /** The backend's own guess at the named boss/thing, published before the answer completes. */
      asked_entity?: string;
    }
  | null;

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
 * What a model that can think wrote to itself before it wrote the answer, kept with the turn.
 *
 * `text` is the whole thing the computer side kept, capped, and it may open with a line saying the
 * start was cut to fit — that line is written by the computer side and is just text here.
 * `seconds` is how long the thinking took, and can be missing on a turn saved by an older build.
 * `tokens` is an estimate, shown on the Show details chip only, never on the fold row.
 */
export type TurnReasoning = {
  text: string;
  seconds: number | null;
  tokens: number;
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
  /**
   * The game's display name for the same turn, alongside `appId` — needed for a title reachable
   * only by name, an emulator shortcut with no Steam AppID (plan 54 gap 1). Optional for the same
   * reason `appId` is: older session-survival snapshots and turns saved before this field existed
   * still parse.
   */
  appName?: string;
  /**
   * The thing the backend worked out this question named — a card title such as "Wheatley" or
   * "Dreadnought Twins" (plan 54 gap 2). Unlike `spoilerConsentEffective`, this is persisted: it
   * is a fact about the question, not a live decision, so a reopened chat needs it too.
   */
  askedEntity?: string;
  /** True when the user consented to spoilers for this turn (unwrap all fences in history). */
  spoilerConsentEffective?: boolean;
  /**
   * What the model thought before it wrote this answer, when it thought at all. Missing on every
   * turn saved before thinking was kept, on every turn answered with thinking off, and on any
   * model that cannot think — so "missing" is the ordinary case, not a fault, and a turn without
   * it draws exactly as it always did.
   */
  reasoning?: TurnReasoning;
};

/** Accordion key for the Ask transcript: archived turn id, live turn, or all collapsed. */
export type AskThreadExpandedTurnKey = string | "live" | null;
