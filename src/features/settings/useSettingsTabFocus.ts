/**
 * Title: The Settings tab's chain of folded sections
 *
 * Purpose: Lists the Settings tab's sections in order with where the ring enters each one from above
 * (its first control) and from below (its last), which the section lines use for Down into an open
 * section and Up into the open section above (plan 91 § 6; FoldedSection.tsx). Also hands each section
 * body a ref, so those two entries find their control inside that body and nowhere else.
 *
 * Used for: SettingsTab.tsx.
 *
 * Solves: The sections are separate files and Steam's own guess at Up and Down between them does not
 * follow the tab's order once a section can be closed. A section's body registers its element here; the
 * entry looks only inside that element (never the page: under Decky the global document is the wrong
 * one) and gives focus through `focusInTabBody`, which plans the pane's place first so the browser's own
 * scroll on focus never jumps it (useTabBodyFocusScroll.ts).
 *
 * Does not: Move the ring across containers (the section lines do that through Steam's own transfer), or
 * decide which control is greyed: a section that must skip one knows its own state and does not call
 * these.
 *
 * Gotchas: A control is "the innermost thing Steam navigates": a Focusable wrapped around a button is not
 * a stop of its own, the button inside it is. The three single-row choice sections enter on their first
 * button from either side, so Up from the line below does not land on the far end of the row.
 */
import { useCallback, useMemo, useRef } from "react";

import { focusInTabBody } from "../../shared/dpad/useTabBodyFocusScroll";
import type { FoldChainSection } from "../folded-tabs/FoldedSection";
import { settingsSectionIds, type SettingsSectionId } from "./settingsTabFolds";

/** What Steam navigates inside a section body. */
const STOP_SELECTOR = "[tabindex], button, input";

/** Sections that are one row of buttons: the ring enters on the first button from above and from below. */
const FIRST_BUTTON_BOTH_WAYS: ReadonlySet<SettingsSectionId> = new Set(["screenshot", "textsize"]);

/** The stops inside `host`, top to bottom: the innermost matches only. */
function stopsIn(host: HTMLElement): HTMLElement[] {
  // focus-patterns-allow: element-scoped query on the section body's own ref, the sanctioned pattern (useOllamaTabFocus.ts).
  const all = Array.from(host.querySelectorAll<HTMLElement>(STOP_SELECTOR));
  // focus-patterns-allow: element-scoped query on the section body's own ref, the sanctioned pattern (useOllamaTabFocus.ts).
  return all.filter((el) => !el.querySelector(STOP_SELECTOR));
}

function focusStop(host: HTMLElement | null | undefined, last: boolean): boolean {
  if (!host) return false;
  const stops = stopsIn(host);
  const target = last ? stops[stops.length - 1] : stops[0];
  if (!target) return false;
  focusInTabBody(target);
  return true;
}

/** The tab's section chain, and the ref each section body registers itself with. */
export function useSettingsTabFocus() {
  const hosts = useRef(new Map<string, HTMLElement>());
  const refs = useRef(new Map<string, (el: HTMLElement | null) => void>());

  /** A stable ref callback for section `id`'s body (a new function each render would unregister and re-register it). */
  const bodyRef = useCallback((id: string) => {
    let ref = refs.current.get(id);
    if (!ref) {
      ref = (el) => {
        if (el) hosts.current.set(id, el);
        else hosts.current.delete(id);
      };
      refs.current.set(id, ref);
    }
    return ref;
  }, []);

  const chain = useMemo<FoldChainSection[]>(
    () =>
      settingsSectionIds().map((id) => ({
        id,
        enterFromTop: () => focusStop(hosts.current.get(id), false),
        enterFromBottom: () => focusStop(hosts.current.get(id), !FIRST_BUTTON_BOTH_WAYS.has(id)),
      })),
    [],
  );

  return { chain, bodyRef };
}
