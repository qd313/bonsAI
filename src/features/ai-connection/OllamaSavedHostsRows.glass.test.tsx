/**
 * Title: Saved PC host buttons wear the plugin's button look
 *
 * Purpose: With the AI on a PC, the saved-address button and "Save current PC address as quick host"
 * must be drawn like the Ollama tab's other buttons (frosted grey, ring class), not Steam's plain
 * light button (maintainer, 2026-10-17).
 *
 * Used for: plan 96 row F23.
 *
 * Solves: a saved-address button with no background of its own showed white on the Deck.
 *
 * Does not: check the ring's shape or the D-pad walk; other tests own those.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OllamaSavedHostsRows } from "./OllamaSavedHostsRows";
import { FOCUS_RING_BTN_CLASS, SETTINGS_GLASS_BTN_BACKGROUND } from "../../styles/settingsGlassButton";

describe("saved PC host buttons", () => {
  it("both draw with the frosted button background and the ring class", () => {
    render(
      <OllamaSavedHostsRows
        namedOllamaHosts={[{ label: "PC", host: "192.168.1.20" }]}
        setNamedOllamaHosts={() => {}}
        ollamaIp="192.168.1.20"
        onOllamaIpChange={() => {}}
        onPersistOllamaIp={() => {}}
      />,
    );
    for (const name of ["PC", "Save current PC address as quick host"]) {
      const btn = screen.getByText(name).closest("button") as HTMLElement;
      expect(btn.className).toContain(FOCUS_RING_BTN_CLASS);
      expect(btn.style.background).toBe(SETTINGS_GLASS_BTN_BACKGROUND);
    }
  });
});
