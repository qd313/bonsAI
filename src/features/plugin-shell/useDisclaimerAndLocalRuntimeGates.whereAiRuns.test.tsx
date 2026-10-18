/**
 * Title: A first start shows the Beta Notice, then the where-the-AI-runs popup, once
 *
 * Purpose: Runs the real gate with the real popup drawn: a fresh start (the back end says first run) shows
 * the Beta Notice and nothing else; accepting it opens the popup; Not now closes the popup, leaves every
 * setting alone (nothing saved but the flush before it opened), and the popup never opens again, while the
 * Ollama tab still draws the same section for later; a switch turned off inside the popup is saved with
 * ollama_local_on_deck false before the popup closes.
 *
 * Used for: useDisclaimerAndLocalRuntimeGates.tsx, FirstRunWhereAiRunsModal.tsx (plan 96, N1).
 *
 * Solves: a popup that shows but is skipped, shows twice, or changes a setting only on screen.
 *
 * Does not: mount the whole plugin (src/index.firstRunFlags.test.tsx does) or check the popup's words.
 */
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const popup = await import("../ai-connection/first-run/firstRunPopupTestKit");
  const kit = await import("./firstRunGateTestKit");
  return { ...popup.deckyUiForFirstRunPopup(), showModal: kit.deckyUiRecordingModals().showModal };
});

import { OllamaWhereAiRunsSection } from "../ai-connection/OllamaWhereAiRunsSection";
import { resetFakeDeckyRpc } from "../../test-harness/fakeDeckyRpc";
import { markSettingsLoaded, resetSettingsLoadedSignalForTests } from "../settings/settingsLoadedSignal";
import { useDisclaimerAndLocalRuntimeGates } from "./useDisclaimerAndLocalRuntimeGates";
import { betaNotices, gateHooks, popups, resetShown, runtimeNotices } from "./firstRunGateTestKit";

beforeEach(() => {
  resetFakeDeckyRpc();
  resetSettingsLoadedSignalForTests();
  markSettingsLoaded();
  resetShown();
  window.localStorage.clear();
});

describe("a first start", () => {
  it("shows the Beta Notice, then the popup, then nothing more; Not now leaves the settings alone and it never comes back", () => {
    const hooks = gateHooks({ firstRun: true });
    const first = renderHook(() => useDisclaimerAndLocalRuntimeGates(true, true, hooks));

    expect(betaNotices()).toHaveLength(1);
    expect(popups()).toHaveLength(0);

    act(() => betaNotices()[0].onOK());
    expect(popups()).toHaveLength(1);
    expect(runtimeNotices()).toHaveLength(0);

    render(popups()[0].element);
    fireEvent.click(screen.getByText("Not now"));
    expect(popups()[0].closed).toBe(true);
    expect(hooks.onCompleteDeckyModalClose).toHaveBeenCalledTimes(2); // the Beta Notice, then the popup
    // Settings untouched: only the flush before the popup opened, with no patch.
    expect(hooks.saveSettingsNow).toHaveBeenCalledTimes(1);
    expect(hooks.saveSettingsNow).toHaveBeenCalledWith();
    expect(hooks.whereAiRuns.setOllamaLocalOnDeck).not.toHaveBeenCalled();

    // Opened again later (the screen is rebuilt after a popup, or the panel is reopened): not asked twice.
    first.unmount();
    resetShown();
    renderHook(() => useDisclaimerAndLocalRuntimeGates(true, true, gateHooks({ firstRun: false })));
    expect(popups()).toHaveLength(0);
    expect(betaNotices()).toHaveLength(0);
  });

  it("the Ollama tab still draws the same section, for later", () => {
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

  it("a switch turned off in the popup is saved, as ollama_local_on_deck false, before the popup closes", () => {
    const hooks = gateHooks({ firstRun: true });
    renderHook(() => useDisclaimerAndLocalRuntimeGates(true, true, hooks));
    act(() => betaNotices()[0].onOK());

    render(popups()[0].element);
    fireEvent.click(screen.getByRole("switch", { name: "Run AI on this Deck" }));

    expect(hooks.saveSettingsNow).toHaveBeenCalledWith({ ollama_local_on_deck: false });
    expect(hooks.whereAiRuns.setOllamaLocalOnDeck).toHaveBeenCalledWith(false);
    expect(popups()[0].closed).toBe(false);
  });
});
