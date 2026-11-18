/**
 * Title: The download box names every site it connects to: github.com for Ollama, the voice build's package servers
 *
 * Purpose: Plan 106. Lane R2 (after lane R1 moved Ollama's program file and its check number to github.com's release
 * page): the Ollama lines say ollama.com and github.com. The starter box's Ollama line is pinned to two lines at the
 * Deck's width (localOllamaStarterSet.boxFit.test.tsx), so it may be no longer than the line it replaced (104
 * characters). Lane R3 (review item 10 of plan 105): the voice row and the box name the build image's two Ubuntu
 * package servers, the box adds "and the sites they hand off to", and the checklist's one-line form stays short.
 *
 * Used for: downloadSites.ts (OLLAMA_PROGRAM_NOTICE, UPDATE_AI_NOTICES, VOICE_ENGINE_NOTICE, voiceEngineNotices, the
 * VOICE_BUILD_PACKAGE_SITES words).
 *
 * Does not: wrap text (the box-fit test reads the Deck's own picture for that), or check that the servers are the ones
 * the image really uses (tests/test_download_sites_match_backend.py keeps the list equal to the back end's).
 */
import { describe, expect, it } from "vitest";

import { downloadNoticeLine } from "./downloadNotice";
import {
  OLLAMA_PROGRAM_NOTICE,
  UPDATE_AI_NOTICES,
  VOICE_BUILD_PACKAGE_SITES,
  VOICE_BUILD_PACKAGE_SITES_LONG,
  VOICE_BUILD_PACKAGE_SITES_SHORT,
  VOICE_ENGINE_NOTICE,
  voiceEngineNotices,
} from "./downloadSites";

describe("the download box's Ollama lines", () => {
  it("the Install and starter box line names ollama.com and github.com and is no longer than the line it replaced", () => {
    const line = downloadNoticeLine(OLLAMA_PROGRAM_NOTICE);
    expect(line).toBe("bonsAI will connect to https://ollama.com and https://github.com to download Ollama (about 1.5 GB).");
    expect(line.length).toBeLessThanOrEqual(104);
  });

  it("the Update box's first line names both for the newest Ollama; the models line is unchanged", () => {
    expect(downloadNoticeLine(UPDATE_AI_NOTICES[0]!)).toBe(
      "bonsAI will connect to https://ollama.com and https://github.com to download the newest Ollama (size not known ahead of time).",
    );
    expect(UPDATE_AI_NOTICES[1]!.site).toBe("https://registry.ollama.ai");
  });
});

describe("the voice engine's package servers", () => {
  it("are the image's two Ubuntu servers", () => {
    expect([...VOICE_BUILD_PACKAGE_SITES]).toEqual(["archive.ubuntu.com", "security.ubuntu.com"]);
  });

  it("the download box names them and the sites they hand off to, and no longer says only 'its own package servers'", () => {
    const [notice] = voiceEngineNotices({ engineReady: false, modelReady: true, model: "base.en" });
    expect(notice).toBe(VOICE_ENGINE_NOTICE);
    expect(notice!.what).toContain("archive.ubuntu.com and security.ubuntu.com, and the sites they hand off to");
    expect(notice!.what).not.toContain("its own package servers");
    expect(VOICE_BUILD_PACKAGE_SITES_LONG.endsWith("and the sites they hand off to")).toBe(true);
  });

  it("the checklist row's short form names both and stays short for its one-line row", () => {
    expect(VOICE_BUILD_PACKAGE_SITES_SHORT).toBe("archive.ubuntu.com, security.ubuntu.com");
    expect(`about 500 MB · compilers from ${VOICE_BUILD_PACKAGE_SITES_SHORT}`.length).toBeLessThanOrEqual(73);
  });
});
