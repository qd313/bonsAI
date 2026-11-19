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
import { useCallback, useRef, type Dispatch, type SetStateAction } from "react";
import { toaster } from "@decky/api";
import type { PullModelEntry } from "../pullModelCatalog";
import { patchPendingSessionSettingsSnapshot } from "../../plugin-shell/bonsaiSessionSurvival";
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS, formatDeckyRpcError } from "../../../shared/deckyCall";
import type { PullModelsRoutingOrderSettings } from "./PullModelsModal.types";

export type UsePullModelPinForAskArgs = {
  /** The row whose star shows now (the one in the saved order's first place). */
  pinnedAskTag: string | null;
  /** The row of the latest press whose save is still out; the screen holds that row's star until it ends. */
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
 *
 * The star moves to the pressed row at the press. The saves run one after another (a press on another
 * row while one is out waits its turn, and the last press wins, since each save puts its own tag first
 * in the order it reads fresh). A save that fails puts the star back on the row of the last save that
 * worked, with the "Could not pin model" notice.
 */
export function usePullModelPinForAsk(a: UsePullModelPinForAskArgs): PullModelPinForAsk {
  const { pinnedAskTag, setPinBusyTag, setPinnedAskTag } = a;
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  /** Presses whose save has not ended yet. */
  const outRef = useRef(0);
  /** The row that held the star when nothing was out, then the row of each save that worked. */
  const lastSavedRef = useRef<string | null>(pinnedAskTag);

  const pinModelForAsk = useCallback(
    (entry: PullModelEntry | null, tag: string): Promise<void> => {
      if (outRef.current === 0) lastSavedRef.current = pinnedAskTag;
      outRef.current += 1;
      // At the press: the star is on this row and the row says a save is out.
      setPinnedAskTag(tag);
      setPinBusyTag(tag);
      const job = async () => {
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
          /*
           * This save goes straight to disk, so the plugin's own screen never hears of it. The note
           * taken before this screen opened still holds the OLD order, and Decky rebuilds the plugin
           * from that note when this screen closes, so the new order would not show (and the "edit
           * order" popup would start from the old list) until some later save. The other popups
           * patch the note after their save (useRoutingOrderModal.ts); this one was missed.
           */
          patchPendingSessionSettingsSnapshot({
            textModelRoutingOrder: patch.text_model_routing_order,
            ...(patch.vision_model_routing_order ? { visionModelRoutingOrder: patch.vision_model_routing_order } : {}),
          });
          lastSavedRef.current = tag;
          toaster.toast({ title: "Now used for Ask", body: tag, duration: 3000 });
        } catch (e) {
          // Back to the row of the last save that worked, unless a later press has already moved the star on.
          const back = lastSavedRef.current;
          setPinnedAskTag((cur) => (cur === tag ? back : cur));
          toaster.toast({ title: "Could not pin model", body: formatDeckyRpcError(e), duration: 4000 });
        } finally {
          outRef.current -= 1;
          if (outRef.current === 0) setPinBusyTag(null);
        }
      };
      queueRef.current = queueRef.current.then(job);
      return queueRef.current;
    },
    [pinnedAskTag]
  );

  return { pinModelForAsk };
}
