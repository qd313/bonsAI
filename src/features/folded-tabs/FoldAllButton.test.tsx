/**
 * Title: The floating Open all button: how the ring gets there, what A does, and its three ways back
 * Purpose: Pin the Deck check P91-FOLD-ALL-BUTTON: Right from a section line, or Down from the last one
 *          (plan 93), puts Steam's ring on the button; A opens every section, the label reads "Close all"
 *          and the ring stays on the button; Up, Left and B each put the ring back on the line it came from,
 *          also after the tab was unmounted and mounted again in between (lessons-learned § 3); Down and
 *          Right hold still; and its fill, text and border are the AI models button's own, by construction.
 * Used for: FoldAllButton.tsx, FoldedSection.tsx (Right), foldedTabsStore.ts (the way back).
 * Does not: Model Steam's spatial walk; every move here is one the plugin makes itself, through Steam's
 *           own transfer (steamRing.tsx moves the ring only for a transfer, never for a plain focus()).
 */
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../test-harness/steamRing");
  return { ...stubs, Focusable: SteamRingFocusable };
});

import { FoldedSection, chainIds, type FoldChainSection } from "./FoldedSection";
import { FoldAllButton } from "./FoldAllButton";
import { resetFoldedTabsForTests } from "./foldedTabsStore";
import { registerShoulderSwitch, resetShoulderSwitchForTests } from "../../shared/dpad/shoulderSwitch";
import { resetNavFocusRegistry } from "../../utils/navFocusRegistry";
import { putSteamRingOn, steamRingHolder, type SteamEl } from "../../test-harness/steamRing";
import { SETTINGS_GLASS_BTN, FOCUS_RING_BTN_CLASS } from "../../styles/settingsGlassButton";

const TAB = "fold-all-test";
const CHAIN: FoldChainSection[] = [{ id: "where" }, { id: "kb" }, { id: "reply" }, { id: "tuning" }, { id: "models" }];

function Tab() {
  return (
    <div>
      {CHAIN.map((s) => (
        <FoldedSection key={s.id} tab={TAB} chain={CHAIN} id={s.id} title={s.id} summary="">
          <span>rows</span>
        </FoldedSection>
      ))}
      <FoldAllButton tab={TAB} sections={chainIds(CHAIN)} />
    </div>
  );
}

const lineOf = (c: HTMLElement, id: string) => c.querySelector<HTMLElement>(`[data-bonsai-fold-line="${id}"]`) as SteamEl;
const hostOf = (c: HTMLElement) => c.querySelector<HTMLElement>("[data-bonsai-fold-all]") as SteamEl;
const buttonOf = (c: HTMLElement) => hostOf(c).querySelector<HTMLButtonElement>("button")!;
const openCount = (c: HTMLElement) => c.querySelectorAll('.bonsai-fold-line[data-open="true"]').length;

/** Right from a section line, as Steam calls it, with the ring on that line first. */
function rightFrom(c: HTMLElement, id: string) {
  act(() => {
    putSteamRingOn(lineOf(c, id));
    lineOf(c, id).__nav?.onMoveRight?.();
  });
}

beforeEach(() => {
  resetFoldedTabsForTests();
  resetNavFocusRegistry();
});
afterEach(() => cleanup());

