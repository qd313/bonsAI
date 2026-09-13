/**
 * Title: Reply micro-action definitions
 * Purpose: Follow-up chip ids, labels, and composer prefixes for quick reply corrections.
 * Used for: MainTabChatTranscript reply action rows and transparency chip labels.
 * Solves: Consistent user-facing copy when re-asking with too long / too short / bad info feedback.
 * Does not: Submit asks or track analytics — parent orchestration prepends prefix and re-submits.
 */
export type ReplyMicroActionId =
  | "bad_information"
  | "too_long"
  | "too_short"
  | "misidentified_game"
  | "unfenced_spoiler";

export type ReplyMicroActionDef = {
  id: ReplyMicroActionId;
  label: string;
  prefix: string;
  transparencyLabel: string;
};

const REPLY_MICRO_ACTIONS: ReplyMicroActionDef[] = [
  {
    id: "bad_information",
    label: "Bad information",
    prefix:
      "The last answer may be wrong. Correct factual errors, drop unverified claims, and state what you're unsure about. Original question: ",
    transparencyLabel: "Follow-up: Bad information",
  },
  {
    id: "misidentified_game",
    label: "Misidentified game/problem",
    prefix:
      "You may have the wrong game or issue. Re-check the running game/AppID and context, then re-answer. Original question: ",
    transparencyLabel: "Follow-up: Misidentified game/problem",
  },
  {
    id: "unfenced_spoiler",
    label: "Unfenced spoiler",
    prefix:
      "The last answer revealed spoiler content in plain text that should have been hidden. Rewrite it with the same information, but put anything spoilery — twists, endings, secret unlocks, or other things the player shouldn't know yet — inside ```bonsai-spoiler``` fences this time. Original question: ",
    transparencyLabel: "Follow-up: Unfenced spoiler",
  },
  {
    id: "too_long",
    label: "Too long",
    prefix: "Give a shorter answer—key points only, minimal preamble. Original question: ",
    transparencyLabel: "Follow-up: Too long",
  },
  {
    id: "too_short",
    label: "Too short",
    prefix:
      "Expand the answer with more detail, steps, or examples while staying on topic. Original question: ",
    transparencyLabel: "Follow-up: Too short",
  },
];

export function replyMicroActionById(id: string): ReplyMicroActionDef | undefined {
  return REPLY_MICRO_ACTIONS.find((a) => a.id === id);
}

export function composeChipAutofillPrefix(action: ReplyMicroActionDef, originalQuestion: string): string {
  const q = (originalQuestion || "").trim();
  return `${action.prefix}${q}`;
}
