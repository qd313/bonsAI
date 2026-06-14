import { describe, expect, it } from "vitest";
import { ASK_THINKING_STARTING_DISPLAY, isPendingPlaceholderResponse } from "./askThinkingPhases";

describe("askThinkingPhases", () => {
  it("exposes starting display constant", () => {
    expect(ASK_THINKING_STARTING_DISPLAY).toBe("Starting…");
  });

  it("treats empty and Thinking placeholders as pending", () => {
    expect(isPendingPlaceholderResponse("")).toBe(true);
    expect(isPendingPlaceholderResponse("Thinking...")).toBe(true);
    expect(isPendingPlaceholderResponse("thinking")).toBe(true);
    expect(isPendingPlaceholderResponse("Thinking")).toBe(true);
  });

  it("allows real partial text", () => {
    expect(isPendingPlaceholderResponse("Hello world")).toBe(false);
  });
});
