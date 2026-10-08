/**
 * Title: Ollama settings tab
 *
 * Purpose: The whole Ollama tab in Settings — where the AI's address lives,
 * how it decides which model to use, and everything about how it replies.
 * Top to bottom it holds: Where AI runs (its own section,
 * OllamaWhereAiRunsSection), the local knowledge base toggle, Reply style
 * (how detailed replies are and how much thinking happens before
 * answering), Connection tuning (how long to wait before a warning or a
 * timeout, and how long to keep a model loaded in memory), and AI models
 * (one button into the AI models box, which holds browsing, the licence
 * filter and the try order). This file also owns handing the D-pad between
 * every one of those pieces, since each is its own separate file.
 *
 * Used for: The Ollama tab in index.tsx.
 *
 * Solves: One screen that gathers every Ollama-related setting and wires
 * its own D-pad path through all the smaller pieces underneath it, so
 * pressing Down from one section reliably lands on the next.
 *
 * Does not: Actually talk to Ollama or run an Ask — see Main tab and
 * useBonsaiAskOrchestration for that. This tab only edits settings and
 * passes callbacks through to the sections that need to check live
 * connection status.
 *
 * Gotchas: Every "find the first focusable thing in this row" helper below
 * searches inside a ref'd container, never the whole page. A plain
 * page-wide query looks inside Decky's outer shell rather than just this
 * plugin, and can find the wrong element entirely.
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
import { FOCUS_RING_BTN_CLASS, SETTINGS_GLASS_BTN } from "../styles/settingsGlassButton";
import {
  registerModalReturnFocusOwner,
  rememberModalReturnFocus,
} from "../features/plugin-shell/modalReturnFocusRegistry";
import { useThinkingNoticeGate } from "../hooks/useThinkingNoticeGate";

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
  namedOllamaHosts: NamedOllamaHost[];
  setNamedOllamaHosts: React.Dispatch<React.SetStateAction<NamedOllamaHost[]>>;
  onBeforeDeckyModal: () => void;
  onCompleteDeckyModalClose: (close: () => void) => void;
  onOpenOllamaModelsHub: (opts?: { initialSection?: "policy" | "browse" | "advanced" }) => void;


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
  /** Terse mode: Speed answers capped at three lines. Sits right under the reply-style slider. */
  terseMode: boolean;
  setTerseMode: (v: boolean) => void;
  askThinkEffort: AskThinkEffortId;
  setAskThinkEffort: (v: AskThinkEffortId) => void;
};

/**
 * Give focus to the first matching stop inside one row's own container. The query is scoped to the
 * element handed in (a ref the row registered), never the page: under Decky the global document is
 * the wrong one. Returns false, leaving focus alone, when the row is not on screen or has no stop,
 * so the caller can let Steam's own move carry on.
 */
function focusFirstStopIn(host: HTMLElement | null, selector: string): boolean {
  if (!host) return false;
  const target = host.querySelector<HTMLElement>(selector);
  if (!target) return false;
  target.focus();
  return true;
}

