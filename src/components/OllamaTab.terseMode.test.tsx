/**
 * Title: Ollama tab, Terse mode toggle
 * Purpose: Pin that the Ollama tab shows a Terse mode switch under the reply-style slider, that it
 *          starts off, that its help line says in plain words what it does and does not do, and that
 *          flipping it calls the setter the settings hook saves from.
 * Used for: roadmap "Terse mode: Speed answers in three lines" (details: roadmap-details.md).
 * Does not: Prove the D-pad walk on the device (that is a Deck check), or prove what the AI is told
 *           (see tests/test_terse_mode_prompt.py for that).
 */
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

/* The shared Decky stub drops the Steam move props, so this file wraps ToggleField to keep the ones
   given to the Terse mode switch where the D-pad test can call them, the way Steam would. */
const terseNav = vi.hoisted(() => ({ current: {} as Record<string, () => boolean> }));
vi.mock("@decky/ui", async () => {
  const real = (await import("../test-harness/fakeDeckyUi")) as unknown as Record<string, unknown>;
  const RealToggle = real.ToggleField as React.ComponentType<Record<string, unknown>>;
  return {
    ...real,
    ToggleField: (p: Record<string, unknown>) => {
      if (p.label === "Terse mode") {
        terseNav.current = { onMoveUp: p.onMoveUp as () => boolean, onMoveDown: p.onMoveDown as () => boolean };
      }
      return <RealToggle {...p} />;
    },
  };
});

import { OllamaTab, type OllamaTabProps } from "./OllamaTab";

const noop = () => {};

function props(overrides: Partial<OllamaTabProps> = {}): OllamaTabProps {
  return {
    ollamaIp: "",
    effectiveOllamaPcIp: "",
    onOllamaIpChange: noop,
    onPersistOllamaIp: noop,
    ollamaLocalOnDeck: false,
    setOllamaLocalOnDeck: noop,
    ollamaLocalAutostart: false,
    setOllamaLocalAutostart: noop,
    namedOllamaHosts: [],
    setNamedOllamaHosts: noop,
    onBeforeDeckyModal: noop,
    onCompleteDeckyModalClose: (close) => close(),
    onOpenOllamaModelsHub: noop,
    latencyWarningSeconds: 20,
    requestTimeoutSeconds: 60,
    latencyTimeoutsCustomEnabled: false,
    setLatencyTimeoutsCustomEnabled: noop,
    setLatencyWarningSeconds: noop,
    setRequestTimeoutSeconds: noop,
    ollamaKeepAlive: "5m",
    setOllamaKeepAlive: noop,
    modelPolicyTier: "open_source_only",
    useLocalKnowledgeBase: false,
    setUseLocalKnowledgeBase: noop,
    ragCorpusVersion: "",
    replyVerbosity: "balanced",
    setReplyVerbosity: noop,
    terseMode: false,
    setTerseMode: noop,
    askThinkEffort: "off",
    setAskThinkEffort: noop,
    ...overrides,
  };
}

const TOGGLE = '[label="Terse mode"]';

/** ToggleField is a test-harness stub div; React sets `checked` as a DOM property, not attribute. */
function checkedOf(el: Element | null): unknown {
  return (el as unknown as { checked?: unknown } | null)?.checked;
}

/** The stub keeps the real props on the element's React props; call them like Steam would. */
function reactProps(el: Element): Record<string, (...a: unknown[]) => unknown> {
  const key = Object.keys(el).find((k) => k.startsWith("__reactProps"));
  return (el as unknown as Record<string, Record<string, (...a: unknown[]) => unknown>>)[key ?? ""] ?? {};
}

describe("Ollama tab: Terse mode toggle", () => {
  it("shows one Terse mode switch, off, when nothing was saved", () => {
    render(<OllamaTab {...props()} />);
    const toggles = document.querySelectorAll(TOGGLE);
    expect(toggles).toHaveLength(1);
    expect(checkedOf(toggles[0])).toBe(false);
  });

  it("shows the switch on when the setting is on", () => {
    render(<OllamaTab {...props({ terseMode: true })} />);
    expect(checkedOf(document.querySelector(TOGGLE))).toBe(true);
  });

  it("sits right under the reply-style slider and above the Thinking row", () => {
    const { container } = render(<OllamaTab {...props()} />);
    const slider = container.querySelector(".bonsai-reply-verbosity-slider");
    const toggle = container.querySelector(TOGGLE);
    const thinking = Array.from(container.querySelectorAll("div")).find((d) => d.textContent === "Thinking");
    expect(slider && toggle && thinking).toBeTruthy();
    const before = (a: Node, b: Node) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(before(slider as Node, toggle as Node)).toBe(true);
    expect(before(toggle as Node, thinking as Node)).toBe(true);
  });

  it("explains in plain words that it shortens what you see, not the AI's thinking, and is Speed only", () => {
    render(<OllamaTab {...props()} />);
    const help = String(document.querySelector(TOGGLE)?.getAttribute("description") ?? "");
    expect(help).toMatch(/Speed mode only/i);
    expect(help).toMatch(/three/i);
    expect(help).toMatch(/shortens what you see, not how hard the AI thinks/i);
    expect(help).toMatch(/Strategy and Expert/i);
  });

  it("calls the setter the settings hook saves from, with the new value", () => {
    const setTerseMode = vi.fn();
    render(<OllamaTab {...props({ setTerseMode })} />);
    const el = document.querySelector(TOGGLE) as Element;
    reactProps(el).onChange?.(true);
    reactProps(el).onChange?.(false);
    expect(setTerseMode.mock.calls).toEqual([[true], [false]]);
  });

  it("is a stop on the Down/Up walk: Up goes to the slider, Down goes to the Thinking row", () => {
    const { container } = render(<OllamaTab {...props()} />);
    const sliderThumb = container.querySelector<HTMLElement>("[data-bonsai-reply-verbosity-thumb]");
    const thinkingButton = container.querySelector<HTMLElement>('button[aria-label^="Set thinking to"]');
    expect(sliderThumb && thinkingButton).toBeTruthy();
    /* Decky stamps tabindex="0" on what it navigates; the stub does not, so do it here. */
    const thumbStop = (sliderThumb as HTMLElement).firstElementChild as HTMLElement;
    thumbStop.setAttribute("tabindex", "0");
    const focusUp = vi.spyOn(thumbStop, "focus");
    const focusDown = vi.spyOn(thinkingButton as HTMLElement, "focus");
    expect(terseNav.current.onMoveUp?.()).toBe(true);
    expect(focusUp).toHaveBeenCalled();
    expect(terseNav.current.onMoveDown?.()).toBe(true);
    expect(focusDown).toHaveBeenCalled();
  });
});
