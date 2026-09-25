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
import { STREAM_SCRAMBLE_OFF } from "../features/stream-scramble/streamScrambleContext";

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
    streamScramble: STREAM_SCRAMBLE_OFF,
    onStreamScrambleChange: () => {},
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

describe("DeveloperTab Animations section: scramble switch shows and hides its rows", () => {
  it("renders none of the three scramble rows when the switch is off", () => {
    render(<DeveloperTab {...baseProps({ streamScramble: { ...STREAM_SCRAMBLE_OFF, enabled: false } })} />);
    expect(screen.queryByText("How letters settle")).toBeNull();
    expect(screen.queryByText("Scrambled letter colour")).toBeNull();
    expect(screen.queryByText(/How long each letter scrambles/)).toBeNull();
  });

  it("renders the style and colour rows once the switch is on", () => {
    render(<DeveloperTab {...baseProps({ streamScramble: { ...STREAM_SCRAMBLE_OFF, enabled: true } })} />);
    expect(screen.queryByText("How letters settle")).toBeTruthy();
    expect(screen.queryByText("Scrambled letter colour")).toBeTruthy();
  });

  it("renders the settle-time row only for the settle style, not chip or tail", () => {
    const { rerender } = render(
      <DeveloperTab
        {...baseProps({ streamScramble: { ...STREAM_SCRAMBLE_OFF, enabled: true, style: "settle" } })}
      />,
    );
    expect(screen.queryByText(/How long each letter scrambles/)).toBeTruthy();

    rerender(
      <DeveloperTab {...baseProps({ streamScramble: { ...STREAM_SCRAMBLE_OFF, enabled: true, style: "chip" } })} />,
    );
    expect(screen.queryByText(/How long each letter scrambles/)).toBeNull();

    rerender(
      <DeveloperTab {...baseProps({ streamScramble: { ...STREAM_SCRAMBLE_OFF, enabled: true, style: "tail" } })} />,
    );
    expect(screen.queryByText(/How long each letter scrambles/)).toBeNull();
  });

  it("the Scramble animation switch reflects the setting it was given", () => {
    render(<DeveloperTab {...baseProps({ streamScramble: { ...STREAM_SCRAMBLE_OFF, enabled: true } })} />);
    const toggle = document.querySelector('[label="Scramble animation"]');
    expect(toggle).toBeTruthy();
    expect((toggle as unknown as { checked?: unknown }).checked).toBe(true);
  });

  it("a How-letters-settle button calls onStreamScrambleChange with just the style patch", () => {
    const onStreamScrambleChange = vi.fn();
    render(
      <DeveloperTab
        {...baseProps({
          streamScramble: { ...STREAM_SCRAMBLE_OFF, enabled: true, style: "settle" },
          onStreamScrambleChange,
        })}
      />,
    );
    fireEvent.click(screen.getByText("Chip pace"));
    expect(onStreamScrambleChange).toHaveBeenCalledWith({ style: "chip" });
  });

  it("a settle-time button calls onStreamScrambleChange with just the settleMs patch", () => {
    const onStreamScrambleChange = vi.fn();
    render(
      <DeveloperTab
        {...baseProps({
          streamScramble: { ...STREAM_SCRAMBLE_OFF, enabled: true, style: "settle", settleMs: 400 },
          onStreamScrambleChange,
        })}
      />,
    );
    fireEvent.click(screen.getByText("600"));
    expect(onStreamScrambleChange).toHaveBeenCalledWith({ settleMs: 600 });
  });

  it("a Scrambled-letter-colour button calls onStreamScrambleChange with just the colour patch", () => {
    const onStreamScrambleChange = vi.fn();
    render(
      <DeveloperTab
        {...baseProps({
          streamScramble: { ...STREAM_SCRAMBLE_OFF, enabled: true, color: "green" },
          onStreamScrambleChange,
        })}
      />,
    );
    fireEvent.click(screen.getByText("Cyan"));
    expect(onStreamScrambleChange).toHaveBeenCalledWith({ color: "cyan" });
  });
});

describe("DeveloperTab Animations section: Preset suggestions row moved in unchanged", () => {
  it("still renders in the new section and still calls its setter", () => {
    const setPresetChipAnimation = vi.fn();
    render(
      <DeveloperTab
        {...baseProps({
          presetChipAnimation: "carousel",
          setPresetChipAnimation,
        })}
      />,
    );
    expect(screen.queryByText("Preset suggestions")).toBeTruthy();
    fireEvent.click(screen.getByText("fade"));
    expect(setPresetChipAnimation).toHaveBeenCalledWith("fade");
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
