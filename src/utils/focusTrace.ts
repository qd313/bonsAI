/** Compact focus target description for debug HUD + dbg_fe_log (no PII). */
export function describeFocusTarget(el: HTMLElement | null): Record<string, unknown> {
  if (!el) return { zone: "none", tag: "null" };

  const answer = el.closest(".bonsai-chat-ai-bubble") as HTMLElement | null;
  const header = el.closest(".bonsai-chat-turn-row-header") as HTMLElement | null;
  const reply = el.closest(".bonsai-chat-reply-actions") as HTMLElement | null;
  const turnSlot = el.closest(".bonsai-chat-turn-slot") as HTMLElement | null;

  let zone = "other";
  if (answer) zone = "answer";
  else if (header) zone = "header";
  else if (reply) zone = "reply";
  else if (turnSlot) zone = "turn-slot";

  const panel = el.closest(".Panel.Focusable") as HTMLElement | null;

  return {
    zone,
    tag: el.tagName,
    classHint: (typeof el.className === "string" ? el.className : "").slice(0, 72),
    turnId:
      header?.getAttribute("data-bonsai-turn-id") ??
      answer?.querySelector("[data-bonsai-answer-key]")?.getAttribute("data-bonsai-answer-key") ??
      null,
    gpfocus: Boolean(el.classList?.contains("gpfocus") || el.closest(".gpfocus")),
    panelClass: panel ? (panel.className?.toString() ?? "").slice(0, 72) : null,
  };
}
