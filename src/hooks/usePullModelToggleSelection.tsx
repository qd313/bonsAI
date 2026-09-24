/**
 * Title: Pull models — toggling a model into the pull queue
 *
 * Purpose: Owns pressing a table row's star/checkmark to queue or unqueue an uninstalled model,
 * including the "this one is large" confirm dialog that a "stretch" model shows the first time it
 * is picked in this session.
 *
 * Used for: PullModelsModal.tsx's own table rows and the Suggested chips in the Filters panel —
 * both call the same toggle.
 *
 * Solves: keeps the large-model warning and the queue add/remove bookkeeping (with its toasts)
 * together, since the warning only ever gates that one action.
 *
 * Does not: decide whether a tag needs the Tier 2 disclosure too — it hands the actual queueing to
 * confirmOpenWeightTierIfNeeded (from usePullModelTier2Confirm) either way, after its own
 * large-model check passes.
 *
 * Caution: Lifted out of PullModelsModal.tsx with the order of its own hooks unchanged, because
 * React only tolerates a fixed hook order. It is called from exactly the position the block used
 * to occupy, right after usePullModelTier2Confirm and right before the "Use for Ask" handler. Keep
 * it there.
 */
import { useCallback, type Dispatch, type RefObject, type SetStateAction } from "react";
import { ConfirmModal, showModal } from "@decky/ui";
import { toaster } from "@decky/api";
import { formatSizeGb, type PullModelEntry } from "../data/pullModelCatalog";
import { isTagInstalled, resolveRowSizeGb } from "../utils/pullModelFilters";

export type UsePullModelToggleSelectionArgs = {
  installedTags: Set<string>;
  liveSizeGbByTag: Record<string, number>;
  completeNestedModalClose: (close: () => void) => void;
  onBeforeNestedDeckyModal?: () => void;
  confirmOpenWeightTierIfNeeded: (entry: PullModelEntry, onConfirmed: () => void) => void;
  setSelectedTags: Dispatch<SetStateAction<Set<string>>>;
  /** Tags already warned about as large this session — set once the dialog is accepted. */
  stretchConfirmedRef: RefObject<Set<string>>;
};

export type PullModelToggleSelection = {
  toggleSelected: (
    entry: PullModelEntry,
    ev?: { stopPropagation?: () => void; preventDefault?: () => void }
  ) => void;
};

/** Own the queue toggle and the large-model warning it shows the first time. */
export function usePullModelToggleSelection(a: UsePullModelToggleSelectionArgs): PullModelToggleSelection {
  const {
    installedTags,
    liveSizeGbByTag,
    completeNestedModalClose,
    onBeforeNestedDeckyModal,
    confirmOpenWeightTierIfNeeded,
    setSelectedTags,
    stretchConfirmedRef,
  } = a;

  const toggleSelected = useCallback(
    (entry: PullModelEntry, ev?: { stopPropagation?: () => void; preventDefault?: () => void }) => {
      ev?.stopPropagation?.();
      // Decky's Button renders a plain <button> with no `type`, which defaults to "submit", and
      // this screen always sits inside Steam's own ConfirmModal, which renders a real <form>. An
      // un-prevented click here submits that form and takes the modal's own OK/Done/Pull-selected
      // path instead of just toggling this one row -- the same mechanism already found and fixed
      // once in this codebase (ModelRoutingOrderModal.tsx, PICKER-REORDER-02, 2026-09-04), and the
      // likely cause of the very first model ticked in a fresh picker downloading immediately with
      // no Pull selected press (one sighting 2026-09-19, docs/test-evidence/plan61-PULL-MISSING-
      // NAME-01.json).
      ev?.preventDefault?.();
      if (isTagInstalled(entry.tag, installedTags)) {
        toaster.toast({
          title: "Already installed",
          body: `${entry.tag} is on this Deck. Use Del to remove it.`,
          duration: 3500,
        });
        return;
      }
      const queueSelection = () => {
        setSelectedTags((prev) => {
          const next = new Set(prev);
          if (next.has(entry.tag)) {
            next.delete(entry.tag);
            toaster.toast({
              title: "Removed from pull queue",
              body: entry.tag,
              duration: 2200,
            });
          } else {
            next.add(entry.tag);
            toaster.toast({
              title: "Queued to pull",
              body: entry.tag,
              duration: 2200,
            });
          }
          return next;
        });
      };
      if (entry.group === "stretch" && !stretchConfirmedRef.current.has(entry.tag)) {
        onBeforeNestedDeckyModal?.();
        const handle = showModal(
          <ConfirmModal
            strTitle="Large model — continue?"
            strDescription={
              <div className="bonsai-prose" style={{ fontSize: 12, color: "#9fb7d5", lineHeight: 1.45 }}>
                {entry.tag} is about {formatSizeGb(resolveRowSizeGb(entry, liveSizeGbByTag))} on disk and may run
                slowly on Deck CPU/RAM. Pull only if you have room and accept longer waits.
              </div>
            }
            strOKButtonText="Pull anyway"
            strCancelButtonText="Cancel"
            onOK={() => {
              stretchConfirmedRef.current.add(entry.tag);
              completeNestedModalClose(() => handle.Close());
              confirmOpenWeightTierIfNeeded(entry, queueSelection);
            }}
            onCancel={() => completeNestedModalClose(() => handle.Close())}
          />
        );
        return;
      }
      confirmOpenWeightTierIfNeeded(entry, queueSelection);
    },
    [
      installedTags,
      liveSizeGbByTag,
      completeNestedModalClose,
      onBeforeNestedDeckyModal,
      confirmOpenWeightTierIfNeeded,
    ]
  );

  return { toggleSelected };
}
