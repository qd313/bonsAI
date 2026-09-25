/**
 * Title: The streamed-answer scramble setting, as one bundle
 *
 * Purpose: Four settings decide whether a streaming answer's newest text
 * scrambles through symbols for a moment before settling into real letters,
 * and if so how. This file is the one place those four values are grouped
 * into a single `StreamScrambleSettings` object, and the one place a React
 * context for carrying that object exists.
 *
 * Used for: `DeveloperTab.tsx`, which reads and changes the group as one
 * prop and one change function instead of four of each; `MainTab.tsx`,
 * which builds the context value and wraps the chat transcript in its
 * provider; and the answer-bubble code that will read it from the context
 * (plan 69 step 3, not built yet).
 *
 * Solves: Threading four separate values (and, on the Developer tab, four
 * separate setters) through the plugin's main screen to every tab that
 * touches them was the single largest driver of that screen's own
 * `shell_props_to_tabs` count — the automatic check on how many things it
 * hands down. Grouping them into one value and one change function keeps
 * that count from growing with every field this setting has, and gives the
 * chat transcript's answer bubble the same one object through a context,
 * because both `MainTabChatTranscript.tsx` and the Ask hook that feeds it
 * are already at their size limit with no room for a new prop either.
 *
 * Does not: Read or write the underlying settings — see
 * `bonsaiSettingsSchema.ts` and `usePluginSettings.ts` for that. This file
 * only defines the shape the four values travel in and the context that
 * carries it partway down the tree.
 */
import React from "react";
import {
  DEFAULT_STREAM_SCRAMBLE_COLOR,
  DEFAULT_STREAM_SCRAMBLE_SETTLE_MS,
  DEFAULT_STREAM_SCRAMBLE_STYLE,
  type StreamScrambleColor,
  type StreamScrambleStyle,
} from "../../data/bonsaiSettingsSchema";

export type StreamScrambleSettings = {
  enabled: boolean;
  style: StreamScrambleStyle;
  color: StreamScrambleColor;
  settleMs: number;
};

/** The switch off, at the schema's own defaults — what a reader sees before `MainTab` provides the real values, and what the Developer tab starts from on a fresh install. */
export const STREAM_SCRAMBLE_OFF: StreamScrambleSettings = {
  enabled: false,
  style: DEFAULT_STREAM_SCRAMBLE_STYLE,
  color: DEFAULT_STREAM_SCRAMBLE_COLOR,
  settleMs: DEFAULT_STREAM_SCRAMBLE_SETTLE_MS,
};

export const StreamScrambleContext = React.createContext<StreamScrambleSettings>(STREAM_SCRAMBLE_OFF);
