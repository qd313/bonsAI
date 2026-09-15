/**
 * Title: Warning and timeout slider
 *
 * Purpose: One slider track with two handles that set how long bonsAI
 * waits on a slow AI request. The left, amber handle is the soft warning —
 * past this many seconds, a "this is taking a while" hint appears while the
 * question keeps waiting. The right, blue handle is the hard timeout — past
 * this many seconds, the question is given up on. The two handles cannot
 * cross: moving one close enough to the other pushes the other one along
 * with it, so the warning always fires before the timeout, never after.
 *
 * Used for: The Settings tab's connection section.
 *
 * Solves: Puts both thresholds on one shared scale instead of two separate
 * number fields, so it is visible at a glance how close the warning sits to
 * the actual cutoff.
 *
 * Does not: Check the connection or cancel a question that is already
 * running — moving a handle only changes the two saved numbers; something
 * else reads them the next time a question is asked.
 *
 * Gotchas: A handle does nothing with Left/Right by itself — press A first
 * to put it into "editing" (its ring turns green), and only then do
 * Left/Right nudge its value one step at a time. Without pressing A, Right
 * on the warning handle and Left on the timeout handle instead jump the
 * D-pad ring across to the other handle, so a person can reach either one
 * without a dedicated row of its own. Dragging a handle with a mouse or
 * touch always moves it straight to wherever it is dragged, regardless of
 * that editing state.
 */
import React, { useCallback, useMemo, useRef, useState } from "react";
import { LATENCY_WARNING_STEP_SECONDS, MAX_REQUEST_TIMEOUT_SECONDS, MIN_LATENCY_WARNING_SECONDS, MIN_REQUEST_TIMEOUT_SECONDS, REQUEST_TIMEOUT_STEP_SECONDS } from "../data/bonsaiSettingsSchema";
import { normalizeLatencyWarningSeconds, normalizeRequestTimeoutSeconds, reconcileLatencyWarningAndTimeout } from "../data/bonsaiSettingsNormalizers";
import { DeckFocusSliderThumb } from "./deck/DeckFocusSlider";
import {
  clamp,
  clientXToPct,
  pctToValue,
  pickNearestThumbIndex,
  valueToPct,
} from "../utils/deckSliderMath";

export type SettingsTabConnectionTimeoutSliderProps = {
  warningSec: number;
  timeoutSec: number;
  onChange: (warningSec: number, timeoutSec: number) => void;
  /** Deck focus-graph: D-pad down from either thumb focuses the next settings block (e.g. screenshot dimension). */
  onMoveDownFromThumb?: () => boolean;
  /** Deck focus-graph: D-pad up from the hard-timeout thumb focuses the Ollama IP row above (not the soft-warning thumb). */
  onMoveUpFromTimeoutThumb?: () => boolean;
  /** Parent can focus the soft-warning thumb (e.g. D-pad up from screenshot settings). */
  warningThumbHostRef?: React.Ref<HTMLDivElement>;
};

type ThumbKind = "warning" | "timeout";

/**
 * One combined track with two adjustable points:
 * - soft warning point (left)
 * - hard timeout point (right)
 */
