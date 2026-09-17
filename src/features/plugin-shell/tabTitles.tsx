/**
 * Title: The tab icons Decky actually draws
 *
 * Purpose: Builds the small icon-only element Decky shows for each of
 * bonsAI's tabs, plus every other piece of wording those tabs need: the
 * name read out for accessibility, the short word shown on the collapsed
 * tab bar, and the label shown on the open strip.
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
  TAB_BAR_CELL_BUG_ICON_PX,
  TAB_BAR_CELL_ICON_PX,
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
 * The short name the collapsed tab bar shows beside its dashes (plan 30 § 4.7). One word each, the
 * way the tab is spoken about, not the accessible sentence above: the bar has room for one name at
 * 11px and "Where AI runs" would wrap. Not translated — every label on this surface is an English
 * literal today; the UI catalog holds toasts only.
 */
export const BONSAI_TAB_SHORT_NAMES: Readonly<Record<BonsaiTabId, string>> = {
  main: "Main",
  ollama: "Ollama",
  settings: "Settings",
  permissions: "Permissions",
  developer: "Developer",
  about: "About",
};

/**
 * The word shown under the lit icon on the open strip (plan 59 § 3 item 5). Lowercase, because the
 * stylesheet draws it in small capitals; "perms" and "dev" are the standing words for Permissions
 * and Developer at five tabs and at six (D109 item 2 — the full words would overhang their cell by
 * about 10px each side, five times the design's own tolerance for "settings"). The thin bar at
 * rest keeps the full names from `BONSAI_TAB_SHORT_NAMES`.
 */
export const BONSAI_TAB_STRIP_LABELS: Readonly<Record<BonsaiTabId, string>> = {
  main: "main",
  ollama: "ollama",
  settings: "settings",
  permissions: "perms",
  developer: "dev",
  about: "about",
};

/** The word a strip cell shows under its icon when it is the lit one. */
export function bonsaiTabStripLabel(id: BonsaiTabId): string {
  return BONSAI_TAB_STRIP_LABELS[id];
}

/**
 * The icon each open-strip cell shows (plan 59 § 3): every tab the same 22px size, except the bug,
 * whose artwork carries inner padding and is drawn at 26px so its footprint matches the rest. Main
 * uses the plugin's own logo (plan 59 § 5) in place of the outline tree the title icon still uses.
 */
export function bonsaiTabStripIcon(id: BonsaiTabId): React.ReactElement {
  switch (id) {
    case "main":
      return <BonsaiLogoIcon size={TAB_BAR_CELL_ICON_PX} />;
    case "ollama":
      return <OllamaTabIcon size={TAB_BAR_CELL_ICON_PX} />;
    case "settings":
      return <GearIcon size={TAB_BAR_CELL_ICON_PX} />;
    case "permissions":
      return <LockIcon size={TAB_BAR_CELL_ICON_PX} />;
    case "developer":
      return <BugIcon size={TAB_BAR_CELL_BUG_ICON_PX} />;
    case "about":
      return <AboutTabTitleIcon size={TAB_BAR_CELL_ICON_PX} />;
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
