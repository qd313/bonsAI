#!/bin/sh
# Join the parts into bonsai-mods.html, the exact file published to the live page.
# The published file has no <!doctype>/<html>/<head>/<body>: the Artifact service wraps it.
# The kit (the page head, the panel styles, the dense rows, the D-pad engine, the boot) is the density
# board's, read from ../mockup-board-2/src at build time rather than copied, with three things changed on
# the way: the page title, the browser storage keys, and the four font files' ids (this page's own copies).
cd "$(dirname "$0")"
K=../mockup-board-2/src
head_part() {
  sed -e 's|<title>bonsAI Density Board</title>|<title>bonsAI Mods Board</title>|' \
      -e 's|afed639823dd49976ed4f5a166fa17c6|3eec5c105dcfaa9ea959805f810533a1|' \
      -e 's|8f2b81fa876e9126970869a94fca9e30|a9ec00246e2682791db5b71ab733330a|' \
      -e 's|708bfabe607db0959adf22b2c8a03333|146f5e52a15bf2c58f4ca065a70c5f82|' \
      -e 's|e295656550c2f0dce20809b0cf9ec4a5|26b6a220bf8423aecb3dd39cf0e3dfc6|' "$K/10-head.html"
}
keys() { sed -e 's/bonsai-density-board/bonsai-mods-board/; s/bonsai-density-tab/bonsai-mods-tab/; s/bonsai-density-zoom/bonsai-mods-zoom/' "$1"; }
{
  head_part
  cat "$K/15-kit.css" "$K/16-kit2.css" "$K/17-steam.css" "$K/43-tabs.css" src/40-mods.css src/50-body.html
  echo "<script>"
  cat "$K/20-kit.js" "$K/21-kit2.js"
  keys "$K/30-core.js"
  cat src/41-mods.js
  keys "$K/90-boot.js"
  echo "</script>"
} > bonsai-mods.html
wc -c bonsai-mods.html
