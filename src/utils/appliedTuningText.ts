/**
 * Title: Wording for "here is what got tuned"
 *
 * Purpose: An older version of this plugin could change the Steam Deck's power limit (called TDP)
 * directly and would show the player a short banner confirming what it had just changed. It could
 * also suggest a graphics clock speed, but never actually applied that one — that number was always
 * just a recommendation. This file builds both pieces of text: the banner, and a closing note added
 * to the end of a reply.
 *
 * Used for: the banner shown on the main tab (MainTabChatTranscript) and the closing note added to a
 * finished AI answer (useBonsaiAskOrchestration).
 *
 * Solves: keeps the specific wording about power limits and clock speed out of the file that builds
 * the message sent to save settings, so that file does not also have to know how to phrase this.
 *
 * Does not: change anything on the Deck itself. This plugin stopped changing the power limit on
 * 2026-07-30 — the "apply" feature this file describes no longer runs for new replies. The banner and
 * note are kept only because a reply saved from before that date can still carry the old information
 * about what was changed, and if one ever does, this is what displays it. The graphics clock number
 * was never applied by this plugin and still is not — it has only ever been a suggestion.
 */
import { type AppliedResultLike } from "../data/bonsaiSettingsSchema";

/** QAM Performance verification line — sysfs is source of truth; QAM can lag. */
const QAM_VERIFY_SLIDER_LINE =
  "If QAM Performance sliders look stale, close and reopen the QAM Performance tab to verify values match the applied cap.";

/**
 * One short banner for the main tab when last Ask included tuning `applied` metadata.
 * TDP (sysfs) is distinguished from GPU MHz (advisory; not written by this plugin yet).
 * Apply path is obsolete — banner retained for any residual applied metadata from older sessions.
 */
export function formatAppliedTuningBannerText(applied: AppliedResultLike | null | undefined): string | null {
  if (!applied) return null;
  const tdp = applied.tdp_watts;
  const gpu = applied.gpu_clock_mhz;
  if (tdp == null && gpu == null) return null;

  const errList = applied.errors?.length ? applied.errors : [];
  if (tdp != null) {
    let s = `TDP ${tdp}W was applied. ${QAM_VERIFY_SLIDER_LINE}`;
    if (gpu != null) {
      s += ` GPU ${gpu} MHz is a recommendation; this plugin does not write GPU clock to hardware yet.`;
    }
    return s;
  }

  if (gpu != null) {
    const pre = errList.length > 0 ? `TDP was not applied (${errList[0]}). ` : "";
    return `${pre}GPU ${gpu} MHz is from the model; this plugin does not write GPU clock to hardware yet.`;
  }

  return null;
}

export function buildResponseText(responseText: string, applied?: AppliedResultLike | null): string {
  let text = responseText || "No response text.";
  if (!applied) return text;
  const parts: string[] = [];
  if (applied.tdp_watts != null) parts.push(`TDP: ${applied.tdp_watts}W`);
  if (applied.gpu_clock_mhz != null) parts.push(`GPU: ${applied.gpu_clock_mhz} MHz`);
  if (parts.length > 0) text += `\n\n[Applied: ${parts.join(", ")}]`;
  if (applied.errors?.length) text += `\n[Errors: ${applied.errors.join("; ")}]`;
  else if (parts.length > 0) {
    text += `\n\nNote: If Steam's QAM Performance sliders look stale, close and reopen that tab to verify values match what was applied.`;
  }
  return text;
}
