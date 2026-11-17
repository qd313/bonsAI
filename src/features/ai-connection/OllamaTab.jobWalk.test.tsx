/**
 * Title: The folded Ollama tab walked with the D-pad while an install or update runs
 *
 * Purpose: Pin plan 105 lane D4 (row P105-OLLAMA-BUTTONS-01) at the walk's level: the real Ollama tab with a setup
 * run going, Where AI runs open as on a first visit, walked Down from the tab bar to the end and back Up a bounded
 * number of presses, the D-pad pressed the way Steam calls it and Steam's own scroll-into-view modelled three ways
 * (foldedTabWalk.tsx). The job card's Cancel stands in for Update and Browse: it is visited once each way, Update
 * and Browse are not stops at all, the connection line is a stop both ways (Down used to skip Test connection while
 * Up landed on it), no stop is visited twice, and every landing is on screen and clear of the strip.
 *
 * Does not: know the Deck's real heights (the harness's flow model) or Steam's real timing; the Deck row reads it.
 */
import { act, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../test-harness/steamRing");
  const ToggleField = (p: Record<string, unknown>) => {
    const { label, checked: _checked, onChange: _onChange, description: _d, disabled: _x, ...rest } = p;
    return <SteamRingFocusable {...rest} focusable aria-label={stubs.wordsOf(label)} data-decky-ui="ToggleField" />;
  };
  return { ...stubs, Focusable: SteamRingFocusable, ToggleField };
});

import { OllamaTab } from "./OllamaTab";
import { ollamaProps } from "../../test-harness/ringTestProps";
import { resetFoldedTabsForTests } from "../folded-tabs/foldedTabsStore";
import { OLLAMA_FOLD_TAB } from "./ollamaTabFolds";
import { resetNavFocusRegistry } from "../../shared/dpad/navFocusRegistry";
import { stripHeightFor } from "../folded-tabs/foldedTabs";
import { walkFoldedTab, type FoldedLanding } from "../../test-harness/foldedTabWalk";
import type { SteamFocusScroll } from "../../test-harness/tabBodyWalk";
import { resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";
import { markSettingsLoaded, resetSettingsLoadedSignalForTests } from "../settings/settingsLoadedSignal";

const DECK_PANE = 430;
const RULES: SteamFocusScroll[] = ["nearest", "centerIfHidden", "center"];
const CANCEL = "Cancel local Ollama setup";
const TEST = "Test connection to Ollama";
/** The plugin's ring on a plain button reaches 4 px outside it (2 px outline, 2 px offset: scopeBase.ts). */
const RING_REACH = 4;

const names = (landings: FoldedLanding[]) => landings.map((l) => l.name);
const repeats = (landings: FoldedLanding[]) => landings.length - new Set(landings.map((l) => l.stop)).size;
const flush = () => act(async () => new Promise<void>((r) => setTimeout(r, 0)));

function checkLandings(landings: FoldedLanding[], label: string) {
  for (const l of landings) {
    if (Number.isNaN(l.top)) continue;
    expect(l.top, `${label}: ${l.name} top`).toBeGreaterThanOrEqual(24 - 0.5);
    expect(l.bottom, `${label}: ${l.name} bottom`).toBeLessThanOrEqual(24 + DECK_PANE + 0.5);
    if (l.stripTop !== null) expect(l.bottom + RING_REACH + 6, `${label}: ${l.name} clear of the strip`).toBeLessThanOrEqual(l.stripTop);
  }
}

beforeEach(() => {
  resetFoldedTabsForTests();
  resetNavFocusRegistry();
  resetFakeDeckyRpc();
  resetSettingsLoadedSignalForTests();
  setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.40.2", models: ["a:1"] }));
  setRpcHandler("get_local_ollama_setup_status", () => ({ phase: "running", stage: "install", profile: "update_installed", accepted: true }));
  markSettingsLoaded();
});
afterEach(() => cleanup());

describe("the Ollama tab while an install or update runs", () => {
  for (const steam of RULES) {
    it(`Steam's rule "${steam}": Down and Up pass the job card's Cancel once each way, never Update or Browse, no stop twice`, async () => {
      const w = walkFoldedTab({ tabId: OLLAMA_FOLD_TAB, tab: <OllamaTab {...ollamaProps()} />, viewport: DECK_PANE, steam, stripHeight: stripHeightFor, tail: 120 });
      await flush();
      await flush();
      expect(w.container.querySelector(`[aria-label="${CANCEL}"]`)).not.toBeNull();
      const down = [w.enter(), ...w.walk("down")];
      expect(repeats(down), names(down).join(" | ")).toBe(0);
      const order = names(down);
      expect(order.slice(0, 5)).toEqual([expect.stringMatching(/^Where AI runs/), "Run AI on this Deck", "Start the AI with the Deck", CANCEL, TEST]);
      expect(order[5]).toMatch(/^Knowledge base/);
      expect(order.some((n) => /Update AI|Install Ollama|Browse/.test(n))).toBe(false);
      checkLandings(down, `${steam} down`);
      const up = w.walk("up");
      expect(repeats(up), names(up).join(" | ")).toBe(0);
      expect(names(up).filter((n) => n === CANCEL)).toHaveLength(1);
      // The same stops both ways: Up through Where AI runs is Down's order turned round.
      expect(names(up).slice(-5)).toEqual([TEST, CANCEL, "Start the AI with the Deck", "Run AI on this Deck", expect.stringMatching(/^Where AI runs/)]);
      checkLandings(up, `${steam} up`);
      w.unmount();
    });
  }
});
