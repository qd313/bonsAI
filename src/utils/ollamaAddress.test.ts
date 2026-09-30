import { describe, expect, it } from "vitest";
import { isHttpsOllamaAddress, OLLAMA_HTTPS_NOT_SUPPORTED_MESSAGE } from "./ollamaAddress";

describe("isHttpsOllamaAddress", () => {
  it("catches an address typed as https, in any case, with spaces around it", () => {
    expect(isHttpsOllamaAddress("https://192.168.1.50:11434")).toBe(true);
    expect(isHttpsOllamaAddress("HTTPS://example.com")).toBe(true);
    expect(isHttpsOllamaAddress("  https://ollama.lan ")).toBe(true);
  });

  it("leaves plain addresses alone", () => {
    expect(isHttpsOllamaAddress("192.168.1.50:11434")).toBe(false);
    expect(isHttpsOllamaAddress("http://192.168.1.50:11434")).toBe(false);
    expect(isHttpsOllamaAddress("httpshost:11434")).toBe(false);
    expect(isHttpsOllamaAddress("")).toBe(false);
  });

  it("uses the same words as the back end", () => {
    // py_modules/backend/ollama_urls.py HTTPS_NOT_SUPPORTED_MESSAGE
    expect(OLLAMA_HTTPS_NOT_SUPPORTED_MESSAGE).toBe(
      "bonsAI can only talk to Ollama over http for now. Use an http:// address.",
    );
  });
});
