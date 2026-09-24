/**
 * Title: Pull models — "Use for Ask"
 *
 * Purpose: Owns moving a tag to the front of the saved try-order so Ask uses it next, for both the
 * text order and, when the catalog says the tag is vision-capable, the vision order too.
 *
 * Used for: PullModelsModal.tsx's star/checkmark on an already-installed row.
 *
 * Solves: reuses the existing load_settings/save_settings RPCs directly rather than adding a new
 * one — save_settings merges a partial payload into the settings already on disk, so only the
 * changed order(s) need to be sent, and this keeps that request and its busy/toast handling in one
 * place.
 *
 * Does not: change which order Ask actually reads first at answer time — that is
 * resolve_routing_order() on the back end. This only edits the saved order.
 *
 * Caution: Lifted out of PullModelsModal.tsx with the order of its own hooks unchanged, because
 * React only tolerates a fixed hook order. It is called from exactly the position the block used
 * to occupy, right after the large-model/queue-toggle hook and right before the remove-model
 * dialog hook. Keep it there.
 */
import { useCallback, type Dispatch, type SetStateAction } from "react";
import { toaster } from "@decky/api";
import type { PullModelEntry } from "../data/pullModelCatalog";
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS, formatDeckyRpcError } from "../utils/deckyCall";
import type { PullModelsRoutingOrderSettings } from "../components/PullModelsModal.types";

export type UsePullModelPinForAskArgs = {
  pinBusyTag: string | null;
  setPinBusyTag: Dispatch<SetStateAction<string | null>>;
  setPinnedAskTag: Dispatch<SetStateAction<string | null>>;
};

export type PullModelPinForAsk = {
  pinModelForAsk: (entry: PullModelEntry | null, tag: string) => Promise<void>;
};

/**
 * "Use for Ask" — moves this tag to the front of the saved text try-order (and the vision one
 * too, for a tag the catalog already knows is vision-capable), the same field
 * ModelRoutingOrderModal reorders and resolve_routing_order() reads first. Reuses the existing
 * `load_settings` / `save_settings` RPCs directly rather than adding a new one — `save_settings`
 * merges a partial payload into the settings already on disk (main.py:784-799), so only the
 * changed order(s) need to be sent.
 */
export function usePullModelPinForAsk(a: UsePullModelPinForAskArgs): PullModelPinForAsk {
  const { pinBusyTag, setPinBusyTag, setPinnedAskTag } = a;

  const pinModelForAsk = useCallback(
    async (entry: PullModelEntry | null, tag: string) => {
      if (pinBusyTag) return;
      setPinBusyTag(tag);
      try {
        const current = await callDeckyWithTimeout<[], PullModelsRoutingOrderSettings>(
          "load_settings",
          [],
          DECKY_RPC_TIMEOUT_MS
        );
        const textOrder = Array.isArray(current.text_model_routing_order) ? current.text_model_routing_order : [];
        const patch: PullModelsRoutingOrderSettings = {
          text_model_routing_order: [tag, ...textOrder.filter((t) => t !== tag)],
        };
        if (entry?.tags.includes("vision")) {
          const visionOrder = Array.isArray(current.vision_model_routing_order)
            ? current.vision_model_routing_order
            : [];
          patch.vision_model_routing_order = [tag, ...visionOrder.filter((t) => t !== tag)];
        }
        await callDeckyWithTimeout<[PullModelsRoutingOrderSettings], unknown>(
          "save_settings",
          [patch],
          DECKY_RPC_TIMEOUT_MS
        );
        setPinnedAskTag(tag);
        toaster.toast({ title: "Now used for Ask", body: tag, duration: 3000 });
      } catch (e) {
        toaster.toast({ title: "Could not pin model", body: formatDeckyRpcError(e), duration: 4000 });
      } finally {
        setPinBusyTag(null);
      }
    },
    [pinBusyTag]
  );

  return { pinModelForAsk };
}
