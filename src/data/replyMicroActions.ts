/**
 * Title: The quick fix-it chips under a reply
 *
 * Purpose: Under a finished answer, a row of small chips lets the user ask
 * for a quick correction with one tap instead of typing it out: Bad
 * information, Too long, Too short, Misidentified game/problem, and
 * Unfenced spoiler. This file names the five chips, and, for each one, the
 * label shown on the chip and the sentence quietly added in front of the
 * original question when it is re-asked.
 *
 * Used for: the row of chips shown under a reply in the chat, and the log of
 * what was actually sent that a person can open to double-check the AI's
 * work (the same sentence is labelled there too).
 *
 * Solves: one shared wording for each of the five corrections, so the chip
 * label, the sentence added to the re-ask, and the label shown in the log
 * all say the same thing rather than three different phrasings of "too
 * long."
 *
 * Does not: actually send the re-ask, or keep a record that it happened.
 * Tapping a chip hands the composed sentence back to the code that runs the
 * whole Ask flow, which is what sends it and keeps track of it.
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
