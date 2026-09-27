/**
 * While a game runs, the panel draws its answers with less work (lighterWhileGameRuns.ts): the
 * game and the model already share the Deck's chip. These pin who counts as "a game is running",
 * the pace the answer's text moves at, and the Deck's switch for comparing with and without.
 */
import { afterEach, describe, expect, it } from "vitest";

import {
  GAME_RUNNING_BEAT_MS,
  gameIsRunning,
  lighterWhileGameRuns,
  streamBeatMsFor,
} from "./lighterWhileGameRuns";
import { STREAM_BEAT_MS } from "./streamBeat";

type SwitchWindow = Window & { __bonsaiGameLoad?: unknown };

afterEach(() => {
  delete (window as SwitchWindow).__bonsaiGameLoad;
});

describe("gameIsRunning", () => {
  it("is true only for the context the footnote names as an active game", () => {
    expect(gameIsRunning({ app_id: "1", app_context: "active", app_name: "DRG" })).toBe(true);
    expect(gameIsRunning({ app_id: "", app_context: "active" })).toBe(false);
    expect(gameIsRunning({ app_id: "1", app_context: "none" })).toBe(false);
    expect(gameIsRunning(null)).toBe(false);
    expect(gameIsRunning(undefined)).toBe(false);
  });
});

describe("lighterWhileGameRuns", () => {
  it("turns every part on while a game runs, and none with nothing running", () => {
    expect(lighterWhileGameRuns(true)).toEqual({ beat: true, scramble: true, steady: true, blur: true });
    expect(lighterWhileGameRuns(false)).toEqual({ beat: false, scramble: false, steady: false, blur: false });
  });

  it("the Deck's switch can turn it all off with a game running", () => {
    (window as SwitchWindow).__bonsaiGameLoad = { off: true };
    expect(lighterWhileGameRuns(true)).toEqual({ beat: false, scramble: false, steady: false, blur: false });
  });

  it("the Deck's switch can force it on with nothing running", () => {
    (window as SwitchWindow).__bonsaiGameLoad = { force: true };
    expect(lighterWhileGameRuns(false)).toEqual({ beat: true, scramble: true, steady: true, blur: true });
  });

  it("the Deck's switch can leave out one part at a time", () => {
    (window as SwitchWindow).__bonsaiGameLoad = { scramble: false, blur: false };
    expect(lighterWhileGameRuns(true)).toEqual({ beat: true, scramble: false, steady: true, blur: false });
  });

  it("ignores a switch of the wrong shape", () => {
    (window as SwitchWindow).__bonsaiGameLoad = "off";
    expect(lighterWhileGameRuns(true).beat).toBe(true);
    (window as SwitchWindow).__bonsaiGameLoad = { off: "yes", beat: 0 };
    expect(lighterWhileGameRuns(true).beat).toBe(true);
  });
});

describe("streamBeatMsFor", () => {
  it("moves the answer's text on half as often while a game runs", () => {
    expect(streamBeatMsFor(false)).toBe(STREAM_BEAT_MS);
    expect(streamBeatMsFor(true)).toBe(GAME_RUNNING_BEAT_MS);
    expect(GAME_RUNNING_BEAT_MS).toBeGreaterThan(STREAM_BEAT_MS);
  });

  it("keeps the usual beat when the Deck's switch leaves the beat out", () => {
    (window as SwitchWindow).__bonsaiGameLoad = { beat: false };
    expect(streamBeatMsFor(true)).toBe(STREAM_BEAT_MS);
  });
});
