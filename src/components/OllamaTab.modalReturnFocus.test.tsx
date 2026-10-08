/**
 * Title: Ollama tab modal return-focus wiring
 * Purpose: Pin that the tab's one "AI models" button, and the Thinking row's own one-time notice,
 *          arm and register themselves with the modal return-focus registry, the same way
 *          Settings -> Data's two confirm-modal openers already do. The two "Set ... model try
 *          order..." buttons that used to sit beside it are gone (plan 79: the try order lives in
 *          the AI models box), so the tab's list of return-focus ids shrank from three to one.
 * Used for: plan 55 bug B2 -- closing the try-order picker put the ring on the Ollama tab's outer
 *           frame instead of back on the button that opened it -- and the 2026-09-17 device
 *           finding for the Thinking row's notice (docs/test-evidence/plan57-REASONING-07.json):
 *           the same defect, one level up, in useThinkingNoticeGate.tsx -- it kept a direct
 *           reference to the pressed button instead of registering with this registry, so the
 *           reference was already detached by the time Decky's remount happened and the ring
 *           landed on the tab strip.
 * Solves: Neither try-order button ever called `rememberModalReturnFocus` nor registered a ref with
 *         the registry, so there was nothing for the picker's already-correct close path to restore
 *         focus to. The Thinking row's notice had the same gap.
 * Does not: Exercise the box itself -- the test harness's `showModal` stub discards its
 *           argument rather than rendering it (src/test-harness/fakeDeckyUi.tsx). This only proves
 *           the wiring the fix depends on is in place. What happens once "Show thinking" or "Keep
 *           it off" is actually pressed is pinned in useThinkingNoticeGate.test.tsx, not here.
 */
import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OllamaTab, type OllamaTabProps } from "./OllamaTab";
import {
  peekModalReturnFocus,
  resetModalReturnFocusRegistry,
  restoreModalReturnFocus,
} from "../features/plugin-shell/modalReturnFocusRegistry";

function buildProps(overrides: Partial<OllamaTabProps> = {}): OllamaTabProps {
  return {
    ollamaIp: "",
    effectiveOllamaPcIp: "",
    onOllamaIpChange: () => {},
    onPersistOllamaIp: () => {},
    ollamaLocalOnDeck: false,
    setOllamaLocalOnDeck: () => {},
    ollamaLocalAutostart: false,
    setOllamaLocalAutostart: () => {},
    namedOllamaHosts: [],
    setNamedOllamaHosts: () => {},
    onBeforeDeckyModal: () => {},
    onCompleteDeckyModalClose: (close) => close(),
    onOpenOllamaModelsHub: () => {},
    latencyWarningSeconds: 20,
    requestTimeoutSeconds: 60,
    latencyTimeoutsCustomEnabled: false,
    setLatencyTimeoutsCustomEnabled: () => {},
    setLatencyWarningSeconds: () => {},
    setRequestTimeoutSeconds: () => {},
    ollamaKeepAlive: "5m",
    setOllamaKeepAlive: () => {},
    modelPolicyTier: "open_source_only",
    useLocalKnowledgeBase: false,
    setUseLocalKnowledgeBase: () => {},
    ragCorpusVersion: "",
    replyVerbosity: "balanced",
    setReplyVerbosity: () => {},
    terseMode: false,
    setTerseMode: () => {},
    askThinkEffort: "off",
    setAskThinkEffort: () => {},
    ...overrides,
  };
}

