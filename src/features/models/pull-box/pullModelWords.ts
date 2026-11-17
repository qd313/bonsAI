/**
 * Title: The words the AI models box builds for itself
 *
 * Purpose: The word buttons above the model list (board 5, tab 3, option C). Pick "chat" or "qwen" and the list keeps
 * only the models that word describes. The words are not written by hand: what a model can do (chat, pictures,
 * strategy, coding) and the model families (the leading letters of the names) are read from whatever is in the list,
 * so a longer list gets more words without anyone adding one.
 *
 * Used for: usePullModelTableData.ts (which builds the words from the list the two switches leave and filters by the
 * picked one) and PullModelsFiltersStrip.tsx (which draws them).
 *
 * Solves: replaces the eleven filter rows (Licence, Good for, Show) with a few buttons that always match something.
 *
 * Does not: hold the picked word (pullModelsBoxMemory.ts does) or decide which rows the switches hide.
 */
import type { PullModelEntry } from "../pullModelCatalog";

/** What a model can do, in the order the buttons come. "Pictures" is seeing a picture or reading text in one. */
const CAN_WORDS = ["chat", "pictures", "strategy", "coding"] as const;
type CanWord = (typeof CAN_WORDS)[number];

export type PullModelWord = {
  id: string;
  /** How many models in the list the word was built from keep it. */
  count: number;
  kind: "can" | "family";
};

const isCanWord = (id: string): id is CanWord => (CAN_WORDS as readonly string[]).includes(id);

/** The family of a model: the leading letters of its name (qwen, gemma, llama), "gpt-oss" kept whole. */
export function pullModelFamily(tag: string): string {
  return tag.match(/^[a-z]+(?:-oss)?/)?.[0] ?? tag;
}

function canMatch(entry: PullModelEntry, id: CanWord): boolean {
  if (id === "pictures") return entry.tags.includes("vision") || entry.tags.includes("ocr");
  return entry.tags.includes(id);
}

/** True when the picked word describes the model; no word keeps every model. */
export function entryMatchesWord(entry: PullModelEntry, word: string | null): boolean {
  if (!word) return true;
  return isCanWord(word) ? canMatch(entry, word) : pullModelFamily(entry.tag) === word;
}

/**
 * The words for a list of models: each thing models can do that some model in it can do, then each family in it,
 * the biggest family first and equal ones A to Z.
 */
export function buildPullModelWords(pool: readonly PullModelEntry[]): PullModelWord[] {
  const words: PullModelWord[] = [];
  for (const id of CAN_WORDS) {
    const count = pool.filter((e) => canMatch(e, id)).length;
    if (count > 0) words.push({ id, count, kind: "can" });
  }
  const families = new Map<string, number>();
  for (const e of pool) families.set(pullModelFamily(e.tag), (families.get(pullModelFamily(e.tag)) ?? 0) + 1);
  const sorted = [...families.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  for (const [id, count] of sorted) words.push({ id, count, kind: "family" });
  return words;
}
