import { Navigation, Router } from "@decky/ui";
import type { SteamInputLexiconEntry } from "../data/steam-input-lexicon";
import { interpolateSteamInputTemplate } from "../data/steam-input-lexicon";

type SteamUrlApi = { ExecuteSteamURL(url: string): void };

export type SteamInputJumpMethod = "react-router" | "steam-url";

export type SteamInputJumpResult =
  | { ok: true; method: SteamInputJumpMethod; detail: string; confidenceLabel: string }
  | { ok: false; reason: string };

function executeSteamUrl(url: string): void {
  const steamUrlApi = SteamClient.URL as unknown as SteamUrlApi;
  steamUrlApi.ExecuteSteamURL(url);
}

/**
 * Jump to a Steam Input–related surface using the lexicon entry’s templates.
 * Order: optional Router path (if primaryPathTemplate set), then steam:// if router throws or no template.
 */
export function jumpToSteamInputEntry(entry: SteamInputLexiconEntry): SteamInputJumpResult {
  const confidenceLabel = entry.routeConfidence;

  if (entry.scope === "per-game") {
    const running = Router.MainRunningApp;
    const appId = running?.appid?.toString()?.trim() ?? "";
    if (!appId) {
      return {
        ok: false,
        reason:
          "No running game — Steam did not report MainRunningApp. Launch or focus a game, then try again.",
      };
    }

    if (entry.primaryPathTemplate) {
      try {
        const path = interpolateSteamInputTemplate(entry.primaryPathTemplate, appId);
        Navigation.Navigate(path);
        Navigation.CloseSideMenus();
        return { ok: true, method: "react-router", detail: path, confidenceLabel };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!entry.steamUrlTemplate) {
          return { ok: false, reason: `Navigation failed: ${msg}` };
        }
        try {
          const url = interpolateSteamInputTemplate(entry.steamUrlTemplate, appId);
          executeSteamUrl(url);
          Navigation.CloseSideMenus();
          return { ok: true, method: "steam-url", detail: url, confidenceLabel };
        } catch (e2) {
          const msg2 = e2 instanceof Error ? e2.message : String(e2);
          return { ok: false, reason: `Router failed (${msg}); steam:// failed (${msg2}).` };
        }
      }
    }

    if (entry.steamUrlTemplate) {
      try {
        const url = interpolateSteamInputTemplate(entry.steamUrlTemplate, appId);
        executeSteamUrl(url);
        Navigation.CloseSideMenus();
        return { ok: true, method: "steam-url", detail: url, confidenceLabel };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { ok: false, reason: `steam:// dispatch failed: ${msg}` };
      }
    }

    return { ok: false, reason: "Lexicon entry has no primaryPathTemplate or steamUrlTemplate." };
  }

  if (entry.scope === "global") {
    if (entry.steamUrlTemplate && !entry.steamUrlTemplate.includes("{appId}")) {
      try {
        const url = entry.steamUrlTemplate;
        executeSteamUrl(url);
        Navigation.CloseSideMenus();
        return { ok: true, method: "steam-url", detail: url, confidenceLabel };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { ok: false, reason: `steam:// dispatch failed: ${msg}` };
      }
    }
    return { ok: false, reason: "Global entry not configured for automatic jump." };
  }

  return { ok: false, reason: "Unknown or unsupported Steam Input scope." };
}
