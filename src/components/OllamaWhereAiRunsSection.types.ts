/**
 * Title: Where-AI-runs section — shared types
 *
 * Purpose: The result shapes for the backend calls the "Where AI runs" panel
 * makes (mDNS discovery, the local setup poll, the startup-entry poll), and
 * the props the panel component itself takes.
 *
 * Used for: OllamaWhereAiRunsSection.tsx only.
 *
 * Solves: Keeps the panel's own file shorter by moving type declarations
 * that carry no behavior — nothing here runs when the module loads.
 *
 * Does not: Declare any constant or function. See
 * OllamaWhereAiRunsSection.constants.tsx for the numbers and copy this panel
 * uses.
 */
import type React from "react";
import type { NamedOllamaHost } from "../data/bonsaiSettingsSchema";
import type { DeveloperConnectionStatus } from "./DeveloperTab";

export type MdnsOllamaHost = {
  label: string;
  host: string;
  port: number;
  verified?: boolean;
};

export type MdnsDiscoveryResult = {
  ok?: boolean;
  hosts?: MdnsOllamaHost[];
  error?: string;
  hint?: string;
};

export type LocalOllamaSetupStatus = {
  phase: string;
  stage: string;
  profile: string;
  pull_tags?: string[];
  pull_step?: number;
  total_pull_steps?: number;
  current_tag?: string;
  log_tail?: string[];
  error?: string;
  done?: boolean;
};

/** Mirrors `get_ollama_local_autostart_status` (main.py) — the Deck startup entry's real state. */
export type OllamaLocalAutostartStatus = {
  installed?: boolean;
  enabled?: boolean;
  running?: boolean;
  reason?: string;
};

export type OllamaWhereAiRunsSectionProps = {
  ollamaIp: string;
  onOllamaIpChange: (ip: string) => void;
  onPersistOllamaIp: (ip: string) => void;
  ollamaLocalOnDeck: boolean;
  setOllamaLocalOnDeck: (v: boolean) => void;
  /** "Start the AI with the Deck" — a per-user Deck startup entry for local Ollama, off by default (2026-09-12). */
  ollamaLocalAutostart: boolean;
  setOllamaLocalAutostart: (v: boolean) => void;
  onLastConnectionStatus?: (status: DeveloperConnectionStatus | null) => void;
  namedOllamaHosts: NamedOllamaHost[];
  setNamedOllamaHosts: React.Dispatch<React.SetStateAction<NamedOllamaHost[]>>;
  onBeforeDeckyModal: () => void;
  onCompleteDeckyModalClose: (close: () => void) => void;
  onOpenOllamaModelsHub: (opts?: { initialSection?: "policy" | "browse" | "advanced" }) => void;
  /** When user confirms Tier 2 one-model multimodal setup — bump policy tier before pull. */
  onApplyTier2MultimodalPolicy?: () => void | Promise<void>;
  /** Focus graph: move from connection row into Knowledge base section. */
  onMoveDownFromConnectionRow?: () => void;
  /** Focus graph: ref for Test connection button (KB toggle onMoveUp target). */
  connectionTestBtnRef?: React.RefObject<HTMLButtonElement | null>;
};

export type ConnectionStatus = DeveloperConnectionStatus;
