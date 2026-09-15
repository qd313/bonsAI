/**
 * Title: Deck focus slider
 *
 * Purpose: The slider control drawn on several rows in Settings and the
 * Ollama tab — UI scale, how long to keep the model warm, how long to wait
 * for a reply before giving up, how detailed replies should be. It draws a
 * horizontal track with a fill bar and, sometimes, tick marks, plus one
 * round thumb: drag it with a finger or mouse, or grab it with the D-pad and
 * step it left and right. This file is the one place that owns the track
 * math, the thumb's look, and how D-pad stepping works, so every slider row
 * in the plugin drags and steps the same way.
 *
 * Used for: Settings and Ollama sliders (UI scale, keep-alive, reply
 * verbosity, connection timeout) — any row that needs a drag-or-step number
 * picker.
 *
 * Solves: Shared track math, thumb visuals, and horizontal D-pad stepping,
 * so a new slider row does not have to reinvent any of it.
 *
 * Does not: Join the vertical focus graph on its own. Whatever screen uses
 * this slider still has to wire a Focusable bridge above it — see the
 * repo's decky-ui-focus policy — or D-pad Up/Down here will not lead
 * anywhere.
 *
 * How it works:
 * 1. `DeckFocusSlider()` draws the track shell, the rail, the fill bar, and
 *    any tick marks, then renders one `DeckFocusSliderThumb()` positioned by
 *    `thumbPct`.
 * 2. A pointer drag on the track itself (`onTrackPointerDown`/`onTrackPointerMove`)
 *    calls `onSelectClientX`, so tapping or dragging anywhere on the track
 *    jumps the thumb straight there.
 * 3. The thumb's D-pad handlers are built once by `buildDeckThumbNavHandlers()`,
 *    which turns `onStepLeft`/`onStepRight` into Left/Right presses that
 *    always claim the move, and passes `onMoveUp`/`onMoveDown` straight
 *    through so a parent section can bridge the slider into its own
 *    vertical flow.
 * 4. `DeckFocusSliderThumb()` wraps the visible dot in its own Focusable,
 *    tracks whether it is focused, dragging, or being edited, and forwards
 *    pointer drags on the dot itself back through `onPointerSelect` — the
 *    same callback the track uses, so dragging the dot and dragging the
 *    track do the same thing.
 * 5. An optional "edit" mode: when `editToggle` is set, pressing A on the
 *    thumb flips a local editing flag, which the caller can use to show
 *    something like a numeric readout while it is true.
 * 6. Visual state (focused / dragging / editing) is handed to the caller's
 *    own `getThumbDotStyle`, so every slider can look slightly different
 *    while sharing this file's math and behavior.
 */
import React, { useCallback, useMemo, useRef, useState } from "react";
import { Focusable } from "@decky/ui";

export type DeckSliderThumbVisualState = {
  focused: boolean;
  editing: boolean;
  dragging: boolean;
};

export type DeckFocusSliderThumbNavProps = {
  onMoveLeft: () => boolean | void;
  onMoveRight: () => boolean | void;
  onMoveUp?: () => boolean | void;
  onMoveDown?: () => boolean | void;
};

