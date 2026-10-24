/**
 * Title: Where the ring goes after A sends "Explain further"
 * Purpose: Pin plan 97 lane L12 (workshop:test-evidence/plan96-P96-F6-EXPLAIN-try2.json): A on an open glossary
 *          word sent the question and closed the box, and then no control held Steam's ring until the next press.
 *          The send moves the answer the word sits in up into the earlier turns, so the word's element goes away
 *          with the ring on it. Now the chip hands the ring to the question box through Steam's own transfer, and
 *          stays on the word itself only when that transfer is refused.
 * Used for: GlossaryTermChip.tsx (the second A in `activate`).
 * Does not: Prove it on the Deck. Steam's ring is the stand-in in src/test-harness/steamRing.tsx: a transfer moves
 *           the `gpfocus` marker, a plain focus() does not. It owes Deck row P97-L12-EXPLAIN-RING.
 */
import React, { useState } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../test-harness/steamRing");
  return { ...stubs, Focusable: SteamRingFocusable };
});

import { Focusable } from "@decky/ui";
import { DrgGlossaryTermChip } from "./GlossaryTermChip";
import { TEST_GLOSSARY_TERMS } from "../../test-harness/glossaryTestTerms";
import { registerNavFocus, resetNavFocusRegistry, unregisterNavFocus, type NavRefHolder } from "../../shared/dpad/navFocusRegistry";
import { resetUiDocument } from "../../shared/dpad/uiDocument";
import { putSteamRingOn, steamRingHolder, type SteamEl } from "../../test-harness/steamRing";

const kitingTerm = TEST_GLOSSARY_TERMS.find((t) => t.id === "kiting")!;

/** The question box as Steam sees it: its own container, registered for Steam's transfer like the real one. */
function QuestionBox({ register }: { register: boolean }) {
  const navRef = React.useRef<NavRefHolder["current"]>(null);
  React.useEffect(() => {
    if (!register) return undefined;
    const holder = navRef as NavRefHolder;
    registerNavFocus("unified-input", holder);
    return () => unregisterNavFocus("unified-input", holder);
  }, [register]);
  const FocusableAny = Focusable as unknown as React.ComponentType<Record<string, unknown>>;
  return (
    <FocusableAny navRef={navRef} className="question-box">
      <textarea aria-label="question box" />
    </FocusableAny>
  );
}

/**
 * The answer and the box, as on the Main tab. A send pushes the live answer into the earlier turns, which draws
 * it again under a new key, so the word the ring was on leaves the page: modelled by unmounting the word.
 */
function MainTabWorld({ boxRegistered, onSent }: { boxRegistered: boolean; onSent: () => void }) {
  const [answerKey, setAnswerKey] = useState("live");
  return (
    <div>
      <div className="answer" key={answerKey}>
        {answerKey === "live" && (
          <DrgGlossaryTermChip
            term={kitingTerm}
            matchedText="Kiting"
            onExplainFurther={() => {
              onSent();
              setAnswerKey("archived");
            }}
          />
        )}
      </div>
      <QuestionBox register={boxRegistered} />
    </div>
  );
}

function word(): SteamEl {
  return document.querySelector(".bonsai-drg-glossary-term") as SteamEl;
}

/** A, the way Steam delivers it to the word: its button handler with the A button. */
function pressA(): void {
  const before = steamRingHolder();
  act(() => {
    (word().__nav?.onButtonDown as (e: unknown) => unknown)({ detail: { button: 1 } });
  });
  // React redraws the word's class list when the box opens or closes, which wipes the stand-in's marker. Steam's
  // own ring does not move for that, so it is put back on the same element, but only if that element is still
  // on the page and nothing else took the ring.
  if (before?.isConnected && !steamRingHolder()) before.classList.add("gpfocus");
}

beforeEach(() => {
  resetNavFocusRegistry();
  resetUiDocument();
});
afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  resetNavFocusRegistry();
});

describe("A on an open glossary word sends the question and leaves the ring somewhere", () => {
  it("the ring is on the question box after the second A, not on nothing", () => {
    const onSent = vi.fn();
    render(<MainTabWorld boxRegistered onSent={onSent} />);
    putSteamRingOn(word());
    pressA(); // the box opens
    expect(document.querySelector(".bonsai-drg-glossary-hint")).not.toBeNull();
    pressA(); // the question goes out
    expect(onSent).toHaveBeenCalledTimes(1);
    expect(document.querySelector(".bonsai-drg-glossary-tooltip")).toBeNull();
    const ring = steamRingHolder();
    expect(ring).not.toBeNull();
    expect(ring?.getAttribute("aria-label")).toBe("question box");
  });

  it("the first A only opens the box and leaves the ring on the word", () => {
    render(<MainTabWorld boxRegistered onSent={vi.fn()} />);
    putSteamRingOn(word());
    pressA();
    expect(steamRingHolder()).toBe(word());
  });

  it("with the box's transfer refused, the ring stays on the word itself", () => {
    // No send leaves the answer in place here, so the word is still drawn to hold the ring.
    render(<DrgGlossaryTermChip term={kitingTerm} matchedText="Kiting" onExplainFurther={vi.fn()} />);
    const chip = word();
    putSteamRingOn(chip);
    pressA();
    pressA();
    expect(steamRingHolder()).toBe(chip);
    expect(document.activeElement).toBe(chip);
  });
});
