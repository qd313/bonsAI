# Screenshot crash: why now, and a size table

## Why this happened tonight, not months ago

The plugin has always sent a screenshot to the AI at full size when the image-shrinking
library (Pillow) is missing. That is not new. The code that does this has been unchanged in
behavior since the screenshot-attach feature was first built, April 13, 2026 (commit
`d10efe4`). It has just been moved between files since then, never rewritten. Pillow itself has
never shipped with the plugin and was never expected to be on the Deck — a docs note from April
2026 already calls it "optional at runtime," and the troubleshooting guide already warns that
without it, big pictures may be sent untouched. The Deck's own log even shows this exact
fallback firing calmly five days before tonight (September 18) with no crash at all.

The AI model did not change either. gemma4:e2b-it-qat was already the model picked for
questions with a picture back on September 5, and after the Deck's models were wiped on
September 16 it was reinstalled as the very same model. So neither the code nor the model is
new here.

What is new is the picture. Every earlier test that hit this fallback used a small picture — a
phone-photo-sized JPEG file well under 600 KB once packaged for sending. Tonight, for the first
time on record, someone attached a picture taken while the Deck was plugged into an external
monitor months ago: a much bigger, uncompressed file, over 2.5 MB, packaged at 3.7 MB for
sending — six times bigger than anything ever sent to the model before. That is what overloaded
the Deck's graphics chip during the picture-reading step and crashed it. A same-resolution
picture that happened to be a smaller JPEG file went through fine that same evening. A search of
how this AI software handles pictures turned up other people hitting the identical crash for the
identical reason: a picture that is too big can crash this kind of AI model outright, even
though the model does some resizing of its own internally — that internal resizing happens too
late to save it. So shrinking the picture before it is sent, on the plugin's side, is still
necessary no matter what.

**In short: proven facts** — the missing-shrinking gap is five months old and unchanged; the
model was not swapped; this exact fallback worked fine five days earlier with a smaller
picture; and this specific oversized file was never sent before tonight. **Likely, not fully
provable** — the crash is specifically about the sheer amount of picture data reaching the
model in one go (matches a known bug pattern in this AI software), rather than something
specific to the picture being a certain file type.

