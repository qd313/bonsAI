/**
 * Title: Pull models — typing a model name by hand
 *
 * Purpose: Owns pulling a tag typed into "Type a name" rather than picked from the table.
 *
 * Used for: PullModelsModal.tsx's custom-tag row (the Pull button next to the typed field).
 *
 * Solves: a typed tag has no PullModelEntry (size, licence tier, blurb) for the queue's own
 * confirm dialogs or footer total, so this is a separate one-off RPC call rather than folding into
 * selectedTags + "Pull selected". pull_ollama_models already validates the tag against the Ollama
 * registry before starting anything and returns an actionable reason when it is not published
 * there — this just surfaces that reason in a toast instead of leaving a typo or a made-up name to
 * fail silently.
 *
 * Does not: check whether the typed text looks like a real tag — isPlausibleOllamaPullTag does
 * that, and the caller already gates the Pull button on it before this ever runs.
 *
 * Caution: Lifted out of PullModelsModal.tsx with the order of its own hooks unchanged, because
 * React only tolerates a fixed hook order. It is called from exactly the position the block used
 * to occupy, right after the "Pull selected" submit hook and right before the render helpers. Keep
 * it there.
 */
import { useCallback, type Dispatch, type SetStateAction } from "react";
import { toaster } from "@decky/api";
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS, formatDeckyRpcError } from "../utils/deckyCall";
import { isPlausibleOllamaPullTag } from "../utils/mergePullModelCatalog";

export type UsePullModelCustomTagPullArgs = {
  customTagInput: string;
  customPullBusy: boolean;
  pullBusy: boolean;
  onPullAccepted: () => void;
  /** Moves the ring back to the chip once the field closes — see focusAndReveal in the screen. */
  focusCustomTagChip: () => boolean;
  setCustomPullBusy: Dispatch<SetStateAction<boolean>>;
  setCustomTagInput: Dispatch<SetStateAction<string>>;
  setCustomTagEntryOpen: Dispatch<SetStateAction<boolean>>;
  /** Runs `fn` on the next animation frame, guarded against a since-unmounted screen. */
  scheduleFocusFrame: (fn: () => void) => void;
};

export type PullModelCustomTagPull = {
  onPullCustomTag: () => Promise<void>;
};

/**
 * Type-any-tag pull. Deliberately a separate one-off RPC call rather than folding into
 * `selectedTags` + "Pull selected" — that queue assumes every tag resolves to a `PullModelEntry`
 * (size, license tier, blurb) for the confirm dialogs and the total-size footer, which a typed
 * tag does not have. `pull_ollama_models` already validates the tag against the Ollama registry
 * before starting anything (`_start_custom_ollama_pull` -> `partition_pull_tags_by_registry`,
 * main.py:1799-1819) and returns an actionable `reason` when it is not published there — this
 * just surfaces that reason in a toast instead of leaving a typo or a made-up name to fail silently.
 */
export function usePullModelCustomTagPull(a: UsePullModelCustomTagPullArgs): PullModelCustomTagPull {
  const {
    customTagInput,
    customPullBusy,
    pullBusy,
    onPullAccepted,
    focusCustomTagChip,
    setCustomPullBusy,
    setCustomTagInput,
    setCustomTagEntryOpen,
    scheduleFocusFrame,
  } = a;

  const onPullCustomTag = useCallback(async () => {
    const tag = customTagInput.trim();
    if (!tag || !isPlausibleOllamaPullTag(tag) || customPullBusy || pullBusy) return;
    setCustomPullBusy(true);
    try {
      const res = await callDeckyWithTimeout<[string[]], { accepted?: boolean; reason?: string }>(
        "pull_ollama_models",
        [[tag]],
        DECKY_RPC_TIMEOUT_MS
      );
      if (res.accepted) {
        toaster.toast({
          title: "Pull started",
          body: `${tag} — watch progress in Settings.`,
          duration: 5000,
        });
        setCustomTagInput("");
        setCustomTagEntryOpen(false);
        scheduleFocusFrame(() => focusCustomTagChip());
        onPullAccepted();
      } else {
        toaster.toast({
          title: "Pull not started",
          body: res.reason || "Setup busy or local Ollama is off.",
          duration: 6000,
        });
      }
    } catch (e) {
      toaster.toast({ title: "Pull failed", body: formatDeckyRpcError(e), duration: 5000 });
    } finally {
      setCustomPullBusy(false);
    }
  }, [customTagInput, customPullBusy, pullBusy, onPullAccepted, focusCustomTagChip]);

  return { onPullCustomTag };
}
