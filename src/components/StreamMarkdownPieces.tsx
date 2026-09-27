/**
 * Title: A live answer's text, drawn piece by piece
 * Purpose: Draws the growing text of an answer still arriving as one markdown renderer per piece
 * (streamMarkdownPieces.ts), side by side in the same parent, so an update parses and draws only
 * the last, growing piece; every earlier piece keeps its text and its memoised renderer skips.
 * Used for: ScrambledAnswerText, for the live tail when the scramble is not drawing it.
 * Solves: The cost of each update growing with the answer. Deck, 2026-09-27, game running: each
 * answer began at about 38 frames a second and sank to 21-28 past about 1,200 letters.
 * Does not: Change the page: the pieces' blocks land in the same parent, in the same order, as the
 * one renderer's did, so the stylesheet and the D-pad stops see the same shape.
 */
import {
  MainTabBonsaiAiMarkdownChunk,
  type MainTabBonsaiAiMarkdownChunkProps,
} from "./MainTabBonsaiAiMarkdownChunk";
import { SPLIT_LIVE_ANSWER_INTO_PIECES, splitStreamMarkdownPieces } from "../utils/streamMarkdownPieces";
import { readDeckSwitch } from "../utils/lighterWhileGameRuns";

export function StreamMarkdownPieces(props: MainTabBonsaiAiMarkdownChunkProps) {
  const { source, ...rest } = props;
  // The Deck's A/B switch (lighterWhileGameRuns.ts): `{ pieces: false }` draws the answer whole.
  if (!SPLIT_LIVE_ANSWER_INTO_PIECES || readDeckSwitch()?.pieces === false) {
    return <MainTabBonsaiAiMarkdownChunk {...props} />;
  }
  const pieces = splitStreamMarkdownPieces(source);
  return (
    <>
      {pieces.map((piece, i) => (
        // By position: a piece's place never changes, and only the last one's text does.
        <MainTabBonsaiAiMarkdownChunk key={i} {...rest} source={piece} />
      ))}
    </>
  );
}
