/**
 * Title: Developer tab
 *
 * Purpose: The Developer tab, only visible once Developer Mode is turned
 * on. It is for troubleshooting and testing bonsAI itself, not for changing
 * how the AI answers: captured crash logs, which tab reopens the plugin,
 * whether app activity gets written to Desktop as a log file, a Steam Web
 * API key for ban lookups, and a handful of QA-only controls for testing
 * the preset chip carousel and the knowledge base.
 *
 * Used for: The Developer tab in index.tsx, shown only when Developer Mode
 * is on.
 *
 * Solves: Keeps every troubleshooting and QA control in one out-of-the-way
 * tab that an ordinary user never sees, instead of scattered through the
 * tabs everyone uses.
 *
 * Does not: Change anything about how Ask works for a normal user — most of
 * these rows exist to test or debug the plugin itself, and several are
 * gated behind their own developer settings and capabilities on top of
 * Developer Mode.
 *
 * How it works:
 *
 *     ┌─ Developer tab ──────────────────────────────────────┐
 *     │ Knowledge base (dev QA)  <- only when a seed-install  │
 *     │                             callback was passed in    │
 *     │ Diagnostics              <- HUD toggle, warm-at-boot, │
 *     │                             captured errors, loaded   │
 *     │                             models                    │
 *     │ Navigation               <- which tab reopens the     │
 *     │                             plugin (A/B/C buttons)    │
 *     │ Logging & exports        <- Desktop log level,        │
 *     │                             auto-save chat, verbose   │
 *     │                             Ask log, preset animation,│
 *     │                             QA session-RAG + frozen   │
 *     │                             test chips                │
 *     │ Integrations             <- Steam Web API key         │
 *     └────────────────────────────────────────────────────────┘
 *
 * 1. Every row here is a plain panel row; Steam's own default vertical flow
 *    moves the D-pad between them, since nothing in this file wires a
 *    custom onMoveUp/onMoveDown.
 * 2. The "Tab to open on" and "App activity logging" rows are each a
 *    horizontal row of buttons built from a fixed option list
 *    (TAB_RESUME_MODE_OPTIONS, DESKTOP_APP_LOG_LEVEL_OPTIONS) — press one
 *    to select it, styled to show which is active.
 * 3. runInstallSeedKb() drives the one asynchronous action on this tab: it
 *    disables its own button while running, calls the passed-in
 *    onInstallSeedKnowledgeBase, and shows a toast only if that fails.
 * 4. Everything else here reads and writes one setting directly — a
 *    toggle, a text field, or a small button row — with no local state of
 *    its own; every change goes straight back out through the setter it
 *    was handed.
 */
import React from "react";
import {
  Button,
  ButtonItem,
  Focusable,
  PanelSection,
  PanelSectionRow,
  TextField,
  ToggleField,
} from "@decky/ui";
import { toaster } from "@decky/api";
import {
  DESKTOP_APP_LOG_LEVEL_OPTIONS,
  PRESET_CHIP_ANIMATION_OPTIONS,
  STEAM_WEB_API_KEY_MAX_LEN,
  TAB_RESUME_MODE_OPTIONS,
  TAB_RESUME_RECENT_WINDOW_MS,
  type DesktopAppLogLevel,
  type TabResumeMode,
} from "../data/bonsaiSettingsSchema";
import { formatDeckyRpcError } from "../utils/deckyCall";
import { PermissionDenyAction } from "./PermissionDenyAction";
import type { BonsaiCapabilityKey } from "../utils/permissionDeepLink";

const desktopAppLogLevelLabel: Record<DesktopAppLogLevel, string> = {
  off: "Off",
  default: "Default",
  verbose: "Verbose",
};
const desktopAppLogLevelDescription: Record<DesktopAppLogLevel, string> = {
  off: "No app activity log file on Desktop.",
  default: "Summary events (connection tests, asks, settings changes).",
  verbose: "Default events plus RPC details, setup log lines, and frontend errors.",
};

