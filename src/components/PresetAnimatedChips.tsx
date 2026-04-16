import React, { useEffect, useRef, useState } from "react";
import { Button, Router } from "@decky/ui";
import {
  getRandomPresetExcluding,
  getRandomPresets,
  holdMsForPresetText,
  type PresetPrompt,
} from "../data/presets";

/** Fade-in duration (ms); must match the slot wrapper transition when opacity increases. */
export const PRESET_CAROUSEL_FADE_IN_MS = 1000;
/** Fade-out duration (ms); must match the slot wrapper transition when opacity decreases. */
export const PRESET_CAROUSEL_FADE_OUT_MS = 2000;
/** Carousel schedules new preset cycles for this long after mount/re-seed; in-flight fades still complete, then no more swaps until remount. */
export const PRESET_CAROUSEL_ACTIVE_MS = 60_000;

type SlotFade = { opacity: number; transitionMs: number };

const initialSlotFade = (): [SlotFade, SlotFade, SlotFade] => [
  { opacity: 0, transitionMs: PRESET_CAROUSEL_FADE_IN_MS },
  { opacity: 0, transitionMs: PRESET_CAROUSEL_FADE_IN_MS },
  { opacity: 0, transitionMs: PRESET_CAROUSEL_FADE_IN_MS },
];

/** Stagger first fade-in start per slot so chips animate at different times. */
const PRESET_SLOT_STAGGER_MS: readonly [number, number, number] = [750, 1300, 1700];

function normalizeThreeSeeds(seeds: PresetPrompt[]): [PresetPrompt, PresetPrompt, PresetPrompt] {
  const fallback = getRandomPresets(3);
  return [
    seeds[0] ?? fallback[0]!,
    seeds[1] ?? fallback[1]!,
    seeds[2] ?? fallback[2]!,
  ];
}

export type PresetAnimatedChipsProps = {
  /** When upstream presets change (e.g. after ask), carousel re-seeds from this list. */
  seeds: PresetPrompt[];
  setUnifiedInput: React.Dispatch<React.SetStateAction<string>>;
  /** When false, chips stay fully opaque and prompts rotate after hold without opacity transitions. */
  fadeAnimationEnabled?: boolean;
};

/**
 * Three preset suggestion chips with independent fade in/out cycles.
 * Hold time after each fade-in scales with prompt length; fade durations are fixed.
 * After `PRESET_CAROUSEL_ACTIVE_MS` no new cycles start; any fade already in progress runs to completion, then the carousel rests until remount.
 */
const staticSlotFade = (): [SlotFade, SlotFade, SlotFade] => [
  { opacity: 1, transitionMs: 0 },
  { opacity: 1, transitionMs: 0 },
  { opacity: 1, transitionMs: 0 },
];

