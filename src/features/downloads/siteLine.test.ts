/**
 * Title: siteLine tests
 *
 * Purpose: The card's one "From ..." line names sites by their short domain, fits the Deck's card, and never cuts a name.
 */
import { describe, expect, it } from "vitest";
import { ollamaSetupFace } from "../ai-connection/ollamaSetupJob";
import { VOICE_INSTALL_SITES } from "../voice/voiceInstallJob";
import { KB_LIBRARY_SITES } from "../knowledge-library/knowledgeLibraryJob";
import { VOICE_BUILD_PACKAGE_SITES } from "./downloadSites";
import { shortSiteName, sitesLine, SITES_LINE_BUDGET } from "./siteLine";

const ALL = ["ollama.com", "github.com", "registry.ollama.ai", "huggingface.co", "ghcr.io", ...VOICE_BUILD_PACKAGE_SITES];

describe("shortSiteName", () => {
  it("keeps the registrable domain", () => {
    expect(shortSiteName("registry.ollama.ai")).toBe("ollama.ai");
    expect(shortSiteName("https://security.ubuntu.com")).toBe("ubuntu.com");
    expect(shortSiteName("ghcr.io")).toBe("ghcr.io");
  });
});

describe("sitesLine", () => {
  it("names the Ollama update's sites in full", () => {
    expect(sitesLine(["ollama.com", "github.com", "registry.ollama.ai"])).toBe("From ollama.com, github.com and ollama.ai");
  });
  it("names the two Ubuntu servers once", () => {
    expect(sitesLine(["ghcr.io", ...VOICE_BUILD_PACKAGE_SITES, "huggingface.co"])).toBe("From ghcr.io, ubuntu.com and huggingface.co");
  });
  it("keeps whole names and ends 'and N more' when over budget", () => {
    expect(sitesLine(ALL)).toBe("From ollama.com, github.com and 4 more");
  });
  it("never cuts a name and always fits, for every line a card can show", () => {
    const lines = [
      sitesLine(ALL),
      sitesLine(ALL.slice(0, 3)),
      VOICE_INSTALL_SITES,
      KB_LIBRARY_SITES,
      ollamaSetupFace({ phase: "running", stage: "check", profile: "update_installed" }, "update").sites,
      ollamaSetupFace({ phase: "running", stage: "check", profile: "tier1_essentials" }, "setup").sites,
    ];
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(SITES_LINE_BUDGET);
      expect(line).not.toContain("…");
      for (const part of line.replace(/^From /, "").split(/, | and | or /)) {
        expect(part === "" || /^(\d+ more|[a-z]+\.[a-z]+)$/.test(part)).toBe(true);
      }
    }
  });
  it("fits the library line", () => {
    expect(KB_LIBRARY_SITES).toBe("From huggingface.co or github.com");
  });
});
