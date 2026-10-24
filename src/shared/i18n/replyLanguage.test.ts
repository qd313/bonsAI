import { describe, expect, it } from "vitest";
import {
  REPLY_LANGUAGE_FOLLOW_SYSTEM,
  buildReplyLanguageDropdownOptions,
  normalizeReplyLanguage,
  replyLanguageLabel,
} from "./replyLanguage";

/** Regression: Decky Dropdown `selectedOption` must be the option `.data` value. */
describe("replyLanguage", () => {
  it("default follow_system matches first dropdown option data", () => {
    const options = buildReplyLanguageDropdownOptions();
    expect(options[0]).toEqual({
      label: "Follow system",
      data: REPLY_LANGUAGE_FOLLOW_SYSTEM,
    });

    const selection = normalizeReplyLanguage(undefined);
    expect(selection).toBe(REPLY_LANGUAGE_FOLLOW_SYSTEM);
    expect(options.some((o) => o.data === selection)).toBe(true);
    expect(replyLanguageLabel(selection)).toBe("Follow system");
  });
});
