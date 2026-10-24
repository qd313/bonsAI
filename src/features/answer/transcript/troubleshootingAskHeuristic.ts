/**
 * Title: Noticing a question that sounds like game troubleshooting
 *
 * Purpose: When a question looks like it is about getting a game running well on the Deck —
 * crashing, stuttering, a black screen, Proton issues — the plugin can offer to turn on the
 * permission that lets it read that game's own compatibility logs, rather than turning it on
 * automatically. This file is the plain word-matching rule that decides whether a question looks
 * like that kind of troubleshooting question.
 *
 * Used for: `MainTabChatTranscript`, to decide whether to show the "read game & screenshot
 * context" permission hint under a reply.
 *
 * Solves: offers the permission at the moment it would actually help, instead of showing it on
 * every reply or never at all.
 *
 * Does not: replace the back end's own version of this same check
 * (`question_matches_troubleshooting_log_context`). The two lists of phrases have to be kept in
 * step with each other by hand — there is no shared code between them.
 *
 * Does not: decide whether the plugin's knowledge base runs for this question at all. A
 * separate, deliberately much wider rule (`compat_topic_router.py`) owns that decision. Matching
 * this file's narrower wording list to that one would turn on the permission hint for every
 * troubleshooting-shaped question, not only the ones where reading logs would actually help.
 */
export function questionLooksLikeTroubleshootingAsk(question: string): boolean {
  const s = (question || "").toLowerCase();
  if (s.includes("what settings should i use")) return true;
  if (s.includes("any known issues") && s.includes("deck")) return true;
  if (s.includes("how well does this game run") && s.includes("deck")) return true;
  if (s.includes("why is my game crashing")) return true;
  if (/\b(how do i fix stuttering|fix stuttering)\b/.test(s)) return true;
  if (s.includes("troubleshoot") && s.includes("proton")) return true;
  if (/\bgame won'?t launch\b/.test(s) && s.includes("check")) return true;
  if (s.includes("proton issue")) return true;
  if (
    s.includes("proton") &&
    ["deck", "sleep", "resume", "black screen", "crash", "launch", "stutter", "shader", "wine", "steamos", "compat"].some(
      (kw) => s.includes(kw),
    )
  ) {
    return true;
  }
  if (
    s.includes("deck") &&
    [
      "sleep",
      "resume",
      "black screen",
      "crash",
      "proton",
      "steamos",
      "sd card",
      "storage",
      "update",
      "gamescope",
      "steam input",
    ].some((kw) => s.includes(kw))
  ) {
    return true;
  }
  return false;
}
