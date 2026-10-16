/**
 * Title: The chat's situational hint rows
 *
 * Purpose: The two rows that can sit under the chat's turns: "No game detected" and the
 * troubleshooting hint that points at the game-reading permission (with Open Permissions and
 * Dismiss). Moved out of MainTabChatTranscript.tsx unchanged, so that file has room under its
 * size limit for the answer's sections (plan 93, lane O3).
 *
 * Used for: MainTabChatTranscript.tsx, in the same place the rows always sat.
 *
 * Solves: Nothing new. The troubleshooting row keeps its own Steam nav node and move handlers
 * exactly as before; the node itself is still made by usePermHintNavTargets in the
 * transcript, whose hook order is recorded (tests/test_ask_hook_order.py).
 *
 * Does not: Decide what a troubleshooting question looks like (troubleshootingAskHeuristic); it
 * only asks it.
 */
import type React from "react";
import { PanelSectionRow, Button, Focusable } from "@decky/ui";
import type { BonsaiCapabilityKey } from "../utils/permissionDeepLink";
import { questionLooksLikeTroubleshootingAsk } from "../utils/troubleshootingAskHeuristic";
import {
  dismissHintKeepingRing,
  troubleshootHintRowNavHandlers,
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
  onNavigateToPermissions?: (capability: BonsaiCapabilityKey) => void;
  dismissTroubleshootingPermHint: () => void;
  navTargets: PermHintNavTargets;
};

/*
 * In: the transcript's flags for each row and the nav node the transcript made for the
 * troubleshooting row.
 * Out: zero to two rows, in the order they always sat.
 * What can go wrong: nothing new; the rows and their D-pad wiring are unchanged from the transcript.
 */
export function ChatTranscriptHintRows(props: ChatTranscriptHintRowsProps) {
  const { fullBleedRowStyle, isAsking, unifiedInput, onNavigateToPermissions, navTargets } = props;
  const { troubleshootHintNavRef, troubleshootHintButtonEls, troubleshootHintButtonRefs } = navTargets;
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
    </>
  );
}
