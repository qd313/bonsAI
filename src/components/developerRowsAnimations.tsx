/**
 * Title: The Developer tab's Animations and Integrations rows
 *
 * Purpose: The rows of the last two Developer sections as lists for SectionRows: the preset suggestions
 * animation, the scramble switch and (only while it is on) how letters settle, how long each scrambles
 * (only for the settle style) and their colour; and the Steam Web API key field. One line per setting.
 *
 * Used for: DeveloperTab.tsx.
 *
 * Gotchas: A row that is not drawn is not focusable, so turning the scramble switch off while the ring sits on
 * it leaves the ring on the switch rather than stranding it on a row that just vanished. The key field's
 * ref in Decky is the component, not the input: nothing here reads it (the walk measures the DOM node).
 *
 * Does not: Decide what a setting does: the tab hands the setters in.
 */
import React from "react";
import { Focusable, PanelSectionRow, TextField } from "@decky/ui";

import { helpAttributes } from "../features/folded-tabs/useHelpStrip";
import {
  DEVELOPER_ROW_HELP,
  DEVELOPER_ROW_LABELS,
  streamScrambleColorAriaLabel,
  streamScrambleColorLabel,
  streamScrambleStyleDescription,
  streamScrambleStyleLabel,
} from "../features/folded-tabs/developerTabFolds";
import {
  PRESET_CHIP_ANIMATION_OPTIONS,
  STEAM_WEB_API_KEY_MAX_LEN,
  STREAM_SCRAMBLE_COLOR_OPTIONS,
  STREAM_SCRAMBLE_SETTLE_MS_CHOICES,
  STREAM_SCRAMBLE_STYLE_OPTIONS,
  type PresetChipAnimation,
} from "../data/bonsaiSettingsSchema";
import type { StreamScrambleSettings } from "../features/stream-scramble/streamScrambleContext";
import { textPx } from "../styles/sections/textPx";
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

export function integrationsRows(args: { steamWebApiKey: string; setSteamWebApiKey: (v: string) => void }): DevRow[] {
  return [
    {
      key: "steam-key",
      stop: true,
      render: (nav) => (
        <PanelSectionRow>
          {/* The Focusable round the field is where the edge moves live; the field itself keeps none. */}
          <Focusable {...(nav as Record<string, unknown>)}>
            <div
              className="bonsai-dense-row bonsai-dense-row--field bonsai-settings-bleed"
              style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}
              {...helpAttributes(DEVELOPER_ROW_LABELS.steamWebApiKey, DEVELOPER_ROW_HELP.steamWebApiKey)}
            >
              <div style={{ color: "#dcdedf", fontWeight: 600, fontSize: textPx(12), marginBottom: 3 }}>
                {DEVELOPER_ROW_LABELS.steamWebApiKey}
              </div>
              <div className="bonsai-settings-text-field-host">
                <TextField
                  label=""
                  value={args.steamWebApiKey}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    args.setSteamWebApiKey(e.target.value.slice(0, STEAM_WEB_API_KEY_MAX_LEN));
                  }}
                />
              </div>
            </div>
          </Focusable>
        </PanelSectionRow>
      ),
    },
  ];
}
