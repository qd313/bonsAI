/**
 * Title: The game tag in the question box's strip
 *
 * Purpose: A small game icon and the running game's name, drawn in the question box's bottom strip just
 * right of the paperclip; "No game" when none is running. It replaces the italic "Context: active game …" /
 * "Context: no active game detected" line that used to sit under the big Ask button (plan 84 step 2,
 * drawing frames "D" and "Z" in docs/planning/assets/84-vertical-room.html).
 *
 * Used for: MainTabUnifiedAskBar.tsx, inside the strip's own row.
 *
 * Solves: The context line cost a whole row (18 points) under the ask area on a screen that has 454 in
 * all. The tag says the same thing inside a row that was already there, so the answer gets that room.
 *
 * Does not: Take the D-pad ring or do anything when pressed. It only reads, so it is a label, not a stop
 * (docs/focus-graph.md, "The ask box's strip"). Does not decide which game is running; the game context
 * comes in from the caller, the same value the context line read.
 *
 * How it works:
 * 1. askStripGameLabel turns the game context into the words the context line would have said, minus the
 *    "Context:" part: the game's name, its number when the name is missing, "No game" otherwise, and no
 *    tag at all while the context is not known yet (the line was not drawn then either).
 * 2. AskStripGameTag draws those words after a small game-pad icon, in the context line's colour and
 *    italics, and lets the name shrink to an ellipsis when the strip runs out of room.
 */
import type { OllamaContextUi } from "../types/bonsaiUi";

/** The context line's own colour (MainTab.tsx before plan 84), kept so the tag reads as the same fact. */
const GAME_TAG_COLOR = "#8fa8c4";

/**
 * In: the game context MainTab hands the Ask bar (null or undefined before the first sync).
 * Out: the tag's words, or null for "draw no tag". Every branch of the old context line is here: an
 *      active game with a number shows its name, or "AppID <number>" when the name is blank; anything
 *      else is "No game" (the line's "no active game detected"); no context at all draws nothing, as the
 *      line did.
 * Can go wrong: nothing; a name of only spaces counts as missing, as it did on the line.
 */
function askStripGameLabel(context: OllamaContextUi | undefined): string | null {
  if (!context) return null;
  if (context.app_context === "active" && context.app_id) {
    return context.app_name?.trim() || `AppID ${context.app_id}`;
  }
  return "No game";
}

/** The drawing's game-pad glyph (ICON.game in the plan 84 drawing), drawn in the text's own colour. */
function GamePadGlyph() {
  return (
    <svg
      width={13}
      height={13}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: "none" }}
    >
      <path d="M7 8h10a4.5 4.5 0 0 1 4.5 4.5v.5a3 3 0 0 1-5.3 1.9L15 13.5H9l-1.2 1.4A3 3 0 0 1 2.5 13v-.5A4.5 4.5 0 0 1 7 8z" />
      <path d="M7.5 10.5v3M6 12h3" />
    </svg>
  );
}

/**
 * In: the same game context as askStripGameLabel.
 * Out: the tag, or nothing while the context is unknown.
 * Can go wrong: nothing; the styles are inline, like the context line's were, so no stylesheet rule can
 *     leave the tag unstyled.
 */
export function AskStripGameTag({ context }: { context: OllamaContextUi | undefined }) {
  const label = askStripGameLabel(context);
  if (label === null) return null;
  return (
    <span
      className="bonsai-ask-strip-game"
      title={label}
      style={{
        flex: "0 1 auto",
        minWidth: 0,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        margin: "0 6px 0 7px",
        fontSize: 10,
        lineHeight: 1.2,
        fontStyle: "italic",
        color: GAME_TAG_COLOR,
        whiteSpace: "nowrap",
        overflow: "hidden",
      }}
    >
      <GamePadGlyph />
      <span
        className="bonsai-ask-strip-game__name"
        style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
      >
        {label}
      </span>
    </span>
  );
}
