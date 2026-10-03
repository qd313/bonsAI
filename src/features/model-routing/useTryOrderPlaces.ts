/**
 * Title: The AI models box's try-order places
 *
 * Purpose: Gives the Browse screen in the AI models box what it needs to show each installed model's
 * place in the order bonsAI tries them in, for text questions or for questions with a picture, and
 * to move a model one place up or down. It works out which computer's models count (this Deck's own,
 * or the PC the AI runs on), reads the saved order fresh from disk, and saves every change at once.
 *
 * Used for: PullModelsModal.tsx (through usePullModelTryNav in PullModelsTryOrder.tsx), when the box
 * is opened with the AI-on-this-Deck choice and PC address it needs to know about.
 *
 * Solves: Replaces the two separate "Set text / vision model try order" screens, which each did a
 * connection test, a fresh read of the saved order and a save of their own. This keeps those rules in
 * one place: the answering computer's list, a note-search model never gets a place, a move starts from
 * the order on disk now (so a star pressed meanwhile is not undone), and a save also patches the
 * session snapshot Decky restores from when a popup closes.
 *
 * Does not: Draw the switch or the buttons, or decide which rows the table shows. A model the table's
 * filters hide keeps its place; placeCountHidden() only counts them. It does not undo a move on Cancel:
 * a place change is saved the moment it is made, like the star beside it.
 *
 * Gotchas:
 * - With the AI on a PC the box's own list of installed models is the Deck's, so the list that gets
 *   places comes from one connection test to the PC instead (the Deck's list is used as it is when the
 *   AI runs on the Deck, so no second probe starts the local server twice).
 *   That test also carries each model's size (`pcSizeGbByTag`), so a PC model of 15 GB or more is
 *   marked skipped even when its name is not on the heavy list.
 * - Moves are queued one behind another: each reads the order on disk, swaps, saves, so two quick
 *   presses do not both start from the same old order.
 * - The saved order is one list for whichever computer answers. A move keeps the saved names this
 *   machine does not show (models only the other machine has), after the visible ones, so changing a
 *   place on a PC does not wipe the Deck's places and the other way round.
 * - A save that fails changes nothing on screen and shows a notice; the places are only updated once
 *   the order is on disk.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toaster } from "@decky/api";

import type { BonsaiSettings } from "../../data/bonsaiSettingsSchema";
import { bytesToGb, isEmbeddingOnlyTag } from "../../data/pullModelCatalog";
import { patchPendingSessionSettingsSnapshot } from "../../utils/bonsaiSessionSurvival";
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS, formatDeckyRpcError } from "../../utils/deckyCall";
import { buildPickerOrder } from "../../utils/modelRoutingOrder";

export type TryOrderKind = "text" | "vision";

/** What the box needs to know about the computer that answers, and the order as the tab holds it. */
export type TryOrderHost = {
  ollamaLocalOnDeck: boolean;
  ollamaIp: string;
  /** The tab's copies of the saved orders: used only when a fresh read of the settings file fails. */
  textModelRoutingOrder: string[];
  visionModelRoutingOrder: string[];
  /** Whether Ask may try big models: with it off, a big model keeps its place but is skipped when someone asks. */
  modelAllowHighVramFallbacks: boolean;
};

export type TryOrderStatus = "off" | "loading" | "ready" | "refused";

export type TryOrderPlaces = {
  status: TryOrderStatus;
  /** Plain words for a refusal, shown in the box where the places would be. */
  refusal: string | null;
  kind: TryOrderKind;
  setKind: (kind: TryOrderKind) => void;
  /** Every model that can be tried for this kind, first choice first (filters do not remove any). */
  order: string[];
  /** The 1-based place of a table row's model, or null when it has none in this order. */
  placeOf: (tag: string) => number | null;
  move: (tag: string, delta: -1 | 1) => Promise<void>;
  /** True while the saved order is empty, meaning "automatic". */
  isAutomatic: boolean;
  reset: () => Promise<void>;
  /** True when the AI runs on a PC, so the list belongs to that computer. */
  onPc: boolean;
  /** With the AI on a PC: each of its models' size in GB, as that PC reports it (empty otherwise or when unknown). */
  pcSizeGbByTag: Record<string, number>;
};

const CONNECTION_TEST_TIMEOUT_SECONDS = 10;
const REMOTE_PROBE_EXTRA_MS = 3000;
/** A fresh read of the saved order gives up after this long and uses the tab's copy. */
const FRESH_ORDER_READ_MS = 1500;

