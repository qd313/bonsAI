/**
 * Title: Ollama settings tab
 *
 * Purpose: The whole Ollama tab — where the AI's address lives,
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
 * Folded (plan 91 § 2b, plan 92 T0): each of the five sections is one line (FoldedSection) showing a
 * summary of its values; A opens or closes it, several can be open at once, the first is open on a
 * first visit. Inside, one line per setting; a row's longer text shows in the help strip at the bottom
 * of the panel while the ring is on it; the floating Open all button opens or closes every section. The
 * hand-wired hops between sections now go to the section lines: a section's last control hands Down to
 * the next line (foldLineBelow), its first control hands Up to its own line (takeFoldLine).
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
import React from "react";
import { Button, Focusable, PanelSection, PanelSectionRow } from "@decky/ui";
import { DEFAULT_LATENCY_WARNING_SECONDS, DEFAULT_REQUEST_TIMEOUT_SECONDS, type OllamaKeepAliveDuration } from "../settings/bonsaiSettingsSchema";
import { MODEL_POLICY_TIER_LABELS_PLAIN, type ModelPolicyTierId } from "../models/modelPolicy";
import type { DeveloperConnectionStatus } from "../developer/DeveloperTab";
import { OllamaWhereAiRunsSection } from "./OllamaWhereAiRunsSection";
import { KnowledgeBaseSection } from "../knowledge-library/KnowledgeBaseSection";
import { SettingsTabConnectionTimeoutSlider } from "./SettingsTabConnectionTimeoutSlider";
import { SettingsTabOllamaKeepAliveSlider } from "./SettingsTabOllamaKeepAliveSlider";
import { OllamaReplyVerbositySlider } from "./OllamaReplyVerbositySlider";
import type { ReplyVerbosityId } from "../settings/replyVerbosity";
import { ASK_THINK_EFFORT_DESCRIPTIONS, type AskThinkEffortId } from "../settings/askThinkEffort";
import { OllamaThinkingEffortRow } from "./OllamaThinkingEffortRow";
import type { NamedOllamaHost } from "../settings/bonsaiSettingsSchema";
import { FOCUS_RING_BTN_CLASS, SETTINGS_GLASS_BTN } from "../../styles/settingsGlassButton";
import {
  registerModalReturnFocusOwner,
  rememberModalReturnFocus,
} from "../../shared/dpad/modalReturnFocusRegistry";
import { useOllamaTabFocus } from "./useOllamaTabFocus";
import { useThinkingNoticeGate } from "./useThinkingNoticeGate";
import { textPx } from "../../styles/textPx";
import { chainIds, FoldedColumn, FoldedSection, foldLineBelow, takeFoldLine } from "../folded-tabs/FoldedSection";
import { FoldAllButton } from "../folded-tabs/FoldAllButton";
import { TabHelpStrip } from "../folded-tabs/TabHelpStrip";
import { DenseRow, DenseSwitchRow } from "../folded-tabs/DenseRow";
import {
  OLLAMA_FOLD_TAB,
  OLLAMA_ROW_HELP,
  OLLAMA_SECTIONS,
  ollamaSectionSummaries,
  type OllamaSectionId,
} from "./ollamaTabFolds";

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
  askThinkEffort: AskThinkEffortId;
  setAskThinkEffort: (v: AskThinkEffortId) => void;
};

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
 *    toggle (useOllamaTabFocus.ts), each finding that control's own focusable
 *    element inside a ref'd container so the D-pad can be handed to it from a
 *    neighbouring section.
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
  askThinkEffort,
  setAskThinkEffort,
}) => {
  const {
    latencyWarningThumbHostRef,
    ollamaKeepAliveThumbHostRef,
    kbToggleHostRef,
    kbDownloadBtnRef,
    kbRemoveBtnRef,
    kbCancelBtnRef,
    connectionTestBtnRef,
    replyVerbosityThumbHostRef,
    whereBodyRef,
    customTimeoutsHostRef,
    modelsBtnRef,
    setThinkingEffortHost,
    focusOllamaKeepAliveThumb,
    focusLatencyWarningThumb,
    focusReplyVerbosityThumb,
    focusThinkingEffortRow,
    focusCustomTimeoutsToggle,
    chain,
  } = useOllamaTabFocus();

  const { requestThinkingEffortChange } = useThinkingNoticeGate(askThinkEffort, setAskThinkEffort, {
    onBeforeDeckyModal,
    onCompleteDeckyModalClose,
  });

  const summaries = ollamaSectionSummaries({
    ollamaLocalOnDeck,
    ollamaLocalAutostart,
    useLocalKnowledgeBase,
    replyVerbosity,
    askThinkEffort,
    latencyTimeoutsCustomEnabled,
    ollamaKeepAlive,
  });
  const fold = (id: OllamaSectionId, children: React.ReactNode) => (
    <FoldedSection
      tab={OLLAMA_FOLD_TAB}
      chain={chain}
      id={id}
      title={OLLAMA_SECTIONS.find((x) => x.id === id)?.title ?? id}
      summary={summaries[id]}
    >
      {children}
    </FoldedSection>
  );

  return (
    <div
      className="bonsai-tab-panel-shell bonsai-tab-panel-shell--tight bonsai-settings-section-stack bonsai-folded-tab"
      data-bonsai-tab-panel="ollama"
    >
      <FoldedColumn>
        {fold(
          "where",
          <div ref={whereBodyRef}>
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
              onMoveUpFromFirst={() => takeFoldLine(OLLAMA_FOLD_TAB, "where")}
              onMoveDownFromConnectionRow={() => foldLineBelow(OLLAMA_FOLD_TAB, chain, "where")}
              connectionTestBtnRef={connectionTestBtnRef}
            />
          </div>,
        )}

        {fold(
          "kb",
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
            onMoveUpToConnection={() => takeFoldLine(OLLAMA_FOLD_TAB, "kb")}
            onMoveDownFromRemove={() => foldLineBelow(OLLAMA_FOLD_TAB, chain, "kb")}
          />,
        )}

        {fold(
          "reply",
          <PanelSection>
            <PanelSectionRow>
              <DenseRow kind="slider" label="Reply style" help={OLLAMA_ROW_HELP.replyStyle}>
                <div className="bonsai-prose-host bonsai-settings-bleed" style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
                  <OllamaReplyVerbositySlider
                    value={replyVerbosity}
                    onChange={setReplyVerbosity}
                    thumbHostRef={replyVerbosityThumbHostRef}
                    onMoveUp={() => takeFoldLine(OLLAMA_FOLD_TAB, "reply")}
                    onMoveDown={focusThinkingEffortRow}
                  />
                </div>
              </DenseRow>
            </PanelSectionRow>
            <PanelSectionRow>
              <div className="bonsai-settings-bleed" style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
                <DenseRow kind="choice" label="Thinking" help={ASK_THINK_EFFORT_DESCRIPTIONS[askThinkEffort]}>
                  <OllamaThinkingEffortRow
                    value={askThinkEffort}
                    onChange={requestThinkingEffortChange}
                    hostRef={setThinkingEffortHost}
                    onMoveUp={focusReplyVerbosityThumb}
                    onMoveDown={() => foldLineBelow(OLLAMA_FOLD_TAB, chain, "reply")}
                  />
                </DenseRow>
              </div>
            </PanelSectionRow>
          </PanelSection>,
        )}

        {fold(
          "tuning",
          <PanelSection>
            <PanelSectionRow>
              <div className="bonsai-settings-bleed" style={{ width: "100%" }}>
                <DenseSwitchRow
                  label="Custom timeouts"
                  hostRef={customTimeoutsHostRef}
                  checked={latencyTimeoutsCustomEnabled}
                  onChange={(c) => setLatencyTimeoutsCustomEnabled(c)}
                  nav={{ onMoveUp: () => takeFoldLine(OLLAMA_FOLD_TAB, "tuning") }}
                >
                  {!latencyTimeoutsCustomEnabled ? (
                    <div className="bonsai-prose" style={{ fontSize: textPx(12), color: "#cdd9e6", lineHeight: 1.4 }}>
                      Default:{" "}
                      <span style={{ color: "#ffd299", fontWeight: 700 }}>Warning {DEFAULT_LATENCY_WARNING_SECONDS}s</span>
                      <span style={{ color: "rgba(255,255,255,0.35)" }}> | </span>
                      <span style={{ color: "#9ce7ff", fontWeight: 700 }}>Timeout {DEFAULT_REQUEST_TIMEOUT_SECONDS}s</span>
                    </div>
                  ) : null}
                </DenseSwitchRow>
              </div>
            </PanelSectionRow>
            {latencyTimeoutsCustomEnabled ? (
              <PanelSectionRow>
                <DenseRow kind="slider" label="Timeouts" help={OLLAMA_ROW_HELP.timeouts}>
                  <div className="bonsai-prose-host bonsai-settings-bleed" style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
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
                </DenseRow>
              </PanelSectionRow>
            ) : null}
            <PanelSectionRow>
              <DenseRow kind="slider" label="Keep models loaded" help={OLLAMA_ROW_HELP.keepAlive}>
                <div className="bonsai-prose-host bonsai-settings-bleed" style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
                  <SettingsTabOllamaKeepAliveSlider
                    value={ollamaKeepAlive}
                    onChange={setOllamaKeepAlive}
                    thumbHostRef={ollamaKeepAliveThumbHostRef}
                    onMoveUp={latencyTimeoutsCustomEnabled ? focusLatencyWarningThumb : focusCustomTimeoutsToggle}
                    onMoveDown={() => foldLineBelow(OLLAMA_FOLD_TAB, chain, "tuning")}
                  />
                </div>
              </DenseRow>
            </PanelSectionRow>
          </PanelSection>,
        )}

        {fold(
          "models",
          <PanelSection>
            <PanelSectionRow>
              <DenseRow kind="button" label="AI models">
                <Focusable
                  className="bonsai-settings-bleed"
                  style={{ width: "100%", minWidth: 0 }}
                  {...({
                    onMoveUp: () => takeFoldLine(OLLAMA_FOLD_TAB, "models"),
                    /* The tab's last control: Down goes on to the floating Open all button below it (plan 93). */
                    onMoveDown: () => foldLineBelow(OLLAMA_FOLD_TAB, chain, "models"),
                  } as Record<string, unknown>)}
                >
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
                      modelsBtnRef.current = el as HTMLButtonElement | null;
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
                </Focusable>
              </DenseRow>
            </PanelSectionRow>
          </PanelSection>,
        )}
      </FoldedColumn>

      {/* Room under the last line, so the last rows can scroll up clear of the strip and the button. */}
      <div className="bonsai-fold-tail" aria-hidden="true" />
      <TabHelpStrip tab={OLLAMA_FOLD_TAB}>
        <FoldAllButton tab={OLLAMA_FOLD_TAB} sections={chainIds(chain)} />
      </TabHelpStrip>
    </div>
  );
};
