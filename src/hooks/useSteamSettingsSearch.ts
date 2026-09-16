/**
 * Title: Steam settings search hook
 * Purpose: Filter Steam/QAM settings rows from unified input and deep-link via Router or steam:// URLs.
 * Used for: MainTab search mode and SETTINGS_DATABASE navigation.
 * Solves: Intent-pack-augmented settings discovery from the unified Ask bar.
 * Does not: Own intent pack data — see useIntentPacks and intentPackSearch.
 */
import { useCallback, useMemo, type Dispatch, type SetStateAction } from "react";
import { toaster } from "@decky/api";
import { Navigation } from "@decky/ui";
import { SETTINGS_DATABASE } from "../data/settingsDatabase";
import { getQamTab, getSteamSettingsUrl, isQamSetting } from "../data/steamSettingsNavigation";
import { searchSettingsWithIntentPacks } from "../utils/intentPackSearch";
import type { IntentPackSearchIndex } from "../utils/intentPackSearch";

type SteamUrlApi = {
  ExecuteSteamURL(url: string): void;
};

export type UseSteamSettingsSearchOptions = {
  unifiedInput: string;
  intentPackIndex: IntentPackSearchIndex;
  setSelectedIndex: Dispatch<SetStateAction<number>>;
  setNavigationMessage: Dispatch<SetStateAction<string>>;
};

/*
 * The floating settings-results card (plan 45 / plan 56 lane E): how tall it can grow, and
 * whether it should show itself at all for what is typed right now. Both are plain arithmetic
 * and string checks with no DOM in them, so MainTabUnifiedAskBar.tsx (which does the actual
 * on-screen measuring) can import and call them directly without going through the hook itself.
 */

/** Never more than eight rows, however many results there are. */
export const SETTINGS_CARD_MAX_ROWS = 8;
/** A result row's own height, matched to the button style the card renders (section-4.ts). */
export const SETTINGS_CARD_ROW_HEIGHT_PX = 30;
/** Gap between two stacked rows. */
export const SETTINGS_CARD_ROW_GAP_PX = 2;
/** The "Steam settings" heading line, count included. Not imported elsewhere: only
 *  settingsCardHeightForRows below uses it, and the matching CSS in section-4.ts derives the same
 *  total from its own padding-bottom + line-height rather than this constant directly. */
const SETTINGS_CARD_HEADING_HEIGHT_PX = 22;
export const SETTINGS_CARD_PAD_TOP_PX = 6;
export const SETTINGS_CARD_PAD_BOTTOM_PX = 6;
/** Breathing room kept between the card's top edge and the tab bar's bottom edge. */
export const SETTINGS_CARD_TAB_BAR_GAP_PX = 6;

/** How tall the card would stand showing exactly `rows` result rows, heading and padding included. */
export function settingsCardHeightForRows(rows: number): number {
  const rowsBlock =
    rows > 0 ? rows * SETTINGS_CARD_ROW_HEIGHT_PX + (rows - 1) * SETTINGS_CARD_ROW_GAP_PX : 0;
  return (
    SETTINGS_CARD_PAD_TOP_PX + SETTINGS_CARD_HEADING_HEIGHT_PX + rowsBlock + SETTINGS_CARD_PAD_BOTTOM_PX
  );
}

/**
 * How many of `totalCount` results the card can actually show without its top edge passing the
 * room it has been given (`availableHeightPx` — the live gap between the question box's top edge
 * and the tab bar, already carrying the 6px clearance). Capped at SETTINGS_CARD_MAX_ROWS
 * regardless of how much room there is; on the Deck's own screen this comes out to about six, on
 * an external monitor it is the full eight (plan 56 lane E brief, measured on the built-in panel).
 * Never shows a row it cannot also show the heading for.
 */
export function settingsCardRowsThatFit(
  availableHeightPx: number,
  totalCount: number
): { shown: number; hiddenCount: number } {
  const cap = Math.max(0, Math.min(SETTINGS_CARD_MAX_ROWS, totalCount));
  let shown = cap;
  while (shown > 0 && settingsCardHeightForRows(shown) > availableHeightPx) {
    shown -= 1;
  }
  return { shown, hiddenCount: Math.max(0, totalCount - shown) };
}

/** Past this many words, a typed sentence reads as a question for the AI, not a setting hunt. */
const SETTINGS_CARD_MAX_VISIBLE_WORDS = 3;

/**
 * The let-out clause: does `input` sit inside some setting's own name as one exact, unbroken run?
 * The same test `nativeMatches` in intentPackSearch.ts uses, kept local here rather than exported
 * from that file so this stays a plain string check with no dependency on the intent-pack index —
 * a long sentence can still produce results through the intent-pack word list (see
 * shouldHideSettingsResultsCard below) without ever being an exact run inside a name.
 */
function isExactRunInsideASettingName(input: string): boolean {
  const lower = input.toLowerCase();
  if (!lower) return false;
  return SETTINGS_DATABASE.some((setting) => setting.toLowerCase().includes(lower));
}

/**
 * Whether the settings-results card should stay hidden for what is typed right now, even when
 * there are results for it — plan 45 section 5's table. Past three words, or as soon as there is
 * a question mark, a long sentence is almost always someone asking the AI a real question rather
 * than hunting for a setting by name, so the card gets out of the way — UNLESS what was typed is
 * an exact run inside a real setting's name, in which case it shows regardless of length or
 * punctuation (123 of 194 settings have names of three or more words, so a plain three-word cut
 * would hide the list at the exact moment someone finishes typing the name of the thing they were
 * looking for).
 */
export function shouldHideSettingsResultsCard(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return true;
  if (isExactRunInsideASettingName(trimmed)) return false;
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  if (wordCount > SETTINGS_CARD_MAX_VISIBLE_WORDS) return true;
  if (trimmed.includes("?")) return true;
  return false;
}

export function useSteamSettingsSearch({
  unifiedInput,
  intentPackIndex,
  setSelectedIndex,
  setNavigationMessage,
}: UseSteamSettingsSearchOptions) {
  const filteredSettings = useMemo(() => {
    return searchSettingsWithIntentPacks(unifiedInput, SETTINGS_DATABASE, intentPackIndex);
  }, [unifiedInput, intentPackIndex]);

  const onSettingClick = useCallback(
    (settingPath: string, index?: number) => {
      if (index !== undefined) setSelectedIndex(index);
      try {
        if (isQamSetting(settingPath)) {
          const qamTab = getQamTab(settingPath);
          Navigation.OpenQuickAccessMenu(qamTab);
          toaster.toast({ title: "Opening QAM", body: settingPath, duration: 2000 });
          setNavigationMessage(`Opened QAM: ${settingPath}`);
          return;
        }

        const steamUrlApi = SteamClient.URL as unknown as SteamUrlApi;
        const steamUrl = getSteamSettingsUrl(settingPath);
        steamUrlApi.ExecuteSteamURL(steamUrl);
        toaster.toast({ title: "Opening settings", body: settingPath, duration: 2000 });
        setNavigationMessage(`Opened: ${settingPath}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        toaster.toast({ title: "Navigation failed", body: message, duration: 3000 });
        setNavigationMessage(`Navigation failed: ${message}`);
      }
    },
    [setSelectedIndex, setNavigationMessage],
  );

  return { filteredSettings, onSettingClick };
}
