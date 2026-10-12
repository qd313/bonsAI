/**
 * Title: The UI scale section skips a greyed Apply by its own state, not by asking the button
 * Purpose: On the Deck a greyed (disabled) Decky button still takes the ring, so a hop that skips a greyed
 *          control by asking the button "are you disabled?" lands the ring on it all the same (plan 92 night
 *          two, rule 4). The jsdom test stand-in for Button is a real <button> that refuses focus when
 *          disabled, which is false on the device. Here Button is replaced by a stand-in that, like the Deck,
 *          lets a greyed button take focus: it shows greyed with `aria-disabled` and never sets the DOM
 *          `disabled` flag. The section must still decline the hop to Apply while Apply is running, because
 *          it knows the state itself.
 * Used for: SettingsTabUiScaleSection.tsx (Apply and Reset hops).
 * Does not: Prove the ring on the device; the Deck walk of the Settings tab does.
 */
import React from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../test-harness/steamRing");
  const ToggleField = (p: Record<string, unknown>) => {
    const { label, checked: _c, onChange: _o, description: _d, disabled: _x, ...rest } = p;
    return <SteamRingFocusable {...rest} focusable aria-label={String(label)} data-decky-ui="ToggleField" />;
  };
  /* The Deck's Button: a greyed one still takes focus. */
  const Button = React.forwardRef<HTMLButtonElement, Record<string, unknown>>(function GreyedButton(p, ref) {
    const { children, disabled, onMoveUp: _u, onMoveDown: _d, onMoveLeft: _l, onMoveRight: _r, onOKButton: _k, ...rest } = p;
    return (
      <button ref={ref} data-decky-ui="Button" aria-disabled={disabled ? "true" : undefined} {...rest}>
        {children as React.ReactNode}
      </button>
    );
  });
  return { ...stubs, Focusable: SteamRingFocusable, ToggleField, Button };
});

import { SettingsTabUiScaleSection } from "./SettingsTabUiScaleSection";
import type { SteamEl } from "../test-harness/steamRing";

afterEach(() => cleanup());

function draw(autoOn: boolean) {
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const view = render(
    <SettingsTabUiScaleSection
      uiScaleAutoEnabled={autoOn}
      uiScaleManualProfile="handheld"
      appliedProfileId="handheld"
      onApply={() => pending}
      onMoveUpFromFirst={() => true}
      onMoveDownFromApply={() => true}
    />,
  );
  const apply = view.getByText(/Apply UI scale|Applying…/).closest("button") as HTMLButtonElement;
  const toggle = view.container.querySelector<SteamEl>('[data-decky-ui="ToggleField"]')!;
  return { ...view, apply, toggle, release };
}

describe("the UI scale section's hops to Apply", () => {
  it("lands on Apply from the switch when Apply is not running", () => {
    const { apply, toggle } = draw(true);
    let claimed: unknown;
    act(() => {
      claimed = toggle.__nav?.onMoveDown?.();
    });
    expect(claimed).toBe(true);
    expect(document.activeElement).toBe(apply);
  });

  it("declines the hop while Apply is running, though the greyed button would take the ring", async () => {
    const { apply, toggle } = draw(true);
    await act(async () => {
      fireEvent.click(apply);
    });
    expect(apply.textContent).toBe("Applying…");
    /* The stand-in is not disabled to the DOM, so a hop that asked the button would land on it. */
    expect(apply.disabled).toBe(false);
    let claimed: unknown;
    act(() => {
      claimed = toggle.__nav?.onMoveDown?.();
    });
    expect(claimed).toBe(false);
    expect(document.activeElement).not.toBe(apply);
  });

  it("goes to Apply again once it has finished", async () => {
    const { apply, toggle, release } = draw(true);
    await act(async () => {
      fireEvent.click(apply);
    });
    await act(async () => {
      release();
    });
    expect(apply.textContent).toBe("Apply UI scale");
    let claimed: unknown;
    act(() => {
      claimed = toggle.__nav?.onMoveDown?.();
    });
    expect(claimed).toBe(true);
    expect(document.activeElement).toBe(apply);
  });
});
