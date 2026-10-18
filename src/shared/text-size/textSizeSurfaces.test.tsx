/**
 * Title: Text size, on the real chips, question box, Settings row and tab bar
 * Purpose: Render the pieces a person looks at on the Main and Settings tabs (a suggestion chip, the
 *          question box, the Text size row's words and buttons, the tab bar) under the real stylesheet
 *          inside a box that carries the chosen step, read the font size the browser would settle on,
 *          and check each one moves by the step on Small and Large and reads today's number on Normal.
 *          Then walk every element of all of them: each must move by the step exactly once, except the
 *          tab bar's LB and RB marks, which keep their size on purpose.
 * Used for: plan 89 S1, the Deck check "on Large the chip, the question box and a Settings label all
 *           measure bigger than on Normal".
 * Solves: The sizes written inline (a chip's 11, a label's 11) can only be seen on a rendered element;
 *         a stylesheet test cannot tell that one of them was left at a plain number.
 * Does not: Lay anything out, or check row heights (jsdom has none). That a row keeps its height is by
 *           construction (no height is touched) and a Deck check.
 */
import React from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  /* Decky's real TextField is a wrapper around a layout div around the INPUT; give the stub that shape. */
  const FieldWithInput = React.forwardRef<HTMLDivElement, Record<string, unknown>>(function FieldWithInput(props, ref) {
    return (
      <div ref={ref} className="Panel Focusable" data-decky-ui="TextField">
        <div className="_DialogLayout">
          <input className="DialogInput DialogTextInputBase Focusable" value={String(props.value ?? "")} readOnly />
        </div>
      </div>
    );
  });
  return { ...stubs, TextField: FieldWithInput };
});

import { MainTabUnifiedAskBar, type MainTabUnifiedAskBarProps } from "../../features/ask/bar/MainTabUnifiedAskBar";
import { SettingsTabChatTextSizeRow } from "../../features/settings/SettingsTabChatTextSizeRow";
import { PresetChipButton } from "../../features/preset-carousel/presetChipButton";
import { TabIndicatorBar } from "../../features/plugin-shell/TabIndicatorBar";
import { ALL_BONSAI_TAB_IDS } from "../../features/plugin-shell/tabTitles";
import { buildBonsaiScopeStylesheet } from "../../styles/bonsaiScopeStylesheet";
import { TEXT_SCALE, withTextScale } from "./chatTextSize";
import type { ChatTextSize } from "../../features/settings/bonsaiSettingsSchema";
import { makeFontSizeReader } from "../../test-harness/settledFontSize";

function askBarProps(): MainTabUnifiedAskBarProps {
  return {
    fullBleedRowStyle: {},
    presetCarouselHostRef: { current: null },
    unifiedInputHostRef: { current: null },
    unifiedInputFieldLayerRef: { current: null },
    unifiedInputMeasureRef: { current: null },
    attachActionHostRef: { current: null },
    askBarHostRef: { current: null },
    unifiedInputSurfacePx: 60,
    unifiedInput: "how do i parry",
    usesNativeMultilineField: true,
    setIsUnifiedInputFocused: vi.fn(),
    isUnifiedInputFocused: false,
    setUnifiedInput: vi.fn(),
    isAsking: false,
    ollamaIp: "192.168.1.50",
    onAskOllama: vi.fn(),
    onOpenScreenshotBrowser: vi.fn(),
    onTakeScreenshot: vi.fn(),
    onCancelAsk: vi.fn(),
    onMicInput: vi.fn(),
    selectedAttachment: null,
    setSelectedAttachment: vi.fn(),
    clearUnifiedInput: vi.fn(),
    showSearchClearButton: false,
    mediaError: "",
    askMode: "speed",
    onAskModeChange: vi.fn(),
  };
}

const CSS = buildBonsaiScopeStylesheet();

/** The pieces, in a box that carries the chosen step the way the plugin's root does. */
function draw(size: ChatTextSize) {
  return render(
    <div className="bonsai-scope" style={withTextScale({}, size)}>
      <TabIndicatorBar tabIds={ALL_BONSAI_TAB_IDS} currentTab="main" selectTab={vi.fn()} exitDown={() => true} />
      <div className="bonsai-preset-row-host">
        <PresetChipButton preset={{ text: "How do I parry?", category: "x", ragTip: true }} setUnifiedInput={vi.fn()} scroll={false} />
      </div>
      <MainTabUnifiedAskBar {...askBarProps()} />
      <div className="bonsai-settings-section-stack">
        <SettingsTabChatTextSizeRow setting={{ value: size, set: vi.fn() }} />
      </div>
    </div>,
  );
}

type Reads = { chip: number; questionBox: number; rowButton: number };

function readSurfaces(size: ChatTextSize): Reads {
  const { container, unmount } = draw(size);
  const read = makeFontSizeReader(CSS);
  const one = (sel: string): Element => {
    const el = container.querySelector(sel);
    expect(el, sel).not.toBeNull();
    return el!;
  };
  const reads = {
    chip: read(one("button.bonsai-preset-glass")),
    questionBox: read(one(".bonsai-unified-input-host input")),
    rowButton: read(one('[data-bonsai-chat-text-size-row="true"] button')),
  };
  unmount();
  return reads;
}

afterEach(cleanup);

describe("Text size on the chips, the question box and the Settings row", () => {
  const normal = readSurfaces("normal");

  // Plan 96 F22 (the maintainer's ask: smaller chip words); measured on the Deck: workshop:test-evidence/plan96-P96-F22-CHIP-MEASURE.json
  it("reads Normal as today's sizes: chip 11, question box 12, the row's buttons 12 (its words moved to the help strip)", () => {
    expect(normal).toEqual({ chip: 11, questionBox: 12, rowButton: 12 });
  });

  it("makes each one bigger on Large and smaller on Small, by exactly the step", () => {
    for (const size of ["small", "large"] as const) {
      const m = readSurfaces(size);
      for (const key of Object.keys(normal) as Array<keyof Reads>) {
        expect(m[key], `${size}: ${key}`).toBeCloseTo(normal[key] * TEXT_SCALE[size], 5);
      }
    }
    const large = readSurfaces("large");
    for (const key of Object.keys(normal) as Array<keyof Reads>) expect(large[key], key).toBeGreaterThan(normal[key]);
  });
});

describe("every element moves by the step once", () => {
  const sizes = (size: ChatTextSize): Map<string, number> => {
    const { container, unmount } = draw(size);
    const read = makeFontSizeReader(CSS);
    const out = new Map<string, number>();
    Array.from(container.querySelectorAll("*")).forEach((el, i) => {
      if (el.tagName === "STYLE") return;
      out.set(`${i}:${el.tagName.toLowerCase()}.${String(el.getAttribute("class") ?? "").split(/\s+/)[0]}`, read(el));
    });
    unmount();
    return out;
  };

  it("has no element left at a plain size and none scaled twice, apart from the LB and RB marks", () => {
    const normal = sizes("normal");
    const large = sizes("large");
    expect(large.size).toBe(normal.size);
    expect(normal.size).toBeGreaterThan(40);
    const left: string[] = [];
    for (const [key, n] of normal) {
      const ratio = large.get(key)! / n;
      const isMark = key.includes("bonsai-tab-bar__shoulder");
      const want = isMark ? 1 : TEXT_SCALE.large;
      if (Math.abs(ratio - want) > 1e-6) left.push(`${key}: ${n} -> ${large.get(key)}`);
    }
    expect(left, "elements that did not move by the step exactly once").toEqual([]);
  });
});
