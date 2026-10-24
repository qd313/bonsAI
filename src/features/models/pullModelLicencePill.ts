/**
 * Title: License pill text for a model row
 *
 * Purpose: Each row in the "Add models" list can carry a small pill after the model name that
 * tells the person what kind of license the model has. This file works out the words on that
 * pill from one catalog entry.
 *
 * Used for: PullModelLicenceSlot.tsx, which draws the pill.
 *
 * Solves: The catalog file is mostly a long list of models; the one rule about pill wording lives
 * here on its own so it stays easy to find and to test.
 *
 * Does not: Draw anything, and does not decide which licence class a model is in; that is the
 * catalog entry's own `licenseClass`.
 */
import type { PullModelEntry } from "./pullModelCatalog";

/**
 * What the small licence pill on a model row says. Every row has one (plan 96 F18), so a person can
 * see at a glance why a row is not plain open source.
 *
 * - Open-source class: "FOSS" when the row's own licence label is Apache or MIT (or there is no
 *   label to contradict). Any other label shows the licence's own name, so the screen never calls
 *   it FOSS; the size note in brackets is left off, as the pill is narrow. No catalog row is in this
 *   situation today (the two Qwen 3B sizes left the class in plan 93), but the rule stays honest.
 * - Open-weight class: "Research only" when the label says Research (the Qwen 3B sizes), otherwise
 *   "Open weight" (the maker's own terms; the same words as the "Also try open-weight models" filter).
 * - "non_foss" class: "Not open".
 * - Unknown class: "Unknown".
 *
 * Each pill is at most two words of eight letters, so it wraps onto two lines inside the row's
 * 48 px slot and pushes nothing else out of place.
 */
export function pullModelLicencePillText(entry: Pick<PullModelEntry, "license" | "licenseClass">): string {
  const label = (entry.license ?? "").trim();
  switch (entry.licenseClass) {
    case "foss":
      if (!label || /^(Apache|MIT)\b/i.test(label)) return "FOSS";
      return label.replace(/\s*\(.*\)\s*$/, "").trim() || "FOSS";
    case "open_weight":
      return /research/i.test(label) ? "Research only" : "Open weight";
    case "non_foss":
      return "Not open";
    default:
      return "Unknown";
  }
}
