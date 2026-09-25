/**
 * Title: An answer's text, scrambling into place as it streams
 *
 * Purpose: Draws one section of an answer the way the markdown renderer always has, except that,
 * with the Developer tab's Scramble animation switch on, the newest letters churn through symbols
 * for a moment before settling into the real ones -- the decode chips' look, on the live answer
 * (plan 69 step 3, the maintainer's mockup). With the switch off, under reduced motion, or for any
 * section with nothing to scramble, it renders exactly what the bubble rendered before.
 *
 * Used for: buildAnswerBubbleElement.tsx, for the live tail of a streaming answer and for every
 * other section, streaming or finished (a finished section only scrambles while the stream's last
 * letters are still settling, for at most 0.6 s after the end).
 *
 * Solves: The scramble must not cost the panel frames (plan 69, D119: not worse than today). So:
 *   - the settled text goes through the markdown renderer, but at most every 110 ms, where today's
 *     reveal re-renders the markdown on every frame;
 *   - the churning letters live in one small span at the end of the settled text, written straight
 *     to the page, never through React -- the decode chips' own trick;
 *   - one timer, running only while something is scrambling.
 *
 * Does not: Decide when an answer streams or ends -- it is told. Scramble code boxes, hidden
 * spoilers, the waiting chips or the thinking lines: those never reach it as the live tail. Hold
 * the Copy button back itself -- the stylesheet hides it while this component's slot exists
 * (answerBubble.ts), so it appears when the last letter settles.
 *
 * How it works:
 * 1. While streaming, every letter's arrival is timed when a render first shows it. The settle
 *    point moves forward per the chosen style (streamScrambleMath.ts); letters before it are real.
 * 2. The span holds, in order: letters settled since the markdown last caught up (as plain text),
 *    then the unsettled letters, each invisible with a symbol drawn over it, so the line never
 *    re-wraps as symbols change. The symbols reshuffle every 55 ms; a letter arriving between
 *    reshuffles gets its own symbol without reshuffling the rest.
 * 3. A remount in the middle of an answer (the Quick Access Menu closed and reopened) shows what
 *    was already on screen as plain text; only letters that arrive after it scramble.
 * 4. When the stream ends -- this section stops streaming, or is thrown away while it still was --
 *    the settle point is handed to liveScrambleMemo with the time. Whichever finished section holds
 *    it settles everything from there to its end, on that one clock, all real within 0.6 s, even
 *    across the chat's reload that redraws the answer as a saved turn moments later.
 * 5. Stop: a stopped answer's sections ignore the handed-over settle point, so every letter is
 *    real at once.
 */
import { memo, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  MainTabBonsaiAiMarkdownChunk,
  type MainTabBonsaiAiMarkdownChunkProps,
} from "../../components/MainTabBonsaiAiMarkdownChunk";
import { prefersReducedMotion } from "../preset-carousel/presetChipShared";
import { StreamScrambleContext } from "./streamScrambleContext";
import {
  SCRAMBLE_CHAR_MS,
  SCRAMBLE_CHURN_MS,
  SCRAMBLE_MARKDOWN_STEP_MS,
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
import { beginFinish, continuesShownAnswer, pendingFinish, rememberLiveText } from "./liveScrambleMemo";

export type ScrambledAnswerTextProps = Omit<MainTabBonsaiAiMarkdownChunkProps, "source" | "scrambleSlotRef"> & {
  /** Exactly what this section renders with no scramble -- today's source, unchanged. */
  plain: string;
  /** The section's raw text: the live tail before inline closers are added, or a finished section. */
  raw: string;
  /** True for the live tail of an answer still arriving; false for any other section. */
  streaming: boolean;
};

/** A finished section settling from `start` to its end, on the clock the stream's end started. */
type Finish = { start: number; startedAt: number };

function commonPrefixLength(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a.charCodeAt(i) === b.charCodeAt(i)) i += 1;
  return i;
}

/**
 * What the churn span holds: one node per unsettled character from `start` to `end` of `basis`
 * (a letter is a span, a space or line break a text node, a bold or code mark nothing). `basis`
 * null means the nodes no longer match anything and must be built again.
 */
