/**
 * Title: Character prop glyph appearance data
 *
 * Purpose: What CharacterPropGlyph.tsx needs before it draws anything — which named prop and
 * tint color go with which character key, and how to pick a readable line color for a given
 * tint. None of this is SVG art; it is the lookup table and the small color-contrast math the
 * art-drawing component resolves before it starts building shapes.
 *
 * Used for: CharacterPropGlyph.tsx only, split out so that file stays under the file-size
 * ratchet without touching the SVG path data itself (see that file's own "DO NOT REDRAW" note).
 *
 * Solves: Extracted 2026-09-21 — plan 63 lane Z, closing a files-over-400-lines regression.
 * CharacterPropGlyph.tsx's own header still explains what a prop and tint are used for; this
 * file only explains how they are looked up.
 *
 * Does not: Draw anything. `inkFor`/`inkForDisc` return a color string, nothing more.
 */

export type PropName =
  | "bat"
  | "launcher"
  | "flame"
  | "bomb"
  | "sammich"
  | "wrench"
  | "cross"
  | "scope"
  | "mask"
  | "mic"
  | "martini"
  | "truck"
  | "lamar"
  | "laptop"
  | "rope"
  | "watch"
  | "moon"
  | "fangs"
  | "dragon"
  | "fedora"
  | "notepad"
  | "stetson"
  | "tiara"
  | "orb"
  | "flower"
  | "spectacles"
  | "rosary"
  | "stockcar"
  | "spear"
  | "turret"
  | "alig"
  | "crate"
  | "pencil";

interface CharacterPropEntry {
  letter: string;
  prop: PropName;
  tint: string;
}

/** Keyed by the character keys in src/data/characterPlaceholderEmoticonGrids.ts */
export const CHARACTER_PROPS: Record<string, CharacterPropEntry> = {
  tf2_scout: { letter: "SC", prop: "bat", tint: "#4ecdc4" },
  tf2_soldier: { letter: "SO", prop: "launcher", tint: "#7a9e6a" },
  tf2_pyro: { letter: "P", prop: "flame", tint: "#ff9f43" },
  tf2_demoman: { letter: "D", prop: "bomb", tint: "#3d6fb5" },
  tf2_heavy: { letter: "H", prop: "sammich", tint: "#c45c3e" },
  tf2_engineer: { letter: "E", prop: "wrench", tint: "#c9a227" },
  tf2_medic: { letter: "M", prop: "cross", tint: "#f0e6d8" },
  tf2_sniper: { letter: "SN", prop: "scope", tint: "#2d8f6f" },
  tf2_spy: { letter: "SP", prop: "mask", tint: "#6b7c8f" },
  tf2_announcer: { letter: "A", prop: "mic", tint: "#8b5cf0" },
  gta5_michael: { letter: "M", prop: "martini", tint: "#5c6470" },
  gta5_trevor: { letter: "T", prop: "truck", tint: "#c45c3e" },
  gta5_lamar: { letter: "L", prop: "lamar", tint: "#4ecdc4" },
  gta5_lester: { letter: "LE", prop: "laptop", tint: "#6b7c8f" },
  rdr2_arthur: { letter: "A", prop: "rope", tint: "#d4a574" },
  rdr2_dutch: { letter: "D", prop: "watch", tint: "#5c4033" },
  bg3_shadowheart: { letter: "S", prop: "moon", tint: "#8b5cf0" },
  bg3_astarion: { letter: "A", prop: "fangs", tint: "#c94b7a" },
  bg3_laezel: { letter: "L", prop: "dragon", tint: "#2d8f6f" },
  fo4_nick_valentine: { letter: "N", prop: "fedora", tint: "#5c6470" },
  fo4_piper: { letter: "P", prop: "notepad", tint: "#c45c3e" },
  fo4_preston: { letter: "PR", prop: "stetson", tint: "#7a9e6a" },
  zelda_zelda: { letter: "Z", prop: "tiara", tint: "#c9a227" },
  zelda_navi: { letter: "N", prop: "orb", tint: "#4ecdc4" },
  sc_fuu: { letter: "F", prop: "flower", tint: "#c94b7a" },
  mgs_otacon: { letter: "O", prop: "spectacles", tint: "#6b7c8f" },
  cp2077_jackie: { letter: "J", prop: "rosary", tint: "#ff9f43" },
  l4d2_ellis: { letter: "E", prop: "stockcar", tint: "#d4a574" },
  hades_zagreus: { letter: "Z", prop: "spear", tint: "#c94b7a" },
  portal_glados: { letter: "G", prop: "turret", tint: "#4ecdc4" },
  alig_ali_g: { letter: "AG", prop: "alig", tint: "#c9a227" },
  __random__: { letter: "?", prop: "crate", tint: "#5c4033" },
  __custom__: { letter: "+", prop: "pencil", tint: "#e8d5c4" },
};

/** WCAG-ish pick between dark and light ink for a background colour. */
function inkFor(tint: string): string {
  const n = parseInt(tint.slice(1), 16);
  const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const L = 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255);
  return (L + 0.05) / 0.05 > 4.5 ? "#0e141c" : "#f7fbff";
}

/**
 * Ink for art sitting on the tinted disc: the disc gradient is the tint at 50%
 * alpha over #0f1620, so contrast is measured against that blend, not the raw tint.
 */
export function inkForDisc(tint: string): string {
  const n = parseInt(tint.slice(1), 16);
  const mix = (a: number, b: number) => Math.round(a * 0.5 + b * 0.5);
  const r = mix((n >> 16) & 255, 15), g = mix((n >> 8) & 255, 22), b = mix(n & 255, 32);
  const hex = "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
  return inkFor(hex);
}
