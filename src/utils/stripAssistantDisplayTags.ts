/**
 * Title: Catching any control tag the back end missed before it reaches the screen
 *
 * Purpose: The model writes a couple of tags into its own reply that are only meant for the
 * plugin to read — a status line wrapped in `<bonsai-status>`, and a strategy-branch marker —
 * and those are supposed to be removed by the back end before the reply is ever shown. This file
 * is the safety net for when that removal is missed, most often on a reply that continues across
 * more than one turn: it strips both kinds of tag from whatever text is about to be displayed,
 * including a tag that is still only half-written because the reply was cut off mid-stream.
 *
 * Used for: `buildAnswerBubbleElement` and transcript rendering, as a last check before text
 * reaches the screen.
 *
 * Solves: without this, an interrupted or missed removal on the back end could show raw tag text
 * like `<bonsai-status>` in the middle of an otherwise normal-looking reply.
 *
 * Does not: read these tags for anything. Acting on the status tag is the back end's job, and it
 * is supposed to happen before the reply is even saved; by the time this file sees the text, the
 * tag is only ever being thrown away.
 *
 * Gotchas:
 *   - A half-typed opening tag — the reply was cut off right in the middle of writing
 *     `<bonsai-status>` — is caught by matching what has arrived so far against that word,
 *     letter by letter, starting from the last `<` in the text. It only counts as a tag in
 *     progress once at least 4 of those letters match, so an unrelated `<` earlier in the text is
 *     not mistaken for the start of one.
 */

const BONSAI_STATUS_RE = /<bonsai-status>\s*[\s\S]*?<\/bonsai-status>/gi;
const BONSAI_STATUS_OPEN = "<bonsai-status>";
const BONSAI_STRATEGY_BRACKET_RE = /\[bonsai-strategy-branches\]\s*\([^)]*\)/gi;

/** Hide full/partial/broken `<bonsai-status>` openers (including `<bons you're…`). */
function stripIncompleteBonsaiStatusOpen(text: string): string {
  const lower = text.toLowerCase();
  const openIdx = lower.indexOf(BONSAI_STATUS_OPEN);
  if (openIdx >= 0) {
    if (lower.includes("</bonsai-status>", openIdx)) {
      return text;
    }
    return text.slice(0, openIdx).trimEnd();
  }
  const lt = lower.lastIndexOf("<");
  if (lt < 0) {
    return text;
  }
  const target = "bonsai-status>";
  const rest = lower.slice(lt + 1);
  let matched = 0;
  for (const ch of rest) {
    if (matched < target.length && ch === target[matched]) {
      matched += 1;
      continue;
    }
    if (matched >= 4) {
      return text.slice(0, lt).trimEnd();
    }
    return text;
  }
  if (matched > 0) {
    return text.slice(0, lt).trimEnd();
  }
  return text;
}

export function stripAssistantDisplayTags(text: string): string {
  let out = (text || "").replace(BONSAI_STATUS_RE, "");
  out = stripIncompleteBonsaiStatusOpen(out);
  out = out.replace(BONSAI_STRATEGY_BRACKET_RE, "");
  return out.replace(/\n{3,}/g, "\n\n").trim();
}