const OFF: TryOrderPlaces = {
  status: "off",
  refusal: null,
  kind: "text",
  setKind: () => {},
  order: [],
  placeOf: () => null,
  move: async () => {},
  isAutomatic: true,
  reset: async () => {},
  onPc: false,
  pcSizeGbByTag: {},
};

const NO_SIZES: Record<string, number> = {};

/** The name in `order` that a table row's tag stands for, using the table's own matching rules. */
export function resolveOrderTag(tag: string, order: readonly string[]): string | null {
  if (order.includes(tag)) return tag;
  if (order.includes(`${tag}:latest`)) return `${tag}:latest`;
  return order.find((o) => o.startsWith(`${tag}:`)) ?? null;
}

/** How many places in `order` no tag in `shownTags` stands for (the ones the filters hide). */
export function placeCountHidden(order: readonly string[], shownTags: readonly string[]): number {
  const shown = new Set<string>();
  for (const t of shownTags) {
    const hit = resolveOrderTag(t, order);
    if (hit) shown.add(hit);
  }
  return order.length - shown.size;
}

const orderKey = (kind: TryOrderKind) => (kind === "vision" ? "vision_model_routing_order" : "text_model_routing_order");

/** The saved order as the settings file holds it now, or null when it cannot be read in time. */
async function readSavedOrderFresh(kind: TryOrderKind): Promise<string[] | null> {
  try {
    const saved = await callDeckyWithTimeout<[], BonsaiSettings>("load_settings", [], FRESH_ORDER_READ_MS);
    const order = saved[orderKey(kind)];
    return Array.isArray(order) ? order : null;
  } catch {
    return null;
  }
}

/** Writes one order, and tells the session snapshot Decky restores from when a popup closes. */
async function saveOrder(kind: TryOrderKind, rawOrder: string[]): Promise<void> {
  // Last line of defence: a note-search model never reaches the saved answer order.
  const order = rawOrder.filter((t) => !isEmbeddingOnlyTag(t));
  await callDeckyWithTimeout<[Partial<BonsaiSettings>], unknown>(
    "save_settings",
    [{ [orderKey(kind)]: order } as Partial<BonsaiSettings>],
    DECKY_RPC_TIMEOUT_MS,
  );
  patchPendingSessionSettingsSnapshot(
    kind === "vision" ? { visionModelRoutingOrder: order } : { textModelRoutingOrder: order },
  );
}

type PcList = { state: "loading" } | { state: "ready"; models: string[]; sizesGb: Record<string, number> } | { state: "refused"; message: string };

/**
 * In: the host choice (undefined switches the feature off), the box's own set of models installed on
 * this Deck and whether it is still listing them, and a key that changes when the star moved a model
 * to the front (so the places are read again).
 * Out: the places for the current kind, the move and reset functions, and a status the box draws from.
 * Can go wrong: a PC that cannot be reached, no PC address, or no installed answering model are all
 * "refused" with words for the box; a failed save shows a notice and leaves the places alone.
 */
