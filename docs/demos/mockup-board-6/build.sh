#!/bin/sh
# Join the parts into bonsai-board-6.html, the exact file published to the live page.
# The kit (the page head, the panel styles, the dense rows, the D-pad engine, the boot) is the density
# board's, read from ../mockup-board-2/src at build time rather than copied, with three things changed on
# the way: the page title, the browser storage keys, and the four font files' ids (this page's own copies;
# FONT_* below are filled in once the page exists and the fonts have been copied into its storage).
cd "$(dirname "$0")"
K=../mockup-board-2/src
OUT="${1:-bonsai-board-6.html}"
FONT_400=e0a40a654235a6d8aa151d643de5869f
FONT_500=04c95a2acd59bb2b6f89870e1134fd5b
FONT_700=70f4bfd904b685731611c8030d1f8ab9
FONT_900=877a7df1fb7d0678e2ffb08459cd8795
head_part() {
  sed -e 's|<title>bonsAI Density Board</title>|<title>bonsAI Board 6: your open calls, drawn (plan 107)</title>|' \
      -e "s|afed639823dd49976ed4f5a166fa17c6|$FONT_400|" \
      -e "s|8f2b81fa876e9126970869a94fca9e30|$FONT_500|" \
      -e "s|708bfabe607db0959adf22b2c8a03333|$FONT_700|" \
      -e "s|e295656550c2f0dce20809b0cf9ec4a5|$FONT_900|" "$K/10-head.html"
}
keys() { sed -e 's/bonsai-density-board/bonsai-board-6/; s/bonsai-density-tab/bonsai-board-6-tab/; s/bonsai-density-zoom/bonsai-board-6-zoom/' "$1"; }
{
  echo '<!DOCTYPE html>'
  echo '<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
  head_part
  cat "$K/15-kit.css" "$K/16-kit2.css" "$K/17-steam.css" "$K/43-tabs.css"
  for f in src/6*.css; do [ -f "$f" ] && cat "$f"; done
  echo '</head><body>'
  cat src/50-body.html
  echo "<script>"
  cat "$K/20-kit.js" "$K/21-kit2.js"
  keys "$K/30-core.js"
  cat "$K/42-tabs-data.js"
  for f in src/7*.js; do [ -f "$f" ] && cat "$f"; done
  keys "$K/90-boot.js"
  echo "</script></body></html>"
} > "$OUT"
wc -c "$OUT"
