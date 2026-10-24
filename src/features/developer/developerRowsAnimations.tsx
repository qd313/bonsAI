/**
 * Title: The Developer tab's Animations rows
 *
 * Purpose: The rows of the last Developer section as a list for SectionRows: the preset suggestions
 * animation, the scramble switch and (only while it is on) how letters settle, how long each scrambles
 * (only for the settle style) and their colour. One line per setting.
 *
 * Used for: DeveloperTab.tsx.
 *
 * Gotchas: A row that is not drawn is not focusable, so turning the scramble switch off while the ring sits on
 * it leaves the ring on the switch rather than stranding it on a row that just vanished.
 *
 * Does not: Decide what a setting does: the tab hands the setters in.
 */
import {
  DEVELOPER_ROW_HELP,
  DEVELOPER_ROW_LABELS,
  streamScrambleColorAriaLabel,
  streamScrambleColorLabel,
  streamScrambleStyleDescription,
  streamScrambleStyleLabel,
} from "./developerTabFolds";
import {
  PRESET_CHIP_ANIMATION_OPTIONS,
  STREAM_SCRAMBLE_COLOR_OPTIONS,
  STREAM_SCRAMBLE_SETTLE_MS_CHOICES,
  STREAM_SCRAMBLE_STYLE_OPTIONS,
  type PresetChipAnimation,
} from "../settings/bonsaiSettingsSchema";
import type { StreamScrambleSettings } from "../answer/stream/streamScrambleContext";
import { DeveloperOptionRow } from "./DeveloperOptionRow";
import type { DevRow } from "./developerRows";
import { DevSwitchRow } from "./developerRowsDiagnostics";

/**
 * The Animations section's rows, in order: the preset suggestions animation, the scramble switch, and (only while
 * the switch is on) how letters settle, how long each scrambles (settle style only) and their colour.
 */
export function animationsRows(args: {
  presetChipAnimation: PresetChipAnimation;
  setPresetChipAnimation: (v: PresetChipAnimation) => void;
  streamScramble: StreamScrambleSettings;
  onStreamScrambleChange: (patch: Partial<StreamScrambleSettings>) => void;
}): DevRow[] {
  const { streamScramble: sc, onStreamScrambleChange } = args;
  const rows: DevRow[] = [
    {
      key: "preset",
      stop: true,
      render: (nav) => (
        <DeveloperOptionRow
          title={DEVELOPER_ROW_LABELS.presetAnimation}
          options={PRESET_CHIP_ANIMATION_OPTIONS.map((mode) => ({
            value: mode,
            label: mode,
            ariaLabel: `Preset animation: ${mode}`,
          }))}
          activeValue={args.presetChipAnimation}
          onSelect={args.setPresetChipAnimation}
          nav={nav}
        />
      ),
    },
    {
      key: "scramble",
      stop: true,
      render: (nav) => (
        <DevSwitchRow
          label={DEVELOPER_ROW_LABELS.scramble}
          help={DEVELOPER_ROW_HELP.scramble}
          checked={sc.enabled}
          onChange={(checked) => onStreamScrambleChange({ enabled: checked })}
          nav={nav}
        />
      ),
    },
  ];
  if (sc.enabled) {
    rows.push({
      key: "settle-style",
      stop: true,
      render: (nav) => (
        <DeveloperOptionRow
          title={DEVELOPER_ROW_LABELS.howLettersSettle}
          description={streamScrambleStyleDescription[sc.style]}
          options={STREAM_SCRAMBLE_STYLE_OPTIONS.map((style) => ({ value: style, label: streamScrambleStyleLabel[style] }))}
          activeValue={sc.style}
          onSelect={(style) => onStreamScrambleChange({ style })}
          optionHelp={(style) => streamScrambleStyleDescription[style]}
          nav={nav}
        />
      ),
    });
    if (sc.style === "settle") {
      rows.push({
        key: "settle-ms",
        stop: true,
        render: (nav) => (
          <DeveloperOptionRow
            title={`${DEVELOPER_ROW_LABELS.settleTime}: ${sc.settleMs} ms`}
            options={STREAM_SCRAMBLE_SETTLE_MS_CHOICES.map((ms) => ({ value: ms, label: String(ms) }))}
            activeValue={sc.settleMs}
            onSelect={(settleMs) => onStreamScrambleChange({ settleMs })}
            nav={nav}
          />
        ),
      });
    }
    rows.push({
      key: "scramble-colour",
      stop: true,
      render: (nav) => (
        <DeveloperOptionRow
          title={DEVELOPER_ROW_LABELS.scrambleColour}
          options={STREAM_SCRAMBLE_COLOR_OPTIONS.map((color) => ({
            value: color,
            label: streamScrambleColorLabel[color],
            ariaLabel: streamScrambleColorAriaLabel[color],
          }))}
          activeValue={sc.color}
          onSelect={(color) => onStreamScrambleChange({ color })}
          nav={nav}
        />
      ),
    });
  }
  return rows;
}
