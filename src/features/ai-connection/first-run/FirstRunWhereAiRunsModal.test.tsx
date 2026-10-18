/**
 * Title: The first-run popup "Where should the AI run?", as a person sees it
 *
 * Purpose: Draws the real popup and checks what a new player reads and can do: the words (title, lead, the
 * two switches and their help lines, the install note, the PC address and its hint), the ring starting on
 * Not now, a switch changed inside the popup being saved before it can close, Not now and B leaving
 * everything as it was, Test connection showing its result line inside the popup, Install Ollama opening
 * the download notice, and Find LAN showing for everyone beside the address (not with the AI on this Deck).
 *
 * Used for: FirstRunWhereAiRunsModal.tsx and its parts (plan 96, N1).
 *
 * Solves: a first-run popup that looks right and does nothing, or changes a setting only on screen.
 *
 * Does not: walk every direction of the D-pad (FirstRunWhereAiRunsModal.walk.test.tsx does) or prove the
 * ring on the device; the Deck row does.
 */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => (await import("./firstRunPopupTestKit")).deckyUiForFirstRunPopup());

import { OLLAMA_HTTPS_NOT_SUPPORTED_MESSAGE } from "../ollamaAddress";
import { FIRST_RUN_POPUP_WORDS, FirstRunWhereAiRunsModal } from "./FirstRunWhereAiRunsModal";
import { boxes, popupHost, pressB, resetBoxes, ringName } from "./firstRunPopupTestKit";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../../../test-harness/fakeDeckyRpc";
import { markSettingsLoaded, resetSettingsLoadedSignalForTests } from "../../settings/settingsLoadedSignal";

const NOT_NOW = "Not now";
const text = () => document.body.textContent ?? "";

function open(host = popupHost(), onClose = vi.fn()) {
  const view = render(<FirstRunWhereAiRunsModal host={host} onClose={onClose} />);
  return { view, host, onClose };
}

const addressBox = () => document.querySelector('input[data-decky-ui="TextField"]') as HTMLInputElement;
const pressButton = (name: string) => fireEvent.click(screen.getByLabelText(name));

beforeEach(() => {
  resetFakeDeckyRpc();
  resetBoxes();
  resetSettingsLoadedSignalForTests();
  markSettingsLoaded();
  window.localStorage.clear();
  setRpcHandler("test_ollama_connection", () => ({ reachable: false, error: "Connection refused" }));
});
afterEach(() => vi.useRealTimers());

