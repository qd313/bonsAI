/**
 * Title: "Which model to try first" popup
 *
 * Purpose: Opens the popup where a person orders their installed AI models
 * from most to least preferred — one order for plain questions, another for
 * questions that include a picture. Before it opens, this checks that the
 * AI computer can actually be reached and asks it what is installed, so the
 * popup never offers a model that is not there.
 *
 * Used for: The "Change try order" buttons on the Ollama tab, one for text
 * questions and one for questions with an attached picture.
 *
 * Solves: Keeps checking the connection, listing installed models, and
 * saving the chosen order out of the main plugin screen's own code.
 *
 * Does not: Decide which model actually answers a given question — that
 * happens on the computer running the AI when a question is asked, using
 * whatever order was saved here.
 */
import { useCallback } from "react";
import { toaster } from "@decky/api";
import { showModal } from "@decky/ui";
import React from "react";

import { ModelRoutingOrderModal, type ModelRoutingOrderKind } from "../../components/ModelRoutingOrderModal";
import type { DeveloperConnectionStatus } from "../../components/DeveloperTab";
import { OLLAMA_LOCAL_ON_DECK_DEFAULT_PCIP, type BonsaiSettings } from "../../data/bonsaiSettingsSchema";
import type { ModelPolicyTierId } from "../../data/modelPolicy";
import type { PullModelEntry } from "../../data/pullModelCatalog";
import { patchPendingSessionSettingsSnapshot } from "../../utils/bonsaiSessionSurvival";
import { callDeckyWithTimeout, formatDeckyRpcError } from "../../utils/deckyCall";

/** Loopback probes can start systemd / `ollama serve`, so they get a much longer deadline. */
const CONNECTION_TEST_TIMEOUT_SECONDS = 10;
const LOOPBACK_PROBE_EXTRA_MS = 42000;
const REMOTE_PROBE_EXTRA_MS = 3000;

export type UseRoutingOrderModalArgs = {
  ollamaLocalOnDeck: boolean;
  ollamaIp: string;
  textModelRoutingOrder: string[];
  visionModelRoutingOrder: string[];
  setTextModelRoutingOrder: (order: string[]) => void;
  setVisionModelRoutingOrder: (order: string[]) => void;
  catalogByTag: Map<string, PullModelEntry>;
  modelPolicyTier: ModelPolicyTierId;
  modelPolicyNonFossUnlocked: boolean;
  modelAllowHighVramFallbacks: boolean;
  setLastConnectionStatus: (status: DeveloperConnectionStatus) => void;
  captureSessionBeforeModal: () => void;
  finalizeShowModalAndRestoreActiveTab: (close: () => void) => void;
  pauseDebouncedSettingsSave: () => Promise<void>;
  buildSettingsPayload: (patch: Partial<BonsaiSettings>) => Partial<BonsaiSettings>;
  hydrateFromSettings: (saved: BonsaiSettings) => void;
};

/**
 * In: the current settings and callbacks bundled together — which kind of
 * order (text or picture-aware), the saved orders, and every function
 * needed to save a new one and put the screen back the way it was.
 * Out: one function that opens the popup for a given kind ("text" or
 * "vision"). Nothing is returned until it is called.
 * Can go wrong: a connection test to a home computer over the network can
 * take much longer than one on the Deck itself, so the wait allowed before
 * giving up is deliberately longer whenever the target looks like a local
 * address. Saving the new order also has to write it into the
 * already-captured session snapshot by hand — Decky rebuilds the plugin's
 * screen when the popup closes, and that rebuild would otherwise restore
 * the OLD order over the one that was just saved.
 */
