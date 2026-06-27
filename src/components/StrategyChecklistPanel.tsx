import { ToggleField } from "@decky/ui";

import type { StrategyChecklistState } from "../types/bonsaiUi";

type Props = {
  checklist: StrategyChecklistState;
  onToggle: (itemId: string, checked: boolean) => void;
};

function readToggleOn(raw: unknown): boolean {
  if (raw === true || raw === 1) return true;
  return false;
}

export function StrategyChecklistPanel({ checklist, onToggle }: Props) {
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
      <div style={{ fontSize: 12, color: "#dce8f4", fontWeight: 600, marginBottom: 4 }}>{checklist.title}</div>
      <div style={{ fontSize: 11, color: "#a8b8c8", lineHeight: 1.35, marginBottom: 6 }}>
        Progress is saved for this game until you reset session cache or start a new Strategy thread.
      </div>
      {checklist.items.map((item) => {
        const checked = checklist.checkedIds.includes(item.id);
        return (
          <ToggleField
            key={`sg-check-${item.id}`}
            label={item.label}
            description=""
            checked={checked}
            onChange={(v) => onToggle(item.id, readToggleOn(v))}
          />
        );
      })}
    </div>
  );
}
