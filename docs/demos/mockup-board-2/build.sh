#!/bin/sh
# Join the parts in src/ into bonsai-density.html, the exact file published to the live page.
# The published file has no <!doctype>/<html>/<head>/<body>: the Artifact service wraps it.
# 10- to 30- and 90- are copies of the first mock-up board's kit and core (docs/demos/mockup-board).
cd "$(dirname "$0")"
{
  cat src/10-head.html src/15-kit.css src/16-kit2.css src/17-steam.css src/40-board.css src/43-tabs.css src/50-body.html
  echo "<script>"
  cat src/20-kit.js src/21-kit2.js src/30-core.js src/41-chips.js src/42-tabs-data.js src/44-tabs.js src/90-boot.js
  echo "</script>"
} > bonsai-density.html
wc -c bonsai-density.html
