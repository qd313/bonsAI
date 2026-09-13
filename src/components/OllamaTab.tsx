/**
 * Title: Ollama settings tab
 * Purpose: Settings tab for Ollama host, models, knowledge base, reply style, and local AI setup.
 * Used for: index.tsx Ollama tab — connection test, install/update, model routing entry points.
 * Solves: Groups all Ollama-adjacent settings in one focus-graph owner (OllamaTab + child sections).
 * Does not: Run Ask or poll game AI — see Main tab and useBonsaiAskOrchestration.
 */
import React, { useCallback, useRef } from "react";
import { Button, PanelSection, PanelSectionRow, ToggleField } from "@decky/ui";
import { DEFAULT_LATENCY_WARNING_SECONDS, DEFAULT_REQUEST_TIMEOUT_SECONDS, type OllamaKeepAliveDuration } from "../data/bonsaiSettingsSchema";
import { MODEL_POLICY_TIER_LABELS_PLAIN, type ModelPolicyTierId } from "../data/modelPolicy";
import type { DeveloperConnectionStatus } from "./DeveloperTab";
import { OllamaWhereAiRunsSection } from "./OllamaWhereAiRunsSection";
import { KnowledgeBaseSection } from "./KnowledgeBaseSection";
import { SettingsTabConnectionTimeoutSlider } from "./SettingsTabConnectionTimeoutSlider";
import { SettingsTabOllamaKeepAliveSlider } from "./SettingsTabOllamaKeepAliveSlider";
import { OllamaReplyVerbositySlider } from "./OllamaReplyVerbositySlider";
import type { ReplyVerbosityId } from "../data/replyVerbosity";
import type { AskThinkEffortId } from "../data/askThinkEffort";
import { OllamaThinkingEffortRow } from "./OllamaThinkingEffortRow";
import type { NamedOllamaHost } from "../data/bonsaiSettingsSchema";
import { SETTINGS_GLASS_BTN } from "../styles/settingsGlassButton";

export type OllamaTabProps = {
  ollamaIp: string;
  /**
   * The host Ask (and therefore KB hybrid retrieval) actually queries: the Deck-local
   * address when "run on Deck" is on, else the trimmed entry field. The entry field alone
   * is the wrong thing to probe for `nomic-embed-text` -- with local-on-Deck on it can
   * still hold a stale LAN address, so the KB panel would ask a PC whether the Deck has
   * the model and report "not installed" forever.
   */
  effectiveOllamaPcIp: string;
  onOllamaIpChange: (ip: string) => void;
  onPersistOllamaIp: (ip: string) => void;
  ollamaLocalOnDeck: boolean;
  setOllamaLocalOnDeck: (v: boolean) => void;
  ollamaLocalAutostart: boolean;
  setOllamaLocalAutostart: (v: boolean) => void;
  onLastConnectionStatus?: (status: DeveloperConnectionStatus | null) => void;
  lastConnectionStatus?: DeveloperConnectionStatus | null;
  namedOllamaHosts: NamedOllamaHost[];
  setNamedOllamaHosts: React.Dispatch<React.SetStateAction<NamedOllamaHost[]>>;
  onBeforeDeckyModal: () => void;
  onCompleteDeckyModalClose: (close: () => void) => void;
  onOpenOllamaModelsHub: (opts?: { initialSection?: "policy" | "browse" | "advanced" }) => void;
  onOpenRoutingOrderModal: (kind: "text" | "vision") => void;


  latencyWarningSeconds: number;
  requestTimeoutSeconds: number;
  latencyTimeoutsCustomEnabled: boolean;
  setLatencyTimeoutsCustomEnabled: (v: boolean) => void;
  setLatencyWarningSeconds: (v: number) => void;
  setRequestTimeoutSeconds: (v: number) => void;
  ollamaKeepAlive: OllamaKeepAliveDuration;
  setOllamaKeepAlive: (v: OllamaKeepAliveDuration) => void;

  modelPolicyTier: ModelPolicyTierId;
  onApplyTier2MultimodalPolicy?: () => void | Promise<void>;

  useLocalKnowledgeBase: boolean;
  setUseLocalKnowledgeBase: (v: boolean) => void;
  ragCorpusVersion: string;

  replyVerbosity: ReplyVerbosityId;
  setReplyVerbosity: (v: ReplyVerbosityId) => void;
  askThinkEffort: AskThinkEffortId;
  setAskThinkEffort: (v: AskThinkEffortId) => void;
};

