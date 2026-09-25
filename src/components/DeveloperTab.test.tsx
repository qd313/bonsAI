/*
 * Found on device (runs/TAB-RESUME-MODE-01-h-restore-C-and-remeasure-clear-chips-button.json): with no
 * frozen batch pinned, `ButtonItem disabled={devFrozenTestChips.length === 0}` still left the button as
 * a D-pad stop at the bottom of Developer, so leaving the tab cost one dead press. A disabled Decky
 * button does not leave Steam's nav graph, so "disabled" is not "not a stop" -- the row above already
 * says "None pinned" in that state, so the button is rendered only once there is something to clear.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DeveloperTab, type DeveloperTabProps } from "./DeveloperTab";

const CLEAR_LABEL = "Clear frozen test chips";

function baseProps(overrides: Partial<DeveloperTabProps> = {}): DeveloperTabProps {
  return {
    capturedErrors: [],
    onClearErrors: () => {},
    desktopDebugNoteAutoSave: false,
    setDesktopDebugNoteAutoSave: () => {},
    desktopAskVerboseLogging: false,
    setDesktopAskVerboseLogging: () => {},
    desktopAppLogLevel: "default",
    setDesktopAppLogLevel: () => {},
    filesystemWrite: false,
    presetChipAnimation: "fade",
    setPresetChipAnimation: () => {},
    steamWebApiKey: "",
    setSteamWebApiKey: () => {},
    showOnscreenDebugHud: false,
    setShowOnscreenDebugHud: () => {},
    devForceSessionRagChips: false,
    setDevForceSessionRagChips: () => {},
    devPreloadAskModel: false,
    setDevPreloadAskModel: () => {},
    devFrozenTestChips: [],
    setDevFrozenTestChips: () => {},
    ragHybridRetrievalEnabled: false,
    setRagHybridRetrievalEnabled: () => {},
    tabResumeMode: "resume",
    setTabResumeMode: () => {},
    ...overrides,
  };
}

describe("DeveloperTab warm-Ask-model-at-boot toggle", () => {
  function checkedOf(el: Element | null): unknown {
    return (el as unknown as { checked?: unknown } | null)?.checked;
  }

  it("renders unchecked when the setting is off (shipped default)", () => {
    render(<DeveloperTab {...baseProps({ devPreloadAskModel: false })} />);
    const toggle = document.querySelector('[label="Warm the Ask model at boot"]');
    expect(toggle).toBeTruthy();
    expect(checkedOf(toggle)).toBe(false);
  });

  it("renders checked when the setting is on", () => {
    render(<DeveloperTab {...baseProps({ devPreloadAskModel: true })} />);
    const toggle = document.querySelector('[label="Warm the Ask model at boot"]');
    expect(checkedOf(toggle)).toBe(true);
  });
});

describe("DeveloperTab frozen test chips clear button", () => {
  it("renders no stop named Clear frozen test chips when no batch is pinned", () => {
    render(<DeveloperTab {...baseProps({ devFrozenTestChips: [] })} />);
    expect(screen.queryByText(CLEAR_LABEL)).toBeNull();
  });

  it("renders the button, enabled, once a batch is pinned", () => {
    const setDevFrozenTestChips = vi.fn();
    render(
      <DeveloperTab
        {...baseProps({
          devFrozenTestChips: ["what is the best strategy for the final boss"],
          setDevFrozenTestChips,
        })}
      />,
    );
    const button = screen.getByText(CLEAR_LABEL);
    expect(button).toBeTruthy();
    fireEvent.click(button);
    expect(setDevFrozenTestChips).toHaveBeenCalledWith([]);
  });
});
