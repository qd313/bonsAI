/**
 * Title: The streamed-answer scramble setting, as one bundle
 *
 * Purpose: Four values decide whether a streaming answer's newest text
 * scrambles through symbols for a moment before settling into real letters,
 * and if so how. This file is the one place those four values are grouped
 * into a single `StreamScrambleSettings` object, the one place the stock
 * values live, and the one place a React context for carrying that object
 * exists.
 *
 * Used for: `MainTab.tsx`, which builds the context value (the stock values,
 * or the off value while a game runs) and wraps the chat transcript in its
 * provider; and the answer-bubble code that reads it from the context.
 *
 * Solves: Gives the chat transcript's answer bubble the four values as one
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

/** How the newest letters look while they are unsettled. */
export type StreamScrambleStyle = "settle" | "chip" | "tail";
/** The colour an unsettled letter is drawn in. */
export type StreamScrambleColor = "same" | "dim" | "green" | "cyan";

export type StreamScrambleSettings = {
  enabled: boolean;
  style: StreamScrambleStyle;
  color: StreamScrambleColor;
  settleMs: number;
};

/** What every answer scrambles with: on, letters settle one after another, green, 400 ms (the values the Developer tab offered as its defaults). */
export const STREAM_SCRAMBLE_STOCK: StreamScrambleSettings = {
  enabled: true,
  style: "settle",
  color: "green",
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