/** Merge internal thumb wrapper ref with an optional external host ref. */
function assignDeckSliderThumbHostRef(
  el: HTMLDivElement | null,
  internalRef: React.MutableRefObject<HTMLDivElement | null>,
  externalRef?: React.Ref<HTMLDivElement>,
): void {
  internalRef.current = el;
  if (!externalRef) return;
  if (typeof externalRef === "function") externalRef(el);
  else if (typeof externalRef === "object" && "current" in externalRef) {
    (externalRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
  }
}

/**
 * Left/Right must claim the move on `onMoveLeft`/`onMoveRight` themselves rather than step the
 * value from inside `onButtonDown`. Measured on device 2026-09-03 (ONBUTTONDOWN-AUDIT-01): stepping
 * from `onButtonDown` still let Steam's own navigation carry that same press out of the container,
 * because `onButtonDown`'s return value does not consume a direction the way a `Focusable` move
 * handler does -- so Left stepped the value once and then the ring left the plugin for the Quick
 * Access rail. Defaulting to `true` claims the move even when the callback returns void, the same
 * choice `buildChipNavHandlers` (preset-carousel/presetRowNav.ts) makes at the ends of the chip row.
 */
export function buildDeckThumbNavHandlers(nav: DeckFocusSliderThumbNavProps): Record<string, unknown> {
  return {
    onMoveUp: () => nav.onMoveUp?.() ?? false,
    onMoveDown: () => nav.onMoveDown?.() ?? false,
    onMoveLeft: () => nav.onMoveLeft() ?? true,
    onMoveRight: () => nav.onMoveRight() ?? true,
  };
}

export type DeckFocusSliderThumbProps = {
  pct: number;
  focused: boolean;
  editing: boolean;
  onFocus: () => void;
  onBlur: (ev: React.FocusEvent) => void;
  onActivate?: () => void;
  nav: DeckFocusSliderThumbNavProps;
  onPointerSelect: (clientX: number) => void;
  getDotStyle: (state: DeckSliderThumbVisualState) => React.CSSProperties;
  hostRef?: React.Ref<HTMLDivElement>;
  hostProps?: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>;
  wrapRef: React.MutableRefObject<HTMLDivElement | null>;
};

/** One focusable thumb on a Deck slider track (single- or dual-thumb layouts). */
export function DeckFocusSliderThumb(props: DeckFocusSliderThumbProps) {
  const {
    pct,
    focused,
    editing,
    onFocus,
    onBlur,
    onActivate,
    nav,
    onPointerSelect,
    getDotStyle,
    hostRef,
    hostProps,
    wrapRef,
  } = props;

  const [dragging, setDragging] = useState(false);

  const setWrapEl = useCallback(
    (el: HTMLDivElement | null) => {
      assignDeckSliderThumbHostRef(el, wrapRef, hostRef);
    },
    [hostRef, wrapRef],
  );

  const thumbNav = useMemo(() => buildDeckThumbNavHandlers(nav), [nav]);

  const thumbPointer = useMemo(
    () => ({
      onPointerDown: (ev: React.PointerEvent<HTMLDivElement>) => {
        onFocus();
        setDragging(true);
        ev.currentTarget.setPointerCapture(ev.pointerId);
        ev.stopPropagation();
        onPointerSelect(ev.clientX);
      },
      onPointerMove: (ev: React.PointerEvent<HTMLDivElement>) => {
        if (!ev.currentTarget.hasPointerCapture(ev.pointerId)) return;
        onPointerSelect(ev.clientX);
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
    [onFocus, onPointerSelect],
  );

  const dotStyle = getDotStyle({ focused, editing, dragging });

  return (
    <div
      ref={setWrapEl}
      {...hostProps}
      style={{
        position: "absolute",
        left: `calc(${pct}% - 21px)`,
        top: 0,
        width: 42,
        height: 40,
        zIndex: 2,
        ...hostProps?.style,
      }}
    >
      <Focusable
        flow-children="vertical"
        {...thumbNav}
        onActivate={onActivate}
        onFocus={onFocus}
        onBlur={onBlur}
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
            flexShrink: 0,
            touchAction: "none",
            ...dotStyle,
          }}
        />
      </Focusable>
    </div>
  );
}

export type DeckFocusSliderProps = {
  className?: string;
  header: React.ReactNode;
  thumbPct: number;
  fillPct?: number;
  tickPcts?: number[];
  trackRef?: React.MutableRefObject<HTMLDivElement | null>;
  thumbHostRef?: React.Ref<HTMLDivElement>;
  thumbHostProps?: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>;
  onSelectClientX: (clientX: number) => void;
  onStepLeft: () => void;
  onStepRight: () => void;
  onMoveUp?: () => boolean;
  onMoveDown?: () => boolean;
  editToggle?: boolean;
  /** When a parent focus bridge owns D-pad, keep thumb visuals in sync. */
  thumbFocusedExternal?: boolean;
  thumbEditingExternal?: boolean;
  getThumbDotStyle: (state: DeckSliderThumbVisualState) => React.CSSProperties;
  belowTrack?: React.ReactNode;
  description?: React.ReactNode;
};

const TRACK_SHELL_STYLE: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.04)",
  padding: "14px 10px 10px 10px",
  boxSizing: "border-box",
};

const TRACK_STYLE: React.CSSProperties = {
  position: "relative",
  width: "100%",
  height: 34,
  touchAction: "none",
  cursor: "pointer",
};

const RAIL_STYLE: React.CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  top: 14,
  height: 6,
  borderRadius: 999,
  background: "rgba(255,255,255,0.2)",
};

