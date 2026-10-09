/**
 * Title: The strip's ends hold still: Left on the paperclip, Right on the small Ask
 * Purpose: Pin the roadmap fix for "Left from the Ask button, and from the paperclip, hands the
 *          highlight to Steam's Quick Access rail" (measured 2026-09-15 evening,
 *          docs/test-evidence/plan55-trap-run3-new-chat-with-live-turn.json steps 2 and 3 and
 *          plan55-trap-run5-empty-chat-session-row-hades-running.json steps 3 and 4). Both
 *          buttons were the leftmost stop in their own row and had no sibling further left, so
 *          nothing ever claimed Left -- Steam's own "past the edge" nav ran and threw the ring
 *          out of the plugin entirely. Since plan 84 step 2 the small Ask is the RIGHT end of the
 *          question box's strip, so the same rule holds Right on it, and its Left walks the strip.
 * Used for: the paperclip's onMoveLeft / onButtonDown props in MainTabUnifiedAskBar.tsx, and the
 *          small Ask's onMoveLeft / onMoveRight in AskStripSendButtons.tsx.
 * Solves: same shape, same fix as the collapsed-history pill's Left
 *         (earlierPillLeftNavHandlers, MainTabChatTranscript.tsx) -- claim the move on
 *         onMoveLeft itself, the handler Steam actually invokes on device, with the
 *         onButtonDown twin guarded by isDeckDirectionLeftEvent only for the string-shaped
 *         presses tests and desktop keyboards deliver.
 * Does not: assert anything through a keyboard event -- both handlers are read straight off the
 *         real Focusable/Button props, never fired as a DOM keydown (the focus law).
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

const hoisted = vi.hoisted(() => ({
  buttonProps: [] as Array<Record<string, unknown>>,
}));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const RealButton = stubs.Button;
  const CapturingButton = React.forwardRef<HTMLButtonElement, Record<string, unknown>>(
    function CapturingButton(props, ref) {
      React.useLayoutEffect(() => {
        hoisted.buttonProps.push(props);
      });
      return <RealButton {...props} ref={ref} />;
    },
  );
  return { ...stubs, Button: CapturingButton };
});

import { MainTabUnifiedAskBar, type MainTabUnifiedAskBarProps } from "./MainTabUnifiedAskBar";
import { resetNavFocusRegistry } from "../utils/navFocusRegistry";

/**
 * The shape Decky actually delivers to `onButtonDown`: a `GamepadEvent`, which is a `CustomEvent`
 * whose `detail.button` is a numeric `GamepadButton` (`@decky/ui`, `components/FooterLegend.d.ts`)
 * -- the same shape focusNavigation.test.ts uses, rather than a guessed string, so this proves the
 * guard against the real event Steam sends, not just its desktop-keyboard fallback.
 */
function gamepadEvent(button: number): unknown {
  return { type: "gamepadbuttondown", detail: { button, source: 0 } };
}
const DIR_LEFT = 11;
const DIR_RIGHT = 12;

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

function buttonProps(className: string): Record<string, unknown> | undefined {
  return hoisted.buttonProps.find((p) => (p.className as string)?.includes(className));
}

beforeEach(() => {
  hoisted.buttonProps = [];
  resetNavFocusRegistry();
});

afterEach(() => {
  document.body.innerHTML = "";
  resetNavFocusRegistry();
});

/*
 * Plan 84 step 2 moved Ask into the question box's strip, at its right end: Ask is no longer the
 * leftmost stop of a row of its own, so its Left walks the strip (to the mic, or the X while the box
 * has words), and it is Right on Ask that must hold still now (docs/focus-graph.md, "The ask box's
 * strip"). The paperclip is still the strip's left end and keeps its own Left below.
 */
describe("the small Ask at the strip's right end", () => {
  it("claims Right on onMoveRight and holds still", () => {
    render(<MainTabUnifiedAskBar {...buildProps()} />);
    const ask = buttonProps("bonsai-ask-primary");
    expect(ask).toBeTruthy();
    const onMoveRight = ask?.onMoveRight as () => boolean;
    expect(onMoveRight).toBeTruthy();
    expect(onMoveRight()).toBe(true);
  });

  it("walks Left to the mic beside it, not out of the plugin", () => {
    const { container } = render(<MainTabUnifiedAskBar {...buildProps()} />);
    const ask = buttonProps("bonsai-ask-primary");
    expect((ask?.onMoveLeft as () => boolean)()).toBe(true);
    expect(document.activeElement).toBe(container.querySelector('button[aria-label="Voice input"]'));
  });
});

describe("Left on the paperclip", () => {
  it("claims the move on onMoveLeft and holds still", () => {
    render(<MainTabUnifiedAskBar {...buildProps()} />);
    const paperclip = buttonProps("bonsai-unified-input-corner-left");
    expect(paperclip).toBeTruthy();
    const onMoveLeft = paperclip?.onMoveLeft as () => boolean;
    expect(onMoveLeft).toBeTruthy();
    expect(onMoveLeft()).toBe(true);
  });

  it("also claims a Left-shaped onButtonDown, for the string-shaped presses tests and desktop keyboards deliver", () => {
    render(<MainTabUnifiedAskBar {...buildProps()} />);
    const paperclip = buttonProps("bonsai-unified-input-corner-left");
    const onButtonDown = paperclip?.onButtonDown as (button: unknown) => boolean;
    expect(onButtonDown(gamepadEvent(DIR_LEFT))).toBe(true);
    expect(onButtonDown(gamepadEvent(DIR_RIGHT))).toBe(false);
  });
});
