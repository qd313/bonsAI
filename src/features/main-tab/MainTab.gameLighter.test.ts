/**
 * The Main tab's column is marked while a game runs and a question is in flight
 * (lighterWhileGameRuns.ts, plan 70): the mark holds the panel's small animations still
 * (gameRunningLighter.ts). With nothing running, or with no question in flight, the column is
 * exactly as before.
 */
import { afterEach, describe, expect, it } from "vitest";

import { mainTabColumnClassName } from "./MainTab";

afterEach(() => {
  delete (window as Window & { __bonsaiGameLoad?: unknown }).__bonsaiGameLoad;
});

describe("mainTabColumnClassName", () => {
  it("is marked steady only while a game runs and a question is in flight", () => {
    expect(mainTabColumnClassName(true, true)).toContain("bonsai-main-tab-column--game-steady");
    expect(mainTabColumnClassName(true, false)).toBe("bonsai-main-tab-column");
    expect(mainTabColumnClassName(false, true)).toBe("bonsai-main-tab-column");
    expect(mainTabColumnClassName(false, false)).toBe("bonsai-main-tab-column");
  });

  it("the Deck's switch can leave the steady part out", () => {
    (window as Window & { __bonsaiGameLoad?: unknown }).__bonsaiGameLoad = { steady: false };
    expect(mainTabColumnClassName(true, true)).not.toContain("--game-steady");
  });
});
