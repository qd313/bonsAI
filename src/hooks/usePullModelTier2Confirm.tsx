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
import { ConfirmModal, showModal } from "@decky/ui";
import type { ModelPolicyTierId } from "../data/modelPolicy";
import type { PullModelEntry } from "../data/pullModelCatalog";

/**
 * What the "Enable Tier 2" boxes say about open-weight models, in plain words about the model(s)
 * about to be pulled. Both boxes used to borrow the Ask-answer footnote ("This reply used an 'open
 * model'..."), which talks about a reply that does not exist when a model is only being pulled.
 */
export const TIER2_PULL_NOTE =
  "Open-weight models publish their weights for local use, but their training code, data or licence can differ from Tier 1's open-source rules, including limits on use or sharing.";

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
        <ConfirmModal
          strTitle="Enable Tier 2 for this model?"
          strDescription={
            <div className="bonsai-prose" style={{ fontSize: 12, color: "#9fb7d5", lineHeight: 1.45 }}>
              <div style={{ marginBottom: 8 }}>
                <span style={{ color: "#9ce7ff" }}>{entry.tag}</span> is an open-weight model. With{" "}
                <strong>Tier 1 (open-source only)</strong>, bonsAI will not route Ask to it after download.
              </div>
              <div style={{ marginBottom: 8, color: "#c5d4e3" }}>
                Enable <strong>Tier 2 (open-weight)</strong> so this tag is eligible for Ask fallbacks. {TIER2_PULL_NOTE}
              </div>
              <div>You can change this later under Ollama → Manage AI models → Policy.</div>
            </div>
          }
          /*
           * Steam opens a ConfirmModal with the ring on OK, so OK is the choice that changes
           * nothing and the action sits on the middle button -- the download notice's own shape
           * (downloadNotice.tsx), and the sister box in usePullModelSubmitSelected.tsx. This box
           * used to open with the ring on the action (found in the code, plan 76 lane 2).
           * B and Cancel also change nothing.
           */
          strOKButtonText="Not now"
          strMiddleButtonText="Enable Tier 2 and queue"
          strCancelButtonText="Cancel"
          onOK={() => completeNestedModalClose(() => handle.Close())}
          onMiddleButton={() => {
            openWeightTierConfirmedRef.current.add(entry.tag);
            void (async () => {
              await onApplyTier2Policy?.();
              onConfirmed();
              completeNestedModalClose(() => handle.Close());
            })();
          }}
          onCancel={() => completeNestedModalClose(() => handle.Close())}
        />
      );
    },
    [modelPolicyTier, onApplyTier2Policy, completeNestedModalClose, onBeforeNestedDeckyModal]
  );

  return { completeNestedModalClose, confirmOpenWeightTierIfNeeded };
}
