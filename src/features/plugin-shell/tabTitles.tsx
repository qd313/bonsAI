/**
 * Title: The tab icons Decky actually draws
 *
 * Purpose: Builds the small icon-only element Decky shows for each of
 * bonsAI's tabs, plus every other piece of wording those tabs need: the
 * name read out for accessibility, and the short word and the small
 * icon shown on the tab bar.
 *
 * Used for: index.tsx, once per tab, when the tabs are put together.
 *
 * Solves: Keeps the markup every tab's title is built from in one place,
 * instead of each tab repeating it.
 *
 * Does not: Decide which tabs exist, or which one is currently open — that
 * is the plugin shell's job.
 */
import React from "react";

import {
  AboutTabTitleIcon,
  BonsaiLogoIcon,
  BonsaiTreeTabIcon,
  BugIcon,
  GearIcon,
  LockIcon,
  OllamaTabIcon,
} from "../../components/icons";
import {
  TAB_BAR_BUG_ICON_SCALE,
  TAB_TITLE_DEBUG_TAB_ICON_PX,
  TAB_TITLE_ICON_PX,
  TAB_TITLE_MAIN_TAB_ICON_PX,
} from "../unified-input/constants";

export type BonsaiTabId = "main" | "ollama" | "settings" | "permissions" | "developer" | "about";

/**
 * Every tab id, including ones not always mounted (Developer).
 * The scoped stylesheet emits one active-marker rule per id, so a new tab that is missing here
 * renders correctly but never shows the marker.
 */
export const ALL_BONSAI_TAB_IDS: readonly BonsaiTabId[] = [
  "main",
  "ollama",
  "settings",
  "permissions",
  "developer",
  "about",
];

/**
 * What each tab is called out loud. The titles are icons with no text, so without this a tab has no
 * accessible name of its own and anything reading labels falls back to the nearest text it can find
 * — which, on device 2026-08-28, was *the whole tab's contents*: a probe sitting on the Main tab
 * icon reported the chip carousel's text, so a chip looked focused when the D-pad was on the strip
 * above it. Screen readers hit the same wall. Short names, the way the tab is spoken about in the
 * UI, not sentences.
 */
export const BONSAI_TAB_ACCESSIBLE_NAMES: Readonly<Record<BonsaiTabId, string>> = {
  main: "Ask bonsAI",
  ollama: "Where AI runs",
  settings: "Settings",
  permissions: "Permissions",
  developer: "Developer",
  about: "About bonsAI",
};

/**
 * The short name the tab bar shows for the current tab (plan 30 § 4.7). One word each, the way the
 * tab is spoken about, not the accessible sentence above: the bar has room for one name at 11px and
 * "Where AI runs" would wrap. Not translated — every label on this surface is an English literal
 * today; the UI catalog holds toasts only.
 */
export const BONSAI_TAB_SHORT_NAMES: Readonly<Record<BonsaiTabId, string>> = {
  // Drawn in small caps on the bar (tabIndicatorBar.ts), not upper-cased like the other names (plan 87 F1).
  main: "bonsAI",
  ollama: "Ollama",
  settings: "Settings",
  permissions: "Permissions",
  developer: "Developer",
  about: "About",
};

/**
 * A tab's icon on the tab bar, at `size` (12 for the current tab, 11 for the others; plan 84's T3).
 * The same drawings the drop-down strip used (plan 59 § 3, § 5): Main is the plugin's own logo, not
 * the outline tree Steam's hidden header still carries, and the bug, whose artwork carries inner
 * padding, is drawn larger so its footprint matches the rest.
 */
export function bonsaiTabBarIcon(id: BonsaiTabId, size: number): React.ReactElement {
  switch (id) {
    case "main":
      return <BonsaiLogoIcon size={size} />;
    case "ollama":
      return <OllamaTabIcon size={size} />;
    case "settings":
      return <GearIcon size={size} />;
    case "permissions":
      return <LockIcon size={size} />;
    case "developer":
      return <BugIcon size={Math.round(size * TAB_BAR_BUG_ICON_SCALE)} />;
    case "about":
      return <AboutTabTitleIcon size={size} />;
  }
}

export function bonsaiTabIconTitle(classSuffix: BonsaiTabId, children: React.ReactNode): React.ReactElement {
  return (
    <div className="bonsai-tab-title-leaf" aria-label={BONSAI_TAB_ACCESSIBLE_NAMES[classSuffix]}>
      <div className={`bonsai-tab-title-shell bonsai-tab-title-shell--${classSuffix}`}>
        <span className={`bonsai-tab-title-icon bonsai-tab-title-icon--${classSuffix}`}>{children}</span>
      </div>
    </div>
  );
}

export const DECKY_TAB_TITLES = {
  main: bonsaiTabIconTitle("main", <BonsaiTreeTabIcon size={TAB_TITLE_MAIN_TAB_ICON_PX} />),
  ollama: bonsaiTabIconTitle("ollama", <OllamaTabIcon size={TAB_TITLE_ICON_PX} />),
  settings: bonsaiTabIconTitle("settings", <GearIcon size={TAB_TITLE_ICON_PX} />),
  permissions: bonsaiTabIconTitle("permissions", <LockIcon size={TAB_TITLE_ICON_PX} />),
  developer: bonsaiTabIconTitle("developer", <BugIcon size={TAB_TITLE_DEBUG_TAB_ICON_PX} />),
  about: bonsaiTabIconTitle("about", <AboutTabTitleIcon size={TAB_TITLE_ICON_PX} />),
} as const;
