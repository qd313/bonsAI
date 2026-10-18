/**
 * Title: Tiny pixel-art faces for the AI characters
 *
 * Purpose: Holds a small pixel-art portrait for every AI character preset
 * — the little face shown beside the Ask box and in the character picker
 * when the AI-character feature is on. These are placeholders, not the
 * final art: simple enough to be typed out as text right here in the
 * file, one row of characters per row of pixels, instead of needing a
 * separate image file per character.
 *
 * Used for: The AI-character feature — the small avatar chip next to the
 * question box, and the character picker's own tiles.
 *
 * Solves: Gives every character preset a distinct little face immediately,
 * without waiting on real artwork, by keeping the whole set as compact
 * text data in one file rather than as dozens of separate image files.
 *
 * Does not: Provide finished art. A future version should replace these
 * with proper images or vector art; the character ids used here stay the
 * same either way, so only the drawing code would need to change, not
 * every caller. Does not decide where or how large a portrait is drawn
 * on screen either — that is up to whatever component asks for one.
 *
 * How it works:
 * 1. A fixed set of sixteen colors. Each pixel in a portrait is written
 *    as one character: a single digit or letter picks a color from this
 *    list, and a period means "no color here, see through to whatever
 *    is behind it."
 * 2. Two small helpers glue a stack of text rows into one long string of
 *    pixels, checking the count comes out exactly right for an 8-by-8 or
 *    a 16-by-16 grid — so a typo that drops or adds a pixel in a hand-
 *    drawn row fails loudly instead of quietly warping the picture.
 * 3. The main table: one entry per character, each a simple picture
 *    drawn at 8 pixels by 8, written out as eight rows of eight
 *    characters so it is easy to see the shape while editing it. Most
 *    characters' portraits live here.
 * 4. A pixel-doubling step turns every one of those small 8-by-8
 *    portraits into a 16-by-16 one (each pixel becomes a 2-by-2 block),
 *    so every character can be shown at the same size on screen without
 *    the code that draws them needing to know which size a given
 *    portrait started as.
 * 5. A second, separate table of hand-drawn 16-by-16 portraits for a
 *    handful of characters — the GTA V cast, the Team Fortress 2
 *    characters, and a few others — used instead of the doubled-up
 *    version wherever someone took the time to draw a proper one at the
 *    larger size.
 * 6. The two are combined once, when the plugin starts: every character
 *    gets its small portrait doubled in size, and then any hand-drawn
 *    16-by-16 version from the second table overwrites that for the
 *    characters that have one.
 * 7. The one function anything outside this file actually calls: given a
 *    character's id, hands back its finished portrait, or a generic
 *    placeholder face if the id is not recognized.
 */
export const EMOTICON_PALETTE: readonly string[] = [
  "#5c6470",
  "#e8d5c4",
  "#c45c3e",
  "#2d8f6f",
  "#3d6fb5",
  "#8b5cf0",
  "#c9a227",
  "#5c4033",
  "#1a1a22",
  "#f0e6d8",
  "#7a9e6a",
  "#d4a574",
  "#6b7c8f",
  "#c94b7a",
  "#4ecdc4",
  "#ff9f43",
];

/**
 * In: eight text rows, each meant to be eight characters of pixel data.
 * Out: all eight rows joined into one 64-character string.
 * Can go wrong: throws if the rows do not add up to exactly 64
 * characters — a missing or extra pixel in a hand-typed row is a mistake
 * worth stopping on rather than silently drawing a warped picture.
 */
function g8(...rows: string[]): string {
  const s = rows.join("");
  if (s.length !== 64) {
    throw new Error(`Expected 64 cells, got ${s.length}`);
  }
  return s;
}

/**
 * In: sixteen text rows, each meant to be sixteen characters of pixel
 * data.
 * Out: all sixteen rows joined into one 256-character string.
 * Can go wrong: throws if the rows do not add up to exactly 256
 * characters, for the same reason as g8() above.
 */
