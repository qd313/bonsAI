/**
 * Title: Pull models — the "enable Tier 2" prompt
 *
 * Purpose: Owns the confirm dialog PullModelsModal shows before letting an open-weight model
 * through while the licence policy is still Tier 1 (open-source only), plus the small helper both
 * that dialog and the screen's other confirm dialogs use to close themselves.
 *
 * Used for: PullModelsModal.tsx, called once for a single row's queue toggle and again for the
 * batched "Pull selected" confirm when the queue holds an open-weight tag.
 *
 * Solves: keeps the Tier 2 disclosure text and the "already confirmed this tag" bookkeeping in one
 * place, so both call sites show the same wording and never ask about the same tag twice.
 *
 * Does not: decide whether a tag needs the prompt on its own — the caller runs its own checks and
 * only reaches for this when a Tier 1 screen is about to let an open-weight tag through.
 *
 * Caution: Lifted out of PullModelsModal.tsx with the order of its own hooks unchanged, because
 * React only tolerates a fixed hook order. It is called from exactly the position the block used
 * to occupy, right after the "Suggested" recommendations and right before the queue-toggle and
 * delete-confirm hooks that call `completeNestedModalClose`. Keep it there.
 */
import { useCallback, type RefObject } from "react";
import { showModal } from "@decky/ui";
import type { ModelPolicyTierId } from "../data/modelPolicy";
import type { PullModelEntry } from "../data/pullModelCatalog";
import { CancelFirstConfirmModal } from "../components/CancelFirstConfirmModal";
import { textPx } from "../styles/sections/textPx";

export type UsePullModelTier2ConfirmArgs = {
  modelPolicyTier: ModelPolicyTierId;
  onApplyTier2Policy?: () => void | Promise<void>;
  onBeforeNestedDeckyModal?: () => void;
  onCompleteNestedDeckyModalClose?: (close: () => void) => void;
  /** Tags a person has already said yes to this open — shared with the "Pull selected" batch
   *  confirm, which lives outside this hook and reads/writes the same ref directly. */
  openWeightTierConfirmedRef: RefObject<Set<string>>;
};

export type PullModelTier2Confirm = {
  /** Runs `close`, routed through the nested-modal focus handoff if the screen supplied one. */
  completeNestedModalClose: (close: () => void) => void;
  /** Shows the Tier 2 prompt for one entry, or runs `onConfirmed` straight away if it does not
   *  need asking (already Tier 2+, not open-weight, or this tag was confirmed earlier). */
  confirmOpenWeightTierIfNeeded: (entry: PullModelEntry, onConfirmed: () => void) => void;
};

/**
 * Own the Tier 2 disclosure dialog and the shared nested-modal close helper. Every hook below
 * must keep its position — React matches hooks by the order they run in.
 */
export function usePullModelTier2Confirm(a: UsePullModelTier2ConfirmArgs): PullModelTier2Confirm {
  const {
    modelPolicyTier,
    onApplyTier2Policy,
    onBeforeNestedDeckyModal,
    onCompleteNestedDeckyModalClose,
    openWeightTierConfirmedRef,
  } = a;

  const completeNestedModalClose = useCallback(
    (close: () => void) => {
      if (onCompleteNestedDeckyModalClose) {
        onCompleteNestedDeckyModalClose(close);
      } else {
        close();
      }
    },
    [onCompleteNestedDeckyModalClose]
  );

  const confirmOpenWeightTierIfNeeded = useCallback(
    (entry: PullModelEntry, onConfirmed: () => void) => {
      if (
        modelPolicyTier !== "open_source_only" ||
        entry.licenseClass !== "open_weight" ||
        openWeightTierConfirmedRef.current.has(entry.tag)
      ) {
        onConfirmed();
        return;
      }
      onBeforeNestedDeckyModal?.();
      const handle = showModal(
        <CancelFirstConfirmModal
          title="Enable Tier 2 for this model?"
          body={
            <div className="bonsai-prose" style={{ fontSize: textPx(12), color: "#9fb7d5", lineHeight: 1.45 }}>
              <div style={{ marginBottom: 8 }}>
                <span style={{ color: "#9ce7ff" }}>{entry.tag}</span> is open-weight, so{" "}
                <strong>Tier 1 (open-source only)</strong> will not use it for Ask. Enable <strong>Tier 2</strong> to allow
                it. Its licence may limit use or sharing.
              </div>
              <div style={{ color: "#c5d4e3" }}>Change this later in Ollama → AI models → Licence.</div>
            </div>
          }
          /*
           * Two buttons, Cancel first where Steam puts the ring, so an A pressed by habit changes
           * nothing, the sister box in usePullModelSubmitSelected.tsx (this box once opened with the ring
           * on the action, found in the code, plan 76 lane 2; then it had Not now / Enable Tier 2 and
           * queue / Cancel). B is Cancel.
           */
          actionLabel="Enable Tier 2 and queue"
          onCancel={() => completeNestedModalClose(() => handle.Close())}
          onAction={() => {
            openWeightTierConfirmedRef.current.add(entry.tag);
            void (async () => {
              await onApplyTier2Policy?.();
              onConfirmed();
              completeNestedModalClose(() => handle.Close());
            })();
          }}
        />
      );
    },
    [modelPolicyTier, onApplyTier2Policy, completeNestedModalClose, onBeforeNestedDeckyModal]
  );

  return { completeNestedModalClose, confirmOpenWeightTierIfNeeded };
}
