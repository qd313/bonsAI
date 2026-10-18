# Plan 96 scope: a question with a screenshot gets no answer

Scoped 2026-10-18 from the code and the Deck's own logs. Nothing was changed on the Deck or in the code.
Severity: two stars. Cause: found, with the log lines to prove it. Fix: small.

## What a player sees

You attach a screenshot, ask a question, wait about 14 to 20 seconds, and the answer box says
"Ollama returned an incomplete stream for model 'gemma4:e2b-it-qat' (no completion marker and no
assistant text)." No answer comes. A question with no picture works fine right afterwards (the
Deck's AI recovers on its own; the 13:34 text questions the same day were answered).

Seen three times on 2026-10-18: the rig twice (about 00:35, a 408 KB screenshot) and the
maintainer by touch at 13:27 (a screenshot of about 256 KB, no game running).

## The finding in plain words

The AI model can see pictures. The picture is the problem, and it is not the size in kilobytes.
The plugin sends a screenshot to the AI untouched whenever the file is under 500 KB. Every
screenshot the Deck takes on this machine right now is 1920 by 1080 pixels, and one of those is
only 250 to 420 KB, so it slips under the 500 KB line and goes out at full pixel size. When the
AI's picture-reading step meets a picture that large, the Deck's graphics chip runs out of memory
and the AI's picture reader crashes. Ollama then closes the connection with no answer, and the
plugin reports that as an "incomplete stream".

This is the same crash plan 64 found on 2026-09-23. Plan 64's fix (shrink the picture with ffmpeg)
is in the code and works, but it is skipped for any file under 500 KB, and the test for that
skip only checked file size, never pixel size.

## Most likely cause, ranked

### 1. The picture is sent at full pixel size, and the graphics chip runs out of memory (very likely, about 95 percent)

The evidence, in order:

- The plugin log (Deck, 13:26:54) shows the request went out with `attachments=1`,
  `payload_bytes=347711`. A 256 KB file, turned into text for sending, is about 340 KB. So the
  file went out as it was, with no shrinking. The rig's request on 00:35 had
  `payload_bytes=569823` for a 408 KB file: again file size times 4/3 plus the prompt, so again
  untouched. If the shrink had run, the picture would be about 50 KB.
- The Ollama log on the Deck (13:27:04 to 13:27:07), in order: `encoding mtmd batch`,
  then `radv/amdgpu: Not enough memory for command submission`, then
  `ggml_vulkan: device lost on Vulkan0`, then `failed to encode mtmd batch`, then the chat call
  answered `200` after 13.5 seconds with no text. About a second later the AI's runner process
  aborted and wrote a crash dump. ("mtmd" is the picture-reading part. "Device lost" is the
  graphics chip dropping out.)
- The Deck's screenshot files: the 256 KB and 408 KB files are 1920x1080 JPEGs (checked with
  `file` and `ffprobe` on the Deck, read-only).
- The picture reader is warmed up for a 768x768 picture (280 MiB of working memory, set aside at
  load time). A 1920x1080 picture is about 2.1 million pixels, below Ollama's own "resize if
  bigger" limit of about 2.6 million, so it is read at full size. The reader's attention step
  grows with the square of the picture's patch count, and flash attention is switched off in this
  runner (log line `flash attention is disabled`). The memory it needs is far above what was
  reserved. This last step is my reasoning, not a number from the log, but it fits all the
  lines above.
- It matches plan 64's own notes: a 3.7 MB picture crashed the same way (`vk::DeviceLostError`,
  "llama-server terminated ... core dumped"), a 177 KB 1280x800 picture went through on
  2026-09-23, and a 413 KB 1920x1080 JPEG went through on 2026-09-18. The crash depends on the
  picture reader's memory at the moment, which is why a file this size sometimes works and
  sometimes does not. At 800 pixels wide the same picture needs a small fraction of the memory.
  I measured the shrink on the Deck: 0.11 seconds for a 1920x1080 file (output discarded, so
  nothing was written).

Why it is not "image too large to send": the payload is only 0.35 to 0.57 MB, far under any
limit. Why it is not "wrong field": the code puts the pictures in the `images` list of the user
message (`ollama_ask_service.py`), the right field, and the Ollama log shows it did find and
start encoding one image chunk (`n_chunks = 1`).

### 2. The model cannot see pictures in this quantised build (ruled out)

- Ollama's own report for `gemma4:e2b-it-qat` on the Deck lists the abilities
  `completion, vision, audio, tools, thinking`, and the model's picture projector is present
  (`clip.has_vision_encoder: True`, projector type `gemma4v`).
- The Ollama log at load says `has vision encoder`, `loaded multimodal model`, and the template
  line shows `vision` among its abilities.
- The plugin's routing also treats it as a vision model: it is first in the vision list and in the
  known vision tags (`ollama_routing.py`, `_VISION_FOSS_ESSENTIALS` and `_VISION_KNOWN_TAGS`).
  Routing uses a name list, not the model's report. If the picked model had no vision, the
  plugin would route to the next vision model, or say no vision model is installed
  (`no_installed_routing_models_message`). That did not happen.

### 3. The plugin cannot read the stream (ruled out)

The stream reader in `ollama_chat_stream.py` expects a line-by-line stream that ends with a line
carrying `done: true`. It sets a "done" flag only on that line. If the stream ends with no done
line and no text, it returns exactly this message (line 418). Here Ollama really did send nothing
(the log shows the call ended with an error inside the runner and a 200 status with an empty
body), so the reader is behaving as designed. It also handles an error line from Ollama
(`stream_err_txt`) and a partial answer ("stream ended before completion"); neither fits.

