/**
 * Title: Ollama tab — Find LAN only with the Developer tab
 * Purpose: 0.6.0 (plan 72) hides Find LAN (it only finds a PC that announces itself on the network,
 *          which Ollama does not do on its own). The button, the "Found on LAN" list and its status
 *          line come back when the Developer tab is on. The PC address box and Test connection stay.
 * Does not: Prove the ring on the device. Find LAN was the last button in the connection row with
 *           no move handlers of its own, and nothing aimed at it, so hiding it leaves Test
 *           connection's explicit Up/Down wiring as it was.
 */
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { OllamaWhereAiRunsSection } from "./OllamaWhereAiRunsSection";
import { resetFakeDeckyRpc } from "../test-harness/fakeDeckyRpc";
import { markSettingsLoaded, resetSettingsLoadedSignalForTests } from "../features/plugin-shell/settingsLoadedSignal";
import {
  publishDeveloperTabShown,
  resetDeveloperTabSignalForTests,
} from "../features/plugin-shell/developerTabSignal";

function renderSection() {
  return render(
    <OllamaWhereAiRunsSection
      ollamaIp="192.168.1.100"
      onOllamaIpChange={() => {}}
      onPersistOllamaIp={() => {}}
      ollamaLocalOnDeck={false}
      setOllamaLocalOnDeck={() => {}}
      ollamaLocalAutostart={false}
      setOllamaLocalAutostart={() => {}}
      namedOllamaHosts={[]}
      setNamedOllamaHosts={() => {}}
      onBeforeDeckyModal={() => {}}
      onCompleteDeckyModalClose={(close) => close()}
      onOpenOllamaModelsHub={() => {}}
    />,
  );
}

describe("OllamaWhereAiRunsSection Find LAN", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
    resetSettingsLoadedSignalForTests();
    markSettingsLoaded();
    resetDeveloperTabSignalForTests();
  });

  it("is not drawn for a player without the Developer tab", () => {
    renderSection();
    expect(screen.queryByText("Find LAN")).toBeNull();
    // The rest of the connection row stays.
    expect(screen.getByText("Test connection")).toBeTruthy();
  });

  it("is drawn when the Developer tab is on, and follows it being turned on later", () => {
    renderSection();
    expect(screen.queryByText("Find LAN")).toBeNull();
    act(() => publishDeveloperTabShown(true));
    expect(screen.getByText("Find LAN")).toBeTruthy();
    act(() => publishDeveloperTabShown(false));
    expect(screen.queryByText("Find LAN")).toBeNull();
  });
});
