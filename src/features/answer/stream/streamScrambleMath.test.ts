import { afterEach, describe, expect, it } from "vitest";
import {
  SCRAMBLE_FINISH_MS,
  SCRAMBLE_SLOT_MARK,
  churnCellKind,
  churnSymbol,
  finishProbeAt,
  lettersSettledInFinish,
  locateSettlePoint,
  settledMarkdownWithSlot,
  settlePointAfterMoment,
  settlePointChipPace,
  settlePointFixedTail,
  withoutInlineMarks,
} from "./streamScrambleMath";
import { setAiRunsOnPc } from "./streamPace";

describe("churnCellKind and churnSymbol", () => {
  it("keeps spaces and line breaks as they are, drops bold and code marks, and scrambles the rest", () => {
    expect([..."a \n*`Z9"].map(churnCellKind)).toEqual(["letter", "blank", "blank", "mark", "mark", "letter", "letter"]);
  });

  it("draws one visible symbol per scrambled letter", () => {
    for (let i = 0; i < 20; i += 1) {
      const symbol = churnSymbol();
      expect(symbol).toHaveLength(1);
      expect(symbol.trim()).toBe(symbol);
    }
  });
});

describe("withoutInlineMarks", () => {
  it("leaves the words and drops the marks the renderer would turn into bold or code", () => {
    expect(withoutInlineMarks("Use **the hammer** and `dig`.")).toBe("Use the hammer and dig.");
  });
});

describe("settlePointAfterMoment", () => {
  it("settles every letter whose moment has passed, and stops at the first that has not", () => {
    const arrivals = [0, 0, 100, 100, 300];
    expect(settlePointAfterMoment(arrivals, 0, 399, 400)).toBe(0);
    expect(settlePointAfterMoment(arrivals, 0, 400, 400)).toBe(2);
    expect(settlePointAfterMoment(arrivals, 2, 500, 400)).toBe(4);
    expect(settlePointAfterMoment(arrivals, 4, 700, 400)).toBe(5);
  });

  it("never moves backwards from where it already was", () => {
    expect(settlePointAfterMoment([0, 0, 900], 2, 100, 400)).toBe(2);
  });
});

describe("settlePointChipPace", () => {
  it("settles one letter per 42 ms of credit and skips spaces for free", () => {
    expect(settlePointChipPace("ab cd", 0, 1)).toEqual({ point: 1, credit: 0 });
    expect(settlePointChipPace("ab cd", 1, 1)).toEqual({ point: 3, credit: 0 });
    expect(settlePointChipPace("ab cd", 0, 2.5)).toEqual({ point: 3, credit: 0.5 });
  });

  it("banks no more than ten letters, so a stall does not end in a burst", () => {
    const text = "x".repeat(40);
    expect(settlePointChipPace(text, 0, 25).point).toBe(10);
  });

  it("drops leftover credit once it has caught up", () => {
    expect(settlePointChipPace("abc", 0, 7)).toEqual({ point: 3, credit: 0 });
  });
});

describe("settlePointFixedTail", () => {
  it("leaves exactly the last ten letters scrambled, not counting spaces", () => {
    const text = "one two three four";
    const point = settlePointFixedTail(text);
    expect(text.slice(point).replace(/\s/g, "")).toHaveLength(10);
    expect(text.slice(point)).toBe("o three four");
  });

  it("scrambles everything when there are fewer letters than that", () => {
    expect(settlePointFixedTail("short")).toBe(0);
  });
});

describe("lettersSettledInFinish", () => {
  it("makes every letter real within 0.6 s, however many there are", () => {
    expect(lettersSettledInFinish(500, SCRAMBLE_FINISH_MS)).toBe(500);
    expect(lettersSettledInFinish(500, SCRAMBLE_FINISH_MS / 2)).toBe(250);
  });

  it("is never slower than chip pace for a short stretch", () => {
    expect(lettersSettledInFinish(4, 43)).toBe(1);
    expect(lettersSettledInFinish(4, 170)).toBe(4);
  });

  it("starts with nothing settled", () => {
    expect(lettersSettledInFinish(30, 0)).toBe(0);
    expect(lettersSettledInFinish(0, 100)).toBe(0);
  });
});

