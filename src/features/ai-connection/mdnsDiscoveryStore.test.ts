/**
 * Title: Find LAN search memory
 *
 * Purpose: Pins what the store keeps between copies of the Ollama tab: a running search, its result, the
 * refusal of a second search while one runs, and the age limits that stop an old marker or result showing.
 *
 * Does not: draw anything; OllamaFindLan.test.tsx checks what is on screen after a rebuild.
 */
import { describe, expect, it, vi } from "vitest";
import { createMdnsDiscoveryStore } from "./mdnsDiscoveryStore";

const HOST = { label: "pc", host: "192.168.1.5:11434", port: 11434 };

describe("mdnsDiscoveryStore", () => {
  it("knows nothing until a search starts", () => {
    expect(createMdnsDiscoveryStore().read()).toBeNull();
  });

  it("reports a running search, refuses a second one, then reports the result", () => {
    const store = createMdnsDiscoveryStore();
    expect(store.start(1000)).toBe(true);
    expect(store.read(2000)).toEqual({ discovering: true, hosts: [], message: null });
    expect(store.start(2000)).toBe(false);
    store.finish([HOST], null, 3000);
    expect(store.read(4000)).toEqual({ discovering: false, hosts: [HOST], message: null });
    expect(store.start(5000)).toBe(true);
  });

  it("forgets a search that never ended and a result that is old", () => {
    const store = createMdnsDiscoveryStore();
    store.start(0);
    expect(store.read(60_000)).toBeNull();
    store.finish([], "none", 60_000);
    expect(store.read(60_001)?.message).toBe("none");
    expect(store.read(60_000 + 11 * 60 * 1000)).toBeNull();
  });

  it("tells listeners on start and finish, and stops after unsubscribe", () => {
    const store = createMdnsDiscoveryStore();
    const listener = vi.fn();
    const off = store.subscribe(listener);
    store.start();
    store.finish([], "none");
    expect(listener).toHaveBeenCalledTimes(2);
    off();
    store.reset();
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
