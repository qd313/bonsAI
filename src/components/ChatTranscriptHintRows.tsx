/**
 * Title: The chat's situational hint rows
 *
 * Purpose: The three rows that can sit under the chat's turns: "No game detected", the
 * troubleshooting hint that points at the game-reading permission (with Open Permissions and
 * Dismiss), and the ban-lookup permission row. Moved out of MainTabChatTranscript.tsx unchanged,
 * so that file has room under its size limit for the answer's sections (plan 93, lane O3).
 *
 * Used for: MainTabChatTranscript.tsx, in the same place the three rows always sat.
 *
 * Solves: Nothing new. The two permission rows keep their own Steam nav nodes and move handlers
 * exactly as before; the nodes themselves are still made by usePermHintNavTargets in the
 * transcript, whose hook order is recorded (tests/test_ask_hook_order.py).
 *
 * Does not: Decide what a troubleshooting question looks like (troubleshootingAskHeuristic) or
 * whether a reply was a ban-lookup refusal (permissionDeepLink); it only asks them.
 */
import type React from "react";
import { PanelSectionRow, Button, Focusable } from "@decky/ui";
import { PermissionDenyAction } from "./PermissionDenyAction";
import { isVacCheckCapabilityDenyResponse, type BonsaiCapabilityKey } from "../utils/permissionDeepLink";
import { questionLooksLikeTroubleshootingAsk } from "../utils/troubleshootingAskHeuristic";
import {
  dismissHintKeepingRing,
  troubleshootHintRowNavHandlers,
  vacDenyRowMoveDown,
  vacDenyRowMoveUp,
} from "../utils/chatTranscriptNavHelpers";
import type { PermHintNavTargets } from "../hooks/usePermHintNavTargets";
import { textPx } from "../styles/sections/textPx";

export type ChatTranscriptHintRowsProps = {
  fullBleedRowStyle: React.CSSProperties;
  isAsking: boolean;
  /** No attachment, no running game, and something typed: the "No game detected" row shows. */
  showNoGameRow: boolean;
  gameContextReadEnabled: boolean;
  troubleshootingPermHintDismissed: boolean;
  unifiedInput: string;
  showEmptySlotPreview: boolean;
  onNavigateToPermissions?: (capability: BonsaiCapabilityKey) => void;
  dismissTroubleshootingPermHint: () => void;
  /** The text the ban-lookup row is judged on (the transcript works out which reply that is). */
  vacDenyReplyText: string;
  navTargets: PermHintNavTargets;
};

/*
 * In: the transcript's flags for each row, the reply text the ban-lookup row is judged on, and the
 * nav nodes the transcript made for the two permission rows.
 * Out: zero to three rows, in the order they always sat.
 * What can go wrong: nothing new; the rows and their D-pad wiring are unchanged from the transcript.
 */
export function ChatTranscriptHintRows(props: ChatTranscriptHintRowsProps) {
  const { fullBleedRowStyle, isAsking, unifiedInput, onNavigateToPermissions, navTargets } = props;
  const { troubleshootHintNavRef, vacDenyRowNavRef, troubleshootHintButtonEls, troubleshootHintButtonRefs } = navTargets;
  return (
    <>
{!isAsking && props.showNoGameRow ? (
  <PanelSectionRow>
    <div
      className="bonsai-full-bleed-row"
      style={{
        ...fullBleedRowStyle,
        fontSize: textPx(10),
        color: "#8fa8c4",
        lineHeight: 1.35,
        fontStyle: "italic",
      }}
    >
      No game detected — capture & attach a screenshot or name the game for sharper answers.
    </div>
  </PanelSectionRow>
) : null}
{!isAsking &&
!props.gameContextReadEnabled &&
!props.troubleshootingPermHintDismissed &&
questionLooksLikeTroubleshootingAsk(unifiedInput) ? (
  <PanelSectionRow>
    {/*
     * Wrapped in its own Focusable so Down/Up can be caught here: a Decky `Button` does not
     * forward `onMoveUp`/`onMoveDown`, and this row sits outside the live turn's own Focusable, so
     * Steam's default fallback (proven in the transcript to skip nearby rows and jump straight
     * to the session strip) cannot be trusted to land here. `flow-children="horizontal"` keeps
     * Left/Right between Open Permissions and Dismiss. `navRef` registers this row as a Steam nav
     * node (`focusChatPermissionHintRow` in chatTranscriptNavHelpers, `takeNavFocus` only) — the button-ref + plain-focus
     * approach this replaced moved `activeElement` but not the gamepad ring, measured on device
     * 2026-09-04 (build 49241e7).
     */}
    <Focusable
      className="bonsai-chat-troubleshoot-perm-hint-row"
      flow-children="horizontal"
      {...({
        navRef: troubleshootHintNavRef,
        ...troubleshootHintRowNavHandlers(troubleshootHintButtonEls),
      } as Record<string, unknown>)}
    >
      <div
        className="bonsai-full-bleed-row"
        style={{
          ...fullBleedRowStyle,
          fontSize: textPx(11),
          color: "#c8d8ea",
          lineHeight: 1.4,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div>
          Troubleshooting Ask detected. Enable <strong>Read game & screenshot context</strong> in Permissions
          to auto-attach Proton logs and screenshots (never turned on automatically).
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {onNavigateToPermissions ? (
            <Button
              focusable
              ref={troubleshootHintButtonRefs[0]}
              onClick={() => onNavigateToPermissions("steam_logs_read")}
              style={{ fontSize: textPx(11), padding: "4px 10px", minHeight: 34 }}
            >
              Open Permissions
            </Button>
          ) : null}
          <Button
            focusable
            ref={troubleshootHintButtonRefs[1]}
            onClick={() => dismissHintKeepingRing(troubleshootHintButtonEls, props.dismissTroubleshootingPermHint)}
            style={{ fontSize: textPx(11), padding: "4px 10px", minHeight: 34 }}
          >
            Dismiss
          </Button>
        </div>
      </div>
    </Focusable>
  </PanelSectionRow>
) : null}
{/* Not on the [+] create-position screen: these lines describe the reply of the chat that is
    still active behind it (plan 74 P74-LOCAL-CMD-CHAT), and that screen claims to be a new chat. */}
{!props.showEmptySlotPreview && !isAsking && onNavigateToPermissions && isVacCheckCapabilityDenyResponse(props.vacDenyReplyText) ? (
  <PanelSectionRow>
    {/*
     * Same reasoning as the troubleshooting hint's wrapper just above: this row sits outside the
     * live turn's own Focusable, between the reply actions row and the session context strip,
     * PermissionDenyAction's own Button cannot forward onMoveUp/onMoveDown itself, and `navRef`
     * (not a button ref plus plain focus) is the only transfer Steam's ring actually follows here —
     * see `focusChatPermissionHintRow` in chatTranscriptNavHelpers.
     */}
    <Focusable
      className="bonsai-chat-vac-deny-row"
      flow-children="horizontal"
      {...({
        navRef: vacDenyRowNavRef,
        onMoveUp: vacDenyRowMoveUp,
        onMoveDown: vacDenyRowMoveDown,
      } as Record<string, unknown>)}
    >
      <div className="bonsai-full-bleed-row" style={fullBleedRowStyle}>
        <PermissionDenyAction
          capability="steam_web_api"
          onJump={onNavigateToPermissions}
          compact
        />
      </div>
    </Focusable>
  </PanelSectionRow>
) : null}
    </>
  );
}
