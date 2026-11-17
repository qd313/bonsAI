/**
 * Title: The Ollama tab's "Local Ollama setup" block: Update (or Install) and Browse models, or the job card
 *
 * Purpose: The part of "Where AI runs" that installs and updates Ollama on the Deck (plan 105, lane D4, board 5
 * tab 2, round 2 B). With no run going: "Update AI & models" (or "Install Ollama"), "Browse models", and under them
 * the last result and the sites the downloads come from. A press on Update or Install swaps the two buttons for one
 * job card (JobCard.tsx: what is downloading, how far, how fast, the sites, Cancel at its top right), and the ring
 * goes to that Cancel on the same press. When the run ends the buttons come back, and a ring on Cancel goes to Update.
 *
 * Used for: OllamaWhereAiRunsSection.tsx, while "Run AI on this Deck" is on.
 *
 * Solves: The run used to darken Update ("Updating..."), grey Browse, add a red Cancel on a row of its own and a box
 * of raw installer lines: three stops and about 400 px of tab for one job (board 5's reading). Now it is one card of
 * 110 px with one stop.
 *
 * Does not: Start, poll or cancel a run itself: the section's hook starts it, ollamaSetupJob.ts turns its status into
 * the card, runningJobs.ts cancels it. Does not draw the connection line below it.
 *
 * Focus (docs/focus-graph.md, "The Ollama tab's setup buttons"): every stop here is a Decky Button inside a Focusable
 * that holds its moves and a Steam node. With no run: Update (Up: the switch above; Down: Browse) and Browse (Up:
 * Update; Down: on below). With a run: Cancel alone (Up: the switch above; Down: on below; Left and Right hold). Every
 * move onto a stop here is Steam's transfer onto its node first, then the button's own focus if that did not land it.
 * The section enters the block through `entryRef` (from the switch above, and Up from the connection line below).
 */
import React, { useImperativeHandle } from "react";
import { Button, Focusable } from "@decky/ui";

import { registerModalReturnFocusOwner, rememberModalReturnFocus } from "../../shared/dpad/modalReturnFocusRegistry";
import { elementHasGamepadFocus } from "../../shared/dpad/uiDocument";
import { useHandRingOnGone } from "../../shared/dpad/useHandRingOnGone";
import { focusInTabBody } from "../../shared/dpad/useTabBodyFocusScroll";
import { FOCUS_RING_BTN_CLASS } from "../../styles/settingsGlassButton";
import { textPx } from "../../styles/textPx";
import { JobCard } from "../downloads/JobCard";
import { useRunningJob } from "../downloads/runningJobs";
import { helpAttributes } from "../folded-tabs/useHelpStrip";
import { OLLAMA_SETUP_JOB } from "./ollamaSetupJob";
import { OllamaSetupStatusLine } from "./OllamaSetupStatusLine";
import { OLLAMA_ROW_HELP } from "./ollamaTabFolds";
import type { ConnectionStatus, LocalOllamaSetupStatus } from "./OllamaWhereAiRunsSection.types";

/** The object Steam puts in a Focusable's `navRef` once its node is mounted. */
type SteamNode = { TakeFocus?: (gamepad?: boolean) => unknown } | null;

/** How the section above hands the ring into the block: its first stop from above, its last from below. */
export type LocalSetupEntry = { enterFromTop: () => boolean; enterFromBottom: () => boolean };

export type OllamaLocalSetupBlockProps = {
  connectionStatus: ConnectionStatus | null;
  localSetupStatus: LocalOllamaSetupStatus | null;
  localSetupBusy: boolean;
  /** True while an Install / Update press waits for the connection check: the button reads "Checking…". */
  checkingBeforeStart: boolean;
  onPressInstallOrUpdate: () => void;
  /** Opens the AI models box on its Browse page. */
  onBrowse: () => void;
  /** Up out of the block: the "Start the AI with the Deck" switch. */
  onMoveUpOut: () => boolean;
  /** Down out of the block: the connection line, or the next section. */
  onMoveDownOut: () => boolean;
  entryRef: React.Ref<LocalSetupEntry>;
};

/** Steam's transfer onto a stop's node, then the stop's own focus (a sibling in this block's column) if it did not land. */
function take(node: { current: SteamNode }, el: HTMLElement | null): boolean {
  if (!el) return false;
  try {
    node.current?.TakeFocus?.(true);
  } catch {
    /* the check below decides */
  }
  if (!elementHasGamepadFocus(el)) focusInTabBody(el);
  return true;
}

const ROW_STYLE: React.CSSProperties = { display: "flex", flexDirection: "row", gap: 8, width: "100%" };
const UPDATE_STYLE: React.CSSProperties = {
  flex: "1 1 100%",
  minHeight: 36,
  minWidth: 0,
  padding: "6px 8px",
  fontSize: textPx(11),
  fontWeight: 600,
  borderRadius: 4,
  border: "1px solid rgba(56,189,248,0.55)",
  background: "linear-gradient(180deg, rgba(56,189,248,0.22) 0%, rgba(14,116,144,0.35) 100%)",
  color: "#e0f2fe",
};
/* Browse is the drawing's plain glass button: its name on the left, an arrow on the right, no dots (small question 3). */
const BROWSE_STYLE: React.CSSProperties = {
  ...UPDATE_STYLE,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  border: "1px solid rgba(255,255,255,0.22)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.06) 100%)",
  color: "#e8eef5",
};