export const OllamaTab: React.FC<OllamaTabProps> = ({
  ollamaIp,
  effectiveOllamaPcIp,
  onOllamaIpChange,
  onPersistOllamaIp,
  ollamaLocalOnDeck,
  setOllamaLocalOnDeck,
  ollamaLocalAutostart,
  setOllamaLocalAutostart,
  onLastConnectionStatus,
  lastConnectionStatus,
  namedOllamaHosts,
  setNamedOllamaHosts,
  onBeforeDeckyModal,
  onCompleteDeckyModalClose,
  onOpenOllamaModelsHub,
  onOpenRoutingOrderModal,
  latencyWarningSeconds,
  requestTimeoutSeconds,
  latencyTimeoutsCustomEnabled,
  setLatencyTimeoutsCustomEnabled,
  setLatencyWarningSeconds,
  setRequestTimeoutSeconds,
  ollamaKeepAlive,
  setOllamaKeepAlive,
  modelPolicyTier,
  onApplyTier2MultimodalPolicy,
  useLocalKnowledgeBase,
  setUseLocalKnowledgeBase,
  ragCorpusVersion,
  replyVerbosity,
  setReplyVerbosity,
  askThinkEffort,
  setAskThinkEffort,
}) => {
  const latencyWarningThumbHostRef = useRef<HTMLDivElement>(null);
  const ollamaKeepAliveThumbHostRef = useRef<HTMLDivElement>(null);
  const kbToggleHostRef = useRef<HTMLDivElement>(null);
  const kbDownloadBtnRef = useRef<HTMLButtonElement>(null);
  const kbRemoveBtnRef = useRef<HTMLButtonElement>(null);
  const kbCancelBtnRef = useRef<HTMLButtonElement>(null);
  const connectionTestBtnRef = useRef<HTMLButtonElement>(null);
  const replyVerbosityThumbHostRef = useRef<HTMLDivElement>(null);
  const thinkingEffortHostRef = useRef<HTMLDivElement>(null);

  const focusOllamaKeepAliveThumb = useCallback((): boolean => {
    const host = ollamaKeepAliveThumbHostRef.current;
    if (!host) return false;
    const target = host.querySelector<HTMLElement>("[tabindex], button");
    if (!target) return false;
    target.focus();
    return true;
  }, []);

  const focusLatencyWarningThumb = useCallback((): boolean => {
    const host = latencyWarningThumbHostRef.current;
    if (!host) return false;
    const target = host.querySelector<HTMLElement>("[tabindex], button");
    if (!target) return false;
    target.focus();
    return true;
  }, []);

  const focusKbToggle = useCallback((): boolean => {
    const host = kbToggleHostRef.current;
    if (!host) return false;
    const target = host.querySelector<HTMLElement>("[tabindex], button, input");
    if (!target) return false;
    target.focus();
    return true;
  }, []);


  const focusReplyVerbosityThumb = useCallback((): boolean => {
    const host = replyVerbosityThumbHostRef.current;
    if (!host) return false;
    const target = host.querySelector<HTMLElement>("[tabindex], button");
    if (!target) return false;
    target.focus();
    return true;
  }, []);

  // Element-scoped query on the row's own ref — never a global document.querySelector,
  // which under Decky searches a 14-element shell rather than the plugin's DOM.
  const focusThinkingEffortRow = useCallback((): boolean => {
    const host = thinkingEffortHostRef.current;
    if (!host) return false;
    const target = host.querySelector<HTMLElement>("button:not([disabled])");
    if (!target) return false;
    target.focus();
    return true;
  }, []);

  const focusKbUpFromReplyVerbosity = useCallback((): boolean => {
    // Cancel is checked first because it only exists while a download runs, and during
    // one both of the buttons below it are disabled — focusing either would be a no-op.
    if (kbCancelBtnRef.current) {
      kbCancelBtnRef.current.focus();
      return true;
    }
    if (kbDownloadBtnRef.current) {
      kbDownloadBtnRef.current.focus();
      return true;
    }
    if (kbRemoveBtnRef.current) {
      kbRemoveBtnRef.current.focus();
      return true;
    }
    return focusKbToggle();
  }, [focusKbToggle]);

  const focusConnectionTestBtn = useCallback((): boolean => {
    connectionTestBtnRef.current?.focus();
    return Boolean(connectionTestBtnRef.current);
  }, []);

  const installedCount =
    lastConnectionStatus?.reachable && Array.isArray(lastConnectionStatus.models)
      ? lastConnectionStatus.models.length
      : null;

  return (
    <div
      className="bonsai-tab-panel-shell bonsai-tab-panel-shell--tight bonsai-settings-section-stack"
      data-bonsai-tab-panel="ollama"
    >
      <OllamaWhereAiRunsSection
        ollamaIp={ollamaIp}
        onOllamaIpChange={onOllamaIpChange}
        onPersistOllamaIp={onPersistOllamaIp}
        ollamaLocalOnDeck={ollamaLocalOnDeck}
        setOllamaLocalOnDeck={setOllamaLocalOnDeck}
        ollamaLocalAutostart={ollamaLocalAutostart}
        setOllamaLocalAutostart={setOllamaLocalAutostart}
        onLastConnectionStatus={onLastConnectionStatus}
        namedOllamaHosts={namedOllamaHosts}
        setNamedOllamaHosts={setNamedOllamaHosts}
        onBeforeDeckyModal={onBeforeDeckyModal}
        onCompleteDeckyModalClose={onCompleteDeckyModalClose}
        onOpenOllamaModelsHub={onOpenOllamaModelsHub}
        onApplyTier2MultimodalPolicy={onApplyTier2MultimodalPolicy}
        onMoveDownFromConnectionRow={focusKbToggle}
        connectionTestBtnRef={connectionTestBtnRef}
      />

      <KnowledgeBaseSection
        useLocalKnowledgeBase={useLocalKnowledgeBase}
        setUseLocalKnowledgeBase={setUseLocalKnowledgeBase}
        ragCorpusVersion={ragCorpusVersion}
        ollamaIp={effectiveOllamaPcIp}
        ollamaLocalOnDeck={ollamaLocalOnDeck}
        onBeforeDeckyModal={onBeforeDeckyModal}
        onCompleteDeckyModalClose={onCompleteDeckyModalClose}
        toggleHostRef={kbToggleHostRef}
        downloadBtnRef={kbDownloadBtnRef}
        removeBtnRef={kbRemoveBtnRef}
        cancelBtnRef={kbCancelBtnRef}
        onMoveUpToConnection={focusConnectionTestBtn}
        onMoveDownFromRemove={focusReplyVerbosityThumb}
      />

      <PanelSection title="Reply style">
        <PanelSectionRow>
          <div className="bonsai-prose bonsai-settings-bleed" style={{ fontSize: 11, color: "#9fb7d5", lineHeight: 1.4, marginBottom: 8 }}>
            Bullet-first vs paragraph depth. Ask mode and model routing unchanged.
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <div
            className="bonsai-prose-host bonsai-settings-bleed"
            style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}
          >
            <OllamaReplyVerbositySlider
              value={replyVerbosity}
              onChange={setReplyVerbosity}
              thumbHostRef={replyVerbosityThumbHostRef}
              onMoveUp={focusKbUpFromReplyVerbosity}
              onMoveDown={focusThinkingEffortRow}
            />
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <div className="bonsai-settings-bleed" style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
            <OllamaThinkingEffortRow
              value={askThinkEffort}
              onChange={setAskThinkEffort}
              hostRef={thinkingEffortHostRef}
              onMoveUp={focusReplyVerbosityThumb}
              onMoveDown={focusLatencyWarningThumb}
            />
          </div>
        </PanelSectionRow>
      </PanelSection>


      <PanelSection title="Connection tuning">
        <PanelSectionRow>
          <div className="bonsai-settings-bleed" style={{ width: "100%" }}>
            <ToggleField
              label="Custom timeouts"
              checked={latencyTimeoutsCustomEnabled}
              onChange={(c) => setLatencyTimeoutsCustomEnabled(c)}
            />
          </div>
        </PanelSectionRow>
        {!latencyTimeoutsCustomEnabled ? (
          <PanelSectionRow>
            <div className="bonsai-prose bonsai-settings-bleed" style={{ fontSize: 12, color: "#cdd9e6", lineHeight: 1.4 }}>
              Default:{" "}
              <span style={{ color: "#ffd299", fontWeight: 700 }}>Warning {DEFAULT_LATENCY_WARNING_SECONDS}s</span>
              <span style={{ color: "rgba(255,255,255,0.35)" }}> | </span>
              <span style={{ color: "#9ce7ff", fontWeight: 700 }}>Timeout {DEFAULT_REQUEST_TIMEOUT_SECONDS}s</span>
            </div>
          </PanelSectionRow>
        ) : (
          <PanelSectionRow>
            <div className="bonsai-prose-host bonsai-settings-bleed" style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
              <div className="bonsai-prose" style={{ fontSize: 11, color: "#9fb7d5", lineHeight: 1.35, marginBottom: 6 }}>
                <div>
                  <span style={{ color: "#ffd299", fontWeight: 700 }}>Warning</span>
                  {" = slow-reply nudge"}
                </div>
                <div style={{ marginTop: 4 }}>
                  <span style={{ color: "#9ce7ff", fontWeight: 700 }}>Timeout</span>
                  {" = abort if still busy"}
                </div>
              </div>
              <SettingsTabConnectionTimeoutSlider
                warningSec={latencyWarningSeconds}
                timeoutSec={requestTimeoutSeconds}
                onChange={(w, t) => {
                  setLatencyWarningSeconds(w);
                  setRequestTimeoutSeconds(t);
                }}
                warningThumbHostRef={latencyWarningThumbHostRef}
                onMoveDownFromThumb={focusOllamaKeepAliveThumb}
              />
            </div>
          </PanelSectionRow>
        )}
        <PanelSectionRow>
          <div
            className="bonsai-prose-host bonsai-settings-bleed"
            style={{ width: "100%", maxWidth: "100%", minWidth: 0, marginTop: 16 }}
          >
            <div style={{ color: "#d9d9d9", fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Keep models loaded</div>
            <div className="bonsai-prose" style={{ fontSize: 11, color: "#9fb7d5", marginBottom: 6, lineHeight: 1.35 }}>
              How long Ollama keeps the model in memory after a prompt (VRAM on the host).
            </div>
            <SettingsTabOllamaKeepAliveSlider
              value={ollamaKeepAlive}
              onChange={setOllamaKeepAlive}
              thumbHostRef={ollamaKeepAliveThumbHostRef}
              onMoveUp={latencyTimeoutsCustomEnabled ? focusLatencyWarningThumb : undefined}
            />
          </div>
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title="Models & routing">
        <PanelSectionRow>
          <div className="bonsai-settings-bleed" style={{ width: "100%", minWidth: 0 }}>
            <div className="bonsai-prose" style={{ fontSize: 11, color: "#8fa0b4", lineHeight: 1.35, marginBottom: 8 }}>
              Policy tiers, installed models, pull/delete, and advanced routing.
              {installedCount != null ? (
                <span style={{ display: "block", marginTop: 4, color: "#9fb7d5" }}>
                  Installed on host: {installedCount} model{installedCount === 1 ? "" : "s"}
                </span>
              ) : null}
            </div>
            <Button
              onClick={() => onOpenOllamaModelsHub({ initialSection: "policy" })}
              style={{
                ...SETTINGS_GLASS_BTN,
                width: "100%",
                marginBottom: 8,
              }}
              aria-label="Open AI models hub"
            >
              Open AI models… — {MODEL_POLICY_TIER_LABELS_PLAIN[modelPolicyTier]}
            </Button>
            <Button
              onClick={() => onOpenRoutingOrderModal("text")}
              style={{
                ...SETTINGS_GLASS_BTN,
                width: "100%",
                marginBottom: 8,
              }}
              aria-label="Set text model try order"
            >
              Set text model try order…
            </Button>
            <Button
              onClick={() => onOpenRoutingOrderModal("vision")}
              style={{
                ...SETTINGS_GLASS_BTN,
                width: "100%",
              }}
              aria-label="Set vision model try order"
            >
              Set vision model try order…
            </Button>
          </div>
        </PanelSectionRow>
      </PanelSection>
    </div>
  );
};
