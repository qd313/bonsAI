/**
 * Title: Pull models modal
 *
 * Purpose: The full-screen model catalog, reached from the Ollama tab's
 * "Browse models…" button (or embedded inline inside the AI models hub).
 * It lists every known model as a table you can filter, shows what is
 * already installed and how much space it uses, lets you queue several
 * models to download at once or type in any tag by hand, mark one as the
 * model Ask actually uses, and remove an installed one.
 *
 * Used for: Opened from Ollama / Settings flows via showModal, and reused
 * inline inside the AI models hub.
 *
 * Solves: A catalog too big to browse as a flat settings list gets a
 * dedicated screen with a table, filters, and its own fully wired D-pad
 * path through every row.
 *
 * Does not: Decide which model answers a given question. This screen installs
 * and removes models, can mark one as the current pick, and — when the box
 * hands it a host (tryOrderHost) — shows and changes each installed model's
 * place in the try order (see PullModelsTryOrder.tsx and useTryOrderPlaces.ts).
 * The New-badge record math lives in utils/pullModelNewBadge.ts, the
 * shared request/prop types live in PullModelsModal.types.ts, the
 * table/filters-column matching and row model live in
 * utils/pullModelFilters.ts — the first two are re-exported below so
 * nothing else needs to change its imports — and the filters column itself
 * is PullModelsFiltersColumn.tsx.
 *
 * How it works:
 *
 *     ┌─ AI models ──────────────────────────────── [ Advanced › ] ┐  <- the hub's title row
 *     │ Installed N · X GB   Queue N · X GB   catalog/size src ↻     │
 *     │ ┌ filters column ┐ ┌ Try order for [Text][Pictures] [Reset] ┐ │
 *     │ │ 7 match  Clear │ │ Pull│Model    │Size│Modes│Fit│Try│Del  │ │
 *     │ │ LICENCE  (•) … │ │  ★  │tag…     │4GB │Chat…│★★★│1▲▼│ X   │ │
 *     │ │ GOOD FOR [ ] 5 │ │  ☐  │tag…     │…   │…    │…  │   │     │ │
 *     │ │ SHOW     [✔] … │ │                                       │ │
 *     │ │ [Type a name]… │ │  Right -> the nearest row to the ring │ │
 *     │ └────────────────┘ └ <- Left from a row's star ─────────────┘ │
 *     │        Done / Pull selected (N) · X GB          Cancel        │
 *     └────────────────────────────────────────────────────────────────┘
 *
 *     Advanced <-> Clear, the same both ways (downFromAboveRef; the header line's Refresh button was removed, plan 93)
 *     Up from the switch, or from the first row (no switch) -> Advanced (onMoveUpFromTop)
 *     Down past the column's last stop, or past the list's last row -> Steam carries it to Done
 *
 * 1. refreshInstalledAndMeta() runs on mount: tests the connection to this
 *    Deck's own Ollama to learn which tags are already installed, then
 *    fetches live size metadata for every catalog tag — one after the other,
 *    falling back to offline data on any failure.
 * 2. Tags are matched against the catalog (isTagInstalled(),
 *    isCatalogModelTagInList()) and filtered — by the licence tier
 *    (entryMatchesLicenceTier(), the same three tiers the old Policy
 *    section chose), the ticked Ask-mode filters (entryMatchesModeFilters()),
 *    installedOnly, essentialsOnly, recentlyAddedOnly — into the grouped,
 *    sectioned table built by tableSections. All of them sit in the filters
 *    column beside the list, always on screen (plan 91 § 2a; they hid
 *    behind a "Filters · N on" button before). The Good for and Show picks
 *    last for the session (pullModelsBoxMemory.ts); the licence is saved on
 *    Done by the hub.
 * 3. Pressing a row's star/checkmark either queues an uninstalled model
 *    with toggleSelected() (confirming first for a large "stretch"
 *    download, and for switching to Tier 2 if it is open-weight), or, for
 *    an already-installed model, calls pinModelForAsk() to move it to the
 *    front of the Ask try-order.
 * 4. Its own X button calls confirmDelete(), which refuses to remove
 *    whichever tag is actively answering Ask right now.
 * 5. onPullSelected() sends every queued tag in one request, after the
 *    same Tier 2 confirmation if the queue holds an open-weight model
 *    under Tier 1; onPullCustomTag() is a separate one-off path for typing
 *    in any tag by hand, validated before it is ever sent.
 * 6. Every button on the table and in the column wires its own
 *    Up/Down/Left/Right by hand (rowNavHandlers() for table cells) so the
 *    D-pad walks the grid in a fixed, predictable order instead of
 *    Steam's automatic guess. Right from the column and Left from a row's
 *    star cross between the two by Steam's own transfer onto the other
 *    side's nav node, then a sibling focus onto the stop nearest the
 *    ring, measured at the press (pullModelsBeside.ts); held when none is.
 * 7. The whole panel renders two ways: as its own modal by default
 *    (wrapped in ConfirmModal, with Pull selected/Cancel as its footer),
 *    or, when embedded is true, as a bare panel inside another modal (the
 *    AI models hub), reporting its own footer state up through
 *    onFooterStateChange() instead of drawing one.
 * 8. The column's foot carries "Type a name", "Install the starter set" while the starter model is
 *    not installed (it asks first with the size, then starts the setup run the old Tier 1 button
 *    started), and the Suggested models.
 * 9. With a host given, a Text / Pictures switch sits above the list and every installed row
 *    gains a Try column (place number, up, down): usePullModelTryNav() draws them and the walking
 *    rules here (leaveListUp, moveDownPastSwitch, rowNavHandlers) reach them. A change is saved at
 *    once, like the star.
 *
 * Gotchas:
 * - The "New" badge is tracked entirely in the browser's own storage,
 *   since nothing on the backend ever records when a model was pulled.
 *   The first time it ever runs it has to treat every already-installed
 *   model as old rather than "just pulled," or a fresh install would badge
 *   everything New for a month — see the long comment above
 *   computeUpdatedPullRecord for exactly how that is avoided and what went
 *   wrong on the Deck before it was.
 * - A row's delete (X) button is deliberately kept out of Steam's normal
 *   tab order (focusable={false}, tabIndex -1) and reached only by moving
 *   Right off that row's select/star button, so pressing Down through the
 *   list can never land on a destructive action by accident.
 * - Cancel and Pull selected are Steam's own footer buttons in the
 *   non-embedded modal, rendered outside this component's own DOM
 *   entirely, so they are found by searching the page for a button with a
 *   matching label (findModalFooterButton()) rather than by a ref.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type RefCallback } from "react";
import { Button, ConfirmModal, Focusable } from "@decky/ui";
import {
  PULL_MODEL_CATALOG,
  formatGtaStars,
  formatPullModelTags,
  formatSizeGb,
  isDeckDailyPullModel,
  isEmbeddingOnlyTag,
  type PullModelEntry,
} from "../data/pullModelCatalog";
import { PullModelLicenceSlot } from "./PullModelLicenceSlot";
import { PullModelsFiltersColumn } from "./PullModelsFiltersColumn";
import { focusAndReveal, handRingTo, usePullModelsSessionFilters } from "./pullModelsBoxMemory";
import { usePullModelsBeside, type FiltersColumnApi } from "./pullModelsBeside";
import { PullModelsTableHeader } from "./PullModelsTableHeader";
import { usePullModelTryNav } from "./PullModelsTryOrder";
import { isDeprioritizedOllamaTag } from "../data/deprioritizedModels";
import { PULL_MODEL_NEW_BADGE_STORAGE_KEY } from "../data/storageKeys";
import { useListHeaderClearance } from "./pullModelsListClearance";
import { BonsaiModalScope } from "./BonsaiModalScope";
import { registerRemoveControl } from "./pullModelsRemoveReturn";
import { recommendPullModelsForGaps } from "../utils/pullModelRecommendations";
import { usePullModelTier2Confirm } from "../hooks/usePullModelTier2Confirm";
import { usePullModelToggleSelection } from "../hooks/usePullModelToggleSelection";
import { usePullModelDeleteConfirm } from "../hooks/usePullModelDeleteConfirm";
import { usePullModelPinForAsk } from "../hooks/usePullModelPinForAsk";
import { usePullModelSubmitSelected } from "../hooks/usePullModelSubmitSelected";
import { usePullModelTableData } from "../hooks/usePullModelTableData";
import { usePullModelCatalogRefresh } from "../hooks/usePullModelCatalogRefresh";
import { usePullModelOpenBookkeeping } from "../hooks/usePullModelOpenBookkeeping";
import { usePullModelEmbeddedFooterState } from "../hooks/usePullModelEmbeddedFooterState";
import {
  computeUpdatedPullRecord,
  isRecentPullModelTag,
  PULL_MODEL_NEW_BADGE_WINDOW_MS,
  type PullModelPullRecord,
} from "../utils/pullModelNewBadge";
import type { PullModelsModalProps } from "./PullModelsModal.types";
export type { PullModelsFooterState, PullModelsModalProps } from "./PullModelsModal.types";
import { findUnavailableRegistryTags, formatModesShort, isTagInstalled, resolveRowSizeGb } from "../utils/pullModelFilters";
import type { NavRefHolder } from "../utils/navFocusRegistry";
export { findUnavailableRegistryTags };

// "New" badge history (when each tag was first seen installed) — the record math and the
// first-run rule it protects live in pullModelNewBadge.ts; re-exported so existing imports of
// these names from this file keep working unchanged.
export {
  computeUpdatedPullRecord,
  isRecentPullModelTag,
  PULL_MODEL_NEW_BADGE_WINDOW_MS,
  type PullModelPullRecord,
};
export { PULL_MODEL_NEW_BADGE_STORAGE_KEY };

// The built-in list is the only list. One copy made at load, for the try-order code's writable type.
const BUILT_IN_CATALOG: PullModelEntry[] = [...PULL_MODEL_CATALOG];

/**
 * The whole screen. See "How it works" above for the flow. Pass to
 * `showModal()` when embedded is false or omitted — ConfirmModal supplies
 * Steam's modal chrome then. When embedded is true, render this directly
 * inside a parent's own modal body instead, and read onFooterStateChange
 * for what its footer should say and do.
 *
 * In: the tag Ask is actively using right now (so it can't be deleted),
 * the current model policy tier and a callback to raise it to Tier 2,
 * callbacks for nested-modal focus handoff, cancel, and "a pull was just
 * accepted," and, in embedded mode, a callback that reports this screen's
 * own footer state up to whatever is drawing the real footer.
 * Out: the catalog table and its controls, either as a full modal or as a
 * bare panel.
 *
 * What can go wrong: every backend call here (connection test, catalog
 * metadata, pull, delete, pin) is wrapped so a failure shows a toast and
 * clears its own busy flag rather than leaving a row stuck.
 */
