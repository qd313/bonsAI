/*
 * Found on device 2026-08-28 (row PICKER-REORDER-02): pressing A on a row's Up or Down button
 * reorders the list correctly, but the rows re-render keyed by tag and nothing owns the ring for the
 * next press -- the button the ring was on now belongs to a different row, and it takes an extra,
 * wasted-looking press to re-acquire on the moved model's own button.
 *
 * First fix (plain `.focus()` in an effect keyed on the reorder) failed on device 2026-09-04, build
 * 49241e7 (rerun evidence: runs/PICKER-REORDER-02-rerun-ring-follows-moved-row.json, step 2), two
 * ways: the ring left the picker entirely for a hidden Ollama tab button behind the modal (the picker
 * is a `ModalDialogOverlay`, and React relocating the focused row's DOM node during the tag-keyed
 * reorder reads to Steam's focus manager as that node going away); and, worse, calling that transfer
 * synchronously stole the release half of the very A press that triggered the reorder, so the press
 * saved and closed the picker instead of just moving the highlight.
 *
 * Second fix (`takeRowFocus` / `TakeFocus`, deferred past the press) also failed on device the same
 * night, build f9a4c17 (runs/PICKER-REORDER-02-redo-ring-follows-moved-row.json, step 3): a reorder
 * press still closed the picker, and so did A on *Reset to defaults* -- which is not a reorder or a
 * refocus at all. Root cause: the picker's content sits inside Steam's `ConfirmModal`, which renders
 * a `<form>`, and Decky's `Button` renders a plain `<button>` with no `type`, so it is a submit
 * button -- Steam's A press clicks it, which submits the form, which is the modal's own OK/Done path.
 *
 * The fix now: every row Up/Down `onClick` and the Reset `onClick` call `event.preventDefault()` on
 * top of the existing `takeRowFocus`/`focusRowButton` transfer, which stays as the second fix left it.
 */
import type { FormEvent } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  focusRowButton,
  ModelRoutingOrderModal,
  REORDER_FOCUS_TRANSFER_DELAY_MS,
  takeRowFocus,
  type ModelRoutingOrderModalProps,
  type RowButtonRefs,
} from "./ModelRoutingOrderModal";
import { elementHasFocus } from "../utils/uiDocument";
import type { NavRefHolder } from "../utils/navFocusRegistry";
import { PULL_MODEL_CATALOG } from "../data/pullModelCatalog";

