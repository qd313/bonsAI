/**
 * Title: The thumbs row decodes in once, and works while it does
 * Purpose: Pin plan 105 row P105-THUMBS-DECODE-01 at the level the Deck check looks at: after an answer, "Was this
 *          helpful?" and its two buttons scramble into place; the ring can land on a button that is still
 *          decoding and A marks the answer; it plays once per answer (not on a re-render or when the answer is
 *          scrolled back); and under the system's less-motion choice the row shows at once.
 * Used for: ThumbsDecodeText.tsx, as drawn by buildReplyActionsElement.tsx.
 * Does not: Prove the look on the Deck. The check this owes: finish an answer; the thumbs row decodes in; press
 *           Down onto Helpful while it is still scrambling and press A; the answer is marked, as on a settled row.
 */
import { useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildReplyActionsElement } from "./buildReplyActionsElement";
import { resetUiDocument } from "../../../shared/dpad/uiDocument";
import { stubReducedMotion } from "../../../test-harness/reducedMotion";

vi.mock("@decky/ui", async () => import("../../../test-harness/fakeDeckyUi"));

function Row(props: { replyKey: string; onRate?: (r: "up" | "down") => void }) {
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  return buildReplyActionsElement({
    replyKey: props.replyKey,
    rating,
    onRate: (r) => {
      props.onRate?.(r);
      setRating(r);
    },
    showFeedback: true,
    transparencyOpen: false,
    onToggleTransparency: () => {},
  });
}

const decoding = () => document.querySelectorAll("[data-thumbs-decode]").length;
const overlayWords = (): string[] =>
  [...document.querySelectorAll("[data-thumbs-decode]")].map((el) => el.textContent ?? "");
/* Longest piece: "Was this helpful?", 17 letters at 42 ms, plus the last piece's start delay. */
const ALL_DONE_MS = 3000;

describe("the thumbs row decodes in", () => {
  beforeEach(() => {
    resetUiDocument();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("starts as scrambled words the real length, and settles to the plain words", () => {
    stubReducedMotion(false);
    render(<Row replyKey="turn-settle" />);
    expect(decoding()).toBe(3);
    const first = overlayWords();
    expect(first.map((w) => w.length)).toEqual(["Was this helpful?", "Helpful", "Not really"].map((w) => w.length));
    expect(first[0]).not.toBe("Was this helpful?");

    act(() => {
      vi.advanceTimersByTime(ALL_DONE_MS);
    });
    expect(decoding()).toBe(0);
    expect(screen.getByText("Was this helpful?")).toBeTruthy();
    expect(screen.getByLabelText("Mark reply helpful").textContent).toBe("Helpful");
    expect(screen.getByLabelText("Mark reply not helpful").textContent).toBe("Not really");
  });

  it("both buttons are real stops from the first frame, and A on one that is still decoding marks the answer", () => {
    stubReducedMotion(false);
    const onRate = vi.fn();
    render(<Row replyKey="turn-press" onRate={onRate} />);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(decoding()).toBeGreaterThan(0);

    const helpful = screen.getByLabelText("Mark reply helpful");
    const notReally = screen.getByLabelText("Mark reply not helpful");
    expect(helpful.getAttribute("aria-disabled")).toBeNull();
    expect(notReally.getAttribute("aria-disabled")).toBeNull();
    act(() => notReally.focus());
    expect(document.activeElement).toBe(notReally);

    fireEvent.click(notReally);
    expect(onRate).toHaveBeenCalledWith("down");
  });

  it("plays once per answer: not on a re-render, not when the answer is scrolled back, again for another answer", () => {
    stubReducedMotion(false);
    const { rerender, unmount } = render(<Row replyKey="turn-once" />);
    act(() => {
      vi.advanceTimersByTime(ALL_DONE_MS);
    });
    expect(decoding()).toBe(0);

    rerender(<Row replyKey="turn-once" />);
    expect(decoding()).toBe(0);

    unmount();
    render(<Row replyKey="turn-once" />);
    expect(decoding()).toBe(0);
    expect(screen.getByText("Was this helpful?")).toBeTruthy();
    cleanup();
    render(<Row replyKey="turn-other" />);
    expect(decoding()).toBe(3);
  });

  it("under less motion the row shows at once, with nothing scrambling", () => {
    stubReducedMotion(true);
    render(<Row replyKey="turn-still" />);
    expect(decoding()).toBe(0);
    expect(screen.getByText("Was this helpful?")).toBeTruthy();
    expect(screen.getByLabelText("Mark reply helpful").textContent).toBe("Helpful");
  });
});
