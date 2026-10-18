/**
 * Title: Licence pill text for a model row
 *
 * Purpose: Each row in the "Add models" list can carry a small pill after the model name that
 * tells the person what kind of licence the model has. This file works out the words on that
 * pill from one catalog entry, or says there should be no pill at all.
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
 * What the small licence pill on a model row says, or null when the row shows no pill.
 *
 * The pill sits on every open-source-class row. It says "FOSS" only when the row's own licence
 * label is Apache or MIT (or there is no label to contradict). A row kept in the open-source
 * class for another reason -- today the two Qwen 3B sizes, whose card says Qwen Research -- shows
 * the licence's name instead, so the screen never calls it FOSS. The size note in brackets is
 * left off; the pill is narrow.
 */
export function pullModelLicencePillText(entry: Pick<PullModelEntry, "license" | "licenseClass">): string | null {
  if (entry.licenseClass !== "foss") return null;
  const label = (entry.license ?? "").trim();
  if (!label || /^(Apache|MIT)\b/i.test(label)) return "FOSS";
  return label.replace(/\s*\(.*\)\s*$/, "").trim() || "FOSS";
}
