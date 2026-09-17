/**
 * Title: Thinking effort row
 *
 * Purpose: The row on the Ollama tab labeled "Thinking," where you choose how
 * hard the AI reasons before it answers: Off, Brief, Balanced, or Deep. More
 * thinking can mean a better answer, but it also takes longer, so this lets a
 * person pick that trade-off for themselves instead of always getting the
 * slowest, deepest setting.
 *
 * Used for: OllamaTab, directly below the Reply style row.
 *
 * Solves: Lets a person change how much the AI thinks without editing
 * settings.json by hand.
 *
 * Does not: Decide what each of the four settings actually asks the model to
 * do, or what happens when the chosen model cannot think at all — both live
 * in the backend's `ollama_ask_budgets`, which falls back silently in that
 * case (decision D21).
 */
import { Focusable, Button } from "@decky/ui";

import {
  ASK_THINK_EFFORT_DESCRIPTIONS,
  ASK_THINK_EFFORT_IDS,
  ASK_THINK_EFFORT_LABELS,
  type AskThinkEffortId,
} from "../data/askThinkEffort";

export type OllamaThinkingEffortRowProps = {
  value: AskThinkEffortId;
  /**
   * `sourceEl` is the actual button DOM node the person just pressed -- handed along so a caller
   * that needs to put the D-pad ring back on it later (the one-time Thinking notice) has a real
   * element in hand rather than needing to search the page for it afterward.
   */
  onChange: (v: AskThinkEffortId, sourceEl: HTMLButtonElement) => void;
  /** Host for the focus entry point, so neighbours can hand focus to the first button. */
  hostRef?: React.Ref<HTMLDivElement>;
  onMoveUp: () => boolean;
  onMoveDown: () => boolean;
};

/**
 * The four buttons, plus the description line above them that explains what
 * the currently selected one does.
 *
 * In: the effort level currently selected, a callback to run when a
 * different button is pressed, an optional host ref so a neighbouring row
 * can hand focus straight to the first button, and the Up/Down handlers that
 * let the D-pad leave this row for whatever sits above or below it.
 * Out: the "Thinking" label, its description text, and a horizontal row of
 * four buttons — one per effort level.
 *
 * What can go wrong: Up and Down only work when wired on the Focusable that
 * wraps the buttons, never on the buttons themselves — a Decky Button does
 * not fire onMoveUp/onMoveDown, so those handlers have to live one level up
 * (see the comment on the Focusable below).
 */
export function OllamaThinkingEffortRow({
  value,
  onChange,
  hostRef,
  onMoveUp,
  onMoveDown,
}: OllamaThinkingEffortRowProps) {
  return (
    <div ref={hostRef} style={{ width: "100%", minWidth: 0, maxWidth: "100%" }}>
      <div style={{ color: "#d9d9d9", fontWeight: 600, fontSize: 13 }}>Thinking</div>
      <div
        className="bonsai-prose"
        style={{ fontSize: 11, color: "#9fb7d5", marginBottom: 8, lineHeight: 1.35 }}
      >
        {ASK_THINK_EFFORT_DESCRIPTIONS[value]}
      </div>
      {/* onMove* live on the Focusable, never on the Buttons — they do not fire on a
          Decky Button. The parent owns the graph; the buttons are leaves. */}
      <Focusable
        flow-children="horizontal"
        style={{
          display: "flex",
          gap: 6,
          width: "100%",
          minWidth: 0,
          maxWidth: "100%",
          alignItems: "stretch",
        }}
        {...({
          onMoveUp: () => onMoveUp(),
          onMoveDown: () => onMoveDown(),
        } as unknown as Record<string, unknown>)}
      >
        {ASK_THINK_EFFORT_IDS.map((option) => {
          const active = option === value;
          return (
            <Button
              key={`think-effort-${option}`}
              onClick={(e: MouseEvent) => onChange(option, e.currentTarget as HTMLButtonElement)}
              style={{
                flex: 1,
                minHeight: 36,
                fontSize: 12,
                fontWeight: 600,
                padding: "4px 4px",
                borderRadius: 4,
                border: active
                  ? "1px solid rgba(255,255,255,0.45)"
                  : "1px solid rgba(255,255,255,0.12)",
                background: active
                  ? "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.1) 100%)"
                  : "rgba(255,255,255,0.04)",
                color: active ? "#f0f4f8" : "#9fb0c0",
                boxShadow: active ? "inset 0 1px 0 rgba(255,255,255,0.15)" : "none",
              }}
              aria-label={`Set thinking to ${ASK_THINK_EFFORT_LABELS[option]}`}
            >
              {ASK_THINK_EFFORT_LABELS[option]}
            </Button>
          );
        })}
      </Focusable>
    </div>
  );
}
