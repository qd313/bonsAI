/**
 * Title: One line per setting: a switch row keeps Steam's own switch and hands its text to the strip
 * Purpose: Pin plan 91 § 3b's dense row: a switch is Steam's ToggleField with no description (Steam draws one
 *          under the label itself, which is what made the rows tall), its move handlers passed straight to
 *          Steam's row, and its longer text carried on the row for the help strip; the other kinds wrap the
 *          control the tab draws and carry the same two attributes; a row with no text carries none.
 * Used for: DenseRow.tsx.
 */
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const toggleProps = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock("@decky/ui", async () => {
  const stubs = (await import("../../test-harness/fakeDeckyUi")) as unknown as Record<string, unknown>;
  const Real = stubs.ToggleField as React.ComponentType<Record<string, unknown>>;
  return {
    ...stubs,
    ToggleField: (p: Record<string, unknown>) => {
      toggleProps.current = p;
      return <Real {...p} />;
    },
  };
});

import { DenseRow, DenseSwitchRow } from "./DenseRow";
import { wordsOf } from "../../test-harness/fakeDeckyUi";

describe("a dense row", () => {
  it("a switch is Steam's ToggleField with no description; its text and name ride on the row", () => {
    const up = () => true;
    const { container } = render(
      <DenseSwitchRow label="Terse mode" help="Speed mode only." checked={false} onChange={() => {}} nav={{ onMoveUp: up }}>
        <span>status</span>
      </DenseSwitchRow>,
    );
    const row = container.querySelector<HTMLElement>(".bonsai-dense-row--switch")!;
    expect(row.getAttribute("data-bonsai-help")).toBe("Speed mode only.");
    expect(row.getAttribute("data-bonsai-help-label")).toBe("Terse mode");
    /* Steam gets the name as a scaled element (steamWordsScaled.test.tsx); its words are still the row's name. */
    expect(wordsOf(toggleProps.current.label)).toBe("Terse mode");
    expect(toggleProps.current.description).toBeUndefined();
    expect(toggleProps.current.onMoveUp).toBe(up);
    expect(row.textContent).toContain("status");
  });

  it("a slider, a choice or a button wraps the tab's own control; a row with no text carries none", () => {
    const { container } = render(
      <>
        <DenseRow kind="slider" label="Reply style" help="Bullet-first vs paragraph depth.">
          <div data-control="slider" />
        </DenseRow>
        <DenseRow kind="button" label="AI models">
          <button />
        </DenseRow>
      </>,
    );
    const slider = container.querySelector<HTMLElement>(".bonsai-dense-row--slider")!;
    expect(slider.getAttribute("data-bonsai-help")).toBe("Bullet-first vs paragraph depth.");
    expect(slider.querySelector("[data-control]")).not.toBeNull();
    expect(container.querySelector(".bonsai-dense-row--button")!.hasAttribute("data-bonsai-help")).toBe(false);
  });
});
