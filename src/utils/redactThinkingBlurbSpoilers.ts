/**
 * Title: Thinking blurb spoiler redaction
 * Purpose: Turn model-authored [[spoiler]]…[[/spoiler]] spans in the thinking line into blocks.
 * Used for: buildThinkingBlurbTextElement, on the live Ask thinking line.
 * Solves: Model-emitted <bonsai-status> text bypassed Strategy spoiler masking entirely.
 * Does not: Decide what is spoilery — the model marks it, prompted by ollama_prompts.py.
 *
 * The answer bubble hides spoilers by collapsing a ```bonsai-spoiler fence, which needs somewhere
 * to collapse to. A one-line status has nowhere, so this redacts in place instead: the sentence
 * stays readable and only the marked span becomes blocks. See
 * docs/archive/06-thinking-blurbs-review.md § 2.7.
 */

const SPOILER_SPAN_RE = /\[\[\s*spoiler\s*\]\]([\s\S]*?)\[\[\s*\/\s*spoiler\s*\]\]/gi;
const SPOILER_OPEN_RE = /\[\[\s*spoiler\s*\]\]/gi;
const SPOILER_CLOSE_RE = /\[\[\s*\/\s*spoiler\s*\]\]/gi;

export const REDACTION_GLYPH = "█";

/** Cap so a long marked span becomes a redaction, not a wall that pushes the line off screen. */
const MAX_GLYPHS_PER_WORD = 12;

function toBlocks(text: string): string {
  /*
   * Per word, not per span: the shape of the sentence is what makes this read as "something was
   * hidden here" rather than as a rendering fault. Word lengths are capped because the exact
   * length of a boss name is itself a small hint.
   */
  return text
    .split(/(\s+)/)
    .map((part) => {
      if (!part || /^\s+$/.test(part)) return part;
      const width = Math.min(part.length, MAX_GLYPHS_PER_WORD);
      return REDACTION_GLYPH.repeat(width);
    })
    .join("");
}

/**
 * `masked: false` keeps the words and drops the markers — the user has consent, or masking is off.
 * Either way the raw `[[spoiler]]` markup must never reach the screen.
 */
export function redactThinkingBlurbSpoilers(text: string, masked: boolean): string {
  const raw = text ?? "";
  if (!raw) return "";

  SPOILER_SPAN_RE.lastIndex = 0;
  let out = raw.replace(SPOILER_SPAN_RE, (_all, inner: string) =>
    masked ? toBlocks(inner) : inner,
  );

  /*
   * A span whose closing marker never arrived — the model was cut off, or wrote the opener and
   * forgot. Masking to the end of the line is the only safe reading: the alternative is printing
   * the very words the model flagged as spoilery.
   */
  SPOILER_OPEN_RE.lastIndex = 0;
  const orphanOpen = out.search(SPOILER_OPEN_RE);
  if (orphanOpen >= 0) {
    const head = out.slice(0, orphanOpen);
    const tail = out.slice(orphanOpen).replace(SPOILER_OPEN_RE, "");
    out = head + (masked ? toBlocks(tail) : tail);
  }

  SPOILER_CLOSE_RE.lastIndex = 0;
  return out.replace(SPOILER_CLOSE_RE, "").replace(/\s{2,}/g, " ").trim();
}
