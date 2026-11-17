#!/bin/sh
# Join the second mock-up board's kit with this page's own parts into headline-first.html,
# the file published as a private page. The built file is not stored in git (see .gitignore).
cd "$(dirname "$0")"
KIT=../mockup-board-2/src
{
  echo '<!DOCTYPE html>'
  echo '<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
  # the title, and this page's own copies of Steam's four font files (copied from the density
  # board's private storage into this page's; ids from the copy of 2026-11-14)
  sed -e 's|<title>.*</title>|<title>bonsAI: Headline first, today and with it</title>|' \
      -e 's|afed639823dd49976ed4f5a166fa17c6|0749c0b3119d3038519f2c2f6d3bcb9c|' \
      -e 's|8f2b81fa876e9126970869a94fca9e30|95a5cf97dacb4460a96f6667c75ba974|' \
      -e 's|708bfabe607db0959adf22b2c8a03333|bd41330012194115066c2436a8b29fe3|' \
      -e 's|e295656550c2f0dce20809b0cf9ec4a5|b7888c0a93da97c8915807e1c019d6ce|' "$KIT/10-head.html"
  cat "$KIT/15-kit.css" "$KIT/16-kit2.css" "$KIT/17-steam.css" "$KIT/40-board.css"
  echo '</head><body>'
  cat src/page.html
  echo '<script>'
  # the kit's element builder (the first lines of its core file), then the kit, then this page
  sed -n '/^function h(tag/,/^}/p' "$KIT/30-core.js"
  cat "$KIT/20-kit.js" "$KIT/21-kit2.js" src/page.js
  echo '</script></body></html>'
} > headline-first.html
wc -c headline-first.html
