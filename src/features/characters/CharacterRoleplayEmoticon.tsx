/**
 * Title: Character roleplay emoticon
 * Purpose: Render preset or synthetic character avatars as prop emblems, with an optional badge letter.
 * Used for: Main tab Ask bar, character picker rows and Settings character summary chrome.
 * Solves: Consistent small avatar art without shipping per-character image assets, and one place the badge is drawn.
 * Does not: Load catalog metadata or apply accent colors — see characterCatalog and characterUiAccent.
 */
import React from "react";
import { CharacterPropGlyph } from "./CharacterPropGlyph";

export type CharacterRoleplayEmoticonProps = {
  /** Preset catalog id, or `__random__` / `__custom__` for synthetic avatars. */
  presetId: string;
  size: number;
  className?: string;
  title?: string;
  /** When set, draws a corner letter pill (main tab + character picker). */
  badgeLetter?: string | null;
};

function badgeOverlayStyle(size: number): React.CSSProperties {
  const scale = size / 18;
  return {
    position: "absolute",
    right: Math.round(-2 * scale),
    bottom: Math.round(-2 * scale),
    minWidth: Math.max(9, Math.round(10 * scale)),
    height: Math.max(9, Math.round(10 * scale)),
    padding: `0 ${Math.max(1, Math.round(2 * scale))}px`,
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: Math.max(6, Math.round(7 * scale)),
    fontWeight: 700,
    lineHeight: 1,
    color: "rgba(240, 240, 245, 0.98)",
    background: "rgba(0, 0, 0, 0.78)",
    pointerEvents: "none",
    boxSizing: "border-box",
  };
}

/** Corner letter pill over the art. */
function withBadge(art: React.ReactElement, size: number, badgeLetter: string) {
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      {art}
      <span aria-hidden style={badgeOverlayStyle(size)}>
        {badgeLetter}
      </span>
    </div>
  );
}

/**
 * Draws a character avatar as the prop emblem (`CharacterPropGlyph`). It covers every key,
 * including `__random__` and `__custom__`; Random has its own crate glyph and still gets the "?" badge.
 */
export function CharacterRoleplayEmoticon(props: CharacterRoleplayEmoticonProps) {
  const { presetId, size, className, title, badgeLetter } = props;
  const glyph = (
    <CharacterPropGlyph
      characterKey={presetId}
      size={size}
      framed
      className={className}
      title={title}
    />
  );
  return badgeLetter ? withBadge(glyph, size, badgeLetter) : glyph;
}
