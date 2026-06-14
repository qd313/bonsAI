import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, Focusable, Router } from "@decky/ui";
import type { AskModeId } from "../data/askMode";
import {
  getRandomPresetExcluding,
  getRandomPresets,
  holdMsForPresetText,
  type PresetPrompt,
} from "../data/presets";
import {
  advanceCarouselFocus,
  buildInitialCarouselState,
  CAROUSEL_MANUAL_PAUSE_MS,
  CAROUSEL_SLIDE_MS,
  CAROUSEL_STEP_MS,
  carouselTrackOffsetPx,
  mergeContextualSeeds,
  seedsKeyFrom,
} from "../features/preset-carousel/carouselState";
import { BONSAI_FOREST_GREEN } from "../features/unified-input/constants";
import { joinPresetWithRunningGame } from "../utils/joinPresetWithRunningGame";

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

export type PresetChipAnimationMode = "fade" | "carousel" | "static";

export type MainTabPresetAnimatedChipsProps = {
  /** When upstream presets change (e.g. after ask), carousel re-seeds from this list. */
  seeds: PresetPrompt[];
  setUnifiedInput: React.Dispatch<React.SetStateAction<string>>;
  /** When false, chips stay fully opaque and prompts rotate after hold without opacity transitions. */
  fadeAnimationEnabled?: boolean;
  /** fade = opacity crossfade; carousel = vertical stack with middle focus; static = no opacity animation. */
  animationMode?: PresetChipAnimationMode;
  /** If a preset declares `preferAskMode`, apply it when the chip is chosen. */
  onPreferAskMode?: (mode: AskModeId) => void;
  /** Carousel mode: D-pad Down at end of history moves focus to the Ask field. */
  onCarouselExitDown?: () => void;
};

function PresetChipButton(props: {
  preset: PresetPrompt;
  setUnifiedInput: React.Dispatch<React.SetStateAction<string>>;
  onPreferAskMode?: (mode: AskModeId) => void;
  dimmed?: boolean;
  focusable?: boolean;
}) {
  const { preset: p, setUnifiedInput, onPreferAskMode, dimmed, focusable = true } = props;
  return (
    <Button
      className="bonsai-preset-glass"
      focusable={focusable}
      onClick={() => {
        const gameName = Router.MainRunningApp?.display_name ?? "";
        setUnifiedInput(gameName ? joinPresetWithRunningGame(p.text, gameName) : p.text);
        if (p.preferAskMode && onPreferAskMode) {
          onPreferAskMode(p.preferAskMode);
        }
      }}
      style={{
        width: "100%",
        minHeight: 34,
        fontSize: 12,
        color: dimmed ? "#8fa3b8" : "#c4d3e2",
        opacity: dimmed ? 0.55 : 1,
        transform: dimmed ? "scale(0.96)" : "scale(1)",
        transition: "opacity 420ms ease, transform 420ms ease, color 420ms ease",
      }}
    >
      <span className="bonsai-preset-chip-label">
        {p.text}
        {p.beta ? (
          <span
            style={{
              marginLeft: 6,
              fontSize: 10,
              fontStyle: "italic",
              color: `var(--bonsai-ui-accent-main, ${BONSAI_FOREST_GREEN})`,
              fontWeight: 600,
            }}
          >
            [beta]
          </span>
        ) : null}
      </span>
    </Button>
  );
}

