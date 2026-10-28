#!/bin/sh
# Join the parts into bonsai-jobs.html, the exact file published to the live page.
# The published file has no <!doctype>/<html>/<head>/<body>: the Artifact service wraps it.
# The kit (the page head, the panel styles, the dense rows, the D-pad engine, the boot) is the density
# board's, and the Search tab and Mods sheet pieces are the mods board's; both are read at build time
# rather than copied, with three things changed on the way: the page title, the browser storage keys,
# and the four font files' ids (this page's own copies).
cd "$(dirname "$0")"
K=../mockup-board-2/src
M=../mockup-board-3/src
head_part() {
  sed -e 's|<title>bonsAI Density Board</title>|<title>bonsAI Jobs Board</title>|' \
      -e 's|afed639823dd49976ed4f5a166fa17c6|a9b32f73cd2d0695b51c57e50c7e5b2a|' \
      -e 's|8f2b81fa876e9126970869a94fca9e30|f522aecf5f6e6b513816865d1dd343a4|' \
      -e 's|708bfabe607db0959adf22b2c8a03333|b29b12d8d774393772ce83d567ada922|' \
      -e 's|e295656550c2f0dce20809b0cf9ec4a5|6fdf7f756bc9db4926e2f6b4e2f93ffb|' "$K/10-head.html"
}
keys() { sed -e 's/bonsai-density-board/bonsai-jobs-board/; s/bonsai-density-tab/bonsai-jobs-tab/; s/bonsai-density-zoom/bonsai-jobs-zoom/' "$1"; }
{
  head_part
  cat "$K/15-kit.css" "$K/16-kit2.css" "$K/17-steam.css" "$K/43-tabs.css" "$M/40-mods.css" src/40-jobs.css src/50-body.html
  echo "<script>"
  cat "$K/20-kit.js" "$K/21-kit2.js"
  keys "$K/30-core.js"
  cat "$M/41-mods.js" src/41-jobs.js
  keys "$K/90-boot.js"
  echo "</script>"
} > bonsai-jobs.html
wc -c bonsai-jobs.html