function g16(...rows: string[]): string {
  const s = rows.join("");
  if (s.length !== 256) {
    throw new Error(`Expected 256 cells, got ${s.length}`);
  }
  return s;
}

/**
 * In: an 8-by-8 portrait, as one 64-character string.
 * Out: the same picture at 16 by 16, each original pixel turned into a
 * 2-by-2 block of the same color.
 * Can go wrong: throws if the result is not exactly 256 characters,
 * which would only happen if the input itself were the wrong length.
 *
 * Doubling every pixel, rather than smoothing or redrawing, is what
 * lets every preset share one 16-by-16 size regardless of which table
 * its art actually came from.
 */
function expand8To16(grid8: string): string {
  let out = "";
  for (let y = 0; y < 8; y++) {
    const row = grid8.slice(y * 8, y * 8 + 8);
    let row16 = "";
    for (let x = 0; x < 8; x++) {
      const c = row[x] ?? ".";
      row16 += c + c;
    }
    out += row16 + row16;
  }
  if (out.length !== 256) {
    throw new Error(`expand8To16: expected 256 cells, got ${out.length}`);
  }
  return out;
}

const CHARACTER_EMOTICON_PLACEHOLDER_GRIDS: Record<string, string> = {
  __random__: g8(
    "........",
    "..bb....",
    ".b121b..",
    ".b222b..",
    ".b121b..",
    "..bb....",
    "........",
    "........"
  ),
  __custom__: g8(
    "........",
    "...dd...",
    "..d33d..",
    "..d33d..",
    "...33...",
    "...33...",
    "..d..d..",
    "........"
  ),
  cp2077_jackie: g8(
    "..55....",
    ".5555...",
    ".5885...",
    "..888...",
    "..363...",
    ".3663...",
    ".3..3...",
    "........"
  ),
  rdr2_arthur: g8(
    "...55...",
    "..5555..",
    "..5855..",
    "..888...",
    "..252...",
    ".25252..",
    ".5..5...",
    "........"
  ),
  rdr2_dutch: g8(
    "...55...",
    "..5555..",
    "..5855..",
    "..888...",
    "..7a7...",
    ".7aaa7..",
    ".a..a...",
    "........"
  ),
  gta5_michael: g8(
    "...55...",
    "..5555..",
    "..5855..",
    "..888...",
    "..111...",
    ".11111..",
    ".1..1...",
    "........"
  ),
  gta5_trevor: g8(
    "...55...",
    "..5555..",
    "..5855..",
    "..888...",
    "..222...",
    ".22222..",
    ".2..2...",
    "........"
  ),
  gta5_lamar: g8(
    "...55...",
    "..5555..",
    "..5855..",
    "..888...",
    "..444...",
    ".44444..",
    ".4..4...",
    "........"
  ),
  gta5_lester: g8(
    "...55...",
    "..5555..",
    "..5855..",
    "..888...",
    "..666...",
    ".66666..",
    ".6..6...",
    "........"
  ),
  zelda_zelda: g8(
    "...dd...",
    "..dddd..",
    "..d88d..",
    "..888...",
    "..9b9...",
    ".9bbb9..",
    ".b..b...",
    "........"
  ),
  zelda_navi: g8(
    "........",
    "...ee...",
    "..e00e..",
    "..e00e..",
    "...00...",
    "...00...",
    "........",
    "........"
  ),
  mgs_otacon: g8(
    "...55...",
    "..5555..",
    "..5855..",
    "..888...",
    "..ccc...",
    ".ccccc..",
    ".c..c...",
    "........"
  ),
  sc_fuu: g8(
    "...55...",
    "..5555..",
    "..5855..",
    "..888...",
    "..ddd...",
    ".ddddd..",
    ".d..d...",
    "........"
  ),
  bg3_shadowheart: g8(
    "...55...",
    "..5555..",
    "..5855..",
    "..888...",
    "..777...",
    ".77777..",
    ".7..7...",
    "........"
  ),
  bg3_astarion: g8(
    "...55...",
    "..5555..",
    "..5855..",
    "..888...",
    "..aaa...",
    ".aaaaa..",
    ".a..a...",
    "........"
  ),
  bg3_laezel: g8(
    "...55...",
    "..5555..",
    "..5855..",
    "..888...",
    "..bbb...",
    ".bbbbb..",
    ".b..b...",
    "........"
  ),
  tf2_scout: g8(
    "........",
    "..cc....",
    ".cccc...",
    ".c88c...",
    "..33....",
    "..33....",
    ".3..3...",
    "........"
  ),
  tf2_soldier: g8(
    "........",
    "..cc....",
    ".cccc...",
    ".c88c...",
    "..22....",
    "..22....",
    ".2..2...",
    "........"
  ),
  tf2_pyro: g8(
    "........",
    "..ff....",
    ".ffff...",
    ".f88f...",
    "..ff....",
    "..ff....",
    ".f..f...",
    "........"
  ),
  tf2_demoman: g8(
    "........",
    "..cc....",
    ".cccc...",
    ".c88c...",
    "..44....",
    "..44....",
    ".4..4...",
    "........"
  ),
  tf2_heavy: g8(
    "........",
    "..cc....",
    ".cccc...",
    ".c88c...",
    "..11....",
    "..11....",
    ".1..1...",
    "........"
  ),
  tf2_engineer: g8(
    "........",
    "..cc....",
    ".cccc...",
    ".c88c...",
    "..ee....",
    "..ee....",
    ".e..e...",
    "........"
  ),
  tf2_medic: g8(
    "........",
    "..cc....",
    ".cccc...",
    ".c88c...",
    "..dd....",
    "..dd....",
    ".d..d...",
    "........"
  ),
  tf2_sniper: g8(
    "........",
    "..cc....",
    ".cccc...",
    ".c88c...",
    "..99....",
    "..99....",
    ".9..9...",
    "........"
  ),
  tf2_spy: g8(
    "........",
    "..cc....",
    ".cccc...",
    ".c88c...",
    "..77....",
    "..77....",
    ".7..7...",
    "........"
  ),
  tf2_announcer: g8(
    "........",
    "..88....",
    ".8888...",
    ".8888...",
    "..88....",
    "..88....",
    ".8..8...",
    "........"
  ),
  l4d2_ellis: g8(
    "...55...",
    "..5555..",
    "..5855..",
    "..888...",
    "..eee...",
    ".eeeee..",
    ".e..e...",
    "........"
  ),
  hades_zagreus: g8(
    "...55...",
    "..5555..",
    "..5855..",
    "..888...",
    "..c2c...",
    ".c222c..",
    ".2..2...",
    "........"
  ),
  fo4_nick_valentine: g8(
    "...55...",
    "..5555..",
    "..5855..",
    "..888...",
    "..999...",
    ".99999..",
    ".9..9...",
    "........"
  ),
  fo4_piper: g8(
    "...55...",
    "..5555..",
    "..5855..",
    "..888...",
    "..ddd...",
    ".ddddd..",
    ".d..d...",
    "........"
  ),
  fo4_preston: g8(
    "...55...",
    "..5555..",
    "..5855..",
    "..888...",
    "..bbb...",
    ".bbbbb..",
    ".b..b...",
    "........"
  ),
  portal_glados: g8(
    "........",
    "..aa....",
    ".a00a...",
    "a0000a..",
    "a0000a..",
    ".a00a...",
    "..aa....",
    "........"
  ),
  alig_ali_g: g8(
    "...ff...",
    "..ffff..",
    "..f88f..",
    "..888...",
    "..cdc...",
    ".ccccc..",
    ".c..c...",
    "........"
  ),
};

