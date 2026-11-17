/**
 * Title: Words that decode in once, for the thumbs row
 *
 * Purpose: Draws one piece of text ("Was this helpful?", "Helpful", "Not really") so it scrambles into place
 * letter by letter, the way a suggestion chip's words do, the first time an answer's thumbs row is drawn. After
 * that, and always under the system's less-motion choice, it is just the plain words.
 *
 * Used for: The thumbs row in buildReplyActionsElement.tsx, three times (the question and the two buttons).
 *
 * Solves: The row has to be a D-pad stop from its very first frame, so only the words decode, never the
 * buttons. The real words stay in the page the whole time (hidden, holding the width), and the scramble is
 * drawn over them, so nothing moves while it plays and a press on a button that is still decoding is an
 * ordinary press. It plays once per answer (the answer's key, kept for the session), not again on a
 * re-render or when the answer is scrolled back into view.
 *
 * Does not: Own the scramble maths (presetChipDecodeText.ts does), the focus handling, or any press.
 */
import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../../preset-carousel/presetChipShared";
import {
  composeDecodeParts,
  makeDecodeChurn,
  PRESET_DECODE_CARET_BLINK_MS,
  PRESET_DECODE_CHAR_MS,
  PRESET_DECODE_CHURN_REFRESH_MS,
} from "../../preset-carousel/presetChipDecodeText";

/** `${answer key}|${words}` for every piece that has already played this session. */
const decodedThumbsText = new Set<string>();

type Parts = { locked: HTMLSpanElement | null; caret: HTMLSpanElement | null; tail: HTMLSpanElement | null };

/*
 * In: the words, the answer's key and an optional start delay.
 * Out: the plain words, or (while it plays) the hidden real words with the scramble drawn over them.
 * 1. Decide once, at the first draw, whether to play: not under less motion, not if this answer's piece has played.
 * 2. In an effect, run one animation-frame loop that locks a letter every PRESET_DECODE_CHAR_MS behind a caret,
 *    writing straight into three spans (no React render per frame), and hands over to the plain words when done.
 * What can go wrong: nothing that blocks a press; the scramble is aria-hidden and sits over the real words.
 */
export function ThumbsDecodeText(props: {
  text: string;
  /** The answer this row belongs to (the reply key); a different answer plays again. */
  answerKey: string;
  /** Wait this long before the first letter, so the pieces start one after another. */
  delayMs?: number;
}) {
  const { text, answerKey, delayMs = 0 } = props;
  const seenKey = `${answerKey}|${text}`;
  // Decided once, at the first draw: later draws of this piece never start another play.
  const [play] = useState(() => !prefersReducedMotion() && !decodedThumbsText.has(seenKey));
  const [done, setDone] = useState(!play);
  const parts = useRef<Parts>({ locked: null, caret: null, tail: null });

  useEffect(() => {
    if (!play) return;
    decodedThumbsText.add(seenKey);
    const paint = (next: { locked: string; caret: string; tail: string }) => {
      for (const name of ["locked", "caret", "tail"] as const) {
        const el = parts.current[name];
        if (el && el.textContent !== next[name]) el.textContent = next[name];
      }
    };
    let churn = makeDecodeChurn(text.length);
    let caretOn = true;
    let lastChurn = 0;
    let lastBlink = 0;
    let lastCount = -1;
    let raf = 0;
    const startAt = performance.now() + delayMs;
    paint(composeDecodeParts(text, 0, churn, true));
    const tick = (now: number) => {
      const count = Math.min(text.length, Math.max(0, Math.floor((now - startAt) / PRESET_DECODE_CHAR_MS)));
      if (count >= text.length) {
        setDone(true);
        return;
      }
      const churnDue = now - lastChurn >= PRESET_DECODE_CHURN_REFRESH_MS;
      const blinkDue = now - lastBlink >= PRESET_DECODE_CARET_BLINK_MS;
      if (churnDue) {
        churn = makeDecodeChurn(text.length);
        lastChurn = now;
      }
      if (blinkDue) {
        caretOn = !caretOn;
        lastBlink = now;
      }
      if (count !== lastCount || churnDue || blinkDue) {
        lastCount = count;
        paint(composeDecodeParts(text, count, churn, caretOn));
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
    // One play per mount: the words and key are fixed for the life of a row.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (done) return <>{text}</>;
  return (
    <span style={{ position: "relative", display: "inline-block", overflow: "hidden", verticalAlign: "top" }}>
      <span style={{ visibility: "hidden" }}>{text}</span>
      <span aria-hidden="true" data-thumbs-decode="true" style={{ position: "absolute", left: 0, top: 0, whiteSpace: "nowrap" }}>
        <span ref={(el) => { parts.current.locked = el; }} />
        <span className="bonsai-preset-chip-caret" ref={(el) => { parts.current.caret = el; }} />
        <span ref={(el) => { parts.current.tail = el; }} />
      </span>
    </span>
  );
}
