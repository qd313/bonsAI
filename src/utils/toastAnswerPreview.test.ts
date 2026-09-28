import { describe, expect, it } from "vitest";
import {
  BODY_LINE_BUDGET,
  BODY_LINE_WIDTH,
  buildToastAnswerLines,
  TITLE_LINE_BUDGET,
  TITLE_LINE_WIDTH,
  TOAST_TAP_HINT,
  toastSafeText,
  toastTextWidth,
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
    expect(out).toBe("Title. bold and it and code. link here. quote");
  });

  it("ends a heading or list item with a full stop so items do not run together", () => {
    const out = toastSafeText("# Boss fight\n- Dodge left\n- Hit the back!\n\nThen rest");
    expect(out).toBe("Boss fight. Dodge left. Hit the back! Then rest");
  });

  it("drops table rows", () => {
    expect(toastSafeText("Intro\n| a | b |\n|---|---|\n| 1 | 2 |\nOutro")).toBe("Intro Outro");
  });

  it("drops a table written without a leading bar", () => {
    const out = toastSafeText("Intro\n\nSetting | Value\n--- | ---\nTDP | 10W\n\nOutro");
    expect(out).toBe("Intro Outro");
  });

  it("never takes a fence's opening line for a table row", () => {
    expect(toastSafeText("Intro.\n```a|b\n---|---\nSECRET\n```\nAfter.")).toBe("Intro. After.");
  });

  it("drops a ~~~ fence, on its own lines or on one line", () => {
    expect(toastSafeText("Before.\n~~~bonsai-spoiler\nSECRET\n~~~\nAfter.")).toBe("Before. After.");
    expect(toastSafeText("Before. ~~~bonsai-spoiler SECRET ~~~ After.")).toBe("Before. After.");
    expect(toastSafeText("Fine.\n~~~\nSECRET")).toBe("Fine.");
  });

  it("keeps a block hidden when its closer is glued onto a sentence, as the panel does", () => {
    // The panel reads fences line by line: "dies.```" does not close the block, the ``` line does.
    const out = toastSafeText("Intro.\n```bonsai-spoiler\nThe Soul dies.```\nStill hidden.\n```\nAfter.");
    expect(out).toBe("Intro. After.");
  });

  it("treats a four-backtick fence as one block, even with a ``` line inside it", () => {
    expect(toastSafeText("Intro.\n````\n```\nSECRET\n```\n````\nAfter.")).toBe("Intro. After.");
    expect(toastSafeText("Fine.\n````\nSECRET\n```\nmore")).toBe("Fine.");
  });

  it("drops a fence inside a list item or a quote", () => {
    expect(toastSafeText("- Tip\n- ```bonsai-spoiler\n  SECRET\n  ```\n- Next")).not.toContain("SECRET");
    expect(toastSafeText("> ```bonsai-spoiler\n> SECRET\n> ```\n\nAfter.")).not.toContain("SECRET");
  });

  it("an unclosed fence inside a quote still hides everything after it", () => {
    expect(toastSafeText("Fine.\n\n> ```\n> SECRET\n\nMORE")).toBe("Fine.");
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

  it("returns null when only punctuation is left", () => {
    for (const marks of ["...", "---", "**", "#", "* * *", "> .", "?!","```x\nhidden\n```\n..."]) {
      expect(buildToastAnswerLines(marks)).toBeNull();
    }
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

  it("keeps every line inside its width budget, for prose, dashes, CJK and emoji", () => {
    const texts = [
      "Wide words like mammoth and wobbling swimmers matter more than narrow ones like illicit little pills ".repeat(3),
      "Go left — then right — then left — then jump — then duck — then run — then stop — ".repeat(3),
      "攻略のコツ は 盾 を 先に 壊す こと です 次に 背中 の 弱点 を 狙って ください ".repeat(3),
      "Nice 🎉 run 🎉 keep 🎉 going 🎉 you 🎉 are 🎉 close 🎉 now 🎉 ".repeat(3),
    ];
    for (const text of texts) {
      const r = buildToastAnswerLines(text)!;
      expect(toastTextWidth(r.title)).toBeLessThanOrEqual(TITLE_LINE_BUDGET);
      expect(toastTextWidth(r.body)).toBeLessThanOrEqual(BODY_LINE_BUDGET);
    }
  });

  it("gives the long dash, CJK text and emoji a wide width", () => {
    const wide = toastTextWidth("M");
    for (const ch of ["—", "漢", "한", "🙂", "…"]) {
      expect(toastTextWidth(ch)).toBeGreaterThanOrEqual(wide);
    }
  });

  it("matches the device measurement: the counting strings fit their lines, one more piece does not", () => {
    const pieces = (prefix: string, sep: string, n: number) =>
      Array.from({ length: n }, (_, i) => `${prefix}${String(i + 1).padStart(2, "0")}`).join(sep);
    // Plan 38 M2: the title line held T01-...-T11, the body line w01 ... w09, same on both screens.
    expect(toastTextWidth(pieces("T", "-", 11))).toBeLessThanOrEqual(TITLE_LINE_WIDTH);
    expect(toastTextWidth(pieces("T", "-", 12))).toBeGreaterThan(TITLE_LINE_WIDTH);
    expect(toastTextWidth(pieces("w", " ", 9))).toBeLessThanOrEqual(BODY_LINE_WIDTH);
    expect(toastTextWidth(pieces("w", " ", 10))).toBeGreaterThan(BODY_LINE_WIDTH);
    // The budgets keep a margin inside the measured lines.
    expect(TITLE_LINE_BUDGET).toBeLessThan(TITLE_LINE_WIDTH);
    expect(BODY_LINE_BUDGET).toBeLessThan(BODY_LINE_WIDTH);
  });

  it("marks a single over-wide word instead of overflowing", () => {
    const r = buildToastAnswerLines("https://example.com/a/very/long/address/that/never/ends/anywhere/at/all ok")!;
    expect(r.title.endsWith("…")).toBe(true);
    expect(toastTextWidth(r.title)).toBeLessThanOrEqual(TITLE_LINE_BUDGET);
  });

  it("uses the words around a fence, never the fenced words", () => {
    const r = buildToastAnswerLines("Before it.\n```bonsai-spoiler\nSECRET\n```\nAfter it.")!;
    expect(`${r.title} ${r.body}`).not.toContain("SECRET");
    expect(r.title).toBe("Before it. After it.");
  });
});
