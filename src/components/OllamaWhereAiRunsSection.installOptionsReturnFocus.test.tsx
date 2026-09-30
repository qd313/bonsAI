/**
 * Title: The ring comes back to "Install options..." after a Tier 1 or Tier 2 install box closes
 *
 * Purpose: Pin plan 76 lane 2, bug 4 (roadmap: "Two more boxes may start on their action button,
 * found in the code": the Tier 1 and Tier 2 install buttons on the Ollama tab do not get the ring
 * back after their box closes). Closing a Decky box rebuilds the tab behind it, so the ring lands
 * wherever Steam puts it (the tab bar, for "Update AI & models": plan72-F3-DL.json). The two install
 * buttons live in a menu that closes the moment one is pressed, so they are gone when the box closes;
 * the button that stays, and that opened the menu, is "Install options...". Both remember it as the
 * place to return to, through the shell's return-focus list ("Update AI & models" already does this
 * for itself).
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

async function pressInstallOption(label: string) {
  const options = (await screen.findByText("Install options…")).closest("button") as HTMLButtonElement;
  await act(async () => {
    fireEvent.click(options);
  });
  const choice = (await screen.findByText(label)).closest("button") as HTMLButtonElement;
  await act(async () => {
    fireEvent.click(choice);
  });
  return options;
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

describe("Install Tier 1 essentials / Install Gemma 4 (all-in-one model) and their box", () => {
  it.each(["Install Tier 1 essentials", "Install Gemma 4 (all-in-one model)"])(
    "%s says it opened the box, and the restore reaches Install options",
    async (label) => {
      drawOnDeck();
      expect(peekModalReturnFocus()).toBeNull();

      const options = await pressInstallOption(label);
      expect(peekModalReturnFocus()).not.toBeNull();

      (document.activeElement as HTMLElement | null)?.blur();
      restoreModalReturnFocus();

      expect(document.activeElement).toBe(options);
    }
  );
});
