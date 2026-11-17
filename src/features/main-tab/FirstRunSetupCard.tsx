/**
 * Title: The first-time setup's card on the empty chat: one changing line, a bar, and Stop
 *
 * Purpose: After "OK, install on this Deck" on the first-time setup popup, the box closes and the Main tab's empty
 * chat shows this card in place of the empty-chat picture (board 5, tab 4: round 1 A, kept by round 4 B). While the
 * run goes: "Setting up the AI on this Deck", the same changing line the Ollama tab shows, a bar for the whole
 * download, the sites it reaches, and Stop. After a Stop: "Stopped", what was kept and what was not installed, and
 * Start again (the same run; what finished is not downloaded twice). At the end: "The AI is ready on this Deck" and
 * the run's own closing line (which says what was left out, as chosen), with no button. A start the back end refused
 * says why, with Start again. The card goes once the chat has its first question.
 *
 * Used for: answer/transcript/MainTabChatTranscript.tsx, in the empty chat's place while a first-time setup started
 * on this load (firstRunSetupStore.ts).
 *
 * Solves: The first-time setup used to keep its progress inside a box the person had to close, with no Stop in it;
 * Stop was a red Cancel on the Ollama tab.
 *
 * Does not: Start anything by itself (Start again is a press), or show after a plugin reload (the Ollama tab does).
 *
 * Focus: the card has one stop, its button (Stop or Start again), a Decky Button inside a Focusable registered as the
 * nav node "first-run-setup-card". Up from the suggestion chips lands on it (presetRowFocusNav.ts, chipRowExitUp);
 * Up from it goes where the chat's top goes (the chat's name or the tab bar); Down goes back to the chips; Left and
 * Right hold. When the button goes away under the ring (the run ended), the ring goes to the question box. Every hop
 * is Steam's own transfer (docs/focus-graph.md, "The first-time setup's card on the Main tab").
 */
import React, { useEffect, useRef, useState, type CSSProperties } from "react";
import { Button, Focusable } from "@decky/ui";

import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS } from "../../shared/deckyCall";
import { takeAboveTheChat } from "../../shared/dpad/chatTranscriptNavHelpers";
import { registerNavFocus, takeNavFocus, unregisterNavFocus, type NavRefHolder } from "../../shared/dpad/navFocusRegistry";
import { useHandRingOnGone } from "../../shared/dpad/useHandRingOnGone";
import { FOCUS_RING_BTN_CLASS } from "../../styles/settingsGlassButton";
import { textPx } from "../../styles/textPx";
import { localSetupStageLine } from "../ai-connection/localSetupStageLine";
import type { LocalOllamaSetupStatus } from "../ai-connection/OllamaWhereAiRunsSection.types";
import { setupProgressPercent, setupSitesLine, stoppedLine } from "./firstRunSetupProgress";
import { startFirstRunSetupAgain, stopFirstRunSetup, useFirstRunSetup } from "./firstRunSetupStore";

/** How often the card reads the run's status while it shows (the Ollama tab reads at the same pace). */
const POLL_MS = 1500;

type View = { title: string; line: string; tone: "run" | "ok" | "warn"; bar: number | null; note: string; button: "stop" | "again" | null };

/** What the card shows for a run in a given state. */
function viewOf(status: LocalOllamaSetupStatus | null, refused: string, leaveOut: Parameters<typeof setupSitesLine>[0]): View {
  if (refused) return { title: "Setup did not start", line: refused, tone: "warn", bar: null, note: "", button: "again" };
  const phase = status?.phase ?? "running";
  if (phase === "done") return { title: "The AI is ready on this Deck", line: status?.result_line ?? "", tone: "ok", bar: 100, note: "", button: null };
  if (phase === "cancelled") {
    return {
      title: "Stopped",
      line: stoppedLine(status),
      tone: "warn",
      bar: null,
      note: "Nothing half-installed is used. Start again carries on: what finished is not downloaded twice.",
      button: "again",
    };
  }
  if (phase === "failed") {
    return { title: "Setup finished with a problem", line: status?.error ?? "", tone: "warn", bar: null, note: "Start again retries what did not finish.", button: "again" };
  }
  return {
    title: "Setting up the AI on this Deck",
    line: localSetupStageLine(status) || "Checking…",
    tone: "run",
    bar: setupProgressPercent(status, leaveOut),
    note: setupSitesLine(leaveOut),
    button: "stop",
  };
}