const TAB_RESUME_RECENT_WINDOW_MINUTES = Math.round(TAB_RESUME_RECENT_WINDOW_MS / 60000);

// Labelled by roadmap option letter on purpose: this control exists to compare D15 A/B/C
// on-device, so the mapping back to the decision record should be readable from the Deck.
const tabResumeModeLabel: Record<TabResumeMode, string> = {
  always_main: "A · Main",
  resume: "B · Resume",
  resume_recent: `C · ${TAB_RESUME_RECENT_WINDOW_MINUTES} min`,
};
const tabResumeModeDescription: Record<TabResumeMode, string> = {
  always_main: "Every reopen starts on Main, whatever tab you left from.",
  resume: "Reopen lands on the tab you left. Shipped default.",
  resume_recent: `Reopen resumes the tab within ${TAB_RESUME_RECENT_WINDOW_MINUTES} minutes, then falls back to Main.`,
};

export type DeveloperConnectionStatus = {
  reachable: boolean;
  version?: string;
  models?: string[];
  ps_loaded?: Array<{
    name: string;
    size_bytes: number;
    size_vram_bytes: number;
    vram_weight_share_pct_appx: number | null;
  }>;
  error?: string;
  recovery_attempted?: boolean;
};

export type DeveloperTabProps = {
  capturedErrors: string[];
  onClearErrors: () => void;
  onSteamInputPhase1Jump?: () => void;
  lastConnectionStatus?: DeveloperConnectionStatus | null;

  desktopDebugNoteAutoSave: boolean;
  setDesktopDebugNoteAutoSave: (v: boolean) => void;
  desktopAskVerboseLogging: boolean;
  setDesktopAskVerboseLogging: (v: boolean) => void;
  desktopAppLogLevel: DesktopAppLogLevel;
  setDesktopAppLogLevel: (v: DesktopAppLogLevel) => void;
  filesystemWrite: boolean;
  onJumpToPermission?: (capability: BonsaiCapabilityKey) => void;

  presetChipFadeAnimationEnabled: boolean;
  setPresetChipFadeAnimationEnabled: (v: boolean) => void;
  presetChipAnimation: import("../data/bonsaiSettingsSchema").PresetChipAnimation;
  setPresetChipAnimation: (v: import("../data/bonsaiSettingsSchema").PresetChipAnimation) => void;

  steamWebApiKey: string;
  setSteamWebApiKey: (v: string) => void;

  showOnscreenDebugHud: boolean;
  setShowOnscreenDebugHud: (v: boolean) => void;
  devForceSessionRagChips: boolean;
  setDevForceSessionRagChips: (v: boolean) => void;
  /** Warm the default Ask model into memory at boot so the first question skips the cold load. */
  devPreloadAskModel: boolean;
  setDevPreloadAskModel: (v: boolean) => void;
  /** QA: exact questions pinned into the preset carousel, in order. Empty means normal sampling. */
  devFrozenTestChips: string[];
  setDevFrozenTestChips: (v: string[]) => void;
  ragHybridRetrievalEnabled: boolean;
  setRagHybridRetrievalEnabled: (v: boolean) => void;
  tabResumeMode: TabResumeMode;
  setTabResumeMode: (v: TabResumeMode) => void;
  /** Dev/QA: install seed KB from Deck path (build.ps1 deploy). */
  onInstallSeedKnowledgeBase?: () => Promise<void>;
};

/**
 * The whole tab. See "How it works" above for the layout and flow.
 *
 * In: every developer-facing setting this tab shows, plus a setter for
 * each one, the list of captured runtime errors and a callback to clear
 * them, and the last connection test's result (used only to list which
 * models are currently loaded).
 * Out: the panel sections in the order drawn above.
 *
 * What can go wrong: nothing here talks to the backend except
 * runInstallSeedKb() — every other row is a direct settings read/write.
 */
