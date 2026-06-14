import { useCallback, useEffect, useMemo, useRef, useState, type RefCallback } from "react";
import { Button, ConfirmModal, Focusable, showModal } from "@decky/ui";
import { toaster } from "@decky/api";
import {
  PULL_MODEL_CATALOG,
  PULL_MODEL_CATALOG_TAGS,
  PULL_MODEL_FILTER_OPTIONS,
  PULL_MODEL_GROUP_LABELS,
  PULL_MODEL_GROUP_ORDER,
  PULL_MODEL_RATING_COLUMN_LABEL,
  bytesToGb,
  comparePullModelEntriesNewestFirst,
  formatGtaStars,
  formatPullModelTags,
  formatReleasedYmShort,
  formatSizeGb,
  isCatalogModelTag,
  isDeckDailyPullModel,
  type PullModelEntry,
  type PullModelFilterId,
  type PullModelGroup,
} from "../data/pullModelCatalog";
import { isDeprioritizedOllamaTag } from "../data/deprioritizedModels";
import { OLLAMA_LOCAL_ON_DECK_DEFAULT_PCIP } from "../utils/settingsAndResponse";
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS, formatDeckyRpcError } from "../utils/deckyCall";
import { BonsaiModalScope } from "./BonsaiModalScope";
import { recommendPullModelsForGaps } from "../utils/pullModelRecommendations";

const TEST_CONNECTION_TIMEOUT_SECONDS = 10;
const LOCAL_LOOPBACK_CONNECTION_TEST_RPC_EXTRA_MS = 42000;

type CatalogMetadataResponse = {
  source?: "live" | "offline";
  error?: string;
  fetched_at?: number | null;
  tags?: Record<string, { size_bytes?: number | null; exists?: boolean }>;
};

type ConnectionTestResult = {
  reachable?: boolean;
  models?: string[];
  error?: string;
};

type VisibleCatalogRow = { kind: "catalog"; entry: PullModelEntry; group: PullModelGroup };
type VisibleOtherRow = { kind: "other"; tag: string };
type VisibleTableRow = VisibleCatalogRow | VisibleOtherRow;

type TableSection = {
  title: string;
  rows: VisibleTableRow[];
};

export type PullModelsFooterState = {
  okText: string;
  onOk: () => void;
  okDisabled: boolean;
};

export type PullModelsModalProps = {
  activeRoutingTag: string | null;
  onBeforeNestedDeckyModal?: () => void;
  onCompleteNestedDeckyModalClose?: (close: () => void) => void;
  onCancel: () => void;
  onPullAccepted: () => void;
  /** When true, render panel body only (for AI models hub). */
  embedded?: boolean;
  onFooterStateChange?: (state: PullModelsFooterState) => void;
};

function normalizeInstalledSet(models: string[]): Set<string> {
  const s = new Set<string>();
  for (const m of models) {
    const t = (m || "").trim();
    if (t) s.add(t);
  }
  return s;
}

function isTagInstalled(tag: string, installed: Set<string>): boolean {
  if (installed.has(tag)) return true;
  if (installed.has(`${tag}:latest`)) return true;
  const base = tag.split(":")[0];
  for (const inst of installed) {
    if (inst === tag || inst.startsWith(`${tag}:`)) return true;
    if (tag.includes(":") && inst.split(":")[0] === base && inst === tag) return true;
  }
  return false;
}

function resolveRowSizeGb(entry: PullModelEntry, liveSizes: Record<string, number | undefined>): number {
  const live = liveSizes[entry.tag];
  if (typeof live === "number" && live > 0) return live;
  return entry.sizeGb;
}

function entryMatchesFilter(entry: PullModelEntry, filter: PullModelFilterId): boolean {
  if (filter === "all") return true;
  if (filter === "speed") return entry.tags.includes("chat");
  if (filter === "vision") return entry.tags.includes("vision") || entry.tags.includes("ocr");
  if (filter === "strategy") return entry.tags.includes("strategy");
  if (filter === "expert") {
    return entry.group === "stretch" || (entry.tags.includes("strategy") && entry.rating >= 5);
  }
  if (filter === "coding") return entry.tags.includes("coding");
  return true;
}

