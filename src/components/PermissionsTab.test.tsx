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
