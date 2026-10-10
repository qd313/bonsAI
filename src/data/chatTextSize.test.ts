/**
 * Title: Chat text size steps
 * Purpose: Pin the three steps and the style that puts one on the plugin's root.
 * Used for: plan 87 F6.
 * Does not: Draw anything (see MainTabChatTranscript.textSize.test.tsx).
 */
import { describe, expect, it } from "vitest";

import { CHAT_TEXT_SCALE, CHAT_TEXT_SCALE_VAR, withChatTextScale } from "./chatTextSize";

describe("chat text size steps", () => {
  it("has Small below Normal, Normal exactly 1 (today's size) and Large above", () => {
    expect(CHAT_TEXT_SCALE.normal).toBe(1);
    expect(CHAT_TEXT_SCALE.small).toBeLessThan(1);
    expect(CHAT_TEXT_SCALE.large).toBeGreaterThan(1);
    expect(CHAT_TEXT_SCALE.large).toBeLessThanOrEqual(1.2);
  });

  it("writes the step into its own variable, keeping what the root already carried", () => {
    const style = withChatTextScale({ ["--bonsai-ui-scale" as string]: "1.2" }, "large") as Record<string, string>;
    expect(style[CHAT_TEXT_SCALE_VAR]).toBe("1.15");
    expect(style["--bonsai-ui-scale"]).toBe("1.2");
    expect((withChatTextScale({}, "normal") as Record<string, string>)[CHAT_TEXT_SCALE_VAR]).toBe("1");
  });
});
