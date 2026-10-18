/**
 * Title: Strategy checklist panel
 * Purpose: Toggle list for per-game strategy guide checklist items during a live turn.
 * Used for: MainTabChatTranscript strategy mode replies with collapsible checklist state.
 * Solves: Deck-navigable ToggleField rows wired into the live-turn focus graph.
 * Does not: Parse strategy branches from model output — see strategyChecklist utils and backend parser.
 */
import { ToggleField } from "@decky/ui";

import type { StrategyChecklistState } from "../types/bonsaiUi";
import { deckNavHandlers } from "../utils/liveTurnFocusGraph";
import { textPx } from "../styles/textPx";

type Props = {
  checklist: StrategyChecklistState;
  onToggle: (itemId: string, checked: boolean) => void;
  onMoveUpFromFirst?: () => boolean;
  onMoveDownFromLast?: () => boolean;
};

function readToggleOn(raw: unknown): boolean {
  if (raw === true || raw === 1) return true;
  return false;
}

export function StrategyChecklistPanel({
  checklist,
  onToggle,
  onMoveUpFromFirst,
  onMoveDownFromLast,
}: Props) {
  return (
    <div
      className="bonsai-glass-panel bonsai-strategy-checklist-panel"
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        marginBottom: 12,
        padding: "10px 12px",
        borderRadius: 8,
        border: "1px solid rgba(150, 187, 223, 0.45)",
        background: "linear-gradient(180deg, rgba(64, 93, 124, 0.42) 0%, rgba(48, 71, 95, 0.42) 100%)",
        boxSizing: "border-box",
      }}
    >
      <div style={{ fontSize: textPx(12), color: "#dce8f4", fontWeight: 600, marginBottom: 4 }}>{checklist.title}</div>
      <div style={{ fontSize: textPx(11), color: "#a8b8c8", lineHeight: 1.35, marginBottom: 6 }}>
        Progress is saved for this game until you reset session cache or start a new Strategy thread.
      </div>
      {checklist.items.map((item, idx) => {
        const checked = checklist.checkedIds.includes(item.id);
        const isFirst = idx === 0;
        const isLast = idx === checklist.items.length - 1;
        const nav =
          (isFirst && onMoveUpFromFirst) || (isLast && onMoveDownFromLast)
            ? deckNavHandlers({
                ...(isFirst && onMoveUpFromFirst ? { onMoveUp: () => onMoveUpFromFirst() } : {}),
                ...(isLast && onMoveDownFromLast ? { onMoveDown: () => onMoveDownFromLast() } : {}),
              })
            : undefined;
        return (
          <ToggleField
            key={`sg-check-${item.id}`}
            label={item.label}
            description=""
            checked={checked}
            onChange={(v) => onToggle(item.id, readToggleOn(v))}
            {...nav}
          />
        );
      })}
    </div>
  );
}
