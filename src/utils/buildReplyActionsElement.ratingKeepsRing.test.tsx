/**
 * Title: Rating a reply keeps the ring on the row
 * Purpose: Pin the fix for plan 70 flow 4.1 (docs/test-evidence/plan70-F4-THUMBS-UP.json, 3 of 3):
 *          pressing Helpful swaps both thumbs for the words "Saved on this Deck", the button the
 *          ring was on no longer exists, and nothing holds the ring. The next Down or Left found the
 *          speaker; B went to the tab bar.
 * Used for: buildReplyActionsElement.tsx's thumbs.
 * Does not: Prove the fix on the Deck. The check this owes: A on Helpful, then read focus without
 *           pressing anything; the ring is on the speaker at the right of the row, in view.
 */
import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildReplyActionsElement } from "./buildReplyActionsElement";
import { resetUiDocument } from "./uiDocument";

vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

function Row(props: { withSpeaker?: boolean }) {
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  return buildReplyActionsElement({
    replyKey: "live",
    rating,
    onRate: setRating,
    showFeedback: true,
    transparencyOpen: false,
    onReadAloudToggle: props.withSpeaker === false ? undefined : () => {},
  });
}

describe("rating a reply keeps the ring on its row", () => {
  beforeEach(() => {
    resetUiDocument();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("Helpful: the ring moves to the speaker once the thumbs are replaced", () => {
    render(<Row />);
    const helpful = screen.getByLabelText("Mark reply helpful");
    act(() => helpful.focus());

    fireEvent.click(helpful);
    act(() => {
      vi.runAllTimers();
    });

    expect(screen.getByText("Saved on this Deck")).toBeTruthy();
    expect(helpful.isConnected).toBe(false);
    expect(document.activeElement).toBe(screen.getByLabelText("Read aloud"));
  });

  it("Not really: the greyed button is still there, so the ring is left where it is", () => {
    render(<Row />);
    const notReally = screen.getByLabelText("Mark reply not helpful");
    act(() => notReally.focus());

    fireEvent.click(notReally);
    act(() => {
      vi.runAllTimers();
    });

    expect(document.activeElement).not.toBe(screen.getByLabelText("Read aloud"));
    expect(notReally.isConnected).toBe(true);
  });

  it("a touch press on Helpful (the ring elsewhere) moves nothing", () => {
    const elsewhere = document.createElement("button");
    document.body.appendChild(elsewhere);
    render(<Row />);
    act(() => elsewhere.focus());

    fireEvent.click(screen.getByLabelText("Mark reply helpful"));
    act(() => {
      vi.runAllTimers();
    });

    expect(document.activeElement).toBe(elsewhere);
    elsewhere.remove();
  });
});
