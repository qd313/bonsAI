import { beforeEach, describe, expect, it } from "vitest";
import {
  beginFinish,
  continuesShownAnswer,
  pendingFinish,
  rememberLiveText,
  resetLiveScrambleMemoForTests,
} from "./liveScrambleMemo";
import { SCRAMBLE_FINISH_MS } from "./streamScrambleMath";

beforeEach(() => resetLiveScrambleMemoForTests());

describe("continuesShownAnswer", () => {
  it("is true only for text that starts with the whole of what was last shown", () => {
    rememberLiveText("Hello world");
    expect(continuesShownAnswer("Hello world")).toBe(true);
    expect(continuesShownAnswer("Hello world, miners")).toBe(true);
    expect(continuesShownAnswer("Hello")).toBe(false);
    expect(continuesShownAnswer("Goodbye")).toBe(false);
  });

  it("is false before anything was shown", () => {
    expect(continuesShownAnswer("Hello")).toBe(false);
  });
});

describe("beginFinish and pendingFinish", () => {
  it("keeps the handed-over settle point for 0.6 s, then forgets it", () => {
    beginFinish({ probe: "the gold vein", offset: 4 }, 1000);
    expect(pendingFinish(1000 + SCRAMBLE_FINISH_MS - 1)).toEqual({ probe: "the gold vein", offset: 4, startedAt: 1000 });
    expect(pendingFinish(1000 + SCRAMBLE_FINISH_MS)).toBeNull();
    expect(pendingFinish(1000)).toBeNull();
  });

  it("holds nothing when the stream's end had nothing findable to hand over", () => {
    beginFinish({ probe: "the gold vein", offset: 4 }, 1000);
    beginFinish(null, 1100);
    expect(pendingFinish(1100)).toBeNull();
  });
});
