/**
 * Title: A live answer's text, drawn piece by piece
 * Purpose: Draws the growing text of an answer still arriving as one markdown renderer per piece
 * (streamMarkdownPieces.ts), side by side in the same parent, so an update parses and draws only
 * the last, growing piece; every earlier piece keeps its text and its memoised renderer skips.
 * Used for: ScrambledAnswerText, for the live tail of a streaming answer, scramble on or off. With
 * the scramble on, its slot mark sits at the very end of the text, so it is always in the last
 * piece, and only that piece gets the scramble's slot ref.
 * Solves: The cost of each update growing with the answer. Deck, 2026-09-27, game running: each
 * answer began at about 38 frames a second and sank to 21-28 past about 1,200 letters.
 * Does not: Change the page: the pieces' blocks land in the same parent, in the same order, as the
 * one renderer's did, so the stylesheet and the D-pad stops see the same shape.
 */
import { useCallback, useRef } from "react";
import type { DrgGlossaryTerm } from "../data/drgGlossaryTerms";
import {
  MainTabBonsaiAiMarkdownChunk,
  type MainTabBonsaiAiMarkdownChunkProps,
} from "./MainTabBonsaiAiMarkdownChunk";
import { SPLIT_LIVE_ANSWER_INTO_PIECES, splitStreamMarkdownPieces } from "../utils/streamMarkdownPieces";
import { readDeckSwitch } from "../utils/lighterWhileGameRuns";

export function StreamMarkdownPieces(props: MainTabBonsaiAiMarkdownChunkProps) {
  const { source, scrambleSlotRef, onDrgGlossaryExplainFurther, ...rest } = props;
  /*
   * The "explain further" function is a new one on every beat (the plugin root builds its Ask
   * arguments afresh each render and the function follows them), and each piece's memoised renderer
   * compares its props: a new function made EVERY settled piece parse and draw again on every beat,
   * so an update cost as much as the whole answer, and twice that with the scramble on (it renders
   * twice a beat). The pieces get one function that never changes and that calls the newest one at
   * tap time. This component renders on every beat, so the newest is never more than a beat old.
   * Whether a function exists at all still reaches the pieces, since that decides what is drawn.
   */
  const newestExplainFurther = useRef(onDrgGlossaryExplainFurther);
  newestExplainFurther.current = onDrgGlossaryExplainFurther;
  const explainFurtherForPieces = useCallback(
    (term: DrgGlossaryTerm) => newestExplainFurther.current?.(term),
    []
  );
  const stableExplainFurther = onDrgGlossaryExplainFurther ? explainFurtherForPieces : undefined;
  // The Deck's A/B switch (lighterWhileGameRuns.ts): `{ pieces: false }` draws the answer whole.
  if (!SPLIT_LIVE_ANSWER_INTO_PIECES || readDeckSwitch()?.pieces === false) {
    return <MainTabBonsaiAiMarkdownChunk {...props} />;
  }
  const pieces = splitStreamMarkdownPieces(source);
  const last = pieces.length - 1;
  return (
    <>
      {pieces.map((piece, i) => (
        // By position: a piece's place never changes, and only the last one's text does.
        <MainTabBonsaiAiMarkdownChunk
          key={i}
          {...rest}
          onDrgGlossaryExplainFurther={stableExplainFurther}
          source={piece}
          scrambleSlotRef={i === last ? scrambleSlotRef : undefined}
        />
      ))}
    </>
  );
}
