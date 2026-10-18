/**
 * Title: Ollama tab — Find LAN beside the PC address, for everyone
 * Purpose: Plan 96 (the maintainer, 2026-10-18): Find LAN, the "Found on LAN" list and its status line show
 *          for every player whenever the AI runs on a PC (the "Run AI on this Deck" switch is off), beside
 *          the PC address box and Test connection. With the AI on this Deck they are hidden, since there is
 *          nothing to find. The Developer tab no longer matters. Pressing it asks first, then searches;
 *          a found PC is listed and "Use" fills the address; an empty search says so.
 * Does not: Prove the ring on the device. Find LAN is the last button in the connection row with no move
 *           handlers of its own, and nothing aims at it; the Deck row P96-FINDLAN looks at that.
 */
import type React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({ boxes: [] as unknown[] }));
vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  return {
    ...stubs,
    showModal: (el: unknown) => {
      hoisted.boxes.push(el);
      return { Close: () => {} };
    },
  };
});

import { OllamaWhereAiRunsSection } from "./OllamaWhereAiRunsSection";
import { resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";
import { markSettingsLoaded, resetSettingsLoadedSignalForTests } from "../settings/settingsLoadedSignal";
import { publishDeveloperTabShown, resetDeveloperTabSignalForTests } from "../settings/developerTabSignal";
import { tabMdnsDiscovery } from "./mdnsDiscoveryStore";

function renderSection(onDeck = false, onOllamaIpChange: (v: string) => void = () => {}) {
  return render(
    <OllamaWhereAiRunsSection
      ollamaIp="192.168.1.100"
      onOllamaIpChange={onOllamaIpChange}
      onPersistOllamaIp={() => {}}
      ollamaLocalOnDeck={onDeck}
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

async function pressFindLanAndSearch() {
  fireEvent.click(screen.getByLabelText("Find Ollama on LAN via mDNS"));
  await waitFor(() => expect(hoisted.boxes).toHaveLength(1));
  // The ask-first box is the shared two-button box: Search on the left, Cancel on the right. Press Search.
  const { container } = render(hoisted.boxes[0] as React.ReactElement);
  const buttons = Array.from(container.querySelectorAll("button"));
  expect(buttons.map((b) => b.textContent)).toEqual(["Search", "Cancel"]);
  fireEvent.click(buttons[0]);
}

describe("OllamaWhereAiRunsSection Find LAN", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
    resetSettingsLoadedSignalForTests();
    markSettingsLoaded();
    resetDeveloperTabSignalForTests();
    tabMdnsDiscovery.reset();
    hoisted.boxes.length = 0;
  });

  it("is drawn beside Test connection with the Developer tab off, when the AI runs on a PC", () => {
    renderSection(false);
    const find = screen.getByText("Find LAN");
    const test = screen.getByText("Test connection");
    expect(test.compareDocumentPosition(find) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("looks the same with the Developer tab on", () => {
    renderSection(false);
    expect(screen.getByText("Find LAN")).toBeTruthy();
    act(() => publishDeveloperTabShown(true));
    expect(screen.getByText("Find LAN")).toBeTruthy();
  });

  it("is not drawn while the AI runs on this Deck, Developer tab on or off", () => {
    renderSection(true);
    expect(screen.queryByText("Find LAN")).toBeNull();
    act(() => publishDeveloperTabShown(true));
    expect(screen.queryByText("Find LAN")).toBeNull();
    // The rest of the connection row stays.
    expect(screen.getByText("Test connection")).toBeTruthy();
  });

  it("asks first, searches, lists the PC it found, and Use fills the address", async () => {
    setRpcHandler("discover_mdns_ollama_hosts", () => ({
      ok: true,
      hosts: [{ label: "gaming-pc", host: "192.168.1.77:11434", port: 11434, verified: true }],
    }));
    const onIp = vi.fn();
    renderSection(false, onIp);
    await pressFindLanAndSearch();
    await waitFor(() => expect(screen.getByText("Found on LAN (mDNS)")).toBeTruthy());
    fireEvent.click(screen.getByText(/Use gaming-pc/));
    expect(onIp).toHaveBeenCalledWith("192.168.1.77:11434");
  });

  it("says so under the button when nothing is found", async () => {
    setRpcHandler("discover_mdns_ollama_hosts", () => ({ ok: true, hosts: [], hint: "No Ollama services found here." }));
    renderSection(false);
    await pressFindLanAndSearch();
    await waitFor(() => expect(screen.getByText("No Ollama services found here.")).toBeTruthy());
  });

  /*
   * The Deck 2026-10-18 (plan96-P96-FINDLAN.json): A on Search closed the box, Steam rebuilt the Ollama tab,
   * and the new copy showed neither "…" nor the result. Each test below throws the first copy away and
   * draws a second one, the way the rebuild does, then reads what is on screen.
   */
  it("shows the search running on the rebuilt tab, then what it found", async () => {
    let finish: (v: unknown) => void = () => {};
    setRpcHandler("discover_mdns_ollama_hosts", () => new Promise((resolve) => (finish = resolve)));
    const first = renderSection(false);
    await pressFindLanAndSearch();
    await waitFor(() => expect(screen.getByLabelText("Searching LAN for Ollama")).toBeTruthy());
    first.unmount();

    renderSection(false);
    expect(screen.getByLabelText("Searching LAN for Ollama").textContent).toBe("…");

    await act(async () => {
      finish({ ok: true, hosts: [{ label: "gaming-pc", host: "192.168.1.77:11434", port: 11434, verified: true }] });
    });
    await waitFor(() => expect(screen.getByText("Found on LAN (mDNS)")).toBeTruthy());
    expect(screen.getByText(/Use gaming-pc/)).toBeTruthy();
    expect(screen.getByLabelText("Find Ollama on LAN via mDNS").textContent).toBe("Find LAN");
  });

  it("shows the 'none found' message on a tab rebuilt before the search ended", async () => {
    let finish: (v: unknown) => void = () => {};
    setRpcHandler("discover_mdns_ollama_hosts", () => new Promise((resolve) => (finish = resolve)));
    const first = renderSection(false);
    await pressFindLanAndSearch();
    first.unmount();
    renderSection(false);
    await act(async () => {
      finish({ ok: true, hosts: [], hint: "No Ollama services found here." });
    });
    await waitFor(() => expect(screen.getByText("No Ollama services found here.")).toBeTruthy());
  });

  it("shows a result that ended while no copy of the tab was on screen", async () => {
    let finish: (v: unknown) => void = () => {};
    setRpcHandler("discover_mdns_ollama_hosts", () => new Promise((resolve) => (finish = resolve)));
    const first = renderSection(false);
    await pressFindLanAndSearch();
    first.unmount();
    await act(async () => {
      finish({ ok: true, hosts: [], hint: "No Ollama services found here." });
    });
    renderSection(false);
    expect(screen.getByText("No Ollama services found here.")).toBeTruthy();
  });
});
