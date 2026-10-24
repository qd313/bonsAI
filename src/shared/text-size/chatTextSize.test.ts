/**
 * Title: Chat text size steps
 * Purpose: Pin the three steps and the style that puts one on the plugin's root.
 * Used for: plan 87 F6.
 * Does not: Draw anything (see MainTabChatTranscript.textSize.test.tsx).
 */
import { describe, expect, it } from "vitest";

import { TEXT_SCALE, TEXT_SCALE_VAR, withTextScale } from "./chatTextSize";

describe("chat text size steps", () => {
  it("has Small below Normal, Normal exactly 1 (today's size) and Large above", () => {
    expect(TEXT_SCALE.normal).toBe(1);
    expect(TEXT_SCALE.small).toBeLessThan(1);
    expect(TEXT_SCALE.large).toBeGreaterThan(1);
    expect(TEXT_SCALE.large).toBeLessThanOrEqual(1.2);
  });

  it("writes the step into its own variable, keeping what the root already carried", () => {
    const style = withTextScale({ ["--bonsai-ui-scale" as string]: "1.2" }, "large") as Record<string, string>;
    expect(style[TEXT_SCALE_VAR]).toBe("1.15");
    expect(style["--bonsai-ui-scale"]).toBe("1.2");
    expect((withTextScale({}, "normal") as Record<string, string>)[TEXT_SCALE_VAR]).toBe("1");
  });
});
