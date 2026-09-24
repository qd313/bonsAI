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
 * Does not: Decide the order bonsAI tries installed models in when
 * answering — see ModelRoutingOrderModal for that. This screen only
 * installs and removes models, and can mark one as the current pick.
 * The New-badge record math lives in utils/pullModelNewBadge.ts, the
 * shared request/prop types live in PullModelsModal.types.ts, and the
 * table/Filters-panel matching and row model live in
 * utils/pullModelFilters.ts — the first two are re-exported below so
 * nothing else needs to change its imports.
 *
 * How it works:
 *
 *     ┌─ Pull models ──────────────────────────────────────────┐
 *     │ Installed N · X GB   Queue N · X GB   catalog/size src ↻ │
 *     │ Custom model tag [______________]  [Pull]                │
 *     │ Filters · N on — Open source only, Vision, Essentials…   │  <- opens a panel that also
 *     │                                                           │     holds the Suggested chips
 *     │ ┌ table ───────────────────────────────────────────┐     │
 *     │ │ Pull│Model      │Size│Date│Modes│Rating │Del      │     │
 *     │ │  ✔  │tag…       │2GB │'24 │chat │★★★☆☆  │  X      │     │
 *     │ │  ☆  │tag…       │…   │…   │…    │…      │         │     │
 *     │ └────────────────────────────────────────────────────┘     │
 *     │        Cancel                    Pull selected (N) · X GB  │
 *     └──────────────────────────────────────────────────────────────┘
 *
 * 1. refreshInstalledAndMeta() runs on mount: refreshes the merged catalog,
 *    tests the connection to this Deck's own Ollama to learn which tags
 *    are already installed, and fetches live size metadata for every
 *    catalog tag — all three in parallel, falling back to offline data on
 *    any failure.
 * 2. Tags are matched against the catalog (isTagInstalled(),
 *    isCatalogModelTagInList()) and filtered — by the licence tier
 *    (entryMatchesLicenceTier(), the same three tiers the old Policy
 *    section chose), the ticked Ask-mode filters (entryMatchesModeFilters()),
 *    installedOnly, essentialsOnly, recentlyAddedOnly — into the grouped,
 *    sectioned table built by tableSections. All six live behind the single
 *    "Filters · N on" row, which opens a panel of tickable rows over the
 *    table itself rather than a permanent row of chips (plan 62, § 3d).
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
 * 6. Every button on the table and the filter row wires its own
 *    Up/Down/Left/Right by hand (rowNavHandlers() for table cells) so the
 *    D-pad walks the grid in a fixed, predictable order instead of
 *    Steam's automatic guess.
 * 7. The whole panel renders two ways: as its own modal by default
 *    (wrapped in ConfirmModal, with Pull selected/Cancel as its footer),
 *    or, when embedded is true, as a bare panel inside another modal (the
 *    AI models hub), reporting its own footer state up through
 *    onFooterStateChange() instead of drawing one.
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
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type RefCallback } from "react";
import { Button, ConfirmModal, Focusable, TextField } from "@decky/ui";
import {
  PULL_MODEL_MODE_FILTER_OPTIONS,
  PULL_MODEL_RATING_COLUMN_LABEL,
  formatGtaStars,
  formatPullModelTags,
  formatReleasedYmShort,
  formatSizeGb,
  isDeckDailyPullModel,
  isEmbeddingOnlyTag,
  type PullModelEntry,
  type PullModelModeFilterId,
} from "../data/pullModelCatalog";
import { isDeprioritizedOllamaTag } from "../data/deprioritizedModels";
import { PULL_MODEL_NEW_BADGE_STORAGE_KEY } from "../data/storageKeys";
import { MODEL_POLICY_PERMISSIONS_INTRO, MODEL_POLICY_TIER_LABELS_PLAIN } from "../data/modelPolicy";
import { BonsaiModalScope } from "./BonsaiModalScope";
import { recommendPullModelsForGaps } from "../utils/pullModelRecommendations";
import { usePullModelCatalog } from "../hooks/usePullModelCatalog";
import { usePullModelTier2Confirm } from "../hooks/usePullModelTier2Confirm";
import { usePullModelToggleSelection } from "../hooks/usePullModelToggleSelection";
import { usePullModelDeleteConfirm } from "../hooks/usePullModelDeleteConfirm";
import { usePullModelPinForAsk } from "../hooks/usePullModelPinForAsk";
import { usePullModelSubmitSelected } from "../hooks/usePullModelSubmitSelected";
import { usePullModelCustomTagPull } from "../hooks/usePullModelCustomTagPull";
import { usePullModelTableData } from "../hooks/usePullModelTableData";
import { usePullModelCatalogRefresh } from "../hooks/usePullModelCatalogRefresh";
import { usePullModelOpenBookkeeping } from "../hooks/usePullModelOpenBookkeeping";
import { isPlausibleOllamaPullTag } from "../utils/mergePullModelCatalog";
import {
  computeUpdatedPullRecord,
  isRecentPullModelTag,
  PULL_MODEL_NEW_BADGE_WINDOW_MS,
  type PullModelPullRecord,
} from "../utils/pullModelNewBadge";
import type { PullModelsModalProps } from "./PullModelsModal.types";
export type { PullModelsFooterState, PullModelsModalProps } from "./PullModelsModal.types";
import {
  filterPanelRowAriaLabel,
  filterPanelRowGroupHeading,
  filterPanelRowKey,
  filterPanelRowLabel,
  findUnavailableRegistryTags,
  isTagInstalled,
  resolveRowSizeGb,
  FILTER_PANEL_ROWS,
  type FilterPanelRow,
} from "../utils/pullModelFilters";
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

