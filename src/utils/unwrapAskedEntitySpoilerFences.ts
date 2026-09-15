/**
 * Title: Asked-entity spoiler unwrap
 * Purpose: Display-time unwrap of bonsai-spoiler fences per spoiler constitution rules.
 * Used for: buildAnswerBubbleElement before markdown render.
 * Solves: Redundant spoiler hiding for consented, low-narrative, or named-entity turns.
 * Does not: Change backend spoiler policy — prompt and sanitizer remain authoritative.
 */

import { titleProfileIsLowNarrative } from "../data/spoilerTitleProfiles";

const SPOILER_FENCE_RE = /```bonsai-spoiler\s*\n([\s\S]*?)```/gi;

export function extractAskedBeatEntity(question: string): string {
  const raw = (question || "").trim();
  if (!raw) return "";
  const patterns = [
    /(?:how\s+(?:do\s+i|to|can\s+i)\s+)?(?:beat|defeat|kill|fight|survive(?:\s+against)?)\s+(?:the\s+)?(.+?)(?:\?|$)/i,
    /(?:tips?\s+(?:for|on|against))\s+(?:the\s+)?(.+?)(?:\?|$)/i,
  ];
  for (const pat of patterns) {
    const match = raw.match(pat);
    if (!match?.[1]) continue;
    const entity = match[1].trim().replace(/[?.!]+$/, "").trim();
    if (entity.length >= 3) return entity;
  }
  return "";
}

function entityMentioned(haystack: string, entity: string): boolean {
  const h = haystack.toLowerCase();
  const e = entity.toLowerCase();
  if (e && h.includes(e)) return true;
  const tokens = e.split(/[\s\-_/]+/).filter((t) => t.length >= 4);
  if (!tokens.length) return false;
  const hits = tokens.filter((t) => h.includes(t)).length;
  return hits >= Math.max(1, tokens.length - 1);
}

export type UnwrapSpoilerOpts = {
  question?: string;
  appId?: string | null;
  /**
   * The game's display name, for a title reachable only by name — an emulator shortcut with no
   * Steam AppID (plan 54 gap 1). Passed straight through to `titleProfileIsLowNarrative`, which
   * already checks the AppID first and only falls back to the name.
   */
  appName?: string | null;
  /** When true, unwrap every spoiler fence for this turn (explicit consent). */
  spoilerConsentEffective?: boolean;
};

/**
 * True when a single ```bonsai-spoiler fence (opener + body, closed or still open) should
 * render as plain prose for this turn: the user consented, the title profile is
 * low-narrative (routine boss/tactics), or the fence mentions the asked beat entity.
 * Shared by the closed-fence unwrap below and the mid-stream open-fence check in
 * prepareStreamMarkdown, so the two never drift on what "qualifies" means.
 */
export function shouldUnwrapSpoilerFence(fenceText: string, opts: UnwrapSpoilerOpts): boolean {
  const question = opts.question || "";
  const appId = String(opts.appId || "").trim();
  const appName = opts.appName || "";
  const consent = opts.spoilerConsentEffective === true;
  if (consent) return true;
  if (titleProfileIsLowNarrative(appId, appName)) return true;
  const entity = extractAskedBeatEntity(question);
  if (!entity) return false;
  return entityMentioned(fenceText, entity);
}

/**
 * Convert ```bonsai-spoiler fences into plain prose when:
 * - the user consented to spoilers for this turn,
 * - the title profile is low-narrative (routine boss/tactics), or
 * - the fence body mentions the asked beat entity.
 */
export function unwrapAskedEntitySpoilerFences(
  text: string,
  questionOrOpts: string | UnwrapSpoilerOpts
): string {
  const opts: UnwrapSpoilerOpts =
    typeof questionOrOpts === "string" ? { question: questionOrOpts } : questionOrOpts;
  const question = opts.question || "";
  const appId = String(opts.appId || "").trim();
  const appName = opts.appName || "";
  const consent = opts.spoilerConsentEffective === true;
  const lowNarrativeTitle = titleProfileIsLowNarrative(appId, appName);
  const entity = extractAskedBeatEntity(question);
  if (!text) return text;
  if (!consent && !lowNarrativeTitle && !entity) return text;
  return text.replace(SPOILER_FENCE_RE, (full, body: string) => {
    if (shouldUnwrapSpoilerFence(full, opts) || shouldUnwrapSpoilerFence(body, opts)) {
      return String(body).replace(/\n$/, "");
    }
    return full;
  });
}