describe("settledMarkdownWithSlot", () => {
  it("puts the slot before the closers, so a word scrambling inside bold stays bold", () => {
    expect(settledMarkdownWithSlot("Use **the ham", 10)).toBe(`Use **the ${SCRAMBLE_SLOT_MARK}**`);
  });

  it("is just the slot when nothing has settled", () => {
    expect(settledMarkdownWithSlot("Hello", 0)).toBe(SCRAMBLE_SLOT_MARK);
  });
});

describe("finishProbeAt and locateSettlePoint", () => {
  const streamed = "Dig down first.\n\nThen use the drill on the gold vein near the wall";

  it("finds the settle point again in a finished section that holds it", () => {
    const settled = streamed.indexOf("near");
    const probe = finishProbeAt(streamed, settled);
    expect(probe).not.toBeNull();
    const section = "Then use the drill on the gold vein near the wall and keep moving.";
    expect(locateSettlePoint(section, probe!)).toBe(section.indexOf("near"));
  });

  it("never reaches across a blank line, because the finished answer splits there", () => {
    const settled = streamed.indexOf("Then");
    const probe = finishProbeAt(streamed, settled)!;
    expect(probe.probe.includes("\n\n")).toBe(false);
    expect(probe.offset).toBe(0);
    expect(locateSettlePoint("Dig down first.", probe)).toBe(-1);
    expect(locateSettlePoint("Then use the drill on the gold vein near the wall", probe)).toBe(0);
  });

  it("hands nothing over when too few letters are around to place it by", () => {
    expect(finishProbeAt("Hi.\n\nOk", 5)).toBeNull();
  });

  it("finds the end of the streamed text when nothing was left scrambling", () => {
    const probe = finishProbeAt(streamed, streamed.length)!;
    const finished = `${streamed}.\n—\nFrom your notes`;
    expect(locateSettlePoint(finished, probe)).toBe(streamed.length);
  });
});

/* The PC pace (streamPace.ts): the same functions, tighter, only when the AI is on a PC. */
describe("with the AI on a PC", () => {
  afterEach(() => setAiRunsOnPc(false));

  it("keeps 5 letters scrambled at the end instead of 10", () => {
    const text = "one two three four";
    setAiRunsOnPc(true);
    expect(text.slice(settlePointFixedTail(text)).replace(/\s/g, "")).toHaveLength(5);
    expect(text.slice(settlePointFixedTail(text))).toBe("e four");
  });

  it("settles a letter every 28 ms instead of every 42 ms, and hands back unused credit in chip time", () => {
    setAiRunsOnPc(true);
    expect(settlePointChipPace("abcdef", 0, 2)).toEqual({ point: 3, credit: 0 });
    // 1 chip-letter of credit is 1.5 letters: one settles and half a letter's worth stays banked.
    expect(settlePointChipPace("abcdef", 0, 1)).toEqual({ point: 1, credit: 0.5 / 1.5 });
  });

  it("settles on arrival time a third sooner: 400 ms becomes about 267 ms", () => {
    const arrivals = [0, 0];
    expect(settlePointAfterMoment(arrivals, 0, 266, 400)).toBe(0);
    setAiRunsOnPc(true);
    expect(settlePointAfterMoment(arrivals, 0, 266, 400)).toBe(0);
    expect(settlePointAfterMoment(arrivals, 0, 267, 400)).toBe(2);
  });

  it("finishes a short stretch at the quicker letter pace", () => {
    expect(lettersSettledInFinish(4, 28)).toBe(0);
    setAiRunsOnPc(true);
    expect(lettersSettledInFinish(4, 28)).toBe(1);
    expect(lettersSettledInFinish(4, 112)).toBe(4);
  });

  it("still makes every letter real within 0.6 s", () => {
    setAiRunsOnPc(true);
    expect(lettersSettledInFinish(500, SCRAMBLE_FINISH_MS)).toBe(500);
  });
});