/**
 * `.focus()` then `.scrollIntoView()` if the element actually has one — jsdom (this repo's unit
 * test DOM) never implements scrollIntoView, so an unguarded call throws the moment a test drives
 * a focus move through the Filters panel. A real Deck/desktop element always has the method; this
 * only changes behaviour in the test environment that would otherwise crash.
 */
function focusAndReveal(el: HTMLElement | null | undefined): boolean {
  if (!el) return false;
  el.focus();
  if (typeof el.scrollIntoView === "function") {
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
  return true;
}

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
    initialFiltersOpen = false,
  } = props;

  const { mergedCatalog, catalogSource, refreshCatalog } = usePullModelCatalog();
  const [installedTags, setInstalledTags] = useState<Set<string>>(() => new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(() => new Set());
  const [modeFilters, setModeFilters] = useState<Set<PullModelModeFilterId>>(() => new Set());
  const [installedOnly, setInstalledOnly] = useState(false);
  const [essentialsOnly, setEssentialsOnly] = useState(true);
  const [recentlyAddedOnly, setRecentlyAddedOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(() => initialFiltersOpen);
  const [sizeSource, setSizeSource] = useState<"live" | "offline">("offline");
  const [liveSizeGbByTag, setLiveSizeGbByTag] = useState<Record<string, number>>({});
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [refreshingMeta, setRefreshingMeta] = useState(false);
  const [pullBusy, setPullBusy] = useState(false);
  const [deleteBusyTag, setDeleteBusyTag] = useState<string | null>(null);
  const [customTagInput, setCustomTagInput] = useState("");
  /** "Type a model name" collapses to one chip on the Filters row until pressed (plan 62, § 3e
   *  #4) — its own permanent row is gone, so this is the one place that room used to cost. */
  const [customTagEntryOpen, setCustomTagEntryOpen] = useState(false);
  const [customPullBusy, setCustomPullBusy] = useState(false);
  const [pinnedAskTag, setPinnedAskTag] = useState<string | null>(null);
  const [pinBusyTag, setPinBusyTag] = useState<string | null>(null);
  const [pullRecord, setPullRecord] = useState<PullModelPullRecord>({});
  const stretchConfirmedRef = useRef<Set<string>>(new Set());
  const openWeightTierConfirmedRef = useRef<Set<string>>(new Set());
  const shellRef = useRef<HTMLDivElement | null>(null);
  const recommendChipRefs = useRef<(HTMLElement | null)[]>([]);
  const customTagChipRef = useRef<HTMLElement | null>(null);
  const customTagCloseBtnRef = useRef<HTMLElement | null>(null);
  const filtersButtonRef = useRef<HTMLElement | null>(null);
  const filterPanelRowRefs = useRef<(HTMLElement | null)[]>([]);
  const filterPanelCloseBtnRef = useRef<HTMLElement | null>(null);
  const footerPullRef = useRef<HTMLElement | null>(null);
  const selectCellRefs = useRef<(HTMLElement | null)[]>([]);
  const deleteCellRefs = useRef<(HTMLElement | null)[]>([]);

  // Lifted into usePullModelCatalogRefresh. It must stay at exactly this point in the hook
  // list: React matches hooks by the order they run, not by name.
  const { refreshInstalledAndMeta, scheduleFocusFrame } = usePullModelCatalogRefresh({
    refreshCatalog,
    setInstalledTags,
    setSizeSource,
    setLiveSizeGbByTag,
    setLoadingMeta,
    setRefreshingMeta,
  });

  // Lifted into usePullModelOpenBookkeeping. It must stay at exactly this point in the hook
  // list: React matches hooks by the order they run, not by name.
  usePullModelOpenBookkeeping({ installedTags, setPinnedAskTag, setPullRecord });

  // Lifted into usePullModelTableData. It must stay at exactly this point in the hook list:
  // React matches hooks by the order they run, not by name.
  const { tableSections, flatRows, installedCatalogCount, installedTotalGb, selectedTotalGb } = usePullModelTableData({
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

  const focusFiltersButton = useCallback((): boolean => focusAndReveal(filtersButtonRef.current), []);

  /*
   * Put the ring on one entry of a list of refs, clamping the index into range rather than failing
   * on an off-by-one. Shared by the filter rows and the suggestion chips: both walk a ref list by
   * index, and writing it twice was one of the copy-pasted blocks found on 2026-09-20.
   */
  const focusRefInList = useCallback(
    (list: readonly (HTMLElement | null)[], index: number): boolean => {
      const present = list.filter(Boolean) as HTMLElement[];
      if (!present.length) return false;
      const i = Math.max(0, Math.min(index, present.length - 1));
      return focusAndReveal(present[i]);
    },
    []
  );

  const focusFilterPanelRow = useCallback(
    (index: number): boolean => focusRefInList(filterPanelRowRefs.current, index),
    [focusRefInList]
  );

  const focusFilterPanelClose = useCallback(
    (): boolean => focusAndReveal(filterPanelCloseBtnRef.current),
    []
  );

  // Opens straight into the Filters panel, ring on its first row -- the "Manage models" shortcut
  // that used to jump to the standalone Policy section now jumps here instead (initialFiltersOpen).
  // openFiltersPanelEntry is defined further down (it depends on recommendedEntries, computed
  // later) but a deferred effect body can reach it fine -- by the time this ever actually runs,
  // after mount, the whole render below it has already executed.
  useEffect(() => {
    if (!initialFiltersOpen) return;
    const id = window.requestAnimationFrame(() => {
      openFiltersPanelEntry();
    });
    return () => window.cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once, on mount, only
  }, []);

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

  const focusRecommendChip = useCallback(
    (index: number): boolean => focusRefInList(recommendChipRefs.current, index),
    [focusRefInList]
  );

  const focusCustomTagChip = useCallback((): boolean => focusAndReveal(customTagChipRef.current), []);

  /**
   * Where the ring lands the moment the field opens. Not the Pull button: it starts disabled
   * (nothing typed yet), and a disabled button refuses focus like any real one -- an early build
   * of this tried that and the ring silently went nowhere. The close ("×") button is never
   * disabled, so it is always a real place to land.
   */
  const focusCustomTagClose = useCallback((): boolean => focusAndReveal(customTagCloseBtnRef.current), []);

  const focusRowCell = useCallback((rowIndex: number, cell: "select" | "delete"): boolean => {
    if (!flatRows.length) return false;
    const i = Math.max(0, Math.min(rowIndex, flatRows.length - 1));
    const target =
      cell === "select" ? selectCellRefs.current[i] : deleteCellRefs.current[i];
    if (!target) return false;
    target.focus();
    target.scrollIntoView({ block: "nearest", inline: "nearest" });
    return true;
  }, [flatRows.length]);

  const focusNextRowSelect = useCallback(
    (fromIndex: number): boolean => {
      for (let j = fromIndex + 1; j < flatRows.length; j++) {
        if (selectCellRefs.current[j]) return focusRowCell(j, "select");
      }
      return false;
    },
    [flatRows.length, focusRowCell]
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

  const rowNavHandlers = useCallback(
    (rowIndex: number, cell: "select" | "delete", installed: boolean) => ({
      onMoveUp: () => {
        if (cell === "delete") {
          if (focusPrevRowSelect(rowIndex)) return true;
          return focusFiltersButton();
        }
        if (focusPrevRowSelect(rowIndex)) return true;
        return focusFiltersButton();
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
        if (cell === "select" && installed) return focusRowCell(rowIndex, "delete");
        return false;
      },
      onMoveLeft: () => {
        if (cell === "delete") return focusRowCell(rowIndex, "select");
        return false;
      },
    }),
    [flatRows.length, focusFiltersButton, focusFooterPull, focusNextRowSelect, focusPrevRowSelect, focusRowCell]
  );

  const recommendedEntries = useMemo(
    // Dropped fossOnly with the standalone toggle it belonged to (plan 62, § 3d) -- the Licence
    // filter now covers the same ground for the table itself, and a suggestion is worth
    // surfacing regardless of the current licence pick.
    () => recommendPullModelsForGaps(installedTags, { fossOnly: false, limit: 4, catalog: mergedCatalog }),
    [installedTags, mergedCatalog]
  );

  /**
   * Where the ring lands the moment the Filters panel opens: the first Suggested chip if the
   * screen has any right now (plan 62, § 3e #2 moved that block in here from the top of the
   * screen), otherwise straight to the first tickable row. Deliberately a plain function, not a
   * memoized callback -- it has to read the current recommendedEntries every time it runs, and
   * recommendedEntries is computed after this point in the component, so an early useCallback
   * here could only ever close over a stale first render's value.
   */
  function openFiltersPanelEntry(): boolean {
    return recommendedEntries.length > 0 ? focusRecommendChip(0) : focusFilterPanelRow(0);
  }

  /**
   * Opens the Filters panel and moves the ring straight into it — pressing OK on the Filters
   * button should land you *inside* the panel, not merely reveal it (plan 62, § 3d: "the D-pad
   * must get into the panel").
   */
  function openFiltersPanel(): void {
    setFiltersOpen(true);
    scheduleFocusFrame(() => openFiltersPanelEntry());
  }

  /** Closes the panel and returns the ring to the Filters button — the D-pad's way back out. */
  function closeFiltersPanel(): boolean {
    setFiltersOpen(false);
    scheduleFocusFrame(() => focusFiltersButton());
    return true;
  }

  /*
   * B anywhere inside the Filters panel closes the panel, and stops there rather than letting Steam
   * also back out of the whole models screen underneath it. Every control in the panel wants the
   * identical handler, so it is written once: three verbatim copies of it is what pushed this repo's
   * copy-pasted-lines count up by eight on 2026-09-20.
   */
  const cancelClosesFiltersPanel = (e: unknown): boolean => {
    closeFiltersPanel();
    (e as { preventDefault?: () => void })?.preventDefault?.();
    return true;
  };

  /** Closes "Type a model name" without pulling anything, and returns the ring to its chip. */
  function closeCustomTagEntry(): void {
    setCustomTagEntryOpen(false);
    setCustomTagInput("");
    scheduleFocusFrame(() => focusCustomTagChip());
  }

  /*
   * B while typing a model name by hand must back out of just this small field, the same reason
   * cancelClosesFiltersPanel exists for the Filters panel above -- nothing in this row handled B
   * before, so it fell through to the screen's own Cancel and closed the whole picker, losing
   * whatever had been typed (found reading the code 2026-09-20; the Filters panel right next to
   * it already carried exactly this handler for exactly this reason).
   */
  const cancelClosesCustomTagEntry = (e: unknown): boolean => {
    closeCustomTagEntry();
    (e as { preventDefault?: () => void })?.preventDefault?.();
    return true;
  };

  /**
   * A on any control on this screen must run that control's own action and stop there, the same
   * as its `onClick` already does for a mouse -- this screen is a confirm box with its own OK, and
   * Steam delivers A through `onOKButton`, never a DOM click, so a control with only `onClick`
   * loses every A press straight to that OK, closing the whole screen instead of doing anything
   * (found on the Deck 2026-09-21, docs/test-evidence/plan62-MODELS-FILTERS-01-A-closes-screen.json).
   * Every one of the thirteen affected controls wants the identical two-line wrapper, so it is
   * written once rather than inline at each -- the same call this file already made for
   * `cancelClosesFiltersPanel` just above.
   */
  const okButtonRuns = (fn: () => void) => (evt: { stopPropagation: () => void }) => {
    evt.stopPropagation();
    fn();
  };

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

  // Lifted into usePullModelCustomTagPull. It must stay at exactly this point in the hook list:
  // React matches hooks by the order they run, not by name.
  const { onPullCustomTag } = usePullModelCustomTagPull({
    customTagInput,
    customPullBusy,
    pullBusy,
    onPullAccepted,
    focusCustomTagChip,
    setCustomPullBusy,
    setCustomTagInput,
    setCustomTagEntryOpen,
    scheduleFocusFrame,
  });

  const bindSelectRef =
    (rowIndex: number): RefCallback<HTMLElement> =>
    (el) => {
      selectCellRefs.current[rowIndex] = el;
    };

  const bindDeleteRef =
    (rowIndex: number): RefCallback<HTMLElement> =>
    (el) => {
      deleteCellRefs.current[rowIndex] = el;
      if (el) el.tabIndex = -1;
    };

  const renderTableHeader = () => (
    <div className="bonsai-pullmodels-table-row bonsai-pullmodels-table-row--head" role="row">
      <div className="bonsai-pullmodels-col bonsai-pullmodels-col--pull" role="columnheader">Pull</div>
      <div className="bonsai-pullmodels-col bonsai-pullmodels-col--model" role="columnheader">Model</div>
      <div className="bonsai-pullmodels-col" role="columnheader">Size</div>
      <div className="bonsai-pullmodels-col bonsai-pullmodels-col--date" role="columnheader">Date</div>
      <div className="bonsai-pullmodels-col bonsai-pullmodels-col--modes" role="columnheader">Modes</div>
      <div
        className="bonsai-pullmodels-col bonsai-pullmodels-col--rating"
        role="columnheader"
        title="Curated Steam Deck quality — more stars = stronger pick"
      >
        {PULL_MODEL_RATING_COLUMN_LABEL}
      </div>
      <div className="bonsai-pullmodels-col bonsai-pullmodels-col--del" role="columnheader">Del</div>
    </div>
  );

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
      <div key={entry.tag} className={rowClass} role="row">
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
            <span
              className="bonsai-pullmodels-foss-slot"
              aria-hidden={entry.licenseClass !== "foss"}
            >
              {entry.licenseClass === "foss" ? (
                <span className="bonsai-pullmodels-chip bonsai-pullmodels-chip--foss bonsai-pullmodels-chip--foss-inline">
                  FOSS
                </span>
              ) : null}
            </span>
          </span>
        </div>
        <div className="bonsai-pullmodels-col bonsai-pullmodels-col--muted" role="cell">{formatSizeGb(sizeGb)}</div>
        <div className="bonsai-pullmodels-col bonsai-pullmodels-col--muted bonsai-pullmodels-col--date" role="cell">
          {formatReleasedYmShort(entry.releasedYm)}
        </div>
        <div className="bonsai-pullmodels-col bonsai-pullmodels-col--muted bonsai-pullmodels-col--modes" role="cell">
          {formatPullModelTags(entry.tags)}
        </div>
        <div className="bonsai-pullmodels-col bonsai-pullmodels-col--stars" role="cell">
          {formatGtaStars(entry.rating)}
        </div>
        <div className="bonsai-pullmodels-col bonsai-pullmodels-col--del" role="cell">
          {installed ? (
            <Button
              ref={bindDeleteRef(rowIndex)}
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
        <div className="bonsai-pullmodels-col bonsai-pullmodels-col--muted" role="cell">
          {sizeGb > 0 ? formatSizeGb(sizeGb) : "?"}
        </div>
        <div className="bonsai-pullmodels-col bonsai-pullmodels-col--muted bonsai-pullmodels-col--date" role="cell">—</div>
        <div className="bonsai-pullmodels-col bonsai-pullmodels-col--muted bonsai-pullmodels-col--modes" role="cell">Other</div>
        <div className="bonsai-pullmodels-col bonsai-pullmodels-col--stars" role="cell">—</div>
        <div className="bonsai-pullmodels-col bonsai-pullmodels-col--del" role="cell">
          <Button
            ref={bindDeleteRef(rowIndex)}
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

  useEffect(() => {
    if (!embedded || !onFooterStateChange) return;
    onFooterStateChange({
      okText: strOKButtonText,
      onOk: () => {
        if (selectedTags.size === 0 || pullBusy) return;
        void onPullSelected();
      },
      okDisabled: selectedTags.size === 0 || pullBusy,
      hasQueuedPull: selectedTags.size > 0,
    });
  }, [embedded, onFooterStateChange, strOKButtonText, selectedTags.size, pullBusy, onPullSelected]);

  /**
   * "Filters · N on" summary (plan 62, § 3d) — the Licence pick always counts (it is always one
   * of three, never "off"), so N is never 0. Every other filter only appears once ticked.
   */
  const activeFilterLabels: string[] = [
    MODEL_POLICY_TIER_LABELS_PLAIN[modelPolicyTier].replace(" (recommended)", ""),
  ];
  for (const opt of PULL_MODEL_MODE_FILTER_OPTIONS) {
    if (modeFilters.has(opt.id)) activeFilterLabels.push(opt.label);
  }
  if (installedOnly) activeFilterLabels.push("Installed only");
  if (essentialsOnly) activeFilterLabels.push("Essentials only");
  if (recentlyAddedOnly) activeFilterLabels.push("Recently added");

  function isFilterPanelRowChecked(row: FilterPanelRow): boolean {
    if (row.kind === "licence") return modelPolicyTier === row.tier;
    if (row.kind === "mode") return modeFilters.has(row.id);
    if (row.kind === "installedOnly") return installedOnly;
    if (row.kind === "essentialsOnly") return essentialsOnly;
    return recentlyAddedOnly;
  }

  function isFilterPanelRowDisabled(row: FilterPanelRow): boolean {
    return row.kind === "licence" && row.tier === "non_foss" && !modelPolicyNonFossUnlocked;
  }

  function selectFilterPanelRow(row: FilterPanelRow): void {
    if (row.kind === "licence") {
      onSelectModelPolicyTier?.(row.tier);
      return;
    }
    if (row.kind === "mode") {
      setModeFilters((prev) => {
        const next = new Set(prev);
        if (next.has(row.id)) next.delete(row.id);
        else next.add(row.id);
        return next;
      });
      return;
    }
    if (row.kind === "installedOnly") {
      setInstalledOnly((v) => !v);
      return;
    }
    if (row.kind === "essentialsOnly") {
      setEssentialsOnly((v) => !v);
      return;
    }
    setRecentlyAddedOnly((v) => !v);
  }

  /** Walks from `fromIndex` in `dir`, skipping the greyed-out Tier 3 row, and focuses the first
   *  enabled row it finds. Mirrors the table's own focusNextRowSelect/focusPrevRowSelect. */
  function focusFilterPanelRowSkipping(fromIndex: number, dir: 1 | -1): boolean {
    for (let i = fromIndex; i >= 0 && i < FILTER_PANEL_ROWS.length; i += dir) {
      if (!isFilterPanelRowDisabled(FILTER_PANEL_ROWS[i])) return focusFilterPanelRow(i);
    }
    return false;
  }

  function filterPanelRowNav(i: number) {
    return {
      onMoveUp: () => {
        if (i === 0) {
          return recommendedEntries.length > 0
            ? focusRecommendChip(recommendedEntries.length - 1)
            : closeFiltersPanel();
        }
        return focusFilterPanelRowSkipping(i - 1, -1) || closeFiltersPanel();
      },
      onMoveDown: () => focusFilterPanelRowSkipping(i + 1, 1) || focusFilterPanelClose(),
      onMoveLeft: () => true,
      onMoveRight: () => true,
      onCancelButton: cancelClosesFiltersPanel,
    };
  }

  const panelBody = (
        <BonsaiModalScope shellRef={shellRef} className="bonsai-pullmodels-shell bonsai-prose">
          <div className="bonsai-pullmodels-header">
            <span>Installed {installedCatalogCount} · {formatSizeGb(installedTotalGb)}</span>
            <span>Queue {selectedTags.size} · {formatSizeGb(selectedTotalGb)}</span>
            <span className="bonsai-pullmodels-size-source">
              {catalogSource === "live" || catalogSource === "cached" ? "Live catalog" : "Offline catalog"}
              {" · "}
              {sizeSource === "live" ? "Live sizes" : "Offline sizes"}
              <Button
                className="bonsai-pullmodels-refresh-btn"
                disabled={refreshingMeta || loadingMeta}
                onClick={(ev) => {
                  ev.stopPropagation();
                  ev.preventDefault();
                  void refreshInstalledAndMeta(true);
                }}
                aria-label="Refresh model catalog"
                {...({
                  onOKButton: okButtonRuns(() => {
                    if (!refreshingMeta && !loadingMeta) void refreshInstalledAndMeta(true);
                  }),
                } as unknown as Record<string, unknown>)}
              >
                ↻
              </Button>
            </span>
          </div>

          {/*
            "Type a model name" used to be its own permanent row above Filters (a TextField, a
            Pull button, and an occasional hint line). Plan 62, § 3e #4 folds it into one chip
            that shares the Filters row instead -- its own row is gone, at the cost of one extra
            press to reach it. Pressing the chip swaps this same row over to the field itself
            (customTagEntryOpen); the row's height does not change either way, only its content.
            Down from either version of this row reaches the same next stop below, since Filters'
            own button is not always part of the DOM here to hop through.
          */}
          <div className="bonsai-pullmodels-filters">
            {customTagEntryOpen ? (
              <Focusable
                flow-children="horizontal"
                className="bonsai-pullmodels-custom-tag-row"
                {...({ onCancelButton: cancelClosesCustomTagEntry } as unknown as Record<string, unknown>)}
              >
                <TextField
                  label=""
                  value={customTagInput}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setCustomTagInput(e.target.value)}
                  {...({ placeholder: "Custom model tag, e.g. llama3.2:3b" } as unknown as Record<string, unknown>)}
                  style={{ flex: "1 1 auto", minWidth: 0 }}
                />
                <Button
                  className="bonsai-pullmodels-chip bonsai-pullmodels-custom-pull-btn"
                  disabled={!isPlausibleOllamaPullTag(customTagInput) || customPullBusy || pullBusy}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    ev.preventDefault();
                    void onPullCustomTag();
                  }}
                  aria-label="Pull custom model tag"
                  {...({
                    onMoveDown: () =>
                      filtersOpen ? openFiltersPanelEntry() : focusRowCell(0, "select") || focusFooterPull(),
                    onOKButton: okButtonRuns(() => {
                      if (isPlausibleOllamaPullTag(customTagInput) && !customPullBusy && !pullBusy) {
                        void onPullCustomTag();
                      }
                    }),
                  } as unknown as Record<string, unknown>)}
                >
                  {customPullBusy ? "…" : "Pull"}
                </Button>
                <Button
                  ref={(el) => {
                    customTagCloseBtnRef.current = el;
                  }}
                  className="bonsai-pullmodels-chip bonsai-pullmodels-custom-tag-close"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    ev.preventDefault();
                    closeCustomTagEntry();
                  }}
                  aria-label="Close typing a model name by hand"
                  {...({
                    onMoveDown: () =>
                      filtersOpen ? openFiltersPanelEntry() : focusRowCell(0, "select") || focusFooterPull(),
                    onOKButton: okButtonRuns(() => closeCustomTagEntry()),
                  } as unknown as Record<string, unknown>)}
                >
                  ×
                </Button>
              </Focusable>
            ) : (
              <Focusable flow-children="horizontal" className="bonsai-pullmodels-filters-row">
                <Button
                  ref={(el) => {
                    filtersButtonRef.current = el;
                  }}
                  className="bonsai-pullmodels-filters-button"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    ev.preventDefault();
                    if (filtersOpen) closeFiltersPanel();
                    else openFiltersPanel();
                  }}
                  aria-expanded={filtersOpen}
                  aria-label={`Filters, ${activeFilterLabels.length} on: ${activeFilterLabels.join(", ")}`}
                  {...({
                    onMoveDown: () =>
                      filtersOpen ? openFiltersPanelEntry() : focusRowCell(0, "select") || focusFooterPull(),
                    onOKButton: okButtonRuns(() => {
                      if (filtersOpen) closeFiltersPanel();
                      else openFiltersPanel();
                    }),
                  } as unknown as Record<string, unknown>)}
                >
                  <span className="bonsai-pullmodels-filters-button-title">
                    Filters · {activeFilterLabels.length} on
                  </span>
                  <span className="bonsai-pullmodels-filters-button-summary">{activeFilterLabels.join(", ")}</span>
                </Button>
                <Button
                  ref={(el) => {
                    customTagChipRef.current = el;
                  }}
                  className="bonsai-pullmodels-chip bonsai-pullmodels-custom-tag-chip"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    ev.preventDefault();
                    setCustomTagEntryOpen(true);
                    scheduleFocusFrame(() => focusCustomTagClose());
                  }}
                  aria-label="Type a model name by hand"
                  {...({
                    onMoveDown: () =>
                      filtersOpen ? openFiltersPanelEntry() : focusRowCell(0, "select") || focusFooterPull(),
                    onOKButton: okButtonRuns(() => {
                      setCustomTagEntryOpen(true);
                      scheduleFocusFrame(() => focusCustomTagClose());
                    }),
                  } as unknown as Record<string, unknown>)}
                >
                  Type a name
                </Button>
              </Focusable>
            )}
            {customTagEntryOpen && customTagInput.trim() && !isPlausibleOllamaPullTag(customTagInput) ? (
              <div className="bonsai-pullmodels-custom-tag-hint">
                Use lowercase letters, digits, . _ - and an optional :tag
              </div>
            ) : null}
          </div>

          <div className="bonsai-pullmodels-list" aria-busy={loadingMeta}>
            {filtersOpen ? (
              <div className="bonsai-pullmodels-filterpanel" role="group" aria-label="Filters">
                {recommendedEntries.length > 0 ? (
                  <div className="bonsai-pullmodels-recommend">
                    <div className="bonsai-pullmodels-recommend-title">Suggested</div>
                    <Focusable flow-children="horizontal" className="bonsai-pullmodels-recommend-row">
                      {recommendedEntries.map((entry, chipIndex) => {
                        const selected = selectedTags.has(entry.tag);
                        const isFirst = chipIndex === 0;
                        const isLast = chipIndex === recommendedEntries.length - 1;
                        return (
                          <Button
                            key={`rec-${entry.tag}`}
                            ref={(el) => {
                              recommendChipRefs.current[chipIndex] = el;
                            }}
                            className={`bonsai-pullmodels-chip${selected ? " bonsai-pullmodels-chip--active" : ""}`}
                            onClick={(ev) => toggleSelected(entry, ev)}
                            aria-label={selected ? `Remove ${entry.tag} from queue` : `Queue ${entry.tag}`}
                            {...({
                              onMoveUp: () => (isFirst ? closeFiltersPanel() : focusRecommendChip(chipIndex - 1)),
                              onMoveDown: () => (isLast ? focusFilterPanelRow(0) : focusRecommendChip(chipIndex + 1)),
                              onCancelButton: cancelClosesFiltersPanel,
                              onOKButton: okButtonRuns(() => toggleSelected(entry)),
                            } as unknown as Record<string, unknown>)}
                          >
                            {entry.tag}
                          </Button>
                        );
                      })}
                    </Focusable>
                  </div>
                ) : null}
                {FILTER_PANEL_ROWS.map((row, i) => {
                  const heading = filterPanelRowGroupHeading(row);
                  const prevHeading = i > 0 ? filterPanelRowGroupHeading(FILTER_PANEL_ROWS[i - 1]) : null;
                  const checked = isFilterPanelRowChecked(row);
                  const disabled = isFilterPanelRowDisabled(row);
                  const label = filterPanelRowLabel(row);
                  return (
                    <div key={filterPanelRowKey(row)}>
                      {heading !== prevHeading ? (
                        <div className="bonsai-pullmodels-group-title">{heading}</div>
                      ) : null}
                      {heading !== prevHeading && row.kind === "licence" ? (
                        <div className="bonsai-pullmodels-filterpanel-intro">{MODEL_POLICY_PERMISSIONS_INTRO}</div>
                      ) : null}
                      <Button
                        ref={(el) => {
                          filterPanelRowRefs.current[i] = el;
                        }}
                        focusable={!disabled}
                        disabled={disabled}
                        className={`bonsai-pullmodels-filterpanel-row${
                          checked ? " bonsai-pullmodels-filterpanel-row--checked" : ""
                        }`}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          ev.preventDefault();
                          if (!disabled) selectFilterPanelRow(row);
                        }}
                        aria-pressed={checked}
                        aria-label={
                          disabled
                            ? `${filterPanelRowAriaLabel(row)} — enable Tier 3 unlock in Advanced first`
                            : filterPanelRowAriaLabel(row)
                        }
                        {...({
                          ...filterPanelRowNav(i),
                          onOKButton: okButtonRuns(() => {
                            if (!disabled) selectFilterPanelRow(row);
                          }),
                        } as unknown as Record<string, unknown>)}
                      >
                        <span className="bonsai-pullmodels-filterpanel-check" aria-hidden="true">
                          {checked ? "✔" : ""}
                        </span>
                        <span>{label}</span>
                      </Button>
                    </div>
                  );
                })}
                <Button
                  ref={(el) => {
                    filterPanelCloseBtnRef.current = el;
                  }}
                  className="bonsai-pullmodels-filterpanel-close"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    ev.preventDefault();
                    closeFiltersPanel();
                  }}
                  {...({
                    onMoveUp: () => focusFilterPanelRowSkipping(FILTER_PANEL_ROWS.length - 1, -1),
                    onMoveDown: () => true,
                    onMoveLeft: () => true,
                    onMoveRight: () => true,
                    onCancelButton: cancelClosesFiltersPanel,
                    onOKButton: okButtonRuns(() => closeFiltersPanel()),
                  } as unknown as Record<string, unknown>)}
                >
                  Close filters
                </Button>
              </div>
            ) : flatRows.length > 0 ? (
              <div className="bonsai-pullmodels-table" role="table">
                {renderTableHeader()}
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
                </div>
              </div>
            ) : (
              <div className="bonsai-pullmodels-empty">No models match the current filters.</div>
            )}
          </div>
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