/**
 * Hand-tuned 16×16 art (cel-shaded / graphic-novel style). Merged on top of pixel-doubled 8×8 for each id.
 * GTA V cast + TF2 Announcer + TF2 mercs use bespoke layouts; all other presets use expand8To16(CHARACTER_EMOTICON_PLACEHOLDER_GRIDS[id]).
 */
const EMOTICON_PLACEHOLDER_GRIDS_16_OVERRIDES: Record<string, string> = {
  gta5_michael: g16(
    "................",
    ".....555555.....",
    "....55888855....",
    "...5588888855...",
    "...5888888885...",
    "...5881111885...",
    "...5811111185...",
    "...5819911985...",
    "...5811111185...",
    "..558111111855..",
    "..588444444885..",
    "..584444444485..",
    "..5844..444485..",
    "..55........55..",
    "................",
    "................"
  ),
  gta5_trevor: g16(
    "................",
    ".....555555.....",
    "....55888855....",
    "...5588888855...",
    "...5888888885...",
    "...5881111885...",
    "...5811111185...",
    "...5811dd1185...",
    "...5811111185...",
    "..558111111855..",
    "..588222222885..",
    "..582222222285..",
    "..5822..222285..",
    "..55........55..",
    "................",
    "................"
  ),
  gta5_lamar: g16(
    "................",
    ".....555555.....",
    "....55888855....",
    "...5588888855...",
    "...5888888885...",
    "...5881111885...",
    "...5811111185...",
    "...581eeee185...",
    "...5811111185...",
    "..558111111855..",
    "..588333333885..",
    "..583333333385..",
    "..5833..333385..",
    "..55........55..",
    "................",
    "................"
  ),
  gta5_lester: g16(
    "................",
    ".....555555.....",
    "....55888855....",
    "...5588888855...",
    "...5888888885...",
    "...5881cc1885...",
    "...5811cc1185...",
    "...5811111185...",
    "...5817777185...",
    "..558777777855..",
    "..588777777885..",
    "..587777777785..",
    "..5877..777785..",
    "..55........55..",
    "................",
    "................"
  ),
  tf2_announcer: g16(
    "................",
    ".......aa.......",
    ".....aaffaa.....",
    "....aaffffaa....",
    "...aaffffffaa...",
    "...aaaffffaaa...",
    "......aa........",
    "......aa........",
    ".....6aa6.......",
    "....666666......",
    "...66666666.....",
    "...66cccc66.....",
    "...6c7777c6.....",
    "...6c7777c6.....",
    "....666666......",
    "................"
  ),
  tf2_scout: g16(
    "................",
    ".....cccccc.....",
    "....cc8888cc....",
    "...cc888888cc...",
    "..cc88888888cc..",
    "..cc88333388cc..",
    "..cc88333388cc..",
    "..cc88333388cc..",
    "..cc88333388cc..",
    "..cc33333333cc..",
    "..cc33....33cc..",
    "...cc......cc...",
    "................",
    "................",
    "................",
    "................"
  ),
  tf2_soldier: g16(
    "................",
    ".....cccccc.....",
    "....cc8888cc....",
    "...cccc8888cc...",
    "..cc88888888cc..",
    "..cc88222288cc..",
    "..cc88222288cc..",
    "..cc88222288cc..",
    "..cc88222288cc..",
    "..cc22222222cc..",
    "..cc22....22cc..",
    "...cc......cc...",
    "................",
    "................",
    "................",
    "................"
  ),
  tf2_pyro: g16(
    "................",
    "....ffffffff....",
    "...ff888888ff...",
    "..ff88888888ff..",
    "..ff88ffff88ff..",
    "..ff88ffff88ff..",
    "..ff88888888ff..",
    "..ff88ffff88ff..",
    "..ff88ffff88ff..",
    "..ffffffffff....",
    "..ff........ff..",
    "...ff......ff...",
    "................",
    "................",
    "................",
    "................"
  ),
  tf2_demoman: g16(
    "................",
    ".....cccccc.....",
    "....cc8888cc....",
    "...cc888888cc...",
    "..cc88888888cc..",
    "..cc88444488cc..",
    "..cc88488488cc..",
    "..cc88444488cc..",
    "..cc88444488cc..",
    "..cc44444444cc..",
    "..cc44....44cc..",
    "...cc......cc...",
    "................",
    "................",
    "................",
    "................"
  ),
  tf2_heavy: g16(
    "................",
    ".....cccccc.....",
    "....cc8888cc....",
    "...cc888888cc...",
    "..cc88888888cc..",
    "..cc88111188cc..",
    "..cc88111188cc..",
    "..cc88111188cc..",
    "..cc88111188cc..",
    "..cc11111111cc..",
    "..cc11....11cc..",
    "...cc......cc...",
    "................",
    "................",
    "................",
    "................"
  ),
  tf2_engineer: g16(
    "................",
    ".....eeeeee.....",
    "....ee8888ee....",
    "...ee888888ee...",
    "..ee88888888ee..",
    "..ee88eeee88ee..",
    "..ee88eeee88ee..",
    "..ee88888888ee..",
    "..ee88eeee88ee..",
    "..eeeeeeeeee....",
    "..ee........ee..",
    "...ee......ee...",
    "................",
    "................",
    "................",
    "................"
  ),
  tf2_medic: g16(
    "................",
    ".....dddddd.....",
    "....dd8888dd....",
    "...dd888888dd...",
    "..dd88888888dd..",
    "..dd88dddd88dd..",
    "..dd88d88d88dd..",
    "..dd88888888dd..",
    "..dd88dddd88dd..",
    "..dddddddddd....",
    "..dd........dd..",
    "...dd......dd...",
    "................",
    "................",
    "................",
    "................"
  ),
  tf2_sniper: g16(
    "................",
    ".....999999.....",
    "....99888899....",
    "...9998888999...",
    "..99988888999...",
    "..998899998899..",
    "..998899998899..",
    "..998888888899..",
    "..998899998899..",
    "..9999999999....",
    "..99........99..",
    "...99......99...",
    "................",
    "................",
    "................",
    "................"
  ),
  tf2_spy: g16(
    "................",
    ".....777777.....",
    "....77888877....",
    "...7778888877...",
    "..777888888877..",
    "..778877778877..",
    "..778888888877..",
    "..778877778877..",
    "..778888888877..",
    "..7777777777....",
    "..77..ff..77....",
    "...77......77...",
    "................",
    "................",
    "................",
    "................"
  ),
  __random__: g16(
    "................",
    "................",
    "....bbbbbbbb....",
    "...b12121212b...",
    "..b212121212b...",
    "..b121212121b...",
    "..b212121212b...",
    "...b12121212b...",
    "....bbbbbbbb....",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................"
  ),
  __custom__: g16(
    "................",
    "................",
    "....dddddddd....",
    "...d33333333d...",
    "...d33333333d...",
    "...d33....33d...",
    "...d33....33d...",
    "...d33333333d...",
    "...d33333333d...",
    "....d......d....",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................"
  ),
  portal_glados: g16(
    "................",
    "................",
    "................",
    ".....aa0000aa...",
    "....aa000000aa..",
    "...aa00000000aa.",
    "..aa0000000000aa",
    "..aa0000000000aa",
    "...aa00000000aa.",
    "....aa000000aa..",
    ".....aa0000aa...",
    "......aaaa......",
    "................",
    "................",
    "................",
    "................"
  ),
  cp2077_jackie: g16(
    "................",
    ".....555555.....",
    "....55888855....",
    "...5588888855...",
    "...5888888885...",
    "...5883333885...",
    "...5833333385...",
    "...5836666385...",
    "...5833333385...",
    "..558333333855..",
    "..588333333885..",
    "..5833..333385..",
    "..55........55..",
    "................",
    "................",
    "................"
  ),
  rdr2_arthur: g16(
    "................",
    ".....777777.....",
    "....77888877....",
    "...7788888877...",
    "...7888888887...",
    "...7882222887...",
    "...7822222287...",
    "...7825252527...",
    "...7822222287...",
    "..778222222877..",
    "..788525252887..",
    "..7877..777787..",
    "..77........77..",
    "................",
    "................",
    "................"
  ),
  rdr2_dutch: g16(
    "................",
    ".....aaaaaa.....",
    "....aa8888aa....",
    "...aa888888aa...",
    "...a88888888a...",
    "...a88111118a...",
    "...a81111111a...",
    "...a811aa111a...",
    "...a81111111a...",
    "..aa81111111aa..",
    "..aa77777777aa..",
    "..a7aa....aa7a..",
    "..aa........aa..",
    "................",
    "................",
    "................"
  ),
  zelda_zelda: g16(
    "................",
    ".....dddddd.....",
    "....dd8888dd....",
    "...dd888888dd...",
    "...d88888888d...",
    "...d889bb988d...",
    "...d89bbbb98d...",
    "...d89bbbb98d...",
    "...d889bb988d...",
    "..dd9bbbbbb9dd..",
    "..ddbbbbbbbbdd..",
    "..dbb......bbd..",
    "..dd........dd..",
    "................",
    "................",
    "................"
  ),
  zelda_navi: g16(
    "................",
    ".......ee.......",
    "......eeee......",
    ".....ee00ee.....",
    "....ee0000ee....",
    "....e000000e....",
    "....e000000e....",
    "....ee0000ee....",
    ".....eeeeee.....",
    "......eeee......",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................"
  ),
  mgs_otacon: g16(
    "................",
    ".....555555.....",
    "....55888855....",
    "...5588888855...",
    "...5888888885...",
    "...588cccc885...",
    "...58cccccc85...",
    "...58cccccc85...",
    "...58cccccc85...",
    "..558cccccc855..",
    "..588cccccc885..",
    "..58cc..cc885...",
    "..55........55..",
    "................",
    "................",
    "................"
  ),
  sc_fuu: g16(
    "................",
    ".....555555.....",
    "....55888855....",
    "...5588888855...",
    "...5888888885...",
    "...588dddd885...",
    "...58dddddd85...",
    "...58dddddd85...",
    "...58dddddd85...",
    "..558dddddd855..",
    "..588dddddd885..",
    "..58dd..dd885...",
    "..55........55..",
    "................",
    "................",
    "................"
  ),
  bg3_shadowheart: g16(
    "................",
    ".....555555.....",
    "....55888855....",
    "...5588888855...",
    "...5888888885...",
    "...5887777885...",
    "...5877777785...",
    "...5877777785...",
    "...5877777785...",
    "..558777777855..",
    "..588777777885..",
    "..5877..777785..",
    "..55........55..",
    "................",
    "................",
    "................"
  ),
  bg3_astarion: g16(
    "................",
    ".....555555.....",
    "....55888855....",
    "...5588888855...",
    "...5888888885...",
    "...588aaaa885...",
    "...58aaaaaaaa5..",
    "...58aaaaaaaa5..",
    "...58aaaaaaaa5..",
    "..558aaaaaaaa55.",
    "..588aaaaaaaa85.",
    "..58aa....aa85..",
    "..55........55..",
    "................",
    "................",
    "................"
  ),
  bg3_laezel: g16(
    "................",
    ".....555555.....",
    "....55888855....",
    "...5588888855...",
    "...5888888885...",
    "...588bbbb885...",
    "...58bbbbbb85...",
    "...58bbbbbb85...",
    "...58bbbbbb85...",
    "..558bbbbbb855..",
    "..588bbbbbb885..",
    "..58bb..bb885...",
    "..55........55..",
    "................",
    "................",
    "................"
  ),
  l4d2_ellis: g16(
    "................",
    ".....555555.....",
    "....55888855....",
    "...5588888855...",
    "...5888888885...",
    "...588eeee885...",
    "...58eeeeee85...",
    "...58eeeeee85...",
    "...58eeeeee85...",
    "..558eeeeee855..",
    "..588eeeeee885..",
    "..58ee..ee885...",
    "..55........55..",
    "................",
    "................",
    "................"
  ),
  hades_zagreus: g16(
    "................",
    ".....555555.....",
    "....55888855....",
    "...5588888855...",
    "...5888888885...",
    "...588c222c85...",
    "...58c22222c5...",
    "...58c22222c5...",
    "...58c22222c5...",
    "..558c22222c55..",
    "..588222222885..",
    "..5822..222285..",
    "..55........55..",
    "................",
    "................",
    "................"
  ),
  fo4_nick_valentine: g16(
    "................",
    ".....555555.....",
    "....55888855....",
    "...5588888855...",
    "...5888888885...",
    "...5889999885...",
    "...5899999985...",
    "...5899999985...",
    "...5899999985...",
    "..558999999855..",
    "..588999999885..",
    "..5899..999985..",
    "..55........55..",
    "................",
    "................",
    "................"
  ),
  fo4_piper: g16(
    "................",
    ".....555555.....",
    "....55888855....",
    "...5588888855...",
    "...5888888885...",
    "...588dddd885...",
    "...58dddddd85...",
    "...58dddddd85...",
    "...58dddddd85...",
    "..558dddddd855..",
    "..588dddddd885..",
    "..58dd..dd885...",
    "..55........55..",
    "................",
    "................",
    "................"
  ),
  fo4_preston: g16(
    "................",
    ".....555555.....",
    "....55888855....",
    "...5588888855...",
    "...5888888885...",
    "...588bbbb885...",
    "...58bbbbbb85...",
    "...58bbbbbb85...",
    "...58bbbbbb85...",
    "..558bbbbbb855..",
    "..588bbbbbb885..",
    "..58bb..bb885...",
    "..55........55..",
    "................",
    "................",
    "................"
  ),
  alig_ali_g: g16(
    "................",
    ".....ffffff.....",
    "....ff8888ff....",
    "...ff888888ff...",
    "...f88888888f...",
    "...f88cdc88f....",
    "...f8cccccc8f...",
    "...f8cccccc8f...",
    "...f88cdc88f....",
    "..ffccccccff....",
    "..ffccccccff....",
    "..fc......cf....",
    "................",
    "................",
    "................",
    "................"
  ),
};

