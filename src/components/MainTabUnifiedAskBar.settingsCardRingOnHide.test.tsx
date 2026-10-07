/**
 * Title: The ring goes to the question box when the Steam settings list goes away under it
 * Purpose: Pin the fix for the Deck measurement of 2026-10-02 (plan79-P79-M1-TRAP-try3.json, try F):
 *          with Steam's ring on a row of the settings list above the question box, the box's text
 *          changed so the list closed, and the page was left with no ring anywhere until the next
 *          press. Here the real Ask bar is drawn with the list showing, Steam's ring marker
 *          (`gpfocus`) is put on a row, the list is made to go away, and the test asks where the
 *          marker is now -- the same thing the Deck check reads -- then walks Down from there.
 * Used for: useAskBarSettingsCardRows.ts (the hand-back) inside MainTabUnifiedAskBar.tsx.
 * Solves: the older test of the typing hand-back only ever kept the list on screen, the one case
 *         that already worked; the case the Deck hit (the list gone in the same paint) was untested.
 * Does not: model Steam's own choice of where a lost ring goes; it models Steam's transfer (the
 *         box's nav node taking the marker) and Steam following a plain focus() between siblings.
 */
import React from "react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

const hoisted = vi.hoisted(() => ({
  props: new Map<Element, Record<string, unknown>>(),
  /** How many times a Steam transfer (TakeFocus) ran. */
  transfers: 0,
}));

/** Move Steam's ring marker the way Steam does: off every element, onto one. */
function placeRing(el: Element): void {
  el.ownerDocument.querySelectorAll(".gpfocus").forEach((e) => e.classList.remove("gpfocus"));
  el.classList.add("gpfocus");
  (el as HTMLElement).focus?.();
}

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const RealTextField = stubs.TextField;
  const RealButton = stubs.Button;
  /** A stand-in for Steam: fills in each control's navRef with a TakeFocus that moves the ring. */
  function useSteamNode(props: Record<string, unknown>, own: React.MutableRefObject<HTMLElement | null>) {
    React.useLayoutEffect(() => {
      if (own.current) hoisted.props.set(own.current, props);
      const navRef = props.navRef as { current: unknown } | undefined;
      if (navRef) navRef.current = {
          TakeFocus: () => {
            if (!own.current) return false;
            hoisted.transfers++;
            placeRing(own.current);
            return true;
          },
        };
    });
  }
  const TextField = React.forwardRef<HTMLDivElement, Record<string, unknown>>(function SteamTextField(props, ref) {
    const own = React.useRef<HTMLElement | null>(null);
    useSteamNode(props, own);
    return (
      <RealTextField
        {...props}
        tabIndex={-1}
        className="test-question-box"
        ref={(el: HTMLDivElement | null) => {
          own.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        }}
      />
    );
  });
  const Button = React.forwardRef<HTMLButtonElement, Record<string, unknown>>(function SteamButton(props, ref) {
    const own = React.useRef<HTMLElement | null>(null);
    useSteamNode(props, own);
    return (
      <RealButton
        {...props}
        ref={(el: HTMLButtonElement | null) => {
          own.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        }}
      />
    );
  });
  /* A Focusable is a container Steam bubbles an unhandled move up to (a Decky Button forwards none). */
  const Focusable = React.forwardRef<HTMLDivElement, Record<string, unknown>>(function SteamFocusable(props, ref) {
    const own = React.useRef<HTMLElement | null>(null);
    useSteamNode(props, own);
    return (
      <stubs.Focusable
        {...props}
        ref={(el: HTMLDivElement | null) => {
          own.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        }}
      />
    );
  });
  return { ...stubs, TextField, Button, Focusable };
});

import { MainTabUnifiedAskBar, type MainTabUnifiedAskBarProps } from "./MainTabUnifiedAskBar";
import { resetNavFocusRegistry } from "../utils/navFocusRegistry";

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
    unifiedInput: "brightness",
    usesNativeMultilineField: true,
    setIsUnifiedInputFocused: vi.fn(),
    isUnifiedInputFocused: false,
    setUnifiedInput: vi.fn(),
    setSelectedIndex: vi.fn(),
    filteredSettings: [],
    selectedIndex: -1,
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

