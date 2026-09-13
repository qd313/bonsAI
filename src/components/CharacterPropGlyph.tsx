/**
 * Title: Character prop glyph
 * Purpose: Render a character as a prop emblem (bat, fedora, sandvich…) in inline SVG on a tinted, vignetted disc.
 * Used for: The main tab Ask bar avatar (18px) and every character picker avatar (26px), via CharacterRoleplayEmoticon's `art="prop"` path.
 * Solves: The 8x8/16x16 pixel grids in CharacterRoleplayEmoticon read as noise at 18px and break up above ~32px.
 * Does not: Render at the 44px the art was reviewed at — D33 locked the picker at 26px instead.
 *
 * DO NOT REDRAW THE SVG PATH DATA. Every coordinate below is the approved design and was
 * ported verbatim from the prototype; several props went through multiple review rounds.
 * Source bundle: docs/design/handoffs/ai-character-avatars/ (README.md + the .dc.html prototype, turn 5a).
 */
import React from "react";

/**
 * Character avatar glyphs — prop emblems on a tinted disc.
 * Ported verbatim from the HTML design prototype (AI character avatars.dc.html, turn 5a).
 * All art is inline SVG on a 32x32 viewBox; no raster assets.
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

export interface CharacterPropEntry {
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
export function inkFor(tint: string): string {
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

export interface CharacterPropGlyphProps {
  /** Character key, e.g. "tf2_scout". Ignored if `prop` is given directly. */
  characterKey?: string;
  prop?: PropName;
  tint?: string;
  /** Rendered px box. The art is drawn on a 32x32 viewBox and scales linearly. */
  size?: number;
  /** Tinted disc + vignette + hairline ring behind the art. */
  framed?: boolean;
  /** Passed straight to the `<svg>`, so callers can style it like any other node. */
  className?: string;
  /** Accessible name. Omit it and the art is marked decorative, matching the grid renderer. */
  title?: string;
}

