/**
 * Title: Ask bar → preset chip focus transfer
 * Purpose: Pin that pressing Up out of the Ask bar hands Steam the ring, and admits when it cannot.
 * Used for: `focusFirstPresetChip`, the Up edge of the unified input's D-pad graph.
 * Solves: On device 2026-08-28 this claimed success after a plain `focus()`. The carousel is its
 *         own navigation container, so that moved `activeElement` only — Steam's ring went to the
 *         tab strip instead, a chip drew the highlight, and A activated the tab.
 * Does not: Cover the other focus helpers in this hook; they hop within one container and work.
 */
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useMainTabAskBarFocus } from "./useMainTabAskBarFocus";
import { registerNavFocus, resetNavFocusRegistry } from "../utils/navFocusRegistry";
import { resetUiDocument } from "../utils/uiDocument";

/** The on-device shape: a row host holding the carousel's current slot and its chip button. */
function buildPresetRow(): { host: HTMLDivElement; chip: HTMLButtonElement } {
  const host = document.createElement("div");
  host.className = "bonsai-preset-row-host";

  const root = document.createElement("div");
  root.className = "bonsai-preset-carousel-focus-root";

  const slot = document.createElement("div");
  slot.className = "bonsai-preset-carousel-slot bonsai-preset-carousel-slot--focus";
  slot.setAttribute("data-bonsai-preset-visible", "true");

  const chip = document.createElement("button");
  chip.className = "bonsai-preset-glass";

  slot.appendChild(chip);
  root.appendChild(slot);
  host.appendChild(root);
  document.body.appendChild(host);
  return { host, chip };
}

function renderFocusHelpers(host: HTMLDivElement) {
  return renderHook(() =>
    useMainTabAskBarFocus(
      {
        unifiedInputFieldLayerRef: { current: null },
        attachActionHostRef: { current: null },
        askBarHostRef: { current: null },
        presetCarouselHostRef: { current: host },
      },
      false,
    ),
  );
}

/** Steam's ring, parked on something that is not the carousel. */
function putRingOnTabStrip(): HTMLElement {
  const strip = document.createElement("div");
  strip.className = "gpfocus";
  document.body.appendChild(strip);
  return strip;
}

describe("focusFirstPresetChip", () => {
  beforeEach(() => {
    resetNavFocusRegistry();
    resetUiDocument();
  });

  afterEach(() => {
    document.body.innerHTML = "";
    resetNavFocusRegistry();
    resetUiDocument();
  });

  it("uses Steam's own transfer when the carousel has registered its nav node", () => {
    const { host, chip } = buildPresetRow();
    const takeFocus = vi.fn(() => true);
    registerNavFocus("preset-carousel", { current: { TakeFocus: takeFocus } });

    const { result } = renderFocusHelpers(host);
    expect(result.current.focusFirstPresetChip()).toBe(true);
    // `true` marks the move as gamepad-sourced, which is what a D-pad press is.
    expect(takeFocus).toHaveBeenCalledWith(true);
    // No DOM focus needed — Steam moves the ring and the chip's own onFocus follows it.
    expect(document.activeElement).not.toBe(chip);
  });

  it("reports failure when the ring stayed on the tab strip", () => {
    const { host, chip } = buildPresetRow();
    putRingOnTabStrip();

    const { result } = renderFocusHelpers(host);
    const claimed = result.current.focusFirstPresetChip();

    // The DOM focus still moves — that is the fallback doing its best — but the answer is honest.
    expect(document.activeElement).toBe(chip);
    expect(claimed).toBe(false);
  });

  it("falls back to a plain focus() where nothing owns a ring at all", () => {
    const { host, chip } = buildPresetRow();

    const { result } = renderFocusHelpers(host);
    expect(result.current.focusFirstPresetChip()).toBe(true);
    expect(document.activeElement).toBe(chip);
  });

  it("says false rather than true when there is no chip to focus", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);

    const { result } = renderFocusHelpers(host);
    expect(result.current.focusFirstPresetChip()).toBe(false);
  });
});

