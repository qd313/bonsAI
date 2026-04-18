import React from "react";
import { EMOTICON_PALETTE, resolveCharacterEmoticonGrid } from "./characterEmoticonGrids";

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

/**
 * Renders a small pixel-art style emoticon for the character roleplay picker and main input avatar.
 */
export function CharacterRoleplayEmoticon(props: CharacterRoleplayEmoticonProps) {
  const { presetId, size, className, title, badgeLetter } = props;
  const { grid, cellsPerSide } = resolveCharacterEmoticonGrid(presetId);
  const cells = grid.split("");
  const svg = (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${cellsPerSide} ${cellsPerSide}`}
      className={className}
      aria-hidden={title ? undefined : true}
      title={title}
      style={{
        imageRendering: "pixelated",
        flexShrink: 0,
        display: "block",
      }}
    >
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

  if (!badgeLetter) {
    return svg;
  }

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      {svg}
      <span aria-hidden style={badgeOverlayStyle(size)}>
        {badgeLetter}
      </span>
    </div>
  );
}
