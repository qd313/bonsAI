import { useCallback, useState } from "react";
import { Button, ButtonItem, ConfirmModal, PanelSection, PanelSectionRow, ToggleField, showModal } from "@decky/ui";
import { toaster } from "@decky/api";
import { readClipboardText } from "../utils/clipboardStash";
import type { IntentPackSummary } from "../hooks/useIntentPacks";

export type SettingsTabIntentPacksSectionProps = {
  summaries: IntentPackSummary[];
  loading: boolean;
  error: string | null;
  onEnabledChange: (packId: string, enabled: boolean) => Promise<boolean>;
  onExport: (packId: string) => Promise<{ ok: boolean; json?: string; error?: string }>;
  onImport: (
    json: string,
    confirm: boolean
  ) => Promise<{
    ok: boolean;
    error?: string;
    conflicts?: Array<{ term: string; existing_target: string; incoming_target: string }>;
    stats?: { added_entries?: number; merged_entries?: number; conflicts?: number };
    pack?: { id?: string; label?: string };
  }>;
  onRemove: (packId: string) => Promise<boolean>;
  onBeforeDeckyModal: () => void;
  onCompleteDeckyModalClose: (close: () => void) => void;
};

export function SettingsTabIntentPacksSection(props: SettingsTabIntentPacksSectionProps) {
  const {
    summaries,
    loading,
    error,
    onEnabledChange,
    onExport,
    onImport,
    onRemove,
    onBeforeDeckyModal,
    onCompleteDeckyModalClose,
  } = props;

  const [busy, setBusy] = useState(false);

  const copyExportJson = useCallback(async (packId: string) => {
    setBusy(true);
    try {
      const result = await onExport(packId);
      if (!result.ok || !result.json) {
        toaster.toast({
          title: "Export failed",
          body: result.error ?? "Unknown error",
          duration: 4000,
        });
        return;
      }
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(result.json);
        toaster.toast({ title: "Pack copied", body: "JSON is on the clipboard.", duration: 3000 });
        return;
      }
      toaster.toast({
        title: "Clipboard unavailable",
        body: result.json.slice(0, 120) + (result.json.length > 120 ? "…" : ""),
        duration: 5000,
      });
    } finally {
      setBusy(false);
    }
  }, [onExport]);

  const runImportFromClipboard = useCallback(async () => {
    setBusy(true);
    try {
      const raw = await readClipboardText();
      if (!raw.trim()) {
        toaster.toast({ title: "Clipboard empty", body: "Copy a pack JSON on your PC first.", duration: 3500 });
        return;
      }
      const preview = await onImport(raw, false);
      if (!preview.ok) {
        toaster.toast({ title: "Import failed", body: preview.error ?? "Invalid pack JSON", duration: 4500 });
        return;
      }
      const packLabel = preview.pack?.label ?? preview.pack?.id ?? "pack";
      const added = preview.stats?.added_entries ?? 0;
      const merged = preview.stats?.merged_entries ?? 0;
      const conflicts = preview.stats?.conflicts ?? preview.conflicts?.length ?? 0;
      const description = [
        `Pack: ${packLabel}`,
        `+${added} new entries, ${merged} merged.`,
        conflicts > 0 ? `${conflicts} term conflict(s) will be skipped.` : "No term conflicts.",
        "Import merges offline search aliases only — settings navigation targets are validated.",
      ].join("\n");

      onBeforeDeckyModal();
      const handle = showModal(
        <ConfirmModal
          strTitle="Import search intent pack?"
          strDescription={description}
          strOKButtonText="Import"
          onOK={async () => {
            const confirmed = await onImport(raw, true);
            onCompleteDeckyModalClose(() => handle.Close());
            if (!confirmed.ok) {
              toaster.toast({
                title: "Import failed",
                body: confirmed.error ?? "Could not save pack",
                duration: 4500,
              });
              return;
            }
            toaster.toast({ title: "Pack imported", body: "Unified search aliases updated.", duration: 3500 });
          }}
          onCancel={() => onCompleteDeckyModalClose(() => handle.Close())}
        />
      );
    } finally {
      setBusy(false);
    }
  }, [onImport, onBeforeDeckyModal, onCompleteDeckyModalClose]);

  const confirmRemove = useCallback(
    (pack: IntentPackSummary) => {
      onBeforeDeckyModal();
      const handle = showModal(
        <ConfirmModal
          strTitle={`Remove ${pack.label}?`}
          strDescription="Imported aliases in this pack will be removed from unified search."
          strOKButtonText="Remove"
          onOK={async () => {
            const ok = await onRemove(pack.id);
            onCompleteDeckyModalClose(() => handle.Close());
            if (!ok) {
              toaster.toast({ title: "Remove failed", body: "Pack could not be removed.", duration: 3500 });
              return;
            }
            toaster.toast({ title: "Pack removed", body: pack.label, duration: 3000 });
          }}
          onCancel={() => onCompleteDeckyModalClose(() => handle.Close())}
        />
      );
    },
    [onRemove, onBeforeDeckyModal, onCompleteDeckyModalClose]
  );

  return (
    <PanelSection title="Search intent packs">
      <PanelSectionRow>
        <div className="bonsai-settings-bleed bonsai-prose" style={{ fontSize: 11, color: "#9fb7d5", lineHeight: 1.35 }}>
          Offline aliases for unified Steam/QAM settings search. Edit pack JSON on a PC, copy to clipboard, then
          import here. Targets must match shipped settings paths (see troubleshooting docs).
        </div>
      </PanelSectionRow>
      {error ? (
        <PanelSectionRow>
          <div style={{ color: "#f87171", fontSize: 12 }}>{error}</div>
        </PanelSectionRow>
      ) : null}
      {loading ? (
        <PanelSectionRow>
          <div style={{ color: "gray", fontSize: 12 }}>Loading packs…</div>
        </PanelSectionRow>
      ) : (
        summaries.map((pack) => (
          <PanelSectionRow key={pack.id}>
            <div className="bonsai-settings-bleed" style={{ width: "100%" }}>
              <ToggleField
                label={`${pack.label} (${pack.entry_count})`}
                description={
                  pack.source === "bundled"
                    ? "Shipped with bonsAI — disable to use native search only for these aliases."
                    : "Imported pack — removable."
                }
                checked={pack.enabled}
                onChange={(checked) => {
                  void onEnabledChange(pack.id, checked);
                }}
              />
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                <Button
                  onClick={() => {
                    void copyExportJson(pack.id);
                  }}
                  disabled={busy}
                  style={{ minHeight: 32, fontSize: 11 }}
                >
                  Export
                </Button>
                {pack.source !== "bundled" ? (
                  <Button
                    onClick={() => confirmRemove(pack)}
                    disabled={busy}
                    style={{ minHeight: 32, fontSize: 11 }}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
          </PanelSectionRow>
        ))
      )}
      <PanelSectionRow>
        <ButtonItem layout="below" disabled={busy} onClick={() => void runImportFromClipboard()}>
          Import from clipboard
        </ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  );
}
