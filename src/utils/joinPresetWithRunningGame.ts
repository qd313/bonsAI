/**
 * Fills a preset that ends in "this game" with the running title.
 * For other presets, appends the game with an em dash (avoids a second "for"
 * when the line already says e.g. "for 60fps").
 */
export function joinPresetWithRunningGame(presetText: string, gameName: string): string {
  const g = gameName.trim();
  if (!g) {
    return presetText;
  }
  const t = presetText.trim();
  let out: string;
  if (/\bthis game\?$/i.test(t)) {
    out = t.replace(/\bthis game\?$/i, `${g}?`);
  } else if (/\bthis game$/i.test(t)) {
    out = t.replace(/\bthis game$/i, g);
  } else {
    out = `${t} \u2014 ${g}`;
  }
  return out;
}
