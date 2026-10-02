/**
 * Title: The install and update buttons leave no stale "return the ring here" note when no box opens
 *
 * Purpose: Pin the last part of the roadmap bug "A press that never opens its box (parental lock on)
 * can leave a stale note behind". "Update AI & models" asks the download notice first. With the kids lock on (or downloads on and the site seen) the notice answers
 * at once and no box opens; the note the button armed must be taken back, or a later unrelated box
 * close would be pulled to these buttons. When a box does open and closes, the ring returns.
 *
 * Does not: prove the ring moves on the device (jsdom has no Steam ring); that is the Deck row's job.
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({ delayMs: 0 }));
vi.mock("../features/downloads/downloadNotice", async (orig) => ({
  ...(await orig<typeof import("../features/downloads/downloadNotice")>()),
  confirmDownload: () => new Promise<boolean>((resolve) => setTimeout(() => resolve(false), hoisted.delayMs)),
}));

import { OllamaWhereAiRunsSection } from "./OllamaWhereAiRunsSection";
import { resetFakeDeckyRpc, setRpcHandler } from "../test-harness/fakeDeckyRpc";
import { markSettingsLoaded, resetSettingsLoadedSignalForTests } from "../features/plugin-shell/settingsLoadedSignal";
import {
  peekModalReturnFocus,
  resetModalReturnFocusRegistry,
  restoreModalReturnFocus,
} from "../features/plugin-shell/modalReturnFocusRegistry";

function drawOnDeck() {
  return render(
    <OllamaWhereAiRunsSection
      ollamaIp="127.0.0.1"
      onOllamaIpChange={() => {}}
      onPersistOllamaIp={() => {}}
      ollamaLocalOnDeck={true}
      setOllamaLocalOnDeck={() => {}}
      ollamaLocalAutostart={false}
      setOllamaLocalAutostart={() => {}}
      namedOllamaHosts={[]}
      setNamedOllamaHosts={() => {}}
      onBeforeDeckyModal={() => {}}
      onCompleteDeckyModalClose={(close) => close()}
      onOpenOllamaModelsHub={() => {}}
    />
  );
}

const later = (ms: number) => act(async () => void (await new Promise((r) => setTimeout(r, ms))));

async function press(label: string) {
  const btn = (await screen.findByText(label)).closest("button") as HTMLButtonElement;
  await act(async () => void fireEvent.click(btn));
  return btn;
}

const CASES = ["Update AI & models"];

beforeEach(() => {
  resetFakeDeckyRpc();
  resetSettingsLoadedSignalForTests();
  resetModalReturnFocusRegistry();
  setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.12.0", models: [] }));
  hoisted.delayMs = 0;
  markSettingsLoaded();
});
afterEach(() => resetModalReturnFocusRegistry());

describe("no box appears (answer at once)", () => {
  it.each(CASES)("%s leaves nothing armed", async (label) => {
    drawOnDeck();
    await press(label);
    await later(80);
    expect(peekModalReturnFocus()).toBeNull();
  });
});

describe("a box opens and closes", () => {
  it.each(CASES)("%s: the ring returns to the button that stays", async (label) => {
    hoisted.delayMs = 120;
    drawOnDeck();
    const target = await press(label);
    expect(peekModalReturnFocus()).not.toBeNull();
    await later(200);
    (document.activeElement as HTMLElement | null)?.blur();
    restoreModalReturnFocus();
    expect(document.activeElement).toBe(target);
  });
});
