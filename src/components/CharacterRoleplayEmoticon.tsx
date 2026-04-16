import React from "react";
import { EMOTICON_PALETTE, resolveCharacterEmoticonGrid } from "./characterEmoticonGrids";

export type CharacterRoleplayEmoticonProps = {
  /** Preset catalog id, or `__random__` / `__custom__` for synthetic avatars. */
  presetId: string;
  size: number;
  className?: string;
  title?: string;
};

/**
 * Renders a small pixel-art style emoticon for the character roleplay picker and main input avatar.
 */
export function CharacterRoleplayEmoticon(props: CharacterRoleplayEmoticonProps) {
  const { presetId, size, className, title } = props;
  const { grid, cellsPerSide } = resolveCharacterEmoticonGrid(presetId);
  const cells = grid.split("");
  return (
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
}
