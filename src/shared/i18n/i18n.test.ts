import { describe, expect, it } from "vitest";
import { t } from "./i18n";

describe("i18n", () => {
  it("falls back to English for missing per-language keys", () => {
    expect(t("ask.starting", "french")).toBe("Starting…");
  });

  it("returns Japanese when catalog has the key", () => {
    expect(t("ask.starting", "japanese")).toBe("開始中…");
  });

  it("interpolates template variables", () => {
    expect(t("about.replyLanguage.systemDetected", "english", { name: "Japanese" })).toBe(
      "Steam client language: Japanese",
    );
  });
});
