import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, ConfirmModal, Focusable, ToggleField, showModal } from "@decky/ui";
import { toaster } from "@decky/api";
import {
  PULL_MODEL_CATALOG,
  PULL_MODEL_CATALOG_TAGS,
  PULL_MODEL_FILTER_OPTIONS,
  PULL_MODEL_GROUP_LABELS,
  PULL_MODEL_GROUP_ORDER,
  bytesToGb,
  formatGtaStars,
  formatReleasedYm,
  formatSizeGb,
  isCatalogModelTag,
  type PullModelEntry,
  type PullModelFilterId,
  type PullModelGroup,
} from "../data/pullModelCatalog";
import { OLLAMA_LOCAL_ON_DECK_DEFAULT_PCIP } from "../utils/settingsAndResponse";
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS, formatDeckyRpcError } from "../utils/deckyCall";

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

export type PullModelsModalProps = {
  activeRoutingTag: string | null;
  onCancel: () => void;
  onPullAccepted: () => void;
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

function resolveRowSizeGb(
  entry: PullModelEntry,
  liveSizes: Record<string, number | undefined>
): number {
  const live = liveSizes[entry.tag];
  if (typeof live === "number" && live > 0) return live;
  return entry.sizeGb;
}

function entryMatchesFilter(entry: PullModelEntry, filter: PullModelFilterId): boolean {
  if (filter === "all") return true;
  if (filter === "chat") return entry.tags.includes("chat");
  if (filter === "vision") return entry.tags.includes("vision") || entry.tags.includes("ocr");
  if (filter === "strategy") return entry.tags.includes("strategy");
  if (filter === "coding") return entry.tags.includes("coding");
  return true;
}

/**
 * Pass only to `showModal()` — `ConfirmModal` supplies Steam modal chrome.
 */
export function PullModelsModal(props: PullModelsModalProps) {
  const { activeRoutingTag, onCancel, onPullAccepted } = props;

  const [installedTags, setInstalledTags] = useState<Set<string>>(() => new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(() => new Set());
  const [filterId, setFilterId] = useState<PullModelFilterId>("all");
  const [fossOnly, setFossOnly] = useState(false);
  const [installedOnly, setInstalledOnly] = useState(false);
  const [sizeSource, setSizeSource] = useState<"live" | "offline">("offline");
  const [liveSizeGbByTag, setLiveSizeGbByTag] = useState<Record<string, number>>({});
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [refreshingMeta, setRefreshingMeta] = useState(false);
  const [pullBusy, setPullBusy] = useState(false);
  const [deleteBusyTag, setDeleteBusyTag] = useState<string | null>(null);
  const stretchConfirmedRef = useRef<Set<string>>(new Set());

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
      return true;
    });
  }, [filterId, fossOnly, installedOnly, installedTags]);

  const groupedCatalog = useMemo(() => {
    const map = new Map<PullModelGroup, PullModelEntry[]>();
    for (const g of PULL_MODEL_GROUP_ORDER) map.set(g, []);
    for (const entry of filteredCatalog) {
      map.get(entry.group)?.push(entry);
    }
    return map;
  }, [filteredCatalog]);

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

  const toggleSelected = useCallback(
    (entry: PullModelEntry) => {
      if (isTagInstalled(entry.tag, installedTags)) return;
      if (entry.group === "stretch" && !stretchConfirmedRef.current.has(entry.tag)) {
        showModal(
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
            }}
            onCancel={() => {}}
          />
        );
        return;
      }
      setSelectedTags((prev) => {
        const next = new Set(prev);
        if (next.has(entry.tag)) next.delete(entry.tag);
        else next.add(entry.tag);
        return next;
      });
    },
    [installedTags, liveSizeGbByTag]
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
      showModal(
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
          onCancel={() => {}}
        />
      );
    },
    [activeRoutingTag, refreshInstalledAndMeta]
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

  const renderCatalogRow = (entry: PullModelEntry) => {
    const installed = isTagInstalled(entry.tag, installedTags);
    const selected = selectedTags.has(entry.tag);
    const sizeGb = resolveRowSizeGb(entry, liveSizeGbByTag);
    const deleteDisabled =
      Boolean(activeRoutingTag && activeRoutingTag === entry.tag) || deleteBusyTag === entry.tag;
    const rowClass = [
      "bonsai-pullmodels-row",
      installed ? "bonsai-pullmodels-row--installed" : "",
      entry.group === "stretch" ? "bonsai-pullmodels-row--stretch" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div key={entry.tag} className={rowClass}>
        <Focusable className="bonsai-pullmodels-row-inner" flow-children="horizontal">
          {installed ? (
            <span className="bonsai-pullmodels-slot bonsai-pullmodels-slot--installed" aria-label="Installed">
              *
            </span>
          ) : (
            <Button
              className={`bonsai-pullmodels-slot${selected ? " bonsai-pullmodels-slot--selected" : ""}`}
              onClick={() => toggleSelected(entry)}
              aria-label={selected ? `Deselect ${entry.tag}` : `Select ${entry.tag} to pull`}
            >
              {selected ? "v" : " "}
            </Button>
          )}
          <div className="bonsai-pullmodels-row-body">
            <div className="bonsai-pullmodels-row-head">
              <span className="bonsai-pullmodels-tag">{entry.tag}</span>
              {installed ? <span className="bonsai-pullmodels-installed-label">INSTALLED</span> : null}
              <span className="bonsai-pullmodels-size">{formatSizeGb(sizeGb)}</span>
              <span className="bonsai-pullmodels-date">{formatReleasedYm(entry.releasedYm)}</span>
              <span className="bonsai-pullmodels-license">{entry.license}</span>
              <span className="bonsai-pullmodels-stars">{formatGtaStars(entry.rating)}</span>
              {entry.licenseClass === "foss" ? <span className="bonsai-pullmodels-chip bonsai-pullmodels-chip--foss">FOSS</span> : null}
            </div>
            <div className="bonsai-pullmodels-blurb">{entry.blurb}</div>
            <div className="bonsai-pullmodels-tags-line">
              Tags: {entry.tags.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(" · ")}
            </div>
          </div>
          {installed ? (
            <Button
              className="bonsai-pullmodels-delete-btn"
              disabled={deleteDisabled}
              aria-disabled={deleteDisabled}
              aria-label={
                deleteDisabled && activeRoutingTag === entry.tag
                  ? "Switch Ask mode first to remove this model."
                  : "Remove from Deck"
              }
              onClick={() => confirmDelete(entry.tag, sizeGb)}
            >
              X
            </Button>
          ) : null}
        </Focusable>
      </div>
    );
  };

  const renderOtherRow = (tag: string) => {
    const sizeGb = liveSizeGbByTag[tag] ?? 0;
    const deleteDisabled = Boolean(activeRoutingTag && activeRoutingTag === tag) || deleteBusyTag === tag;
    return (
      <div key={`other-${tag}`} className="bonsai-pullmodels-row bonsai-pullmodels-row--installed bonsai-pullmodels-row--other">
        <Focusable className="bonsai-pullmodels-row-inner" flow-children="horizontal">
          <span className="bonsai-pullmodels-slot bonsai-pullmodels-slot--installed">*</span>
          <div className="bonsai-pullmodels-row-body">
            <div className="bonsai-pullmodels-row-head">
              <span className="bonsai-pullmodels-tag">{tag}</span>
              <span className="bonsai-pullmodels-installed-label">INSTALLED</span>
              <span className="bonsai-pullmodels-size">{sizeGb > 0 ? formatSizeGb(sizeGb) : "(unknown)"}</span>
              <span className="bonsai-pullmodels-date">(unknown)</span>
              <span className="bonsai-pullmodels-license">(unknown)</span>
              <span className="bonsai-pullmodels-stars">--</span>
            </div>
            <div className="bonsai-pullmodels-blurb">
              Pulled outside this catalog; metadata not curated. Delete to free disk.
            </div>
          </div>
          <Button
            className="bonsai-pullmodels-delete-btn"
            disabled={deleteDisabled}
            aria-disabled={deleteDisabled}
            aria-label={
              deleteDisabled && activeRoutingTag === tag
                ? "Switch Ask mode first to remove this model."
                : "Remove from Deck"
            }
            onClick={() => confirmDelete(tag, sizeGb)}
          >
            X
          </Button>
        </Focusable>
      </div>
    );
  };

  const strOKButtonText =
    selectedTags.size > 0
      ? `Pull selected (${selectedTags.size}) · ${formatSizeGb(selectedTotalGb)}`
      : "Pull selected";

  return (
    <ConfirmModal
      strTitle="Pull Models — choose what to download to this Deck"
      strDescription={
        <div className="bonsai-pullmodels-shell bonsai-prose">
          <div className="bonsai-pullmodels-header">
            <span>
              Installed: {installedCatalogCount} · {formatSizeGb(installedTotalGb)}
            </span>
            <span>
              Selected: {selectedTags.size} · {formatSizeGb(selectedTotalGb)}
            </span>
            <span className="bonsai-pullmodels-size-source">
              Sizes: {sizeSource === "live" ? "live (Ollama registry)" : "bundled (offline)"}
              <Button
                className="bonsai-pullmodels-refresh-btn"
                disabled={refreshingMeta || loadingMeta}
                onClick={() => void refreshInstalledAndMeta(true)}
                aria-label="Refresh sizes from registry"
              >
                R
              </Button>
            </span>
          </div>

          <div className="bonsai-pullmodels-filters">
            <Focusable flow-children="horizontal" className="bonsai-pullmodels-filter-chips">
              {PULL_MODEL_FILTER_OPTIONS.map((opt) => (
                <Button
                  key={opt.id}
                  className={`bonsai-pullmodels-chip${filterId === opt.id ? " bonsai-pullmodels-chip--active" : ""}`}
                  onClick={() => setFilterId(opt.id)}
                >
                  {opt.label}
                </Button>
              ))}
            </Focusable>
            <div className="bonsai-pullmodels-toggles">
              <ToggleField label="Installed only" checked={installedOnly} onChange={(c) => setInstalledOnly(c)} />
              <ToggleField label="FOSS only" checked={fossOnly} onChange={(c) => setFossOnly(c)} />
            </div>
          </div>

          <div className="bonsai-pullmodels-list" aria-busy={loadingMeta}>
            {PULL_MODEL_GROUP_ORDER.map((group) => {
              const rows = groupedCatalog.get(group) ?? [];
              if (rows.length === 0) return null;
              return (
                <div key={group} className="bonsai-pullmodels-group">
                  <div className="bonsai-pullmodels-group-title">{PULL_MODEL_GROUP_LABELS[group]}</div>
                  {rows.map(renderCatalogRow)}
                </div>
              );
            })}
            {!installedOnly && otherInstalledTags.length > 0 ? (
              <div className="bonsai-pullmodels-group">
                <div className="bonsai-pullmodels-group-title">Other installed (not in curated catalog)</div>
                {otherInstalledTags.map(renderOtherRow)}
              </div>
            ) : null}
            {filteredCatalog.length === 0 && (installedOnly ? otherInstalledTags.length === 0 : true) ? (
              <div className="bonsai-pullmodels-empty">No models match the current filters.</div>
            ) : null}
          </div>
        </div>
      }
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
