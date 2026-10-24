/**
 * Title: Thinking blurb text element builder
 * Purpose: Render thinking status copy with italic prose, upright glyphs, spoilers redacted.
 * Used for: MainTabChatTranscript live Ask thinking line.
 * Solves: Keeps witty/deadpan tone on prose without slanting emoji or leaking marked spoilers.
 * Does not: Compose blurb copy — Python owns it, see bonsai_stream_tags.py.
 */
import React from "react";
import { redactThinkingBlurbSpoilers } from "../../spoilers/redactThinkingBlurbSpoilers";
import { splitThinkingBlurbItalicSegments } from "./splitThinkingBlurbItalicSegments";

export function buildThinkingBlurbTextElement(
  text: string,
  spoilerMaskingEnabled = false,
): React.ReactElement {
  const segments = splitThinkingBlurbItalicSegments(
    redactThinkingBlurbSpoilers(text, spoilerMaskingEnabled),
  );
  return (
    <>
      {segments.map((segment, index) => (
        <span
          key={`${index}-${segment.text}`}
          style={{ fontStyle: segment.italic ? "italic" : "normal" }}
        >
          {segment.text}
        </span>
      ))}
    </>
  );
}