/** The Ask bar's text field with the ring parked elsewhere, the way a preset chip's Down finds it. */
function buildTextField(): { layer: HTMLDivElement; field: HTMLTextAreaElement } {
  const layer = document.createElement("div");
  const field = document.createElement("textarea");
  layer.appendChild(field);
  document.body.appendChild(layer);
  return { layer, field };
}

function renderTextFieldHelpers(layer: HTMLDivElement) {
  return renderHook(() =>
    useMainTabAskBarFocus(
      {
        unifiedInputFieldLayerRef: { current: layer },
        attachActionHostRef: { current: null },
        askBarHostRef: { current: null },
        presetCarouselHostRef: { current: null },
      },
      false,
    ),
  );
}

/* Same honesty fix as focusFirstPresetChip, found from the other direction on 2026-09-01: Down from
   a preset chip on a freshly opened panel put the caret in the field while Steam bounced the ring
   to the next chip, because the hop was a plain focus() across containers. */
describe("focusUnifiedTextField", () => {
  beforeEach(() => {
    resetNavFocusRegistry();
    resetUiDocument();
  });

  afterEach(() => {
    document.body.innerHTML = "";
    resetNavFocusRegistry();
    resetUiDocument();
  });

  it("uses Steam's own transfer when the text field has registered its nav node", () => {
    const { layer, field } = buildTextField();
    const takeFocus = vi.fn(() => true);
    registerNavFocus("unified-input", { current: { TakeFocus: takeFocus } });
    const { result } = renderTextFieldHelpers(layer);

    expect(result.current.focusUnifiedTextField()).toBe(true);
    expect(takeFocus).toHaveBeenCalledWith(true);
    expect(document.activeElement).not.toBe(field);
  });

  it("reports failure when the ring stayed elsewhere and no nav node is registered", () => {
    const { layer } = buildTextField();
    putRingOnTabStrip();
    const { result } = renderTextFieldHelpers(layer);
    expect(result.current.focusUnifiedTextField()).toBe(false);
  });

  it("falls back to a plain focus() where nothing owns a ring at all", () => {
    const { layer, field } = buildTextField();
    const { result } = renderTextFieldHelpers(layer);
    expect(result.current.focusUnifiedTextField()).toBe(true);
    expect(document.activeElement).toBe(field);
  });
});

/**
 * The Ask button greys out while a question is in flight, but a greyed control that still takes
 * the D-pad's highlight does nothing useful when it lands there (docs/test-evidence/
 * round35-CHECK-stop-press.json: Down from the question box landed the ring on it, then a second
 * Down lost the ring entirely). Down from the question box must step over it instead.
 */
function buildAskBarHost(): { host: HTMLDivElement; askButton: HTMLButtonElement } {
  const host = document.createElement("div");
  const askButton = document.createElement("button");
  askButton.className = "bonsai-ask-primary";
  host.appendChild(askButton);
  document.body.appendChild(host);
  return { host, askButton };
}

function renderAskBarHandlers(host: HTMLDivElement, isAskInFlight: boolean) {
  return renderHook(() =>
    useMainTabAskBarFocus(
      {
        unifiedInputFieldLayerRef: { current: null },
        attachActionHostRef: { current: null },
        askBarHostRef: { current: host },
        presetCarouselHostRef: { current: null },
      },
      false,
      isAskInFlight,
    ),
  );
}

/**
 * The same state, but with the Stop button on the page -- which is what the real screen looks like
 * while a question is in flight, because Stop takes the microphone's place in the row above-right.
 * Swallowing Down left the press doing nothing for the whole time an answer took to arrive
 * (measured on device 2026-09-20, runs/plan62-ASKBAR-FOCUS-TRAP-reproduced-after-send.json: two
 * Downs moved nothing, and Down worked again the moment the answer landed). Stop is live, and it is
 * the one control a person actually wants then, so Down goes there.
 */
function buildAskBarHostWithStop(): {
  host: HTMLDivElement;
  attachHost: HTMLDivElement;
  askButton: HTMLButtonElement;
  stopButton: HTMLButtonElement;
} {
  const host = document.createElement("div");
  const askButton = document.createElement("button");
  askButton.className = "bonsai-ask-primary";
  host.appendChild(askButton);
  const attachHost = document.createElement("div");
  const stopButton = document.createElement("button");
  stopButton.className = "bonsai-askbar-target bonsai-unified-input-corner-right";
  stopButton.setAttribute("aria-label", "Stop generation");
  attachHost.appendChild(stopButton);
  document.body.appendChild(host);
  document.body.appendChild(attachHost);
  return { host, attachHost, askButton, stopButton };
}

