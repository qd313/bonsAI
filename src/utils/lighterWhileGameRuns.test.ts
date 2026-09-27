/**
 * While a game runs, the panel does less for each step of an arriving answer
 * (lighterWhileGameRuns.ts): the game and the model already hold the Deck's processor. These pin
 * who counts as "a game is running", the pace of the status checks, whether the text is smoothed,
 * and the Deck's switch for comparing with and without.
 */
import { afterEach, describe, expect, it } from "vitest";

import {
  GAME_RUNNING_POLL_MS,
  gameIsRunning,
  lighterWhileGameRuns,
  smoothRevealFor,
  streamPollMsFor,
} from "./lighterWhileGameRuns";

type SwitchWindow = Window & { __bonsaiGameLoad?: unknown };

function setSwitch(value: unknown): void {
  (window as SwitchWindow).__bonsaiGameLoad = value;
}

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
    expect(lighterWhileGameRuns(true)).toEqual({ pace: true, scramble: true, steady: true });
    expect(lighterWhileGameRuns(false)).toEqual({ pace: false, scramble: false, steady: false });
  });

  it("the Deck's switch can turn it all off with a game running", () => {
    setSwitch({ off: true });
    expect(lighterWhileGameRuns(true)).toEqual({ pace: false, scramble: false, steady: false });
  });

  it("the Deck's switch can force it on with nothing running", () => {
    setSwitch({ force: true });
    expect(lighterWhileGameRuns(false)).toEqual({ pace: true, scramble: true, steady: true });
  });

  it("the Deck's switch can leave out one part at a time", () => {
    setSwitch({ scramble: false, steady: false });
    expect(lighterWhileGameRuns(true)).toEqual({ pace: true, scramble: false, steady: false });
  });

  it("ignores a switch of the wrong shape", () => {
    setSwitch("off");
    expect(lighterWhileGameRuns(true).pace).toBe(true);
    setSwitch({ off: "yes", pace: 0 });
    expect(lighterWhileGameRuns(true).pace).toBe(true);
  });
});

describe("streamPollMsFor", () => {
  it("checks less often while a game runs, and at the usual pace otherwise", () => {
    expect(streamPollMsFor(false, 150)).toBe(150);
    expect(streamPollMsFor(true, 150)).toBe(GAME_RUNNING_POLL_MS);
    expect(GAME_RUNNING_POLL_MS).toBeGreaterThan(150);
  });

  it("takes the Deck's pace, kept inside 50 to 2000 ms, only while the lighter pace is on", () => {
    setSwitch({ pollMs: 400 });
    expect(streamPollMsFor(true, 150)).toBe(400);
    expect(streamPollMsFor(false, 150)).toBe(150);
    setSwitch({ pollMs: 5 });
    expect(streamPollMsFor(true, 150)).toBe(50);
    setSwitch({ pollMs: 99999 });
    expect(streamPollMsFor(true, 150)).toBe(2000);
    setSwitch({ pollMs: "fast" });
    expect(streamPollMsFor(true, 150)).toBe(GAME_RUNNING_POLL_MS);
    setSwitch({ pace: false, pollMs: 400 });
    expect(streamPollMsFor(true, 150)).toBe(150);
  });
});

describe("smoothRevealFor", () => {
  it("smooths the text between checks only when the lighter pace is off", () => {
    expect(smoothRevealFor(false)).toBe(true);
    expect(smoothRevealFor(true)).toBe(false);
    setSwitch({ pace: false });
    expect(smoothRevealFor(true)).toBe(true);
  });
});
