/**
 * Title: The download box names github.com beside ollama.com for Ollama's own file
 *
 * Purpose: Plan 106, lane R2 (after lane R1 moved Ollama's program file and its check number to github.com's release
 * page). The Ollama lines of the download box say where bonsAI really connects: ollama.com and github.com. The
 * starter box's Ollama line is pinned to two lines at the Deck's width (localOllamaStarterSet.boxFit.test.tsx), so it
 * may be no longer than the line it replaced (104 characters).
 *
 * Does not: wrap text; the box-fit test reads the Deck's own picture for that.
 */
import { describe, expect, it } from "vitest";

import { downloadNoticeLine } from "./downloadNotice";
import { OLLAMA_PROGRAM_NOTICE, UPDATE_AI_NOTICES } from "./downloadSites";

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
