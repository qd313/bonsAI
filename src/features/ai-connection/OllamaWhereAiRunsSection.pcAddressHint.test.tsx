/**
 * Title: The PC address box says a bare address is enough
 *
 * Purpose: With the AI on a PC, the box under "PC address" takes only the address; bonsAI adds
 * Ollama's usual port. The screen shows one line under the box, with a bare example in it, saying so (plan 96 F26).
 *
 * Used for: plan 96 row F26.
 *
 * Solves: the box gave no hint, so people typed the port too.
 *
 * Does not: test the back end's port default; tests/test_backend_helpers.py does.
 */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { OllamaWhereAiRunsSection } from "./OllamaWhereAiRunsSection";
import { resetFakeDeckyRpc } from "../../test-harness/fakeDeckyRpc";
import { markSettingsLoaded, resetSettingsLoadedSignalForTests } from "../settings/settingsLoadedSignal";

const HINT = "Just the PC's address, for example 192.168.1.20. bonsAI adds Ollama's usual port (11434) when you leave it out.";

describe("PC address hint", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
    resetSettingsLoadedSignalForTests();
    markSettingsLoaded();
  });

  it("is drawn under the box with a bare example", () => {
    render(
      <OllamaWhereAiRunsSection
        ollamaIp=""
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
    expect(screen.getByText(HINT)).toBeTruthy();
  });
});