export function SettingsTabConnectionTimeoutSlider(props: SettingsTabConnectionTimeoutSliderProps) {
  const { warningSec, timeoutSec, onChange, onMoveDownFromThumb, onMoveUpFromTimeoutThumb, warningThumbHostRef } =
    props;

  const [draggingThumb, setDraggingThumb] = useState<ThumbKind | null>(null);
  const [focusedThumb, setFocusedThumb] = useState<ThumbKind | null>(null);
  const [editingThumb, setEditingThumb] = useState<ThumbKind | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const warningWrapRef = useRef<HTMLDivElement | null>(null);
  const timeoutWrapRef = useRef<HTMLDivElement | null>(null);

  const warningPct = useMemo(
    () => valueToPct(warningSec, MIN_LATENCY_WARNING_SECONDS, MAX_REQUEST_TIMEOUT_SECONDS),
    [warningSec],
  );
  const timeoutPct = useMemo(
    () => valueToPct(timeoutSec, MIN_LATENCY_WARNING_SECONDS, MAX_REQUEST_TIMEOUT_SECONDS),
    [timeoutSec],
  );

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
    [onChange, timeoutSec, warningSec],
  );

  const applyTimeout = useCallback(
    (rawValue: number) => {
      const minAllowedTimeout = Math.max(
        MIN_REQUEST_TIMEOUT_SECONDS,
        warningSec + LATENCY_WARNING_STEP_SECONDS,
      );
      const clamped = clamp(rawValue, minAllowedTimeout, MAX_REQUEST_TIMEOUT_SECONDS);
      const nextTimeout = normalizeRequestTimeoutSeconds(clamped, timeoutSec);
      const pair = reconcileLatencyWarningAndTimeout(warningSec, nextTimeout);
      onChange(pair.latency_warning_seconds, pair.request_timeout_seconds);
    },
    [onChange, timeoutSec, warningSec],
  );

  const thumbFromClientX = useCallback(
    (clientX: number): ThumbKind => {
      const el = trackRef.current;
      if (!el) return "warning";
      const pct = clientXToPct(clientX, el.getBoundingClientRect());
      return pickNearestThumbIndex(pct, [warningPct, timeoutPct]) === 0 ? "warning" : "timeout";
    },
    [timeoutPct, warningPct],
  );

  const applyFromClientX = useCallback(
    (clientX: number, thumb: ThumbKind) => {
      const el = trackRef.current;
      if (!el) return;
      const pct = clientXToPct(clientX, el.getBoundingClientRect());
      const rawValue = pctToValue(pct, MIN_LATENCY_WARNING_SECONDS, MAX_REQUEST_TIMEOUT_SECONDS);
      if (thumb === "warning") applyWarning(rawValue);
      else applyTimeout(rawValue);
    },
    [applyTimeout, applyWarning],
  );

  const onTrackPointerDown = useCallback(
    (ev: React.PointerEvent<HTMLDivElement>) => {
      const thumb = thumbFromClientX(ev.clientX);
      setDraggingThumb(thumb);
      ev.currentTarget.setPointerCapture(ev.pointerId);
      applyFromClientX(ev.clientX, thumb);
    },
    [applyFromClientX, thumbFromClientX],
  );

  const onTrackPointerMove = useCallback(
    (ev: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingThumb) return;
      applyFromClientX(ev.clientX, draggingThumb);
    },
    [applyFromClientX, draggingThumb],
  );

  const onTrackPointerUp = useCallback(
    (ev: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingThumb) return;
      if (ev.currentTarget.hasPointerCapture(ev.pointerId)) {
        ev.currentTarget.releasePointerCapture(ev.pointerId);
      }
      setDraggingThumb(null);
    },
    [draggingThumb],
  );

  const onThumbBlur = useCallback((ev: React.FocusEvent) => {
    const rt = ev.relatedTarget as Node | null;
    if (rt && (warningWrapRef.current?.contains(rt) || timeoutWrapRef.current?.contains(rt))) return;
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
        if (thumb === "warning") applyWarning(warningSec + delta);
        else applyTimeout(timeoutSec + delta);
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
      return true;
    },
    [applyTimeout, applyWarning, editingThumb, focusThumb, timeoutSec, warningSec],
  );

  const warningDotStyle = useCallback(
    ({ focused, editing }: { focused: boolean; editing: boolean; dragging: boolean }) => ({
      border:
        focused && editing
          ? "2px solid #7af3b0"
          : focused
            ? "2px solid #ffd299"
            : "2px solid #c4a06e",
      background: "#2a1f0f",
      boxShadow:
        focused && editing
          ? "0 0 0 2px rgba(122,243,176,0.28)"
          : focused
            ? "0 0 0 2px rgba(255,199,124,0.25)"
            : "none",
    }),
    [],
  );

  const timeoutDotStyle = useCallback(
    ({ focused, editing }: { focused: boolean; editing: boolean; dragging: boolean }) => ({
      border:
        focused && editing
          ? "2px solid #7af3b0"
          : focused
            ? "2px solid #9ce7ff"
            : "2px solid #5a8aaa",
      background: "#0f2434",
      boxShadow:
        focused && editing
          ? "0 0 0 2px rgba(122,243,176,0.28)"
          : focused
            ? "0 0 0 2px rgba(124,214,255,0.25)"
            : "none",
    }),
    [],
  );

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
        Soft warning: <span style={{ color: "#ffd299", fontWeight: 700 }}>{warningSec}s</span>{" "}
        <span style={{ color: "rgba(255,255,255,0.35)" }}>|</span>{" "}
        Hard timeout: <span style={{ color: "#9ce7ff", fontWeight: 700 }}>{timeoutSec}s</span>
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
              left: `${warningPct}%`,
              width: `${Math.max(0, timeoutPct - warningPct)}%`,
              top: 14,
              height: 6,
              borderRadius: 999,
              background: "linear-gradient(90deg, rgba(255, 210, 150, 0.45) 0%, rgba(124, 214, 255, 0.5) 100%)",
            }}
          />
          <DeckFocusSliderThumb
            pct={warningPct}
            focused={focusedThumb === "warning"}
            editing={editingThumb === "warning"}
            onFocus={() => setFocusedThumb("warning")}
            onBlur={onThumbBlur}
            onActivate={() => setEditingThumb((prev) => (prev === "warning" ? null : "warning"))}
            nav={{
              onMoveLeft: () => handleThumbDirection("warning", "left"),
              onMoveRight: () => handleThumbDirection("warning", "right"),
              onMoveDown: () => onMoveDownFromThumb?.() ?? false,
            }}
            onPointerSelect={(clientX) => applyFromClientX(clientX, "warning")}
            getDotStyle={warningDotStyle}
            hostRef={warningThumbHostRef}
            wrapRef={warningWrapRef}
          />
          <DeckFocusSliderThumb
            pct={timeoutPct}
            focused={focusedThumb === "timeout"}
            editing={editingThumb === "timeout"}
            onFocus={() => setFocusedThumb("timeout")}
            onBlur={onThumbBlur}
            onActivate={() => setEditingThumb((prev) => (prev === "timeout" ? null : "timeout"))}
            nav={{
              onMoveLeft: () => handleThumbDirection("timeout", "left"),
              onMoveRight: () => handleThumbDirection("timeout", "right"),
              onMoveUp: () => onMoveUpFromTimeoutThumb?.() ?? false,
              onMoveDown: () => onMoveDownFromThumb?.() ?? false,
            }}
            onPointerSelect={(clientX) => applyFromClientX(clientX, "timeout")}
            getDotStyle={timeoutDotStyle}
            wrapRef={timeoutWrapRef}
          />
        </div>
      </div>
    </div>
  );
}
