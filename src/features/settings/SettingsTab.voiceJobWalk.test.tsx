/**
 * Title: The folded Settings tab walked with the D-pad while the voice engine installs
 *
 * Purpose: Pin plan 106 lane F3 (row P105-JOB-CARD-ELSEWHERE-01) at the walk's level: the real Settings tab with every
 * section open and a voice install going, walked Down from the tab bar to the end and back Up, the D-pad pressed the
 * way Steam calls it and Steam's own scroll-into-view modelled three ways (foldedTabWalk.tsx). The job card's Cancel
 * stands in for the "Install voice engine" button: it is visited once each way, that button is not a stop at all, no
 * stop is visited twice, and every landing is on screen and clear of the strip.
 *
 * Does not: know the Deck's real heights (the harness's flow model) or Steam's real timing; the Deck row reads them.
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

import { SettingsTab, type SettingsTabProps } from "./SettingsTab";
import { settingsProps } from "../../test-harness/ringTestProps";
import { openAllSettingsSections } from "../../test-harness/settingsFoldOpen";
import { SETTINGS_FOLD_TAB } from "./settingsTabFolds";
import { resetNavFocusRegistry } from "../../shared/dpad/navFocusRegistry";
import { stripHeightFor } from "../folded-tabs/foldedTabs";
import { walkFoldedTab, type FoldedLanding } from "../../test-harness/foldedTabWalk";
import type { SteamFocusScroll } from "../../test-harness/tabBodyWalk";
import { resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";

const DECK_PANE = 430;
const RULES: SteamFocusScroll[] = ["nearest", "centerIfHidden", "center"];
const CANCEL = "Cancel the voice install";
const RING_REACH = 4;

const props = (): SettingsTabProps => ({ ...settingsProps(), showDeveloperTab: true, aiCharacterEnabled: true, microphoneAccessEnabled: true });
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
  resetNavFocusRegistry();
  resetFakeDeckyRpc();
  const running = { phase: "running", stage: "binary_build_start", done: false, model_id: "tiny.en" };
  setRpcHandler("get_voice_engine_status", () => ({ model_id: "tiny.en", binary_ready: false, model_ready: false, ready: false, install: running }));
  setRpcHandler("get_voice_install_status", () => running);
});
afterEach(() => cleanup());

describe("the Settings tab while the voice engine installs", () => {
  for (const steam of RULES) {
    it(`Steam's rule "${steam}": Down and Up pass the voice card's Cancel once each way, never the install button, no stop twice`, async () => {
      openAllSettingsSections();
      const w = walkFoldedTab({ tabId: SETTINGS_FOLD_TAB, tab: <SettingsTab {...props()} />, viewport: DECK_PANE, steam, stripHeight: stripHeightFor, tail: 120 });
      await flush();
      await flush();
      expect(w.container.querySelector(`[aria-label="${CANCEL}"]`)).not.toBeNull();
      const down = [w.enter(), ...w.walk("down")];
      expect(repeats(down), names(down).join(" | ")).toBe(0);
      expect(names(down).filter((n) => n === CANCEL), names(down).join(" | ")).toHaveLength(1);
      expect(names(down).some((n) => /Install voice engine|Reinstall voice engine/.test(n))).toBe(false);
      checkLandings(down, `${steam} down`);
      const up = w.walk("up");
      expect(repeats(up), names(up).join(" | ")).toBe(0);
      expect(names(up).filter((n) => n === CANCEL)).toHaveLength(1);
      checkLandings(up, `${steam} up`);
      // The same stops both ways around the card.
      const at = names(down).indexOf(CANCEL);
      const upAt = names(up).indexOf(CANCEL);
      expect(names(up)[upAt + 1], names(down).join(" | ")).toBe(names(down)[at - 1]);
      expect(names(up)[upAt - 1], names(down).join(" | ")).toBe(names(down)[at + 1]);
      w.unmount();
    });
  }
});