function baseProps(overrides: Partial<ModelRoutingOrderModalProps> = {}): ModelRoutingOrderModalProps {
  const tags = ["model-a", "model-b", "model-c", "model-d"];
  return {
    kind: "text",
    installedTags: tags,
    catalogByTag: new Map(),
    modelPolicyTier: "non_foss",
    modelPolicyNonFossUnlocked: true,
    modelAllowHighVramFallbacks: true,
    savedOrder: tags,
    onSave: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
}

function upButton(container: HTMLElement, tag: string): HTMLElement {
  const el = container.querySelector(`[aria-label="Move ${tag} up"]`);
  if (!el) throw new Error(`no Up button for ${tag}`);
  return el as HTMLElement;
}

function downButton(container: HTMLElement, tag: string): HTMLElement {
  const el = container.querySelector(`[aria-label="Move ${tag} down"]`);
  if (!el) throw new Error(`no Down button for ${tag}`);
  return el as HTMLElement;
}

/** DOM order of the rows, read off the Up buttons' own aria-labels rather than assuming layout. */
function tagOrder(container: HTMLElement): string[] {
  return [...container.querySelectorAll('[aria-label^="Move "][aria-label$=" up"]')].map((el) => {
    const label = el.getAttribute("aria-label") ?? "";
    return label.replace(/^Move /, "").replace(/ up$/, "");
  });
}

/** Advance past both the outer transfer delay and the inner one-tick focus step. */
function runFocusTransfer() {
  act(() => {
    vi.advanceTimersByTime(REORDER_FOCUS_TRANSFER_DELAY_MS + 1);
  });
}

describe("takeRowFocus", () => {
  it("calls TakeFocus on the moved row's own holder", () => {
    const takeFocus = vi.fn();
    const holder: NavRefHolder = { current: { TakeFocus: takeFocus } };
    takeRowFocus(holder);
    expect(takeFocus).toHaveBeenCalledTimes(1);
    expect(takeFocus).toHaveBeenCalledWith(true);
  });

  it("does not touch any other row's holder", () => {
    const wantedTakeFocus = vi.fn();
    const otherTakeFocus = vi.fn();
    takeRowFocus({ current: { TakeFocus: wantedTakeFocus } });
    expect(wantedTakeFocus).toHaveBeenCalledTimes(1);
    expect(otherTakeFocus).not.toHaveBeenCalled();
  });

  it("is a no-op, not a throw, when the row is unregistered or not yet mounted", () => {
    expect(() => takeRowFocus(undefined)).not.toThrow();
    expect(() => takeRowFocus({ current: null })).not.toThrow();
    expect(() => takeRowFocus({ current: {} })).not.toThrow();
  });

  it("swallows a throw from TakeFocus itself", () => {
    const holder: NavRefHolder = {
      current: {
        TakeFocus: () => {
          throw new Error("Steam declined");
        },
      },
    };
    expect(() => takeRowFocus(holder)).not.toThrow();
  });
});

describe("focusRowButton", () => {
  function makeRefs(upDisabled: boolean, downDisabled: boolean): RowButtonRefs {
    const up = document.createElement("button");
    up.disabled = upDisabled;
    const down = document.createElement("button");
    down.disabled = downDisabled;
    document.body.append(up, down);
    return { up, down };
  }

  it("focuses the same-direction button when it is enabled", () => {
    const refs = makeRefs(false, false);
    focusRowButton(refs, "up");
    expect(elementHasFocus(refs.up ?? null)).toBe(true);
    expect(elementHasFocus(refs.down ?? null)).toBe(false);

    const refs2 = makeRefs(false, false);
    focusRowButton(refs2, "down");
    expect(elementHasFocus(refs2.down ?? null)).toBe(true);
  });

  it("falls back to the other button when the same-direction one is disabled", () => {
    const refs = makeRefs(true, false);
    focusRowButton(refs, "up");
    expect(elementHasFocus(refs.up ?? null)).toBe(false);
    expect(elementHasFocus(refs.down ?? null)).toBe(true);
  });

  it("does nothing when the row has no registered refs", () => {
    expect(() => focusRowButton(undefined, "up")).not.toThrow();
  });
});

describe("ModelRoutingOrderModal reorder keeps the highlight and the picker open", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reorders immediately and does not save or close the picker once the deferred transfer runs", () => {
    // The exact regression from the 2026-09-04 rerun: a synchronous focus transfer stole the A
    // press's release and it fell through to the ConfirmModal's own OK, saving and closing the
    // picker. Advancing well past the transfer delay must not trigger onSave/onClose.
    const onSave = vi.fn();
    const onClose = vi.fn();
    const { container } = render(<ModelRoutingOrderModal {...baseProps({ onSave, onClose })} />);

    fireEvent.click(downButton(container, "model-a"));
    expect(tagOrder(container)).toEqual(["model-b", "model-a", "model-c", "model-d"]);

    act(() => {
      vi.advanceTimersByTime(REORDER_FOCUS_TRANSFER_DELAY_MS + 500);
    });

    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(tagOrder(container)).toEqual(["model-b", "model-a", "model-c", "model-d"]);
  });

  it("puts the ring back on its own Up button, after the deferred transfer, when that button stays enabled", () => {
    const { container } = render(<ModelRoutingOrderModal {...baseProps()} />);

    // model-c: index 2 -> 1. Its Up button stays enabled at the new index 1 (not the top row).
    fireEvent.click(upButton(container, "model-c"));
    expect(tagOrder(container)).toEqual(["model-a", "model-c", "model-b", "model-d"]);

    // Nothing has moved focus yet -- the transfer is deferred.
    expect(elementHasFocus(upButton(container, "model-c"))).toBe(false);

    runFocusTransfer();

    const primary = upButton(container, "model-c");
    expect(elementHasFocus(primary)).toBe(true);
    expect(elementHasFocus(downButton(container, "model-c"))).toBe(false);
  });

  it("falls back to the row's other button once the primary is disabled by landing at an end", () => {
    const { container } = render(<ModelRoutingOrderModal {...baseProps()} />);

    // model-b: index 1 -> 0. Its Up button is disabled at index 0, so the ring must land on Down.
    fireEvent.click(upButton(container, "model-b"));
    expect(tagOrder(container)).toEqual(["model-b", "model-a", "model-c", "model-d"]);

    runFocusTransfer();

    const disabledPrimary = upButton(container, "model-b");
    expect(disabledPrimary.hasAttribute("disabled")).toBe(true);
    expect(elementHasFocus(disabledPrimary)).toBe(false);
    expect(elementHasFocus(downButton(container, "model-b"))).toBe(true);
  });

  it("keeps the highlight through a second consecutive move on the same row", () => {
    const { container } = render(<ModelRoutingOrderModal {...baseProps()} />);

    fireEvent.click(downButton(container, "model-a")); // a: 0 -> 1
    runFocusTransfer();
    expect(elementHasFocus(downButton(container, "model-a"))).toBe(true);

    fireEvent.click(downButton(container, "model-a")); // a: 1 -> 2
    runFocusTransfer();
    expect(tagOrder(container)).toEqual(["model-b", "model-c", "model-a", "model-d"]);
    expect(elementHasFocus(downButton(container, "model-a"))).toBe(true);
  });
});

