import type { AskModeId } from "../data/askMode";

/** Whether to hide live Ollama token deltas for Strategy asks until the user opts into spoilers (Main-tab toggle). */
export function shouldSuppressStrategyTokenStreamPreview(gate: {
  askMode: AskModeId;
  strategySpoilerMaskingEnabled: boolean;
  strategySpoilerConsentForNextAsk: boolean;
}): boolean {
  return (
    gate.askMode === "strategy" &&
    gate.strategySpoilerMaskingEnabled &&
    !gate.strategySpoilerConsentForNextAsk
  );
}