/**
 * The whole tab: renders each Ollama-related section in order and wires
 * the D-pad handoff between them.
 *
 * In: every current Ollama setting (host address, local-on-Deck, knowledge
 * base, reply style, connection tuning, model policy) plus a setter for
 * each one, and callbacks to open the models hub and the routing-order
 * modals.
 * Out: the tab's panel sections, each one a separate component, in a fixed
 * top-to-bottom order.
 *
 * What can go wrong: nothing here calls the backend directly — every
 * setting change and every "open X" button just calls the callback it was
 * handed; OllamaWhereAiRunsSection and KnowledgeBaseSection own their own
 * connection checks.
 *
 * 1. A handful of focusXThumb()/focusXToggle() helpers, one per slider or
 *    toggle, each finding that control's own focusable element inside a
 *    ref'd container so the D-pad can be handed to it from a neighbouring
 *    section.
 * 2. OllamaWhereAiRunsSection draws first — the host address and
 *    local-Deck controls — with its own Down wired to focusKbToggle().
 * 3. KnowledgeBaseSection draws next, its Up wired back to the connection
 *    test button and its Down to the reply-verbosity slider.
 * 4. The Reply style panel: a verbosity slider then the Thinking effort
 *    row, each one's Up/Down pointed at its neighbour.
 * 5. Connection tuning: a custom-timeouts toggle that swaps in either a
 *    default-values line or the warning/timeout slider, followed by the
 *    keep-models-loaded slider.
 * 6. AI models: one button that opens the models hub, with the licence
 *    name on it. The Text / Pictures try order is inside the hub now.
 */
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
  namedOllamaHosts,
  setNamedOllamaHosts,
  onBeforeDeckyModal,
  onCompleteDeckyModalClose,
  onOpenOllamaModelsHub,
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
  terseMode,
  setTerseMode,
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
  const terseToggleHostRef = useRef<HTMLDivElement>(null);
  const thinkingEffortHostRef = useRef<HTMLDivElement | null>(null);

  const { requestThinkingEffortChange } = useThinkingNoticeGate(askThinkEffort, setAskThinkEffort, {
    onBeforeDeckyModal,
    onCompleteDeckyModalClose,
  });

  // Registers the row's own container as the modal return-focus owner for its one-time notice
  // (plan 57 bug D). A ref callback, not the ref object alone, because it has to re-register on
  // every mount -- Decky remounts this whole screen when the notice popup closes, and a plain
  // `useRef` object does not fire again on its own. The row is not a single button (it is four,
  // and which one was pressed can change what is selected), so the registered owner is the row's
  // container; `focusOwnerById` in modalReturnFocusRegistry.ts falls back to the first button
  // inside a registered element that is not itself a button.
  const setThinkingEffortHost = useCallback((el: HTMLDivElement | null) => {
    thinkingEffortHostRef.current = el;
    registerModalReturnFocusOwner("ollama-thinking-effort", el);
  }, []);

  const focusOllamaKeepAliveThumb = useCallback((): boolean => {
    return focusFirstStopIn(ollamaKeepAliveThumbHostRef.current, "[tabindex], button");
  }, []);

  const focusLatencyWarningThumb = useCallback((): boolean => {
    return focusFirstStopIn(latencyWarningThumbHostRef.current, "[tabindex], button");
  }, []);

  const focusKbToggle = useCallback((): boolean => {
    return focusFirstStopIn(kbToggleHostRef.current, "[tabindex], button, input");
  }, []);


  const focusReplyVerbosityThumb = useCallback((): boolean => {
    return focusFirstStopIn(replyVerbosityThumbHostRef.current, "[tabindex], button");
  }, []);

  // Element-scoped query on the row's own ref — never a global document.querySelector,
  // which under Decky searches a 14-element shell rather than the plugin's DOM.
  const focusThinkingEffortRow = useCallback((): boolean => {
    return focusFirstStopIn(thinkingEffortHostRef.current, "button:not([disabled])");
  }, []);

  // Same shape as focusKbToggle: an element-scoped query on the row's own ref. The slider above and
  // the Thinking row below both hand focus here, so the toggle is a stop on the Down/Up walk
  // rather than a row the explicit slider-to-Thinking hop would jump over.
  const focusTerseToggle = useCallback((): boolean => {
    return focusFirstStopIn(terseToggleHostRef.current, "[tabindex], button, input");
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
              onMoveDown={focusTerseToggle}
            />
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <div ref={terseToggleHostRef} className="bonsai-settings-bleed" style={{ width: "100%" }}>
            <ToggleField
              label="Terse mode"
              description="Speed mode only. Keeps each answer to three short lines and ends it with a menu of choices to dig deeper. It shortens what you see, not how hard the AI thinks, and the Reply style slider is ignored while it is on. Strategy and Expert answers are not changed."
              checked={terseMode}
              onChange={(checked) => setTerseMode(checked)}
              {...({
                onMoveUp: () => focusReplyVerbosityThumb(),
                onMoveDown: () => focusThinkingEffortRow(),
              } as unknown as Record<string, unknown>)}
            />
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <div className="bonsai-settings-bleed" style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
            <OllamaThinkingEffortRow
              value={askThinkEffort}
              onChange={requestThinkingEffortChange}
              hostRef={setThinkingEffortHost}
              onMoveUp={focusTerseToggle}
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

      <PanelSection title="AI models">
        <PanelSectionRow>
          <div className="bonsai-settings-bleed" style={{ width: "100%", minWidth: 0 }}>
            <Button
              /*
               * The one door into the AI models box (browse and pull, the licence filter, the Advanced
               * switches, and each installed model's place in the try order). With the AI on a PC
               * "Browse models..." is not drawn, so this is the only way in. The licence name stays on
               * the button: it is the only line on the tab that says which models may be tried.
               *
               * It remembers itself before opening so the ring comes back here when the box closes:
               * without that, closing it left the ring on Steam's own Quick Access rail (measured on
               * the Deck 2026-09-20). Its own id, because the registry needs one per opener.
               */
              ref={(el) => {
                registerModalReturnFocusOwner("ollama-models-hub-settings", el as HTMLElement | null);
              }}
              onClick={() => {
                rememberModalReturnFocus("ollama-models-hub-settings");
                onOpenOllamaModelsHub();
              }}
              className={FOCUS_RING_BTN_CLASS}
              style={{
                ...SETTINGS_GLASS_BTN,
                width: "100%",
              }}
              aria-label="AI models"
            >
              AI models… — {MODEL_POLICY_TIER_LABELS_PLAIN[modelPolicyTier]}
            </Button>
          </div>
        </PanelSectionRow>
      </PanelSection>
    </div>
  );
};
