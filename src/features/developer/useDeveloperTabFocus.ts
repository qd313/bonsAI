/**
 * Title: The Developer tab's D-pad chain between its section lines and its rows
 *
 * Purpose: Lists the tab's sections in order with where the ring enters each from above and from below, which
 * is what the section lines (FoldedSection) need: Down from an open line goes into the section's first stop,
 * Up from the line below goes into the section above's last stop. Also hands each section the place its stops'
 * elements are kept (developerRows.tsx fills it as the rows are drawn), and finds those two stops without moving
 * anything, for "Open sections as you walk" (autoFold.ts).
 *
 * Used for: DeveloperTab.tsx.
 *
 * Solves: The Developer tab's rows change with the settings (the Clear buttons, the captured errors, the
 * scramble rows), so the first and last stop of a section are only known when it is drawn. The chain reads
 * them from the elements the rows kept, rather than naming controls.
 *
 * Does not: Move the ring across containers. The hops are plain hops between controls of the one tab body,
 * through `focusInTabBody`, which plans the pane's place first so the browser's own scroll on focus never jumps
 * it (useTabBodyFocusScroll.ts). The section lines move by Steam's own transfer (FoldedSection.tsx).
 */
import { useMemo, useRef } from "react";
import type { MutableRefObject } from "react";

import { focusInTabBody } from "../../shared/dpad/useTabBodyFocusScroll";
import { plainHop } from "../../shared/dpad/lostFocusHop";
import type { FoldChainSection } from "../folded-tabs/FoldedSection";

type Hosts = MutableRefObject<(HTMLElement | null)[]>;

/** What the ring can land on inside a stop's element. */
const STOP_SELECTOR = "[tabindex], button, input";

/**
 * The first thing in a stop's element the ring can land on: a toggle, a button, a field, or the element itself.
 * A container round the real control (the Focusable round a row of buttons, round a button, round a field) can
 * carry a tabindex of its own, and landing on it would be landing beside the control, outside the row's words;
 * so the first match with no other match inside it is the one taken.
 */
function stopIn(host: HTMLElement | null | undefined): HTMLElement | null {
  if (!host) return null;
  // focus-patterns-allow: element-scoped query on the row's own element, the sanctioned pattern (the Ollama tab's focusFirstStopIn does the same).
  const all = Array.from(host.querySelectorAll<HTMLElement>(STOP_SELECTOR));
  return all.find((el) => !all.some((other) => other !== el && el.contains(other))) ?? null;
}

function focusStopIn(host: HTMLElement | null | undefined): boolean {
  const target = stopIn(host);
  if (!target) return false;
  /* False only while the page lacks the browser's focus and the ring did not follow (plan 97, lostFocusHop.ts). */
  return plainHop(target, "developer-tab", () => focusInTabBody(target));
}

/** The section's first and last stop's element, as the rows kept them. */
function firstHost(hosts: Hosts): HTMLElement | undefined {
  return hosts.current.find((h): h is HTMLElement => Boolean(h));
}

function lastHost(hosts: Hosts): HTMLElement | undefined {
  const live = hosts.current.filter((h): h is HTMLElement => Boolean(h));
  return live[live.length - 1];
}

/** The chain for the sections on screen (ids in order), and each section's place to keep its stops. */
export function useDeveloperTabFocus(ids: readonly string[]): {
  chain: FoldChainSection[];
  hostsFor: (id: string) => Hosts;
} {
  const store = useRef<Record<string, Hosts>>({});
  const hostsFor = (id: string): Hosts => (store.current[id] ??= { current: [] });
  const key = ids.join("|");
  const chain = useMemo<FoldChainSection[]>(
    () =>
      key.split("|").map((id) => ({
        id,
        enterFromTop: () => focusStopIn(firstHost(hostsFor(id))),
        enterFromBottom: () => focusStopIn(lastHost(hostsFor(id))),
        /* Found without moving anything: the walk's rule reads them ("Open sections as you walk", autoFold.ts). */
        firstStop: () => stopIn(firstHost(hostsFor(id))),
        lastStop: () => stopIn(lastHost(hostsFor(id))),
      })),
    // hostsFor only reads a ref: it is the same for every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  return { chain, hostsFor };
}
