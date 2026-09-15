import { describe, expect, it } from "vitest";

import { turnsToCollapsedTurns } from "./chatSlotTurns";

describe("turnsToCollapsedTurns", () => {
  it("preserves trailing unpaired user turn as pendingQuestion", () => {
    const { collapsed, pendingQuestion } = turnsToCollapsedTurns([
      { id: "u1", role: "user", text: "first?" },
      { id: "a1", role: "assistant", text: "first answer" },
      { id: "u2", role: "user", text: "still waiting" },
    ]);
    expect(collapsed).toHaveLength(1);
    expect(collapsed[0]?.question).toBe("first?");
    expect(pendingQuestion).toBe("still waiting");
  });

  it("returns empty pending when turns end on assistant", () => {
    const { collapsed, pendingQuestion } = turnsToCollapsedTurns([
      { id: "u1", role: "user", text: "q" },
      { id: "a1", role: "assistant", text: "a" },
    ]);
    expect(collapsed).toHaveLength(1);
    expect(pendingQuestion).toBeNull();
  });

  it("carries the assistant turn's persisted transparency snapshot onto the collapsed turn", () => {
    // Regression: this used to be hardcoded to null for every restored turn, which made
    // SessionContextStrip always report exactly one archived turn regardless of how many
    // questions were actually asked in the slot (chipsFromSnapshot needs context_chips).
    const { collapsed } = turnsToCollapsedTurns([
      { id: "u1", role: "user", text: "first?" },
      {
        id: "a1",
        role: "assistant",
        text: "first answer",
        transparency: {
          route: "ollama",
          success: true,
          context_chips: [
            { id: "kb", rank: 1, label: "KB", attached: true, tier_class: "", body: { title: "t", paths: [], bullets: [] } },
          ],
          overflow_skips: [],
        },
      },
    ]);
    expect(collapsed[0]?.transparency?.context_chips).toHaveLength(1);
    expect(collapsed[0]?.transparency?.route).toBe("ollama");
  });

  it("carries the persisted app id onto the collapsed turn", () => {
    // Regression (DRG-GLOSSARY-01, device 2026-08-28): this was hardcoded to "", so a reply that
    // showed glossary chips while it streamed lost them the moment it settled into history —
    // MainTabBonsaiAiMarkdownChunk gates on isDrgSurvivorAppId(props.appId).
    const { collapsed } = turnsToCollapsedTurns([
      { id: "u1", role: "user", text: "what is kiting?", app_id: "548430" },
      { id: "a1", role: "assistant", text: "keep moving", app_id: "548430" },
    ]);
    expect(collapsed[0]?.appId).toBe("548430");
  });

  it("prefers each turn's own app id over the slot fallback", () => {
    // A saved chat outlives a play session: the player can quit one game, start another, and
    // keep asking in the same chat. The older turns must keep the game they were asked under.
    const { collapsed } = turnsToCollapsedTurns(
      [
        { id: "u1", role: "user", text: "first?", app_id: "548430" },
        { id: "a1", role: "assistant", text: "first answer", app_id: "548430" },
        { id: "u2", role: "user", text: "second?", app_id: "1245620" },
        { id: "a2", role: "assistant", text: "second answer", app_id: "1245620" },
      ],
      "999999",
    );
    expect(collapsed.map((t) => t.appId)).toEqual(["548430", "1245620"]);
  });

  it("falls back to the question's app id when only the answer predates the field", () => {
    const { collapsed } = turnsToCollapsedTurns([
      { id: "u1", role: "user", text: "q", app_id: "548430" },
      { id: "a1", role: "assistant", text: "a" },
    ]);
    expect(collapsed[0]?.appId).toBe("548430");
  });

  it("falls back to the slot's origin app id for turns saved before the field existed", () => {
    const { collapsed } = turnsToCollapsedTurns(
      [
        { id: "u1", role: "user", text: "q" },
        { id: "a1", role: "assistant", text: "a" },
      ],
      "548430",
    );
    expect(collapsed[0]?.appId).toBe("548430");
  });

  it("reports an empty app id when neither the turns nor the slot know one", () => {
    const { collapsed } = turnsToCollapsedTurns([
      { id: "u1", role: "user", text: "q" },
      { id: "a1", role: "assistant", text: "a" },
    ]);
    expect(collapsed[0]?.appId).toBe("");
  });

  it("carries the friendly caption onto the collapsed turn without touching the real question", () => {
    // Roadmap: "After reopening the panel, a branch-pick turn's header shows the internal
    // prompt". The header should read "I'm at: the twins" while spoiler unwrap and copy keep
    // the composed prompt.
    const { collapsed } = turnsToCollapsedTurns([
      {
        id: "u1",
        role: "user",
        text: "[Strategy follow-up] I'm at: the twins",
        display_text: "I'm at: the twins",
      },
      { id: "a1", role: "assistant", text: "answer" },
    ]);
    expect(collapsed[0]?.questionDisplay).toBe("I'm at: the twins");
    expect(collapsed[0]?.question).toBe("[Strategy follow-up] I'm at: the twins");
  });

  it("leaves questionDisplay unset for a plain typed question", () => {
    const { collapsed } = turnsToCollapsedTurns([
      { id: "u1", role: "user", text: "how do i parry" },
      { id: "a1", role: "assistant", text: "answer" },
    ]);
    expect(collapsed[0]?.questionDisplay).toBeUndefined();
  });

  it("prefers the friendly caption for a pending question too", () => {
    const { pendingQuestion } = turnsToCollapsedTurns([
      {
        id: "u1",
        role: "user",
        text: "[Strategy follow-up] I'm at: the twins",
        display_text: "I'm at: the twins",
      },
    ]);
    expect(pendingQuestion).toBe("I'm at: the twins");
  });

  it("keeps transparency null when the persisted turn carries none", () => {
    const { collapsed } = turnsToCollapsedTurns([
      { id: "u1", role: "user", text: "q" },
      { id: "a1", role: "assistant", text: "a" },
    ]);
    expect(collapsed[0]?.transparency).toBeNull();
  });

  // Gap 1 (plan 54): a restored turn needs the game's name, not only its AppID, for a title
  // reachable only by name (an emulator shortcut with no AppID).
  it("carries the persisted app name onto the collapsed turn", () => {
    const { collapsed } = turnsToCollapsedTurns([
      { id: "u1", role: "user", text: "boss tips?", app_name: "Doom 64: Retribution" },
      { id: "a1", role: "assistant", text: "circle-strafe", app_name: "Doom 64: Retribution" },
    ]);
    expect(collapsed[0]?.appName).toBe("Doom 64: Retribution");
  });

  it("falls back to the slot's origin app name for a turn with no app name of its own", () => {
    const { collapsed } = turnsToCollapsedTurns(
      [
        { id: "u1", role: "user", text: "q" },
        { id: "a1", role: "assistant", text: "a" },
      ],
      "",
      "Doom 64: Retribution",
    );
    expect(collapsed[0]?.appName).toBe("Doom 64: Retribution");
  });

  it("reports an empty app name when neither the turns nor the slot know one", () => {
    const { collapsed } = turnsToCollapsedTurns([
      { id: "u1", role: "user", text: "q" },
      { id: "a1", role: "assistant", text: "a" },
    ]);
    expect(collapsed[0]?.appName).toBe("");
  });

  // Gap 2 (plan 54): a restored assistant turn carries the named thing the backend worked out,
  // so a reopened chat's boss tactics stay unfenced too.
  it("carries the assistant turn's asked entity onto the collapsed turn", () => {
    const { collapsed } = turnsToCollapsedTurns([
      { id: "u1", role: "user", text: "wheatley fight" },
      { id: "a1", role: "assistant", text: "answer", asked_entity: "Wheatley" },
    ]);
    expect(collapsed[0]?.askedEntity).toBe("Wheatley");
  });

  it("falls back to an empty asked entity for a turn without one of its own", () => {
    const { collapsed } = turnsToCollapsedTurns([
      { id: "u1", role: "user", text: "wheatley fight" },
      { id: "a1", role: "assistant", text: "answer" },
    ]);
    expect(collapsed[0]?.askedEntity).toBeUndefined();
  });
});