export function useRoutingOrderModal(a: UseRoutingOrderModalArgs) {
  return useCallback(
    async (kind: ModelRoutingOrderKind) => {
      const target = a.ollamaLocalOnDeck ? OLLAMA_LOCAL_ON_DECK_DEFAULT_PCIP : a.ollamaIp.trim();
      if (!target) {
        toaster.toast({
          title: "No Ollama host",
          body: a.ollamaLocalOnDeck
            ? "Enable Run AI on this Deck or set a PC address first."
            : "Enter a PC address on the Ollama tab first.",
          duration: 5000,
        });
        return;
      }

      const loopbackLikelyProbe =
        a.ollamaLocalOnDeck ||
        /^\s*127\.0\.0\.1\s*(:\s*\d+)?\s*$/i.test(target) ||
        /^\s*localhost\s*(:\s*\d+)?\s*$/i.test(target);
      const rpcDeadlineMs =
        CONNECTION_TEST_TIMEOUT_SECONDS * 1000 +
        (loopbackLikelyProbe ? LOOPBACK_PROBE_EXTRA_MS : REMOTE_PROBE_EXTRA_MS);

      let installed: string[] = [];
      try {
        const result = await callDeckyWithTimeout<[string, number], DeveloperConnectionStatus>(
          "test_ollama_connection",
          [target, CONNECTION_TEST_TIMEOUT_SECONDS],
          rpcDeadlineMs,
        );
        a.setLastConnectionStatus(result);
        if (result.reachable && Array.isArray(result.models)) {
          installed = result.models.filter(Boolean);
        }
      } catch (e: unknown) {
        toaster.toast({
          title: "Could not list models",
          body: formatDeckyRpcError(e),
          duration: 5000,
        });
        return;
      }

      if (installed.length === 0) {
        toaster.toast({
          title: "No installed models",
          body: "Pull a model on the Ollama tab (Browse models or Install options), then try again.",
          duration: 5000,
        });
        return;
      }

      a.captureSessionBeforeModal();
      const savedOrder = kind === "vision" ? a.visionModelRoutingOrder : a.textModelRoutingOrder;
      const handle = showModal(
        React.createElement(ModelRoutingOrderModal, {
          kind,
          installedTags: installed,
          catalogByTag: a.catalogByTag,
          modelPolicyTier: a.modelPolicyTier,
          modelPolicyNonFossUnlocked: a.modelPolicyNonFossUnlocked,
          modelAllowHighVramFallbacks: a.modelAllowHighVramFallbacks,
          savedOrder,
          onSave: async (order: string[]) => {
            if (kind === "vision") {
              a.setVisionModelRoutingOrder(order);
            } else {
              a.setTextModelRoutingOrder(order);
            }
            await a.pauseDebouncedSettingsSave();
            const patch =
              kind === "vision"
                ? { vision_model_routing_order: order }
                : { text_model_routing_order: order };
            const saved = await callDeckyWithTimeout<[Partial<BonsaiSettings>], BonsaiSettings>("save_settings", [
              a.buildSettingsPayload(patch),
            ]);
            a.hydrateFromSettings(saved);
            // The session snapshot captured before this modal opened still holds the OLD try order.
            // Decky remounts Content when the modal closes, and that restore re-hydrates settings
            // from the snapshot — over the save that just succeeded — after which the debounced save
            // writes the old order back to disk. Measured on the Deck 2026-09-06: the file held the
            // new order at 00:44:20.383 and the old empty one 0.6s later, so setting an order looked
            // like it did nothing. Same defect as the character picker and the models hub, which both
            // already patch here; this was the third opener and was missed.
            patchPendingSessionSettingsSnapshot(
              kind === "vision" ? { visionModelRoutingOrder: order } : { textModelRoutingOrder: order },
            );
          },
          onClose: () => {
            a.finalizeShowModalAndRestoreActiveTab(() => handle.Close());
          },
        }),
      );
    },
    [
      a.ollamaLocalOnDeck,
      a.ollamaIp,
      a.visionModelRoutingOrder,
      a.textModelRoutingOrder,
      a.catalogByTag,
      a.modelPolicyTier,
      a.modelPolicyNonFossUnlocked,
      a.modelAllowHighVramFallbacks,
      a.setLastConnectionStatus,
      a.captureSessionBeforeModal,
      a.finalizeShowModalAndRestoreActiveTab,
      a.setVisionModelRoutingOrder,
      a.setTextModelRoutingOrder,
      a.pauseDebouncedSettingsSave,
      a.buildSettingsPayload,
      a.hydrateFromSettings,
    ],
  );
}
