import { describe, expect, it } from "vitest";
import { mayHoldFence, replaceSpoilerFences } from "./markdownFenceReader";

const F = "`".repeat(3);
const T = "~~~";

describe("replaceSpoilerFences", () => {
  it("replaces a backtick block and a ~~~ block, and keeps the words around them", () => {
    const text = `A.\n\n${F}bonsai-spoiler\none\n${F}\n\nB.\n\n${T}bonsai-spoiler\ntwo\n${T}\n\nC.`;
    expect(replaceSpoilerFences(text, "[X]")).toBe("A.\n\n[X]\n\nB.\n\n[X]\n\nC.");
  });

  it("gives the words back, without the trailing newline, when hiding is off", () => {
    const text = `A.\n\n${T}bonsai-spoiler\none\n\ntwo\n${T}\n\nB.`;
    expect(replaceSpoilerFences(text, null)).toBe("A.\n\none\n\ntwo\n\nB.");
  });

  it("takes everything after a closer glued onto a sentence, as the panel does", () => {
    const text = `A.\n\n${F}bonsai-spoiler\nsecret.${F}\n\nstill inside`;
    expect(replaceSpoilerFences(text, "[X]")).toBe("A.\n\n[X]");
  });

  it("does not touch a block with another label", () => {
    const text = `${T}js\nlet x = 1;\n${T}`;
    expect(replaceSpoilerFences(text, "[X]")).toBe(text);
  });

  it("still catches an opener glued to running text, which the panel draws as plain code", () => {
    const text = `The${F}bonsai-spoiler\nsecret\n${F}\nAfter.`;
    expect(replaceSpoilerFences(text, "[X]")).not.toContain("secret");
  });

  it("returns text with no hidden block unchanged", () => {
    expect(replaceSpoilerFences("Just words.", "[X]")).toBe("Just words.");
  });
});

describe("mayHoldFence", () => {
  it("sees three backticks anywhere and a line starting with three tildes", () => {
    expect(mayHoldFence(`a ${F} b`)).toBe(true);
    expect(mayHoldFence(`a\n${T}x\nb`)).toBe(true);
    expect(mayHoldFence("plain ~~strike~~ text")).toBe(false);
  });
});
