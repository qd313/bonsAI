/**
 * Title: Answer copy text builder
 * Purpose: Build the text a reply's Copy action puts on the clipboard.
 * Used for: ReplyCopyButton, wired through buildReplyActionsElement.
 * Solves: Copying internal display tags, or the body of a spoiler fence the user has not
 *   revealed on screen, instead of the answer the user actually reads.
 * Does not: Render markdown to plain prose — copies the same source text
 *   MainTabBonsaiAiMarkdownChunk renders, minus internal tags and hidden spoiler bodies.
 */
import { stripAssistantDisplayTags } from "./stripAssistantDisplayTags";
import { unwrapAskedEntitySpoilerFences, type UnwrapSpoilerOpts } from "./unwrapAskedEntitySpoilerFences";

const SPOILER_FENCE_RE = /```bonsai-spoiler\s*\n([\s\S]*?)```/gi;

/** Shown in place of a fence the UI still renders masked — never leak unrevealed spoiler text. */
export const SPOILER_HIDDEN_COPY_PLACEHOLDER = "[Spoiler hidden — reveal it on screen to copy]";

export type BuildAnswerCopyTextArgs = {
  /** Raw turn body, same string passed to buildAnswerBubbleElement. */
  body: string;
  /** Whether Settings has spoiler masking on. When off, every fence renders inline — see
   *  MainTabBonsaiAiMarkdownChunk's `code:` renderer, which is what this mirrors. */
  spoilerMaskingEnabled?: boolean;
  askQuestion?: string;
  appId?: string | null;
  /** Active game's display name — for a title reachable only by name (plan 54 gap 1). */
  appName?: string | null;
  /** The thing the backend worked out the question named (plan 54 gap 2). */
  askedEntity?: string | null;
  spoilerConsentEffective?: boolean;
};

/**
 * The text a Copy press puts on the clipboard: internal display tags stripped, spoiler fences
 * unwrapped wherever the render would also unwrap them (same rule, same function, as the bubble),
 * and any spoiler fence still masked replaced with a placeholder rather than copied verbatim.
 */
export function buildAnswerCopyText(args: BuildAnswerCopyTextArgs): string {
  const {
    body,
    spoilerMaskingEnabled = true,
    askQuestion = "",
    appId = null,
    appName = null,
    askedEntity = null,
    spoilerConsentEffective = false,
  } = args;

  let text = stripAssistantDisplayTags(body || "");

  const opts: UnwrapSpoilerOpts = {
    question: askQuestion,
    appId,
    appName,
    askedEntity,
    spoilerConsentEffective,
  };
  text = unwrapAskedEntitySpoilerFences(text, opts);

  if (!spoilerMaskingEnabled) {
    // Masking is off: every fence renders inline as plain prose, so copy does the same.
    text = text.replace(SPOILER_FENCE_RE, (_full, fenceBody: string) =>
      String(fenceBody).replace(/\n$/, "")
    );
  } else {
    // Whatever the unwrap above left behind is still a masked, collapsed fence on screen.
    text = text.replace(SPOILER_FENCE_RE, SPOILER_HIDDEN_COPY_PLACEHOLDER);
  }

  return text.trim();
}
