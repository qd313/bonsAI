/**
 * Title: Pull models — reporting footer state to an embedding parent
 *
 * Purpose: When this screen is embedded inside another modal (the AI models hub) rather than
 * drawing its own footer, reports what that footer should say and do every time the queue or the
 * pull-busy flag changes.
 *
 * Used for: PullModelsModal.tsx's embedded mode, read by OllamaModelsHubModal's own footer.
 *
 * Solves: keeps this one small broadcast next to nothing else, since it exists purely to hand a
 * value up to a parent that draws real Steam UI this screen cannot reach directly.
 *
 * Does not: run anything when the screen draws its own footer (embedded is false) — the effect
 * checks that itself and no-ops.
 *
 * Caution: Lifted out of PullModelsModal.tsx with the order of its own hooks unchanged, because
 * React only tolerates a fixed hook order. It is called from exactly the position the block used
 * to occupy, right after the render helpers and right before the "Filters · N on" summary. Keep it
 * there.
 */
import { useEffect } from "react";
import type { PullModelsFooterState } from "../components/PullModelsModal.types";

export type UsePullModelEmbeddedFooterStateArgs = {
  embedded: boolean;
  onFooterStateChange?: (state: PullModelsFooterState) => void;
  strOKButtonText: string;
  selectedTags: Set<string>;
  pullBusy: boolean;
  onPullSelected: () => void | Promise<void>;
};

export function usePullModelEmbeddedFooterState(a: UsePullModelEmbeddedFooterStateArgs): void {
  const { embedded, onFooterStateChange, strOKButtonText, selectedTags, pullBusy, onPullSelected } = a;

  useEffect(() => {
    if (!embedded || !onFooterStateChange) return;
    onFooterStateChange({
      okText: strOKButtonText,
      onOk: () => {
        if (selectedTags.size === 0 || pullBusy) return;
        void onPullSelected();
      },
      okDisabled: selectedTags.size === 0 || pullBusy,
      hasQueuedPull: selectedTags.size > 0,
    });
  }, [embedded, onFooterStateChange, strOKButtonText, selectedTags.size, pullBusy, onPullSelected]);
}
