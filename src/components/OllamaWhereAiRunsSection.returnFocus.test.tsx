/**
 * Title: The ring comes back to "Update AI & models" after its box closes
 *
 * Purpose: Pin plan 74 lane 3, bug 3 (roadmap: 'After the "Update Ollama and models?" box closes
 * with B, the ring goes to the Ollama tab bar'). Closing a Decky box rebuilds the tab behind it, so
 * the ring lands wherever Steam puts it -- the tab bar, on the Deck
 * (docs/test-evidence/plan72-F3-DL.json, ringAfterBoxClosed). The shell already hands the ring back
 * to whichever button opened a box, when that button signed up in modalReturnFocusRegistry.ts and
 * said "it was me" when pressed, as "Browse models..." just below it does. This button now does too.
 *
 * Does not: prove the ring moves on the device (jsdom has no Steam ring); that is the Deck row's job.
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

beforeEach(() => {
  resetFakeDeckyRpc();
  resetSettingsLoadedSignalForTests();
  resetModalReturnFocusRegistry();
  setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.12.0", models: [] }));
  markSettingsLoaded();
});

afterEach(() => {
  resetModalReturnFocusRegistry();
});

describe('"Update AI & models" and its box', () => {
  it("says it opened the box, so the shell knows where the ring goes back to", async () => {
    drawOnDeck();
    const button = (await screen.findByText("Update AI & models")).closest("button") as HTMLButtonElement;
    expect(peekModalReturnFocus()).toBeNull();

    await act(async () => {
      fireEvent.click(button);
    });

    expect(peekModalReturnFocus()).not.toBeNull();
  });

  it("is the button the shell's restore reaches once the box closes", async () => {
    drawOnDeck();
    const button = (await screen.findByText("Update AI & models")).closest("button") as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(button);
    });
    (document.activeElement as HTMLElement | null)?.blur();

    restoreModalReturnFocus();

    expect(document.activeElement).toBe(button);
  });
});
