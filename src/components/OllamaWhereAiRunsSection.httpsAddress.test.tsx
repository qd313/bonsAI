/**
 * An Ollama address typed as https:// is refused with a plain message, on the field and on the
 * Test connection result -- never quietly tried as plain http (0.6.0 security review, finding 7).
 * A plain host:port address behaves as before.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OllamaWhereAiRunsSection } from "./OllamaWhereAiRunsSection";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../test-harness/fakeDeckyRpc";
import {
  markSettingsLoaded,
  resetSettingsLoadedSignalForTests,
} from "../features/plugin-shell/settingsLoadedSignal";
import { OLLAMA_HTTPS_NOT_SUPPORTED_MESSAGE } from "../utils/ollamaAddress";

function element(ollamaIp: string, onPersistOllamaIp: (ip: string) => void = () => {}) {
  return (
    <OllamaWhereAiRunsSection
      ollamaIp={ollamaIp}
      onOllamaIpChange={() => {}}
      onPersistOllamaIp={onPersistOllamaIp}
      ollamaLocalOnDeck={false}
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

const probes = () => getRpcCallLog().filter((c) => c.method === "test_ollama_connection");

describe("OllamaWhereAiRunsSection https address", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
    resetSettingsLoadedSignalForTests();
    markSettingsLoaded();
    setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.12.0", models: [] }));
  });

  it("says so under the field while an https address is in it", () => {
    render(element("https://192.168.1.50:11434"));
    expect(screen.getByText(OLLAMA_HTTPS_NOT_SUPPORTED_MESSAGE)).toBeTruthy();
  });

  it("shows no message for a plain address", () => {
    render(element("192.168.1.50:11434"));
    expect(screen.queryByText(OLLAMA_HTTPS_NOT_SUPPORTED_MESSAGE)).toBeNull();
  });

  it("Test connection on an https address gives the message, saves nothing and never asks the back end to try it", async () => {
    const persist = vi.fn();
    render(element("https://192.168.1.50:11434", persist));
    fireEvent.click(screen.getByLabelText("Test connection to Ollama"));
    // The message is already under the field, and it is not repeated under the button.
    await waitFor(() => expect(screen.getAllByText(OLLAMA_HTTPS_NOT_SUPPORTED_MESSAGE)).toHaveLength(1));
    expect(screen.queryByText(/Unreachable/)).toBeNull();
    expect(probes()).toHaveLength(0);
    expect(persist).not.toHaveBeenCalled();
  });

  it("Test connection on a plain address still asks the back end and saves it", async () => {
    const persist = vi.fn();
    render(element("192.168.1.50:11434", persist));
    fireEvent.click(screen.getByLabelText("Test connection to Ollama"));
    await waitFor(() => expect(persist).toHaveBeenCalledWith("192.168.1.50:11434"));
    expect(probes().length).toBeGreaterThan(0);
  });

  it("turning 'Run AI on this Deck' off probes only the old plain address, then the https press sends nothing more", async () => {
    // Round 2 (Deck 2026-09-30): the toggle's automatic check goes to whatever the field held
    // before, and logs a lookup failure for it. That is not the https press.
    const view = render(element("192.168.1."));
    await waitFor(() => expect(probes().length).toBeGreaterThan(0));
    const seen = probes().length;
    view.rerender(element("https://127.0.0.1:11434"));
    fireEvent.click(screen.getByLabelText("Test connection to Ollama"));
    await waitFor(() => expect(screen.getByText(OLLAMA_HTTPS_NOT_SUPPORTED_MESSAGE)).toBeTruthy());
    expect(probes()).toHaveLength(seen);
    for (const call of probes()) {
      expect(String((call as { args?: unknown[] }).args?.[0] ?? "")).not.toMatch(/^https:/i);
    }
  });
});
