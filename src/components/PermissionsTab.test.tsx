import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useState } from "react";

import type { BonsaiCapabilities } from "../data/bonsaiSettingsSchema";
import { PermissionsTab } from "./PermissionsTab";

const ALL_ON: BonsaiCapabilities = {
  filesystem_write: true,
  media_library_access: true,
  steam_logs_read: true,
  steam_web_api: true,
  microphone_access: true,
  internet_downloads: true,
};

function Harness({ kidsLockActive }: { kidsLockActive: boolean }) {
  const [capabilities, setCapabilities] = useState<BonsaiCapabilities>(ALL_ON);
  return (
    <>
      <PermissionsTab
        capabilities={capabilities}
        setCapabilities={setCapabilities}
        kidsLockActive={kidsLockActive}
      />
      <pre data-testid="stored-caps">{JSON.stringify(capabilities)}</pre>
    </>
  );
}

describe("PermissionsTab kids lock", () => {
  it("shows banner and disables toggles visually off without mutating stored caps", () => {
    render(<Harness kidsLockActive={true} />);
    expect(screen.getByText(/Parental controls active/i)).toBeTruthy();
    expect(screen.getByText(/bonsAI does not filter what the AI says/i)).toBeTruthy();
    expect(document.querySelector('[data-bonsai-kids-lock-banner="1"]')).toBeTruthy();

    const toggles = document.querySelectorAll('[data-decky-ui="ToggleField"]');
    expect(toggles.length).toBe(5);
    for (const toggle of toggles) {
      expect(toggle.hasAttribute("disabled")).toBe(true);
      expect(toggle.hasAttribute("checked")).toBe(false);
    }

    expect(screen.getByTestId("stored-caps").textContent).toBe(JSON.stringify(ALL_ON));
  });

  it("hides banner and enables toggles when unlocked", () => {
    const setCapabilities = vi.fn();
    const { rerender } = render(
      <PermissionsTab
        capabilities={ALL_ON}
        setCapabilities={setCapabilities}
        kidsLockActive={true}
      />
    );
    expect(screen.getByText(/Parental controls active/i)).toBeTruthy();

    rerender(
      <PermissionsTab
        capabilities={ALL_ON}
        setCapabilities={setCapabilities}
        kidsLockActive={false}
      />
    );

    expect(screen.queryByText(/Parental controls active/i)).toBeNull();
    const toggles = document.querySelectorAll('[data-decky-ui="ToggleField"]');
    expect(toggles.length).toBe(5);
    for (const toggle of toggles) {
      expect(toggle.hasAttribute("disabled")).toBe(false);
    }
    expect(document.querySelector('[label="Save files to Desktop"]')).toBeTruthy();
    expect(document.querySelector('[label="Read game & screenshot context"]')).toBeTruthy();
  });

  it("keeps stored capability values across a lock/unlock cycle in the harness", () => {
    const { rerender } = render(<Harness kidsLockActive={true} />);
    expect(screen.getByTestId("stored-caps").textContent).toBe(JSON.stringify(ALL_ON));
    rerender(<Harness kidsLockActive={false} />);
    expect(screen.getByTestId("stored-caps").textContent).toBe(JSON.stringify(ALL_ON));
  });
});

/**
 * Plan 93 lane B9 (the maintainer, 2026-10-13: "every warning should be much shorter"). Read at the
 * level the Deck shows: the words drawn on the Permissions tab, counted by whitespace.
 */
const words = (text: string | null | undefined) => (text ?? "").split(/\s+/).filter(Boolean).length;

describe("PermissionsTab wording stays short", () => {
  it("the intro is at most 40 words", () => {
    render(<Harness kidsLockActive={false} />);
    const intro = document.querySelector("[data-bonsai-permissions-intro]");
    expect(intro).toBeTruthy();
    expect(words(intro!.textContent)).toBeLessThanOrEqual(40);
  });

  it("every switch description is at most 12 words", () => {
    render(<Harness kidsLockActive={false} />);
    const toggles = document.querySelectorAll('[data-decky-ui="ToggleField"]');
    expect(toggles.length).toBe(5);
    for (const toggle of toggles) {
      const description = toggle.getAttribute("description");
      expect(description, toggle.getAttribute("label") ?? "").toBeTruthy();
      expect(words(description), `${toggle.getAttribute("label")}: ${description}`).toBeLessThanOrEqual(12);
    }
  });

  it("the Steam ban lookup switch keeps its old words (the maintainer, 2026-10-14)", () => {
    render(<Harness kidsLockActive={false} />);
    const row = document.querySelector('[label="Steam ban lookup"]');
    expect(row!.getAttribute("description")).toBe(
      "For the bonsai:vac-check command. API key lives in Developer → Integrations.",
    );
  });

  it("the parental-controls banner is at most 40 words and keeps the facts that matter", () => {
    render(<Harness kidsLockActive={true} />);
    const banner = document.querySelector('[data-bonsai-kids-lock-banner="1"]');
    expect(words(banner!.textContent)).toBeLessThanOrEqual(40);
    expect(banner!.textContent).toMatch(/every switch here is off/i);
    expect(banner!.textContent).toMatch(/Ask still works/i);
    expect(banner!.textContent).toMatch(/does not filter what the AI says/i);
  });
});
