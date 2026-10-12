/**
 * Title: A folded section's summary line, against the drawing
 * Purpose: Pin plan 91 § 2b's summary rule to the drawing's own lines for the five Ollama sections
 *          (docs/demos/mockup-board-2/src/42-tabs-data.js and 44-tabs.js, the state they draw: the AI
 *          on this Deck, the knowledge base on, Balanced, Terse mode off, Thinking Off, default
 *          timeouts, models kept 5 minutes), word for word, plus the counted switches of a bigger section.
 * Used for: sectionSummary.ts.
 */
import { describe, expect, it } from "vitest";
import { summarizeSection } from "./sectionSummary";

describe("a folded section's summary, as the drawing writes it", () => {
  it("Where AI runs: two switches, each named", () => {
    expect(
      summarizeSection("Where AI runs", [
        { kind: "switch", label: "Run AI on this Deck", on: true },
        { kind: "switch", label: "Start the AI with the Deck", on: true },
        { kind: "button", label: "Update AI & models" },
        { kind: "button", label: "Browse models…" },
        { kind: "button", label: "Test connection" },
      ]),
    ).toBe("Run AI on this Deck on · Start the AI with the Deck on");
  });

  it("Knowledge base (offline): one switch", () => {
    expect(
      summarizeSection("Knowledge base (offline)", [
        { kind: "switch", label: "Use local knowledge base", on: true },
        { kind: "button", label: "Update knowledge base" },
        { kind: "button", label: "Remove" },
      ]),
    ).toBe("Use local knowledge base on");
  });

  it("Reply style: the slider named after its section shows its value alone; the choice before the switch", () => {
    expect(
      summarizeSection("Reply style", [
        { kind: "slider", label: "Reply style", value: "Balanced" },
        { kind: "switch", label: "Terse mode", on: false },
        { kind: "choice", label: "Thinking", value: "Off" },
      ]),
    ).toBe("Balanced · Thinking: Off · Terse mode off");
  });

  it("Connection tuning: a slider and a switch", () => {
    expect(
      summarizeSection("Connection tuning", [
        { kind: "switch", label: "Custom timeouts", on: false },
        { kind: "slider", label: "Keep models loaded", value: "5m" },
      ]),
    ).toBe("Keep models loaded: 5m · Custom timeouts off");
  });

  it("AI models: a button alone has nothing to sum up", () => {
    expect(summarizeSection("AI models", [{ kind: "button", label: "AI models… — Open source only (recommended)" }])).toBe("");
  });

  it("three switches or more are counted, not named (Developer's Logging & exports)", () => {
    expect(
      summarizeSection("Logging & exports", [
        { kind: "choice", label: "App activity logging to Desktop", value: "Off" },
        { kind: "switch", label: "Auto-save chat to Desktop notes", on: false },
        { kind: "switch", label: "Verbose Ask logging to Desktop notes", on: true },
        { kind: "switch", label: "Force session RAG chips (QA)", on: false },
      ]),
    ).toBe("App activity logging to Desktop: Off · 1 of 3 on");
  });

  it("a switch named after its own section shows only on or off", () => {
    expect(summarizeSection("Remember what I typed", [{ kind: "switch", label: "Remember what I typed", on: false }])).toBe("off");
  });
});
