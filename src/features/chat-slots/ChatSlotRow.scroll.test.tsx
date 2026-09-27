/**
 * Title: The chat name's scroll
 *
 * Purpose: A long chat name in the chat row scrolls through Steam's own Marquee with the very same
 * settings a long suggestion chip uses, so the two can never drift apart again (plan 72, lane 5).
 * It used to be its own six-second CSS sweep whose speed changed with the name's length.
 *
 * Does not: Prove the look on the Deck -- the Marquee here is a stub that records its props.
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";

import type { ChatSlotSummary } from "../../utils/chatSlotsApi";
import {
  PRESET_MARQUEE_DELAY_S,
  PRESET_MARQUEE_FADE_LENGTH,
  PRESET_MARQUEE_SPEED,
} from "../preset-carousel/presetRowLayout";

const marqueeProps: Record<string, unknown>[] = [];

vi.mock("@decky/ui", async () => {
  const fake = await import("../../test-harness/fakeDeckyUi");
  const Marquee = (props: Record<string, unknown> & { children?: React.ReactNode }) => {
    marqueeProps.push(props);
    return (
      <div data-decky-ui="Marquee" className={props.className as string}>
        {props.children}
      </div>
    );
  };
  return { ...fake, Marquee };
});

import { ChatSlotRow } from "./ChatSlotRow";

const LONG = "Soul Master in the Soul Sanctum, and how to beat him";

function summary(id: string, label: string): ChatSlotSummary {
  return { id, label, created_at: 0, updated_at: 0 };
}

function renderRow() {
  return render(
    <ChatSlotRow
      summaries={[summary("a", LONG), summary("b", "Beta")]}
      activeSlotId="a"
      onCreateSlot={async () => undefined}
      onSelectSlot={async () => undefined}
      onRenameSlot={async () => true}
      onDeleteSlot={async () => true}
    />,
  );
}

/* jsdom lays nothing out, so the name's measured overflow is stubbed: the text is 400 wide in a
   150-wide window. */
function stubOverflow() {
  vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(400);
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(150);
}

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: reduce && q.includes("reduce"),
    media: q,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

beforeEach(() => {
  marqueeProps.length = 0;
  stubReducedMotion(false);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ChatSlotRow name scroll", () => {
  it("scrolls a long name with the chips' own Marquee settings while the ring is on the row", () => {
    stubOverflow();
    const { container } = renderRow();
    expect(container.querySelector(".bonsai-chat-slot-title-marquee")).toBeNull();

    fireEvent.focus(container.querySelector(".bonsai-chat-slot-row-focus") as HTMLElement);

    const marquee = container.querySelector(".bonsai-chat-slot-title-marquee");
    expect(marquee?.textContent).toBe(LONG);
    const last = marqueeProps[marqueeProps.length - 1];
    expect(last.speed).toBe(PRESET_MARQUEE_SPEED);
    expect(last.delay).toBe(PRESET_MARQUEE_DELAY_S);
    expect(last.fadeLength).toBe(PRESET_MARQUEE_FADE_LENGTH);
    expect(last.resetOnPause).toBe(true);
    // The old CSS sweep is gone for good.
    expect(container.innerHTML).not.toContain("--bonsai-slot-title-overflow");
  });

  it("stops scrolling when the ring leaves the row", () => {
    stubOverflow();
    const { container } = renderRow();
    const focusTarget = container.querySelector(".bonsai-chat-slot-row-focus") as HTMLElement;
    fireEvent.focus(focusTarget);
    expect(container.querySelector(".bonsai-chat-slot-title-marquee")).not.toBeNull();
    fireEvent.blur(focusTarget);
    expect(container.querySelector(".bonsai-chat-slot-title-marquee")).toBeNull();
    expect(container.querySelector(".bonsai-chat-slot-title-inner")?.textContent).toBe(LONG);
  });

  it("does not scroll a name that fits", () => {
    const { container } = renderRow();
    fireEvent.focus(container.querySelector(".bonsai-chat-slot-row-focus") as HTMLElement);
    expect(container.querySelector(".bonsai-chat-slot-title-marquee")).toBeNull();
  });

  it("does not scroll when the player asked for less motion", () => {
    stubReducedMotion(true);
    stubOverflow();
    const { container } = renderRow();
    fireEvent.focus(container.querySelector(".bonsai-chat-slot-row-focus") as HTMLElement);
    expect(container.querySelector(".bonsai-chat-slot-title-marquee")).toBeNull();
  });

  it("scrolls both the chips and the chat name 20% slower than before (25 -> 20)", () => {
    expect(PRESET_MARQUEE_SPEED).toBe(20);
    expect(PRESET_MARQUEE_DELAY_S).toBe(1.5);
  });
});
