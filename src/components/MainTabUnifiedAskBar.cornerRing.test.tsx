/**
 * Title: The corner icons' focus ring shows whole inside the question box
 *
 * Purpose: Pin the plan 72 fix for docs/test-evidence/plan72-P-MIC-RING-handheld.json: the white
 * focus ring on the Voice input button was cut off on the right and at the bottom, because the
 * question box clips everything outside itself and the button sat 0 px from its right edge (a 2 px
 * nudge pushed it there) and 0 px from its bottom. The paperclip and the mode chip were cut at the
 * bottom too, the paperclip also on the left. The icons now keep the ring's full reach clear of
 * the box's inner edge on both sides and underneath, mirrored.
 *
 * Does not: Measure paint -- jsdom has no layout (design-language.md rule 6). The ring's reach is
 * read from the ring rule itself, the room from the icon row's own rule and constants, and the
 * rendered buttons are checked for the nudge that used to undo that room.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

import { MainTabUnifiedAskBar, type MainTabUnifiedAskBarProps } from "./MainTabUnifiedAskBar";
import { resetNavFocusRegistry } from "../utils/navFocusRegistry";
import { buildGamepadFocusRingStylesheet } from "../styles/sections/gamepadAndPullModels";
import { buildSection8Section } from "../styles/sections/section-8";
import {
  UNIFIED_INPUT_CORNER_RING_ROOM_PX,
  UNIFIED_INPUT_ICON_STRIP_PX,
} from "../features/unified-input/constants";

vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

/** The corner icons are 20 px square (their own min-width/min-height, section-8.ts). */
const ICON_PX = 20;
/** Today's icon row, before plan 72: 24 tall, the icons at its bottom with 4 px spare above. */
const ICON_ROW_BEFORE_PX = 24;

function buildProps(overrides: Partial<MainTabUnifiedAskBarProps> = {}): MainTabUnifiedAskBarProps {
  return {
    fullBleedRowStyle: {},
    presetCarouselHostRef: { current: null },
    unifiedInputHostRef: { current: null },
    unifiedInputFieldLayerRef: { current: null },
    unifiedInputMeasureRef: { current: null },
    attachActionHostRef: { current: null },
    askBarHostRef: { current: null },
    unifiedInputSurfacePx: 60,
    unifiedInput: "",
    usesNativeMultilineField: true,
    setIsUnifiedInputFocused: vi.fn(),
    isUnifiedInputFocused: false,
    setUnifiedInput: vi.fn(),
    filteredSettings: [],
    onSettingClick: vi.fn(),
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
    isQamSetting: vi.fn(() => false),
    ...overrides,
  };
}

/** How far the shared white ring reaches past a button: its outline plus offset, or its widest glow. */
function ringReachPx(): number {
  const css = buildGamepadFocusRingStylesheet();
  const rule = css.match(/\.bonsai-scope \.bonsai-askbar-target\.gpfocus,[^{]*\{([^}]*)\}/);
  expect(rule).toBeTruthy();
  const body = rule![1]!;
  const outline = Number(body.match(/outline:\s*([\d.]+)px/)![1]);
  const offset = Number(body.match(/outline-offset:\s*([\d.]+)px/)![1]);
  const spreads = [...body.matchAll(/0 0 0 ([\d.]+)px/g)].map((m) => Number(m[1]));
  return Math.max(outline + offset, ...spreads);
}

/** The icon row's own padding on one side, from its rule in section-8.ts. */
function iconRowPaddingPx(side: "left" | "right" | "bottom"): number {
  const css = buildSection8Section();
  const rule = css.match(/\.bonsai-scope \.bonsai-unified-input-bottom-actions\s*\{([^}]*)\}/);
  expect(rule).toBeTruthy();
  const decl = rule![1]!.match(new RegExp(`padding-${side}:\\s*([\\d.]+)px\\s*!important`));
  expect(decl).toBeTruthy();
  return Number(decl![1]);
}

afterEach(() => {
  document.body.innerHTML = "";
  resetNavFocusRegistry();
});

describe("the corner icons' focus ring", () => {
  it("reaches 5 px past a button (its soft glow), which is the room kept for it", () => {
    expect(ringReachPx()).toBe(5);
    expect(UNIFIED_INPUT_CORNER_RING_ROOM_PX).toBeGreaterThanOrEqual(ringReachPx());
  });

  it("ends inside the question box's clip on the left, the right and the bottom", () => {
    const reach = ringReachPx();
    for (const side of ["left", "right", "bottom"] as const) {
      expect(iconRowPaddingPx(side)).toBeGreaterThanOrEqual(reach);
    }
    // Mirrored: the paperclip's room on the left is the mic's room on the right.
    expect(iconRowPaddingPx("left")).toBe(iconRowPaddingPx("right"));
  });

  it("is not undone by a nudge on the mic or the Stop button", () => {
    const { container, rerender } = render(<MainTabUnifiedAskBar {...buildProps()} />);
    const idle = container.querySelectorAll<HTMLElement>(".bonsai-unified-input-corner-right");
    expect(idle.length).toBeGreaterThan(0);
    for (const el of idle) expect(el.style.transform).toBe("");
    rerender(<MainTabUnifiedAskBar {...buildProps({ isAsking: true })} />);
    const asking = container.querySelectorAll<HTMLElement>(".bonsai-unified-input-corner-right");
    expect(asking.length).toBeGreaterThan(0);
    for (const el of asking) expect(el.style.transform).toBe("");
  });

  it("keeps the typed text exactly as far from the icons' tops as before", () => {
    // The typed text is drawn anchored to the icon row's top, so what matters is the spare room
    // above the icons inside the row: 4 px before plan 72, and 4 px now.
    const before = ICON_ROW_BEFORE_PX - 0 - ICON_PX;
    const now = UNIFIED_INPUT_ICON_STRIP_PX - iconRowPaddingPx("bottom") - ICON_PX;
    expect(now).toBe(before);
  });

  it("makes the question box taller by exactly the room under the icons, and no more", () => {
    expect(UNIFIED_INPUT_ICON_STRIP_PX).toBe(ICON_ROW_BEFORE_PX + UNIFIED_INPUT_CORNER_RING_ROOM_PX);
    const { container } = render(<MainTabUnifiedAskBar {...buildProps({ unifiedInputSurfacePx: 60 })} />);
    const strip = container.querySelector<HTMLElement>(".bonsai-unified-input-bottom-actions");
    expect(strip?.style.height).toBe(`${UNIFIED_INPUT_ICON_STRIP_PX}px`);
    const layer = strip?.parentElement;
    expect(layer?.style.minHeight).toBe(`${60 + UNIFIED_INPUT_ICON_STRIP_PX}px`);
  });
});
