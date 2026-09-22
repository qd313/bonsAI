/**
 * Title: Ticking a model does not submit the enclosing Pull/Done form
 *
 * Purpose: Pins the fix for the "first tick downloads immediately" bug (one sighting 2026-09-19,
 * docs/test-evidence/plan61-PULL-MISSING-NAME-01.json's own notes: "selecting the very first
 * catalog model in a fresh picker session ... downloaded it immediately with no Pull selected
 * press and no confirmation, unlike every later selection in the same session which correctly
 * just queued").
 *
 * Root cause (same mechanism this codebase already found and fixed once before, in
 * ModelRoutingOrderModal.tsx, row PICKER-REORDER-02, 2026-09-04): Decky's `Button` renders a plain
 * `<button>` with no `type` attribute, which defaults to "submit". PullModelsModal is always
 * rendered inside Steam's own `ConfirmModal`, which renders a real `<form>` (embedded, inside
 * OllamaModelsHubModal's ConfirmModal; standalone, inside its own). A click on a Button whose
 * handler calls only `stopPropagation()` -- as every button here did except the custom-tag Pull
 * button, which already had `preventDefault()` -- still runs the browser's native default action
 * for a submit button: it submits the enclosing form, taking the modal's own OK/Done/Pull-selected
 * path instead of, or in addition to, the button's own effect. That is a plausible, previously-
 * proven way for ticking one model to also fire the form's real OK path on the very same press.
 *
 * Does not: prove this was the *only* contributor to the exact device sequence recorded in the
 * evidence file (the open-weight Tier 2 confirm dialog nested inside that one press adds real
 * complexity this test does not attempt to reconstruct) -- it proves the concrete, fixable defect
 * this codebase has already hit once before is also present here, and is now fixed the same way.
 */
import type { FormEvent } from "react";
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PullModelsModal } from "./PullModelsModal";

function renderInForm(onSubmit: (e: FormEvent<HTMLFormElement>) => void) {
  return render(
    <form onSubmit={onSubmit}>
      <PullModelsModal activeRoutingTag={null} onCancel={() => {}} onPullAccepted={() => {}} embedded />
    </form>
  );
}

describe("PullModelsModal buttons do not submit an enclosing form", () => {
  it("ticking an uninstalled model's checkbox does not submit the form", () => {
    const onSubmit = vi.fn((e: FormEvent<HTMLFormElement>) => e.preventDefault());
    const { container } = renderInForm(onSubmit);

    const tick = container.querySelector(
      '[aria-label="Select qwen2.5vl:3b to pull"]'
    ) as HTMLButtonElement;
    expect(tick).not.toBeNull();
    fireEvent.click(tick);

    expect(onSubmit).not.toHaveBeenCalled();
    // The tick itself still ran -- preventDefault on the click stops the browser's default submit
    // action, not the handler's own effect.
    expect(container.querySelector('[aria-label="Deselect qwen2.5vl:3b"]')).not.toBeNull();
  });

  it("pressing the Filters button does not submit the form", () => {
    const onSubmit = vi.fn((e: FormEvent<HTMLFormElement>) => e.preventDefault());
    const { container } = renderInForm(onSubmit);

    const filtersBtn = container.querySelector(".bonsai-pullmodels-filters-button") as HTMLButtonElement;
    fireEvent.click(filtersBtn);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(container.querySelector(".bonsai-pullmodels-filterpanel-close")).not.toBeNull();
  });

  it("pressing the refresh button does not submit the form", () => {
    const onSubmit = vi.fn((e: FormEvent<HTMLFormElement>) => e.preventDefault());
    const { container } = renderInForm(onSubmit);

    const refreshBtn = container.querySelector('[aria-label="Refresh model catalog"]') as HTMLButtonElement;
    fireEvent.click(refreshBtn);

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
