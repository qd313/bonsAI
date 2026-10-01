import { afterEach, describe, expect, it } from "vitest";

import { setFrozenTestChips, type PresetPrompt } from "../../data/presets";
import { nextSlotPreset, startSlotRotation } from "./presetSlotRotation";

const p = (text: string): PresetPrompt => ({ text, category: "test" });

describe("preset slot rotation", () => {
  afterEach(() => {
    setFrozenTestChips([]);
  });

  it("fills the row with the first seeds and queues the rest", () => {
    const { first, rotation } = startSlotRotation([p("a"), p("b"), p("c")], 2);
    expect(first.map((s) => s.text)).toEqual(["a", "b"]);
    expect(rotation.queue.map((s) => s.text)).toEqual(["c"]);
    expect(rotation.lastIntroduced).toBe("b");
  });

  /* The whole point of the helper: a seeding of three must be shown in full through two chips. */
  it("shows the third seed before drawing from the pool", () => {
    const { first, rotation } = startSlotRotation([p("a"), p("b"), p("c")], 2);
    const s1 = nextSlotPreset(first[0]!, new Set(["a", "b"]), rotation);
    expect(s1.next.text).toBe("c");
    expect(s1.rotation.queue).toEqual([]);
  });

  it("never hands a slot what the other slot is showing", () => {
    const other = "How do I fix stuttering?"; // a real pool entry, so the random draw could pick it
    const { first, rotation } = startSlotRotation([p("only"), p(other)], 2);
    let state = { next: first[0]!, rotation };
    for (let i = 0; i < 12; i++) {
      state = nextSlotPreset(state.next, new Set([state.next.text, other]), state.rotation);
      expect(state.next.text).not.toBe(other);
    }
  });

  it("never repeats what just showed once it is on the pool", () => {
    const { first, rotation } = startSlotRotation([p("only")], 1);
    const s1 = nextSlotPreset(first[0]!, new Set(["only"]), rotation);
    expect(s1.next.text).not.toBe("only");
    const s2 = nextSlotPreset(s1.next, new Set([s1.next.text]), s1.rotation);
    expect(s2.next.text).not.toBe(s1.next.text);
    expect(s2.next.text).not.toBe("only");
  });

  /* "First frozen entry not on screen" walked a batch only because three chips were on screen.
     With fewer it ping-ponged. Round-robin from the last entry the ROW introduced — not per slot —
     walks the whole batch in order across both chips, and never shows one entry twice at once. */
  it("walks a pinned QA batch in order across two slots, past its third entry, and wraps", () => {
    setFrozenTestChips(["q1", "q2", "q3", "q4"]);
    const { first, rotation } = startSlotRotation([p("q1"), p("q2"), p("q3")], 2);
    const slots = [first[0]!, first[1]!];
    let rot = rotation;
    const introduced: string[] = [];
    for (let i = 0; i < 6; i++) {
      const slot = i % 2;
      const visible = new Set(slots.map((s) => s.text));
      const step = nextSlotPreset(slots[slot]!, visible, rot);
      rot = step.rotation;
      slots[slot] = step.next;
      introduced.push(step.next.text);
      expect(new Set(slots.map((s) => s.text)).size).toBe(2);
    }
    expect(introduced).toEqual(["q3", "q4", "q1", "q2", "q3", "q4"]);
  });

  /* Plan 78 F: fade, plain and decode used to refill from the fixed pool only, so the game's own
     chips were dealt once at open and never again. They now take the one next-chip rule. */
  const game = [
    { text: "G1", category: "strategy", domain: "strategy" },
    { text: "G2", category: "strategy", domain: "strategy" },
  ];

  it("with one chip, a general chip is followed by the game's own, from the candidates", () => {
    const { first, rotation } = startSlotRotation([p("a")], 1);
    const step = nextSlotPreset(first[0]!, new Set(["a"]), rotation, undefined, { ragCandidates: game, random: () => 0.9 });
    expect(["G1", "G2"]).toContain(step.next.text);
    expect(step.next.ragTip).toBe(true);
    expect(step.rotation.gameRound).toEqual([step.next.text]);
  });

  it("with two chips, the chip that stays decides what comes in beside it", () => {
    const seeds = [p("a"), { ...p("G1"), ragTip: true }, p("c")];
    const { first, rotation } = startSlotRotation(seeds, 2);
    // Slot 0 (general "a") leaves while the game's chip stays: the newcomer is general (roll 0.9).
    const a = nextSlotPreset(first[0]!, new Set(["a", "G1"]), rotation, undefined, { ragCandidates: game, random: () => 0.9 });
    expect(a.next.text).toBe("c");
    // Slot 1 (the game's chip) leaves while a general one stays: the newcomer is the game's.
    const b = nextSlotPreset(first[1]!, new Set(["a", "G1"]), rotation, undefined, { ragCandidates: game, random: () => 0.9 });
    expect(b.next.ragTip).toBe(true);
    expect(b.next.text).toBe("G2");
  });

  it("a pinned QA batch still wins over the game's chips and walks in order", () => {
    setFrozenTestChips(["q1", "q2", "q3", "q4"]);
    const { first, rotation } = startSlotRotation([p("q1"), p("q2"), p("q3")], 1);
    const step = nextSlotPreset(first[0]!, new Set(["q1"]), rotation, undefined, { ragCandidates: game, random: () => 0 });
    expect(step.next.text).toBe("q2");
  });
});
