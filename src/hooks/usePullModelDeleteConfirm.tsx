/**
 * Title: Pull models — the remove-model prompt
 *
 * Purpose: Owns the confirm dialog PullModelsModal shows before removing an installed model, and
 * the RPC call and busy-state bookkeeping that follow a yes.
 *
 * Used for: PullModelsModal.tsx's per-row Del button, for both a catalog row and an "other
 * installed" row.
 *
 * Solves: keeps the "are you sure" wording, the refusal toasts (in use, a pull is already running,
 * any other failure) and the follow-up refresh together, since they only ever run as one sequence.
 *
 * Does not: decide whether the Del button itself is disabled — the screen still checks
 * activeRoutingTag and its own deleteBusyTag before rendering that button as clickable.
 *
 * Caution: Lifted out of PullModelsModal.tsx with the order of its own hooks unchanged, because
 * React only tolerates a fixed hook order. It is called from exactly the position the block used
 * to occupy, right after "Use for Ask" and right before the "Pull selected" submit handler. Keep
 * it there.
 */
import { useCallback, type Dispatch, type SetStateAction } from "react";
import { ConfirmModal, showModal } from "@decky/ui";
import { toaster } from "@decky/api";
import { formatSizeGb } from "../data/pullModelCatalog";
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS, formatDeckyRpcError } from "../utils/deckyCall";

export type UsePullModelDeleteConfirmArgs = {
  activeRoutingTag: string | null;
  onBeforeNestedDeckyModal?: () => void;
  completeNestedModalClose: (close: () => void) => void;
  refreshInstalledAndMeta: (forceCatalog?: boolean) => Promise<void>;
  setSelectedTags: Dispatch<SetStateAction<Set<string>>>;
  setDeleteBusyTag: Dispatch<SetStateAction<string | null>>;
};

export type PullModelDeleteConfirm = {
  confirmDelete: (tag: string, sizeGb: number) => void;
};

/** Own the remove-model dialog and the delete RPC's follow-up. */
export function usePullModelDeleteConfirm(a: UsePullModelDeleteConfirmArgs): PullModelDeleteConfirm {
  const {
    activeRoutingTag,
    onBeforeNestedDeckyModal,
    completeNestedModalClose,
    refreshInstalledAndMeta,
    setSelectedTags,
    setDeleteBusyTag,
  } = a;

  const confirmDelete = useCallback(
    (tag: string, sizeGb: number) => {
      if (activeRoutingTag && activeRoutingTag === tag) {
        toaster.toast({
          title: "Model in use",
          body: "Switch Ask mode or run a different model before removing this one.",
          duration: 5000,
        });
        return;
      }
      onBeforeNestedDeckyModal?.();
      const handle = showModal(
        <ConfirmModal
          strTitle={`Remove ${tag} from the Deck?`}
          strDescription={
            <div className="bonsai-prose" style={{ fontSize: 12, color: "#9fb7d5", lineHeight: 1.45 }}>
              This will free about {formatSizeGb(sizeGb)} by running <code>ollama rm {tag}</code>. Other models that
              depend on this tag will fall back to the next entry in the Ask-mode chain.
            </div>
          }
          strOKButtonText="Remove model"
          strCancelButtonText="Cancel"
          onOK={() => {
            completeNestedModalClose(() => handle.Close());
            void (async () => {
              setDeleteBusyTag(tag);
              try {
                const res = await callDeckyWithTimeout<[string], { ok?: boolean; error?: string; removed?: string }>(
                  "delete_ollama_model",
                  [tag],
                  DECKY_RPC_TIMEOUT_MS
                );
                if (res.ok) {
                  toaster.toast({ title: "Model removed", body: tag, duration: 4000 });
                  setSelectedTags((prev) => {
                    const next = new Set(prev);
                    next.delete(tag);
                    return next;
                  });
                  await refreshInstalledAndMeta(false);
                } else if (res.error === "in_use") {
                  toaster.toast({
                    title: "Model in use",
                    body: "Switch Ask mode first to remove this model.",
                    duration: 5000,
                  });
                } else if (res.error === "busy") {
                  toaster.toast({
                    title: "Pull in progress",
                    body: "Wait for the current pull to finish before deleting.",
                    duration: 5000,
                  });
                } else {
                  toaster.toast({
                    title: "Delete failed",
                    body: res.error || "Unknown error",
                    duration: 5000,
                  });
                }
              } catch (e) {
                toaster.toast({ title: "Delete failed", body: formatDeckyRpcError(e), duration: 5000 });
              } finally {
                setDeleteBusyTag(null);
              }
            })();
          }}
          onCancel={() => completeNestedModalClose(() => handle.Close())}
        />
      );
    },
    [activeRoutingTag, refreshInstalledAndMeta, completeNestedModalClose, onBeforeNestedDeckyModal]
  );

  return { confirmDelete };
}
