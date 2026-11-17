/**
 * The five first-time downloads' sizes (plan 105, § 12, looked up 2026-11-16) and their totals: about 6.9 GB with
 * everything, about 5.8 GB with the least the first-time setup allows, the two models 4.6 GB on their own.
 */
import { describe, expect, it } from "vitest";

import {
  aboutSize,
  ANSWER_MODEL_DOWNLOAD_SIZE,
  NOTE_SEARCH_MODEL_DOWNLOAD_SIZE,
  OLLAMA_DOWNLOAD_SIZE,
  SPEECH_MODELS_DOWNLOAD_SIZE,
  totalDownloadSize,
  VOICE_ENGINE_DOWNLOAD_SIZE,
} from "./downloadSizes";

const ALL = [OLLAMA_DOWNLOAD_SIZE, ANSWER_MODEL_DOWNLOAD_SIZE, NOTE_SEARCH_MODEL_DOWNLOAD_SIZE, SPEECH_MODELS_DOWNLOAD_SIZE, VOICE_ENGINE_DOWNLOAD_SIZE];

describe("first-time download sizes", () => {
  it("each label is its own size, rounded", () => {
    for (const s of ALL) expect(aboutSize(s.mb)).toBe(s.label);
  });

  it("all five come to about 6.9 GB; the least the setup allows to about 5.8 GB", () => {
    expect(totalDownloadSize(ALL)).toBe("about 6.9 GB");
    expect(totalDownloadSize([OLLAMA_DOWNLOAD_SIZE, ANSWER_MODEL_DOWNLOAD_SIZE])).toBe("about 5.8 GB");
  });

  it("the two models alone are the old 4.6 GB, which left Ollama out", () => {
    expect(totalDownloadSize([ANSWER_MODEL_DOWNLOAD_SIZE, NOTE_SEARCH_MODEL_DOWNLOAD_SIZE])).toBe("about 4.6 GB");
  });
});