/** Single-thumb Deck focus slider with shared track, pointer, and D-pad behavior. */
export function DeckFocusSlider(props: DeckFocusSliderProps) {
  const {
    className,
    header,
    thumbPct,
    fillPct = thumbPct,
    tickPcts,
    trackRef: externalTrackRef,
    thumbHostRef,
    thumbHostProps,
    onSelectClientX,
    onStepLeft,
    onStepRight,
    onMoveUp,
    onMoveDown,
    editToggle = false,
    thumbFocusedExternal = false,
    thumbEditingExternal = false,
    getThumbDotStyle,
    belowTrack,
    description,
  } = props;

  const internalTrackRef = useRef<HTMLDivElement | null>(null);
  const thumbWrapRef = useRef<HTMLDivElement | null>(null);

  const setTrackEl = useCallback(
    (el: HTMLDivElement | null) => {
      internalTrackRef.current = el;
      if (externalTrackRef) externalTrackRef.current = el;
    },
    [externalTrackRef],
  );
  const [dragging, setDragging] = useState(false);
  const [focused, setFocused] = useState(false);
  const [editing, setEditing] = useState(false);
  const thumbFocused = focused || thumbFocusedExternal;
  const thumbEditing = editing || thumbEditingExternal;

  const onTrackPointerDown = useCallback(
    (ev: React.PointerEvent<HTMLDivElement>) => {
      setDragging(true);
      ev.currentTarget.setPointerCapture(ev.pointerId);
      onSelectClientX(ev.clientX);
    },
    [onSelectClientX],
  );

  const onTrackPointerMove = useCallback(
    (ev: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      onSelectClientX(ev.clientX);
    },
    [dragging, onSelectClientX],
  );

  const onTrackPointerUp = useCallback(
    (ev: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      if (ev.currentTarget.hasPointerCapture(ev.pointerId)) {
        ev.currentTarget.releasePointerCapture(ev.pointerId);
      }
      setDragging(false);
    },
    [dragging],
  );

  const onThumbBlur = useCallback((ev: React.FocusEvent) => {
    const rt = ev.relatedTarget as Node | null;
    if (rt && thumbWrapRef.current?.contains(rt)) return;
    if (!rt) return;
    setFocused(false);
    setEditing(false);
  }, []);

  const thumbNav = useMemo(
    (): DeckFocusSliderThumbNavProps => ({
      onMoveLeft: () => {
        onStepLeft();
        return true;
      },
      onMoveRight: () => {
        onStepRight();
        return true;
      },
      onMoveUp,
      onMoveDown,
    }),
    [onMoveDown, onMoveUp, onStepLeft, onStepRight],
  );

  return (
    <div
      className={className}
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
        {header}
      </div>
      <div style={TRACK_SHELL_STYLE}>
        <div
          ref={setTrackEl}
          onPointerDown={onTrackPointerDown}
          onPointerMove={onTrackPointerMove}
          onPointerUp={onTrackPointerUp}
          onPointerCancel={onTrackPointerUp}
          style={TRACK_STYLE}
        >
          <div style={RAIL_STYLE} />
          {tickPcts?.map((tickPct, i) => (
            <div
              key={i}
              aria-hidden
              style={{
                position: "absolute",
                left: `${tickPct}%`,
                top: 10,
                width: 2,
                height: 14,
                marginLeft: -1,
                background: "rgba(255,255,255,0.35)",
                pointerEvents: "none",
              }}
            />
          ))}
          <div
            style={{
              position: "absolute",
              left: 0,
              width: `${fillPct}%`,
              top: 14,
              height: 6,
              borderRadius: 999,
              background: "rgba(124, 214, 255, 0.45)",
              pointerEvents: "none",
            }}
          />
          <DeckFocusSliderThumb
            pct={thumbPct}
            focused={thumbFocused}
            editing={thumbEditing}
            onFocus={() => setFocused(true)}
            onBlur={onThumbBlur}
            onActivate={
              editToggle
                ? () => {
                    setEditing((prev) => !prev);
                  }
                : undefined
            }
            nav={thumbNav}
            onPointerSelect={onSelectClientX}
            getDotStyle={getThumbDotStyle}
            hostRef={thumbHostRef}
            hostProps={thumbHostProps}
            wrapRef={thumbWrapRef}
          />
        </div>
        {belowTrack}
      </div>
      {description ? (
        <div className="bonsai-prose" style={{ fontSize: 11, color: "#9fb7d5", lineHeight: 1.35 }}>
          {description}
        </div>
      ) : null}
    </div>
  );
}
