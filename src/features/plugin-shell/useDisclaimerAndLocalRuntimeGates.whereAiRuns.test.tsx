/**
 * Title: A first start shows the first-time setup popup, once, and nothing else
 *
 * Purpose: Runs the real gate with the real popup drawn (plan 105, lane D3): a fresh start (the back end says first
 * run) shows the popup and no other box; Not now closes it, leaves every setting alone (nothing saved but the flush
 * before it opened), and it never opens again, while the Ollama tab still draws its "Where the AI runs" section for
 * later; the PC screen's test that connects is saved, as ollama_local_on_deck false, before the popup closes.
 *
 * Used for: useDisclaimerAndLocalRuntimeGates.tsx, FirstRunWhereAiRunsModal.tsx.
 *
 * Solves: a popup that shows but is skipped, shows twice, or changes a setting only on screen.
 *
 * Does not: mount the whole plugin (src/index.firstRunFlags.test.tsx does) or check the popup's words.
 */
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const popup = await import("../ai-connection/first-run/firstRunPopupTestKit");
  const kit = await import("./firstRunGateTestKit");
  return { ...popup.deckyUiForFirstRunPopup(), showModal: kit.deckyUiRecordingModals().showModal };
});

import { OllamaWhereAiRunsSection } from "../ai-connection/OllamaWhereAiRunsSection";
import { resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";
import { markSettingsLoaded, resetSettingsLoadedSignalForTests } from "../settings/settingsLoadedSignal";
import { useDisclaimerAndLocalRuntimeGates } from "./useDisclaimerAndLocalRuntimeGates";
import { gateHooks, popups, resetShown, shown } from "./firstRunGateTestKit";

beforeEach(() => {
  resetFakeDeckyRpc();
  resetSettingsLoadedSignalForTests();
  markSettingsLoaded();
  resetShown();
  window.localStorage.clear();
});

describe("a first start", () => {
  it("shows the popup and nothing more; Not now leaves the settings alone and it never comes back", () => {
    const hooks = gateHooks({ firstRun: true });
    const first = renderHook(() => useDisclaimerAndLocalRuntimeGates(true, true, hooks));
    expect(popups()).toHaveLength(1);
    expect(shown).toHaveLength(1);

    render(popups()[0].element);
    fireEvent.click(screen.getByLabelText("Not now"));
    expect(popups()[0].closed).toBe(true);
    expect(hooks.onCompleteDeckyModalClose).toHaveBeenCalledTimes(1);
    // Settings untouched: only the flush before the popup opened, with no patch.
    expect(hooks.saveSettingsNow).toHaveBeenCalledTimes(1);
    expect(hooks.saveSettingsNow).toHaveBeenCalledWith();
    expect(hooks.whereAiRuns.setOllamaLocalOnDeck).not.toHaveBeenCalled();

    // Opened again later (the screen is rebuilt after a popup, or the panel is reopened): not asked twice.
    first.unmount();
    resetShown();
    renderHook(() => useDisclaimerAndLocalRuntimeGates(true, true, gateHooks({ firstRun: false })));
    expect(shown).toHaveLength(0);
  });

  it("the Ollama tab still draws its Where the AI runs section, for later", () => {
    render(
      <OllamaWhereAiRunsSection
        ollamaIp="192.168.1."
        onOllamaIpChange={() => {}}
        onPersistOllamaIp={() => {}}
        ollamaLocalOnDeck
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
    expect(screen.getByRole("switch", { name: "Run AI on this Deck" })).toBeTruthy();
    expect(screen.getByRole("switch", { name: "Start the AI with the Deck" })).toBeTruthy();
  });

  it("a PC test that connects is saved, as ollama_local_on_deck false, before the popup closes", async () => {
    setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.40.6", models: ["qwen3:8b"] }));
    const hooks = gateHooks({ firstRun: true, whereAiRuns: { ...gateHooks().whereAiRuns, ollamaIp: "192.168.1.20" } });
    renderHook(() => useDisclaimerAndLocalRuntimeGates(true, true, hooks));

    render(popups()[0].element);
    fireEvent.click(screen.getByLabelText("Use the AI on my PC"));
    await act(async () => void fireEvent.click(await screen.findByLabelText("Test the connection to the PC")));
    await waitFor(() => expect(hooks.saveSettingsNow).toHaveBeenCalledWith({ ollama_local_on_deck: false }));
    expect(hooks.whereAiRuns.setOllamaLocalOnDeck).toHaveBeenCalledWith(false);
    expect(popups()[0].closed).toBe(false);
  });
});
