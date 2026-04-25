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
  // #region agent log
  const joinKind = /\bthis game\?$/i.test(t)
    ? "swapThisGameQ"
    : /\bthis game$/i.test(t)
      ? "swapThisGame"
      : "emDashTitle";
  void fetch("http://127.0.0.1:7682/ingest/455d5c32-fa64-45d1-b31c-f17b50f3371a", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "96660f" },
    body: JSON.stringify({
      sessionId: "96660f",
      runId: "join-preset",
      hypothesisId: "H1",
      location: "joinPresetWithRunningGame",
      message: "preset_with_game",
      data: { joinKind },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  return out;
}
