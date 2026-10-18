/**
 * Title: Filling the help strip from the row the ring lands on
 *
 * Purpose: A folded tab's rows are one line each; the longer text that used to sit under or above a
 * row now rides on the row as a data attribute, and the strip at the bottom of the panel shows it for
 * the row the ring is on: its name in bold, then the text. This hook does the filling, and tells the
 * tab's scroll plan how much of the pane's bottom the strip now covers.
 *
 * Used for: TabHelpStrip (the strip itself), on the Ollama tab now and the Settings and Developer tabs
 * next. Rows mark themselves with `helpAttributes(label, text)` (DenseRow does it for them).
 *
 * Solves: Two things the strip must get right at the same moment the ring lands, not a frame later.
 * The text must change on the frame the ring lands (plan 91 § 2b; the Deck check reads both together),
 * so the strip is written straight into its element by the same capture-phase focus listener the
 * tab's scroll plan uses (useTabBodyFocusScroll's landing watchers), not through React state. And the
 * scroll plan must keep the ringed row clear of the strip, so the watcher hands back the strip's own
 * measured height and the plan widens its bottom margin by exactly that (plan 92 brief, piece 4); it
 * also asks for the folded tabs' shorter page-turn step (FOLDED_TAB_SCROLL_STEP_FRACTION), and tells the
 * plan's look-ahead how tall the strip will be for the next row (measured on an unseen copy of the strip),
 * so a row bringing a taller strip than the last one is prepared for a press early, not met with a jump.
 *
 * Does not: Scroll anything, or move the ring. Does not know any row's text: it reads whatever the
 * row carries. Does not show anything for a section line, a control with no text, or a ring outside
 * the tab: the strip hides then.
 *
 * Gotchas: A row whose text follows its value (Thinking: the picked level's description) rewrites the
 * attribute when the value changes; the strip watches the attribute of the row it is showing and
 * re-reads it, so the text changes with the pick while the ring stays on the row.
 */
import { useEffect, type RefObject } from "react";

import { watchTabBodyLandings } from "../../shared/dpad/useTabBodyFocusScroll";
import { FOLDED_TAB_SCROLL_STEP_FRACTION } from "../../shared/dpad/tabBodyScrollPlan";
import { rememberFoldSection } from "./foldedTabsStore";

/** The row's longer text, shown in the strip while the ring is on the row or on a control inside it. */
export const HELP_TEXT_ATTR = "data-bonsai-help";
/** The row's name, shown in bold before the text. */
const HELP_LABEL_ATTR = "data-bonsai-help-label";
/** Marks a folded section (its line and its body); the value is the section's id. */
export const FOLD_SECTION_ATTR = "data-bonsai-fold-section";

/** The two attributes a row spreads onto its outer element so the strip can show its text. */
export function helpAttributes(label: string, text: string | undefined): Record<string, string | undefined> {
  const trimmed = text?.trim();
  return { [HELP_TEXT_ATTR]: trimmed ? trimmed : undefined, [HELP_LABEL_ATTR]: label };
}

/** The row around `target` that carries a text, or null. */
function helpHost(target: HTMLElement): HTMLElement | null {
  return target.closest<HTMLElement>(`[${HELP_TEXT_ATTR}]`);
}

/** The strip's two parts, as TabHelpStrip draws them, and an unseen copy of the strip for measuring. */
export interface HelpStripElements {
  strip: HTMLElement;
  label: HTMLElement;
  text: HTMLElement;
  /** The same strip, never seen: what `coverOf` writes a row's text into to read the height it would take. */
  measure: { strip: HTMLElement; label: HTMLElement; text: HTMLElement };
}

/**
 * Show `host`'s text in the strip, or hide the strip when `host` is null or carries none. Returns the
 * height the strip now covers, read off the strip itself (0 while hidden).
 */
function showHelpFor(parts: HelpStripElements, host: HTMLElement | null): number {
  const text = host?.getAttribute(HELP_TEXT_ATTR)?.trim() ?? "";
  if (!text) {
    parts.strip.hidden = true;
    parts.label.textContent = "";
    parts.text.textContent = "";
    return 0;
  }
  parts.label.textContent = host?.getAttribute(HELP_LABEL_ATTR) ?? "";
  parts.text.textContent = text;
  parts.strip.hidden = false;
  return parts.strip.getBoundingClientRect().height;
}

/** The height the strip would take for the row around `target`, measured on the unseen copy (0: no text). */
function heightFor(parts: HelpStripElements, target: HTMLElement): number {
  const { strip, label, text } = parts.measure;
  const height = showHelpFor({ strip, label, text, measure: parts.measure }, helpHost(target));
  strip.hidden = true;
  return height;
}

/**
 * Keep the strip of tab `tabId` in step with the ring: on every landing in the tab body, show the
 * landed row's text (or hide), remember which section the ring is in (FoldAllButton returns there),
 * and hand the strip's height to the scroll plan.
 */
export function useHelpStrip(tabId: string, partsRef: RefObject<HelpStripElements | null>): void {
  useEffect(() => {
    let shown: HTMLElement | null = null;
    const watch = new MutationObserver(() => {
      const parts = partsRef.current;
      if (parts && shown) showHelpFor(parts, shown);
    });
    const show = (host: HTMLElement | null): number => {
      const parts = partsRef.current;
      if (!parts) return 0;
      if (host !== shown) {
        watch.disconnect();
        shown = host;
        if (host) watch.observe(host, { attributes: true, attributeFilter: [HELP_TEXT_ATTR, HELP_LABEL_ATTR] });
      }
      return showHelpFor(parts, host);
    };
    const stop = watchTabBodyLandings(tabId, (target) => {
      if (!target) return show(null);
      const section = target.closest<HTMLElement>(`[${FOLD_SECTION_ATTR}]`)?.getAttribute(FOLD_SECTION_ATTR);
      if (section) rememberFoldSection(tabId, section);
      return show(helpHost(target));
    }, {
      stepFraction: FOLDED_TAB_SCROLL_STEP_FRACTION,
      coverOf: (el) => (partsRef.current ? heightFor(partsRef.current, el) : 0),
    });
    return () => {
      stop();
      watch.disconnect();
    };
  }, [tabId, partsRef]);
}