describe("what the popup says", () => {
  it("asks where the AI should run, with the switch on and its warning as the help line", async () => {
    open();
    expect(text()).toContain("Where should the AI run?");
    expect(text()).toContain(
      "bonsAI needs Ollama, a free program that runs the AI. It can run on this Deck or on a PC on your home network. You can change this later on the Ollama tab.",
    );
    expect(screen.getByRole("switch", { name: "Run AI on this Deck" }).getAttribute("aria-checked")).toBe("true");
    expect(text()).toContain(
      "Works anywhere, no PC needed. The AI and your game share the Deck's chip, so both slow down while it answers.",
    );
    expect(screen.getByRole("switch", { name: "Start the AI with the Deck" }).getAttribute("aria-checked")).toBe("false");
    expect(text()).toContain("Starts it each time the Deck turns on, so the first answer comes sooner.");
    expect(text()).toContain(
      "Install Ollama downloads it and the starter models, about 4.6 GB. You are asked before anything downloads.",
    );
    await waitFor(() => expect(text()).toContain("Local Ollama setup: Not installed"));
    // Two buttons in the foot, the action on the left and Not now on the right.
    const foot = ["Install Ollama", NOT_NOW].map((w) => screen.getByText(w));
    expect(foot[0].compareDocumentPosition(foot[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("draws the action in Steam's blue primary button (the look of Got it) and Not now in the plain one", async () => {
    open();
    const action = screen.getByLabelText("Install Ollama on this Deck");
    const notNow = screen.getByLabelText("Not now: set up the AI later on the Ollama tab");
    expect(action.getAttribute("data-decky-ui")).toBe("DialogButtonPrimary");
    expect(notNow.getAttribute("data-decky-ui")).toBe("Button");
    for (const b of [action, notNow]) {
      expect(b.getAttribute("style") ?? "").not.toMatch(/background|border|color|rgba?\(|#[0-9a-f]{3}/i);
    }
  });

  it("with the switch off the foot reads Test connection on the left and Not now on the right", async () => {
    open(popupHost({ ollamaLocalOnDeck: false }));
    const foot = ["Test connection", NOT_NOW].map((w) => screen.getByText(w));
    expect(foot[0].compareDocumentPosition(foot[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("says the real state once Ollama answers, and offers to update instead of install", async () => {
    setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.5.0", models: ["a", "b"] }));
    open();
    await waitFor(() => expect(text()).toContain("Local Ollama setup: Installed (2 models)"));
    expect(screen.getByText(FIRST_RUN_POPUP_WORDS.update)).toBeTruthy();
  });

  it("with the switch off shows the bare-address field, its hint, this Deck's IP and Test connection, not the install note", async () => {
    open(popupHost({ ollamaLocalOnDeck: false }));
    await waitFor(() => expect(text()).toContain("This Deck's IP: 192.168.1.100"));
    expect(text()).toContain("PC address");
    expect(text()).toContain("Just the PC's address, for example 192.168.1.20. bonsAI adds Ollama's usual port (11434) when you leave it out.");
    expect(text()).toContain("The PC needs Ollama with a model, and must accept connections from your network.");
    expect(text()).not.toContain("about 4.6 GB");
    expect(screen.queryByRole("switch", { name: "Start the AI with the Deck" })).toBeNull();
    expect(screen.getByText("Test connection")).toBeTruthy();
    expect(screen.queryByText("Install Ollama")).toBeNull();
  });

  it("shows Find LAN beside the address for everyone, with the Developer tab off", () => {
    open(popupHost({ ollamaLocalOnDeck: false }));
    expect(screen.getByText("Find LAN")).toBeTruthy();
    const field = addressBox();
    const button = screen.getByLabelText("Find Ollama on LAN via mDNS");
    // After the address field in the same row.
    expect(field.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("hides Find LAN while the AI runs on this Deck", () => {
    open(popupHost({ ollamaLocalOnDeck: true }));
    expect(screen.queryByText("Find LAN")).toBeNull();
  });

  it("Find LAN asks first, searches, and fills the address with the PC it found", async () => {
    setRpcHandler("discover_mdns_ollama_hosts", () => ({
      ok: true,
      hosts: [{ label: "gaming-pc", host: "192.168.1.77:11434", port: 11434, verified: true }],
    }));
    open(popupHost({ ollamaLocalOnDeck: false }));
    pressButton("Find Ollama on LAN via mDNS");
    await waitFor(() => expect(boxes).toHaveLength(1));
    expect(getRpcCallLog().some((c) => c.method === "discover_mdns_ollama_hosts")).toBe(false);
    act(() => (boxes[0].props as { onOK: () => void }).onOK());
    await waitFor(() => expect(addressBox().value).toBe("192.168.1.77:11434"));
  });

  it("Find LAN says so when nothing is found", async () => {
    setRpcHandler("discover_mdns_ollama_hosts", () => ({ ok: true, hosts: [], hint: "No Ollama services found here." }));
    open(popupHost({ ollamaLocalOnDeck: false }));
    pressButton("Find Ollama on LAN via mDNS");
    await waitFor(() => expect(boxes).toHaveLength(1));
    act(() => (boxes[0].props as { onOK: () => void }).onOK());
    await waitFor(() => expect(text()).toContain("No Ollama services found here."));
  });
});

describe("the ring and the close", () => {
  it("starts on Not now", async () => {
    open();
    await waitFor(() => expect(ringName()).toContain(NOT_NOW));
  });

  it("Not now closes it and changes nothing: no setting set, nothing saved", async () => {
    const { host, onClose } = open();
    await waitFor(() => expect(ringName()).toContain(NOT_NOW));
    pressButton("Not now: set up the AI later on the Ollama tab");
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(host.saveSettingsNow).not.toHaveBeenCalled();
    expect(host.setOllamaLocalOnDeck).not.toHaveBeenCalled();
    expect(host.setOllamaLocalAutostart).not.toHaveBeenCalled();
    expect(host.setOllamaIp).not.toHaveBeenCalled();
    expect(getRpcCallLog().some((c) => c.method === "save_settings")).toBe(false);
  });

  it("B does the same as Not now", () => {
    const { view, host, onClose } = open();
    pressB(view.container);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(host.saveSettingsNow).not.toHaveBeenCalled();
  });
});

describe("a switch changed in the popup is saved before it can close", () => {
  it("Run AI on this Deck turned off is saved at once, the popup still open", () => {
    const { host, onClose } = open();
    fireEvent.click(screen.getByRole("switch", { name: "Run AI on this Deck" }));
    expect(host.saveSettingsNow).toHaveBeenCalledWith({ ollama_local_on_deck: false });
    expect(host.setOllamaLocalOnDeck).toHaveBeenCalledWith(false);
    expect(onClose).not.toHaveBeenCalled();
    // The popup now draws the PC half.
    expect(screen.getByText("PC address")).toBeTruthy();
    expect(screen.queryByRole("switch", { name: "Start the AI with the Deck" })).toBeNull();
  });

  it("Start the AI with the Deck turned on is saved at once and asks the back end for the startup entry", async () => {
    const { host } = open();
    fireEvent.click(screen.getByRole("switch", { name: "Start the AI with the Deck" }));
    expect(host.saveSettingsNow).toHaveBeenCalledWith({ ollama_local_autostart: true });
    expect(host.setOllamaLocalAutostart).toHaveBeenCalledWith(true);
    await waitFor(() =>
      expect(getRpcCallLog().some((c) => c.method === "apply_ollama_local_autostart" && c.args[0] === true)).toBe(true),
    );
  });
});

describe("Test connection, with the switch off", () => {
  it("tests the typed address and shows the result inside the popup, and remembers an address that answered", async () => {
    setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.6.1", models: ["gemma4:e2b-it-qat"] }));
    const { host } = open(popupHost({ ollamaLocalOnDeck: false }));
    fireEvent.change(addressBox(), { target: { value: "192.168.1.20" } });
    expect(host.setOllamaIp).toHaveBeenCalledWith("192.168.1.20");
    pressButton("Test the connection to the PC");
    await waitFor(() => expect(text()).toContain("Connected · Ollama v0.6.1 · 1 model"));
    const call = getRpcCallLog().find((c) => c.method === "test_ollama_connection");
    expect(call?.args[0]).toBe("192.168.1.20");
    expect(host.persistOllamaIp).toHaveBeenCalledWith("192.168.1.20");
  });

  it("shows why it did not connect, and does not remember the address", async () => {
    const { host } = open(popupHost({ ollamaLocalOnDeck: false, ollamaIp: "192.168.1.20" }));
    pressButton("Test the connection to the PC");
    await waitFor(() => expect(text()).toContain("Unreachable — Connection refused"));
    expect(host.persistOllamaIp).not.toHaveBeenCalled();
  });

  it("refuses an https address in words, without trying it", async () => {
    open(popupHost({ ollamaLocalOnDeck: false, ollamaIp: "https://pc.local" }));
    pressButton("Test the connection to the PC");
    await new Promise((r) => setTimeout(r, 30));
    expect(text()).toContain(OLLAMA_HTTPS_NOT_SUPPORTED_MESSAGE);
    expect(getRpcCallLog().some((c) => c.method === "test_ollama_connection")).toBe(false);
  });
});

describe("Install Ollama", () => {
  it("opens the download notice (the starter-models question on a Deck with no models) and starts nothing until it is answered", async () => {
    open();
    await waitFor(() => expect(text()).toContain("Local Ollama setup: Not installed"));
    pressButton("Install Ollama on this Deck");
    await waitFor(() => expect(boxes).toHaveLength(1));
    const box = boxes[0].props as { title: string; actionLabel: string; onCancel: () => void };
    expect(box.title).toBe("Also install the starter models?");
    expect(box.actionLabel).toBe("Install Ollama and the starter models");
    expect(getRpcCallLog().some((c) => c.method === "start_local_ollama_setup")).toBe(false);
    act(() => box.onCancel());
  });
});
