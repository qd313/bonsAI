/**
 * Title: Pull models — submitting the queue
 *
 * Purpose: Owns pressing "Pull selected": the registry check that drops any tag the Ollama
 * registry no longer publishes, the batched "enable Tier 2 before pulling" prompt for a queue that
 * holds an open-weight tag under Tier 1, and the RPC call itself.
 *
 * Used for: PullModelsModal.tsx's footer OK button (and the embedded AI models hub's own footer,
 * through onFooterStateChange).
 *
 * Solves: keeps the three-step sequence (check the registry, ask about Tier 2 if needed, pull) in
 * one place, since a mistake in the order would either pull a tag that no longer exists or pull an
 * open-weight tag Ask still cannot route to.
 *
 * Does not: decide which tags are queued — the caller's selectedTags is the source of truth; this
 * only reads it.
 *
 * Caution: Lifted out of PullModelsModal.tsx with the order of its own hooks unchanged, because
 * React only tolerates a fixed hook order. It is called from exactly the position the block used
 * to occupy, right after the remove-model dialog hook and right before the typed-tag pull hook.
 * Keep it there.
 */
import { useCallback, type Dispatch, type RefObject, type SetStateAction } from "react";
import { showModal } from "@decky/ui";
import { toaster } from "@decky/api";
import { TwoButtonConfirmModal } from "../../../shared/TwoButtonConfirmModal";
import { formatSizeGb, type PullModelEntry } from "../pullModelCatalog";
import type { ModelPolicyTierId } from "../modelPolicy";
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS, formatDeckyRpcError } from "../../../shared/deckyCall";
import { loadSavedIp } from "../../plugin-shell/pluginStorage";
import { findUnavailableRegistryTags } from "./pullModelFilters";
import type { CatalogMetadataResponse } from "./PullModelsModal.types";
import { confirmDownload } from "../../downloads/downloadNotice";
import { modelPullNotice } from "../../downloads/downloadSites";
import { textPx } from "../../../styles/textPx";

/** "about N GB" from the bundled catalog, or null when any of the models has no size there. */
function catalogSizeText(tags: readonly string[], catalog: readonly PullModelEntry[]): string | null {
  let total = 0;
  for (const tag of tags) {
    const gb = catalog.find((e) => e.tag === tag)?.sizeGb;
    if (typeof gb !== "number" || !(gb > 0)) return null;
    total += gb;
  }
  return `about ${formatSizeGb(total)}`;
}

export type UsePullModelSubmitSelectedArgs = {
  selectedTags: Set<string>;
  modelPolicyTier: ModelPolicyTierId;
  mergedCatalog: readonly PullModelEntry[];
  onApplyTier2Policy?: () => void | Promise<void>;
  completeNestedModalClose: (close: () => void) => void;
  onBeforeNestedDeckyModal?: () => void;
  onPullAccepted: () => void;
  setPullBusy: Dispatch<SetStateAction<boolean>>;
  /** Tags a person has already said yes to enabling Tier 2 for this session — shared with the
   *  per-row Tier 2 confirm, which lives outside this hook and reads/writes the same ref directly. */
  openWeightTierConfirmedRef: RefObject<Set<string>>;
};

export type PullModelSubmitSelected = {
  onPullSelected: () => Promise<void>;
};