const CARD_STYLE: CSSProperties = {
  margin: "4px 0 0",
  padding: "8px 10px 9px",
  borderRadius: 6,
  border: "1px solid rgba(156,231,255,.3)",
  background: "rgba(10,15,21,.55)",
  fontSize: textPx(11),
  lineHeight: 1.35,
  color: "#cdd9e6",
  boxSizing: "border-box",
  width: "100%",
};
const TONE_COLOR: Record<View["tone"], string> = { run: "#9ce7ff", ok: "#86efac", warn: "#fbbf24" };
const BUTTON_STYLE: Record<"stop" | "again", CSSProperties> = {
  stop: { border: "1px solid rgba(248,113,113,.45)", background: "rgba(48,24,26,.65)", color: "#fecaca" },
  again: { border: "1px solid rgba(26,159,255,.7)", background: "#1a6fb5", color: "#ffffff" },
};

/** The card. In: nothing (it reads the first-time setup's store and the run's status). Out: the card, or nothing. */
export function FirstRunSetupCard(): React.ReactElement | null {
  const setup = useFirstRunSetup();
  const [polled, setPolled] = useState<LocalOllamaSetupStatus | null>(null);
  const navRef = useRef<NavRefHolder["current"]>(null);
  const ringRef = useHandRingOnGone(() => {
    takeNavFocus("unified-input");
  });

  // A new start reads afresh: nothing from the run before it is shown as this one's.
  useEffect(() => setPolled(null), [setup.runId]);
  useEffect(() => {
    if (!setup.active || !setup.accepted || setup.refused) return;
    let alive = true;
    const read = () =>
      void callDeckyWithTimeout<[], LocalOllamaSetupStatus>("get_local_ollama_setup_status", [], DECKY_RPC_TIMEOUT_MS)
        .then((st) => alive && st && setPolled(st))
        .catch(() => {});
    read();
    const id = window.setInterval(read, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [setup.active, setup.accepted, setup.refused, setup.runId]);

  useEffect(() => {
    registerNavFocus("first-run-setup-card", navRef);
    return () => unregisterNavFocus("first-run-setup-card", navRef);
  }, []);

  if (!setup.active) return null;
  const status = setup.accepted ? (polled ?? setup.status) : setup.status;
  const view = viewOf(status, setup.refused, setup.leaveOut);
  const press = () => (view.button === "stop" ? stopFirstRunSetup() : view.button === "again" ? startFirstRunSetupAgain() : undefined);

  return (
    <div style={CARD_STYLE} data-bonsai-first-run-card="" aria-live="polite">
      <div style={{ fontSize: textPx(12.5), fontWeight: 700, color: "#ffffff", marginBottom: 3 }}>{view.title}</div>
      <div style={{ color: TONE_COLOR[view.tone], minHeight: 30, overflowWrap: "anywhere" }}>{view.line}</div>
      {view.bar !== null ? (
        <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,.12)", margin: "6px 0", overflow: "hidden" }} aria-hidden>
          <i style={{ display: "block", height: "100%", width: `${view.bar}%`, background: "rgba(156,231,255,.7)" }} />
        </div>
      ) : null}
      {view.note ? <div style={{ fontSize: textPx(10), color: "#8fa0b4", marginBottom: 6 }}>{view.note}</div> : null}
      {view.button ? (
        <Focusable
          ref={ringRef}
          style={{ display: "flex" }}
          {...({
            navRef,
            onOKButton: press,
            onMoveUp: () => takeAboveTheChat() || true,
            onMoveDown: () => takeNavFocus("preset-carousel") || takeNavFocus("unified-input") || true,
            onMoveLeft: () => true,
            onMoveRight: () => true,
          } as Record<string, unknown>)}
        >
          <Button
            className={FOCUS_RING_BTN_CLASS}
            onClick={press}
            aria-label={view.button === "stop" ? "Stop the setup" : "Start the setup again"}
            style={{ flex: "1 1 0", minWidth: 0, height: 30, minHeight: 30, padding: 0, borderRadius: 3, fontSize: textPx(12), fontWeight: 600, ...BUTTON_STYLE[view.button] }}
          >
            {view.button === "stop" ? "Stop" : "Start again"}
          </Button>
        </Focusable>
      ) : null}
    </div>
  );
}

/** The empty chat's place: the card while a first-time setup started on this load, else what the chat shows empty. */
export function FirstRunSetupCardOrEmpty({ children }: { children: React.ReactNode }): React.ReactElement {
  const setup = useFirstRunSetup();
  return setup.active ? <FirstRunSetupCard /> : <>{children}</>;
}