export function PullModelsModal(props: PullModelsModalProps) {
  const {
    activeRoutingTag,
    modelPolicyTier = "open_source_only",
    modelPolicyNonFossUnlocked = false,
    onSelectModelPolicyTier,
    onApplyTier2Policy,
    onBeforeNestedDeckyModal,
    onCompleteNestedDeckyModalClose,
    onCancel,
    onPullAccepted,
    embedded = false,
    onFooterStateChange,
    onMoveUpFromTop,
    downFromAboveRef,
  } = props;

  const mergedCatalog = BUILT_IN_CATALOG;
  const [installedTags, setInstalledTags] = useState<Set<string>>(() => new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(() => new Set());
  // The Good for and Show picks, kept for the session so a closed and reopened box shows the same (plan 91 § 2a).
  const [filters, changeFilters] = usePullModelsSessionFilters();
  const { modeFilters, installedOnly, essentialsOnly, recentlyAddedOnly } = filters;
  const [sizeSource, setSizeSource] = useState<"live" | "offline">("offline");
  const [liveSizeGbByTag, setLiveSizeGbByTag] = useState<Record<string, number>>({});
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [pullBusy, setPullBusy] = useState(false);
  const [deleteBusyTag, setDeleteBusyTag] = useState<string | null>(null);
  const [pinnedAskTag, setPinnedAskTag] = useState<string | null>(null);
  const [pinBusyTag, setPinBusyTag] = useState<string | null>(null);
  const [pullRecord, setPullRecord] = useState<PullModelPullRecord>({});
  const stretchConfirmedRef = useRef<Set<string>>(new Set());
  const openWeightTierConfirmedRef = useRef<Set<string>>(new Set());
  const shellRef = useRef<HTMLDivElement | null>(null);
  /** The two sides' nav nodes (Steam fills them): Right and Left cross between them by Steam's transfer. */
  const columnNavRef = useRef<NavRefHolder["current"]>(null);
  const listNavRef = useRef<NavRefHolder["current"]>(null);
  const columnApi = useRef<FiltersColumnApi | null>(null);
  const footerPullRef = useRef<HTMLElement | null>(null);
  const selectCellRefs = useRef<(HTMLElement | null)[]>([]);
  const deleteCellRefs = useRef<(HTMLElement | null)[]>([]);
  const { listRef, headerRef: listHeaderRef, clearForRow: clearListHeader } = useListHeaderClearance();

  // Lifted into usePullModelCatalogRefresh. It must stay at exactly this point in the hook
  // list: React matches hooks by the order they run, not by name.
  const { refreshInstalledAndMeta, focusAfterRedraw } = usePullModelCatalogRefresh({
    setInstalledTags,
    setSizeSource,
    setLiveSizeGbByTag,
    setLoadingMeta,
  });

  // Lifted into usePullModelOpenBookkeeping. It must stay at exactly this point in the hook
  // list: React matches hooks by the order they run, not by name.
  usePullModelOpenBookkeeping({ installedTags, setPinnedAskTag, setPullRecord });

  // Lifted into usePullModelTableData. It must stay at exactly this point in the hook list:
  // React matches hooks by the order they run, not by name.
  const { tableSections, flatRows, installedCatalogCount, installedTotalGb, selectedTotalGb, modeCounts } = usePullModelTableData({
    mergedCatalog,
    installedTags,
    modeFilters,
    installedOnly,
    essentialsOnly,
    recentlyAddedOnly,
    pullRecord,
    modelPolicyTier,
    liveSizeGbByTag,
    selectedTags,
  });

  // The Try column and switch (useTryOrderPlaces.ts); off, and drawing nothing, unless the box was given a host.
  const tryNav = usePullModelTryNav({ host: props.tryOrderHost, installedTags, loading: loadingMeta, refreshKey: pinnedAskTag, flatRows, reveal: focusAndReveal, catalog: mergedCatalog, tier: modelPolicyTier, modeFilters, liveSizeGbByTag });
  const rowTotal = flatRows.length + tryNav.pcCount; // the Deck's rows, then the "On the PC" rows

  /** Up out of the top of the box (Clear, the switch, the first row): the hub's Advanced link, else Steam's own move. */
  const leaveTop = useCallback((): boolean => onMoveUpFromTop?.() ?? false, [onMoveUpFromTop]);

  /*
   * Advanced and the column's Clear, the same both ways (the header line's Refresh button between them is gone,
   * plan 93). Each hop is Steam's transfer onto the other part's nav node.
   */
  const toClear = (): boolean => {
    if (!handRingTo(columnNavRef)) return false;
    columnApi.current?.focusStop(null);
    return true;
  };
  useEffect(() => {
    if (!downFromAboveRef) return;
    downFromAboveRef.current = toClear;
    return () => {
      downFromAboveRef.current = null;
    };
  });

  /**
   * Up out of the first row: the try-order switch above the list, else the Advanced link. The list goes
   * back to its top first: walking down leaves it scrolled, and a first model left half under the sticky
   * column-header row was what the Deck showed on 2026-10-02 (plan79-P79-M9-MODELS-BOX-TOP.json).
   */
  const leaveListUp = useCallback((): boolean => {
    if (listRef.current) listRef.current.scrollTop = 0;
    return tryNav.focusSwitch() || leaveTop();
  }, [leaveTop, tryNav.focusSwitch]);

  const findModalFooterButton = useCallback((labelPrefix: string): HTMLElement | null => {
    const shell = shellRef.current;
    if (!shell) return null;
    const prefix = labelPrefix.trim().toLowerCase();
    let parent: HTMLElement | null = shell.parentElement;
    for (let depth = 0; depth < 24 && parent; depth++) {
      const matches: HTMLElement[] = [];
      for (const btn of parent.querySelectorAll("button, [role=\"button\"]")) {
        const el = btn as HTMLElement;
        if (shell.contains(el)) continue;
        const text = el.textContent?.trim().toLowerCase() ?? "";
        if (text === prefix || text.startsWith(prefix)) matches.push(el);
      }
      if (matches.length) return matches[matches.length - 1];
      parent = parent.parentElement;
    }
    return null;
  }, []);

  const focusRowCell = useCallback((rowIndex: number, cell: "select" | "delete"): boolean => {
    if (!rowTotal) return false;
    const i = Math.max(0, Math.min(rowIndex, rowTotal - 1));
    const target =
      cell === "select" ? selectCellRefs.current[i] : deleteCellRefs.current[i];
    if (!target) return false;
    target.focus();
    target.scrollIntoView({ block: "nearest", inline: "nearest" });
    // The Deck's scroll leaves a row that is partly under the sticky header where it is (pullModelsListClearance.ts).
    clearListHeader(target, i === 0);
    return true;
  }, [rowTotal, clearListHeader]);

  const focusNextRowSelect = useCallback(
    (fromIndex: number): boolean => {
      for (let j = fromIndex + 1; j < rowTotal; j++) {
        if (selectCellRefs.current[j]) return focusRowCell(j, "select");
      }
      return false;
    },
    [rowTotal, focusRowCell]
  );

  const focusPrevRowSelect = useCallback(
    (fromIndex: number): boolean => {
      for (let j = fromIndex - 1; j >= 0; j--) {
        if (selectCellRefs.current[j]) return focusRowCell(j, "select");
      }
      return false;
    },
    [focusRowCell]
  );

  const focusFooterPull = useCallback((): boolean => {
    const pull = footerPullRef.current ?? findModalFooterButton("pull selected");
    if (pull) {
      pull.focus();
      pull.scrollIntoView({ block: "nearest", inline: "nearest" });
      return true;
    }
    return false;
  }, [findModalFooterButton]);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      footerPullRef.current = findModalFooterButton("pull selected");
    });
    return () => window.cancelAnimationFrame(id);
  }, [findModalFooterButton, selectedTags.size, pullBusy]);

  /** Right from the column and Left from a row's star: the nearest stop within reach, by Steam's transfer; held when none is. */
  const { enterList, enterColumn } = usePullModelsBeside({ listNavRef, columnNavRef, columnApi, listRef, headerRef: listHeaderRef, selectCellRefs, focusRowCell, switchChip: tryNav.switchChip, enterSwitch: tryNav.enterSwitch });

  const rowNavHandlers = useCallback(
    (rowIndex: number, cell: "select" | "delete", installed: boolean) => ({
      onMoveUp: () => {
        if (cell === "delete") {
          if (focusPrevRowSelect(rowIndex)) return true;
          return leaveListUp();
        }
        if (focusPrevRowSelect(rowIndex)) return true;
        return leaveListUp();
      },
      onMoveDown: () => {
        if (focusNextRowSelect(rowIndex)) return true;
        /*
         * The last row hands Down back to Steam, which carries the ring out of this panel to the
         * dialog's own footer (Done, or Pull selected once something is queued), as in any Decky
         * dialog. This used to look the footer up by the label "Pull selected", focus it with a
         * plain DOM focus, and swallow the press either way. Inside the AI models hub that button
         * reads "Done" until something is queued, so nothing was found and Down went nowhere; a
         * plain focus() does not carry the ring into another container in any case (measured
         * 2026-09-04). On the Deck 2026-09-23 (plan64-MODELS-HUB-RETURN-01.json) Down stopped on
         * the last model row with Done fully on screen below it.
         */
        return false;
      },
      onMoveRight: () => {
        if (cell === "select" && installed) return tryNav.focusPlaceUp(rowIndex) || focusRowCell(rowIndex, "delete");
        return false;
      },
      onMoveLeft: () => {
        if (cell === "delete") return tryNav.focusPlaceDown(rowIndex) || focusRowCell(rowIndex, "select");
        return enterColumn(rowIndex);
      },
    }),
    [leaveListUp, focusNextRowSelect, focusPrevRowSelect, focusRowCell, tryNav, enterColumn]
  );

  const recommendedEntries = useMemo(
    // Dropped fossOnly with the standalone toggle it belonged to (plan 62, § 3d) -- the Licence
    // filter now covers the same ground for the table itself, and a suggestion is worth
    // surfacing regardless of the current licence pick.
    () => recommendPullModelsForGaps(installedTags, { fossOnly: false, limit: 4, catalog: mergedCatalog }),
    [installedTags, mergedCatalog]
  );

  /**
   * A on any control on this screen must run that control's own action and stop there, the same
   * as its `onClick` already does for a mouse -- this screen is a confirm box with its own OK, and
   * Steam delivers A through `onOKButton`, never a DOM click, so a control with only `onClick`
   * loses every A press straight to that OK, closing the whole screen instead of doing anything
   * (found on the Deck 2026-09-21, workshop:test-evidence/plan62-MODELS-FILTERS-01-A-closes-screen.json).
   * Every one of the affected controls wants the identical two-line wrapper, so it is written once
   * rather than inline at each (the filters column gets it as a prop).
   */
  const okButtonRuns = (fn: () => void) => (evt: { stopPropagation: () => void }) => {
    evt.stopPropagation();
    fn();
  };

  /** Down past the try-order switch: the first table row. */
  const moveDownPastSwitch = (): boolean => focusRowCell(0, "select") || focusFooterPull();
  const tryCell = (tag: string, rowIndex: number, installed: boolean) =>
    tryNav.cell({
      tag, rowIndex, installed, okButtonRuns,
      nav: rowNavHandlers(rowIndex, "select", installed),
      goSelect: () => focusRowCell(rowIndex, "select"),
      goDelete: () => focusRowCell(rowIndex, "delete"),
    });

  // Lifted into usePullModelTier2Confirm. It must stay at exactly this point in the hook list:
  // React matches hooks by the order they run, not by name.
  const { completeNestedModalClose, confirmOpenWeightTierIfNeeded } = usePullModelTier2Confirm({
    modelPolicyTier,
    onApplyTier2Policy,
    onBeforeNestedDeckyModal,
    onCompleteNestedDeckyModalClose,
    openWeightTierConfirmedRef,
  });

  // Lifted into usePullModelToggleSelection. It must stay at exactly this point in the hook
  // list: React matches hooks by the order they run, not by name.
  const { toggleSelected } = usePullModelToggleSelection({
    installedTags,
    liveSizeGbByTag,
    completeNestedModalClose,
    onBeforeNestedDeckyModal,
    confirmOpenWeightTierIfNeeded,
    setSelectedTags,
    stretchConfirmedRef,
  });

  // Lifted into usePullModelPinForAsk. It must stay at exactly this point in the hook list:
  // React matches hooks by the order they run, not by name.
  const { pinModelForAsk } = usePullModelPinForAsk({ pinBusyTag, setPinBusyTag, setPinnedAskTag });

  // Lifted into usePullModelDeleteConfirm. It must stay at exactly this point in the hook list:
  // React matches hooks by the order they run, not by name.
  const { confirmDelete } = usePullModelDeleteConfirm({
    focusRemoveControl: focusAndReveal,
    enterList: () => handRingTo(listNavRef),
    activeRoutingTag,
    onBeforeNestedDeckyModal,
    completeNestedModalClose,
    refreshInstalledAndMeta,
    setSelectedTags,
    setDeleteBusyTag,
  });

  // Lifted into usePullModelSubmitSelected. It must stay at exactly this point in the hook list:
  // React matches hooks by the order they run, not by name.
  const { onPullSelected } = usePullModelSubmitSelected({
    selectedTags,
    modelPolicyTier,
    mergedCatalog,
    onApplyTier2Policy,
    completeNestedModalClose,
    onBeforeNestedDeckyModal,
    onPullAccepted,
    setPullBusy,
    openWeightTierConfirmedRef,
  });

  const bindSelectRef =
    (rowIndex: number): RefCallback<HTMLElement> =>
    (el) => {
      selectCellRefs.current[rowIndex] = el;
    };

  const bindDeleteRef =
    (rowIndex: number, tag: string): RefCallback<HTMLElement> =>
    (el) => {
      deleteCellRefs.current[rowIndex] = el;
      if (el) el.tabIndex = -1;
      // By model name, outside this component, so the Remove box can hand the ring back to the row
      // even when this screen was drawn again while the box was open (pullModelsRemoveReturn.ts).
      registerRemoveControl(tag, el);
    };

  const renderCatalogRow = (entry: PullModelEntry, rowIndex: number) => {
    const installed = isTagInstalled(entry.tag, installedTags);
    const selected = selectedTags.has(entry.tag);
    const sizeGb = resolveRowSizeGb(entry, liveSizeGbByTag);
    const deleteDisabled =
      Boolean(activeRoutingTag && activeRoutingTag === entry.tag) || deleteBusyTag === entry.tag;
    const navSelect = rowNavHandlers(rowIndex, "select", installed);
    const navDelete = rowNavHandlers(rowIndex, "delete", installed);
    const rowClass = [
      "bonsai-pullmodels-table-row",
      "bonsai-pullmodels-table-row--data",
      installed ? "bonsai-pullmodels-table-row--installed" : "",
      isDeckDailyPullModel(entry) ? "" : "bonsai-pullmodels-table-row--stretch",
    ]
      .filter(Boolean)
      .join(" ");

    const pinned = pinnedAskTag === entry.tag;
    const isNew = installed && isRecentPullModelTag(pullRecord, entry.tag, Date.now());

    return (
      <div key={entry.tag} className={rowClass} role="row" data-row-index={rowIndex}>
        <div className="bonsai-pullmodels-col bonsai-pullmodels-col--pull" role="cell">
          {installed ? (
            <Button
              ref={bindSelectRef(rowIndex)}
              focusable
              className={`bonsai-pullmodels-slot bonsai-pullmodels-slot--installed${pinned ? " bonsai-pullmodels-slot--pinned" : ""}`}
              disabled={pinBusyTag === entry.tag}
              aria-label={pinned ? `${entry.tag} is used for Ask` : `Use ${entry.tag} for Ask`}
              onClick={(ev) => {
                ev.stopPropagation();
                ev.preventDefault();
                void pinModelForAsk(entry, entry.tag);
              }}
              {...({
                ...navSelect,
                onOKButton: okButtonRuns(() => void pinModelForAsk(entry, entry.tag)),
              } as unknown as Record<string, unknown>)}
            >
              {pinned ? "★" : "☆"}
            </Button>
          ) : (
            <Button
              ref={bindSelectRef(rowIndex)}
              focusable
              className={`bonsai-pullmodels-slot${selected ? " bonsai-pullmodels-slot--selected" : ""}`}
              onClick={(ev) => toggleSelected(entry, ev)}
              aria-label={selected ? `Deselect ${entry.tag}` : `Select ${entry.tag} to pull`}
              {...({
                ...navSelect,
                onOKButton: okButtonRuns(() => toggleSelected(entry)),
              } as unknown as Record<string, unknown>)}
            >
              {selected ? "✔" : ""}
            </Button>
          )}
        </div>
        <div className="bonsai-pullmodels-col bonsai-pullmodels-col--model" role="cell">
          <span className="bonsai-pullmodels-model-line">
            <span className="bonsai-pullmodels-tag-name">
              <span className="bonsai-pullmodels-tag-name-text">
                {entry.tag}
                {isDeprioritizedOllamaTag(entry.tag) ? " !" : ""}
              </span>
              {isNew ? <span className="bonsai-pullmodels-new-badge">New</span> : null}
            </span>
            <PullModelLicenceSlot entry={entry} />
          </span>
        </div>
        <div className="bonsai-pullmodels-col bonsai-pullmodels-col--muted bonsai-pullmodels-col--size" role="cell">{formatSizeGb(sizeGb)}</div>
        <div className="bonsai-pullmodels-col bonsai-pullmodels-col--muted bonsai-pullmodels-col--modes" role="cell" title={formatPullModelTags(entry.tags)}>
          {formatModesShort(entry.tags)}
        </div>
        <div className="bonsai-pullmodels-col bonsai-pullmodels-col--stars" role="cell">
          {formatGtaStars(entry.rating)}
        </div>
        {tryCell(entry.tag, rowIndex, installed)}
        <div className="bonsai-pullmodels-col bonsai-pullmodels-col--del" role="cell">
          {installed ? (
            <Button
              ref={bindDeleteRef(rowIndex, entry.tag)}
              focusable={false}
              className="bonsai-pullmodels-delete-btn"
              disabled={deleteDisabled}
              aria-disabled={deleteDisabled}
              aria-label={
                deleteDisabled && activeRoutingTag === entry.tag
                  ? "Switch Ask mode first to remove this model."
                  : "Remove from Deck"
              }
              onClick={(ev) => {
                ev.preventDefault();
                confirmDelete(entry.tag, sizeGb);
              }}
              {...({
                ...navDelete,
                onOKButton: okButtonRuns(() => {
                  if (!deleteDisabled) confirmDelete(entry.tag, sizeGb);
                }),
              } as unknown as Record<string, unknown>)}
            >
              X
            </Button>
          ) : null}
        </div>
      </div>
    );
  };

  const renderOtherRow = (tag: string, rowIndex: number) => {
    const sizeGb = liveSizeGbByTag[tag] ?? 0;
    const deleteDisabled = Boolean(activeRoutingTag && activeRoutingTag === tag) || deleteBusyTag === tag;
    const navDelete = rowNavHandlers(rowIndex, "delete", true);
    const pinned = pinnedAskTag === tag;
    const isNew = isRecentPullModelTag(pullRecord, tag, Date.now());
    /* An embedding model is installed to serve the knowledge base and can never answer a
       question, so pinning one for Ask would point it at something that cannot reply. The button
       stays present and focusable rather than being dropped: removing it would change the row's
       D-pad path, and a focus regression is a worse trade than a button that explains itself. */
    const embeddingOnly = isEmbeddingOnlyTag(tag);

    return (
      <div
        key={`other-${tag}`}
        className="bonsai-pullmodels-table-row bonsai-pullmodels-table-row--data bonsai-pullmodels-table-row--installed"
        role="row"
        data-row-index={rowIndex}
      >
        <div className="bonsai-pullmodels-col bonsai-pullmodels-col--pull" role="cell">
          <Button
            ref={bindSelectRef(rowIndex)}
            focusable
            className={`bonsai-pullmodels-slot bonsai-pullmodels-slot--installed${pinned ? " bonsai-pullmodels-slot--pinned" : ""}`}
            disabled={pinBusyTag === tag}
            aria-label={
              embeddingOnly
                ? `${tag} cannot answer questions, so it cannot be used for Ask`
                : pinned
                  ? `${tag} is used for Ask`
                  : `Use ${tag} for Ask`
            }
            onClick={(ev) => {
              ev.stopPropagation();
              ev.preventDefault();
              if (embeddingOnly) return;
              void pinModelForAsk(null, tag);
            }}
            {...({
              ...rowNavHandlers(rowIndex, "select", true),
              onOKButton: okButtonRuns(() => {
                if (embeddingOnly) return;
                void pinModelForAsk(null, tag);
              }),
            } as unknown as Record<string, unknown>)}
          >
            {embeddingOnly ? "—" : pinned ? "★" : "☆"}
          </Button>
        </div>
        <div className="bonsai-pullmodels-col bonsai-pullmodels-col--model" role="cell">
          <span className="bonsai-pullmodels-model-line">
            <span className="bonsai-pullmodels-tag-name">
              <span className="bonsai-pullmodels-tag-name-text">{tag}</span>
              {isNew ? <span className="bonsai-pullmodels-new-badge">New</span> : null}
            </span>
            <span className="bonsai-pullmodels-foss-slot" aria-hidden={true} />
          </span>
        </div>
        <div className="bonsai-pullmodels-col bonsai-pullmodels-col--muted bonsai-pullmodels-col--size" role="cell">
          {sizeGb > 0 ? formatSizeGb(sizeGb) : "?"}
        </div>
        <div className="bonsai-pullmodels-col bonsai-pullmodels-col--muted bonsai-pullmodels-col--modes" role="cell">Other</div>
        <div className="bonsai-pullmodels-col bonsai-pullmodels-col--stars" role="cell">—</div>
        {tryCell(tag, rowIndex, true)}
        <div className="bonsai-pullmodels-col bonsai-pullmodels-col--del" role="cell">
          <Button
            ref={bindDeleteRef(rowIndex, tag)}
            focusable={false}
            className="bonsai-pullmodels-delete-btn"
            disabled={deleteDisabled}
            aria-disabled={deleteDisabled}
            aria-label={
              deleteDisabled && activeRoutingTag === tag
                ? "Switch Ask mode first to remove this model."
                : "Remove from Deck"
            }
            onClick={(ev) => {
              ev.preventDefault();
              confirmDelete(tag, sizeGb);
            }}
            {...({
              ...navDelete,
              onOKButton: okButtonRuns(() => {
                if (!deleteDisabled) confirmDelete(tag, sizeGb);
              }),
            } as unknown as Record<string, unknown>)}
          >
            X
          </Button>
        </div>
      </div>
    );
  };

  let rowCounter = 0;
  const strOKButtonText =
    selectedTags.size > 0
      ? `Pull selected (${selectedTags.size}) · ${formatSizeGb(selectedTotalGb)}`
      : "Pull selected";

  // Lifted into usePullModelEmbeddedFooterState. It must stay at exactly this point in the
  // hook list: React matches hooks by the order they run, not by name.
  usePullModelEmbeddedFooterState({
    embedded,
    onFooterStateChange,
    strOKButtonText,
    selectedTags,
    pullBusy,
    onPullSelected,
  });

  const panelBody = (
        <BonsaiModalScope shellRef={shellRef} className="bonsai-pullmodels-shell bonsai-prose">
          <div className="bonsai-pullmodels-header">
            <span>Installed {installedCatalogCount} · {formatSizeGb(installedTotalGb)}</span>
            <span>Queue {selectedTags.size} · {formatSizeGb(selectedTotalGb)}</span>
            <span className="bonsai-pullmodels-size-source">
              {sizeSource === "live" ? "Live sizes" : "Offline sizes"}
            </span>
          </div>

          {/* One Focusable laid out as a row: Steam moves only along a container's flow, so the two sides are
              its children side by side, and a Down that neither side takes leaves the pair for the dialog's
              footer (Done) instead of stepping from the column into the list (plan 92's About-tab lesson). */}
          <Focusable className="bonsai-pullmodels-split" flow-children="row">
            <PullModelsFiltersColumn
              navRef={columnNavRef}
              apiRef={columnApi}
              filters={filters}
              changeFilters={changeFilters}
              tier={modelPolicyTier}
              nonFossUnlocked={modelPolicyNonFossUnlocked}
              onSelectTier={onSelectModelPolicyTier}
              matchCount={rowTotal}
              modeCounts={modeCounts}
              installedTags={installedTags}
              suggested={recommendedEntries}
              selectedTags={selectedTags}
              onToggleSuggested={toggleSelected}
              pullBusy={pullBusy}
              onPullAccepted={onPullAccepted}
              focusAfterRedraw={focusAfterRedraw}
              okButtonRuns={okButtonRuns}
              toList={enterList}
              upFromTop={leaveTop}
            />
            <div className="bonsai-pullmodels-listside">
              {tryNav.bar({ okButtonRuns, onMoveUp: leaveTop, onMoveDown: moveDownPastSwitch, nested: { before: onBeforeNestedDeckyModal, complete: completeNestedModalClose } })}
              <Focusable
                ref={listRef}
                className="bonsai-pullmodels-list"
                aria-busy={loadingMeta}
                {...({ navRef: listNavRef } as Record<string, unknown>)}
              >
                {rowTotal > 0 ? (
                  <div className={`bonsai-pullmodels-table${tryNav.enabled ? " bonsai-pullmodels-table--try" : ""}`} role="table">
                    <PullModelsTableHeader headerRef={listHeaderRef} withTry={tryNav.enabled} />
                    <div role="rowgroup">
                      {tableSections.map((section) => (
                        <div key={section.title}>
                          <div className="bonsai-pullmodels-group-title">{section.title}</div>
                          {section.rows.map((row) => {
                            const rowIndex = rowCounter++;
                            if (row.kind === "catalog") {
                              return renderCatalogRow(row.entry, rowIndex);
                            }
                            return renderOtherRow(row.tag, rowIndex);
                          })}
                        </div>
                      ))}
                      {tryNav.pcGroup({ startIndex: rowCounter, bindSelect: bindSelectRef, nav: (i) => rowNavHandlers(i, "select", false), okButtonRuns })}
                    </div>
                  </div>
                ) : (
                  <div className="bonsai-pullmodels-empty">No models match the current filters.</div>
                )}
              </Focusable>
            </div>
          </Focusable>
        </BonsaiModalScope>
  );

  if (embedded) {
    return panelBody;
  }

  return (
    <ConfirmModal
      strTitle="Pull models"
      strDescription={panelBody}
      strOKButtonText={strOKButtonText}
      strCancelButtonText="Cancel"
      onOK={() => {
        if (selectedTags.size === 0 || pullBusy) return;
        void onPullSelected();
      }}
      onCancel={onCancel}
    />
  );
}
