/**
 * Versioned catalog for Steam Input jump targets. Routes and URIs are volatile across
 * Steam client builds; see docs/steam-input-research.md for CEF verification and update process.
 */
export const STEAM_INPUT_LEXICON_VERSION = 1;

export type SteamInputScope = "per-game" | "global" | "unknown";

/** Per research brief: Exact only after on-Deck verification; Near/Manual otherwise. */
export type RouteConfidence = "Exact" | "Near" | "Manual only";

export type SteamInputLexiconEntry = {
  id: string;
  canonical: string;
  scope: SteamInputScope;
  /** Shown when navigation cannot guarantee the exact sub-tab. */
  breadcrumb: string[];
  /**
   * React Router path template for Navigation.Navigate; `{appId}` is replaced for per-game entries.
   * Leave unset until verified via CEF (see docs/steam-input-research.md); when set, attempted before steam URL.
   */
  primaryPathTemplate?: string;
  /** steam:// template; `{appId}` replaced for per-game entries. */
  steamUrlTemplate?: string;
  routeConfidence: RouteConfidence;
};

export const STEAM_INPUT_LEXICON: SteamInputLexiconEntry[] = [
  {
    id: "phase1_per_game_controller_config",
    canonical: "Per-game controller configuration",
    scope: "per-game",
    breadcrumb: [
      "Steam → Library → select the game → Manage → Controller layout (or in-game Steam overlay → controller).",
      "If Jump landed on the wrong tab, use Gyro / Trackpads / etc. from the layout editor sidebar.",
    ],
    // Uncomment after CEF route sniffing confirms a stable path for your Steam build:
    // primaryPathTemplate: "/controller/app/{appId}/gyro",
    steamUrlTemplate: "steam://controllerconfig/{appId}",
    routeConfidence: "Near",
  },
];

export function getSteamInputLexiconEntry(id: string): SteamInputLexiconEntry | undefined {
  return STEAM_INPUT_LEXICON.find((e) => e.id === id);
}

/** Replace `{appId}` only; app ids are numeric strings from Steam. */
export function interpolateSteamInputTemplate(template: string, appId: string): string {
  return template.split("{appId}").join(appId);
}