describe("the floating Open all button", () => {
  it("Right from a section line puts Steam's ring on the button", () => {
    const { container } = render(<Tab />);
    rightFrom(container, "reply");
    expect(steamRingHolder()).toBe(buttonOf(container));
  });

  it("A opens every section and reads Close all, with the ring still on the button; A again closes them all", () => {
    const { container } = render(<Tab />);
    rightFrom(container, "reply");
    expect(buttonOf(container).textContent).toContain("Open all");
    act(() => buttonOf(container).click());
    expect(openCount(container)).toBe(5);
    expect(buttonOf(container).textContent).toContain("Close all");
    expect(buttonOf(container).textContent).toContain("⊟");
    expect(steamRingHolder()).toBe(buttonOf(container));
    act(() => buttonOf(container).click());
    expect(openCount(container)).toBe(0);
    expect(buttonOf(container).textContent).toContain("Open all");
  });

  for (const way of ["onMoveUp", "onMoveLeft", "onCancelButton"] as const) {
    it(`${way === "onCancelButton" ? "B" : way.replace("onMove", "")} puts the ring back on the line it came from`, () => {
      const { container } = render(<Tab />);
      rightFrom(container, "tuning");
      expect(steamRingHolder()).toBe(buttonOf(container));
      act(() => {
        (hostOf(container).__nav?.[way] as ((e?: unknown) => unknown) | undefined)?.({ preventDefault() {} });
      });
      expect(steamRingHolder()).toBe(lineOf(container, "tuning"));
    });
  }

  for (const way of ["onMoveRight", "onMoveDown"] as const) {
    it(`${way.replace("onMove", "")} on the button holds still, and claims the press`, () => {
      const { container } = render(<Tab />);
      rightFrom(container, "kb");
      let claimed: unknown;
      act(() => {
        claimed = hostOf(container).__nav?.[way]?.();
      });
      expect(claimed).toBe(true);
      expect(steamRingHolder()).toBe(buttonOf(container));
    });
  }

  it("Down from the last section line puts the ring on the button; Up returns to that line, also after A", () => {
    const { container } = render(<Tab />);
    act(() => {
      putSteamRingOn(lineOf(container, "models"));
      lineOf(container, "models").__nav?.onMoveDown?.();
    });
    expect(steamRingHolder()).toBe(buttonOf(container));
    act(() => {
      hostOf(container).__nav?.onMoveUp?.();
    });
    expect(steamRingHolder()).toBe(lineOf(container, "models"));
    act(() => {
      lineOf(container, "models").__nav?.onMoveDown?.();
    });
    act(() => buttonOf(container).click());
    expect(openCount(container)).toBe(5);
    act(() => {
      hostOf(container).__nav?.onMoveUp?.();
    });
    expect(steamRingHolder()).toBe(lineOf(container, "models"));
  });

  it("the way back is kept outside the tab: Up still returns to the same line after the tab is rebuilt", () => {
    const first = render(<Tab />);
    rightFrom(first.container, "kb");
    first.unmount();
    const again = render(<Tab />);
    act(() => {
      putSteamRingOn(buttonOf(again.container));
      hostOf(again.container).__nav?.onMoveUp?.();
    });
    expect(steamRingHolder()).toBe(lineOf(again.container, "kb"));
  });

  it("is the tab's own plain button: the AI models button's class, fill, text colour and border", () => {
    const { container } = render(<Tab />);
    const button = buttonOf(container);
    expect(button.classList.contains(FOCUS_RING_BTN_CLASS)).toBe(true);
    expect(button.style.background).toBe(
      (() => {
        const probe = document.createElement("div");
        probe.style.background = String(SETTINGS_GLASS_BTN.background);
        return probe.style.background;
      })(),
    );
    expect(button.style.color).toBe("rgb(232, 238, 245)");
    expect(button.style.border).toContain("rgba(255, 255, 255, 0.22)");
  });
});

describe("LB and RB with the ring on the floating button (Deck, 2026-10-12: LB did nothing)", () => {
  afterEach(() => resetShoulderSwitchForTests());

  it("LB steps the tab back and RB steps it on, and the press is claimed", () => {
    const step = vi.fn();
    registerShoulderSwitch(step);
    const { container } = render(<Tab />);
    const host = hostOf(container);
    act(() => putSteamRingOn(buttonOf(container)));
    expect(host.__nav?.onButtonDown?.({ detail: { button: 5 } })).toBe(true);
    expect(step).toHaveBeenLastCalledWith(-1);
    expect(host.__nav?.onButtonDown?.({ detail: { button: 6 } })).toBe(true);
    expect(step).toHaveBeenLastCalledWith(1);
  });

  it("any other button is left alone, and with no tab bar to step nothing is claimed", () => {
    const step = vi.fn();
    const stop = registerShoulderSwitch(step);
    const { container } = render(<Tab />);
    const host = hostOf(container);
    expect(host.__nav?.onButtonDown?.({ detail: { button: 1 } })).toBeFalsy();
    expect(step).not.toHaveBeenCalled();
    stop();
    expect(host.__nav?.onButtonDown?.({ detail: { button: 5 } })).toBeFalsy();
  });
});
