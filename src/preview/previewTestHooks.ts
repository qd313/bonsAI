/**
 * Title: Preview test hooks
 * Purpose: Expose window.__bonsaiTestHooks for Decky Plugin Studio automated preview scenarios.
 * Used for: scripts/run-preview-suite.mjs and tier QA when DECKY_PREVIEW is active.
 * Solves: Programmatic Ask/game/screenshot triggers without manual D-pad in CI preview.
 * Does not: Ship in production Deck builds — preview harness only.
 */
export type BonsaiPreviewTestHooks = {
  getState: () => Record<string, unknown>;
  setGame: (title: string, appId?: string) => void;
  triggerAsk: (text: string) => Promise<void>;
  attachScreenshot: (base64: string, name?: string) => void;
  getTransparencyJson: () => unknown;
  getSysfsWrites: () => Promise<unknown>;
  setTab: (tabId: string) => void;
  /** Clear disclaimer acceptance and reopen the first-run beta modal (preview QA). */
  resetDisclaimer: () => void;
  /**
   * Put a finished question and answer straight into the transcript, without asking a model.
   *
   * Scenarios that need a reply on screen used to call triggerAsk and sleep eight seconds for a
   * real model, which is slow and gives different text every run — so a stop count or a rectangle
   * could never be asserted. This restores a session snapshot, the same route the modal-survival
   * path already uses, so nothing new plumbs through the ask state.
   */
  seedFinishedTurn: (question: string, answer: string) => void;
  /**
   * What the newest reply's block looks like right now, for scenarios to assert against.
   *
   * Counts and rectangles only — no text — so a scenario can check that a control exists, is
   * inside the bubble it belongs to, and is not off the side of the 300px column.
   */
  getReplyLayoutJson: () => ReplyLayoutReport;
};

/** A rectangle as the page reports it, rounded so a sub-pixel wobble cannot fail a scenario. */
export type ReplyLayoutRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type ReplyLayoutReport = {
  /** How many D-pad stops the newest answer has. */
  answerStops: number;
  /** Rectangles, when the thing is on screen at all. */
  answerBubble: ReplyLayoutRect | null;
  questionBubble: ReplyLayoutRect | null;
  detailsDivider: ReplyLayoutRect | null;
  copyIcon: ReplyLayoutRect | null;
  retryIcon: ReplyLayoutRect | null;
  /** The old three-button row. Present until the corner-icon work lands, absent after. */
  utilityRow: ReplyLayoutRect | null;
  /** True when the details chips are showing. */
  detailsOpen: boolean;
};

export function isDeckyPreviewRuntime(): boolean {
  if (typeof window === "undefined") return false;
  if ((window as Window & { __DECKY_PREVIEW__?: boolean }).__DECKY_PREVIEW__) return true;
  try {
    const env = (import.meta as ImportMeta & { env?: { DECKY_PREVIEW?: boolean | string } }).env;
    return env?.DECKY_PREVIEW === true || env?.DECKY_PREVIEW === "true";
  } catch {
    return false;
  }
}

export function registerPreviewTestHooks(hooks: BonsaiPreviewTestHooks): void {
  if (!isDeckyPreviewRuntime()) return;
  (window as Window & { __bonsaiTestHooks?: BonsaiPreviewTestHooks }).__bonsaiTestHooks = hooks;
}