type ChurnCells = { basis: string | null; start: number; end: number; list: Array<{ index: number; node: Node }> };

function freshCells(): ChurnCells {
  return { basis: null, start: 0, end: 0, list: [] };
}

/**
 * Brings the churn span in line with `text` settled up to `from`, touching only what changed:
 * settled letters leave from the front, arriving ones join at the back. Each letter stays in the
 * line as itself -- invisible, with its symbol drawn over it (answerBubble.ts) -- so the line is
 * laid out exactly as it will be once the letter is real, and a reshuffle only swaps the symbols
 * (`reshuffle`), which moves nothing. A symbol wider or narrower than its letter used to re-wrap
 * the last line on every reshuffle, and every re-wrap set the chat's size watchers measuring the
 * whole panel again (Deck profile, 2026-09-24: the page never went idle while an answer arrived).
 */
function syncChurnCells(churn: HTMLSpanElement, cells: ChurnCells, text: string, from: number, reshuffle: boolean) {
  if (cells.basis === null || !text.startsWith(cells.basis) || from < cells.start) {
    churn.replaceChildren();
    cells.list = [];
    cells.start = from;
    cells.end = from;
  }
  let settled = 0;
  while (settled < cells.list.length && cells.list[settled]!.index < from) {
    churn.removeChild(cells.list[settled]!.node);
    settled += 1;
  }
  if (settled > 0) cells.list.splice(0, settled);
  cells.start = from;
  const doc = churn.ownerDocument;
  const arriving = doc.createDocumentFragment();
  for (let i = Math.max(cells.end, from); i < text.length; i += 1) {
    const ch = text[i]!;
    const kind = churnCellKind(ch);
    if (kind === "mark") continue;
    let node: Node;
    if (kind === "blank") {
      node = doc.createTextNode(ch);
    } else {
      const letter = doc.createElement("span");
      letter.className = "bonsai-stream-scramble-char";
      letter.textContent = ch;
      letter.setAttribute("data-s", churnSymbol());
      node = letter;
    }
    arriving.appendChild(node);
    cells.list.push({ index: i, node });
  }
  if (arriving.firstChild) churn.appendChild(arriving);
  cells.end = text.length;
  cells.basis = text;
  if (reshuffle) {
    for (const cell of cells.list) {
      if (cell.node.nodeType === 1) (cell.node as Element).setAttribute("data-s", churnSymbol());
    }
  }
}

/*
 * In: one section's plain source, its raw text and whether it is the live tail, plus the markdown
 * chunk's own props; the four scramble settings and the stopped flag come from the context.
 * Out: the markdown chunk -- with a scramble slot in it while letters are unsettled, plain
 * otherwise. Memoised like the chunk itself: the bubble is rebuilt on every reveal frame, and a
 * section whose props did not change has nothing to redo.
 * What can go wrong: the span's letters are written outside React, so every render has to repaint
 * them (the last layout effect) or the markdown and the span would show the same letters twice.
 */