const BRIGHTNESS = [
  "Settings > Display > Brightness",
  "Settings > Display > Enable Adaptive Brightness",
  "Settings > Display > Status LED Brightness",
];

function ring(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".gpfocus");
}

function questionBox(): HTMLElement {
  return document.querySelector<HTMLElement>(".test-question-box")!;
}

/**
 * One D-pad press as Steam delivers it: the ringed control's own move handler, else the nearest
 * container's (Steam bubbles an unhandled move up through its Focusables). A plain focus()
 * between siblings moves the page's focus, and Steam's ring follows it.
 */
function pressDown(): void {
  let at: Element | null = ring();
  let onMoveDown: (() => unknown) | undefined;
  while (at && !onMoveDown) {
    onMoveDown = hoisted.props.get(at)?.onMoveDown as (() => unknown) | undefined;
    at = at.parentElement;
  }
  act(() => {
    onMoveDown?.();
  });
  const active = document.activeElement;
  if (active && active !== document.body && active !== ring()) placeRing(active);
}

function renderBar(props: MainTabUnifiedAskBarProps) {
  const scope = document.createElement("div");
  scope.className = "bonsai-scope";
  document.body.appendChild(scope);
  const mount = document.createElement("div");
  scope.appendChild(mount);
  return render(<MainTabUnifiedAskBar {...props} />, { container: mount });
}

beforeEach(() => {
  hoisted.props.clear();
  hoisted.transfers = 0;
  resetNavFocusRegistry();
});

afterEach(() => {
  document.body.innerHTML = "";
  resetNavFocusRegistry();
});

describe("the Steam settings list goes away while the ring is on one of its rows", () => {
  it("emptying the box: the ring is on the question box at once, and Down then moves", () => {
    const { rerender, container } = renderBar(buildProps({ filteredSettings: BRIGHTNESS }));
    const rows = container.querySelectorAll("button.bonsai-settings-results-card-row");
    expect(rows.length).toBe(3);
    placeRing(rows[0]);

    rerender(<MainTabUnifiedAskBar {...buildProps({ unifiedInput: "", filteredSettings: [] })} />);

    expect(container.querySelector(".bonsai-settings-results-card")).toBeNull();
    expect(ring()).toBe(questionBox());

    // A bounded walk Down from there: every press moves to a stop not seen before, until the
    // end of the bar, and the first press is never a dead one. The box's Down lands on the mode
    // button under it (maintainer 2026-10-06); only the next Down reaches Ask.
    const seen = [ring()];
    for (let press = 0; press < 6; press++) {
      pressDown();
      if (ring() === seen[seen.length - 1]) break;
      expect(seen).not.toContain(ring());
      seen.push(ring());
    }
    expect(seen.length).toBeGreaterThan(1);
    expect(seen[1]?.classList.contains("bonsai-ask-mode-trigger")).toBe(true);
    expect(seen[2]?.classList.contains("bonsai-ask-primary")).toBe(true);
  });

  it("a new word with new matches: the row under the ring is gone, the ring goes to the box", () => {
    const { rerender, container } = renderBar(buildProps({ filteredSettings: BRIGHTNESS }));
    placeRing(container.querySelectorAll("button.bonsai-settings-results-card-row")[2]);

    rerender(
      <MainTabUnifiedAskBar
        {...buildProps({ unifiedInput: "bright", filteredSettings: ["Settings > Display > Night Mode"] })}
      />,
    );

    expect(ring()).toBe(questionBox());
  });

  it("the list goes away with the ring already on the box: no extra transfer", () => {
    const { rerender } = renderBar(buildProps({ filteredSettings: BRIGHTNESS }));
    placeRing(questionBox());
    hoisted.transfers = 0;

    rerender(<MainTabUnifiedAskBar {...buildProps({ unifiedInput: "", filteredSettings: [] })} />);

    expect(ring()).toBe(questionBox());
    expect(hoisted.transfers).toBe(0);
  });
});