export function CharacterPropGlyph({
  characterKey,
  prop,
  tint,
  size = 44,
  framed = true,
  className,
  title,
}: CharacterPropGlyphProps): React.ReactElement {
  const entry = characterKey ? CHARACTER_PROPS[characterKey] : undefined;
  const resolvedTint = tint ?? entry?.tint ?? "#5c6470";
  const resolvedProp = (prop ?? entry?.prop ?? "crate") as PropName;
  const h = React.createElement;
  // Gradient and mask ids must be unique per instance: two discs sharing an id makes the
  // second one paint with the first one's tint. `useId` is stable across SSR/concurrent
  // renders, unlike the module counter the design bundle shipped. The colons it returns
  // (`:r0:`) are stripped — the raw value is fragile inside `url(#...)` and unusable in a
  // selector without escaping.
  const id = "g" + React.useId().replace(/:/g, "");
  const c = { prop: resolvedProp, tint: resolvedTint, ink: inkForDisc(resolvedTint) };
  const ink = c.ink;
  const k: React.ReactNode[] = [];
  const P: string = c.prop;
    if (P === "bomb") {
      k.push(h("circle", { key: "b", cx: 15.2, cy: 19.4, r: 8.5, fill: ink }));
      k.push(h("rect", { key: "n", x: 17.4, y: 8.2, width: 4.6, height: 4.2, rx: 1, fill: ink, transform: "rotate(24 19.7 10.3)" }));
      k.push(h("path", { key: "f", d: "M 21.4 8.6 Q 26.4 6.4 25.2 3.2", fill: "none", stroke: ink, strokeWidth: 2, strokeLinecap: "round" }));
      k.push(h("circle", { key: "s", cx: 24.6, cy: 2.2, r: 2.1, fill: ink }));
      k.push(h("ellipse", { key: "h", cx: 11.6, cy: 16, rx: 2.4, ry: 3, fill: c.tint, opacity: 0.34 }));
    } else if (P === "launcher") {
      k.push(h("g", { key: "lg", transform: "rotate(-15 16 16) translate(4.1,-.4)" },
        h("path", { d: "M -3.4 10 L -8.8 6.6 L -8.8 25.2 L -3.4 21.8 Z", fill: ink }),
        h("rect", { x: -4.4, y: 12.2, width: 33.4, height: 7.6, rx: 2.2, fill: ink }),
        h("rect", { x: 27.6, y: 10.4, width: 5, height: 11.2, rx: 1.8, fill: ink }),
        h("rect", { x: 29.9, y: 13.2, width: 2.7, height: 5.6, rx: 1.1, fill: c.tint, opacity: .6 }),
        h("rect", { x: 9.4, y: 8.4, width: 5.4, height: 4, rx: 1.2, fill: ink }),
        h("path", { d: "M 12.4 19.6 L 16.8 19.6 L 15.3 27.2 L 10.6 27.2 Z", fill: ink }),
        h("path", { d: "M 17 20.4 Q 20.2 21.6 19.2 25.4", fill: "none", stroke: ink, strokeWidth: 1.7, strokeLinecap: "round" })));
    } else if (P === "mic") {
      k.push(h("g", { key: "mc" },
        h("path", { d: "M 4.6 29.2 Q 5.4 23.8 16 23.8 Q 26.6 23.8 27.4 29.2 Z", fill: ink }),
        h("rect", { x: 4.6, y: 29.2, width: 22.8, height: 1.5, rx: .7, fill: "#101720", opacity: .45 }),
        h("path", { d: "M 14.4 24 L 17.6 24 L 16.9 15.4 L 15.1 15.4 Z", fill: ink }),
        h("g", { transform: "rotate(19 16 10.4)" },
          h("path", { d: "M 12.2 14.8 L 19.8 14.8 L 19 18.4 L 13 18.4 Z", fill: ink }),
          h("path", { d: "M 9.6 6.2 Q 9.6 1.6 16 1.6 Q 22.4 1.6 22.4 6.2 L 22.4 12 Q 22.4 15.6 16 15.6 Q 9.6 15.6 9.6 12 Z", fill: ink }),
          h("g", { opacity: .5 }, [4.2, 6.4, 8.6, 10.8, 13].map((y, i) =>
            h("rect", { key: i, x: 11.2, y: y, width: 9.6, height: 1.2, rx: .5, fill: "#101720" })))),
        h("circle", { cx: 16, cy: 16.2, r: 2.2, fill: ink }),
        h("circle", { cx: 16, cy: 16.2, r: .85, fill: c.tint, opacity: .6 })));
    } else if (P === "wrench") {
      k.push(h("mask", { key: "m", id: id + "-m" },
        h("rect", { x: 0, y: 0, width: 32, height: 32, fill: "#000" }),
        h("g", { transform: "rotate(-38 16 16)" },
          h("rect", { x: 12.9, y: 9, width: 6.2, height: 20, rx: 2.6, fill: "#fff" }),
          h("rect", { x: 12.1, y: 24.4, width: 7.8, height: 4.6, rx: 2.2, fill: "#fff" }),
          h("rect", { x: 9.2, y: 2.4, width: 13.6, height: 12.4, rx: 2.6, fill: "#fff" }),
          h("path", { d: "M 19.4 8.6 L 17.7 11.55 L 14.3 11.55 L 12.6 8.6 L 14.3 5.65 L 17.7 5.65 Z", fill: "#000" }),
          h("rect", { x: 13.2, y: 0.4, width: 5.6, height: 6.4, fill: "#000" }))));
      k.push(h("rect", { key: "f", x: 0, y: 0, width: 32, height: 32, fill: ink, mask: "url(#" + id + "-m)" }));
    } else if (P === "flower") {
      k.push(h("g", { key: "p" }, [0, 45, 90, 135, 180, 225, 270, 315].map((a) =>
        h("ellipse", { key: a, cx: 16, cy: 7.4, rx: 2.7, ry: 5.4, fill: ink, transform: "rotate(" + a + " 16 16)" }))));
      k.push(h("circle", { key: "c", cx: 16, cy: 16, r: 4.6, fill: c.tint }));
      k.push(h("circle", { key: "c2", cx: 16, cy: 16, r: 4.6, fill: "none", stroke: ink, strokeWidth: 1.4 }));
    } else if (P === "bat") {
      k.push(h("g", { transform: "rotate(38 16 16)" },
        h("path", { d: "M 13.2 4.2 Q 13.2 1.2 16 1.2 Q 18.8 1.2 18.8 4.2 L 18.8 14.6 Q 18.6 19.2 17.4 22.2 L 14.6 22.2 Q 13.4 19.2 13.2 14.6 Z", fill: ink }),
        h("rect", { x: 13.2, y: 3.4, width: 5.6, height: 1.9, fill: "#c8382f" }),
        h("rect", { x: 13.2, y: 5.9, width: 5.6, height: 2.1, fill: "#f2c327" }),
        h("rect", { x: 13.2, y: 8.6, width: 5.6, height: 1.6, fill: "#c8382f" }),
        h("path", { d: "M 13.05 20.1 L 18.95 20.1 L 18.4 22 L 13.6 22 Z", fill: "#c8382f" }),
        h("rect", { x: 14.55, y: 21.9, width: 2.9, height: 7.9, rx: .9, fill: "#101720" }),
        h("g", { stroke: ink, strokeWidth: .45, opacity: .5 }, [22.9, 24, 25.1, 26.2, 27.3, 28.4, 29.3].map((y, i) =>
          h("path", { key: i, d: "M 14.6 " + y + " L 17.4 " + (y - .4) }))),
        h("ellipse", { cx: 16, cy: 30.2, rx: 2.5, ry: 1.5, fill: "#101720" })));
    } else if (P === "flame") {
      k.push(h("path", { d: "M 16 2.4 Q 25.6 11.4 25.6 19.4 Q 25.6 28.6 16 28.6 Q 6.4 28.6 6.4 19.4 Q 6.4 13.4 12 8.4 Q 11.4 13.6 14.4 14.6 Q 17 15 16.6 11 Q 16.2 7.4 16 2.4 Z", fill: ink }));
      k.push(h("path", { d: "M 16 17.4 Q 20.6 21.4 20.6 24.2 Q 20.6 27.6 16 27.6 Q 11.4 27.6 11.4 24.2 Q 11.4 21.4 16 17.4 Z", fill: c.tint, opacity: .55 }));
    } else if (P === "sammich") {
      k.push(h("g", { transform: "rotate(-8 16 17)" },
        h("path", { d: "M 3.6 13.8 Q 3.6 4.6 16 4.6 Q 28.4 4.6 28.4 13.8 Z", fill: "#d7a15a" }),
        h("path", { d: "M 3.2 14 L 28.8 14 Q 27.4 17.4 24.4 17.4 L 7.6 17.4 Q 4.6 17.4 3.2 14 Z", fill: "#8fbf5a" }),
        h("path", { d: "M 4.4 17.6 L 27.6 17.6 L 26.4 21 L 5.6 21 Z", fill: "#c8382f" }),
        h("path", { d: "M 4.8 21.2 L 27.2 21.2 Q 26.4 23.4 23.6 23.4 L 8.4 23.4 Q 5.6 23.4 4.8 21.2 Z", fill: "#e8c26a" }),
        h("path", { d: "M 3.6 23.6 L 28.4 23.6 L 28.4 26.6 Q 28.4 27.8 27 27.8 L 5 27.8 Q 3.6 27.8 3.6 26.6 Z", fill: "#d7a15a" }),
        h("g", { opacity: .45 }, [[10.4, 11.4], [16, 11.4], [21.6, 11.4]].map((p, i) =>
          h("circle", { key: i, cx: p[0], cy: p[1], r: .9, fill: "#101720" })))));
    } else if (P === "cross") {
      k.push(h("circle", { cx: 16, cy: 16, r: 13.2, fill: "#f4f1ea" }));
      k.push(h("rect", { x: 13.1, y: 5.6, width: 5.8, height: 20.8, rx: 1.4, fill: "#c8382f" }));
      k.push(h("rect", { x: 5.6, y: 13.1, width: 20.8, height: 5.8, rx: 1.4, fill: "#c8382f" }));
    } else if (P === "scope") {
      k.push(h("circle", { cx: 16, cy: 16, r: 11.4, fill: "none", stroke: ink, strokeWidth: 3 }));
      k.push(h("rect", { x: 14.7, y: 1.6, width: 2.6, height: 9.4, rx: 1.2, fill: ink }));
      k.push(h("rect", { x: 14.7, y: 21, width: 2.6, height: 9.4, rx: 1.2, fill: ink }));
      k.push(h("rect", { x: 1.6, y: 14.7, width: 9.4, height: 2.6, rx: 1.2, fill: ink }));
      k.push(h("rect", { x: 21, y: 14.7, width: 9.4, height: 2.6, rx: 1.2, fill: ink }));
      k.push(h("circle", { cx: 16, cy: 16, r: 2.8, fill: ink }));
    } else if (P === "mask") {
      k.push(h("path", { d: "M 3.4 11.4 Q 16 8 28.6 11.4 Q 28.6 21.6 22 21.6 Q 18.4 21.6 16 18.8 Q 13.6 21.6 10 21.6 Q 3.4 21.6 3.4 11.4 Z", fill: ink }));
      k.push(h("ellipse", { cx: 10.2, cy: 15.4, rx: 2.7, ry: 2.1, fill: c.tint, opacity: .6, transform: "rotate(-10 10.2 15.4)" }));
      k.push(h("ellipse", { cx: 21.8, cy: 15.4, rx: 2.7, ry: 2.1, fill: c.tint, opacity: .6, transform: "rotate(10 21.8 15.4)" }));
    } else if (P === "martini") {
      k.push(h("path", { d: "M 5.4 6.6 L 26.6 6.6 L 16 19.4 Z", fill: ink }));
      k.push(h("path", { d: "M 9.4 8.8 L 22.6 8.8 L 16 16.6 Z", fill: c.tint, opacity: .5 }));
      k.push(h("rect", { x: 14.7, y: 18.8, width: 2.6, height: 7.8, rx: 1.2, fill: ink }));
      k.push(h("rect", { x: 9.2, y: 26.2, width: 13.6, height: 2.6, rx: 1.2, fill: ink }));
      k.push(h("path", { d: "M 20.4 4 L 17.4 11.4", fill: "none", stroke: ink, strokeWidth: 1.3, strokeLinecap: "round" }));
      k.push(h("circle", { cx: 20.8, cy: 3.4, r: 2.2, fill: ink }));
    } else if (P === "truck") {
      k.push(h("g", { transform: "rotate(-3 16 18)" },
        h("path", { d: "M 2.2 22.6 L 2.4 17.2 L 7.2 17.4 L 8.8 9.2 L 16.6 9.6 L 17.4 16.4 L 22.4 16.6 L 22.8 14.2 L 23.6 16.6 L 29.6 16.2 L 29.4 22.8 Z", fill: ink }),
        h("path", { d: "M 10.2 11.2 L 15.4 11.4 L 15.9 15.4 L 9.6 15.2 Z", fill: c.tint, opacity: .6 }),
        h("path", { d: "M 12.6 11.3 L 12.9 15.3", fill: "none", stroke: ink, strokeWidth: .9, opacity: .7 }),
        h("path", { d: "M 18.4 17.6 L 28.6 17.4 L 28.6 21.4 L 18.6 21.4 Z", fill: "#101720", opacity: .34 }),
        h("path", { d: "M 2.6 18.4 L 5.2 18.6 L 5 20.4 L 2.5 20.2 Z", fill: c.tint, opacity: .5 }),
        h("circle", { cx: 9.2, cy: 23.4, r: 3.9, fill: ink }),
        h("circle", { cx: 24.2, cy: 23.4, r: 3.9, fill: ink }),
        h("circle", { cx: 9.2, cy: 23.4, r: 1.5, fill: c.tint, opacity: .65 }),
        h("circle", { cx: 24.2, cy: 23.4, r: 1.5, fill: c.tint, opacity: .65 })));
    } else if (P === "lamar") {
      k.push(h("circle", { cx: 11, cy: 8.6, r: 3.8, fill: ink }));
      k.push(h("path", { d: "M 6.4 7.4 Q 6.4 3.8 11 3.8 Q 15.6 3.8 15.6 7.4 L 15.6 8.4 L 6.4 8.4 Z", fill: "#5fbf4f" }));
      k.push(h("path", { d: "M 15.6 7.2 L 18.4 6.2 L 18.4 8.2 L 15.6 8.8 Z", fill: "#5fbf4f" }));
      k.push(h("path", { d: "M 6 29.4 Q 5.6 13.8 11 13.8 Q 16.4 13.8 16 29.4 Z", fill: "#5fbf4f" }));
      k.push(h("path", { d: "M 10 20 L 12 20 L 12 29.4 L 10 29.4 Z", fill: "#101720", opacity: .5 }));
      k.push(h("ellipse", { cx: 23.6, cy: 23.4, rx: 6.2, ry: 3.8, fill: "#33333c", stroke: "rgba(232,240,248,.35)", strokeWidth: .6 }));
      k.push(h("path", { d: "M 27.4 21.6 Q 27.4 16.4 30 16.4 Q 31.4 16.4 31.4 18.6 Q 31.4 21.4 29.4 22.8 Z", fill: "#33333c", stroke: "rgba(232,240,248,.35)", strokeWidth: .6 }));
      k.push(h("path", { d: "M 28.4 17 L 27.4 13.4 L 30.8 15.4 Z", fill: "#33333c" }));
      k.push(h("circle", { cx: 30.4, cy: 20.2, r: 1.2, fill: "#a8683a" }));
      k.push(h("ellipse", { cx: 19.8, cy: 24.6, rx: 1.7, ry: 1.3, fill: "#a8683a" }));
      k.push(h("path", { d: "M 17.6 22.6 Q 16.4 19.4 18.4 17.8", fill: "none", stroke: ink, strokeWidth: 1.7, strokeLinecap: "round" }));
      k.push(h("g", null, [19.6, 25.6].map((x, i) => h("rect", { key: i, x: x, y: 26.4, width: 2.4, height: 3.8, rx: 1, fill: "#a8683a" }))));
    } else if (P === "laptop") {
      k.push(h("path", { d: "M 6.4 6.4 L 25.6 6.4 L 25.6 20 L 6.4 20 Z", fill: ink }));
      k.push(h("rect", { x: 8.8, y: 8.8, width: 14.4, height: 8.6, rx: .8, fill: c.tint, opacity: .55 }));
      k.push(h("path", { d: "M 2.4 20.6 L 29.6 20.6 L 27.4 25.6 L 4.6 25.6 Z", fill: ink }));
    } else if (P === "rope") {
      k.push(h("g", { transform: "translate(32 0) scale(-1 1)" },
        h("ellipse", { cx: 16, cy: 15.4, rx: 11.4, ry: 8.4, fill: "none", stroke: ink, strokeWidth: 2.8 }),
        h("ellipse", { cx: 16, cy: 18.6, rx: 8.2, ry: 5.8, fill: "none", stroke: ink, strokeWidth: 2.4, opacity: .8 }),
        h("path", { d: "M 24.6 21.4 Q 29.4 24.4 26.4 29.4", fill: "none", stroke: ink, strokeWidth: 2.2, strokeLinecap: "round" })));
    } else if (P === "fedora") {
      k.push(h("g", { transform: "rotate(-11 16 16)" },
        h("path", { d: "M 9 17.4 L 11 8 Q 11.4 4 14.5 4.8 Q 16 7.8 17.8 4.6 Q 21 3.9 21.4 8 L 23.2 17.4 Z", fill: ink }),
        h("path", { d: "M 2.6 18.4 Q 2 16.6 4.6 16.7 L 27.4 16.7 Q 30.4 16.6 29.8 18.5 Q 28.8 21.4 24.6 22.2 Q 15 24 7.4 21.8 Q 3.6 20.5 2.6 18.4 Z", fill: ink }),
        h("path", { d: "M 8.8 13.8 L 23.4 13.8 L 23.9 17 L 9.2 17 Z", fill: "#101720", opacity: .62 }),
        h("path", { d: "M 20.6 13.9 L 24.4 14.6 L 24.1 17 L 20.9 17 Z", fill: "#101720", opacity: .82 })));
    } else if (P === "watch") {
      k.push(h("circle", { cx: 16, cy: 19.4, r: 10, fill: ink }));
      k.push(h("circle", { cx: 16, cy: 19.4, r: 7.6, fill: "#f4f1e8" }));
      k.push(h("g", { stroke: "#2b2118", strokeWidth: 1.1, strokeLinecap: "round" },
        [0, 90, 180, 270].map((a) => h("path", { key: a, d: "M 16 12.8 L 16 14.4", transform: "rotate(" + a + " 16 19.4)" }))));
      k.push(h("path", { d: "M 16 19.4 L 16 14.6 M 16 19.4 L 19.8 21.4", fill: "none", stroke: "#2b2118", strokeWidth: 1.5, strokeLinecap: "round" }));
      k.push(h("circle", { cx: 16, cy: 19.4, r: 1.1, fill: "#2b2118" }));
      k.push(h("rect", { x: 14.5, y: 6.6, width: 3, height: 3.6, rx: 1, fill: ink }));
      k.push(h("circle", { cx: 16, cy: 4.6, r: 2.4, fill: "none", stroke: ink, strokeWidth: 1.9 }));
    } else if (P === "tiara") {
      k.push(h("path", { d: "M 4.4 25.4 L 4.4 19 L 5.6 9.6 L 8.4 16.6 L 10.8 6.6 L 13.6 16 L 16 4.6 L 18.4 16 L 21.2 6.6 L 23.6 16.6 L 26.4 9.6 L 27.6 19 L 27.6 25.4 Z", fill: ink }));
      k.push(h("path", { d: "M 4.4 20.8 L 27.6 20.8 L 27.6 22.8 L 4.4 22.8 Z", fill: c.tint }));
      k.push(h("circle", { cx: 16, cy: 21.8, r: 1.9, fill: c.tint }));
      k.push(h("circle", { cx: 5.6, cy: 9.6, r: 1.3, fill: ink }));
      k.push(h("circle", { cx: 10.8, cy: 6.6, r: 1.5, fill: ink }));
      k.push(h("circle", { cx: 16, cy: 4.6, r: 1.8, fill: ink }));
      k.push(h("circle", { cx: 21.2, cy: 6.6, r: 1.5, fill: ink }));
      k.push(h("circle", { cx: 26.4, cy: 9.6, r: 1.3, fill: ink }));
    } else if (P === "orb") {
      k.push(h("g", { transform: "translate(0 3)" },
        h("g", { fill: ink, opacity: .32 },
          h("path", { d: "M 2.2 3.4 Q 4 10.6 12.4 14.2 Q 8.6 6.2 2.2 3.4 Z" }),
          h("path", { d: "M 29.8 3.4 Q 28 10.6 19.6 14.2 Q 23.4 6.2 29.8 3.4 Z" })),
        h("g", { stroke: ink, strokeWidth: .5, opacity: .3, fill: "none" },
          h("path", { d: "M 3.4 4.8 L 11.2 13.2" }),
          h("path", { d: "M 28.6 4.8 L 20.8 13.2" })),
        h("circle", { cx: 16, cy: 16, r: 7.6, fill: ink, opacity: .2 }),
        h("circle", { cx: 16, cy: 16, r: 5.6, fill: ink, opacity: .55 }),
        h("circle", { cx: 16, cy: 16, r: 3, fill: ink })));
    } else if (P === "spectacles") {
      k.push(h("circle", { cx: 9.4, cy: 16.4, r: 6.2, fill: "none", stroke: ink, strokeWidth: 1.9 }));
      k.push(h("circle", { cx: 22.6, cy: 16.4, r: 6.2, fill: "none", stroke: ink, strokeWidth: 1.9 }));
      k.push(h("circle", { cx: 9.4, cy: 16.4, r: 4.9, fill: c.tint, opacity: .28 }));
      k.push(h("circle", { cx: 22.6, cy: 16.4, r: 4.9, fill: c.tint, opacity: .28 }));
      k.push(h("path", { d: "M 15.6 15.4 Q 16 13.6 16.4 15.4", fill: "none", stroke: ink, strokeWidth: 1.7, strokeLinecap: "round" }));
      k.push(h("path", { d: "M 3.4 14.6 L 0.8 11.4", fill: "none", stroke: ink, strokeWidth: 1.7, strokeLinecap: "round" }));
      k.push(h("path", { d: "M 28.6 14.6 L 31.2 11.4", fill: "none", stroke: ink, strokeWidth: 1.7, strokeLinecap: "round" }));
      k.push(h("path", { d: "M 6.6 11.4 Q 9.4 9.8 12.2 11.4", fill: "none", stroke: ink, strokeWidth: 1.2, opacity: .5 }));
    } else if (P === "moon") {
      k.push(h("g", { key: "mc", transform: "rotate(24 16 16)" },
        h("rect", { x: 14.6, y: 13.4, width: 2.8, height: 16, rx: 1.2, fill: ink }),
        h("rect", { x: 12.9, y: 27.4, width: 6.2, height: 2.4, rx: 1.1, fill: ink }),
        h("g", null, [0, 45, 90, 135, 180, 225, 270, 315].map((a) =>
          h("path", { key: a, d: "M 16 1 L 17.9 5.4 L 14.1 5.4 Z", fill: ink, transform: "rotate(" + a + " 16 9.4)" }))),
        h("circle", { cx: 16, cy: 9.4, r: 5.4, fill: ink }),
        h("circle", { cx: 14.4, cy: 7.8, r: 1.8, fill: c.tint, opacity: .45 })));
    } else if (P === "fangs") {
      k.push(h("path", { d: "M 8.2 3.6 L 23.8 3.6 L 23.8 9 Q 23.8 16.6 16 16.6 Q 8.2 16.6 8.2 9 Z", fill: ink }));
      k.push(h("ellipse", { cx: 16, cy: 6.4, rx: 6.2, ry: 1.7, fill: "#7c1728" }));
      k.push(h("path", { d: "M 20.9 7.4 Q 21.7 10.8 20.5 12.6", fill: "none", stroke: "#7c1728", strokeWidth: 1.5, strokeLinecap: "round" }));
      k.push(h("rect", { x: 14.7, y: 16.2, width: 2.6, height: 7.6, rx: 1.1, fill: ink }));
      k.push(h("path", { d: "M 9.2 27.6 Q 9.2 24.6 16 24.6 Q 22.8 24.6 22.8 27.6 L 22.8 28.2 L 9.2 28.2 Z", fill: ink }));
    } else if (P === "dragon") {
      k.push(h("path", { d: "M 2.8 13.8 L 12.6 11.6 L 15.4 10.8 L 23 2.8 L 21.2 11 L 27 8.6 L 24.6 12.6 Q 28.2 14.6 28.2 18.6 L 28.2 28.6 L 21.6 28.6 Q 21.4 21 16.8 18.8 L 10.6 17.2 L 8 15.4 Z", fill: ink }));
      k.push(h("path", { d: "M 3 16.2 L 10.6 17.8 L 6.6 22 Z", fill: ink }));
      k.push(h("path", { d: "M 15.4 12.8 L 18.6 13.2 L 16.6 15.2 Z", fill: c.tint }));
      k.push(h("circle", { cx: 4.8, cy: 14.7, r: .65, fill: "#101720", opacity: .55 }));
    } else if (P === "notepad") {
      k.push(h("rect", { x: 6.4, y: 5.4, width: 17.6, height: 22.2, rx: 2, fill: ink }));
      k.push(h("g", { opacity: .5 }, [11.4, 15, 18.6].map((y, i) =>
        h("rect", { key: i, x: 9.6, y: y, width: 11.2 - i * 2.4, height: 1.5, rx: .7, fill: c.tint }))));
      k.push(h("g", null, [9.6, 14, 18.4].map((x, i) =>
        h("rect", { key: i, x: x, y: 2.4, width: 2.4, height: 5.4, rx: 1.1, fill: ink }))));
      k.push(h("path", { d: "M 21.4 23.4 L 27.6 17.2 L 30.2 19.8 L 24 26 L 20.2 27.2 Z", fill: "#101720", opacity: .35 }));
      k.push(h("path", { d: "M 22.4 22.4 L 27.6 17.4 L 29.4 19.4 L 24.4 24.4 L 21.6 25.4 Z", fill: c.tint }));
      k.push(h("path", { d: "M 21.6 25.4 L 22.6 23.6 L 23.4 24.4 Z", fill: ink }));
    } else if (P === "stetson") {
      k.push(h("path", { d: "M 9.2 17.8 L 9.8 3 Q 16 0.8 22.2 3 L 22.8 17.8 Z", fill: ink }));
      k.push(h("path", { d: "M 0.6 12.6 Q 0.2 19.6 5.6 20.2 L 26.4 20.2 Q 31.8 19.6 31.4 12.6 Q 31 16.8 27.2 17.2 L 4.8 17.2 Q 1 16.8 0.6 12.6 Z", fill: ink }));
      k.push(h("path", { d: "M 9.2 13.6 L 22.8 13.6 L 22.8 17.2 L 9.2 17.2 Z", fill: "#101720", opacity: .5 }));
      k.push(h("path", { d: "M 13 3.8 Q 16 7 19 3.8", fill: "none", stroke: "#101720", strokeWidth: 1.6, opacity: .4 }));
    } else if (P === "turret") {
      k.push(h("rect", { x: 6.4, y: 1, width: 19.2, height: 2.4, rx: 1.1, fill: ink }));
      k.push(h("rect", { x: 14.7, y: 3.2, width: 2.6, height: 3.6, fill: ink }));
      k.push(h("rect", { x: 6.8, y: 13.2, width: 4, height: 2.6, fill: ink }));
      k.push(h("rect", { x: 21.2, y: 13.2, width: 4, height: 2.6, fill: ink }));
      k.push(h("ellipse", { cx: 16, cy: 16, rx: 6.2, ry: 10.2, fill: ink }));
      k.push(h("rect", { x: 2.6, y: 9, width: 4.8, height: 14, rx: 2.3, fill: ink }));
      k.push(h("rect", { x: 24.6, y: 9, width: 4.8, height: 14, rx: 2.3, fill: ink }));
      k.push(h("g", { opacity: .7 }, [[5, 12.6], [5, 16], [5, 19.4], [27, 12.6], [27, 16], [27, 19.4]].map((p, i) =>
        h("circle", { key: i, cx: p[0], cy: p[1], r: 1.05, fill: "#101720" }))));
      k.push(h("circle", { cx: 16, cy: 13.2, r: 3.3, fill: c.tint }));
      k.push(h("circle", { cx: 16, cy: 13.2, r: 1.5, fill: "#e8443a" }));
    } else if (P === "rosary") {
      k.push(h("g", { transform: "rotate(-7 16 16)" },
        h("path", { d: "M 16 3.4 Q 9.9 4.1 9.6 9.4 Q 9.5 13.8 16 18.8 Q 22.5 13.8 22.4 9.4 Q 22.1 4.1 16 3.4", fill: "none", stroke: ink, strokeWidth: .9, opacity: .55 }),
        h("g", null, [[16, 3.4], [12.4, 4], [10.2, 6.2], [9.6, 9.4], [10.2, 12.4], [12.2, 15.2], [14.3, 17.3], [17.7, 17.3], [19.8, 15.2], [21.8, 12.4], [22.4, 9.4], [21.8, 6.2], [19.6, 4]].map((p, i) =>
          h("circle", { key: i, cx: p[0], cy: p[1], r: 1.35, fill: ink }))),
        h("circle", { cx: 16, cy: 20, r: 1.6, fill: ink }),
        h("rect", { x: 14.9, y: 21.8, width: 2.2, height: 8.2, rx: .6, fill: ink }),
        h("rect", { x: 12.1, y: 24, width: 7.8, height: 2.2, rx: .6, fill: ink })));
    } else if (P === "stockcar") {
      k.push(h("path", { d: "M 1.6 22.4 L 4.4 16.4 L 10.4 16.4 L 13.4 10.4 L 21.4 10.4 L 23.4 16.4 L 30.4 17.6 L 30.4 22.4 Z", fill: ink }));
      k.push(h("path", { d: "M 12.6 15.4 L 14.6 12 L 20.4 12 L 21.6 15.4 Z", fill: c.tint, opacity: .55 }));
      k.push(h("rect", { x: 0.8, y: 15.4, width: 3.4, height: 2.2, rx: 1, fill: ink }));
      k.push(h("circle", { cx: 8.6, cy: 23.4, r: 4, fill: ink }));
      k.push(h("circle", { cx: 23.4, cy: 23.4, r: 4, fill: ink }));
      k.push(h("circle", { cx: 8.6, cy: 23.4, r: 1.6, fill: c.tint, opacity: .6 }));
      k.push(h("circle", { cx: 23.4, cy: 23.4, r: 1.6, fill: c.tint, opacity: .6 }));
      k.push(h("circle", { cx: 17, cy: 19.4, r: 2.4, fill: c.tint, opacity: .5 }));
    } else if (P === "spear") {
      k.push(h("g", { transform: "rotate(32 16 16)" },
        h("path", { d: "M 16 1.4 L 20.4 9.4 L 16 13.4 L 11.6 9.4 Z", fill: ink }),
        h("rect", { x: 14.6, y: 12.4, width: 2.8, height: 17.4, rx: 1.2, fill: ink }),
        h("rect", { x: 12.6, y: 13.4, width: 6.8, height: 2.4, rx: 1.1, fill: ink })));
    } else if (P === "alig") {
      k.push(h("path", { d: "M 3.4 30.6 Q 4.4 21.4 11.4 19 L 20.6 19 Q 27.6 21.4 28.6 30.6 Z", fill: "#ffd400" }));
      k.push(h("path", { d: "M 11.6 19 L 16 25.4 L 12.4 27.4 L 9.4 20.4 Z", fill: "#f5c400" }));
      k.push(h("path", { d: "M 20.4 19 L 16 25.4 L 19.6 27.4 L 22.6 20.4 Z", fill: "#f5c400" }));
      k.push(h("path", { d: "M 13.4 19 L 18.6 19 L 16 24 Z", fill: "#241f2b" }));
      k.push(h("ellipse", { cx: 16, cy: 13.6, rx: 5.6, ry: 6.2, fill: "#241f2b" }));
      k.push(h("path", { d: "M 14.4 18.6 L 17.6 18.6 L 16.8 21.4 L 15.2 21.4 Z", fill: "#0d0b12" }));
      k.push(h("path", { d: "M 9.6 11.4 Q 9.6 4.6 16 4.6 Q 22.4 4.6 22.4 11.4 Z", fill: "#d93a3a" }));
      k.push(h("rect", { x: 9, y: 10.6, width: 14, height: 2.6, rx: 1.2, fill: "#b52f2f" }));
      k.push(h("rect", { x: 8.8, y: 13.6, width: 14.4, height: 4.4, rx: 1.6, fill: "#ffd93b" }));
      k.push(h("rect", { x: 15.2, y: 14.8, width: 1.6, height: 2.2, fill: "#241f2b", opacity: .5 }));
    } else if (P === "crate") {
      k.push(h("rect", { x: 3.6, y: 6.6, width: 24.8, height: 20.8, rx: 1.6, fill: ink }));
      k.push(h("g", { opacity: .62 }, [13.2, 19.8].map((y, i) =>
        h("rect", { key: i, x: 3.6, y: y, width: 24.8, height: 1.8, fill: "#101720" }))));
      k.push(h("rect", { x: 3.6, y: 6.6, width: 24.8, height: 20.8, rx: 1.6, fill: "none", stroke: "#101720", strokeWidth: 2.2 }));
      k.push(h("g", { opacity: .85 }, [[4.6, 7.6], [22.8, 7.6], [4.6, 21.4], [22.8, 21.4]].map((p, i) =>
        h("rect", { key: i, x: p[0], y: p[1], width: 4.6, height: 4.6, rx: .8, fill: "#101720" }))));
      k.push(h("rect", { x: 12.4, y: 14.4, width: 7.2, height: 4.4, rx: .8, fill: "#101720", opacity: .5 }));
    } else if (P === "pencil") {
      k.push(h("g", { transform: "rotate(0 16 16)" },
        h("path", { d: "M 6.4 25.6 L 8.4 19.4 L 22.6 5.2 Q 25.4 2.4 28.2 5.2 Q 31 8 28.2 10.8 L 14 25 Z", fill: ink }),
        h("path", { d: "M 6.4 25.6 L 8.4 19.4 L 11.4 22.4 Z", fill: c.tint, opacity: .6 }),
        h("path", { d: "M 21.4 6.4 L 27 12", fill: "none", stroke: c.tint, strokeWidth: 1.5, opacity: .5 })));
    } else {
      k.push(h("circle", { key: "bun", cx: 16, cy: 5.6, r: 3.6, fill: ink }));
      k.push(h("path", { key: "hair", d: "M 7.4 17.6 Q 7 8.2 16 8.2 Q 25 8.2 24.6 17.6 L 22.4 17.6 Q 22.6 12 16 12 Q 9.4 12 9.6 17.6 Z", fill: ink }));
      k.push(h("ellipse", { key: "hd", cx: 16, cy: 15.4, rx: 5.4, ry: 6.2, fill: ink, opacity: .92 }));
      k.push(h("path", { key: "sh", d: "M 5.6 29 Q 7.2 21.4 16 21.4 Q 24.8 21.4 26.4 29 Z", fill: ink }));
      k.push(h("g", { key: "eye", fill: c.tint },
        h("ellipse", { cx: 13.6, cy: 15.6, rx: .95, ry: 1.15 }),
        h("ellipse", { cx: 18.4, cy: 15.6, rx: .95, ry: 1.15 })));
    }
    // `k` is handed to React as an array, so every entry needs a key. Most of the prop
    // branches above set one, but not all of them do; backfill by position rather than
    // editing twenty art branches, which would risk the path data.
    const art = k.map((node, i) =>
      React.isValidElement(node) && node.key == null
        ? React.cloneElement(node, { key: "k" + i })
        : node,
    );
    const inner = framed
      ? h("g", null,
          h("defs", null, h("radialGradient", { id: id + "-d", cx: "34%", cy: "26%", r: "84%" },
            h("stop", { offset: "0%", stopColor: c.tint, stopOpacity: .5 }),
            h("stop", { offset: "100%", stopColor: "#0f1620", stopOpacity: .95 }))),
          h("circle", { cx: 16, cy: 16, r: 15.4, fill: "url(#" + id + "-d)" }),
          h("g", { transform: "translate(16,16) scale(.68) translate(-16,-16)" }, art),
          h("circle", { cx: 16, cy: 16, r: 15.4, fill: "none", stroke: "rgba(255,255,255,.2)", strokeWidth: .8 }))
      : h("g", null, art);
    return h(
      "svg",
      {
        width: size,
        height: size,
        viewBox: "0 0 32 32",
        className,
        "aria-hidden": title ? undefined : true,
        style: { display: "block", flexShrink: 0 },
      },
      title ? h("title", null, title) : null,
      inner,
    );
}

export interface CharacterAvatarProps extends CharacterPropGlyphProps {
  selected?: boolean;
  /** Background the badge ring is knocked out against. */
  surface?: string;
}
