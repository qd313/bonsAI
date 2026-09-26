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
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { OllamaWhereAiRunsSection } from "./OllamaWhereAiRunsSection";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../test-harness/fakeDeckyRpc";

function sectionElement(
  overrides: {
    ollamaLocalAutostart?: boolean;
    ollamaIp?: string;
    ollamaLocalOnDeck?: boolean;
    settingsLoaded?: boolean;
  } = {},
) {
  return (
    <OllamaWhereAiRunsSection
      ollamaIp={overrides.ollamaIp ?? "192.168.1.100"}
      onOllamaIpChange={() => {}}
      onPersistOllamaIp={() => {}}
      ollamaLocalOnDeck={overrides.ollamaLocalOnDeck ?? false}
      setOllamaLocalOnDeck={() => {}}
      ollamaLocalAutostart={overrides.ollamaLocalAutostart ?? false}
      setOllamaLocalAutostart={() => {}}
      namedOllamaHosts={[]}
      setNamedOllamaHosts={() => {}}
      onBeforeDeckyModal={() => {}}
      onCompleteDeckyModalClose={(close) => close()}
      onOpenOllamaModelsHub={() => {}}
      settingsLoaded={overrides.settingsLoaded ?? true}
    />
  );
}

function renderSection(overrides: { ollamaLocalAutostart?: boolean } = {}) {
  return render(sectionElement(overrides));
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

/*
 * After a plugin reload the Ollama tab can mount before settings arrive, while "Ollama on this
 * Deck" still reads its default off. The one automatic check used to fire right away, went to
 * the network address placeholder, failed, and logged "test_ollama_connection failed
 * (non-loopback)" -- even though Ollama was answering normally on this Deck the whole time
 * (plugin log 2026-09-23 22:43:06, "Name or service not known"; flow H, plan 64,
 * docs/test-evidence/plan64-OLLAMA-TAB-AFTER-RELOAD.json). The fix: wait for settingsLoaded
 * before ever probing, so the one automatic check always uses the real, final values.
 */
describe("OllamaWhereAiRunsSection automatic connection check", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
  });

  it("does not probe at all before settings have loaded", async () => {
    setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.12.0", models: [] }));
    const probes = () => getRpcCallLog().filter((c) => c.method === "test_ollama_connection");

    render(sectionElement({ ollamaIp: "192.168.1.", ollamaLocalOnDeck: false, settingsLoaded: false }));
    // Give any wrongly-eager effect a tick to have fired.
    await new Promise((r) => setTimeout(r, 20));
    expect(probes()).toHaveLength(0);
  });

  it("probes exactly once, for the real mode, the moment settings finish loading -- never the wrong host first", async () => {
    setRpcHandler("test_ollama_connection", (...args: unknown[]) =>
      String(args[0]).startsWith("127.0.0.1")
        ? { reachable: true, version: "0.12.0", models: [] }
        : { reachable: false, error: "Name or service not known" },
    );

    const probes = () => getRpcCallLog().filter((c) => c.method === "test_ollama_connection");
    // Mount as the tab would right after a reload: settings not back yet, so the on-Deck
    // switch still reads its default (off) and the IP field still holds the old LAN address.
    const { rerender } = render(
      sectionElement({ ollamaIp: "192.168.1.", ollamaLocalOnDeck: false, settingsLoaded: false }),
    );
    await new Promise((r) => setTimeout(r, 20));
    expect(probes()).toHaveLength(0);

    // Settings land: this Deck actually runs Ollama itself.
    rerender(sectionElement({ ollamaIp: "192.168.1.", ollamaLocalOnDeck: true, settingsLoaded: true }));

    await screen.findByText("Update AI & models");
    expect(probes().map((c) => c.args[0])).toEqual(["127.0.0.1:11434"]);
  });

  it("keeps the newer answer when an older check finishes after it (settings already loaded)", async () => {
    let releaseSlow: (v: unknown) => void = () => {};
    setRpcHandler("test_ollama_connection", (...args: unknown[]) =>
      String(args[0]).startsWith("127.0.0.1")
        ? { reachable: true, version: "0.12.0", models: [] }
        : new Promise((resolve) => {
            releaseSlow = resolve;
          }),
    );

    // Settings are already loaded here -- this covers the general "an older probe must not
    // clobber a newer one" race (e.g. flipping the on-Deck switch twice quickly), independent
    // of the settings-load timing above.
    const { rerender } = render(
      sectionElement({ ollamaIp: "192.168.1.", ollamaLocalOnDeck: false, settingsLoaded: true }),
    );
    rerender(sectionElement({ ollamaIp: "192.168.1.", ollamaLocalOnDeck: true, settingsLoaded: true }));
    await screen.findByText("Update AI & models");

    releaseSlow({ reachable: false, error: "Name or service not known" });
    await new Promise((r) => setTimeout(r, 20));
    await waitFor(() => expect(screen.getByText("Update AI & models")).toBeTruthy());
    expect(screen.queryByText("Install Ollama")).toBeNull();
  });
});