## What the plugin does when the picture crashes the AI

Nothing helpful. The failure returns with no status and no body, so the "vision attempt failed,
try the next model" branch in `ollama_ask_service.py` (around line 540) never fires. It would not
help here anyway: only one model is installed on the Deck. The player gets a developer-sounding
error, not a plain "the picture was too big for the AI" message.

## Smallest fixes, in order

### Fix A (the real fix): shrink by picture size, not file size. One file, small lane.

In `py_modules/backend/media/screenshot_media.py`, `encode_image_with_ffmpeg()` skips the shrink
when the file is 500,000 bytes or less. Change it so a picture is passed through only when it is
both small in bytes and already within the preset's longest-side limit (800 for Low, 1080 for
Mid). Two easy ways:

1. Drop the byte-size skip entirely and always run ffmpeg. The scale line already never
   enlarges a picture, and it costs about 0.1 second on the Deck. This is a four-line deletion
   and the safest, since it can never pass a big picture through again.
2. Keep a skip, but read the pixel size first (the first bytes of a JPEG or PNG carry it, or ask
   ffprobe) and skip only when it is within the limit.

Size: one source file (about 10 lines changed) and one test file. The existing test
`test_small_picture_is_passed_through_without_calling_ffmpeg` (in `tests/test_screenshot_media.py`)
will have to change: it would need a small picture that is also small in pixels, plus a new test
for "under 500 KB but 1920x1080 is shrunk". One lane, about an hour. The docs that say a small
picture "is sent as it is" (the top of `screenshot_media.py`, `docs/troubleshooting.md`,
`docs/knowledge-base.md`) need one sentence changed.

The Low preset is already the saved setting on the Deck (`screenshot_attachment_preset: low`), so
no setting needs touching. Mid (1080) and Max (16384) would still send 1920x1080 or larger
pictures at close to full size. If the crash happens with Mid or Max, the limit itself needs
lowering for this graphics chip, or the Max choice needs a warning. That is a second, separate
decision for the maintainer, not part of the smallest fix.

### Fix B (a better message when it happens anyway): one file, small lane

When the stream ends with no done line and no text, and the request carried pictures, say
something a person can use ("The picture was too big for the AI to read. Try the Low picture
size, or take a smaller screenshot.") instead of the "incomplete stream" line. The place is the
branch at `ollama_chat_stream.py` line 418, which would need to know whether the request had
images (the caller already knows: `had_images` is worked out in `ollama_service.py`). Size: one
or two source files and a test. A second, separate question is whether to retry once at a
smaller size automatically. That is a larger change (a lane) and not needed if Fix A lands.

### Fix C (not needed now)

Switching on flash attention, or limiting the picture reader's memory, is a setting inside
Ollama's own runner. The plugin does not control it. Leave it.

## The Deck check that would prove Fix A

On the Deck's own screen, with no game running and the Deck's own AI (`gemma4:e2b-it-qat`):

1. Attach the 408 KB 1920x1080 screenshot that failed twice last night
   (`20261018002755_1.jpg`) and ask "What is on this screen?" Pass: an answer that names what is
   on the screenshot, within about 60 seconds.
2. Attach a 250 KB 1920x1080 screenshot (any of the files named `20261018013741_1.jpg` or
   `20261018013735_1.jpg`) and ask the maintainer's question, "tell me about this game in the
   screenshot". Pass: an answer.
3. Read the plugin log. Pass: the `payload_bytes` line for each is far under the file size times
   4/3 (about 70 KB or less, not 340 KB or 570 KB).
4. Read the Ollama log. Pass: no `device lost` or `Not enough memory for command submission`
   lines in the minute after each try.
5. A control: the 177 KB 1280x800 menu screenshot still gets an answer.

Break-it check for the test: put the 500 KB byte-size skip back and show the new "under 500 KB
but 1920x1080" test fails.

## Where (file paths)

- Skip that lets the big picture through: `py_modules/backend/media/screenshot_media.py`
  (`FFMPEG_PASSTHROUGH_BYTES`, `encode_image_with_ffmpeg`, `prepare_image_attachment`);
  presets `FFMPEG_ATTACHMENT_PRESETS`.
- Tests that pin the skip: `tests/test_screenshot_media.py`.
- Where the picture is put into the request: `py_modules/backend/ask/ollama_ask_service.py`
  (`prepare_attachment_images`, `user_message["images"]`); the quality setting is
  `screenshot_attachment_preset` (default `low`).
- The message: `py_modules/backend/ask/ollama_chat_stream.py` line 418.
- Vision routing: `py_modules/backend/ollama/ollama_routing.py`.
- The 2026-09-23 account of the same crash:
  `C:\Users\still\Documents\bonsAI-workshop\test-evidence\plan64-SCREENSHOT-SHRINK-COMPARISON.md`
  and `plan64-SCREENSHOT-CRASH-try2.json`; this round: `plan96-P96-F5-PICKER.json`.

## What I could not see

- The rig's two tries from last night are not in the Ollama log: the Deck restarted at 05:31
  today and that log starts there. The plugin log from the earlier run has no request line for
  them either. For those two tries I rely on the rig's own evidence file (payload 569823 and
  570009 bytes) and the file's size on the Deck.
- The maintainer's exact screenshot is not named anywhere. The 256 KB size matches several
  1920x1080 files taken at 01:37 to 01:38 today; the crash fits any of them.
- The memory sum for the picture reader is my working-out, not a log line. The log does show
  the chip ran out of memory while reading the picture.
