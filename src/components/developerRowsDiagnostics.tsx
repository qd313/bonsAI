/**
 * Title: The Developer tab's Knowledge base (dev QA) and Diagnostics rows
 *
 * Purpose: The rows of the first two Developer sections as lists for SectionRows: the seed install button and
 * the hybrid retrieval switch; the debug HUD and warm-the-model switches, the Steam Input jump, the Clear
 * button, the captured errors (each a stop) and the loaded-models words from the last connection test.
 * One line per setting, their longer words handed to the help strip (developerTabFolds.ts).
 *
 * Used for: DeveloperTab.tsx.
 *
 * Does not: Decide what a button does: the tab hands the callbacks in. Does not wire any D-pad move between
 * rows (SectionRows hands the section's two edges theirs; Steam steps between the rest).
 */
import React from "react";
import { Focusable, PanelSectionRow } from "@decky/ui";

import { DenseSwitchRow } from "../features/folded-tabs/DenseRow";
import { DEVELOPER_ROW_HELP, DEVELOPER_ROW_LABELS } from "../features/folded-tabs/developerTabFolds";
import { textPx } from "../styles/sections/textPx";
import type { DeveloperConnectionStatus } from "./developerConnectionStatus";
import { DevButtonRow, DevNote, type DevRow, type EdgeNav } from "./developerRows";

/** A switch row: Steam's own switch, one line, the longer words in the strip. */
export function DevSwitchRow({
  label,
  help,
  checked,
  onChange,
  nav,
}: {
  label: string;
  help: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  nav: EdgeNav;
}): React.ReactElement {
  return (
    <PanelSectionRow>
      <div className="bonsai-settings-bleed" style={{ width: "100%" }}>
        <DenseSwitchRow label={label} help={help} checked={checked} onChange={onChange} nav={nav as Record<string, unknown>} />
      </div>
    </PanelSectionRow>
  );
}

export function kbRows(args: {
  seedKbBusy: boolean;
  onInstall: () => void;
  hybrid: boolean;
  setHybrid: (v: boolean) => void;
}): DevRow[] {
  return [
    {
      key: "install",
      stop: true,
      render: (nav) => (
        <DevButtonRow
          label={DEVELOPER_ROW_LABELS.installSeedKb}
          help={DEVELOPER_ROW_HELP.installSeedKb}
          nav={nav}
          disabled={args.seedKbBusy}
          onClick={args.onInstall}
        >
          {args.seedKbBusy ? "Installing seed knowledge base…" : "Install seed knowledge base"}
        </DevButtonRow>
      ),
    },
    {
      key: "hybrid",
      stop: true,
      render: (nav) => (
        <DevSwitchRow
          label={DEVELOPER_ROW_LABELS.hybrid}
          help={DEVELOPER_ROW_HELP.hybrid}
          checked={args.hybrid}
          onChange={args.setHybrid}
          nav={nav}
        />
      ),
    },
  ];
}

/** The loaded-models words from the last connection test: words only, nothing to press. */
function LoadedModels({ status }: { status: DeveloperConnectionStatus }): React.ReactElement | null {
  const loaded = status.ps_loaded;
  if (!status.reachable || !loaded || loaded.length === 0) return null;
  return (
    <PanelSectionRow>
      <div className="bonsai-prose bonsai-settings-bleed" style={{ fontSize: textPx(11), color: "#b8dfe8", lineHeight: 1.4 }}>
        <div style={{ fontWeight: 600, marginBottom: 4, color: "#9fb7d5" }}>Last connection test — loaded models (GPU share)</div>
        {loaded.map((m) => (
          <div key={m.name} style={{ marginBottom: 6 }}>
            <span style={{ color: "#9ce7ff" }}>{m.name}</span>
            {m.vram_weight_share_pct_appx != null ? (
              <>
                {": "}
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  ~{m.vram_weight_share_pct_appx}% in GPU-visible VRAM ({m.size_vram_bytes} / {m.size_bytes} B)
                </span>
              </>
            ) : (
              <span style={{ color: "#9fb7d5" }}>: (no size split from Ollama)</span>
            )}
          </div>
        ))}
      </div>
    </PanelSectionRow>
  );
}

/**
 * The Diagnostics section's rows, in order: the two switches, the Steam Input jump (only when a way to it was
 * passed in), a line saying errors appear below, then either Clear and each captured error (all stops) or
 * "No errors captured.", then the loaded-models words from the last connection test.
 */
export function diagnosticsRows(args: {
  hud: boolean;
  setHud: (v: boolean) => void;
  warm: boolean;
  setWarm: (v: boolean) => void;
  onSteamInputPhase1Jump?: () => void;
  capturedErrors: string[];
  onClearErrors: () => void;
  lastConnectionStatus?: DeveloperConnectionStatus | null;
}): DevRow[] {
  const rows: DevRow[] = [
    {
      key: "hud",
      stop: true,
      render: (nav) => (
        <DevSwitchRow
          label={DEVELOPER_ROW_LABELS.hud}
          help={DEVELOPER_ROW_HELP.hud}
          checked={args.hud}
          onChange={args.setHud}
          nav={nav}
        />
      ),
    },
    {
      key: "warm",
      stop: true,
      render: (nav) => (
        <DevSwitchRow
          label={DEVELOPER_ROW_LABELS.warm}
          help={DEVELOPER_ROW_HELP.warm}
          checked={args.warm}
          onChange={args.setWarm}
          nav={nav}
        />
      ),
    },
  ];
  const jump = args.onSteamInputPhase1Jump;
  if (jump) {
    rows.push({
      key: "steam-input",
      stop: true,
      render: (nav) => (
        <DevButtonRow label={DEVELOPER_ROW_LABELS.steamInput} help={DEVELOPER_ROW_HELP.steamInput} nav={nav} onClick={jump}>
          Jump to Steam Input (running game)
        </DevButtonRow>
      ),
    });
  }
  rows.push({ key: "errors-note", render: () => <DevNote size={13}>Captured runtime errors appear below.</DevNote> });
  if (args.capturedErrors.length > 0) {
    rows.push({
      key: "clear",
      stop: true,
      render: (nav) => (
        <DevButtonRow label={`Clear (${args.capturedErrors.length})`} nav={nav} onClick={args.onClearErrors}>
          <span style={{ fontSize: textPx(12) }}>Clear ({args.capturedErrors.length})</span>
        </DevButtonRow>
      ),
    });
    args.capturedErrors.forEach((err, i) => {
      rows.push({
        key: `err-${i}`,
        stop: true,
        render: (nav) => (
          <PanelSectionRow>
            <Focusable
              onActivate={() => {}}
              noFocusRing={false}
              {...({ focusable: true, ...nav } as Record<string, unknown>)}
              style={{
                background: "#111",
                padding: 8,
                color: "tomato",
                whiteSpace: "pre-wrap",
                fontSize: textPx(11),
                lineHeight: "1.3",
                borderRadius: 4,
                wordBreak: "break-word",
              }}
            >
              {err}
            </Focusable>
          </PanelSectionRow>
        ),
      });
    });
  } else {
    rows.push({ key: "no-errors", render: () => <DevNote size={13}>No errors captured.</DevNote> });
  }
  if (args.lastConnectionStatus) {
    const status = args.lastConnectionStatus;
    rows.push({ key: "loaded", render: () => <LoadedModels status={status} /> });
  }
  return rows;
}
