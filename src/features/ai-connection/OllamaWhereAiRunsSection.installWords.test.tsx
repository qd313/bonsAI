/**
 * Title: Install Ollama with downloads off, and the words around the install
 *
 * Purpose: Pin plan 96 rows F10 and F13 on the real Ollama tab. F10: with Internet downloads off,
 * "Install Ollama on this Deck" opens "Turn on internet downloads?"; Cancel starts nothing and leaves
 * the status line as it was (no "Failed (check the Internet downloads permission?)"), Turn on starts
 * the install. F13: when the install finishes, the "isn't installed on this Deck yet" line under the
 * autostart switch goes (the tab re-reads it), the Install box names ollama.com, and its Cancel
 * sentence is true in both states (downloads on: engine only; downloads off: nothing installed).
 *
 * Used for: the vitest run only.
 *
 * Solves: a cancelled box that still tried the install and reported a failure nobody caused; a stale
 * "not installed" line; a box that did not say where Ollama itself comes from.
 *
 * Does not: prove the ring on the device (jsdom has no Steam ring); the Deck rows do.
 */
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({ modals: [] as Array<{ props: Record<string, unknown> }> }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  return {
    ...stubs,
    showModal: (content: unknown) => {
      hoisted.modals.push(content as { props: Record<string, unknown> });
      return { Close: () => {} };
    },
  };
});

import { OllamaWhereAiRunsSection } from "./OllamaWhereAiRunsSection";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";
import { markSettingsLoaded, resetSettingsLoadedSignalForTests } from "../settings/settingsLoadedSignal";
import { resetModalReturnFocusRegistry } from "../../shared/dpad/modalReturnFocusRegistry";
import { setDownloadPermissionBridge } from "../downloads/downloadNotice";
import { DEFAULT_CAPABILITIES } from "../settings/bonsaiSettingsSchema";

const FAILED_LINE = "Failed (check the Internet downloads permission?)";
const NOT_INSTALLED = "The local AI isn't installed on this Deck yet.";

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

function bridge(enabled: boolean) {
  setDownloadPermissionBridge({
    enabled,
    kidsLockActive: false,
    capabilities: { ...DEFAULT_CAPABILITIES, internet_downloads: enabled },
    setCapabilities: () => {},
    onBeforeDeckyModal: () => {},
    onCompleteDeckyModalClose: (close) => close(),
  });
}

const settle = () => act(() => new Promise<void>((r) => setTimeout(r, 0)));
const later = (ms: number) => act(async () => void (await new Promise((r) => setTimeout(r, ms))));
const setupProfiles = () =>
  getRpcCallLog()
    .filter((c) => c.method === "start_local_ollama_setup")
    .map((c) => (c.args[0] as { profile: string }).profile);

function boxText(modal: { props: Record<string, unknown> }): string {
  const host = document.createElement("div");
  document.body.appendChild(host);
  return render(modal.props.body as React.ReactElement, { container: host }).container.textContent ?? "";
}

async function pressInstall() {
  const btn = (await screen.findByText("Install Ollama")).closest("button") as HTMLButtonElement;
  await act(async () => void fireEvent.click(btn));
  await settle();
}

beforeEach(() => {
  resetFakeDeckyRpc();
  resetSettingsLoadedSignalForTests();
  resetModalReturnFocusRegistry();
  setDownloadPermissionBridge(null);
  hoisted.modals = [];
  setRpcHandler("test_ollama_connection", () => ({ reachable: false, error: "unreachable" }));
  setRpcHandler("get_local_ollama_setup_status", () => ({ phase: "idle", stage: "", profile: "", done: true, log_tail: [] }));
  setRpcHandler("start_local_ollama_setup", () => ({ accepted: true }));
  markSettingsLoaded();
});

describe("Install Ollama with Internet downloads off (F10)", () => {
  it("Cancel on 'Turn on internet downloads?' starts nothing and shows no failed line", async () => {
    bridge(false);
    drawOnDeck();
    await pressInstall();
    expect(hoisted.modals).toHaveLength(1);
    expect(hoisted.modals[0].props.title).toBe("Turn on internet downloads?");
    (hoisted.modals[0].props.onCancel as () => void)();
    await later(50);
    expect(setupProfiles()).toEqual([]);
    expect(screen.queryByText(FAILED_LINE)).toBeNull();
  });

  it("Turn on and download runs the install", async () => {
    bridge(false);
    drawOnDeck();
    await pressInstall();
    (hoisted.modals[0].props.onAction as () => void)();
    await later(50);
    expect(setupProfiles()).toEqual(["tier1_essentials"]);
  });
});

describe("The words around the install (F13)", () => {
  it("the Install box names ollama.com first, then the models, then the speech models", async () => {
    bridge(true);
    drawOnDeck();
    await pressInstall();
    const text = boxText(hoisted.modals[0]);
    const ollama = text.indexOf("https://ollama.com");
    const registry = text.indexOf("https://registry.ollama.ai");
    const speech = text.indexOf("https://huggingface.co");
    expect(ollama).toBeGreaterThanOrEqual(0);
    expect(ollama).toBeLessThan(registry);
    expect(registry).toBeLessThan(speech);
  });

  it("with downloads on, Cancel is said to install Ollama only", async () => {
    bridge(true);
    drawOnDeck();
    await pressInstall();
    expect(boxText(hoisted.modals[0])).toContain("Cancel or B installs Ollama only, with no models");
  });

  it("with downloads off, the box says Cancel installs nothing and never 'Ollama only'", async () => {
    bridge(false);
    drawOnDeck();
    await pressInstall();
    const text = boxText(hoisted.modals[0]);
    expect(text).toContain("Cancel or B installs nothing");
    expect(text).not.toContain("installs Ollama only");
  });

  it("the 'isn't installed' line goes once the install finishes", async () => {
    bridge(true);
    let installed = false;
    let setupPhase = "idle";
    setRpcHandler("get_ollama_local_autostart_status", () =>
      installed
        ? { installed: false, enabled: false, running: false, reason: "Off. Turn on “Start the AI with the Deck” to add it." }
        : { installed: false, enabled: false, running: false, reason: NOT_INSTALLED }
    );
    setRpcHandler("get_local_ollama_setup_status", () => ({ phase: setupPhase, stage: "", profile: "tier1_essentials", done: true, log_tail: [] }));
    drawOnDeck();
    await screen.findByText(NOT_INSTALLED);
    await pressInstall();
    (hoisted.modals[0].props.onAction as () => void)();
    await later(50);
    installed = true;
    setupPhase = "done";
    await later(1700);
    expect(screen.queryByText(NOT_INSTALLED)).toBeNull();
  });
});