describe("OllamaTab modal return focus", () => {
  beforeEach(() => {
    resetModalReturnFocusRegistry();
  });

  /*
   * Measured on the Deck 2026-09-20: opening the AI models screen from the Ollama tab's own
   * "Manage AI models" button and closing it with B left the ring on Steam's Quick Access rail,
   * outside the plugin entirely, because this opener never registered itself. Where AI runs'
   * "Browse models" button does, and a comment there had already predicted this exact gap for the
   * second entry point.
   */
  it("remembers ollama-models-hub-settings when AI models is pressed", () => {
    const { getByLabelText } = render(<OllamaTab {...buildProps()} />);
    fireEvent.click(getByLabelText("AI models"));
    expect(peekModalReturnFocus()).toBe("ollama-models-hub-settings");
  });

  it("registers the AI models button so the registry can focus it back", () => {
    const { getByLabelText } = render(<OllamaTab {...buildProps()} />);
    const button = getByLabelText("AI models");
    const focus = vi.spyOn(button, "focus");

    fireEvent.click(button);
    restoreModalReturnFocus();

    expect(focus).toHaveBeenCalled();
  });

  it("still opens the models screen when AI models is pressed", () => {
    const onOpenOllamaModelsHub = vi.fn();
    const { getByLabelText } = render(<OllamaTab {...buildProps({ onOpenOllamaModelsHub })} />);

    fireEvent.click(getByLabelText("AI models"));

    expect(onOpenOllamaModelsHub).toHaveBeenCalledTimes(1);
  });

  /*
   * The models screen has two openers, and the registry's own note says two openers need two ids.
   * Sharing one would mean whichever button mounted last owned it, so closing would hand the ring
   * to the wrong button.
   */
  it("does not reuse the Browse models button's id", () => {
    const { getByLabelText } = render(<OllamaTab {...buildProps()} />);
    fireEvent.click(getByLabelText("AI models"));
    expect(peekModalReturnFocus()).not.toBe("ollama-models-hub");
  });

  /*
   * Plan 79: "Models & routing" shrank to this one button. The two try-order buttons, and the ids
   * they registered, are gone with the screens they opened.
   */
  it("registers no return-focus id of the two removed try-order buttons", () => {
    const { container, queryByText } = render(<OllamaTab {...buildProps()} />);
    expect(queryByText(/try order/i)).toBeNull();
    expect(container.querySelector('[aria-label*="try order" i]')).toBeNull();
    expect(container.textContent).not.toContain("Models & routing");
  });

  it("remembers ollama-thinking-effort when a Thinking button opens the one-time notice", () => {
    // askThinkEffort defaults to "off" in buildProps, so any other choice opens the notice.
    const { getByText } = render(<OllamaTab {...buildProps()} />);
    fireEvent.click(getByText("Brief"));
    expect(peekModalReturnFocus()).toBe("ollama-thinking-effort");
  });

  it("registers the Thinking row so the registry can focus it back", () => {
    const { getByText } = render(<OllamaTab {...buildProps()} />);
    const briefButton = getByText("Brief").closest("button") as HTMLButtonElement;
    const offButton = getByText("Off").closest("button") as HTMLButtonElement;
    // The row's container is what gets registered (any of its four buttons can be the one
    // pressed), and the registry's own fallback focuses the first button inside it -- Off, here.
    const focus = vi.spyOn(offButton, "focus");

    fireEvent.click(briefButton);
    restoreModalReturnFocus();

    expect(focus).toHaveBeenCalled();
  });
});

describe("the AI models section is one button", () => {
  it("names the licence on the button: the only line on the tab that says which models may be tried", () => {
    const { getByLabelText } = render(<OllamaTab {...buildProps()} />);
    expect(getByLabelText("AI models").textContent).toBe("AI models… — Open source only (recommended)");
  });

  it("follows the chosen licence", () => {
    const { getByLabelText } = render(<OllamaTab {...buildProps({ modelPolicyTier: "open_weight" })} />);
    expect(getByLabelText("AI models").textContent).toBe("AI models… — Also try open-weight models");
  });

  it("is drawn whichever computer answers: with the AI on a PC it is the only door into the box", () => {
    for (const ollamaLocalOnDeck of [true, false]) {
      const { getAllByLabelText, unmount } = render(<OllamaTab {...buildProps({ ollamaLocalOnDeck })} />);
      expect(getAllByLabelText("AI models")).toHaveLength(1);
      unmount();
    }
  });
});
