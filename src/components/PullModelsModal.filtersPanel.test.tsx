/**
 * Title: The models screen's Filters panel — getting in, getting out, and the licence rows
 *
 * Purpose: Pins plan 62, § 3d: every filter chip row folded behind one "Filters · N on" button,
 * which opens a panel of tickable rows over the model list. The focus law says Steam calls a
 * Focusable's own move handlers and onActivate directly, never a DOM keydown, and a direction
 * press inside onButtonDown does not consume it — so every assertion here goes through the real
 * onClick / onMoveUp / onMoveDown / onCancelButton props the Filters button and its rows carry,
 * the same way MainTabUnifiedAskBar.settingsCardDpad.test.tsx proves the settings-results card.
 *
 * Covers: pressing the Filters button opens the panel and moves the ring to its first row (in);
 * Up from the first row, and B (onCancelButton) from any row, both close the panel and return the
 * ring to the Filters button (out); and the Licence rows report a pick through
 * onSelectModelPolicyTier exactly like the three Policy buttons they replaced, including the
 * Tier 3 "Any installed model" row staying greyed out until unlocked.
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";

const hoisted = vi.hoisted(() => ({
  buttonProps: [] as Array<Record<string, unknown>>,
}));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const RealButton = stubs.Button;
  const CapturingButton = React.forwardRef<HTMLButtonElement, Record<string, unknown>>(
    function CapturingButton(props, ref) {
      // Layout effect, not a plain assignment in the render body: always holds the props from the
      // most recently committed render, so a snapshot taken after a state change (opening the
      // panel, ticking a row) is never stale.
      React.useLayoutEffect(() => {
        hoisted.buttonProps.push(props);
      });
      return <RealButton {...props} ref={ref} />;
    }
  );
  return { ...stubs, Button: CapturingButton };
});

import { PullModelsModal } from "./PullModelsModal";

function renderModal(overrides: Partial<React.ComponentProps<typeof PullModelsModal>> = {}) {
  return render(
    <PullModelsModal activeRoutingTag={null} onCancel={() => {}} onPullAccepted={() => {}} embedded {...overrides} />
  );
}

/** Several renders can capture the same logical button more than once; the latest is the one
 *  Steam would actually be holding a reference to right now. */
function latestByClassName(className: string): Record<string, unknown> | undefined {
  const matches = hoisted.buttonProps.filter((p) => p.className === className);
  return matches[matches.length - 1];
}

function latestByAriaLabel(label: string): Record<string, unknown> | undefined {
  const matches = hoisted.buttonProps.filter((p) => p["aria-label"] === label);
  return matches[matches.length - 1];
}

function openFilters() {
  const filtersBtn = latestByClassName("bonsai-pullmodels-filters-button");
  expect(filtersBtn).toBeTruthy();
  (filtersBtn!.onClick as (ev: { stopPropagation: () => void }) => void)({ stopPropagation: () => {} });
}