export const ScrambledAnswerText = memo(function ScrambledAnswerText(props: ScrambledAnswerTextProps) {
  const { plain, raw, streaming, ...markdownProps } = props;
  const scramble = useContext(StreamScrambleContext);
  const on = scramble.enabled && !prefersReducedMotion();

  /* Streaming: how far the markdown has been handed the settled text (null = plain). Set on the
     first render already, so a streaming section never shows one frame of plain text first. */
  const [markdownSettled, setMarkdownSettled] = useState<number | null>(() =>
    on && streaming ? (continuesShownAnswer(raw) ? raw.length : 0) : null
  );
  /* Finished: the stretch still settling, or null when this section is plain. */
  const [finish, setFinish] = useState<Finish | null>(null);

  const rawRef = useRef(raw);
  const arrivalsRef = useRef<number[]>([]);
  const settledRef = useRef(0);
  const creditRef = useRef(0);
  const lastTickRef = useRef(0);
  const markdownSettledRef = useRef<number | null>(null);
  const markdownStepAtRef = useRef(0);
  const finishRef = useRef<Finish | null>(null);
  const timerRef = useRef<number | null>(null);
  const realNodeRef = useRef<Text | null>(null);
  const churnNodeRef = useRef<HTMLSpanElement | null>(null);
  const cellsRef = useRef<ChurnCells>(freshCells());
  const settingsRef = useRef(scramble);
  const onRef = useRef(on);
  const wasStreamingRef = useRef(false);

  settingsRef.current = scramble;
  onRef.current = on;
  markdownSettledRef.current = markdownSettled;
  finishRef.current = finish;

  /**
   * Writes the span: the letters settled since the markdown last caught up, then the unsettled
   * ones under their symbols (syncChurnCells). `reshuffle` draws new symbols (the timer's tick);
   * a render, which can come every frame, only adds and removes letters. The settled text is
   * written only when it changed: every write makes the page lay the line out again.
   */
  const paint = useCallback((reshuffle: boolean) => {
    const real = realNodeRef.current;
    const churn = churnNodeRef.current;
    if (!real || !churn) return;
    const text = rawRef.current;
    const f = finishRef.current;
    const shownFrom = f ? f.start : markdownSettledRef.current ?? text.length;
    const from = f
      ? f.start + lettersSettledInFinish(text.length - f.start, performance.now() - f.startedAt)
      : settledRef.current;
    const nextReal = withoutInlineMarks(text.slice(shownFrom, from));
    if (real.data !== nextReal) real.data = nextReal;
    syncChurnCells(churn, cellsRef.current, text, from, reshuffle);
    const className = `bonsai-stream-scramble-churn bonsai-stream-scramble-churn--${settingsRef.current.color}`;
    if (churn.className !== className) churn.className = className;
  }, []);

  /** The span the markdown renderer made for the slot mark; it is rebuilt whenever the slot moves. */
  const slotRefCallback = useCallback(
    (el: HTMLSpanElement | null) => {
      if (!el) {
        realNodeRef.current = null;
        churnNodeRef.current = null;
        return;
      }
      const real = el.ownerDocument.createTextNode("");
      const churn = el.ownerDocument.createElement("span");
      el.replaceChildren(real, churn);
      realNodeRef.current = real;
      churnNodeRef.current = churn;
      cellsRef.current = freshCells();
      paint(false);
    },
    [paint]
  );

  const stopTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    if (!onRef.current) {
      stopTimer();
      return;
    }
    const now = performance.now();
    const f = finishRef.current;
    if (f) {
      const total = rawRef.current.length - f.start;
      /* Ends on the last tick before the finish is due, not the first one after it, so the last
         letters are never late: a tick can be a whole reshuffle apart from the due time. */
      if (lettersSettledInFinish(total, now + SCRAMBLE_CHURN_MS - f.startedAt) >= total) {
        stopTimer();
        setFinish(null);
        return;
      }
      paint(true);
      return;
    }
    const text = rawRef.current;
    const settings = settingsRef.current;
    let point = settledRef.current;
    if (settings.style === "chip") {
      const step = settlePointChipPace(text, point, creditRef.current + (now - lastTickRef.current) / SCRAMBLE_CHAR_MS);
      point = step.point;
      creditRef.current = step.credit;
    } else if (settings.style === "tail") {
      point = Math.max(point, settlePointFixedTail(text));
    } else {
      point = settlePointAfterMoment(arrivalsRef.current, point, now, settings.settleMs);
    }
    lastTickRef.current = now;
    settledRef.current = Math.min(point, text.length);
    const handed = markdownSettledRef.current;
    if (handed !== settledRef.current && now - markdownStepAtRef.current >= SCRAMBLE_MARKDOWN_STEP_MS) {
      markdownStepAtRef.current = now;
      setMarkdownSettled(settledRef.current);
    }
    paint(true);
    if (settledRef.current >= text.length && handed === settledRef.current) stopTimer();
  }, [paint, stopTimer]);

  const startTimer = useCallback(() => {
    if (timerRef.current == null) {
      lastTickRef.current = performance.now();
      timerRef.current = window.setInterval(tick, SCRAMBLE_CHURN_MS);
    }
  }, [tick]);

  /** The stream has ended for this section: hand the settle point over to the finish. */
  const handOverFinish = useCallback(() => {
    beginFinish(finishProbeAt(rawRef.current, settledRef.current), performance.now());
  }, []);

  /* Streaming: time each newly shown letter, and keep the churn running. */
  useLayoutEffect(() => {
    if (!streaming) return;
    if (!on) {
      /* Switched off (or reduced motion) mid-answer: switching back on starts from what is shown. */
      wasStreamingRef.current = false;
      stopTimer();
      return;
    }
    const now = performance.now();
    const previous = rawRef.current;
    if (!wasStreamingRef.current) {
      /* First streaming render of this section: plain if it continues an answer already on screen. */
      arrivalsRef.current = new Array<number>(raw.length).fill(now);
      settledRef.current = continuesShownAnswer(raw) ? raw.length : 0;
      creditRef.current = 0;
      cellsRef.current = freshCells();
      markdownStepAtRef.current = now;
      setMarkdownSettled(settledRef.current);
    } else if (raw.startsWith(previous)) {
      for (let i = previous.length; i < raw.length; i += 1) arrivalsRef.current.push(now);
    } else {
      /* Rewritten rather than grown (rare -- a display tag finished and was taken out): letters up
         to where the two agree keep their timing; the rest counts as new. */
      const same = commonPrefixLength(previous, raw);
      arrivalsRef.current.length = same;
      for (let i = same; i < raw.length; i += 1) arrivalsRef.current.push(now);
      settledRef.current = Math.min(settledRef.current, same);
      cellsRef.current = freshCells();
      if ((markdownSettledRef.current ?? 0) > settledRef.current) {
        markdownStepAtRef.current = now;
        setMarkdownSettled(settledRef.current);
      }
    }
    wasStreamingRef.current = true;
    rawRef.current = raw;
    rememberLiveText(raw);
    if (settledRef.current < raw.length || markdownSettledRef.current !== settledRef.current) startTimer();
  }, [on, streaming, raw, startTimer, stopTimer]);

  /* The streaming stopped on this same section: hand over, then let the finished branch take it. */
  useLayoutEffect(() => {
    if (streaming || !wasStreamingRef.current) return;
    wasStreamingRef.current = false;
    stopTimer();
    if (onRef.current) handOverFinish();
    setMarkdownSettled(null);
  }, [streaming, stopTimer, handOverFinish]);

  /* Finished: settle what the stream left unsettled, if this section holds the settle point. */
  useLayoutEffect(() => {
    if (streaming) return;
    rawRef.current = raw;
    const pending = on && !scramble.stopped ? pendingFinish(performance.now()) : null;
    const start = pending ? locateSettlePoint(raw, pending) : -1;
    if (!pending || start < 0 || start >= raw.length) {
      if (finishRef.current) {
        stopTimer();
        setFinish(null);
      }
      return;
    }
    const current = finishRef.current;
    if (!current || current.start !== start || current.startedAt !== pending.startedAt) {
      cellsRef.current = freshCells();
      setFinish({ start, startedAt: pending.startedAt });
    }
    startTimer();
  }, [streaming, raw, on, scramble.stopped, startTimer, stopTimer]);

  /* Every render: the span's letters follow the text and the markdown's new catch-up point. */
  useLayoutEffect(() => {
    paint(false);
  });

  /* Thrown away while still streaming (the answer ended, or the panel closed): hand over too. */
  useEffect(
    () => () => {
      stopTimer();
      if (wasStreamingRef.current && onRef.current) handOverFinish();
    },
    [stopTimer, handOverFinish]
  );

  if (on && streaming && markdownSettled != null) {
    return (
      <MainTabBonsaiAiMarkdownChunk
        {...markdownProps}
        source={settledMarkdownWithSlot(raw, markdownSettled)}
        scrambleSlotRef={slotRefCallback}
      />
    );
  }
  if (on && !streaming && finish) {
    return (
      <MainTabBonsaiAiMarkdownChunk
        {...markdownProps}
        source={settledMarkdownWithSlot(raw, finish.start)}
        scrambleSlotRef={slotRefCallback}
      />
    );
  }
  return <MainTabBonsaiAiMarkdownChunk {...markdownProps} source={plain} />;
});
