/**
 * Title: Where-AI-runs section — shared constants
 *
 * Purpose: The fixed numbers and canned copy the "Where AI runs" panel uses
 * for its connection tests, its mDNS search, and its three local-install
 * setup profiles (Tier 1 essentials, Tier 2 multimodal, update-installed).
 *
 * Used for: OllamaWhereAiRunsSection.tsx only.
 *
 * Solves: Keeps the panel's own file shorter by moving values nothing
 * computes — none of this runs when the module loads, so a move here never
 * changes when anything fires.
 *
 * Does not: Declare any type, hook, or component with logic. See
 * OllamaWhereAiRunsSection.types.ts for the shapes this panel uses.
 */
const TEST_CONNECTION_TIMEOUT_SECONDS = 10;
/** Loopback probes may start systemd / ``ollama serve``; Decky RPC must outlive nested waits. */
const LOCAL_LOOPBACK_CONNECTION_TEST_RPC_EXTRA_MS = 42000;
const MDNS_DISCOVERY_TIMEOUT_SECONDS = 10;
const MDNS_DISCOVERY_RPC_MS = 18_000;

const LOCAL_OLLAMA_SETUP_PROFILE_TIER1_ESSENTIALS = "tier1_essentials";
const LOCAL_OLLAMA_SETUP_PROFILE_TIER2_MULTIMODAL = "tier2_multimodal";
const LOCAL_OLLAMA_SETUP_PROFILE_UPDATE_INSTALLED = "update_installed";

/** Shown in setup modals; align with `refactor_helpers.setup_recommended_pull_tags` sizes. */
const OLLAMA_MODELS_DISK_HINT =
  "Default model folder on this account: /home/deck/.ollama/models (override with the OLLAMA_MODELS environment variable if you moved the store).";
const LOCAL_SETUP_SIZE_TIER1_ESSENTIALS_GIB =
  "Rough download: about 3–4 GiB (one FOSS multimodal model — chat, screenshots, Strategy).";
const LOCAL_SETUP_SIZE_TIER2_MULTIMODAL_GIB =
  "Rough download: about 4–5 GiB (one Gemma 4 edge multimodal model).";

const LOCAL_SETUP_NETWORK_AND_POWER_HINT = (
  <>
    <div style={{ marginBottom: 8 }}>
      Total time depends heavily on <span style={{ color: "#9ce7ff" }}>Wi‑Fi speed and disk</span>. You may close the
      bonsAI plugin while downloads run as long as Ollama stays up; <span style={{ fontWeight: 700 }}>avoid</span>{" "}
      suspending the Steam Deck, restarting, toggling network off, or powering down until pulls finish.
    </div>
    <div>Use AC power where possible for long Tier‑1 batches.</div>
  </>
);

export {
  TEST_CONNECTION_TIMEOUT_SECONDS,
  LOCAL_LOOPBACK_CONNECTION_TEST_RPC_EXTRA_MS,
  MDNS_DISCOVERY_TIMEOUT_SECONDS,
  MDNS_DISCOVERY_RPC_MS,
  LOCAL_OLLAMA_SETUP_PROFILE_TIER1_ESSENTIALS,
  LOCAL_OLLAMA_SETUP_PROFILE_TIER2_MULTIMODAL,
  LOCAL_OLLAMA_SETUP_PROFILE_UPDATE_INSTALLED,
  OLLAMA_MODELS_DISK_HINT,
  LOCAL_SETUP_SIZE_TIER1_ESSENTIALS_GIB,
  LOCAL_SETUP_SIZE_TIER2_MULTIMODAL_GIB,
  LOCAL_SETUP_NETWORK_AND_POWER_HINT,
};
