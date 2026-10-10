#!/bin/sh
# Join the parts in src/ into bonsai-mockups.html, the exact file published to the live page.
# The published file has no <!doctype>/<html>/<head>/<body>: the Artifact service wraps it.
cd "$(dirname "$0")"
{
  cat src/10-head.html src/15-kit.css src/16-kit2.css src/48-tabs.css src/49-search.css src/48b-round2.css src/50-body.html
  echo "<script>"
  cat src/20-kit.js src/21-kit2.js src/30-core.js src/41-earlier.js src/41b-earlier-r2.js src/42-models.js src/42b-models-r2.js src/43-finish.js src/44-room.js src/45-maps.js src/46-doctor.js src/47-notes.js src/49-search.js src/90-boot.js
  echo "</script>"
} > bonsai-mockups.html
wc -c bonsai-mockups.html