function renderAskBarHandlersWithStop(
  host: HTMLDivElement,
  attachHost: HTMLDivElement,
  isAskInFlight: boolean,
) {
  return renderHook(() =>
    useMainTabAskBarFocus(
      {
        unifiedInputFieldLayerRef: { current: null },
        attachActionHostRef: { current: attachHost },
        askBarHostRef: { current: host },
        presetCarouselHostRef: { current: null },
      },
      false,
      isAskInFlight,
    ),
  );
}

describe("Down from the question box while a question is in flight reaches Stop", () => {
  beforeEach(() => {
    resetNavFocusRegistry();
    resetUiDocument();
  });

  afterEach(() => {
    document.body.innerHTML = "";
    resetNavFocusRegistry();
    resetUiDocument();
  });

  it("lands the ring on Stop rather than doing nothing", () => {
    const { host, attachHost, askButton, stopButton } = buildAskBarHostWithStop();
    const { result } = renderAskBarHandlersWithStop(host, attachHost, true);

    const onMoveDown = result.current.unifiedInputDeckNavHandlers.onMoveDown as () => boolean;
    const handled = onMoveDown();

    expect(handled).toBe(true);
    expect(document.activeElement).toBe(stopButton);
    expect(document.activeElement).not.toBe(askButton);
  });

  it("still holds the ring still when there is no Stop button to reach either", () => {
    const { host, askButton } = buildAskBarHost();
    const { result } = renderAskBarHandlers(host, true);

    const onMoveDown = result.current.unifiedInputDeckNavHandlers.onMoveDown as () => boolean;

    // Reported handled, so Steam does not go looking on its own -- that is what lost the ring
    // entirely on device before this edge existed at all.
    expect(onMoveDown()).toBe(true);
    expect(document.activeElement).not.toBe(askButton);
  });

  it("goes to the Ask button, not Stop, once the answer has landed", () => {
    const { host, attachHost, askButton, stopButton } = buildAskBarHostWithStop();
    const { result } = renderAskBarHandlersWithStop(host, attachHost, false);

    const onMoveDown = result.current.unifiedInputDeckNavHandlers.onMoveDown as () => boolean;

    expect(onMoveDown()).toBe(true);
    expect(document.activeElement).toBe(askButton);
    expect(document.activeElement).not.toBe(stopButton);
  });
});

describe("Down from the question box while the Ask button is greyed", () => {
  beforeEach(() => {
    resetNavFocusRegistry();
    resetUiDocument();
  });

  afterEach(() => {
    document.body.innerHTML = "";
    resetNavFocusRegistry();
    resetUiDocument();
  });

  it("does not land the ring on the greyed Ask button while a question is in flight", () => {
    const { host, askButton } = buildAskBarHost();
    const { result } = renderAskBarHandlers(host, true);

    const onMoveDown = result.current.unifiedInputDeckNavHandlers.onMoveDown as () => boolean;
    const handled = onMoveDown();

    // Reported handled -- the press holds the ring on the box rather than Steam going looking on
    // its own for the next stop, which is what lost the ring entirely on device.
    expect(handled).toBe(true);
    expect(document.activeElement).not.toBe(askButton);
  });

  it("a greyed Ask button never takes the ring from focusAskPrimary directly", () => {
    const { host, askButton } = buildAskBarHost();
    const { result } = renderAskBarHandlers(host, true);

    expect(result.current.focusAskPrimary()).toBe(false);
    expect(document.activeElement).not.toBe(askButton);
  });

  it("still lands Down on the Ask button while idle", () => {
    const { host, askButton } = buildAskBarHost();
    const { result } = renderAskBarHandlers(host, false);

    const onMoveDown = result.current.unifiedInputDeckNavHandlers.onMoveDown as () => boolean;
    const handled = onMoveDown();

    expect(handled).toBe(true);
    expect(document.activeElement).toBe(askButton);
  });
});
