/**
 * Title: Asked-entity spoiler unwrap
 * Purpose: Display-time unwrap of bonsai-spoiler fences per spoiler constitution rules.
 * Used for: buildAnswerBubbleElement before markdown render.
 * Solves: Redundant spoiler hiding for consented, low-narrative, or named-entity turns.
 * Does not: Change backend spoiler policy — prompt and sanitizer remain authoritative.
 */

import { titleProfileIsLowNarrative } from "../data/spoilerTitleProfiles";
import type { KbAttachedNote } from "./inputTransparency";

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
  /**
   * The thing the backend worked out the question named — a card title such as "Wheatley" or
   * "Dreadnought Twins" (plan 54 gap 2). The backend recognises far more ways of naming a boss
   * than the local regex below does ("wheatley fight", "deal with the exploders", a knowledge-base
   * card's own title). When set, it wins outright; `extractAskedBeatEntity(question)` is only the
   * fallback, kept for turns saved before this field existed.
   */
  askedEntity?: string | null;
  /** When true, unwrap every spoiler fence for this turn (explicit consent). */
  spoilerConsentEffective?: boolean;
  /**
   * This turn's protected names (D112 #7, plan 70): boss or enemy notes the question did not
   * name, on a turn whose spoilers are covered -- read off the notes the back end marked
   * (`protectedNamesFromNotes`). A cover naming one is never opened by the asked-about rules.
   */
  protectedNames?: readonly string[] | null;
};

/** One turn's facts every spoiler un-hide reads, in the answer builders' own field names. */
export type TurnSpoilerFacts = {
  askQuestion: string;
  appId: string | null;
  appName: string | null;
  askedEntity: string | null;
  spoilerConsentEffective: boolean;
  protectedNames: string[];
};

/** The protected names of one turn, from its attached notes' own marks (see buildKbNotesBlockElement). */
export function protectedNamesFromNotes(notes: readonly KbAttachedNote[] | null | undefined): string[] {
  return (notes ?? []).filter((n) => n.spoiler_protected === true).map((n) => n.name);
}

function squash(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ");
}

/** Whether `text` names `name` as a whole word or phrase ("Soul Master", not "Soul Mastery"). */
function namesInText(text: string, name: string): boolean {
  const n = squash(name).trim();
  if (!n) return false;
  const h = squash(text);
  let at = h.indexOf(n);
  while (at !== -1) {
    const before = at === 0 ? "" : h[at - 1]!;
    const after = h[at + n.length] ?? "";
    if (!/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after)) return true;
    at = h.indexOf(n, at + 1);
  }
  return false;
}

/**
 * The thing this turn asked about: the back end's own reading, but only when the question really
 * contained it -- a back-end name the person never typed is exactly what the cover exists to
 * hide (plan 70) -- otherwise the local reading of the question.
 */
function askedEntityFor(opts: UnwrapSpoilerOpts): string {
  const question = opts.question || "";
  const backend = (opts.askedEntity || "").trim();
  if (backend && namesInText(question, backend)) return backend;
  return extractAskedBeatEntity(question);
}

/**
 * True when a single ```bonsai-spoiler fence (opener + body, closed or still open) should
 * render as plain prose for this turn: the user consented, the title profile is
 * low-narrative (routine boss/tactics), or the fence mentions the asked beat entity.
 * Shared by the closed-fence unwrap below and the mid-stream open-fence check in
 * prepareStreamMarkdown, so the two never drift on what "qualifies" means.
 */
export function shouldUnwrapSpoilerFence(fenceText: string, opts: UnwrapSpoilerOpts): boolean {
  /* Never, whatever else holds: this cover names a protected thing the person did not type. */
  if ((opts.protectedNames ?? []).some((name) => namesInText(fenceText, name))) return false;
  const appId = String(opts.appId || "").trim();
  const appName = opts.appName || "";
  const consent = opts.spoilerConsentEffective === true;
  if (consent) return true;
  if (titleProfileIsLowNarrative(appId, appName)) return true;
  const entity = askedEntityFor(opts);
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
  const appId = String(opts.appId || "").trim();
  const appName = opts.appName || "";
  const consent = opts.spoilerConsentEffective === true;
  const lowNarrativeTitle = titleProfileIsLowNarrative(appId, appName);
  const entity = askedEntityFor(opts);
  if (!text) return text;
  if (!consent && !lowNarrativeTitle && !entity) return text;
  return text.replace(SPOILER_FENCE_RE, (full, body: string) => {
    if (shouldUnwrapSpoilerFence(full, opts) || shouldUnwrapSpoilerFence(body, opts)) {
      return String(body).replace(/\n$/, "");
    }
    return full;
  });
}
