/**
 * Title: The "Using bonsAI" box reads Deck first, home PC second
 *
 * Purpose: A player holding a Steam Deck opens "Using bonsAI" and must first read how to run the AI
 * on the Deck itself (switch on Run AI on this Deck, press Install Ollama on the Ollama tab). Entering
 * a home PC's address comes second. The box is drawn for real and its words are read in order.
 *
 * Does not: test the Ollama tab itself (src/features/ai-connection/ does).
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PluginQuickStartInstructionsBody } from "./pluginQuickStartInstructions";

describe("the quick-start box", () => {
  const text = () => render(<PluginQuickStartInstructionsBody />).container.textContent ?? "";

  it("names Install Ollama and the Deck's own switch before it names the home PC", () => {
    const words = text();
    const install = words.indexOf("Install Ollama");
    const deckSwitch = words.indexOf("Run AI on this Deck");
    const pcAddress = words.indexOf("PC address");
    expect(install).toBeGreaterThan(-1);
    expect(deckSwitch).toBeGreaterThan(-1);
    expect(pcAddress).toBeGreaterThan(install);
    expect(pcAddress).toBeGreaterThan(deckSwitch);
  });

  it("no longer opens with a home PC's address or the old warning", () => {
    const words = text();
    expect(words).not.toMatch(/main rig/i);
    expect(words).not.toMatch(/LAN IP/);
    expect(words).not.toMatch(/You must do this/);
  });
});
