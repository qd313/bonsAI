#!/bin/sh
# Join src/ into readme-board.html, the file published to the live page, with the stand-in
# pictures inlined. The stills come from today's README media (assets/readme) through ffmpeg:
# one frame from each GIF, shrunk to a small JPEG. The built page and stills are not in git.
cd "$(dirname "$0")"
mkdir -p stills
for g in ../../../assets/readme/*.gif; do
  b=$(basename "$g" .gif)
  [ -f "stills/$b.jpg" ] || ffmpeg -v error -y -ss 2 -i "$g" -frames:v 1 -q:v 6 "stills/$b.jpg"
done
[ -f stills/hero.jpg ] || ffmpeg -v error -y -i ../../../assets/readme/hero.png -vf scale=960:-1 -q:v 6 stills/hero.jpg
for p in where-ai-runs attach-menu; do
  [ -f "stills/$p.jpg" ] || ffmpeg -v error -y -i "../../../assets/readme/$p.png" -q:v 6 "stills/$p.jpg"
done
{
  echo "const STILLS = {"
  for j in stills/*.jpg; do
    b=$(basename "$j" .jpg)
    printf '  "%s": "data:image/jpeg;base64,%s",\n' "$b" "$(base64 -w0 "$j")"
  done
  echo "};"
} > src/15-stills.js
{
  cat src/10-head.html
  echo "<script>"
  cat src/15-stills.js src/20-content.js src/30-store.js src/40-github.js src/50-tabs.js src/90-boot.js
  echo "</script>"
} > readme-board.html
wc -c readme-board.html
