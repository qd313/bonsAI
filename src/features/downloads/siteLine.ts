/**
 * Title: The one-line "From ..." list of download sites, by each site's most telling name
 *
 * Purpose: The job card's small print is one line that is cut with "..." when too long. This names each site by its
 * registrable domain (registry.ollama.ai is "ollama.ai", archive.ubuntu.com and security.ubuntu.com are one
 * "ubuntu.com") and, when the whole list will not fit, shows whole names and ends "and N more" -- a name is never
 * cut in the middle.
 *
 * Used for: ollamaSetupJob.ts, voiceInstallJob.ts, knowledgeLibraryJob.ts and OllamaSetupStatusLine.tsx.
 *
 * Does not: shorten the download box before a download (downloadSites.ts), which names every host exactly.
 */

/**
 * How many characters of the line fit on the Deck's card, "From " included. Measured on the Deck on 2026-11-17: the
 * card cut "From ollama.com, github.com and registry.ollam..." at about 46 characters.
 */
export const SITES_LINE_BUDGET = 46;

/** The registrable domain: the last two labels. Every site bonsAI names ends in .com, .ai, .io or .co, none in a two-part ending like .co.uk. */
export function shortSiteName(host: string): string {
  const labels = host.replace(/^https?:\/\//, "").replace(/\/.*$/, "").split(".");
  return labels.slice(-2).join(".");
}

/**
 * "From a, b and c", from full or short host names. Over `budget` characters it keeps the whole names that fit and
 * ends "and N more". `joiner` is the word before the last name ("or" for a fallback source).
 */
export function sitesLine(hosts: readonly string[], joiner: "and" | "or" = "and", budget: number = SITES_LINE_BUDGET): string {
  const names = [...new Set(hosts.map(shortSiteName))];
  const join = (list: string[], tail: string): string =>
    list.length === 0 ? tail : `${list.join(", ")} ${tail}`;
  const whole =
    names.length > 1 ? `From ${join(names.slice(0, -1), `${joiner} ${names[names.length - 1]}`)}` : `From ${names[0] ?? ""}`;
  if (whole.length <= budget) return whole;
  for (let k = names.length - 1; k >= 1; k--) {
    const line = `From ${join(names.slice(0, k), `and ${names.length - k} more`)}`;
    if (line.length <= budget) return line;
  }
  return `From ${names.length} sites`;
}
