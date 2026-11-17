/**
 * Title: The connection line: one live status line that is also the Test connection button
 *
 * Purpose: With the AI on this Deck, "Test connection" and the result line under it become one line of one height in
 * every state (plan 105, lane D4; board 5 tab 2, round 1 C, kept by round 2): a coloured dot, then "Connected to this
 * Deck's AI" with the version, the model count and the address under it, or "Checking the connection", "Not tested
 * yet: A tests it", or "Not reachable: Test again". A on it tests again; the ring stays on it through the check.
 *
 * Used for: OllamaWhereAiRunsSection.tsx, while "Run AI on this Deck" is on. With the AI on a PC the row keeps its
 * address box, Test connection and Find LAN side by side.
 *
 * Solves: Test connection used to turn into a lone "…" while it checked, its button shrank so the words beside it
 * moved, and the answer showed on a line of its own below, which came and went (board 5's "today").
 *
 * Does not: run the check itself (the section's onTestConnection does), or move the ring: the line is one stop, a
 * Decky Button inside a Focusable that holds the moves the section hands in; Left and Right hold still. The full
 * sentence (a long error, say) rides on the row for the help strip, where the line itself has to cut it short.
 */
import React from "react";
import { Button, Focusable } from "@decky/ui";

import { RefreshArrowIcon } from "../../shared/icons/icons";
import { FOCUS_RING_BTN_CLASS } from "../../styles/settingsGlassButton";
import { textPx } from "../../styles/textPx";
import { helpAttributes } from "../folded-tabs/useHelpStrip";
import type { ConnectionStatus } from "./OllamaWhereAiRunsSection.types";

/** The line's one height, in px, in every state (the drawing's .b5t2-live). */
export const CONNECTION_LINE_HEIGHT_PX = 44;

type Look = { dot: string; glow: string; title: string; detail: string };

const DOT = { idle: "#6b7c90", busy: "#fbbf24", ok: "#4ade80", bad: "#f87171" };

/** What the line says for a check in a given state. */
function connectionLineLook(status: ConnectionStatus | null, checking: boolean, address: string): Look {
  if (checking) return { dot: DOT.busy, glow: "none", title: "Checking the connection", detail: address };
  if (!status) return { dot: DOT.idle, glow: "none", title: "Not tested yet: A tests it", detail: address };
  if (status.reachable) {
    const n = status.models?.length ?? 0;
    const parts = [status.recovery_attempted ? "Started for this check" : "", `Ollama v${status.version ?? "?"}`, `${n} model${n === 1 ? "" : "s"}`, address];
    return { dot: DOT.ok, glow: "0 0 6px rgba(74,222,128,.55)", title: "Connected to this Deck's AI", detail: parts.filter(Boolean).join(" · ") };
  }
  const why = (status.error ?? "").replace(/`+/g, "").trim();
  return { dot: DOT.bad, glow: "0 0 6px rgba(248,113,113,.5)", title: "Not reachable: Test again", detail: why || `Could not connect to ${address}` };
}

export type OllamaConnectionLineProps = {
  status: ConnectionStatus | null;
  /** A check is out (a press, or the quiet one when the tab opens). */
  checking: boolean;
  address: string;
  onTest: () => void;
  navRef: { current: unknown };
  onMoveUp: () => boolean;
  onMoveDown: () => boolean;
  buttonRef?: React.MutableRefObject<HTMLButtonElement | null> | null;
};

const ONE_LINE: React.CSSProperties = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

/** The line. See the header. */
export function OllamaConnectionLine({ status, checking, address, onTest, navRef, onMoveUp, onMoveDown, buttonRef }: OllamaConnectionLineProps): React.ReactElement {
  const look = connectionLineLook(status, checking, address);
  return (
    <Focusable
      style={{ display: "flex", width: "100%", minWidth: 0 }}
      {...helpAttributes(look.title, look.detail)}
      {...({ navRef, onMoveUp, onMoveDown, onMoveLeft: () => true, onMoveRight: () => true } as Record<string, unknown>)}
    >
      <Button
        className={FOCUS_RING_BTN_CLASS}
        ref={(el: HTMLDivElement | null) => {
          if (buttonRef) buttonRef.current = el as HTMLButtonElement | null;
        }}
        onClick={onTest}
        aria-label={checking ? "Testing Ollama connection" : "Test connection to Ollama"}
        data-bonsai-connection-line=""
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          minWidth: 0,
          height: CONNECTION_LINE_HEIGHT_PX,
          minHeight: CONNECTION_LINE_HEIGHT_PX,
          padding: "0 10px",
          boxSizing: "border-box",
          borderRadius: 4,
          border: "1px solid rgba(255,255,255,0.2)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))",
          color: "#e8eef5",
          textAlign: "left",
        }}
      >
        <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: "50%", flex: "none", background: look.dot, boxShadow: look.glow }} />
        <span style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column" }}>
          <span style={{ ...ONE_LINE, fontSize: textPx(12), fontWeight: 600, lineHeight: "15px", height: 15 }}>{look.title}</span>
          <span style={{ ...ONE_LINE, fontSize: textPx(10), color: "#9fb7d5", lineHeight: "13px", height: 13 }}>{look.detail}</span>
        </span>
        <span aria-hidden="true" style={{ flex: "none", display: "inline-flex", color: "#9ce7ff", opacity: checking ? 0.4 : 1 }}>
          <RefreshArrowIcon size={16} />
        </span>
      </Button>
    </Focusable>
  );
}
