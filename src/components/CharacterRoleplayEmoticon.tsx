/**
 * Title: Character roleplay emoticon
 * Purpose: Render preset or synthetic character avatars, as pixel grids or prop emblems, with an optional badge letter.
 * Used for: Main tab Ask bar (prop emblems), character picker rows and Settings character summary chrome (grids).
 * Solves: Consistent small avatar art without shipping per-character image assets, and one place the badge is drawn.
 * Does not: Load catalog metadata or apply accent colors — see characterCatalog and characterUiAccent.
 */
import React from "react";
import { EMOTICON_PALETTE, resolvePlaceholderCharacterEmoticonGrid } from "../data/characterPlaceholderEmoticonGrids";
import { CharacterPropGlyph } from "./CharacterPropGlyph";

/**
 * `"grid"` is the original 8x8/16x16 pixel art; `"prop"` is the prop-emblem disc from the
 * 2026-08-26 design handoff. Both keep the same box, so a caller can switch without moving
 * anything around it. **Both shipped callers are now on `"prop"`** — the Ask bar since the handoff
 * landed, the picker since D33 was locked at 26px (2026-08-27). `"grid"` stays the default so the
 * switch is opt-in rather than a silent change to anything added later, and because it is still
 * the fallback art for a preset with no prop. See docs/planning/25-ai-character-avatars-handoff.md.
 */
type CharacterRoleplayEmoticonArt = "grid" | "prop";

export type CharacterRoleplayEmoticonProps = {
  /** Preset catalog id, or `__random__` / `__custom__` for synthetic avatars. */
  presetId: string;
  size: number;
  className?: string;
  title?: string;
  /** When set, draws a corner letter pill (main tab + character picker). */
  badgeLetter?: string | null;
  /** Which artwork to draw. Defaults to the pixel grids so existing callers are unchanged. */
  art?: CharacterRoleplayEmoticonArt;
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

/** Corner letter pill over the art. Shared by both art styles so the badge cannot drift between them. */
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
 * Draws a character avatar in one of two styles, with the same box either way.
 *
 * `art="prop"` is the finished prop-emblem artwork (`CharacterPropGlyph`) and is what both the
 * main tab Ask bar and the character picker use. `art="grid"` is the older PLACEHOLDER pixel art in
 * `characterPlaceholderEmoticonGrids.ts`; it remains the default, so it is what an unspecified new
 * caller gets.
 */
export function CharacterRoleplayEmoticon(props: CharacterRoleplayEmoticonProps) {
  const { presetId, size, className, title, badgeLetter, art = "grid" } = props;

  // Prop emblems cover every key including `__random__` and `__custom__`, so this path skips
  // the "?" fallback below — Random has its own crate glyph and still gets the "?" badge.
  if (art === "prop") {
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

  if (presetId === "__random__") {
    const qSize = Math.max(12, Math.round(size * 0.72));
    return (
      <div
        className={className}
        title={title}
        aria-hidden={title ? undefined : true}
        style={{
          width: size,
          height: size,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
        }}
      >
        <span
          style={{
            fontSize: qSize,
            fontWeight: 700,
            lineHeight: 1,
            color: "rgba(220, 232, 244, 0.96)",
            fontFamily: "system-ui, Segoe UI, sans-serif",
          }}
        >
          ?
        </span>
      </div>
    );
  }

  const { grid, cellsPerSide } = resolvePlaceholderCharacterEmoticonGrid(presetId);
  const cells = grid.split("");
  const svg = (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${cellsPerSide} ${cellsPerSide}`}
      className={className}
      aria-hidden={title ? undefined : true}
      style={{
        imageRendering: "pixelated",
        flexShrink: 0,
        display: "block",
      }}
    >
      {title ? <title>{title}</title> : null}
      {cells.map((ch, i) => {
        if (ch === ".") return null;
        const idx = parseInt(ch, 16);
        const fill =
          Number.isFinite(idx) && idx >= 0 && idx < EMOTICON_PALETTE.length
            ? EMOTICON_PALETTE[idx]
            : EMOTICON_PALETTE[0];
        const x = i % cellsPerSide;
        const y = Math.floor(i / cellsPerSide);
        return <rect key={i} x={x} y={y} width={1} height={1} fill={fill} />;
      })}
    </svg>
  );

  return badgeLetter ? withBadge(svg, size, badgeLetter) : svg;
}
