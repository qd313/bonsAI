/**
 * Title: Up from the floating Open all button, walked on the three folded tabs (plan 106, lane F1)
 * Purpose: Pin the Deck check: on Ollama, Settings and Developer, Up from "Open all" stops on the last section's last
 *          control when that section is open (the Deck, plan 105 block D3a, found it on the section's line, skipping
 *          the section's own controls), with "Open sections as you walk" on, as the Deck had it; and on the last
 *          section's line when that section is closed. The walk presses the D-pad the way Steam calls it, models
 *          Steam's own scroll-into-view, is bounded, and no stop is visited twice.
 * Used for: FoldAllButton.tsx, foldLineBelow (FoldedSection.tsx), foldedTabsStore.ts (where the ring came from).
 * Does not: Know the Deck's real heights (foldedTabWalk.tsx's flow model); the Deck walk measures the truth. The
 *           every-section-open walks of each tab (OllamaTab, SettingsTab and DeveloperTab .foldedWalk tests) check
 *           the same landing with the switch off.
 */
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../test-harness/steamRing");
  /* Steam's switch row: a stop of its own that keeps the move handlers it is given, as Decky's ToggleField does. */
  const ToggleField = (p: Record<string, unknown>) => {
    const { label, checked: _checked, onChange: _onChange, description: _d, disabled: _x, ...rest } = p;
    return <SteamRingFocusable {...rest} focusable aria-label={stubs.wordsOf(label)} data-decky-ui="ToggleField" />;
  };
  return { ...stubs, Focusable: SteamRingFocusable, ToggleField };
});

import {
  BOUND,
  DECK_PANE,
  DEVELOPER_CASE,
  OLLAMA_CASE,
  PANE_TOP,
  SETTINGS_CASE,
  names,
  openNow,
  resetAutoFoldWalk,
  seeing,
  switchOn,
  walk,
  walkSeeing,
} from "../../test-harness/autoFoldWalk";

beforeEach(() => resetAutoFoldWalk());
afterEach(() => cleanup());

const BUTTON = /^(Open|Close) all sections$/;

describe("Up from the Open all button", () => {
  for (const t of [OLLAMA_CASE, SETTINGS_CASE, DEVELOPER_CASE]) {
    it(`${t.name}, the switch on: Down to the end, then Up from the button stops on the last section's last control, on screen, and the walk back up visits no stop twice`, () => {
      switchOn();
      const w = walk(t, DECK_PANE, "nearest");
      const down = [seeing(w, w.enter()), ...walkSeeing(w, "down")];
      expect(down[down.length - 1]!.l.name).toMatch(BUTTON);
      const last = down[down.length - 2]!;
      expect(last.section, "the stop before the button is in the last section").toBe(t.ids[t.ids.length - 1]);
      expect(last.line, "and is one of its controls, not its line").toBe(false);
      expect(openNow(w.container)).toContain(t.ids[t.ids.length - 1]);

      const up = walkSeeing(w, "up", BOUND);
      expect(up[0]!.l.name).toBe(last.l.name);
      expect(up[0]!.l.top).toBeGreaterThanOrEqual(PANE_TOP - 0.5);
      expect(up[0]!.l.bottom).toBeLessThanOrEqual(PANE_TOP + DECK_PANE + 0.5);
      expect(new Set(up.map((s) => s.l.stop)).size, names(up).join(" | ")).toBe(up.length);
      expect(up[up.length - 1]!.line && up[up.length - 1]!.section).toBe(t.ids[0]);
      w.unmount();
    });

    it(`${t.name}, the last section closed: Up from the button stops on its line`, () => {
      const w = walk(t, DECK_PANE, "nearest");
      const down = [seeing(w, w.enter()), ...walkSeeing(w, "down")];
      expect(down[down.length - 1]!.l.name).toMatch(BUTTON);
      const lastLine = down[down.length - 2]!;
      expect(lastLine.line && lastLine.section).toBe(t.ids[t.ids.length - 1]);
      expect(w.press("up")?.name).toBe(lastLine.l.name);
      w.unmount();
    });
  }
});