beforeEach(() => {
  hoisted.buttonProps = [];
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("Filters panel — getting in", () => {
  it("pressing the Filters button opens the panel and moves the ring to its first row", async () => {
    const { container } = renderModal();

    openFilters();

    await waitFor(() => {
      const firstRow = container.querySelector('[aria-label="Open source only (recommended)"]');
      expect(firstRow).not.toBeNull();
      expect(document.activeElement).toBe(firstRow);
    });
  });
});

describe("Filters panel — getting back out", () => {
  it("Up from the first row closes the panel and returns the ring to the Filters button", async () => {
    const { container } = renderModal();
    openFilters();
    await waitFor(() => {
      expect(container.querySelector('[aria-label="Open source only (recommended)"]')).not.toBeNull();
    });

    const firstRow = latestByAriaLabel("Open source only (recommended)");
    const handled = (firstRow!.onMoveUp as () => boolean)();
    expect(handled).toBe(true);

    await waitFor(() => {
      expect(container.querySelector(".bonsai-pullmodels-filterpanel")).toBeNull();
      expect(document.activeElement).toBe(container.querySelector(".bonsai-pullmodels-filters-button"));
    });
  });

  it("B (onCancelButton) from a row in the middle of the panel closes it and returns the ring, consuming the press", async () => {
    const { container } = renderModal();
    openFilters();
    await waitFor(() => {
      expect(container.querySelector('[aria-label="Vision"]')).not.toBeNull();
    });

    const visionRow = latestByAriaLabel("Vision");
    let prevented = false;
    const handled = (visionRow!.onCancelButton as (e: { preventDefault: () => void }) => boolean)({
      preventDefault: () => {
        prevented = true;
      },
    });

    // preventDefault is what actually stops Steam's own back-out from also firing underneath this
    // handler (see DrgGlossaryTermChip.tsx and MainTabUnifiedAskBar.tsx for the same recipe) —
    // without it, B would close the panel AND pop the whole "AI models" screen in one press.
    expect(prevented).toBe(true);
    expect(handled).toBe(true);

    await waitFor(() => {
      expect(container.querySelector(".bonsai-pullmodels-filterpanel")).toBeNull();
      expect(document.activeElement).toBe(container.querySelector(".bonsai-pullmodels-filters-button"));
    });
  });

  it("the Close filters row at the bottom of the panel also closes it and returns the ring", async () => {
    const { container } = renderModal();
    openFilters();
    await waitFor(() => {
      expect(container.querySelector(".bonsai-pullmodels-filterpanel-close")).not.toBeNull();
    });

    const closeBtn = latestByClassName("bonsai-pullmodels-filterpanel-close");
    (closeBtn!.onClick as (ev: { stopPropagation: () => void }) => void)({ stopPropagation: () => {} });

    await waitFor(() => {
      expect(container.querySelector(".bonsai-pullmodels-filterpanel")).toBeNull();
      expect(document.activeElement).toBe(container.querySelector(".bonsai-pullmodels-filters-button"));
    });
  });
});

describe("Filters panel — the Licence rows replace the old Policy buttons", () => {
  it("ticking a licence row reports the pick through onSelectModelPolicyTier, the same draft callback the Policy section used", async () => {
    const onSelectModelPolicyTier = vi.fn();
    const { container } = renderModal({ onSelectModelPolicyTier });
    openFilters();

    let openWeightRow: HTMLButtonElement | null = null;
    await waitFor(() => {
      openWeightRow = container.querySelector('[aria-label="Also try open-weight models"]');
      expect(openWeightRow).not.toBeNull();
    });

    openWeightRow!.click();

    expect(onSelectModelPolicyTier).toHaveBeenCalledWith("open_weight");
  });

  it("greys out Any installed model until Tier 3 is unlocked, same as the old Policy panel", async () => {
    const onSelectModelPolicyTier = vi.fn();
    const { container } = renderModal({ onSelectModelPolicyTier, modelPolicyNonFossUnlocked: false });
    openFilters();

    let row: HTMLButtonElement | null = null;
    await waitFor(() => {
      row = container.querySelector('[aria-label*="Any installed model"]');
      expect(row).not.toBeNull();
    });

    expect(row!.disabled).toBe(true);
    row!.click();
    expect(onSelectModelPolicyTier).not.toHaveBeenCalled();
  });

  it("lets the Any installed model row through once Tier 3 is unlocked", async () => {
    const onSelectModelPolicyTier = vi.fn();
    const { container } = renderModal({ onSelectModelPolicyTier, modelPolicyNonFossUnlocked: true });
    openFilters();

    let row: HTMLButtonElement | null = null;
    await waitFor(() => {
      row = container.querySelector('[aria-label="Any installed model"]');
      expect(row).not.toBeNull();
    });

    expect(row!.disabled).toBe(false);
    row!.click();
    expect(onSelectModelPolicyTier).toHaveBeenCalledWith("non_foss");
  });
});

describe("Filters panel — the 'Filters · N on' summary", () => {
  it("always counts the licence pick, and adds one more per ticked filter", async () => {
    const { container } = renderModal();

    expect(container.querySelector(".bonsai-pullmodels-filters-button")?.textContent).toContain("Filters · 2 on");

    openFilters();
    let visionRow: HTMLButtonElement | null = null;
    await waitFor(() => {
      visionRow = container.querySelector('[aria-label="Vision"]');
      expect(visionRow).not.toBeNull();
    });
    visionRow!.click();

    await waitFor(() => {
      expect(container.querySelector(".bonsai-pullmodels-filters-button")?.textContent).toContain(
        "Filters · 3 on"
      );
    });
  });
});
