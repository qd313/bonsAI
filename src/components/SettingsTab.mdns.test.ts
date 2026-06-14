import { describe, expect, it, beforeEach } from "vitest";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../test-harness/fakeDeckyRpc";

describe("SettingsTab mDNS discovery contract", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
  });

  it("does not call discover_mdns_ollama_hosts from default registry on idle load", () => {
    expect(getRpcCallLog().some((c) => c.method === "discover_mdns_ollama_hosts")).toBe(false);
  });

  it("discover_mdns_ollama_hosts returns bounded host list shape", async () => {
    setRpcHandler("discover_mdns_ollama_hosts", () => ({
      ok: true,
      hosts: [{ label: "PC", host: "192.168.1.50:11434", port: 11434, verified: true }],
      error: "",
    }));
    const { dispatchFakeRpc } = await import("../test-harness/fakeDeckyRpc");
    const result = (await dispatchFakeRpc("discover_mdns_ollama_hosts", [10])) as {
      hosts: Array<{ host: string }>;
    };
    expect(result.hosts).toHaveLength(1);
    expect(result.hosts[0]?.host).toBe("192.168.1.50:11434");
  });
});
