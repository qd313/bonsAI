/**
 * Title: Glossary explain-further Ask composer
 * Purpose: Build the auto-sent Ask question and thread label for a glossary term's "explain further" chip.
 * Used for: MainTabChatTranscript (wires it to onAskOllama) and DrgGlossaryTermChip.test (wording check).
 * Solves: Keeps the exact question wording in one tested place instead of inline in a click handler.
 * Does not: Send the Ask itself — the caller supplies onAskOllama, the same function preset chips and
 *           strategy branches already use to start a turn programmatically (useBonsaiAskOrchestration).
 */
import type { DrgGlossaryTerm } from "./glossaryStore";

export function composeDrgGlossaryExplainFurtherQuestion(term: DrgGlossaryTerm): string {
  // The game's name comes from the library with the words; with no name the sentence leaves the game out.
  const forGame = term.gameTitle.trim() ? ` for ${term.gameTitle.trim()}` : "";
  return `Explain "${term.term}" further${forGame} — what does it mean and how should I use it?`;
}

export function drgGlossaryExplainFurtherThreadDisplay(term: DrgGlossaryTerm): string {
  return `Explain: ${term.term}`;
}