/**
 * In: nothing — reads the two tables defined above it in this file.
 * Out: one finished 16-by-16 portrait per character id: every small
 * portrait doubled in size, then overwritten by the matching hand-drawn
 * one wherever the second table has one.
 * Can go wrong: nothing beyond what expand8To16() itself can raise. Runs
 * once, when the plugin starts, rather than every time a portrait is
 * looked up — the result is kept in the constant defined right after it.
 */
function buildEmoticonGrids16(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [id, grid8] of Object.entries(CHARACTER_EMOTICON_PLACEHOLDER_GRIDS)) {
    out[id] = expand8To16(grid8);
  }
  Object.assign(out, EMOTICON_PLACEHOLDER_GRIDS_16_OVERRIDES);
  return out;
}

const EMOTICON_PLACEHOLDER_GRIDS_16: Record<string, string> = buildEmoticonGrids16();

export type CharacterEmoticonGrid = {
  grid: string;
  cellsPerSide: 8 | 16;
};

/**
 * In: a character preset id.
 * Out: that character's finished 16-by-16 portrait, or the generic
 * "custom character" placeholder face if the id is not recognized.
 * Can go wrong: nothing — an unrecognized id never produces a missing or
 * broken picture, only the fallback one.
 */
export function resolvePlaceholderCharacterEmoticonGrid(presetId: string): CharacterEmoticonGrid {
  const grid = EMOTICON_PLACEHOLDER_GRIDS_16[presetId] ?? EMOTICON_PLACEHOLDER_GRIDS_16.__custom__;
  return { grid, cellsPerSide: 16 };
}
