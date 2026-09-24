/**
 * Title: Pull models screen — shared types
 *
 * Purpose: The request/response shapes and row/section types PullModelsModal.tsx (and the code it
 * shares work with) needs, kept together so the component file itself reads as flow rather than
 * declarations.
 *
 * Used for: PullModelsModal.tsx's own RPC calls and table building, and, for the two exported
 * ones, OllamaModelsHubModal's footer handoff and this screen's own test files.
 *
 * Solves: nothing on its own — this is data shape only. See PullModelsModal.tsx for how each type
 * is used.
 *
 * Does not: fetch or compute anything. Every field here mirrors a shape the back end already
 * returns, or a screen-local grouping PullModelsModal.tsx builds from the catalog.
 */
import type { PullModelEntry, PullModelGroup } from "../data/pullModelCatalog";
import type { ModelPolicyTierId } from "../data/modelPolicy";

/** Minimal shape this modal needs from `load_settings` / `save_settings` — see bonsaiSettingsSchema.ts for the rest. */
export type PullModelsRoutingOrderSettings = {
  text_model_routing_order?: string[];
  vision_model_routing_order?: string[];
};

export type CatalogMetadataResponse = {
  source?: "live" | "offline";
  error?: string;
  fetched_at?: number | null;
  tags?: Record<string, { size_bytes?: number | null; exists?: boolean }>;
};

export type ConnectionTestResult = {
  reachable?: boolean;
  models?: string[];
  error?: string;
};

export type VisibleCatalogRow = { kind: "catalog"; entry: PullModelEntry; group: PullModelGroup };
export type VisibleOtherRow = { kind: "other"; tag: string };
export type VisibleTableRow = VisibleCatalogRow | VisibleOtherRow;

export type TableSection = {
  title: string;
  rows: VisibleTableRow[];
};

export type PullModelsFooterState = {
  okText: string;
  onOk: () => void;
  okDisabled: boolean;
  /** True once at least one model is queued to pull — lets the hub know Done means "pull" here
   *  rather than "save and close" (see OllamaModelsHubModal's handleDone). */
  hasQueuedPull: boolean;
};

export type PullModelsModalProps = {
  activeRoutingTag: string | null;
  modelPolicyTier?: ModelPolicyTierId;
  /** Gates the "Any installed model" licence row exactly like it gated the old Tier 3 button. */
  modelPolicyNonFossUnlocked?: boolean;
  /** Licence row picked directly in the Filters panel — a draft, saved the same way the three
   *  Policy buttons were (see OllamaModelsHubModal's Done handling). */
  onSelectModelPolicyTier?: (tier: ModelPolicyTierId) => void;
  onApplyTier2Policy?: () => void | Promise<void>;
  onBeforeNestedDeckyModal?: () => void;
  onCompleteNestedDeckyModalClose?: (close: () => void) => void;
  onCancel: () => void;
  onPullAccepted: () => void;
  /** When true, render panel body only (for AI models hub). */
  embedded?: boolean;
  onFooterStateChange?: (state: PullModelsFooterState) => void;
  /** Opens the Filters panel, ring inside it, the moment this screen mounts — used for the
   *  "Manage models → Policy" shortcut now that Policy is a filter, not its own section. */
  initialFiltersOpen?: boolean;
};