/** The block. See the header for what it shows and where the ring goes. */
export function OllamaLocalSetupBlock({
  connectionStatus,
  localSetupStatus,
  localSetupBusy,
  checkingBeforeStart,
  onPressInstallOrUpdate,
  onBrowse,
  onMoveUpOut,
  onMoveDownOut,
  entryRef,
}: OllamaLocalSetupBlockProps): React.ReactElement {
  const engineReady = Boolean(connectionStatus?.reachable);
  const job = useRunningJob(OLLAMA_SETUP_JOB);
  const card = localSetupBusy && job !== null;

  const updateNavRef = React.useRef<SteamNode>(null);
  const browseNavRef = React.useRef<SteamNode>(null);
  const cancelNavRef = React.useRef<SteamNode>(null);
  const updateBtnRef = React.useRef<HTMLButtonElement | null>(null);
  const browseBtnRef = React.useRef<HTMLButtonElement | null>(null);
  const cancelBtnRef = React.useRef<HTMLButtonElement | null>(null);

  const takeUpdate = (): boolean => take(updateNavRef, updateBtnRef.current);
  const takeBrowse = (): boolean => take(browseNavRef, browseBtnRef.current);
  const takeCancel = (): boolean => take(cancelNavRef, cancelBtnRef.current);
  useImperativeHandle(entryRef, () => ({
    enterFromTop: () => (card ? takeCancel() : takeUpdate()),
    enterFromBottom: () => (card ? takeCancel() : takeBrowse()),
  }));

  /* The press swaps Update for the card: a ring on Update goes to the card's Cancel (the drawing: on the same press). */
  const updateRowRef = useHandRingOnGone(() => void takeCancel());
  /* The run ends and the card goes: a ring on Cancel goes to Update (Deck 2026-10-14, plan93-P93-B10-CANCEL.json). */
  const cancelRowRef = useHandRingOnGone(() => void takeUpdate());

  return (
    <Focusable
      className="bonsai-settings-bleed"
      flow-children="vertical"
      style={{ width: "100%", maxWidth: "100%", minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}
    >
      <div
        className="bonsai-prose"
        style={{ fontSize: textPx(11), color: "#b8c6d6", fontWeight: 600, letterSpacing: "0.03em", userSelect: "none" }}
      >
        Local Ollama setup
        {connectionStatus?.reachable && Array.isArray(connectionStatus.models) ? (
          <span style={{ fontWeight: 400, color: "#9fb7d5", marginLeft: 8 }}>Installed: {connectionStatus.models.length}</span>
        ) : null}
      </div>
      {card ? (
        <JobCard
          job={job}
          cancelLabel="Cancel local Ollama setup"
          cancelNavRef={cancelNavRef}
          onMoveUp={onMoveUpOut}
          onMoveDown={onMoveDownOut}
          cancelRowRef={cancelRowRef}
          cancelButtonRef={(el) => {
            cancelBtnRef.current = el;
            // A box opened by the press (the starter models question) rebuilds the tab on close: the ring comes back here.
            registerModalReturnFocusOwner("ollama-local-setup", el);
          }}
          help={helpAttributes(job.face.title, OLLAMA_ROW_HELP.setupBusy)}
        />
      ) : (
        <>
          <Focusable
            ref={updateRowRef}
            flow-children="horizontal"
            style={ROW_STYLE}
            {...helpAttributes(engineReady ? "Update AI & models" : "Install Ollama", engineReady ? undefined : OLLAMA_ROW_HELP.setupFirstTime)}
            {...({ navRef: updateNavRef, onMoveUp: onMoveUpOut, onMoveDown: takeBrowse } as Record<string, unknown>)}
          >
            <Button
              ref={(el: HTMLDivElement | null) => {
                updateBtnRef.current = el as HTMLButtonElement | null;
                // Its box (the starter models question) rebuilds this tab on close; the ring comes back here (plan72-F3-DL.json).
                registerModalReturnFocusOwner("ollama-local-setup", el);
              }}
              className={FOCUS_RING_BTN_CLASS}
              onClick={onPressInstallOrUpdate}
              style={UPDATE_STYLE}
              aria-label={engineReady ? "Update AI engine and installed models" : "Install Ollama on this Deck"}
            >
              {checkingBeforeStart ? "Checking…" : engineReady ? "Update AI & models" : "Install Ollama"}
            </Button>
          </Focusable>
          <Focusable
            flow-children="horizontal"
            style={ROW_STYLE}
            {...({ navRef: browseNavRef, onMoveUp: takeUpdate, onMoveDown: onMoveDownOut } as Record<string, unknown>)}
          >
            <Button
              className={FOCUS_RING_BTN_CLASS}
              ref={(el: HTMLDivElement | null) => {
                browseBtnRef.current = el as HTMLButtonElement | null;
                // The button people press to reach the models box: the ring comes back here when it closes.
                registerModalReturnFocusOwner("ollama-models-hub", el);
              }}
              onClick={() => {
                rememberModalReturnFocus("ollama-models-hub");
                onBrowse();
              }}
              style={BROWSE_STYLE}
              aria-label="Browse and pull Ollama models"
            >
              <span>Browse models</span>
              <span aria-hidden="true" style={{ color: "#9ce7ff" }}>
                ›
              </span>
            </Button>
          </Focusable>
        </>
      )}
      <OllamaSetupStatusLine status={localSetupStatus} busy={localSetupBusy} />
    </Focusable>
  );
}
