/**
 * Behavior tests for the "Start the AI with the Deck" startup-entry toggle.
 *
 * Covers what a person sees: the toggle is off by default, and the status line under
 * it reflects what the backend reports (installed/enabled/running/reason) rather than
 * a fixed placeholder. ToggleField is a test-harness stub div, and no test in this
 * repo simulates pressing one (see SettingsTabPresetSingleChip.test.tsx) -- React's
 * change-event plugin only wires real `<input>`/`<select>`/`<textarea>` tags, so a
 * synthetic click/change on the stub div never reaches its `onChange` prop. Whether
 * flipping the toggle actually calls the backend is proven on the Deck, not here.
 */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { OllamaWhereAiRunsSection } from "./OllamaWhereAiRunsSection";
import { resetFakeDeckyRpc, setRpcHandler } from "../test-harness/fakeDeckyRpc";

function renderSection(overrides: { ollamaLocalAutostart?: boolean } = {}) {
  return render(
    <OllamaWhereAiRunsSection
      ollamaIp="192.168.1.100"
      onOllamaIpChange={() => {}}
      onPersistOllamaIp={() => {}}
      ollamaLocalOnDeck={false}
      setOllamaLocalOnDeck={() => {}}
      ollamaLocalAutostart={overrides.ollamaLocalAutostart ?? false}
      setOllamaLocalAutostart={() => {}}
      namedOllamaHosts={[]}
      setNamedOllamaHosts={() => {}}
      onBeforeDeckyModal={() => {}}
      onCompleteDeckyModalClose={(close) => close()}
      onOpenOllamaModelsHub={() => {}}
    />,
  );
}

/** ToggleField is a test-harness stub div; React sets `checked` as a DOM property, not attribute. */
function checkedOf(el: Element | null): unknown {
  return (el as unknown as { checked?: unknown } | null)?.checked;
}

describe("OllamaWhereAiRunsSection startup-entry toggle", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
  });

  it("renders off by default with its plain-language explanation", () => {
    renderSection();

    const toggle = document.querySelector('[label="Start the AI with the Deck"]');
    expect(toggle).toBeTruthy();
    expect(checkedOf(toggle)).toBe(false);
    expect(screen.getByText(/seven tenths of a second sooner/i)).toBeTruthy();
  });

  it("renders checked when the saved setting is on", () => {
    renderSection({ ollamaLocalAutostart: true });

    const toggle = document.querySelector('[label="Start the AI with the Deck"]');
    expect(checkedOf(toggle)).toBe(true);
  });

  it("shows the backend's plain reason when the startup entry isn't set up", async () => {
    setRpcHandler("get_ollama_local_autostart_status", () => ({
      installed: false,
      enabled: false,
      running: false,
      reason: "The local AI isn't installed on this Deck yet.",
    }));

    renderSection();

    await screen.findByText("The local AI isn't installed on this Deck yet.");
  });

  it("shows a plain confirmation once everything is on and answering", async () => {
    setRpcHandler("get_ollama_local_autostart_status", () => ({
      installed: true,
      enabled: true,
      running: true,
      reason: "",
    }));

    renderSection();

    await screen.findByText("Set up and answering questions.");
  });
});
