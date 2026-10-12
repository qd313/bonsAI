/**
 * Title: The Developer tab's Navigation and Logging & exports rows
 *
 * Purpose: The rows of the third and fourth Developer sections as lists for SectionRows: which tab the plugin
 * reopens on; the app log level, the Open Permissions button (only while Save files to Desktop is off and a
 * way to the Permissions tab was passed in), the auto-save and verbose-log switches, the Force session RAG
 * chips switch, and the frozen test chips (their state, the pinned list, the Clear button). One line per
 * setting; the words that change with a pick change with it in the help strip.
 *
 * Used for: DeveloperTab.tsx.
 *
 * Does not: Decide what a setting does: the tab hands the setters in. Does not wire any D-pad move between
 * rows (SectionRows hands the section's two edges theirs).
 */
import { PanelSectionRow } from "@decky/ui";

import {
  DEVELOPER_ROW_HELP,
  DEVELOPER_ROW_LABELS,
  appLogHelp,
  desktopAppLogLevelDescription,
  desktopAppLogLevelLabel,
  tabResumeModeDescription,
  tabResumeModeLabel,
  tabToOpenOnHelp,
} from "../features/folded-tabs/developerTabFolds";
import {
  DESKTOP_APP_LOG_LEVEL_OPTIONS,
  TAB_RESUME_MODE_OPTIONS,
  type DesktopAppLogLevel,
  type TabResumeMode,
} from "../data/bonsaiSettingsSchema";
import type { BonsaiCapabilityKey } from "../utils/permissionDeepLink";
import { textPx } from "../styles/sections/textPx";
import { DeveloperOptionRow } from "./DeveloperOptionRow";
import { DevButtonRow, DevInfoStop, type DevRow } from "./developerRows";
import { DevSwitchRow } from "./developerRowsDiagnostics";

export function navigationRows(args: { tabResumeMode: TabResumeMode; setTabResumeMode: (v: TabResumeMode) => void }): DevRow[] {
  return [
    {
      key: "tab-to-open-on",
      stop: true,
      render: (nav) => (
        <DeveloperOptionRow
          title={DEVELOPER_ROW_LABELS.tabToOpenOn}
          description={tabToOpenOnHelp(args.tabResumeMode)}
          options={TAB_RESUME_MODE_OPTIONS.map((mode) => ({
            value: mode,
            label: tabResumeModeLabel[mode],
            ariaLabel: `${tabResumeModeLabel[mode]}: ${tabResumeModeDescription[mode]}`,
          }))}
          activeValue={args.tabResumeMode}
          onSelect={args.setTabResumeMode}
          nav={nav}
        />
      ),
    },
  ];
}

/**
 * The Logging & exports section's rows, in order: the app log level, Open Permissions (only while Save files
 * to Desktop is off and a way to the Permissions tab was passed in), the auto-save, verbose and Force switches,
 * the frozen test chips line and, while some are pinned, their list and the Clear button.
 */
export function loggingRows(args: {
  desktopAppLogLevel: DesktopAppLogLevel;
  setDesktopAppLogLevel: (v: DesktopAppLogLevel) => void;
  filesystemWrite: boolean;
  onJumpToPermission?: (capability: BonsaiCapabilityKey) => void;
  autoSave: boolean;
  setAutoSave: (v: boolean) => void;
  verbose: boolean;
  setVerbose: (v: boolean) => void;
  forceChips: boolean;
  setForceChips: (v: boolean) => void;
  frozenChips: string[];
  setFrozenChips: (v: string[]) => void;
}): DevRow[] {
  const rows: DevRow[] = [
    {
      key: "app-log",
      stop: true,
      render: (nav) => (
        <DeveloperOptionRow
          title={DEVELOPER_ROW_LABELS.appLog}
          description={appLogHelp(args.desktopAppLogLevel, args.filesystemWrite)}
          options={DESKTOP_APP_LOG_LEVEL_OPTIONS.map((level) => ({
            value: level,
            label: desktopAppLogLevelLabel[level],
            ariaLabel: `${desktopAppLogLevelLabel[level]}: ${desktopAppLogLevelDescription[level]}`,
          }))}
          activeValue={args.desktopAppLogLevel}
          onSelect={args.setDesktopAppLogLevel}
          nav={nav}
        />
      ),
    },
  ];
  const jump = args.onJumpToPermission;
  if (!args.filesystemWrite && jump) {
    rows.push({
      key: "open-permissions",
      stop: true,
      render: (nav) => (
        <DevButtonRow
          label="Open Permissions"
          help={DEVELOPER_ROW_HELP.appLogNeedsPermission}
          nav={nav}
          onClick={() => jump("filesystem_write")}
        >
          Open Permissions
        </DevButtonRow>
      ),
    });
  }
  rows.push(
    {
      key: "auto-save",
      stop: true,
      render: (nav) => (
        <DevSwitchRow
          label={DEVELOPER_ROW_LABELS.autoSave}
          help={DEVELOPER_ROW_HELP.autoSave}
          checked={args.autoSave}
          onChange={args.setAutoSave}
          nav={nav}
        />
      ),
    },
    {
      key: "verbose",
      stop: true,
      render: (nav) => (
        <DevSwitchRow
          label={DEVELOPER_ROW_LABELS.verbose}
          help={DEVELOPER_ROW_HELP.verbose}
          checked={args.verbose}
          onChange={args.setVerbose}
          nav={nav}
        />
      ),
    },
    {
      key: "force-chips",
      stop: true,
      render: (nav) => (
        <DevSwitchRow
          label={DEVELOPER_ROW_LABELS.forceChips}
          help={DEVELOPER_ROW_HELP.forceChips}
          checked={args.forceChips}
          onChange={args.setForceChips}
          nav={nav}
        />
      ),
    },
    {
      key: "frozen",
      stop: true,
      render: (nav) => (
        <DevInfoStop
          label={DEVELOPER_ROW_LABELS.frozenChips}
          value={args.frozenChips.length === 0 ? "None pinned" : `${args.frozenChips.length} pinned`}
          help={args.frozenChips.length === 0 ? DEVELOPER_ROW_HELP.frozenNone : DEVELOPER_ROW_HELP.frozenPinned(args.frozenChips.length)}
          nav={nav}
        />
      ),
    },
  );
  if (args.frozenChips.length > 0) {
    const pinned = args.frozenChips;
    rows.push(
      {
        key: "frozen-list",
        render: () => (
          <PanelSectionRow>
            <ol
              className="bonsai-prose"
              style={{ fontSize: textPx(11), color: "#c8d8ea", margin: "0 0 6px 0", paddingLeft: 18, lineHeight: 1.4 }}
            >
              {pinned.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ol>
          </PanelSectionRow>
        ),
      },
      {
        key: "frozen-clear",
        stop: true,
        render: (nav) => (
          <DevButtonRow label="Clear frozen test chips" nav={nav} onClick={() => args.setFrozenChips([])}>
            Clear frozen test chips
          </DevButtonRow>
        ),
      },
    );
  }
  return rows;
}
