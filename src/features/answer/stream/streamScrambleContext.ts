/**
 * Title: The streamed-answer scramble setting, as one bundle
 *
 * Purpose: Two values decide whether a streaming answer's newest text
 * scrambles through symbols for a moment before settling into real letters,
 * and for how long. This file is the one place those values are grouped
 * into a single `StreamScrambleSettings` object, the one place the stock
 * values live, and the one place a React context for carrying that object
 * exists.
 *
 * Used for: `MainTab.tsx`, which builds the context value (the stock values,
 * or the off value while a game runs) and wraps the chat transcript in its
 * provider; and the answer-bubble code that reads it from the context.
 *
 * Solves: Gives the chat transcript's answer bubble the values as one
 * object through a context, because both `MainTabChatTranscript.tsx` and the
 * Ask hook that feeds it are already at their size limit with no room for a
 * new prop.
 *
 * Does not: Read or write any saved setting. There is none: since plan 105
 * answers always scramble (the Developer tab's switch, style, colour and time
 * rows are gone), and an old settings file that still holds those keys has
 * them ignored.
 */
import React from "react";

/**
 * Whether the newest letters scramble, and for how long each stays scrambled after it arrives (the one
 * look there is: every letter settles a moment after it arrived, drawn in the plugin's green).
 */
export type StreamScrambleSettings = {
  enabled: boolean;
  settleMs: number;
};

/** What every answer scrambles with: on, each letter scrambles for 400 ms after it arrives (the value the Developer tab offered as its default). */
export const STREAM_SCRAMBLE_STOCK: StreamScrambleSettings = {
  enabled: true,
  settleMs: 400,
};

/** The stock values with the switch off: what a reader sees before `MainTab` provides the real value, and what a running game gets. */
export const STREAM_SCRAMBLE_OFF: StreamScrambleSettings = { ...STREAM_SCRAMBLE_STOCK, enabled: false };

/**
 * What the context carries: the four settings, plus whether the answer on screen was stopped --
 * a stopped answer's scrambled letters turn real at once instead of finishing their settle (plan
 * 69; MainTab reads it from the Ask state it already receives).
 */
export type StreamScrambleContextValue = StreamScrambleSettings & { stopped?: boolean };

export const StreamScrambleContext = React.createContext<StreamScrambleContextValue>(STREAM_SCRAMBLE_OFF);
