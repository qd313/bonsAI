/**
 * Title: Ollama tab payload
 * Purpose: Build the memoized Ollama tab element, keyed so a data clear remounts it.
 * Used for: index.tsx — the always-present "Ollama" tab row.
 * Solves: Keeps a 24-prop element, its reset key and its memo dependency list out of the composition root.
 * Does not: Own the host state — useOllamaConnectionState does, through the caller.
 */
import React, { useMemo } from "react";

import { OllamaTab } from "../../../components/OllamaTab";
import { saveIp } from "../pluginStorage";

type OllamaTabProps = React.ComponentProps<typeof OllamaTab>;

export type UseOllamaTabPayloadArgs = Omit<OllamaTabProps, "onPersistOllamaIp"> & {
  /** Bumping this remounts the tab, discarding its internal state. */
  ollamaTabResetKey: number;
};

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
