/**
 * Title: A first "Install Ollama" on a Deck with no models offers the starter models
 *
 * Purpose: Pin plan 79 (D122 call 5). With the Ollama tab's "Install options..." button gone, the
 * box flow behind "Install Ollama" is how a new player gets the starter models in one run. The real
 * section is drawn, "Install Ollama" is pressed, and the boxes are read as a person would see them:
 * after the Install Ollama box, a second box names the starter model and its size and opens with the
 * ring on "Not now". Choosing the models runs one setup (profile tier1_essentials: the engine, then
 * the models); declining runs the engine-only setup (update_installed) as before. With models already
 * installed no starter offer appears at all.
 *
 * Does not: prove the ring on the device (jsdom has no Steam ring); that is the Deck row's job.
 */
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({ modals: [] as Array<{ props: Record<string, unknown> }> }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  return {
    ...stubs,
    showModal: (content: unknown) => {
      hoisted.modals.push(content as { props: Record<string, unknown> });
      return { Close: () => {} };
    },
  };
});

import { OllamaWhereAiRunsSection } from "./OllamaWhereAiRunsSection";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../test-harness/fakeDeckyRpc";
import { markSettingsLoaded, resetSettingsLoadedSignalForTests } from "../features/plugin-shell/settingsLoadedSignal";
import { resetModalReturnFocusRegistry } from "../features/plugin-shell/modalReturnFocusRegistry";
import { setDownloadPermissionBridge } from "../features/downloads/downloadNotice";

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

const settle = () => act(() => new Promise<void>((r) => setTimeout(r, 0)));
const setupProfiles = () =>
  getRpcCallLog()
    .filter((c) => c.method === "start_local_ollama_setup")
    .map((c) => (c.args[0] as { profile: string }).profile);

function textOf(modal: { props: Record<string, unknown> }): string {
  const host = document.createElement("div");
  document.body.appendChild(host);
  return render(modal.props.strDescription as React.ReactElement, { container: host }).container.textContent ?? "";
}

async function pressInstall(label: string) {
  const btn = (await screen.findByText(label)).closest("button") as HTMLButtonElement;
  await act(async () => void fireEvent.click(btn));
  await settle();
}

beforeEach(() => {
  resetFakeDeckyRpc();
  resetSettingsLoadedSignalForTests();
  resetModalReturnFocusRegistry();
  setDownloadPermissionBridge(null);
  hoisted.modals = [];
  setRpcHandler("start_local_ollama_setup", () => ({ accepted: true }));
  markSettingsLoaded();
});

describe("Install Ollama with no models installed", () => {
  it("asks about the starter models after the Install Ollama box, opening on Not now, naming the size", async () => {
    setRpcHandler("test_ollama_connection", () => ({ reachable: false, error: "unreachable" }));
    drawOnDeck();
    await pressInstall("Install Ollama");
    expect(hoisted.modals).toHaveLength(1);
    (hoisted.modals[0].props.onMiddleButton as () => void)();
    await settle();

    expect(hoisted.modals).toHaveLength(2);
    const box = hoisted.modals[1];
    expect(box.props.strTitle).toBe("Also install the starter models?");
    expect(box.props.strOKButtonText).toBe("Not now");
    expect(box.props.strMiddleButtonText).toBe("Install Ollama and the starter models");
    const text = textOf(box);
    expect(text).toContain("qwen2.5vl:3b");
    expect(text).toContain("about 3–4 GiB");
    expect(text).toContain("installs Ollama only");
    expect(setupProfiles()).toEqual([]);
  });

  it("choosing the models runs one setup that installs the engine and then the models", async () => {
    setRpcHandler("test_ollama_connection", () => ({ reachable: false, error: "unreachable" }));
    drawOnDeck();
    await pressInstall("Install Ollama");
    (hoisted.modals[0].props.onMiddleButton as () => void)();
    await settle();
    (hoisted.modals[1].props.onMiddleButton as () => void)();
    await settle();
    expect(setupProfiles()).toEqual(["tier1_essentials"]);
  });

  it("declining the models installs the engine only, as before", async () => {
    setRpcHandler("test_ollama_connection", () => ({ reachable: false, error: "unreachable" }));
    drawOnDeck();
    await pressInstall("Install Ollama");
    (hoisted.modals[0].props.onMiddleButton as () => void)();
    await settle();
    (hoisted.modals[1].props.onOK as () => void)();
    await settle();
    expect(setupProfiles()).toEqual(["update_installed"]);
  });

  it("backing out of the Install Ollama box itself starts nothing and asks nothing more", async () => {
    setRpcHandler("test_ollama_connection", () => ({ reachable: false, error: "unreachable" }));
    drawOnDeck();
    await pressInstall("Install Ollama");
    (hoisted.modals[0].props.onOK as () => void)();
    await settle();
    expect(hoisted.modals).toHaveLength(1);
    expect(setupProfiles()).toEqual([]);
  });

  it("an engine that is up with no models offers them too", async () => {
    setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.12.0", models: [] }));
    drawOnDeck();
    await pressInstall("Update AI & models");
    (hoisted.modals[0].props.onMiddleButton as () => void)();
    await settle();
    expect(hoisted.modals).toHaveLength(2);
  });

  it("with models already installed there is no starter offer, only the update box", async () => {
    setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.12.0", models: ["qwen2.5vl:3b"] }));
    drawOnDeck();
    await screen.findByText("Installed: 1");
    await pressInstall("Update AI & models");
    (hoisted.modals[0].props.onMiddleButton as () => void)();
    await settle();
    expect(hoisted.modals).toHaveLength(1);
    expect(setupProfiles()).toEqual(["update_installed"]);
  });
});
