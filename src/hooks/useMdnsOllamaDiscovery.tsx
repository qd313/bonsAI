/**
 * Title: Find Ollama on the LAN over mDNS
 *
 * Purpose: The "Find LAN" button on the where-AI-runs panel — asks first,
 * then searches the local network for other Ollama services advertised
 * over mDNS/Bonjour, and records what it finds (or why it found nothing).
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
import { showModal, ConfirmModal } from "@decky/ui";
import { callDeckyWithTimeout, formatDeckyRpcError } from "../utils/deckyCall";
import type { MdnsOllamaHost, MdnsDiscoveryResult } from "../components/OllamaWhereAiRunsSection.types";
import {
  MDNS_DISCOVERY_TIMEOUT_SECONDS,
  MDNS_DISCOVERY_RPC_MS,
} from "../components/OllamaWhereAiRunsSection.constants";

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
      <ConfirmModal
        strTitle="Find Ollama on LAN (mDNS)"
        strDescription={
          <div className="bonsai-prose" style={{ fontSize: 12, color: "#9fb7d5", lineHeight: 1.45, textAlign: "left" }}>
            <div style={{ marginBottom: 8 }}>
              This browses your local network for services advertised as{" "}
              <code style={{ color: "#9ce7ff" }}>_ollama._tcp</code> (Bonjour / Avahi). It does not scan IP addresses or
              ports.
            </div>
            <div>
              Stock Ollama on a PC often needs an Avahi or Bonjour publish step — see troubleshooting. You can still
              enter a PC address manually.
            </div>
          </div>
        }
        strOKButtonText="Search"
        strCancelButtonText="Cancel"
        onOK={() => {
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
