import React, { useCallback, useMemo, useRef, useState } from "react";
import { Focusable } from "@decky/ui";
import {
  indexOfOllamaKeepAlive,
  OLLAMA_KEEP_ALIVE_CHIP_LABEL,
  OLLAMA_KEEP_ALIVE_ORDER,
  ollamaKeepAliveAtIndex,
  type OllamaKeepAliveDuration,
} from "../data/ollamaKeepAlive";
import { isLeftNavigationKey, isRightNavigationKey } from "../utils/focusNavigation";

export type SettingsTabOllamaKeepAliveSliderProps = {
  value: OllamaKeepAliveDuration;
  onChange: (next: OllamaKeepAliveDuration) => void;
  /** Parent assigns ref to the thumb wrapper for external focus (e.g. D-pad from screenshot row). */
  thumbHostRef?: React.Ref<HTMLDivElement>;
  onMoveUp?: () => boolean;
  onMoveDown?: () => boolean;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function pctToIndex(pct: number, maxIdx: number): number {
  if (maxIdx <= 0) return 0;
  return clamp(Math.round((clamp(pct, 0, 100) / 100) * maxIdx), 0, maxIdx);
}

function indexToPct(index: number, maxIdx: number): number {
  if (maxIdx <= 0) return 50;
  return (index / maxIdx) * 100;
}

type DeckNavProps = {
  onMoveLeft?: () => boolean | void;
  onMoveRight?: () => boolean | void;
  onMoveUp?: () => boolean | void;
  onMoveDown?: () => boolean | void;
  onButtonDown?: (button: unknown) => boolean | void;
};

function isLeftDeckButton(key: string): boolean {
  const lower = key.toLowerCase();
  return (
    isLeftNavigationKey(key) ||
    key === "GamepadLeftStickLeft" ||
    lower.includes("left")
  );
}

function isRightDeckButton(key: string): boolean {
  const lower = key.toLowerCase();
  return (
    isRightNavigationKey(key) ||
    key === "GamepadLeftStickRight" ||
    lower.includes("right")
  );
}

/**
 * Single-thumb track with discrete slots matching Ollama `keep_alive` presets (0s … 240m).
 */
export function SettingsTabOllamaKeepAliveSlider(props: SettingsTabOllamaKeepAliveSliderProps) {
  const { value, onChange, thumbHostRef, onMoveUp, onMoveDown } = props;
  const maxIdx = OLLAMA_KEEP_ALIVE_ORDER.length - 1;
  const index = indexOfOllamaKeepAlive(value);
  const thumbPct = useMemo(() => indexToPct(index, maxIdx), [index, maxIdx]);

  const trackRef = useRef<HTMLDivElement | null>(null);
  const thumbWrapRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [focused, setFocused] = useState(false);
  const [editing, setEditing] = useState(false);

  const setThumbWrapEl = useCallback(
    (el: HTMLDivElement | null) => {
      thumbWrapRef.current = el;
      const ext = thumbHostRef;
      if (typeof ext === "function") ext(el);
      else if (ext && typeof ext === "object" && "current" in ext) {
        (ext as React.MutableRefObject<HTMLDivElement | null>).current = el;
      }
    },
    [thumbHostRef]
  );

  const applyIndex = useCallback(
    (nextIndex: number) => {
      onChange(ollamaKeepAliveAtIndex(nextIndex));
    },
    [onChange]
  );

  const clientXToIndex = useCallback(
    (clientX: number): number => {
      const el = trackRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0) return 0;
      const pct = ((clientX - rect.left) / rect.width) * 100;
      return pctToIndex(pct, maxIdx);
    },
    [maxIdx]
  );

  const onTrackPointerDown = useCallback(
    (ev: React.PointerEvent<HTMLDivElement>) => {
      setDragging(true);
      ev.currentTarget.setPointerCapture(ev.pointerId);
      applyIndex(clientXToIndex(ev.clientX));
    },
    [applyIndex, clientXToIndex]
  );

  const onTrackPointerMove = useCallback(
    (ev: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      applyIndex(clientXToIndex(ev.clientX));
    },
    [applyIndex, clientXToIndex, dragging]
  );

  const onTrackPointerUp = useCallback(
    (ev: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      if (ev.currentTarget.hasPointerCapture(ev.pointerId)) {
        ev.currentTarget.releasePointerCapture(ev.pointerId);
      }
      setDragging(false);
    },
    [dragging]
  );

  const bumpIndex = useCallback(
    (delta: number) => {
      applyIndex(clamp(index + delta, 0, maxIdx));
    },
    [applyIndex, index, maxIdx]
  );

  const thumbNav: DeckNavProps = useMemo(
    () => ({
      onMoveLeft: () => {
        bumpIndex(-1);
        return true;
      },
      onMoveRight: () => {
        bumpIndex(1);
        return true;
      },
      onMoveUp: () => onMoveUp?.() ?? false,
      onMoveDown: () => onMoveDown?.() ?? false,
      onButtonDown: (button: unknown) => {
        const buttonKey = String(button ?? "unknown");
        if (isLeftDeckButton(buttonKey)) {
          bumpIndex(-1);
          return true;
        }
        if (isRightDeckButton(buttonKey)) {
          bumpIndex(1);
          return true;
        }
        return false;
      },
    }),
    [bumpIndex, onMoveDown, onMoveUp]
  );

  const thumbPointer = useMemo(
    () => ({
      onPointerDown: (ev: React.PointerEvent<HTMLDivElement>) => {
        setFocused(true);
        setDragging(true);
        ev.currentTarget.setPointerCapture(ev.pointerId);
        ev.stopPropagation();
        applyIndex(clientXToIndex(ev.clientX));
      },
      onPointerMove: (ev: React.PointerEvent<HTMLDivElement>) => {
        if (!ev.currentTarget.hasPointerCapture(ev.pointerId)) return;
        applyIndex(clientXToIndex(ev.clientX));
      },
      onPointerUp: (ev: React.PointerEvent<HTMLDivElement>) => {
        if (ev.currentTarget.hasPointerCapture(ev.pointerId)) {
          ev.currentTarget.releasePointerCapture(ev.pointerId);
        }
        setDragging(false);
      },
      onPointerCancel: (ev: React.PointerEvent<HTMLDivElement>) => {
        if (ev.currentTarget.hasPointerCapture(ev.pointerId)) {
          ev.currentTarget.releasePointerCapture(ev.pointerId);
        }
        setDragging(false);
      },
    }),
    [applyIndex, clientXToIndex]
  );

  const onThumbBlur = useCallback((ev: React.FocusEvent) => {
    const rt = ev.relatedTarget as Node | null;
    if (rt && thumbWrapRef.current?.contains(rt)) return;
    if (!rt) return;
    setFocused(false);
    setEditing(false);
  }, []);

  return (
    <div
      className="bonsai-ollama-keepalive-slider"
      style={{
        width: "100%",
        minWidth: 0,
        maxWidth: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        overflowWrap: "anywhere",
        wordBreak: "break-word",
      }}
    >
      <div
        className="bonsai-prose"
        style={{
          fontSize: 13,
          color: "#cdd9e6",
          lineHeight: 1.35,
          paddingLeft: 2,
          minWidth: 0,
          maxWidth: "100%",
          overflowWrap: "anywhere",
          wordBreak: "break-word",
        }}
      >
        Unload delay:{" "}
        <span style={{ color: "#9ce7ff", fontWeight: 700 }}>{OLLAMA_KEEP_ALIVE_CHIP_LABEL[value]}</span>
      </div>
      <div
        style={{
          width: "100%",
          minWidth: 0,
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.16)",
          background: "rgba(255,255,255,0.04)",
          padding: "14px 10px 10px 10px",
          boxSizing: "border-box",
        }}
      >
        <div
          ref={trackRef}
          onPointerDown={onTrackPointerDown}
          onPointerMove={onTrackPointerMove}
          onPointerUp={onTrackPointerUp}
          onPointerCancel={onTrackPointerUp}
          style={{
            position: "relative",
            width: "100%",
            height: 34,
            touchAction: "none",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 14,
              height: 6,
              borderRadius: 999,
              background: "rgba(255,255,255,0.2)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              width: `${thumbPct}%`,
              top: 14,
              height: 6,
              borderRadius: 999,
              background: "rgba(124, 214, 255, 0.45)",
              pointerEvents: "none",
            }}
          />
          <div
            ref={setThumbWrapEl}
            data-bonsai-ollama-keepalive-thumb="1"
            style={{
              position: "absolute",
              left: `calc(${thumbPct}% - 21px)`,
              top: 0,
              width: 42,
              height: 40,
              zIndex: 2,
            }}
          >
            <Focusable
              flow-children="vertical"
              {...(thumbNav as Record<string, unknown>)}
              onActivate={() => {
                setEditing((prev) => !prev);
              }}
              onFocus={() => {
                setFocused(true);
              }}
              onBlur={onThumbBlur}
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                paddingTop: 4,
                boxSizing: "border-box",
              }}
            >
              <div
                {...thumbPointer}
                style={{
                  width: 18,
                  height: 18,
                  marginTop: 2,
                  borderRadius: 999,
                  border:
                    focused && editing
                      ? "2px solid #7af3b0"
                      : focused
                        ? "2px solid #9ce7ff"
                        : "2px solid #77c4da",
                  background: "#0f2a34",
                  boxShadow:
                    focused && editing
                      ? "0 0 0 2px rgba(122,243,176,0.28)"
                      : focused
                        ? "0 0 0 2px rgba(124,214,255,0.22)"
                        : "none",
                  flexShrink: 0,
                  touchAction: "none",
                }}
              />
            </Focusable>
          </div>
        </div>
      </div>
    </div>
  );
}
