import { describe, expect, it } from "vitest";
import { stripAssistantDisplayTags } from "./stripAssistantDisplayTags";

describe("stripAssistantDisplayTags", () => {
  it("removes closed bonsai-status tags", () => {
    const raw = "<bonsai-status>Checking GPU</bonsai-status>\n\nHello.";
    expect(stripAssistantDisplayTags(raw)).toBe("Hello.");
  });

  it("removes multiple status tags", () => {
    const raw =
      "<bonsai-status>One</bonsai-status>\n\nBody\n\n<bonsai-status>Two</bonsai-status>\n\nTail.";
    expect(stripAssistantDisplayTags(raw)).toBe("Body\n\nTail.");
  });

  it("hides incomplete open status tag", () => {
    expect(stripAssistantDisplayTags("Intro\n<bonsai-status>Still going")).toBe("Intro");
  });

  it("hides broken partial open like <bons you're…", () => {
    expect(stripAssistantDisplayTags("<bons you're asking about settings")).toBe("");
    expect(stripAssistantDisplayTags("Hi\n<bons you're asking")).toBe("Hi");
  });

  it("removes bracket strategy branch tag remnants", () => {
    const raw = 'Tips here.\n\n[bonsai-strategy-branches] ({"question":"Where?","options":[]})';
    expect(stripAssistantDisplayTags(raw)).toBe("Tips here.");
  });

  // Plan 77 (SPY-REVEAL-01): the Spy's closing confession block is read by the back end once the
  // reply is done; while it is still arriving (and on any reply the back end missed) it must not
  // show as raw markup.
  describe("the Spy's confession block", () => {
    it("removes a closed block", () => {
      const raw = "Drop TDP to 8.\n\n<bonsai-spy-lies>\nSaid 8 W helps\n</bonsai-spy-lies>";
      expect(stripAssistantDisplayTags(raw)).toBe("Drop TDP to 8.");
    });

    it("removes a block whose closing tag is missing its bracket", () => {
      const raw = "Drop TDP to 8.\n<bonsai-spy-lies> first lie\nsecond lie\n</bonsai-spy-lies";
      expect(stripAssistantDisplayTags(raw)).toBe("Drop TDP to 8.");
    });

    it("hides a block that is still arriving, closer not written yet", () => {
      expect(stripAssistantDisplayTags("Drop TDP to 8.\n<bonsai-spy-lies>\nSaid 8 W")).toBe(
        "Drop TDP to 8."
      );
    });

    it("hides an opening tag that is only half written", () => {
      expect(stripAssistantDisplayTags("Drop TDP to 8.\n<bonsai-spy-l")).toBe("Drop TDP to 8.");
    });

    it("keeps text that follows a closed block", () => {
      const raw = "Before.\n<bonsai-spy-lies>\nA lie\n</bonsai-spy-lies>\nAfter.";
      expect(stripAssistantDisplayTags(raw)).toBe("Before.\n\nAfter.");
    });
  });
});
