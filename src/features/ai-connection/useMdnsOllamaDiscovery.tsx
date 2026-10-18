/**
 * Title: Find Ollama on the LAN over mDNS
 *
 * Purpose: The "Find LAN" button on the where-AI-runs panel — asks first (the shared two-button box: Search
 * on the left, Cancel on the right, the ring on Cancel), then searches the local network for other Ollama
 * services advertised over mDNS/Bonjour, and records what it finds (or why it found nothing).
 *
 * Used for: OllamaWhereAiRunsSection, only when Ask is not already pointed
 * at this Deck (searching makes no sense once the AI already runs here).
 *
 * Solves: Keeps the panel's own file shorter by moving one self-contained
 * concern — the confirm dialog and the search it starts — out on its own.
 *
 * Does not: Own the mdnsDiscovering/mdnsHosts/mdnsDiscoveryMessage state
 * itself. That state stays in the panel (its own JSX renders the results
 * list and the "no hosts found" message directly) and is handed in here as
 * setters, so this hook's own hook calls stay exactly the two the panel
 * used to make at this spot — nothing about where the panel's own useState
 * calls run moves.
 *
 * Caution: Lifted out of OllamaWhereAiRunsSection on 2026-09-24, from the
 * spot right after the panel's connection-test auto-probe effect and right
 * before its local-setup callbacks — both stayed exactly where they were,
 * so this hook is called between them, in the same slot in the hook call
 * order.
 */
import { useCallback } from "react";
import { showModal } from "@decky/ui";
import { TwoButtonConfirmModal } from "../../shared/TwoButtonConfirmModal";
import { callDeckyWithTimeout, formatDeckyRpcError } from "../../shared/deckyCall";
import type { MdnsOllamaHost, MdnsDiscoveryResult } from "./OllamaWhereAiRunsSection.types";
import {
  MDNS_DISCOVERY_TIMEOUT_SECONDS,
  MDNS_DISCOVERY_RPC_MS,
} from "./OllamaWhereAiRunsSection.constants";
import { textPx } from "../../styles/textPx";

/**
 * Search, and the confirm dialog that starts it. Every hook below must keep its position —
 * React matches hooks by the order they run in.
 */
export function useMdnsOllamaDiscovery({
  mdnsDiscovering,
  setMdnsDiscovering,
  setMdnsHosts,
  setMdnsDiscoveryMessage,
  ollamaLocalOnDeck,
  localSetupBusy,
  onBeforeDeckyModal,
  onCompleteDeckyModalClose,
}: {
  mdnsDiscovering: boolean;
  setMdnsDiscovering: (v: boolean) => void;
  setMdnsHosts: (v: MdnsOllamaHost[]) => void;
  setMdnsDiscoveryMessage: (v: string | null) => void;
  ollamaLocalOnDeck: boolean;
  localSetupBusy: boolean;
  onBeforeDeckyModal: () => void;
  onCompleteDeckyModalClose: (close: () => void) => void;
}) {
  const runMdnsDiscovery = useCallback(async () => {
    setMdnsDiscovering(true);
    setMdnsDiscoveryMessage(null);
    setMdnsHosts([]);
    try {
      const result = await callDeckyWithTimeout<[number], MdnsDiscoveryResult>(
        "discover_mdns_ollama_hosts",
        [MDNS_DISCOVERY_TIMEOUT_SECONDS],
        MDNS_DISCOVERY_RPC_MS
      );
      const hosts = Array.isArray(result.hosts) ? result.hosts : [];
      if (hosts.length > 0) {
        setMdnsHosts(hosts);
        setMdnsDiscoveryMessage(null);
      } else {
        setMdnsHosts([]);
        setMdnsDiscoveryMessage(
          (result.hint || result.error || "No Ollama services found via mDNS on this network.").trim()
        );
      }
    } catch (e: unknown) {
      setMdnsHosts([]);
      setMdnsDiscoveryMessage(formatDeckyRpcError(e));
    } finally {
      setMdnsDiscovering(false);
    }
  }, []);

  const openMdnsDiscoveryConfirm = useCallback(() => {
    if (ollamaLocalOnDeck || mdnsDiscovering || localSetupBusy) return;
    onBeforeDeckyModal();
    const handle = showModal(
      <TwoButtonConfirmModal
        title="Find Ollama on LAN (mDNS)"
        body={
          <div className="bonsai-prose" style={{ fontSize: textPx(12), color: "#9fb7d5", lineHeight: 1.45, textAlign: "left" }}>
            This looks on your home network for an Ollama PC. It does not scan addresses or ports. If nothing shows,
            type the PC&apos;s address yourself.
          </div>
        }
        actionLabel="Search"
        onAction={() => {
          onCompleteDeckyModalClose(() => handle.Close());
          void runMdnsDiscovery();
        }}
        onCancel={() => onCompleteDeckyModalClose(() => handle.Close())}
      />
    );
  }, [
    localSetupBusy,
    mdnsDiscovering,
    ollamaLocalOnDeck,
    onBeforeDeckyModal,
    onCompleteDeckyModalClose,
    runMdnsDiscovery,
  ]);

  return { runMdnsDiscovery, openMdnsDiscoveryConfirm };
}
