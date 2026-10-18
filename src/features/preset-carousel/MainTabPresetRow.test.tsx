/**
 * The help chip owns the suggestion row until it is dismissed (maintainer, 2026-09-01); only then
 * do the preset chips mount. Before this the help chip sat above the chips as its own row.
 */
import React from "react";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MainTabPresetRow } from "./MainTabPresetRow";
import type { PresetPrompt } from "./presets";
import { PRESET_VISIBLE_SLOTS } from "./presetRowLayout";
import { resetFakeDeckyRpc } from "../../test-harness/fakeDeckyRpc";

const seed = (text: string): PresetPrompt => ({ text, category: "general" });

function renderRow(showPluginHelpChip: boolean, presetSingleChip = false) {
  return render(
    <MainTabPresetRow
      suggestedPrompts={[seed("alpha"), seed("bravo"), seed("charlie")]}
      showPluginHelpChip={showPluginHelpChip}
      onOpenPluginHelp={vi.fn()}
      presetChipAnimation="static"
      setUnifiedInput={vi.fn()}
      isAsking={false}
      focusUnifiedTextField={() => false}
      presetCarouselHostRef={React.createRef<HTMLDivElement | null>()}
      presetSingleChip={presetSingleChip}
    />,
  );
}

describe("MainTabPresetRow", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
  });

  it("the help chip owns the whole row while it shows", () => {
    const { container } = renderRow(true);
    expect(container.querySelector(".bonsai-preset-help-chip")).toBeTruthy();
    expect(container.querySelectorAll(".bonsai-preset-carousel-slot")).toHaveLength(0);
  });

  it("once the help chip is dismissed, the preset chips take the row", () => {
    const { container } = renderRow(false);
    expect(container.querySelector(".bonsai-preset-help-chip")).toBeNull();
    expect(container.querySelectorAll(".bonsai-preset-carousel-slot")).toHaveLength(PRESET_VISIBLE_SLOTS);
  });

  /* "One suggestion chip" setting (roadmap [chips] ★★★): two stays the default; this proves the
     row actually forwards the setting down rather than only accepting the prop and ignoring it. */
  it("passes presetSingleChip through to the chips, dropping the row to one", () => {
    const { container } = renderRow(false, true);
    expect(container.querySelectorAll(".bonsai-preset-carousel-slot")).toHaveLength(1);
  });
});
