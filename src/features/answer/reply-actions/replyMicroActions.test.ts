import { describe, expect, it } from "vitest";
import { composeChipAutofillPrefix, replyMicroActionById } from "./replyMicroActions";

describe("replyMicroActions", () => {
  it("composes prefix ending with original question", () => {
    const action = replyMicroActionById("too_long");
    expect(action).toBeTruthy();
    const text = composeChipAutofillPrefix(action!, "Why is FPS low?");
    expect(text.endsWith("Why is FPS low?")).toBe(true);
    expect(text).toContain("Original question:");
  });

  it("composes the unfenced-spoiler prefix pointing at the bonsai-spoiler fence syntax", () => {
    const action = replyMicroActionById("unfenced_spoiler");
    expect(action).toBeTruthy();
    const text = composeChipAutofillPrefix(action!, "How do I beat the final boss?");
    expect(text.endsWith("How do I beat the final boss?")).toBe(true);
    expect(text).toContain("Original question:");
    expect(text).toContain("```bonsai-spoiler```");
  });

  /*
   * Plan 72, option E: the chips got shorter words. Only the words on the chip changed — the
   * sentence added to the re-ask and the label kept in the record of what was sent are pinned here
   * exactly as they were before, so a later edit to a chip's words cannot move them by accident.
   */
  it("shows the short chip words from option E", () => {
    const labels = ["bad_information", "misidentified_game", "unfenced_spoiler", "too_long", "too_short"].map(
      (id) => replyMicroActionById(id)?.label,
    );
    expect(labels).toEqual(["Bad info", "Wrong game or topic", "Spoiled it", "Too long", "Too short"]);
  });

  it("keeps each chip's re-ask sentence and recorded label exactly as before", () => {
    const pinned: Record<string, [string, string]> = {
      bad_information: [
        "The last answer may be wrong. Correct factual errors, drop unverified claims, and state what you're unsure about. Original question: ",
        "Follow-up: Bad information",
      ],
      misidentified_game: [
        "You may have the wrong game or issue. Re-check the running game/AppID and context, then re-answer. Original question: ",
        "Follow-up: Misidentified game/problem",
      ],
      unfenced_spoiler: [
        "The last answer revealed spoiler content in plain text that should have been hidden. Rewrite it with the same information, but put anything spoilery — twists, endings, secret unlocks, or other things the player shouldn't know yet — inside ```bonsai-spoiler``` fences this time. Original question: ",
        "Follow-up: Unfenced spoiler",
      ],
      too_long: ["Give a shorter answer—key points only, minimal preamble. Original question: ", "Follow-up: Too long"],
      too_short: [
        "Expand the answer with more detail, steps, or examples while staying on topic. Original question: ",
        "Follow-up: Too short",
      ],
    };
    for (const [id, [prefix, transparencyLabel]] of Object.entries(pinned)) {
      const action = replyMicroActionById(id);
      expect(action?.id).toBe(id);
      expect(action?.prefix).toBe(prefix);
      expect(action?.transparencyLabel).toBe(transparencyLabel);
    }
  });
});
