/**
 * D58 #3: a pinned QA batch always reseeds to its first three entries verbatim, so the chip row's
 * 60-second walk had nothing to signal an Ask happened and never restarted. MainTabPresetRow
 * derives an `askRestartToken` from `isAsking` independent of the seed text, bumping it exactly
 * when an Ask completes (isAsking true -> false, which is when useBonsaiAskOrchestration actually
 * reseeds `suggestedPrompts` -- not when an Ask starts).
 *
 * `MainTabPresetAnimatedChips` is stubbed here so the token reaching it can be read directly off
 * the DOM; its own restart behavior once it receives a bumped token is covered in
 * MainTabPresetAnimatedChips.test.tsx.
 */
import React from "react";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MainTabPresetRow } from "./MainTabPresetRow";
import type { PresetPrompt } from "./presets";
import { resetFakeDeckyRpc } from "../../test-harness/fakeDeckyRpc";

vi.mock("./MainTabPresetAnimatedChips", () => ({
  MainTabPresetAnimatedChips: (props: { askRestartToken?: number }) => (
    <div data-testid="chips-stub" data-ask-restart-token={String(props.askRestartToken ?? "")} />
  ),
}));

const seed = (text: string): PresetPrompt => ({ text, category: "general" });
const seeds = [seed("alpha"), seed("bravo"), seed("charlie")];

function tokenOf(container: HTMLElement): string | null {
  return container.querySelector('[data-testid="chips-stub"]')?.getAttribute("data-ask-restart-token") ?? null;
}

function renderRow(isAsking: boolean) {
  return (
    <MainTabPresetRow
      suggestedPrompts={seeds}
      showPluginHelpChip={false}
      onOpenPluginHelp={vi.fn()}
      presetChipAnimation="carousel"
      setUnifiedInput={vi.fn()}
      isAsking={isAsking}
      focusUnifiedTextField={() => false}
      presetCarouselHostRef={React.createRef<HTMLDivElement | null>()}
    />
  );
}

describe("MainTabPresetRow askRestartToken (D58 #3)", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
  });

  it("starts at 0 on a cold mount", () => {
    const { container } = render(renderRow(false));
    expect(tokenOf(container)).toBe("0");
  });

  it("does not bump when an Ask starts (isAsking false -> true)", () => {
    const { container, rerender } = render(renderRow(false));
    const before = tokenOf(container);

    rerender(renderRow(true));
    expect(tokenOf(container)).toBe(before);
  });

  it("bumps when an Ask completes (isAsking true -> false), which is when reseeding happens", () => {
    const { container, rerender } = render(renderRow(false));
    const before = tokenOf(container);

    rerender(renderRow(true));
    rerender(renderRow(false));
    expect(tokenOf(container)).not.toBe(before);
  });

  it("bumps once per completed Ask, not once per render", () => {
    const { container, rerender } = render(renderRow(false));
    rerender(renderRow(true));
    rerender(renderRow(false));
    const afterFirstAsk = tokenOf(container);

    // Re-rendering with the same (already-false) isAsking must not bump again -- only a fresh
    // true -> false transition should.
    rerender(renderRow(false));
    expect(tokenOf(container)).toBe(afterFirstAsk);

    rerender(renderRow(true));
    rerender(renderRow(false));
    expect(tokenOf(container)).not.toBe(afterFirstAsk);
  });
});
