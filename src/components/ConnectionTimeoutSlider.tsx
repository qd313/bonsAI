import React, { useCallback, useMemo, useRef, useState } from "react";
import { Focusable } from "@decky/ui";
import {
  LATENCY_WARNING_STEP_SECONDS,
  MAX_REQUEST_TIMEOUT_SECONDS,
  MIN_LATENCY_WARNING_SECONDS,
  MIN_REQUEST_TIMEOUT_SECONDS,
  normalizeLatencyWarningSeconds,
  normalizeRequestTimeoutSeconds,
  reconcileLatencyWarningAndTimeout,
  REQUEST_TIMEOUT_STEP_SECONDS,
} from "../utils/settingsAndResponse";
import { isLeftNavigationKey, isRightNavigationKey } from "../utils/focusNavigation";

export type ConnectionTimeoutSliderProps = {
  warningSec: number;
  timeoutSec: number;
  onChange: (warningSec: number, timeoutSec: number) => void;
};

type ThumbKind = "warning" | "timeout";

/** Deck focus-graph passes horizontal moves via these callbacks, not always as keyboard events. */
type DeckThumbNavProps = {
  onMoveLeft?: () => boolean | void;
  onMoveRight?: () => boolean | void;
  onButtonDown?: (button: unknown) => boolean | void;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function valueToPct(value: number): number {
  const span = MAX_REQUEST_TIMEOUT_SECONDS - MIN_LATENCY_WARNING_SECONDS;
  if (span <= 0) return 0;
  return ((value - MIN_LATENCY_WARNING_SECONDS) / span) * 100;
}

function pctToRawValue(pct: number): number {
  const span = MAX_REQUEST_TIMEOUT_SECONDS - MIN_LATENCY_WARNING_SECONDS;
  return MIN_LATENCY_WARNING_SECONDS + (span * clamp(pct, 0, 100)) / 100;
}

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
 * One combined track with two adjustable points:
 * - soft warning point (left)
 * - hard timeout point (right)
 */
export function ConnectionTimeoutSlider(props: ConnectionTimeoutSliderProps) {
  const { warningSec, timeoutSec, onChange } = props;

  const [draggingThumb, setDraggingThumb] = useState<ThumbKind | null>(null);
  const [focusedThumb, setFocusedThumb] = useState<ThumbKind | null>(null);
  const [editingThumb, setEditingThumb] = useState<ThumbKind | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const warningWrapRef = useRef<HTMLDivElement | null>(null);
  const timeoutWrapRef = useRef<HTMLDivElement | null>(null);

  const warningPct = useMemo(() => valueToPct(warningSec), [warningSec]);
  const timeoutPct = useMemo(() => valueToPct(timeoutSec), [timeoutSec]);

  const focusThumb = useCallback((thumb: ThumbKind) => {
    const host = thumb === "warning" ? warningWrapRef.current : timeoutWrapRef.current;
    const target = host?.querySelector("[tabindex],button") as HTMLElement | null;
    target?.focus();
  }, []);

  const applyWarning = useCallback(
    (rawValue: number) => {
      const maxAllowedWarning = timeoutSec - LATENCY_WARNING_STEP_SECONDS;
      const clamped = clamp(rawValue, MIN_LATENCY_WARNING_SECONDS, maxAllowedWarning);
      const nextWarning = normalizeLatencyWarningSeconds(clamped, warningSec);
      const pair = reconcileLatencyWarningAndTimeout(nextWarning, timeoutSec);
      onChange(pair.latency_warning_seconds, pair.request_timeout_seconds);
    },
    [onChange, timeoutSec, warningSec]
  );

  const applyTimeout = useCallback(
    (rawValue: number) => {
      const minAllowedTimeout = Math.max(
        MIN_REQUEST_TIMEOUT_SECONDS,
        warningSec + LATENCY_WARNING_STEP_SECONDS
      );
      const clamped = clamp(rawValue, minAllowedTimeout, MAX_REQUEST_TIMEOUT_SECONDS);
      const nextTimeout = normalizeRequestTimeoutSeconds(clamped, timeoutSec);
      const pair = reconcileLatencyWarningAndTimeout(warningSec, nextTimeout);
      onChange(pair.latency_warning_seconds, pair.request_timeout_seconds);
    },
    [onChange, timeoutSec, warningSec]
  );

  const thumbFromClientX = useCallback(
    (clientX: number): ThumbKind => {
      const el = trackRef.current;
      if (!el) return "warning";
      const rect = el.getBoundingClientRect();
      const pct = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
      return Math.abs(pct - warningPct) <= Math.abs(pct - timeoutPct) ? "warning" : "timeout";
    },
    [timeoutPct, warningPct]
  );

  const applyFromClientX = useCallback(
    (clientX: number, thumb: ThumbKind) => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const pct = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
      const rawValue = pctToRawValue(pct);
      if (thumb === "warning") {
        applyWarning(rawValue);
      } else {
        applyTimeout(rawValue);
      }
    },
    [applyTimeout, applyWarning]
  );

  const onTrackPointerDown = useCallback(
    (ev: React.PointerEvent<HTMLDivElement>) => {
      const thumb = thumbFromClientX(ev.clientX);
      setDraggingThumb(thumb);
      ev.currentTarget.setPointerCapture(ev.pointerId);
      applyFromClientX(ev.clientX, thumb);
    },
    [applyFromClientX, thumbFromClientX]
  );

  const onTrackPointerMove = useCallback(
    (ev: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingThumb) return;
      applyFromClientX(ev.clientX, draggingThumb);
    },
    [applyFromClientX, draggingThumb]
  );

  const onTrackPointerUp = useCallback(
    (ev: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingThumb) return;
      if (ev.currentTarget.hasPointerCapture(ev.pointerId)) {
        ev.currentTarget.releasePointerCapture(ev.pointerId);
      }
      setDraggingThumb(null);
    },
    [draggingThumb]
  );

  const onThumbBlur = useCallback((ev: React.FocusEvent) => {
    const rt = ev.relatedTarget as Node | null;
    if (rt && (warningWrapRef.current?.contains(rt) || timeoutWrapRef.current?.contains(rt))) {
      return;
    }
    // Deck sometimes emits blur with null relatedTarget while still interacting with this control.
    if (!rt) return;
    setFocusedThumb(null);
    setEditingThumb(null);
  }, []);

  const handleThumbDirection = useCallback(
    (thumb: ThumbKind, dir: "left" | "right"): boolean => {
      if (editingThumb === thumb) {
        const delta =
          thumb === "warning"
            ? LATENCY_WARNING_STEP_SECONDS * (dir === "right" ? 1 : -1)
            : REQUEST_TIMEOUT_STEP_SECONDS * (dir === "right" ? 1 : -1);
        if (thumb === "warning") {
          applyWarning(warningSec + delta);
        } else {
          applyTimeout(timeoutSec + delta);
        }
        return true;
      }

      if (thumb === "warning" && dir === "right") {
        focusThumb("timeout");
        return true;
      }
      if (thumb === "timeout" && dir === "left") {
        focusThumb("warning");
        return true;
      }

      // Keep horizontal nav inside the control instead of escaping to QAM while a thumb is focused.
      return true;
    },
    [applyTimeout, applyWarning, editingThumb, focusThumb, timeoutSec, warningSec]
  );

  const buildThumbNavHandlers = useCallback(
    (thumb: ThumbKind): DeckThumbNavProps => ({
      onMoveLeft: () => handleThumbDirection(thumb, "left"),
      onMoveRight: () => handleThumbDirection(thumb, "right"),
      onButtonDown: (button: unknown) => {
        const buttonKey = String(button ?? "unknown");
        if (isLeftDeckButton(buttonKey)) return handleThumbDirection(thumb, "left");
        if (isRightDeckButton(buttonKey)) return handleThumbDirection(thumb, "right");
        return false;
      },
    }),
    [handleThumbDirection]
  );

  const buildThumbPointerHandlers = useCallback(
    (thumb: ThumbKind) => ({
      onPointerDown: (ev: React.PointerEvent<HTMLDivElement>) => {
        setFocusedThumb(thumb);
        setDraggingThumb(thumb);
        ev.currentTarget.setPointerCapture(ev.pointerId);
        ev.stopPropagation();
        applyFromClientX(ev.clientX, thumb);
      },
      onPointerMove: (ev: React.PointerEvent<HTMLDivElement>) => {
        if (!ev.currentTarget.hasPointerCapture(ev.pointerId)) return;
        applyFromClientX(ev.clientX, thumb);
      },
      onPointerUp: (ev: React.PointerEvent<HTMLDivElement>) => {
        if (ev.currentTarget.hasPointerCapture(ev.pointerId)) {
          ev.currentTarget.releasePointerCapture(ev.pointerId);
        }
        setDraggingThumb(null);
      },
      onPointerCancel: (ev: React.PointerEvent<HTMLDivElement>) => {
        if (ev.currentTarget.hasPointerCapture(ev.pointerId)) {
          ev.currentTarget.releasePointerCapture(ev.pointerId);
        }
        setDraggingThumb(null);
      },
    }),
    [applyFromClientX]
  );

  const warningPointer = useMemo(() => buildThumbPointerHandlers("warning"), [buildThumbPointerHandlers]);
  const timeoutPointer = useMemo(() => buildThumbPointerHandlers("timeout"), [buildThumbPointerHandlers]);
  const warningNavHandlers = useMemo(() => buildThumbNavHandlers("warning"), [buildThumbNavHandlers]);
  const timeoutNavHandlers = useMemo(() => buildThumbNavHandlers("timeout"), [buildThumbNavHandlers]);

  return (
    <div
      className="bonsai-dual-slider"
      style={{
        width: "100%",
        minWidth: 0,
        maxWidth: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        overflowWrap: "anywhere",
        wordBreak: "break-word",
      }}
    >
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
              left: `${warningPct}%`,
              width: `${Math.max(0, timeoutPct - warningPct)}%`,
              top: 14,
              height: 6,
              borderRadius: 999,
              background: "rgba(124, 214, 255, 0.55)",
            }}
          />
          <div
            ref={warningWrapRef}
            style={{
              position: "absolute",
              left: `calc(${warningPct}% - 22px)`,
              top: 0,
              width: 44,
              height: 40,
              zIndex: 2,
            }}
          >
            <Focusable
              flow-children="vertical"
              {...(warningNavHandlers as Record<string, unknown>)}
              onActivate={() => {
                setEditingThumb((prev) => (prev === "warning" ? null : "warning"));
              }}
              onFocus={() => {
                setFocusedThumb("warning");
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
                {...warningPointer}
                style={{
                  width: 18,
                  height: 18,
                  marginTop: 2,
                  borderRadius: 999,
                  border:
                    focusedThumb === "warning"
                      ? editingThumb === "warning"
                        ? "2px solid #7af3b0"
                        : "2px solid #9ce7ff"
                      : "2px solid #77c4da",
                  background: "#0f2a34",
                  boxShadow:
                    focusedThumb === "warning"
                      ? editingThumb === "warning"
                        ? "0 0 0 2px rgba(122,243,176,0.28)"
                        : "0 0 0 2px rgba(124,214,255,0.22)"
                      : "none",
                  flexShrink: 0,
                  touchAction: "none",
                }}
              />
            </Focusable>
          </div>
          <div
            ref={timeoutWrapRef}
            style={{
              position: "absolute",
              left: `calc(${timeoutPct}% - 22px)`,
              top: 0,
              width: 44,
              height: 40,
              zIndex: 2,
            }}
          >
            <Focusable
              flow-children="vertical"
              {...(timeoutNavHandlers as Record<string, unknown>)}
              onActivate={() => {
                setEditingThumb((prev) => (prev === "timeout" ? null : "timeout"));
              }}
              onFocus={() => {
                setFocusedThumb("timeout");
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
                {...timeoutPointer}
                style={{
                  width: 18,
                  height: 18,
                  marginTop: 2,
                  borderRadius: 999,
                  border:
                    focusedThumb === "timeout"
                      ? editingThumb === "timeout"
                        ? "2px solid #7af3b0"
                        : "2px solid #ffd299"
                      : "2px solid #d5b07c",
                  background: "#352610",
                  boxShadow:
                    focusedThumb === "timeout"
                      ? editingThumb === "timeout"
                        ? "0 0 0 2px rgba(122,243,176,0.28)"
                        : "0 0 0 2px rgba(255,199,124,0.22)"
                      : "none",
                  flexShrink: 0,
                  touchAction: "none",
                }}
              />
            </Focusable>
          </div>
        </div>
      </div>
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
        Soft warning: <span style={{ color: "#9ce7ff", fontWeight: 700 }}>{warningSec}s</span>{" "}
        <span style={{ color: "rgba(255,255,255,0.35)" }}>|</span>{" "}
        Hard timeout: <span style={{ color: "#ffd299", fontWeight: 700 }}>{timeoutSec}s</span>
      </div>
    </div>
  );
}