/**
 * Pass only to `showModal()` — `ConfirmModal` supplies Steam modal chrome.
 */
export function PullModelsModal(props: PullModelsModalProps) {
  const {
    activeRoutingTag,
    onBeforeNestedDeckyModal,
    onCompleteNestedDeckyModalClose,
    onCancel,
    onPullAccepted,
    embedded = false,
    onFooterStateChange,
  } = props;

  const [installedTags, setInstalledTags] = useState<Set<string>>(() => new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(() => new Set());
  const [filterId, setFilterId] = useState<PullModelFilterId>("all");
  const [fossOnly, setFossOnly] = useState(false);
  const [installedOnly, setInstalledOnly] = useState(false);
  const [deckDailyOnly, setDeckDailyOnly] = useState(false);
  const [sizeSource, setSizeSource] = useState<"live" | "offline">("offline");
  const [liveSizeGbByTag, setLiveSizeGbByTag] = useState<Record<string, number>>({});
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [refreshingMeta, setRefreshingMeta] = useState(false);
  const [pullBusy, setPullBusy] = useState(false);
  const [deleteBusyTag, setDeleteBusyTag] = useState<string | null>(null);
  const stretchConfirmedRef = useRef<Set<string>>(new Set());
  const shellRef = useRef<HTMLDivElement | null>(null);
  const filterChipRefs = useRef<(HTMLElement | null)[]>([]);
  const installedOnlyRef = useRef<HTMLElement | null>(null);
  const fossOnlyRef = useRef<HTMLElement | null>(null);
  const deckDailyOnlyRef = useRef<HTMLElement | null>(null);
  const footerPullRef = useRef<HTMLElement | null>(null);
  const selectCellRefs = useRef<(HTMLElement | null)[]>([]);
  const deleteCellRefs = useRef<(HTMLElement | null)[]>([]);

  const refreshInstalledAndMeta = useCallback(async (metaOnly = false) => {
    if (!metaOnly) setLoadingMeta(true);
    else setRefreshingMeta(true);
    try {
      const tasks: Promise<unknown>[] = [];
      if (!metaOnly) {
        tasks.push(
          callDeckyWithTimeout<[string, number], ConnectionTestResult>(
            "test_ollama_connection",
            [OLLAMA_LOCAL_ON_DECK_DEFAULT_PCIP, TEST_CONNECTION_TIMEOUT_SECONDS],
            TEST_CONNECTION_TIMEOUT_SECONDS * 1000 + LOCAL_LOOPBACK_CONNECTION_TEST_RPC_EXTRA_MS
          ).then((res) => {
            if (res.reachable && Array.isArray(res.models)) {
              setInstalledTags(normalizeInstalledSet(res.models));
            }
          })
        );
      }
      tasks.push(
        callDeckyWithTimeout<[string[]], CatalogMetadataResponse>(
          "fetch_ollama_catalog_metadata",
          [[...PULL_MODEL_CATALOG_TAGS]],
          DECKY_RPC_TIMEOUT_MS
        ).then((meta) => {
          const src = meta.source === "live" ? "live" : "offline";
          setSizeSource(src);
          const next: Record<string, number> = {};
          const tagMap = meta.tags ?? {};
          for (const [tag, info] of Object.entries(tagMap)) {
            const b = info?.size_bytes;
            if (typeof b === "number" && b > 0) next[tag] = bytesToGb(b);
          }
          setLiveSizeGbByTag(next);
        })
      );
      await Promise.all(tasks);
    } catch (e) {
      setSizeSource("offline");
      if (!metaOnly) {
        toaster.toast({
          title: "Could not refresh models",
          body: formatDeckyRpcError(e),
          duration: 5000,
        });
      }
    } finally {
      setLoadingMeta(false);
      setRefreshingMeta(false);
    }
  }, []);

  useEffect(() => {
    void refreshInstalledAndMeta(false);
  }, [refreshInstalledAndMeta]);

  const otherInstalledTags = useMemo(() => {
    const out: string[] = [];
    for (const t of installedTags) {
      if (!isCatalogModelTag(t)) out.push(t);
    }
    out.sort((a, b) => a.localeCompare(b));
    return out;
  }, [installedTags]);

  const filteredCatalog = useMemo(() => {
    return PULL_MODEL_CATALOG.filter((entry) => {
      if (fossOnly && entry.licenseClass !== "foss") return false;
      if (!entryMatchesFilter(entry, filterId)) return false;
      if (installedOnly && !isTagInstalled(entry.tag, installedTags)) return false;
      if (deckDailyOnly && !isDeckDailyPullModel(entry)) return false;
      return true;
    });
  }, [filterId, fossOnly, installedOnly, deckDailyOnly, installedTags]);

  const groupedCatalog = useMemo(() => {
    const map = new Map<PullModelGroup, PullModelEntry[]>();
    for (const g of PULL_MODEL_GROUP_ORDER) map.set(g, []);
    for (const entry of filteredCatalog) {
      map.get(entry.group)?.push(entry);
    }
    for (const g of PULL_MODEL_GROUP_ORDER) {
      map.get(g)?.sort(comparePullModelEntriesNewestFirst);
    }
    return map;
  }, [filteredCatalog]);

  const tableSections = useMemo((): TableSection[] => {
    const sections: TableSection[] = [];
    for (const group of PULL_MODEL_GROUP_ORDER) {
      const entries = groupedCatalog.get(group) ?? [];
      if (!entries.length) continue;
      sections.push({
        title: PULL_MODEL_GROUP_LABELS[group],
        rows: entries.map((entry) => ({ kind: "catalog", entry, group })),
      });
    }
    if (!installedOnly && otherInstalledTags.length > 0) {
      sections.push({
        title: "Other installed (not in curated catalog)",
        rows: otherInstalledTags.map((tag) => ({ kind: "other", tag })),
      });
    }
    return sections;
  }, [groupedCatalog, installedOnly, otherInstalledTags]);

  const flatRows = useMemo(() => tableSections.flatMap((s) => s.rows), [tableSections]);

  const installedCatalogCount = useMemo(() => {
    let n = 0;
    for (const e of PULL_MODEL_CATALOG) {
      if (isTagInstalled(e.tag, installedTags)) n += 1;
    }
    return n + otherInstalledTags.length;
  }, [installedTags, otherInstalledTags.length]);

  const installedTotalGb = useMemo(() => {
    let sum = 0;
    for (const e of PULL_MODEL_CATALOG) {
      if (isTagInstalled(e.tag, installedTags)) sum += resolveRowSizeGb(e, liveSizeGbByTag);
    }
    for (const t of otherInstalledTags) {
      sum += liveSizeGbByTag[t] ?? 0;
    }
    return sum;
  }, [installedTags, otherInstalledTags, liveSizeGbByTag]);

  const selectedTotalGb = useMemo(() => {
    let sum = 0;
    for (const tag of selectedTags) {
      const entry = PULL_MODEL_CATALOG.find((e) => e.tag === tag);
      if (entry) sum += resolveRowSizeGb(entry, liveSizeGbByTag);
    }
    return sum;
  }, [selectedTags, liveSizeGbByTag]);

  const focusInstalledOnlyToggle = useCallback((): boolean => {
    installedOnlyRef.current?.focus();
    return Boolean(installedOnlyRef.current);
  }, []);

  const focusFossOnlyToggle = useCallback((): boolean => {
    fossOnlyRef.current?.focus();
    return Boolean(fossOnlyRef.current);
  }, []);

  const focusDeckDailyOnlyToggle = useCallback((): boolean => {
    deckDailyOnlyRef.current?.focus();
    return Boolean(deckDailyOnlyRef.current);
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

  const focusFilterChip = useCallback((index: number): boolean => {
    const list = filterChipRefs.current.filter(Boolean) as HTMLElement[];
    if (!list.length) return false;
    const i = Math.max(0, Math.min(index, list.length - 1));
    list[i]?.focus();
    list[i]?.scrollIntoView({ block: "nearest", inline: "nearest" });
    return true;
  }, []);

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
          return (
            focusDeckDailyOnlyToggle() ||
            focusFossOnlyToggle() ||
            focusInstalledOnlyToggle() ||
            focusFilterChip(PULL_MODEL_FILTER_OPTIONS.length - 1)
          );
        }
        if (focusPrevRowSelect(rowIndex)) return true;
        return (
          focusDeckDailyOnlyToggle() ||
          focusFossOnlyToggle() ||
          focusInstalledOnlyToggle() ||
          focusFilterChip(PULL_MODEL_FILTER_OPTIONS.length - 1)
        );
      },
      onMoveDown: () => {
        if (focusNextRowSelect(rowIndex)) return true;
        if (focusFooterPull()) return true;
        return true;
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
    [
      flatRows.length,
      focusDeckDailyOnlyToggle,
      focusFilterChip,
      focusFossOnlyToggle,
      focusFooterPull,
      focusInstalledOnlyToggle,
      focusNextRowSelect,
      focusPrevRowSelect,
      focusRowCell,
    ]
  );

  const recommendedEntries = useMemo(
    () => recommendPullModelsForGaps(installedTags, { fossOnly, limit: 4 }),
    [installedTags, fossOnly]
  );

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

  const toggleSelected = useCallback(
    (entry: PullModelEntry, ev?: { stopPropagation?: () => void }) => {
      ev?.stopPropagation?.();
      if (isTagInstalled(entry.tag, installedTags)) {
        toaster.toast({
          title: "Already installed",
          body: `${entry.tag} is on this Deck. Use Del to remove it.`,
          duration: 3500,
        });
        return;
      }
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
              setSelectedTags((prev) => {
                const next = new Set(prev);
                next.add(entry.tag);
                return next;
              });
              completeNestedModalClose(() => handle.Close());
            }}
            onCancel={() => completeNestedModalClose(() => handle.Close())}
          />
        );
        return;
      }
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
    },
    [installedTags, liveSizeGbByTag, completeNestedModalClose, onBeforeNestedDeckyModal]
  );

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
      onBeforeNestedDeckyModal?.();
      const handle = showModal(
        <ConfirmModal
          strTitle={`Remove ${tag} from the Deck?`}
          strDescription={
            <div className="bonsai-prose" style={{ fontSize: 12, color: "#9fb7d5", lineHeight: 1.45 }}>
              This will free about {formatSizeGb(sizeGb)} by running <code>ollama rm {tag}</code>. Other models that
              depend on this tag will fall back to the next entry in the Ask-mode chain.
            </div>
          }
          strOKButtonText="Remove model"
          strCancelButtonText="Cancel"
          onOK={() => {
            completeNestedModalClose(() => handle.Close());
            void (async () => {
              setDeleteBusyTag(tag);
              try {
                const res = await callDeckyWithTimeout<[string], { ok?: boolean; error?: string; removed?: string }>(
                  "delete_ollama_model",
                  [tag],
                  DECKY_RPC_TIMEOUT_MS
                );
                if (res.ok) {
                  toaster.toast({ title: "Model removed", body: tag, duration: 4000 });
                  setSelectedTags((prev) => {
                    const next = new Set(prev);
                    next.delete(tag);
                    return next;
                  });
                  await refreshInstalledAndMeta(false);
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
          onCancel={() => completeNestedModalClose(() => handle.Close())}
        />
      );
    },
    [activeRoutingTag, refreshInstalledAndMeta, completeNestedModalClose, onBeforeNestedDeckyModal]
  );

  const onPullSelected = useCallback(async () => {
    if (selectedTags.size === 0) return;
    setPullBusy(true);
    try {
      const tags = [...selectedTags];
      const res = await callDeckyWithTimeout<[string[]], { accepted?: boolean; reason?: string }>(
        "pull_ollama_models",
        [tags],
        DECKY_RPC_TIMEOUT_MS
      );
      if (res.accepted) {
        toaster.toast({
          title: "Pull started",
          body: `${tags.length} model(s) — watch progress in Settings.`,
          duration: 5000,
        });
        onPullAccepted();
      } else {
        toaster.toast({
          title: "Pull not started",
          body: res.reason || "Setup busy or local Ollama is off.",
          duration: 5000,
        });
      }
    } catch (e) {
      toaster.toast({ title: "Pull failed", body: formatDeckyRpcError(e), duration: 5000 });
    } finally {
      setPullBusy(false);
    }
  }, [onPullAccepted, selectedTags]);

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
      entry.group === "stretch" ? "bonsai-pullmodels-table-row--stretch" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div key={entry.tag} className={rowClass} role="row">
        <div className="bonsai-pullmodels-col bonsai-pullmodels-col--pull" role="cell">
          {installed ? (
            <Button
              ref={bindSelectRef(rowIndex)}
              focusable
              className="bonsai-pullmodels-slot bonsai-pullmodels-slot--installed"
              aria-label={`Installed ${entry.tag}`}
              onClick={(ev) => ev.stopPropagation()}
              {...(navSelect as Record<string, unknown>)}
            >
              *
            </Button>
          ) : (
            <Button
              ref={bindSelectRef(rowIndex)}
              focusable
              className={`bonsai-pullmodels-slot${selected ? " bonsai-pullmodels-slot--selected" : ""}`}
              onClick={(ev) => toggleSelected(entry, ev)}
              aria-label={selected ? `Deselect ${entry.tag}` : `Select ${entry.tag} to pull`}
              {...(navSelect as Record<string, unknown>)}
            >
              {selected ? "✔" : ""}
            </Button>
          )}
        </div>
        <div className="bonsai-pullmodels-col bonsai-pullmodels-col--model" role="cell">
          <span className="bonsai-pullmodels-model-line">
            <span className="bonsai-pullmodels-tag-name">
              {entry.tag}
              {isDeprioritizedOllamaTag(entry.tag) ? " !" : ""}
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
              onClick={() => confirmDelete(entry.tag, sizeGb)}
              {...(navDelete as Record<string, unknown>)}
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
            className="bonsai-pullmodels-slot bonsai-pullmodels-slot--installed"
            aria-label={`Installed ${tag}`}
            onClick={(ev) => ev.stopPropagation()}
            {...(rowNavHandlers(rowIndex, "select", true) as Record<string, unknown>)}
          >
            *
          </Button>
        </div>
        <div className="bonsai-pullmodels-col bonsai-pullmodels-col--model" role="cell">
          <span className="bonsai-pullmodels-model-line">
            <span className="bonsai-pullmodels-tag-name">{tag}</span>
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
            onClick={() => confirmDelete(tag, sizeGb)}
            {...(navDelete as Record<string, unknown>)}
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
  const lastFilterIndex = PULL_MODEL_FILTER_OPTIONS.length - 1;

  useEffect(() => {
    if (!embedded || !onFooterStateChange) return;
    onFooterStateChange({
      okText: strOKButtonText,
      onOk: () => {
        if (selectedTags.size === 0 || pullBusy) return;
        void onPullSelected();
      },
      okDisabled: selectedTags.size === 0 || pullBusy,
    });
  }, [embedded, onFooterStateChange, strOKButtonText, selectedTags.size, pullBusy, onPullSelected]);

  const panelBody = (
        <BonsaiModalScope shellRef={shellRef} className="bonsai-pullmodels-shell bonsai-prose">
          <div className="bonsai-pullmodels-header">
            <span>Installed {installedCatalogCount} · {formatSizeGb(installedTotalGb)}</span>
            <span>Queue {selectedTags.size} · {formatSizeGb(selectedTotalGb)}</span>
            <span className="bonsai-pullmodels-size-source">
              {sizeSource === "live" ? "Live sizes" : "Offline sizes"}
              <Button
                className="bonsai-pullmodels-refresh-btn"
                disabled={refreshingMeta || loadingMeta}
                onClick={(ev) => {
                  ev.stopPropagation();
                  void refreshInstalledAndMeta(true);
                }}
                aria-label="Refresh sizes from registry"
              >
                ↻
              </Button>
            </span>
          </div>

          {recommendedEntries.length > 0 ? (
            <div className="bonsai-pullmodels-recommend">
              <div className="bonsai-pullmodels-recommend-title">Suggested</div>
              <Focusable flow-children="horizontal" className="bonsai-pullmodels-recommend-row">
                {recommendedEntries.map((entry) => {
                  const selected = selectedTags.has(entry.tag);
                  return (
                    <Button
                      key={`rec-${entry.tag}`}
                      className={`bonsai-pullmodels-chip${selected ? " bonsai-pullmodels-chip--active" : ""}`}
                      onClick={(ev) => toggleSelected(entry, ev)}
                      aria-label={selected ? `Remove ${entry.tag} from queue` : `Queue ${entry.tag}`}
                    >
                      {entry.tag}
                    </Button>
                  );
                })}
              </Focusable>
            </div>
          ) : null}

          <div className="bonsai-pullmodels-filters">
            <Focusable flow-children="horizontal" className="bonsai-pullmodels-filter-chips">
              {PULL_MODEL_FILTER_OPTIONS.map((opt, chipIndex) => (
                <Button
                  key={opt.id}
                  ref={(el) => {
                    filterChipRefs.current[chipIndex] = el;
                  }}
                  className={`bonsai-pullmodels-chip${filterId === opt.id ? " bonsai-pullmodels-chip--active" : ""}`}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    setFilterId(opt.id);
                  }}
                  {...({
                    onMoveLeft: () => (chipIndex > 0 ? focusFilterChip(chipIndex - 1) : false),
                    onMoveRight: () => (chipIndex < lastFilterIndex ? focusFilterChip(chipIndex + 1) : false),
                    onMoveDown: () => focusInstalledOnlyToggle() || focusRowCell(0, "select") || focusFooterPull(),
                  } as unknown as Record<string, unknown>)}
                >
                  {opt.label}
                </Button>
              ))}
            </Focusable>
            <Focusable flow-children="horizontal" className="bonsai-pullmodels-toggles">
              <Button
                ref={(el) => {
                  installedOnlyRef.current = el;
                }}
                className={`bonsai-pullmodels-chip${installedOnly ? " bonsai-pullmodels-chip--active" : ""}`}
                onClick={(ev) => {
                  ev.stopPropagation();
                  setInstalledOnly((v) => !v);
                }}
                {...({
                  onMoveUp: () => focusFilterChip(lastFilterIndex),
                  onMoveRight: () => focusFossOnlyToggle(),
                  onMoveDown: () =>
                    focusRowCell(0, "select") || (selectedTags.size > 0 ? focusFooterPull() : false),
                } as unknown as Record<string, unknown>)}
                aria-pressed={installedOnly}
              >
                Installed only
              </Button>
              <Button
                ref={(el) => {
                  fossOnlyRef.current = el;
                }}
                className={`bonsai-pullmodels-chip bonsai-pullmodels-chip--foss${fossOnly ? " bonsai-pullmodels-chip--active" : ""}`}
                onClick={(ev) => {
                  ev.stopPropagation();
                  setFossOnly((v) => !v);
                }}
                {...({
                  onMoveLeft: () => focusInstalledOnlyToggle(),
                  onMoveRight: () => focusDeckDailyOnlyToggle(),
                  onMoveUp: () => focusFilterChip(lastFilterIndex),
                  onMoveDown: () =>
                    focusRowCell(0, "select") || (selectedTags.size > 0 ? focusFooterPull() : false),
                } as unknown as Record<string, unknown>)}
                aria-pressed={fossOnly}
              >
                FOSS only
              </Button>
              <Button
                ref={(el) => {
                  deckDailyOnlyRef.current = el;
                }}
                className={`bonsai-pullmodels-chip${deckDailyOnly ? " bonsai-pullmodels-chip--active" : ""}`}
                onClick={(ev) => {
                  ev.stopPropagation();
                  setDeckDailyOnly((v) => !v);
                }}
                {...({
                  onMoveLeft: () => focusFossOnlyToggle(),
                  onMoveUp: () => focusFilterChip(lastFilterIndex),
                  onMoveDown: () =>
                    focusRowCell(0, "select") || (selectedTags.size > 0 ? focusFooterPull() : false),
                } as unknown as Record<string, unknown>)}
                aria-pressed={deckDailyOnly}
                aria-label="Deck daily only — hides Expert (large) models that run slowly on Deck"
              >
                Deck daily
              </Button>
            </Focusable>
          </div>

          <div className="bonsai-pullmodels-list" aria-busy={loadingMeta}>
            {flatRows.length > 0 ? (
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
