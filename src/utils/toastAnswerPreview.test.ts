import { describe, expect, it } from "vitest";
import {
  BODY_LINE_BUDGET,
  buildToastAnswerLines,
  TITLE_LINE_BUDGET,
  TOAST_TAP_HINT,
  toastSafeText,
} from "./toastAnswerPreview";

describe("toastSafeText", () => {
  it("removes internal tags", () => {
    expect(toastSafeText("Hello there.<bonsai-status>{\"a\":1}</bonsai-status>")).toBe("Hello there.");
    expect(toastSafeText("Pick one [bonsai-strategy-branches](x) now")).toBe("Pick one now");
  });

  it("drops every fence kind and keeps the words around it", () => {
    for (const label of ["bonsai-spoiler", "bonsai-checklist", "bonsai-cite", "bonsai-branches", "python", ""]) {
      const out = toastSafeText(`Before.\n\`\`\`${label}\nSECRET words\n\`\`\`\nAfter.`);
      expect(out).toBe("Before. After.");
    }
  });

  it("drops a one-line spoiler fence", () => {
    expect(toastSafeText("Start ```bonsai-spoiler The Soul dies``` end")).toBe("Start end");
  });

  it("drops an unclosed fence and everything after it", () => {
    expect(toastSafeText("Fine.\n```bonsai-spoiler\nSECRET")).toBe("Fine.");
  });

  it("flattens markdown to plain words", () => {
    const out = toastSafeText("# Title\n- **bold** and *it* and `code`\n1. [link](http://x.y) here\n> quote");
    expect(out).toBe("Title bold and it and code link here quote");
  });

  it("drops table rows", () => {
    expect(toastSafeText("Intro\n| a | b |\n|---|---|\n| 1 | 2 |\nOutro")).toBe("Intro Outro");
  });
});

describe("buildToastAnswerLines", () => {
  it("returns null for empty, tag-only or fence-only text", () => {
    expect(buildToastAnswerLines("")).toBeNull();
    expect(buildToastAnswerLines("   ")).toBeNull();
    expect(buildToastAnswerLines("<bonsai-status>x</bonsai-status>")).toBeNull();
    expect(buildToastAnswerLines("```bonsai-spoiler\nall hidden\n```")).toBeNull();
    expect(buildToastAnswerLines("```bonsai-spoiler\nunclosed")).toBeNull();
  });

  it("puts a short answer whole on the title line with the tap hint", () => {
    expect(buildToastAnswerLines("Yes, it does.")).toEqual({ title: "Yes, it does.", body: TOAST_TAP_HINT });
  });

  it("carries a medium answer across both lines with no ellipsis", () => {
    const r = buildToastAnswerLines("Hit the weak point on its back twice with the drill")!;
    expect(r.body).not.toContain("…");
    expect(r.body).not.toBe(TOAST_TAP_HINT);
    expect(`${r.title} ${r.body}`).toBe("Hit the weak point on its back twice with the drill");
  });

  it("cuts a long answer at a word with an ellipsis and never repeats or drops a word", () => {
    const text =
      "Use the pickaxe on the glowing ore veins first, then swap to the drill once the armoured bug boss appears";
    const r = buildToastAnswerLines(text)!;
    expect(r.body.endsWith("…")).toBe(true);
    const shown = `${r.title} ${r.body.slice(0, -1)}`;
    expect(text.startsWith(shown)).toBe(true);
    expect(text[shown.length]).toBe(" ");
  });

  it("keeps every line inside its measured budget for ordinary prose", () => {
    const text = "Wide words like mammoth and wobbling swimmers matter more than narrow ones like illicit little pills ".repeat(3);
    const r = buildToastAnswerLines(text)!;
    expect(r.title.length).toBeLessThanOrEqual(43);
    expect(r.body.length).toBeLessThanOrEqual(35);
    expect(TITLE_LINE_BUDGET).toBeGreaterThan(30);
    expect(BODY_LINE_BUDGET).toBeGreaterThan(25);
  });

  it("marks a single over-wide word instead of overflowing", () => {
    const r = buildToastAnswerLines("https://example.com/a/very/long/address/that/never/ends/anywhere/at/all ok")!;
    expect(r.title.endsWith("…")).toBe(true);
    expect(r.title.length).toBeLessThanOrEqual(43);
  });

  it("uses the words around a fence, never the fenced words", () => {
    const r = buildToastAnswerLines("Before it.\n```bonsai-spoiler\nSECRET\n```\nAfter it.")!;
    expect(`${r.title} ${r.body}`).not.toContain("SECRET");
    expect(r.title).toBe("Before it. After it.");
  });
});