function MainTabPresetVerticalCarousel(
  props: Omit<MainTabPresetAnimatedChipsProps, "fadeAnimationEnabled" | "animationMode">,
) {
  const { seeds, setUnifiedInput, onPreferAskMode } = props;
  const seedsKey = seedsKeyFrom(seeds);
  const contextualRef = useRef(normalizeThreeSeeds(seeds));
  contextualRef.current = normalizeThreeSeeds(seeds);

  const [{ history, focusIndex }, setCarousel] = useState(() =>
    buildInitialCarouselState(normalizeThreeSeeds(seeds)),
  );

  const autoPausedUntilRef = useRef(0);
  const verticalRef = useRef<HTMLDivElement | null>(null);

  const pauseAuto = useCallback(() => {
    autoPausedUntilRef.current = performance.now() + CAROUSEL_MANUAL_PAUSE_MS;
  }, []);

  useEffect(() => {
    setCarousel((prev) => mergeContextualSeeds(prev.history, contextualRef.current, prev.focusIndex));
  }, [seedsKey]);

  useEffect(() => {
    const sessionEnd = performance.now() + PRESET_CAROUSEL_ACTIVE_MS;
    let cancelled = false;
    let timeoutId = 0;

    const tick = () => {
      if (cancelled || performance.now() >= sessionEnd) return;
      if (performance.now() < autoPausedUntilRef.current) {
        timeoutId = window.setTimeout(tick, CAROUSEL_STEP_MS);
        return;
      }
      /* Never auto-advance while the user is browsing the carousel: focusIndex follows DOM
         focus, so moving it under the user would desync the white Steam ring from the blue row. */
      if (verticalRef.current?.contains(document.activeElement)) {
        timeoutId = window.setTimeout(tick, CAROUSEL_STEP_MS);
        return;
      }

      setCarousel((prev) => {
        const texts = new Set(prev.history.map((s) => s.text));
        const nextPreset = getRandomPresetExcluding(texts);
        const advanced = advanceCarouselFocus(prev.history, prev.focusIndex, nextPreset);
        return advanced;
      });

      timeoutId = window.setTimeout(tick, CAROUSEL_STEP_MS);
    };

    timeoutId = window.setTimeout(tick, CAROUSEL_STEP_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [seedsKey]);

  /**
   * Focus model: the Steam DOM focus (white ring) is the single source of truth. Every chip is
   * focusable; D-pad moves between them natively, and each chip's onFocus syncs `focusIndex`
   * (blue highlight + track centering) to itself. The previous design moved `focusIndex` via
   * parent onMoveUp/onMoveDown without moving DOM focus, which left the white ring one row
   * behind the blue row — the "two outlines, the white one actually selects" confusion.
   */
  const onChipFocus = useCallback(
    (i: number) => {
      pauseAuto();
      setCarousel((prev) => (prev.focusIndex === i ? prev : { ...prev, focusIndex: i }));
    },
    [pauseAuto],
  );

  const trackOffset = carouselTrackOffsetPx(focusIndex);

  return (
    <Focusable className="bonsai-preset-carousel-focus-root">
      <div className="bonsai-preset-carousel-vertical" ref={verticalRef}>
        <div
          className="bonsai-preset-carousel-track"
          style={{
            transform: `translateY(-${trackOffset}px)`,
            transition: `transform ${CAROUSEL_SLIDE_MS}ms ease-in-out`,
          }}
        >
          {history.map((preset, i) => {
            const isFocus = i === focusIndex;
            const dimmed = !isFocus;
            return (
              <div
                key={`${i}-${preset.text}`}
                className={
                  "bonsai-preset-carousel-slot" +
                  (isFocus ? " bonsai-preset-carousel-slot--focus" : "")
                }
                data-bonsai-preset-visible="true"
                /* React onFocus delegates focusin (bubbles): fires when the inner chip Button
                   gains Steam focus. @decky/ui Button doesn't expose onFocus itself. */
                onFocus={() => onChipFocus(i)}
              >
                <PresetChipButton
                  preset={preset}
                  setUnifiedInput={setUnifiedInput}
                  onPreferAskMode={onPreferAskMode}
                  dimmed={dimmed}
                  focusable
                />
              </div>
            );
          })}
        </div>
      </div>
    </Focusable>
  );
}

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

function MainTabPresetAnimatedChipsInner(props: MainTabPresetAnimatedChipsProps) {
  const {
    seeds,
    setUnifiedInput,
    fadeAnimationEnabled = true,
    animationMode = "fade",
    onPreferAskMode,
    onCarouselExitDown,
  } = props;
  if (animationMode === "carousel") {
    return (
      <MainTabPresetVerticalCarousel
        seeds={seeds}
        setUnifiedInput={setUnifiedInput}
        onPreferAskMode={onPreferAskMode}
        onCarouselExitDown={onCarouselExitDown}
      />
    );
  }
  const staticMode = animationMode === "static" || !fadeAnimationEnabled;
  const seedsKey = seedsKeyFrom(seeds);

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

    if (staticMode) {
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

        pushTimeout(() => {
          setSlotFade((prev) => {
            const next = [...prev] as [SlotFade, SlotFade, SlotFade];
            next[slotIndex] = { opacity: 1, transitionMs: PRESET_CAROUSEL_FADE_IN_MS };
            return next;
          });

          pushTimeout(() => {
            const hold = holdMsForPresetText(prompt.text);

            pushTimeout(() => {
              setSlotFade((prev) => {
                const next = [...prev] as [SlotFade, SlotFade, SlotFade];
                next[slotIndex] = { opacity: 0, transitionMs: PRESET_CAROUSEL_FADE_OUT_MS };
                return next;
              });

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
  }, [seedsKey, seeds, staticMode]);

  return (
    <>
      {slots.map((p, i) => {
        const slotOpacity = slotFade[i]?.opacity ?? 0;
        const presetInteractive = staticMode || slotOpacity > 0;
        return (
          <div
            key={`preset-slot-${i}`}
            className="bonsai-preset-carousel-slot"
            data-bonsai-preset-visible={presetInteractive ? "true" : "false"}
            style={{
              opacity: slotOpacity,
              transition: `opacity ${slotFade[i]?.transitionMs ?? PRESET_CAROUSEL_FADE_IN_MS}ms ease-in-out`,
            }}
          >
            <Button
              key={`${i}-${p.text}`}
              className="bonsai-preset-glass"
              focusable={presetInteractive}
              onClick={() => {
                const gameName = Router.MainRunningApp?.display_name ?? "";
                setUnifiedInput(gameName ? joinPresetWithRunningGame(p.text, gameName) : p.text);
                if (p.preferAskMode && onPreferAskMode) {
                  onPreferAskMode(p.preferAskMode);
                }
              }}
              style={{
                width: "100%",
                minHeight: 34,
                fontSize: 12,
                color: "#c4d3e2",
              }}
            >
              <span className="bonsai-preset-chip-label">
                {p.text}
                {p.beta && (
                  <span
                    style={{
                      marginLeft: 6,
                      fontSize: 10,
                      fontStyle: "italic",
                      color: `var(--bonsai-ui-accent-main, ${BONSAI_FOREST_GREEN})`,
                      fontWeight: 600,
                    }}
                  >
                    [beta]
                  </span>
                )}
              </span>
            </Button>
          </div>
        );
      })}
    </>
  );
}

function presetChipsPropsEqual(
  prev: MainTabPresetAnimatedChipsProps,
  next: MainTabPresetAnimatedChipsProps,
): boolean {
  return (
    seedsKeyFrom(prev.seeds) === seedsKeyFrom(next.seeds) &&
    prev.animationMode === next.animationMode &&
    prev.fadeAnimationEnabled === next.fadeAnimationEnabled &&
    prev.onPreferAskMode === next.onPreferAskMode &&
    prev.onCarouselExitDown === next.onCarouselExitDown
  );
}

export const MainTabPresetAnimatedChips = React.memo(MainTabPresetAnimatedChipsInner, presetChipsPropsEqual);
