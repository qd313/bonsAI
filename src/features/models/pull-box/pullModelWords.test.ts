import { describe, expect, it } from "vitest";
import { PULL_MODEL_CATALOG, type PullModelEntry } from "../pullModelCatalog";
import { buildPullModelWords, entryMatchesWord, pullModelFamily } from "./pullModelWords";

const fits = PULL_MODEL_CATALOG.filter((e) => e.group !== "stretch");

describe("the family of a model, the leading letters of its name", () => {
  it("reads qwen from every Qwen name and keeps gpt-oss whole", () => {
    expect(pullModelFamily("qwen2.5vl:3b")).toBe("qwen");
    expect(pullModelFamily("qwen3-vl:8b")).toBe("qwen");
    expect(pullModelFamily("llama3.2-vision:11b")).toBe("llama");
    expect(pullModelFamily("llava-phi3")).toBe("llava");
    expect(pullModelFamily("smollm2:1.7b")).toBe("smollm");
    expect(pullModelFamily("gpt-oss:20b")).toBe("gpt-oss");
  });
});

describe("what a picked word keeps", () => {
  const byTag = (tag: string): PullModelEntry => PULL_MODEL_CATALOG.find((e) => e.tag === tag)!;

  it("keeps everything for no word", () => {
    expect(PULL_MODEL_CATALOG.every((e) => entryMatchesWord(e, null))).toBe(true);
  });

  it("keeps a capability word by what the model is good for, pictures meaning vision or reading text in pictures", () => {
    expect(entryMatchesWord(byTag("llava:7b"), "pictures")).toBe(true); // vision and OCR
    expect(entryMatchesWord(byTag("qwen3:1.7b"), "pictures")).toBe(false);
    expect(entryMatchesWord(byTag("qwen2.5-coder:3b"), "coding")).toBe(true);
    expect(entryMatchesWord(byTag("qwen3:1.7b"), "coding")).toBe(false);
    expect(entryMatchesWord(byTag("qwen3:1.7b"), "strategy")).toBe(true);
  });

  it("keeps a family word by the name, whatever the size", () => {
    expect(entryMatchesWord(byTag("gemma3:4b"), "gemma")).toBe(true);
    expect(entryMatchesWord(byTag("gemma4:latest"), "gemma")).toBe(true);
    expect(entryMatchesWord(byTag("llama3.2:3b"), "gemma")).toBe(false);
  });
});

describe("the words the list builds for itself", () => {
  const words = buildPullModelWords(fits);
  const ids = words.map((w) => w.id);

  it("puts what a model can do first, in a fixed order, then the families by how many models each has", () => {
    expect(ids.slice(0, 4)).toEqual(["chat", "pictures", "strategy", "coding"]);
    const families = words.slice(4);
    for (let i = 1; i < families.length; i++) {
      const [a, b] = [families[i - 1], families[i]];
      expect(a.count > b.count || (a.count === b.count && a.id.localeCompare(b.id) < 0), `${a.id} before ${b.id}`).toBe(true);
    }
  });

  it("counts the rows each word keeps in the list it was built from", () => {
    for (const w of words) {
      expect(w.count, w.id).toBe(fits.filter((e) => entryMatchesWord(e, w.id)).length);
      expect(w.count).toBeGreaterThan(0);
    }
  });

  it("gives a longer list more words without anyone writing them: families only a bigger pool has appear", () => {
    expect(ids).not.toContain("gpt-oss");
    const all = buildPullModelWords(PULL_MODEL_CATALOG).map((w) => w.id);
    expect(all).toContain("gpt-oss");
    expect(all).toContain("smollm");
    expect(all.length).toBeGreaterThan(ids.length);
  });

  it("leaves out a capability nothing in the list has", () => {
    const chatOnly = buildPullModelWords(fits.filter((e) => e.tags.length === 1 && e.tags[0] === "chat"));
    expect(chatOnly.map((w) => w.id)).toContain("chat");
    expect(chatOnly.map((w) => w.id)).not.toContain("pictures");
    expect(chatOnly.map((w) => w.id)).not.toContain("coding");
  });
});