/** Own the "Pull selected" submit: the registry check, the batched Tier 2 prompt, and the pull. */
export function usePullModelSubmitSelected(a: UsePullModelSubmitSelectedArgs): PullModelSubmitSelected {
  const {
    selectedTags,
    modelPolicyTier,
    mergedCatalog,
    onApplyTier2Policy,
    completeNestedModalClose,
    onBeforeNestedDeckyModal,
    onPullAccepted,
    setPullBusy,
    openWeightTierConfirmedRef,
  } = a;

  const onPullSelected = useCallback(async () => {
    if (selectedTags.size === 0) return;

    const runPull = async () => {
      // Before the registry check below, which already reaches registry.ollama.ai.
      const queued = [...selectedTags];
      if (!(await confirmDownload([modelPullNotice(queued, catalogSizeText(queued, mergedCatalog))]))) return;
      setPullBusy(true);
      try {
        const tags = [...selectedTags];

        // Check the registry for the exact names about to be sent, so a bad one (a typo in a
        // catalog update, most likely -- the checkboxes only ever queue real catalog tags) is
        // caught and named here rather than dropped silently by the back end. A failed check
        // must not block a pull that would otherwise work; it just skips the warning.
        let unavailable: string[] = [];
        try {
          const meta = await callDeckyWithTimeout<[string[], string], CatalogMetadataResponse>(
            "fetch_ollama_catalog_metadata",
            [tags, loadSavedIp().trim()],
            DECKY_RPC_TIMEOUT_MS
          );
          unavailable = findUnavailableRegistryTags(tags, meta);
        } catch {
          unavailable = [];
        }
        const toPull = unavailable.length ? tags.filter((t) => !unavailable.includes(t)) : tags;

        if (toPull.length === 0) {
          toaster.toast({
            title: "Could not find",
            body: unavailable.join(", "),
            duration: 6000,
          });
          return;
        }

        const res = await callDeckyWithTimeout<[string[]], { accepted?: boolean; reason?: string }>(
          "pull_ollama_models",
          [toPull],
          DECKY_RPC_TIMEOUT_MS
        );
        if (res.accepted) {
          toaster.toast({
            title: "Pull started",
            body: unavailable.length
              ? `${toPull.length} model(s) — watch progress in Settings. Could not find: ${unavailable.join(", ")}`
              : `${tags.length} model(s) — watch progress in Settings.`,
            duration: unavailable.length ? 8000 : 5000,
          });
          onPullAccepted();
        } else {
          toaster.toast({
            title: "Pull not started",
            body: res.reason || "Setup busy or local Ollama is off.",
            duration: 5000,
          });
        }
      } catch (e) {
        toaster.toast({ title: "Pull failed", body: formatDeckyRpcError(e), duration: 5000 });
      } finally {
        setPullBusy(false);
      }
    };

    if (modelPolicyTier === "open_source_only") {
      const openWeightTags = [...selectedTags].filter((tag) => {
        const entry = mergedCatalog.find((e) => e.tag === tag);
        return entry?.licenseClass === "open_weight";
      });
      if (
        openWeightTags.length > 0 &&
        openWeightTags.some((tag) => !openWeightTierConfirmedRef.current.has(tag))
      ) {
        const tagList = openWeightTags.join(", ");
        onBeforeNestedDeckyModal?.();
        const handle = showModal(
          <TwoButtonConfirmModal
            title="Enable Tier 2 before pulling?"
            body={
              <div className="bonsai-prose" style={{ fontSize: textPx(12), color: "#9fb7d5", lineHeight: 1.45 }}>
                <div>
                  Your queue has open-weight models: <span style={{ color: "#9ce7ff" }}>{tagList}</span>.{" "}
                  <strong>Tier 1 (open-source licenses only)</strong> will not use them for Ask. Enable{" "}
                  <strong>Tier 2</strong> to allow them. Their licenses may limit use or sharing.
                </div>
              </div>
            }
            /*
             * Two buttons, Cancel first where Steam puts the ring, so an A pressed by habit changes
             * nothing (on the Deck, plan 72, this box once opened with the ring on the action; then it
             * had Not now / Enable Tier 2 and pull / Cancel). B is Cancel.
             */
            actionLabel="Enable Tier 2 and pull"
            onCancel={() => completeNestedModalClose(() => handle.Close())}
            onAction={() => {
              for (const tag of openWeightTags) {
                openWeightTierConfirmedRef.current.add(tag);
              }
              completeNestedModalClose(() => handle.Close());
              void (async () => {
                await onApplyTier2Policy?.();
                await runPull();
              })();
            }}
          />
        );
        return;
      }
    }

    await runPull();
  }, [
    onPullAccepted,
    selectedTags,
    modelPolicyTier,
    mergedCatalog,
    onApplyTier2Policy,
    completeNestedModalClose,
    onBeforeNestedDeckyModal,
  ]);

  return { onPullSelected };
}