export function PresetAnimatedChips(props: PresetAnimatedChipsProps) {
  const { seeds, setUnifiedInput, fadeAnimationEnabled = true } = props;
  const seedsKey = seeds.map((s) => s.text).join("\u0000");

  const [slots, setSlots] = useState<[PresetPrompt, PresetPrompt, PresetPrompt]>(() => normalizeThreeSeeds(seeds));
  const [slotFade, setSlotFade] = useState<[SlotFade, SlotFade, SlotFade]>(initialSlotFade);
  const slotsRef = useRef(slots);
  slotsRef.current = slots;

  useEffect(() => {
    const initial = normalizeThreeSeeds(seeds);
    setSlots(initial);
    slotsRef.current = initial;

    const sessionEnd = performance.now() + PRESET_CAROUSEL_ACTIVE_MS;
    const timeouts: number[] = [];
    let cancelled = false;

    /** Only gate starting a *new* cycle after a full fade-out; never abort mid fade/hold. */
    const mayStartNextCycle = (): boolean => !cancelled && performance.now() < sessionEnd;

    const pushTimeout = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        if (cancelled) return;
        fn();
      }, ms);
      timeouts.push(id);
    };

    const pickNextForSlot = (slotIndex: number, current: PresetPrompt): PresetPrompt => {
      const otherTexts = slotsRef.current.filter((_, j) => j !== slotIndex).map((s) => s.text);
      return getRandomPresetExcluding(new Set([...otherTexts, current.text]));
    };

    if (!fadeAnimationEnabled) {
      setSlotFade(staticSlotFade());
      const runSlotStatic = (slotIndex: 0 | 1 | 2) => {
        const loop = (prompt: PresetPrompt) => {
          const hold = holdMsForPresetText(prompt.text);
          pushTimeout(() => {
            if (!mayStartNextCycle()) return;
            const nextPrompt = pickNextForSlot(slotIndex, prompt);
            slotsRef.current = [...slotsRef.current];
            slotsRef.current[slotIndex] = nextPrompt;
            setSlots([slotsRef.current[0]!, slotsRef.current[1]!, slotsRef.current[2]!]);
            loop(nextPrompt);
          }, hold);
        };
        loop(initial[slotIndex]!);
      };
      runSlotStatic(0);
      runSlotStatic(1);
      runSlotStatic(2);
      return () => {
        cancelled = true;
        timeouts.forEach((id) => window.clearTimeout(id));
      };
    }

    setSlotFade(initialSlotFade());

    const runSlot = (slotIndex: 0 | 1 | 2) => {
      const stagger = PRESET_SLOT_STAGGER_MS[slotIndex];

      const loop = (prompt: PresetPrompt, firstStagger: number) => {
        slotsRef.current = [...slotsRef.current];
        slotsRef.current[slotIndex] = prompt;
        setSlots([slotsRef.current[0]!, slotsRef.current[1]!, slotsRef.current[2]!]);

        setSlotFade((prev) => {
          const next = [...prev] as [SlotFade, SlotFade, SlotFade];
          next[slotIndex] = { opacity: 0, transitionMs: PRESET_CAROUSEL_FADE_OUT_MS };
          return next;
        });

        // Fade in after stagger (subsequent cycles: stagger 0).
        pushTimeout(() => {
          setSlotFade((prev) => {
            const next = [...prev] as [SlotFade, SlotFade, SlotFade];
            next[slotIndex] = { opacity: 1, transitionMs: PRESET_CAROUSEL_FADE_IN_MS };
            return next;
          });

          // Hold after fade-in completes.
          pushTimeout(() => {
            const hold = holdMsForPresetText(prompt.text);

            pushTimeout(() => {
              setSlotFade((prev) => {
                const next = [...prev] as [SlotFade, SlotFade, SlotFade];
                next[slotIndex] = { opacity: 0, transitionMs: PRESET_CAROUSEL_FADE_OUT_MS };
                return next;
              });

              // After fade-out: swap and continue only if the session window is still open.
              pushTimeout(() => {
                if (!mayStartNextCycle()) return;
                const nextPrompt = pickNextForSlot(slotIndex, prompt);
                loop(nextPrompt, 0);
              }, PRESET_CAROUSEL_FADE_OUT_MS);
            }, hold);
          }, PRESET_CAROUSEL_FADE_IN_MS);
        }, firstStagger);
      };

      loop(initial[slotIndex]!, stagger);
    };

    runSlot(0);
    runSlot(1);
    runSlot(2);

    return () => {
      cancelled = true;
      timeouts.forEach((id) => window.clearTimeout(id));
    };
    // seedsKey drives re-seed; include seeds so the effect sees the matching triple when the key changes.
  }, [seedsKey, seeds, fadeAnimationEnabled]);

  return (
    <>
      {slots.map((p, i) => (
        <div
          key={`preset-slot-${i}`}
          className="bonsai-preset-carousel-slot"
          style={{
            opacity: slotFade[i]?.opacity ?? 0,
            transition: `opacity ${slotFade[i]?.transitionMs ?? PRESET_CAROUSEL_FADE_IN_MS}ms ease-in-out`,
          }}
        >
          <Button
            key={`${i}-${p.text}`}
            className="bonsai-preset-glass"
            onClick={() => {
              const gameName = Router.MainRunningApp?.display_name ?? "";
              setUnifiedInput(gameName ? `${p.text} for ${gameName}` : p.text);
            }}
            style={{
              width: "100%",
              minHeight: 34,
              fontSize: 12,
              color: "#c4d3e2",
            }}
          >
            {p.text}
            {p.beta && (
              <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.55, fontStyle: "italic" }}>
                [beta]
              </span>
            )}
          </Button>
        </div>
      ))}
    </>
  );
}