describe("row and Reset buttons do not submit an enclosing form", () => {
  // Decky's Button renders a plain <button> with no `type`, which defaults to "submit". The
  // picker's real container (Steam's ConfirmModal) renders a <form>, so on device an un-prevented
  // click submitted it and took the modal's own OK/Done path -- measured 2026-09-04, build f9a4c17
  // (runs/PICKER-REORDER-02-redo-ring-follows-moved-row.json, step 3): a reorder press closed the
  // picker, and so did A on Reset to defaults, which is what showed this was never about the reorder
  // or the refocus. The test-harness Button/ButtonItem stub renders a real <button> with no `type`
  // for exactly this reason -- a stub <div> could never reproduce a form submitting on click.
  function renderInForm(onSubmit: (e: FormEvent<HTMLFormElement>) => void) {
    return render(
      <form onSubmit={onSubmit}>
        <ModelRoutingOrderModal {...baseProps()} />
      </form>,
    );
  }

  it("clicking a row's Down button does not submit the form", () => {
    const onSubmit = vi.fn((e: FormEvent<HTMLFormElement>) => e.preventDefault());
    const { container } = renderInForm(onSubmit);

    fireEvent.click(downButton(container, "model-a"));

    expect(onSubmit).not.toHaveBeenCalled();
    // The reorder itself still ran -- preventDefault on the click stops the browser's default
    // submit action, not the handler's own effect.
    expect(tagOrder(container)).toEqual(["model-b", "model-a", "model-c", "model-d"]);
  });

  it("clicking a row's Up button does not submit the form", () => {
    const onSubmit = vi.fn((e: FormEvent<HTMLFormElement>) => e.preventDefault());
    const { container } = renderInForm(onSubmit);

    fireEvent.click(upButton(container, "model-b"));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("clicking Reset to defaults does not submit the form", () => {
    const onSubmit = vi.fn((e: FormEvent<HTMLFormElement>) => e.preventDefault());
    renderInForm(onSubmit);

    fireEvent.click(screen.getByText("Reset to defaults"));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});

// Roadmap bug found while explaining the code 2026-09-15: a model with no catalog entry at all
// (a custom pull, or one no longer in an updated catalog) was never flagged, known-heavy list or
// not, and read exactly like a known-small model. See modelSizeWarning (modelRoutingOrder.ts).
describe("size warning badge", () => {
  it("warns that the size is unknown for an installed model the catalog does not have", () => {
    // baseProps' four tags (model-a..model-d) have no catalog entry -- catalogByTag is empty.
    const { container } = render(<ModelRoutingOrderModal {...baseProps()} />);
    expect(container.textContent).toContain("Size unknown — may be too large");
  });

  it("shows no size warning for a model with a known small size", () => {
    const small = PULL_MODEL_CATALOG.find((e) => e.tag === "qwen2.5:1.5b")!;
    const catalogByTag = new Map([[small.tag, small]]);
    const { container } = render(
      <ModelRoutingOrderModal
        {...baseProps({ installedTags: [small.tag], savedOrder: [small.tag], catalogByTag })}
      />,
    );
    expect(container.textContent).not.toContain("Size unknown");
    expect(container.textContent).not.toContain("High VRAM off");
  });

  it("keeps the existing high-VRAM warning, not the unknown one, for a known large model", () => {
    const { container } = render(
      <ModelRoutingOrderModal
        {...baseProps({
          installedTags: ["gemma3:27b"],
          savedOrder: ["gemma3:27b"],
          modelAllowHighVramFallbacks: false,
        })}
      />,
    );
    expect(container.textContent).toContain("High VRAM off");
    expect(container.textContent).not.toContain("Size unknown");
  });
});