export const DeveloperTab: React.FC<DeveloperTabProps> = ({
  capturedErrors,
  onClearErrors,
  onSteamInputPhase1Jump,
  lastConnectionStatus,
  desktopDebugNoteAutoSave,
  setDesktopDebugNoteAutoSave,
  desktopAskVerboseLogging,
  setDesktopAskVerboseLogging,
  desktopAppLogLevel,
  setDesktopAppLogLevel,
  filesystemWrite,
  onJumpToPermission,
  setPresetChipFadeAnimationEnabled,
  presetChipAnimation,
  setPresetChipAnimation,
  steamWebApiKey,
  setSteamWebApiKey,
  showOnscreenDebugHud,
  setShowOnscreenDebugHud,
  devForceSessionRagChips,
  setDevForceSessionRagChips,
  devPreloadAskModel,
  setDevPreloadAskModel,
  devFrozenTestChips,
  setDevFrozenTestChips,
  ragHybridRetrievalEnabled,
  setRagHybridRetrievalEnabled,
  tabResumeMode,
  setTabResumeMode,
  onInstallSeedKnowledgeBase,
}) => {
  const [seedKbBusy, setSeedKbBusy] = React.useState(false);

  const runInstallSeedKb = () => {
    if (!onInstallSeedKnowledgeBase || seedKbBusy) return;
    setSeedKbBusy(true);
    void onInstallSeedKnowledgeBase()
      .catch((e: unknown) => {
        toaster.toast({
          title: "Seed KB install failed",
          body: formatDeckyRpcError(e),
          duration: 8000,
        });
      })
      .finally(() => setSeedKbBusy(false));
  };

  return (
    <div
      className="bonsai-tab-panel-shell bonsai-tab-panel-shell--tight bonsai-settings-section-stack"
      data-bonsai-tab-panel="developer"
    >
      {onInstallSeedKnowledgeBase ? (
        <PanelSection title="Knowledge base (dev QA)">
          <PanelSectionRow>
            <div className="bonsai-settings-bleed" style={{ fontSize: 12, color: "#9fb7d5", lineHeight: 1.45 }}>
              Public HF/GitHub download is not live yet. <strong>build.ps1</strong> copies a seed corpus (DRG
              Survivor + OoT alias sample) to the Deck. Install it into <code>~/.bonsai/rag</code> for Phase 1
              testing. Hybrid retrieval also needs vectorized seed + <strong>nomic-embed-text</strong> on your Ask
              Ollama host.
            </div>
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem layout="below" disabled={seedKbBusy} onClick={runInstallSeedKb}>
              {seedKbBusy ? "Installing seed knowledge base…" : "Install seed knowledge base"}
            </ButtonItem>
          </PanelSectionRow>
          <PanelSectionRow>
            <div className="bonsai-settings-bleed" style={{ width: "100%" }}>
              <ToggleField
                label="Hybrid retrieval (meaning search)"
                description="On, the knowledge base ranks cards by keyword match and meaning together. Off, it uses keyword match only — cards still attach, and Show details says Keyword search (hybrid disabled). Turn it off to tell a retrieval problem apart from an embedding one."
                checked={ragHybridRetrievalEnabled}
                onChange={(checked) => setRagHybridRetrievalEnabled(checked)}
              />
            </div>
          </PanelSectionRow>
        </PanelSection>
      ) : null}
      <PanelSection title="Diagnostics">
        <PanelSectionRow>
          <div className="bonsai-settings-bleed" style={{ width: "100%" }}>
            <ToggleField
              label="On-screen debug HUD"
              description="Shows a small translucent log at the bottom of the plugin (focus, tab changes, ingest). Off by default so Settings and connection UI stay readable."
              checked={showOnscreenDebugHud}
              onChange={(checked) => setShowOnscreenDebugHud(checked)}
            />
            <ToggleField
              label="Warm the Ask model at boot"
              description="Loads the default Ask model into memory when the plugin starts, so the first question skips the cold load. Only ever warms a model of 3B parameters or under, and skips quietly if memory is tight — no error, no stuck status line."
              checked={devPreloadAskModel}
              onChange={(checked) => setDevPreloadAskModel(checked)}
            />
          </div>
        </PanelSectionRow>
        {onSteamInputPhase1Jump ? (
          <PanelSectionRow>
            <div className="bonsai-settings-bleed" style={{ fontSize: 12, color: "#9fb7d5", marginBottom: 6 }}>
              Experimental: opens per-game controller configuration for the running game. Requires a focused/running
              title.
            </div>
            <ButtonItem layout="below" onClick={onSteamInputPhase1Jump}>
              Jump to Steam Input (running game)
            </ButtonItem>
          </PanelSectionRow>
        ) : null}
        <PanelSectionRow>
          <div style={{ fontSize: 13, color: "gray", marginBottom: 4 }}>
            Captured runtime errors appear below.
          </div>
        </PanelSectionRow>
        {capturedErrors.length > 0 ? (
          <PanelSectionRow>
            <ButtonItem layout="below" onClick={onClearErrors}>
              <span style={{ fontSize: 12 }}>Clear ({capturedErrors.length})</span>
            </ButtonItem>
          </PanelSectionRow>
        ) : null}
        {capturedErrors.length === 0 ? (
          <PanelSectionRow>
            <div style={{ color: "gray", fontSize: 13 }}>No errors captured.</div>
          </PanelSectionRow>
        ) : (
          capturedErrors.map((err, i) => (
            <PanelSectionRow key={`err-${i}`}>
              <Focusable
                onActivate={() => {}}
                noFocusRing={false}
                style={{
                  background: "#111",
                  padding: 8,
                  color: "tomato",
                  whiteSpace: "pre-wrap",
                  fontSize: 11,
                  lineHeight: "1.3",
                  borderRadius: 4,
                  wordBreak: "break-word",
                }}
              >
                {err}
              </Focusable>
            </PanelSectionRow>
          ))
        )}
        {lastConnectionStatus?.reachable && lastConnectionStatus.ps_loaded && lastConnectionStatus.ps_loaded.length > 0 ? (
          <PanelSectionRow>
            <div className="bonsai-prose bonsai-settings-bleed" style={{ fontSize: 11, color: "#b8dfe8", lineHeight: 1.4 }}>
              <div style={{ fontWeight: 600, marginBottom: 4, color: "#9fb7d5" }}>
                Last connection test — loaded models (GPU share)
              </div>
              {lastConnectionStatus.ps_loaded.map((m) => (
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
        ) : null}
      </PanelSection>

      <PanelSection title="Navigation">
        <PanelSectionRow>
          {/*
            Same shape as the app-log-level row below: one `Focusable` with horizontal flow owning
            three leaf `Button`s. That row is shipped and its D-pad behaviour is known good, so the
            new control inherits a focus graph rather than inventing one.
          */}
          <div className="bonsai-prose-host bonsai-settings-bleed" style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
            <div style={{ color: "#d9d9d9", fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
              Tab to open on (D15)
            </div>
            <div className="bonsai-prose" style={{ fontSize: 11, color: "#9fb7d5", marginBottom: 8, lineHeight: 1.35 }}>
              {tabResumeModeDescription[tabResumeMode]} Takes effect the next time you close and
              reopen the plugin.
            </div>
            <Focusable
              flow-children="horizontal"
              style={{ display: "flex", gap: 6, width: "100%", minWidth: 0, maxWidth: "100%", alignItems: "stretch" }}
            >
              {TAB_RESUME_MODE_OPTIONS.map((mode) => {
                const active = mode === tabResumeMode;
                return (
                  <Button
                    key={mode}
                    onClick={() => setTabResumeMode(mode)}
                    style={{
                      flex: 1,
                      minHeight: 36,
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "4px 4px",
                      borderRadius: 4,
                      border: active ? "1px solid rgba(56,189,248,0.55)" : "1px solid rgba(255,255,255,0.12)",
                      background: active
                        ? "linear-gradient(180deg, rgba(56,189,248,0.22) 0%, rgba(14,116,144,0.35) 100%)"
                        : "rgba(255,255,255,0.04)",
                      color: active ? "#e0f2fe" : "#9fb0c0",
                    }}
                    aria-label={`${tabResumeModeLabel[mode]}: ${tabResumeModeDescription[mode]}`}
                  >
                    {tabResumeModeLabel[mode]}
                  </Button>
                );
              })}
            </Focusable>
          </div>
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title="Logging & exports">
        <PanelSectionRow>
          <div className="bonsai-prose-host bonsai-settings-bleed" style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
            <div style={{ color: "#d9d9d9", fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
              App activity logging to Desktop
            </div>
            <div className="bonsai-prose" style={{ fontSize: 11, color: "#9fb7d5", marginBottom: 8, lineHeight: 1.35 }}>
              {desktopAppLogLevelDescription[desktopAppLogLevel]} Writes{" "}
              <span style={{ color: "#9ce7ff" }}>bonsai-app-YYYY-MM-DD.log</span> under Desktop/bonsAI_logs/.
              {!filesystemWrite ? (
                onJumpToPermission ? (
                  <div style={{ marginTop: 6 }}>
                    <PermissionDenyAction
                      capability="filesystem_write"
                      message="Enable Save files to Desktop in Permissions to save logs."
                      onJump={onJumpToPermission}
                      compact
                    />
                  </div>
                ) : (
                <span style={{ display: "block", marginTop: 6, color: "#fbbf24" }}>
                  Enable Save files to Desktop in Permissions to save logs.
                </span>
                )
              ) : null}
            </div>
            <Focusable
              flow-children="horizontal"
              style={{ display: "flex", gap: 6, width: "100%", minWidth: 0, maxWidth: "100%", alignItems: "stretch" }}
            >
              {DESKTOP_APP_LOG_LEVEL_OPTIONS.map((level) => {
                const active = level === desktopAppLogLevel;
                return (
                  <Button
                    key={level}
                    onClick={() => setDesktopAppLogLevel(level)}
                    style={{
                      flex: 1,
                      minHeight: 36,
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "4px 4px",
                      borderRadius: 4,
                      border: active ? "1px solid rgba(56,189,248,0.55)" : "1px solid rgba(255,255,255,0.12)",
                      background: active
                        ? "linear-gradient(180deg, rgba(56,189,248,0.22) 0%, rgba(14,116,144,0.35) 100%)"
                        : "rgba(255,255,255,0.04)",
                      color: active ? "#e0f2fe" : "#9fb0c0",
                    }}
                    aria-label={`${desktopAppLogLevelLabel[level]}: ${desktopAppLogLevelDescription[level]}`}
                  >
                    {desktopAppLogLevelLabel[level]}
                  </Button>
                );
              })}
            </Focusable>
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <div className="bonsai-settings-bleed" style={{ width: "100%" }}>
            <ToggleField
              label="Auto-save chat to Desktop notes"
              description="Append Q+A to Desktop/bonsAI_logs/bonsai-chat-YYYY-MM-DD.md (UTC). Needs Save files to Desktop."
              checked={desktopDebugNoteAutoSave}
              onChange={(checked) => setDesktopDebugNoteAutoSave(checked)}
            />
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <div className="bonsai-settings-bleed" style={{ width: "100%" }}>
            <ToggleField
              label="Verbose Ask logging to Desktop notes"
              description="Full Ollama trace to bonsai-ask-trace-*.md under Desktop/bonsAI_logs. Can be large/sensitive."
              checked={desktopAskVerboseLogging}
              onChange={(checked) => setDesktopAskVerboseLogging(checked)}
            />
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <div className="bonsai-settings-bleed" style={{ width: "100%" }}>
            <div style={{ color: "#d9d9d9", fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Preset suggestions</div>
            <Focusable flow-children="horizontal" style={{ display: "flex", gap: 6, width: "100%" }}>
              {PRESET_CHIP_ANIMATION_OPTIONS.map((mode) => (
                <Button
                  key={mode}
                  onClick={() => {
                    setPresetChipAnimation(mode);
                    setPresetChipFadeAnimationEnabled(mode === "fade");
                  }}
                  style={{
                    flex: 1,
                    minHeight: 32,
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 4,
                    border:
                      mode === presetChipAnimation
                        ? "1px solid rgba(56,189,248,0.55)"
                        : "1px solid rgba(255,255,255,0.12)",
                    background:
                      mode === presetChipAnimation
                        ? "linear-gradient(180deg, rgba(56,189,248,0.22) 0%, rgba(14,116,144,0.35) 100%)"
                        : "rgba(255,255,255,0.04)",
                    color: mode === presetChipAnimation ? "#e0f2fe" : "#9fb0c0",
                  }}
                  aria-label={`Preset animation: ${mode}`}
                >
                  {mode}
                </Button>
              ))}
            </Focusable>
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <div className="bonsai-settings-bleed" style={{ width: "100%" }}>
            <ToggleField
              label="Force session RAG chips (QA)"
              description="Always fill preset carousel slots from the knowledge base instead of a 30% chance each, and reseed the chips immediately. For verifying SESSION-RAG-CHIPS-01 without waiting on the roll. Needs Use local knowledge base on and a covered game running."
              checked={devForceSessionRagChips}
              onChange={(checked) => setDevForceSessionRagChips(checked)}
            />
            <div style={{ marginTop: 10 }}>
              <div style={{ color: "#d9d9d9", fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                Frozen test chips (QA)
              </div>
              <div
                className="bonsai-prose"
                style={{ fontSize: 11, color: "#9fb7d5", marginBottom: 6, lineHeight: 1.35 }}
              >
                {devFrozenTestChips.length === 0 ? (
                  <>
                    None pinned — the carousel is sampling normally. A pinned batch replaces the
                    carousel with exact questions in order and stops it reseeding, so a QA row is one
                    press per case instead of typing the sentence. Set the list from the host while
                    preparing a run.
                  </>
                ) : (
                  <>
                    <span style={{ color: "#9ce7ff" }}>{devFrozenTestChips.length} pinned.</span> The
                    carousel is showing these and will not reseed. Session RAG chips are suppressed
                    while a batch is active, so corpus-chip checks cannot pass until you clear it.
                  </>
                )}
              </div>
              {devFrozenTestChips.length > 0 ? (
                <ol
                  className="bonsai-prose"
                  style={{ fontSize: 11, color: "#c8d8ea", margin: "0 0 6px 0", paddingLeft: 18, lineHeight: 1.4 }}
                >
                  {devFrozenTestChips.map((text) => (
                    <li key={text}>{text}</li>
                  ))}
                </ol>
              ) : null}
              {devFrozenTestChips.length > 0 ? (
                <ButtonItem layout="below" onClick={() => setDevFrozenTestChips([])}>
                  Clear frozen test chips
                </ButtonItem>
              ) : null}
            </div>
          </div>
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title="Integrations">
        <PanelSectionRow>
          <div className="bonsai-settings-bleed" style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
            <div style={{ color: "#d9d9d9", fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Steam Web API key</div>
            <div className="bonsai-prose" style={{ fontSize: 11, color: "#9fb7d5", marginBottom: 6, lineHeight: 1.35 }}>
              For the <span style={{ color: "#9ce7ff" }}>bonsai:vac-check</span> command. Enable Steam ban lookup in
              Permissions. Stored on this device.
            </div>
            <TextField
              label=""
              value={steamWebApiKey}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const v = e.target.value.slice(0, STEAM_WEB_API_KEY_MAX_LEN);
                setSteamWebApiKey(v);
              }}
            />
          </div>
        </PanelSectionRow>
      </PanelSection>
    </div>
  );
};