export function useTryOrderPlaces(a: {
  host: TryOrderHost | undefined;
  deckInstalled: Set<string>;
  deckLoading: boolean;
  refreshKey: string | null;
}): TryOrderPlaces {
  const { host, deckInstalled, deckLoading, refreshKey } = a;
  const enabled = Boolean(host);
  const onPc = Boolean(host && !host.ollamaLocalOnDeck);
  const pcAddress = host && !host.ollamaLocalOnDeck ? host.ollamaIp.trim() : "";

  const [kind, setKind] = useState<TryOrderKind>("text");
  const [saved, setSaved] = useState<Record<TryOrderKind, string[]>>({
    text: host?.textModelRoutingOrder ?? [],
    vision: host?.visionModelRoutingOrder ?? [],
  });
  const savedRef = useRef(saved);
  savedRef.current = saved;
  const [pc, setPc] = useState<PcList>({ state: "loading" });

  // Read both saved orders as the box opens, and again whenever the star moved a model.
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void Promise.all([readSavedOrderFresh("text"), readSavedOrderFresh("vision")]).then(([text, vision]) => {
      if (cancelled) return;
      setSaved((prev) => ({ text: text ?? prev.text, vision: vision ?? prev.vision }));
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, refreshKey]);

  // With the AI on a PC, ask that computer which models it has (one connection test).
  useEffect(() => {
    if (!onPc) return;
    if (!pcAddress) {
      setPc({
        state: "refused",
        message: "No Ollama host. Enter a PC address on the Ollama tab first, or turn on Run AI on this Deck.",
      });
      return;
    }
    let cancelled = false;
    setPc({ state: "loading" });
    callDeckyWithTimeout<
      [string, number],
      { reachable?: boolean; models?: string[]; model_sizes?: Record<string, number>; error?: string }
    >(
      "test_ollama_connection",
      [pcAddress, CONNECTION_TEST_TIMEOUT_SECONDS],
      CONNECTION_TEST_TIMEOUT_SECONDS * 1000 + REMOTE_PROBE_EXTRA_MS,
    )
      .then((res) => {
        if (cancelled) return;
        if (res.reachable && Array.isArray(res.models)) {
          // The PC's own sizes: the 15 GB rule cannot mark a big model it has no size for.
          const sizesGb: Record<string, number> = {};
          for (const [tag, bytes] of Object.entries(res.model_sizes ?? {})) {
            if (typeof bytes === "number" && bytes > 0) sizesGb[tag] = bytesToGb(bytes);
          }
          setPc({ state: "ready", models: res.models, sizesGb });
        }
        else setPc({ state: "refused", message: `Could not list models. ${res.error ?? "The PC did not answer."}` });
      })
      .catch((e: unknown) => {
        if (!cancelled) setPc({ state: "refused", message: `Could not list models. ${formatDeckyRpcError(e)}` });
      });
    return () => {
      cancelled = true;
    };
  }, [onPc, pcAddress]);

  const installed = useMemo(() => {
    const list = onPc ? (pc.state === "ready" ? pc.models : []) : Array.from(deckInstalled);
    // Note-search models cannot answer, so they are not choices for an answer order.
    return list.filter((t) => Boolean(t) && !isEmbeddingOnlyTag(t));
  }, [onPc, pc, deckInstalled]);
  const installedRef = useRef(installed);
  installedRef.current = installed;

  const order = useMemo(() => buildPickerOrder(kind, installed, saved[kind]), [kind, installed, saved]);

  let status: TryOrderStatus = "ready";
  let refusal: string | null = null;
  if (!enabled) status = "off";
  else if (onPc && pc.state === "refused") {
    status = "refused";
    refusal = pc.message;
  } else if (onPc ? pc.state === "loading" : deckLoading) status = "loading";
  else if (installed.length === 0) {
    status = "refused";
    refusal = "No installed models. Pull an answering model with the table below (or Install the starter set), then try again.";
  }

  const placeOf = useCallback(
    (tag: string): number | null => {
      const hit = resolveOrderTag(tag, order);
      return hit ? order.indexOf(hit) + 1 : null;
    },
    [order],
  );

  // Moves wait for the one before them, so each starts from the order the last one saved.
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const enqueue = useCallback((job: () => Promise<void>) => {
    queueRef.current = queueRef.current.then(job).catch((e: unknown) => {
      toaster.toast({ title: "Could not save the order", body: formatDeckyRpcError(e), duration: 5000 });
    });
    return queueRef.current;
  }, []);

  const move = useCallback(
    (tag: string, delta: -1 | 1) =>
      enqueue(async () => {
        const fresh = (await readSavedOrderFresh(kind)) ?? savedRef.current[kind];
        const current = buildPickerOrder(kind, installedRef.current, fresh);
        const name = resolveOrderTag(tag, current);
        if (!name) return;
        const from = current.indexOf(name);
        const to = from + delta;
        if (to < 0 || to >= current.length) return;
        const next = [...current];
        [next[from], next[to]] = [next[to], next[from]];
        // The saved list is shared by the Deck and a PC: names this machine does not show (a model only
        // the other machine has) keep their relative order after the visible ones instead of being wiped.
        const unseen = fresh.filter((t) => t.trim() && !current.includes(t) && !next.includes(t));
        const toSave = [...next, ...unseen];
        await saveOrder(kind, toSave);
        setSaved((prev) => ({ ...prev, [kind]: toSave }));
      }),
    [enqueue, kind],
  );

  const reset = useCallback(
    () =>
      enqueue(async () => {
        const fresh = (await readSavedOrderFresh(kind)) ?? savedRef.current[kind];
        if (fresh.length === 0) return;
        await saveOrder(kind, []);
        setSaved((prev) => ({ ...prev, [kind]: [] }));
      }),
    [enqueue, kind],
  );

  if (!enabled) return OFF;
  const pcSizeGbByTag = onPc && pc.state === "ready" ? pc.sizesGb : NO_SIZES;
  return {
    status,
    refusal,
    kind,
    setKind,
    order,
    placeOf,
    move,
    isAutomatic: saved[kind].length === 0,
    reset,
    onPc,
    pcSizeGbByTag,
  };
}
