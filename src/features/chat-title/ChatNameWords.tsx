/**
 * Title: The chat's name, sliding once to show the rest
 *
 * Purpose: The words of the chat's name in Decky's bar. A name that fits is drawn as it is. A name too
 * long for its room is cut short with "…" at rest; while Steam's ring is on the name it slides along
 * once to show the rest, waits a moment at the end, slides back, and stays still again with its "…".
 * The pace, the wait before it starts, the wait at the end and the faded edge are the suggestion
 * chips' own (presetScrollPlan and PRESET_MARQUEE_FADE_LENGTH in presetRowLayout.ts), so a long chip
 * and a long chat name read at the same speed.
 *
 * Used for: ChatTitleView.tsx.
 *
 * Solves: Plan 84 § 2 item 5: about 20 characters fit (139 points); the full name is always in the
 * chats menu, and this lets a person read it in place too.
 *
 * Does not: Move for anyone who has asked their system for less motion: the name is cut short with
 * "…" and stays still. Does not loop: it slides once each time the ring arrives.
 *
 * `data-scroll-phase` says where the slide has got to: fits, rest, waiting, out, end, back.
 */
import React, { useLayoutEffect, useRef, useState } from "react";

import { PRESET_MARQUEE_FADE_LENGTH, presetScrollPlan } from "../preset-carousel/presetRowLayout";
import { prefersReducedMotion } from "../preset-carousel/presetChipShared";

type Phase = "rest" | "waiting" | "out" | "end" | "back";

/**
 * In: the name, and whether Steam's ring is on it. Out: the words, cut short at rest and sliding once
 * while `ringOn`. Can go wrong: nothing visible; a measurement of 0 (nothing laid out yet) only means
 * the name is treated as fitting until the ring arrives again.
 */
export function ChatNameWords({ text, ringOn }: { text: string; ringOn: boolean }): React.ReactElement {
  const roomRef = useRef<HTMLElement | null>(null);
  const [overflowPx, setOverflowPx] = useState(0);
  const [phase, setPhase] = useState<Phase>("rest");

  /* Measured on the live element at rest, where the words are plain text inside the room. */
  useLayoutEffect(() => {
    const room = roomRef.current;
    if (!room || phase !== "rest") return;
    setOverflowPx(Math.max(0, Math.ceil(room.scrollWidth - room.clientWidth)));
  }, [text, ringOn, phase]);

  const slides = ringOn && overflowPx > 0 && !prefersReducedMotion();
  const plan = slides ? presetScrollPlan(overflowPx) : null;

  useLayoutEffect(() => {
    if (!plan) {
      setPhase("rest");
      return;
    }
    setPhase("waiting");
    const timers = [
      window.setTimeout(() => setPhase("out"), plan.delayMs),
      window.setTimeout(() => setPhase("end"), plan.delayMs + plan.crawlMs),
      window.setTimeout(() => setPhase("back"), plan.endMs + plan.pauseMs),
      /* Back at the start: still again, cut short again, until the ring comes back. */
      window.setTimeout(() => setPhase("rest"), plan.endMs + plan.pauseMs + plan.crawlMs),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the plan follows these three
  }, [slides, overflowPx, text]);

  const shown: Phase | "fits" = overflowPx > 0 ? phase : "fits";
  const moving = shown === "waiting" || shown === "out" || shown === "end" || shown === "back";
  const fade = PRESET_MARQUEE_FADE_LENGTH;
  const mask = !moving
    ? undefined
    : shown === "waiting"
      ? `linear-gradient(to right, #000 calc(100% - ${fade}px), transparent)`
      : shown === "end"
        ? `linear-gradient(to right, transparent, #000 ${fade}px)`
        : `linear-gradient(to right, transparent, #000 ${fade}px, #000 calc(100% - ${fade}px), transparent)`;
  const away = shown === "out" || shown === "end";
  return (
    <b
      ref={roomRef}
      className="bonsai-chat-title__words"
      data-scroll-phase={shown}
      style={mask ? { WebkitMaskImage: mask, maskImage: mask } : undefined}
    >
      {moving ? (
        <span
          className="bonsai-chat-title__run"
          style={{
            transform: away ? `translateX(-${overflowPx}px)` : "translateX(0px)",
            transition: shown === "out" || shown === "back" ? `transform ${plan?.crawlMs ?? 0}ms linear` : "none",
          }}
        >
          {text}
        </span>
      ) : (
        text
      )}
    </b>
  );
}
