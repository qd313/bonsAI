import { describe, expect, it, vi } from "vitest";
import { persistOllamaIpIfRoutingToLan } from "./persistOllamaIp";

describe("persistOllamaIpIfRoutingToLan", () => {
  it("skips saveIp when Ollama on Deck is enabled", () => {
    const saveIp = vi.fn();
    persistOllamaIpIfRoutingToLan(true, saveIp, "127.0.0.1:11434");
    expect(saveIp).not.toHaveBeenCalled();
  });

  it("calls saveIp with the IP when routing to LAN", () => {
    const saveIp = vi.fn();
    persistOllamaIpIfRoutingToLan(false, saveIp, "192.168.1.50:11434");
    expect(saveIp).toHaveBeenCalledOnce();
    expect(saveIp).toHaveBeenCalledWith("192.168.1.50:11434");
  });
});
