/**
 * Title: The folded Ollama tab walked with the D-pad while the knowledge library downloads
 *
 * Purpose: Pin plan 106 lane F3 (row P105-JOB-CARD-ELSEWHERE-01) at the walk's level: the real Ollama tab with every
 * section open and the library's download going, walked Down from the tab bar to the end and back Up, the D-pad
 * pressed the way Steam calls it and Steam's own scroll-into-view modelled three ways (foldedTabWalk.tsx). The job
 * card's Cancel stands in for Download / Update and Remove: it is visited once each way, between "Use local knowledge
 * base" and the next section's line, those two buttons are not stops at all, no stop is visited twice, and every
 * landing is on screen and clear of the strip. Left from Cancel is Steam's own and goes out on the first press, as
 * from the plain buttons the card stands in for.
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

import { OllamaTab } from "./OllamaTab";
import { ollamaProps } from "../../test-harness/ringTestProps";
import { resetFoldedTabsForTests, setAllSections } from "../folded-tabs/foldedTabsStore";
import { OLLAMA_FOLD_TAB, OLLAMA_SECTIONS } from "./ollamaTabFolds";
import { resetNavFocusRegistry } from "../../shared/dpad/navFocusRegistry";
import { stripHeightFor } from "../folded-tabs/foldedTabs";
import { walkFoldedTab, type FoldedLanding } from "../../test-harness/foldedTabWalk";
import type { SteamFocusScroll } from "../../test-harness/tabBodyWalk";
import { ragCorpusStatusFixture, resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";
import { markSettingsLoaded, resetSettingsLoadedSignalForTests } from "../settings/settingsLoadedSignal";
import { leftsDownWalk, steamRingWorld } from "../../test-harness/steamLeftPress";

const DECK_PANE = 430;
const RULES: SteamFocusScroll[] = ["nearest", "centerIfHidden", "center"];
const CANCEL = "Cancel the library download";
const MIB = 1024 * 1024;
const RING_REACH = 4;
let backend: "running" | "done" = "running";

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
  backend = "running";
  setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.40.2", models: ["a:1"] }));
  setRpcHandler("get_rag_corpus_status", () =>
    backend === "running"
      ? ragCorpusStatusFixture({ installed: true, corpus_version: "2026.09.26", phase: "running", done: false, stage: "download", bytes_downloaded: 62 * MIB, bytes_total: 210 * MIB })
      : ragCorpusStatusFixture({ installed: true, corpus_version: "2026.09.30", phase: "done", done: true }),
  );
  setAllSections(OLLAMA_FOLD_TAB, OLLAMA_SECTIONS.map((s) => s.id), true);
  markSettingsLoaded();
});
afterEach(() => cleanup());

describe("the Ollama tab while the knowledge library downloads", () => {
  for (const steam of RULES) {
    it(`Steam's rule "${steam}": Down and Up pass the library card's Cancel once each way, never Download, Update or Remove, no stop twice`, async () => {
      const w = walkFoldedTab({ tabId: OLLAMA_FOLD_TAB, tab: <OllamaTab {...ollamaProps()} />, viewport: DECK_PANE, steam, stripHeight: stripHeightFor, tail: 120 });
      await flush();
      await flush();
      expect(w.container.querySelector(`[aria-label="${CANCEL}"]`)).not.toBeNull();
      const down = [w.enter(), ...w.walk("down")];
      expect(repeats(down), names(down).join(" | ")).toBe(0);
      const order = names(down);
      expect(order.filter((n) => n === CANCEL), order.join(" | ")).toHaveLength(1);
      expect(order.some((n) => /Update knowledge base|Download knowledge base|^Remove/.test(n))).toBe(false);
      // Between "Use local knowledge base" and the next section's line.
      const at = order.indexOf(CANCEL);
      expect(order[at - 1], order.join(" | ")).toBe("Use local knowledge base");
      expect(order[at + 1], order.join(" | ")).toMatch(/^Reply style/);
      checkLandings(down, `${steam} down`);
      const up = w.walk("up");
      expect(repeats(up), names(up).join(" | ")).toBe(0);
      expect(names(up).filter((n) => n === CANCEL)).toHaveLength(1);
      const upAt = names(up).indexOf(CANCEL);
      expect(names(up)[upAt + 1], names(up).join(" | ")).toBe("Use local knowledge base");
      checkLandings(up, `${steam} up`);
      w.unmount();
    });
  }

  it("Left at every stop down to Cancel moves the ring or reaches Steam's menu; from Cancel it is out at once", async () => {
    const w = walkFoldedTab({ tabId: OLLAMA_FOLD_TAB, tab: <OllamaTab {...ollamaProps()} />, viewport: DECK_PANE, steam: "nearest", stripHeight: stripHeightFor, tail: 120 });
    await flush();
    await flush();
    const all = leftsDownWalk(w, steamRingWorld, 24);
    // The stops past the library (sliders and rows that hold Left on purpose) are not this card's business.
    const outcomes = all.slice(0, all.findIndex(([n]) => n === CANCEL) + 1);
    const said = all.map(([n, o]) => `${n}: ${o.join(" ")}`).join("\n");
    expect(outcomes.length, said).toBeGreaterThan(0);
    for (const [name, o] of outcomes) expect(["moved", "out"], `${name} never let the ring go:\n${said}`).toContain(o[o.length - 1]);
    expect(all.find(([n]) => n === CANCEL)?.[1].join(" "), said).toBe("out");
    w.unmount();
  });
});
