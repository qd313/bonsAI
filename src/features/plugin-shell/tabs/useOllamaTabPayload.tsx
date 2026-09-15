/**
 * Title: What draws the Ollama tab
 *
 * Purpose: Runs while a person has the Ollama tab open — where they point
 * the plugin at the computer running the AI, and adjust how it connects
 * and behaves. It builds that screen from the connection state, timing
 * settings, and model choices it is handed.
 *
 * Used for: The tab bar's always-present Ollama tab.
 *
 * Solves: Keeps this large list of values, and the reset key that makes
 * "Clear all plugin data" throw the tab's own state away and rebuild it
 * from scratch, out of the main plugin screen's own code.
 *
 * Does not: Own the connection itself — that lives elsewhere and is only
 * handed to this hook to display and pass along.
 */
import React, { useMemo } from "react";

import { OllamaTab } from "../../../components/OllamaTab";
import { saveIp } from "../pluginStorage";

type OllamaTabProps = React.ComponentProps<typeof OllamaTab>;

export type UseOllamaTabPayloadArgs = Omit<OllamaTabProps, "onPersistOllamaIp"> & {
  /** Bumping this remounts the tab, discarding its internal state. */
  ollamaTabResetKey: number;
};

/**
 * In: around two dozen values covering the connection, timing settings,
 * and model choices, plus a reset key that forces a full rebuild when
 * bumped.
 * Out: the finished Ollama tab element, rebuilt only when one of the
 * listed values changes (or the reset key is bumped, which remounts the
 * whole tab and throws away anything it was in the middle of).
 * Can go wrong: the rebuild list at the bottom is written by hand; a value
 * added above that is not also added there will not fail any check, it
 * will just quietly stop updating on screen.
 */
export function useOllamaTabPayload({
  ollamaTabResetKey,
  ollamaIp,
  effectiveOllamaPcIp,
  onOllamaIpChange,
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
  replyVerbosity,
  setReplyVerbosity,
  askThinkEffort,
  setAskThinkEffort,
  modelPolicyTier,
  onApplyTier2MultimodalPolicy,
  useLocalKnowledgeBase,
  setUseLocalKnowledgeBase,
  ragCorpusVersion,
}: UseOllamaTabPayloadArgs): React.ReactElement {
  // Dependency list preserved verbatim from index.tsx: the settings setters are stable
  // identities from usePluginSettings and were deliberately left out.
  return useMemo(
    () => (
      <OllamaTab
        key={`ollama-tab-${ollamaTabResetKey}`}
        ollamaIp={ollamaIp}
        effectiveOllamaPcIp={effectiveOllamaPcIp}
        onOllamaIpChange={onOllamaIpChange}
        onPersistOllamaIp={saveIp}
        ollamaLocalOnDeck={ollamaLocalOnDeck}
        setOllamaLocalOnDeck={setOllamaLocalOnDeck}
        ollamaLocalAutostart={ollamaLocalAutostart}
        setOllamaLocalAutostart={setOllamaLocalAutostart}
        onLastConnectionStatus={onLastConnectionStatus}
        lastConnectionStatus={lastConnectionStatus}
        namedOllamaHosts={namedOllamaHosts}
        setNamedOllamaHosts={setNamedOllamaHosts}
        onBeforeDeckyModal={onBeforeDeckyModal}
        onCompleteDeckyModalClose={onCompleteDeckyModalClose}
        onOpenOllamaModelsHub={onOpenOllamaModelsHub}
        onOpenRoutingOrderModal={onOpenRoutingOrderModal}
        latencyWarningSeconds={latencyWarningSeconds}
        requestTimeoutSeconds={requestTimeoutSeconds}
        latencyTimeoutsCustomEnabled={latencyTimeoutsCustomEnabled}
        setLatencyTimeoutsCustomEnabled={setLatencyTimeoutsCustomEnabled}
        setLatencyWarningSeconds={setLatencyWarningSeconds}
        setRequestTimeoutSeconds={setRequestTimeoutSeconds}
        ollamaKeepAlive={ollamaKeepAlive}
        setOllamaKeepAlive={setOllamaKeepAlive}
        replyVerbosity={replyVerbosity}
        setReplyVerbosity={setReplyVerbosity}
        askThinkEffort={askThinkEffort}
        setAskThinkEffort={setAskThinkEffort}
        modelPolicyTier={modelPolicyTier}
        onApplyTier2MultimodalPolicy={onApplyTier2MultimodalPolicy}
        useLocalKnowledgeBase={useLocalKnowledgeBase}
        setUseLocalKnowledgeBase={setUseLocalKnowledgeBase}
        ragCorpusVersion={ragCorpusVersion}
      />
    ),
    [
      ollamaIp,
      effectiveOllamaPcIp,
      ollamaLocalOnDeck,
      ollamaLocalAutostart,
      ollamaTabResetKey,
      lastConnectionStatus,
      namedOllamaHosts,
      latencyWarningSeconds,
      requestTimeoutSeconds,
      latencyTimeoutsCustomEnabled,
      ollamaKeepAlive,
      replyVerbosity,
      askThinkEffort,
      modelPolicyTier,
      onApplyTier2MultimodalPolicy,
      useLocalKnowledgeBase,
      ragCorpusVersion,
      onBeforeDeckyModal,
      onCompleteDeckyModalClose,
      onOpenOllamaModelsHub,
      onOpenRoutingOrderModal,
    ]
  );
}
