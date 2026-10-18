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
 * The call also carries the PC address the screen last saved, so the back end can keep the removed
 * model's place in the try order when that PC still has it.
 *
 * When the box closes with Cancel or B the ring goes back to the same row's Remove control
 * (pullModelsRemoveReturn.ts); the plugin's other boxes get that from the shell, but this row is inside a popup.
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
import { showModal } from "@decky/ui";
import { toaster } from "@decky/api";
import { TwoButtonConfirmModal } from "../../../shared/TwoButtonConfirmModal";
import { formatSizeGb } from "../pullModelCatalog";
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS, formatDeckyRpcError } from "../../../shared/deckyCall";
import { clearRemoveReturn, rememberRemoveReturn, restoreRemoveReturn } from "./pullModelsRemoveReturn";
import { loadSavedIp } from "../../plugin-shell/pluginStorage";
import { textPx } from "../../../styles/textPx";

export type UsePullModelDeleteConfirmArgs = {
  activeRoutingTag: string | null;
  onBeforeNestedDeckyModal?: () => void;
  completeNestedModalClose: (close: () => void) => void;
  refreshInstalledAndMeta: () => Promise<void>;
  setSelectedTags: Dispatch<SetStateAction<Set<string>>>;
  setDeleteBusyTag: Dispatch<SetStateAction<string | null>>;
  /** Puts the ring on a row's Remove control (the screen's own row move). Without it the ring is not handed back. */
  focusRemoveControl?: (el: HTMLElement) => void;
  /** Brings the ring back into the list first when it strayed outside (Steam's transfer). */
  enterList?: () => boolean;
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
    focusRemoveControl,
    enterList,
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
      rememberRemoveReturn(tag);
      onBeforeNestedDeckyModal?.();
      const handle = showModal(
        <TwoButtonConfirmModal
          title={`Remove ${tag} from the Deck?`}
          body={
            <div className="bonsai-prose" style={{ fontSize: textPx(12), color: "#9fb7d5", lineHeight: 1.45 }}>
              This will free about {formatSizeGb(sizeGb)} by running <code>ollama rm {tag}</code>. Other models that
              depend on this tag will fall back to the next entry in the Ask-mode chain.
            </div>
          }
          /*
           * Two buttons, the action on the left and Cancel on the right where the ring starts, so an A pressed by habit removes
           * nothing (this box once opened with the ring on "Remove model",
           * plan76-P76-NOMIC-REMOVE-HINT.json; then it had Not now / Remove model / Cancel). B is Cancel.
           */
          actionLabel="Remove model"
          onCancel={() => {
            completeNestedModalClose(() => handle.Close());
            if (focusRemoveControl) restoreRemoveReturn(focusRemoveControl, enterList);
            else clearRemoveReturn();
          }}
          onAction={() => {
            // The row is about to go, so there is no control to hand the ring back to.
            clearRemoveReturn();
            completeNestedModalClose(() => handle.Close());
            void (async () => {
              setDeleteBusyTag(tag);
              try {
                // The PC address this Deck last used travels with the call: the saved try order is one
                // list, so a name that PC still has must stay in it (the back end asks that PC).
                const res = await callDeckyWithTimeout<[string, string], { ok?: boolean; error?: string; removed?: string }>(
                  "delete_ollama_model",
                  [tag, loadSavedIp().trim()],
                  DECKY_RPC_TIMEOUT_MS
                );
                if (res.ok) {
                  toaster.toast({ title: "Model removed", body: tag, duration: 4000 });
                  setSelectedTags((prev) => {
                    const next = new Set(prev);
                    next.delete(tag);
                    return next;
                  });
                  await refreshInstalledAndMeta();
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
        />
      );
    },
    [activeRoutingTag, refreshInstalledAndMeta, completeNestedModalClose, onBeforeNestedDeckyModal, focusRemoveControl, enterList]
  );

  return { confirmDelete };
}