*Footnote: gap introduced in commit `d10efe4` (2026-04-13, "feat: refine local AI flow and
docs"); unchanged in behavior through commit `830f29c` (2026-09-14); crash reproduced twice
2026-09-23 in `docs/test-evidence/plan64-THINKING-05.json` and
`docs/test-evidence/plan64-SCREENSHOT-CRASH-try2.json`; same fallback ran safely 2026-09-18 in
`docs/test-evidence/plan61-ATTACH-DEBUG-01-retry.json`.*

## What is on the Deck already (nothing needed to be installed to test this)

- `ffmpeg` — present.
- `ImageMagick` / `GraphicsMagick` / `vipsthumbnail` — none present.
- Pillow (Python's own picture library) — not present, confirmed on the Deck tonight.
- `gi` / GdkPixbuf (the picture-handling library the Deck's own desktop already uses for icons
  and file previews) — present and importable, no install needed.
- The plugin's own screenshot code has no way to ask for a smaller picture at capture time —
  the commands it tries only take a save location, not a size, so shrinking has to happen
  after the picture is already taken.
- Steam keeps its own tiny preview picture next to every screenshot. One example: a
  200×125 pixel, 9 KB file next to an 82 KB original. Far too small for the AI to read any
  on-screen text from, so it is only good as a picker thumbnail (which is already what it is
  used for), not as a stand-in for the real picture.

## The size table

All six pictures are real Deck screenshots (nothing invented or upscaled). "Size sent" is the
size after the picture is packaged as text for sending, which is about a third bigger than the
plain file size. Deck timings were measured on the Deck itself.

| Method | Picture | Width x height | File size | Size sent | Time on Deck | Needs anything installed? | Text still readable? |
|---|---|---|---|---|---|---|---|
| **1. As sent today (no shrinking)** | Deck screen, menu | 1280x800 | 177 KB | 236 KB | — | — | Yes (this is the original) |
| | Deck screen, in-game | 1280x800 | 90 KB | 120 KB | — | — | Yes |
| | Docked monitor, JPEG (this one worked fine on Sep 18) | 1920x1080 | 413 KB | 550 KB | — | — | Yes |
| | **Docked monitor, PNG (this is the file that crashed the model)** | 1920x1080 | 2.6 MB | 3.6 MB | — | — | Yes, but this is the one too big to send |
| | Docked monitor, PNG (a second one from the same evening) | 1920x1080 | 2.5 MB | 3.5 MB | — | — | Yes |
| | 4K monitor, JPEG | 3840x2160 | 1.3 MB | 1.7 MB | — | — | Yes |
| **2. The plugin's own intended shrink, done with Pillow (today's setting: 800px, medium-high quality)** | Deck screen, menu | 800x500 | 46 KB | 61 KB | 15 ms (desktop PC, for reference) | Yes — Pillow, not on the Deck | Yes, fully readable |
| | Deck screen, in-game | 800x500 | 24 KB | 32 KB | 13 ms (PC) | Yes | Yes |
| | Docked JPEG | 800x450 | 47 KB | 62 KB | 24 ms (PC) | Yes | Yes |
| | **The crash file** | 800x450 | 52 KB | 70 KB | 40 ms (PC) | Yes | Yes, fully readable |
| | Second docked PNG | 800x450 | 53 KB | 71 KB | 37 ms (PC) | Yes | Yes |
| | 4K JPEG | 800x450 | 44 KB | 59 KB | 73 ms (PC) | Yes | Mostly — a small debug readout in one corner becomes too small, everything else stays clear |
| **3c. Hand-written shrink using only what Python already has built in (no picture library at all)** | The crash file (PNG only — this method cannot read JPEG files) | 800x450 | 551 KB | 735 KB | **1.9 s on the Deck** | No | Yes, fully readable |
| **3d. `ffmpeg` (already on the Deck)** | Deck screen, menu | 800x500 | 69 KB | 92 KB | 0.11 s on the Deck | No | Yes |
| | Deck screen, in-game | 800x500 | 27 KB | 36 KB | 0.10 s on the Deck | No | Yes |
| | Docked JPEG | 800x450 | 54 KB | 72 KB | 0.12 s on the Deck | No | Yes |
| | **The crash file** | 800x450 | 86 KB | 114 KB | 0.19 s on the Deck | No | Yes, fully readable |
| | Second docked PNG | 800x450 | 86 KB | 115 KB | 0.20 s on the Deck | No | Yes |
| | 4K JPEG | 800x450 | 47 KB | 63 KB | 0.16 s on the Deck | No | Mostly — same small debug readout gets blurry |
| **3d. GdkPixbuf, the Deck's own desktop picture library (`gi`)** | Deck screen, menu | 800x500 | 46 KB | 61 KB | 0.02 s on the Deck | No | Yes |
| | Deck screen, in-game | 800x500 | 25 KB | 34 KB | 0.02 s on the Deck | No | Yes |
| | Docked JPEG | 800x450 | 47 KB | 63 KB | 0.02 s on the Deck | No | Yes |
| | **The crash file** | 800x450 | 52 KB | 70 KB | 0.06 s on the Deck | No | Yes, fully readable |
| | Second docked PNG | 800x450 | 53 KB | 70 KB | 0.06 s on the Deck | No | Yes |
| | 4K JPEG | 800x450 | 45 KB | 60 KB | 0.09 s on the Deck | No | Mostly — same small debug readout gets blurry |
| **3b. Steam's own tiny preview picture (for comparison only)** | A sample from the Deck | 200x125 | 9 KB | — | — | No | No — far too small to read any on-screen text |

Rows without a Deck time were measured on the desktop PC for reference (Pillow is not on the
Deck, so its own method cannot be timed there).

**About the AI software's own resizing:** a look at how this AI software (Ollama, running the
gemma4 model) handles pictures shows it does shrink pictures internally before answering — but
only after already trying to read the whole picture in first. Other people running the same
software have hit the same kind of crash on an oversized picture, for the same reason. So its
own internal shrinking is not a safety net; the plugin still has to shrink the picture itself
before sending it.

## Recommendation

Use the Deck's own desktop picture library (`gi` / GdkPixbuf) as the stand-in for Pillow when
Pillow is missing. It needed nothing installed, it was the fastest of everything tried (a
fraction of a second even for the crash file, against 1.9 seconds for the hand-written
no-library method), and it matched Pillow's own output size and readability almost exactly.
`ffmpeg` is a solid backup if `gi` is ever unavailable — also nothing to install, still under a
quarter of a second, slightly bigger files but still small and just as readable. Keep a hard
size cutoff as a last-resort backstop only, in case shrinking itself ever fails.

## Where things are saved

- Real screenshots pulled from the Deck (read-only, nothing changed on the Deck):
  `C:\Users\still\AppData\Local\Temp\claude\c--Users-still-Documents-BonsAI\67dc522e-8042-41a0-baf3-e5a7704d0933\scratchpad\shots\originals\`
- Shrunk versions from each method (for eyeballing quality):
  `C:\Users\still\AppData\Local\Temp\claude\c--Users-still-Documents-BonsAI\67dc522e-8042-41a0-baf3-e5a7704d0933\scratchpad\shots\` (files named `out_pillow_*`, `out_ffmpeg_*`, `out_gi_*`, `out_stdlib_*`)
- This table: `C:\Users\still\AppData\Local\Temp\claude\c--Users-still-Documents-BonsAI\67dc522e-8042-41a0-baf3-e5a7704d0933\scratchpad\shots\screenshot-shrink-comparison.md`
- Nothing in the repository was changed, committed, or pushed.
