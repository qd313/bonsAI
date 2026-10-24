/**
 * Title: The ring comes back to Find LAN after its box closes
 *
 * Purpose: Plan 96 (Deck 2026-10-18, plan96-P96-CANCEL-RIGHT.json): after B on the Find LAN box the ring went
 * to the tab bar, while the other five boxes gave it back to the button that opened them. The section is
 * drawn, Find LAN is pressed (which opens the box), the shell's restore runs as it does after the box closes,
 * and the ring has to be on Find LAN, handed over through Steam's own transfer onto the button's node.
 *
 * Does not: prove the ring moves on the device (jsdom has no Steam ring); the Deck row does.
 */
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({ takeFocus: vi.fn(), focusOnTake: true }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  /* Steam fills a Focusable's `navRef` with its node; this one's TakeFocus lands the ring on the button inside. */
  const NavFocusable = React.forwardRef<HTMLDivElement, Record<string, unknown>>(function NavFocusable(props, ref) {
    const Base = stubs.Focusable;
    const holder = props.navRef as { current: unknown } | undefined;
    const local = React.useRef<HTMLDivElement | null>(null);
    React.useLayoutEffect(() => {
      if (!holder) return;
      holder.current = {
        TakeFocus: (gamepad?: boolean) => {
          hoisted.takeFocus(gamepad);
          if (hoisted.focusOnTake) local.current?.querySelector("button")?.focus();
          return true;
        },
      };
    });
    return (
      <Base
        {...props}
        ref={(el: HTMLDivElement | null) => {
          local.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        }}
      />
    );
  });
  return { ...stubs, Focusable: NavFocusable, showModal: () => ({ Close: () => {} }) };
});

import { OllamaWhereAiRunsSection } from "./OllamaWhereAiRunsSection";
import { resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";
import { markSettingsLoaded, resetSettingsLoadedSignalForTests } from "../settings/settingsLoadedSignal";
import {
  peekModalReturnFocus,
  resetModalReturnFocusRegistry,
  restoreModalReturnFocus,
} from "../../shared/dpad/modalReturnFocusRegistry";
import { tabMdnsDiscovery } from "./mdnsDiscoveryStore";

function draw() {
  return render(
    <OllamaWhereAiRunsSection
      ollamaIp="192.168.1.100"
      onOllamaIpChange={() => {}}
      onPersistOllamaIp={() => {}}
      ollamaLocalOnDeck={false}
      setOllamaLocalOnDeck={() => {}}
      ollamaLocalAutostart={false}
      setOllamaLocalAutostart={() => {}}
      namedOllamaHosts={[]}
      setNamedOllamaHosts={() => {}}
      onBeforeDeckyModal={() => {}}
      onCompleteDeckyModalClose={(close) => close()}
      onOpenOllamaModelsHub={() => {}}
    />,
  );
}

beforeEach(() => {
  resetFakeDeckyRpc();
  resetSettingsLoadedSignalForTests();
  resetModalReturnFocusRegistry();
  tabMdnsDiscovery.reset();
  hoisted.takeFocus.mockClear();
  hoisted.focusOnTake = true;
  setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.12.0", models: [] }));
  markSettingsLoaded();
});

describe("Find LAN and its box", () => {
  it("says it opened the box, so the shell knows where the ring goes back to", () => {
    draw();
    expect(peekModalReturnFocus()).toBeNull();
    fireEvent.click(screen.getByLabelText("Find Ollama on LAN via mDNS"));
    expect(peekModalReturnFocus()).toBe("ollama-find-lan");
  });

  it("gets the ring back through Steam's transfer when the box closes (B on the box)", async () => {
    draw();
    const find = screen.getByLabelText("Find Ollama on LAN via mDNS");
    fireEvent.click(find);
    (document.activeElement as HTMLElement | null)?.blur();

    let landed = false;
    await act(async () => {
      landed = restoreModalReturnFocus();
    });

    expect(hoisted.takeFocus).toHaveBeenCalledWith(true);
    expect(document.activeElement).toBe(find);
    expect(landed).toBe(true);
  });

  it("still puts the ring on Find LAN with a plain focus when Steam's transfer does not land it", async () => {
    hoisted.focusOnTake = false;
    draw();
    const find = screen.getByLabelText("Find Ollama on LAN via mDNS");
    fireEvent.click(find);
    (document.activeElement as HTMLElement | null)?.blur();
    await act(async () => {
      restoreModalReturnFocus();
    });
    expect(document.activeElement).toBe(find);
  });
});
