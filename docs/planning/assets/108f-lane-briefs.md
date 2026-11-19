# Plan 108f: the briefs, one per helper (SteamOS Share path)

How a brief is assembled: the session hands each helper `108-helper-rules.md`, the section below with its letter, the
tip hash, the absolute path of its own copy of the repo, and the plan id (108f). A section says what a player sees
today, where it comes from, what to build, the files owned, the tests, and the check that proves it. Evidence files
are named `plan108f-<ROW>.json` by the driver, never by a helper.

**Line numbers are as read at tip `28306e896` on 2026-11-19 by one reader, not yet spot-checked by a second; the
session re-checks every section against the tip at go.** A lane that finds a line has moved re-greps and says so; a
lane that finds its brief wrong says so and stops rather than building the brief's mistake.

The plan: [108f-steamos-share-path.md](../108f-steamos-share-path.md). Model and effort per lane are in its § 5.

## Rules special to this plan

1. **Nothing is ever attached without a press**, with one exception the maintainer may grant (call f3): the picture
   made by bonsAI's own "Close menu & take screenshot". No other code path sets the attachment by itself.
2. **Permission off means no work at all.** With `media_library_access` off, or the Kids lock on (the screen side's
   `gatedCapabilities`, `src/index.tsx:410`, `:851`; the back end's `capability_enabled`,
   `py_modules/backend/core/capabilities.py:135-141`), no listing call is made, nothing is offered, no dot is drawn.
   Each lane proves both directions with a test.
3. **A path that becomes an attachment always comes from the back end's own listing** (`list_recent_screenshots`)
   or from `take_steam_screenshot`'s own answer. Never build a path on the screen side, and never take one from
   Steam's client.
4. **No new back-end method, no new setting, no new permission, no new thing passed from the main screen to a tab.**
   The count of things passed to tabs may only shrink (`scripts/ratchet.json:65-72`, best 215). The offer travels
   through a small store, the way `src/features/answer/details/detailsSlotStore.ts` and
   `src/features/preset-carousel/injectChipNav.ts` do.
5. **`MainTabUnifiedAskBar.tsx` may grow only a few lines** (limit 1131 code lines, `scripts/growth_limits.json:11-15`;
   1023 lines in the file today). New code goes in new small files.
6. **The Steam user's folder number never goes into a file, a log line or a report.** Write `<user>`.

## Facts every section leans on

**The path today, in presses** (ring on the question box, panel open on Main):

1. Left: the paperclip (`MainTabUnifiedAskBar.tsx:569-661`; "Left: paperclip", `docs/focus-graph.md:489-492`).
2. A: the attach menu opens and the ring lands on its first live line (`MainTabAttachMenuPopover.tsx:108-113`). The
   two lines are "Close menu & take screenshot" and "Attach recent screenshot" (`:48-51`).
3. Down, then A on "Attach recent screenshot" (`useAskBarMenuToggles.ts:77-83`): the picker opens under the ask bar
   (`MainTab.tsx:421-438`; its box is at least 320 px tall, `MainTabScreenshotBrowser.tsx:198`) and asks the back end
   for 24 pictures (`useScreenshotBrowser.ts:130-153`, `:205-214`).
4. A wait while the list loads; the ring is then handed to the newest picture
   (`MainTabScreenshotBrowser.tsx:144-158`, plan 96 F5, row P96-F5-PICKER at `docs/testing.md:320`).
5. A: the picture is attached, the picker closes, a notice says "Screenshot attached"
   (`useScreenshotBrowser.ts:221-237`), the ring goes to the question box (`MainTabScreenshotBrowser.tsx:273-277`),
   and the attached row shows under the box (`MainTabUnifiedAskBar.tsx:903-1020`).

Five presses and a wait. bonsAI's own capture adds: Left, A, A on "Close menu & take screenshot"
(`useScreenshotBrowser.ts:155-203`: the call starts, `Navigation.CloseSideMenus()` at `:173`, the back end waits one
second and captures, `screenshot_media.py:418-464`), a notice "Screenshot saved / Find it under Attach → Attach recent
screenshot." (`useScreenshotBrowser.ts:186-190`), then the menu is reopened by hand and the same five presses follow.
The back end's own comment says the capture is "not auto-attached to Ask" (`main.py:1420-1422`,
`media_desktop_rpc.py:238-239`).

**The back end.** `list_recent_screenshots(app_id, limit)` (`main.py:1240-1242`,
`py_modules/backend/media/media_desktop_rpc.py:48-83`) refuses with the permission off (`:52-57`), then lists Steam's
folders and the plugin's own captures, newest first (`screenshot_media.py:125-183`, `:186-197`, `:467-519`), and
builds a preview for every item (`media_desktop_rpc.py:77`). With `app_id` empty and `limit` 1 it returns the single
newest picture of any game. The preview builder (`screenshot_media.py:582-619`) uses Pillow when present; Pillow is
not on the Deck (the file's own header, `:64`), so there it sends the **whole file** as text, up to 8 MB each
(`:609-617`). `take_steam_screenshot` answers with the new item, its `mtime` included (`screenshot_media.py:647-658`),
and is allowed with either `media_library_access` or `filesystem_write` (`media_desktop_rpc.py:244-254`); attaching
at Ask time needs `media_library_access` (`py_modules/backend/ask/ask_payload.py:79-94`).

**The screen.** An item is `ScreenshotItem` (`src/types/bonsaiUi.ts:41-50`; `mtime` is seconds, see
`src/features/media/mediaFormat.ts:28-35`); an attachment is `AskAttachment` (`:32-39`). The panel's tree is thrown
away when the Quick Access Menu closes and built again when it opens (`bonsaiReplySurface.ts:34-42`), so "the ask bar
mounted" is "the panel just opened on Main"; a popup closing remounts it too (`bonsaiSessionSurvival.ts:1-20`).
Module-level state survives both. The test stand-in answers `list_recent_screenshots` with an empty list
(`src/test-harness/fakeDeckyRpc.ts:155`).

**The row above the question box.** `MainTabPresetRow.tsx`: the help chip owns the row until dismissed (`:207-231`,
its container `HelpChipRoot` `:49-70`); otherwise the slot with the suggestion chips (`:232-246`); under them, nearest
the box, the AI's own suggestion chip when there is one (`:248-266`, its container `InjectChipRoot` `:72-98`, its
handle in `injectChipNav.ts`). Up from the question box tries, in order: a refusal's button, the AI's own chip, the
help chip, the slot's Show details line, the chips (`useMainTabAskBarFocus.ts:169-196`). The chips' Down goes to the
AI's own chip when it shows, else the box (`MainTabPresetRow.tsx:165-173`). A chip is 26 px tall with a 6 px gap
(`presetRowLayout.ts:37-40`).

**The Deck, read over SSH on 2026-11-19 (reading only):** SteamOS 3.9.5, build 20261023.100; Steam client on the
stable channel. Screenshots sit in `~/.local/share/Steam/userdata/<user>/760/remote/<app>/screenshots/`, named
`YYYYMMDDHHMMSS_1.jpg`, 85 to 195 KB each at 1280 by 800; eight game folders; folder `7` holds pictures of Steam's own
screens; the newest file was dated 2026-10-23. Beside each picture Steam keeps a small copy in
`…/screenshots/thumbnails/<same name>`, 3 to 9 KB. `760/screenshots.vdf` lists every picture (filename, thumbnail,
width, height, gameid, creation). Steam's "save an uncompressed copy" setting is on and names
`~/Pictures/screenshots`, a folder that does not exist. Saved clips sit in
`userdata/<user>/gamerecordings/clips/clip_<game>_<date>_<time>/` with `thumbnail.jpg`, `clip.pb`, a timeline file
and `video/…/session.mpd` plus `.m4s` pieces; `gamerecordings/video` was empty. The plugin's own `captures` folder
was empty or absent.

**Outside facts (not yet confirmed here unless said):**

- Steam's Share menu on the Deck offers: send to another device, send to phone, make a QR link, share to a Steam
  chat; for clips also "export video file". No entry for another program. Sources:
  <https://en.linuxadictos.com/screenshots-on-the-steam-deck-how-they-work-and-how-to-share-them.html>,
  <https://beebom.com/how-take-screenshot-steam-deck/>,
  <https://steamdeckhq.com/tips-and-guides/how-to-use-game-recording-on-the-steam-deck-all-features-explained/>,
  <https://help.steampowered.com/faqs/view/23B7-49AD-4A28-9590>. Not yet confirmed here; step 0 looks once.
- Steam's client has, by the type notes shipped with the Decky library (`@decky/ui` 4.11.3, community-written):
  `SteamClient.GameSessions.RegisterForScreenshotNotification(callback)` whose notice carries `unAppID`,
  `hScreenshot`, `strOperation` ("written" or "deleted") and `details`
  (`node_modules/@decky/ui/dist/globals/steam-client/GameSessions.d.ts:7`, `:21-25`), and
  `SteamClient.Screenshots.GetLastScreenshotTaken()` and `GetLocalScreenshotPath(appId, hHandle)`
  (`Screenshots.d.ts:9`, `:12`, `:19-32`). No public documentation was found. Not yet confirmed here; step 0 records
  it; **no lane in this plan uses it**.
- A game's own side of screenshots (a different door, for games, not plugins):
  <https://partner.steamgames.com/doc/features/screenshots>.
- Plugins can add a line to Steam's own menus only by patching Steam's screens (one artwork plugin is known for this:
  <https://github.com/SteamGridDB/decky-steamgriddb>; from memory, its source was not read). Not yet confirmed here,
  and not planned (plan § 8).
- **The rig cannot take a Steam screenshot.** Its Steam + R1 chord saved no picture in two tries on 2026-09-26
  (`docs/mcp-setup.md:102`) and in two more on 2026-11-03 (`docs/roadmap-kb-details.md:724`). Use
  `scripts/deck_place_picture.py` (places a picture in one game's Steam screenshot folder and removes exactly what it
  placed; allowed by D140 call 6, `docs/audit/maintainer-decisions-locked.md:2525-2528`). A file copied in gets the
  copy's time as its file time, so a placed picture counts as "just taken".

---

## S0 — Step 0: the test to find out, on the Deck (the Deck driver, Sonnet medium; one press by the maintainer)

Nothing is installed, deployed or reloaded. The build on the Deck may be any recent one. Read which screen is live
first. Unload the Deck's AI before the part with a game. Never print a settings value. The lines to pass are in the
plan's § 5; they were written before any of this was run.

**S0-1, how long "find the newest screenshot" takes (row P108F-S0-NEWEST).** Write this file with the Write tool in
your own scratch folder as `newest_probe.py`, then run `ssh deck@192.168.86.52 'python3 -' < newest_probe.py` once
with no game running and once with a game running (launch one from the Recent Games row):

```python
import glob, json, os, time
home = os.path.expanduser("~")
roots = [os.path.join(home, ".local", "share", "Steam", "userdata"), os.path.join(home, ".steam", "steam", "userdata")]
ends = ("*.png", "*.jpg", "*.jpeg", "*.webp")
pats = [os.path.join(r, "*", "760", "remote", "*", "screenshots", e) for r in roots for e in ends]
runs, files = [], []
for _ in range(5):
    t = time.perf_counter()
    files = [p for pat in pats for p in glob.glob(pat)]
    files = [p for p in set(files) if os.path.isfile(p)]
    files.sort(key=os.path.getmtime, reverse=True)
    runs.append(round((time.perf_counter() - t) * 1000, 1))
newest = files[0] if files else ""
print(json.dumps({"files": len(files), "ms": runs, "newest_name": os.path.basename(newest),
                  "newest_age_s": round(time.time() - os.path.getmtime(newest), 1) if newest else None}))
```

It mirrors the back end's own search (`screenshot_media.py:125-183`) and changes nothing. The file count may be
double the real one, because both of Steam's paths are searched, as the back end does. Record: the file count, the
five times, the middle one, for both runs. **Line: the middle time with a game running is 300 ms or less.**

**S0-2, how long the picker takes to show a picture (row P108F-S0-PICKER).** `media_library_access` must be on (read
the key's value as true or false only). Open the panel on Main. Press Left, A, Down. Note the time, press A, then poll
the Quick Access page every 100 ms (`deck_waitFor`) with

```js
(() => { const name = /^(\d{14}_\d+|\d{8}-\d{6}|bonsai-)/;
         const t = [...document.querySelectorAll('img')].filter(i => name.test(i.alt || ''));
         return t.length ? { tiles: t.length, chars: t.reduce((n, i) => n + (i.src || '').length, 0) } : null; })()
```

Record the time to the first answer, the number of tiles and the total characters of their pictures. B closes the
picker. Three tries. **Line: a middle time of 1.0 s or more means lane B is built; under 1.0 s, lane B is dropped.**

**S0-3, the sizes the screen lane needs (row P108F-S0-ROOM).** On the live screen (and on the other one if the Deck
can be docked this session), with the panel open on Main and a suggestion chip showing, read the rectangles of
`.bonsai-preset-row-host`, the question box's card, the answer area above the dock, and `window.innerHeight`. Then
open the paperclip's menu and read `.bonsai-attach-menu-surface` and each `.bonsai-attach-menu-item`. Record all of
them. No line to pass: lane C builds from these numbers. One derived number matters if the maintainer picks the menu
option: the room between the menu's bottom edge and the bottom of the visible panel (a third line needs about 36 px).

**S0-4, what Steam's client offers and sends (row P108F-S0-NOTIFY; recorded only).** `deck_readPage` with
`target: "SharedJSContext"`. This step sets two temporary variables and one listener on Steam's shared page and
removes them at the end; it draws nothing and presses nothing by script. Run the last expression even if a step
fails.

```js
// 1. what exists
(() => { const s = window.SteamClient; return { notify: typeof s?.GameSessions?.RegisterForScreenshotNotification,
  last: typeof s?.Screenshots?.GetLastScreenshotTaken, path: typeof s?.Screenshots?.GetLocalScreenshotPath }; })()
// 2. start: the last screenshot Steam knows, and a recorder
(() => { const st = (window.__p108f = { last: null, path: null, events: [] });
  SteamClient.Screenshots.GetLastScreenshotTaken().then(r => { st.last = JSON.parse(JSON.stringify(r));
    return SteamClient.Screenshots.GetLocalScreenshotPath(r.nAppID, r.hHandle); }).then(p => { st.path = String(p); })
    .catch(e => { st.last = st.last || { error: String(e) }; });
  window.__p108fReg = SteamClient.GameSessions.RegisterForScreenshotNotification(
    n => st.events.push({ at: Date.now(), n: JSON.parse(JSON.stringify(n)) }));
  return "listening"; })()
// 3. after the press: read
(() => window.__p108f)()
// 4. always: clean up
(() => { try { window.__p108fReg?.unregister(); } catch (e) {}
         delete window.__p108fReg; delete window.__p108f; return "clean"; })()
```

Between 2 and 3 a real Steam screenshot is needed. First try the rig once at Steam's home screen with no game
running (hold GUIDE, tap RB; a stray press does little there). It is expected to save nothing. Then ask the
maintainer for **one press of Steam + R1** with a game running. After each, list the newest file in Steam's
screenshot folders with its time (`ls -lt` on the folder; write `<user>` for the number in the evidence). Record:
which of the three functions exist; the fields and values of the last screenshot (leave out any web address field's
value); whether a notice arrived, its fields, and the milliseconds between it and the file's own time; where the file
landed and its name. If the maintainer is not at hand, record "press not made" and move on: no lane waits on this.

**S0-5, Steam's own Share menu (row P108F-S0-SHARE; recorded only).** From Steam's menu open Media, pick any
screenshot, press Options, choose Share. Take one picture of the menu (`deck_captureScreenshot`) and write down its
lines. B back out to where you started. Expected: nothing that hands the picture to a plugin. Could not run is an
acceptable result; say so.

**Report** each row as its numbers and one plain sentence. Pass nothing the runbook's line does not support.

---

## M — The drawing: where the offer sits (★ `[ui]`, Opus at medium or high by the house rule of 2026-11-19; mock-up board 7, the tab for plan 108f)

Board 7 belongs to plans 108a to 108g; the session gives this tab its number and its two file names, and hands you
the board's general rules (how a board works is in `docs/demos/mockup-board-5/README.md`; the worked example for a
Main tab drawing is board 5's `75-chips.js`). This section is only this tab's facts.

- **The calls it serves:** f1 (where the one-press offer sits), f3 (what happens after bonsAI's own capture), f4 (a
  notice after a screenshot; for the eye only).
- **Draw the dock at true size** (300 points wide): the suggestion chip row, the question box with its strip
  (paperclip, game tag, mode, mic, ASK), and about 100 points of the answer above, so the cost in height is seen.
  The answer area is 295 points tall on the Deck's own screen (the roadmap's "Give the reclaimed height to the
  transcript" entry). Every size comes from the drawing measuring itself, not from sums.
- **Real words, copied from the code:** the menu's two lines (`MainTabAttachMenuPopover.tsx:49-50`); the attached
  row (`MainTabUnifiedAskBar.tsx:932-1017`: picture 58 by 34, the file's name, its size, an X); the notices
  (`useScreenshotBrowser.ts:186-190`, `:232-236`); the help chip's look for a full-width chip
  (`MainTabPresetRow.tsx:215-230`); a suggestion chip is 26 px tall (`presetRowLayout.ts:37`).
- **The offer's words in every option:** "Attach the screenshot you just took", with a small copy of the picture at
  its left. Use a 1280 by 800 game-like placeholder you draw yourself; no real game art.
- **f1 options, each a pressable card** (arrow keys, Enter is A), each stating its presses from the question box, its
  cost in points while the offer waits, and its new D-pad stops:
  - **Today:** nothing is offered. Left, A, Down, A, wait, A: five presses.
  - **A, in the paperclip's menu:** a first line in the menu and a small dot on the paperclip. Left, A, A: three
    presses. No height. No new stop outside the menu. Nothing shows unless you know to look at the dot.
  - **B, its own chip between the suggestion chips and the question box** (where the AI's own suggestion chip sits).
    Up, A: two presses. About 30 points while it waits (a 26 px chip and its gap). One stop more while it waits.
    The suggestion chips stay.
  - **C, in the suggestion chip's place** (as the help chip does). Up, A: two presses. No height, no new stop. The
    suggestion chips are hidden while it waits.
  - **D, a row under the question box** (where the attached row goes), with Attach and No thanks. Down, Down, A:
    three presses. About 50 points while it waits. Two stops more.
  - **A switch on B, C and D: "the ring starts on the offer when the panel opens".** A alone: one press. It changes
    where the ring starts; typing a question then needs one press more to reach the box.
  - Show for each how the offer goes away: after A (the attached row appears under the box), after a question is
    sent, and when the panel is closed.
- **f3 options, pressable:** after "Close menu & take screenshot" and reopening the panel. Today (a notice says
  where to find it; five presses) · offered like any fresh screenshot · attached by itself, with its Remove X.
- **f4, for the eye only:** a Steam-style notice after a screenshot, "Ask bonsAI about this screenshot", beside
  Steam's own "Screenshot taken" notice, to show the two together. Like and Not this only.
- **Cost to state on the cards:** A touches the menu and the paperclip; B adds one container beside the AI's own
  chip; C changes the most delicate row on the tab; D adds a row and two stops; the switch changes where the ring
  starts. The notice needs a new Settings switch (about 18 files).

---

## A — bonsAI knows a screenshot is fresh (★★ `[ask]`, Sonnet high; no look)

**What a player sees today.** Nothing: a screenshot taken a moment ago is found only through the picker, and bonsAI's
own capture ends with "Find it under Attach → Attach recent screenshot."

**Where it comes from.** "Facts every section leans on", above. There is no code today that knows a picture is new.

**What to build.** Screen side only. No back-end change.

1. `src/features/media/freshScreenshot.ts`, a store with no React in it:
   - `FRESH_SCREENSHOT_WINDOW_MS = 120_000` (call f2; the session gives you the answered number) and
     `FRESH_SCREENSHOT_RECHECK_MS = 5_000`.
   - `refreshFreshScreenshot({ allowed, now? })`: when `allowed` is false, clear the offer and **make no back-end
     call**. Otherwise, at most once per recheck time, call `list_recent_screenshots` with `["", 1]` through
     `callDeckyWithTimeout` (`src/shared/deckyCall.ts`; it takes an array). Keep the item as the offer only when
     `now / 1000 - item.mtime` is no more than the window and no less than minus five seconds (an allowance for
     clock rounding), and its `path` has not been handled. A failed call, a
     refusal or an empty list is "no offer", never an error on screen.
   - `noteOwnCapture(item)`: the picture `take_steam_screenshot` just answered with. Per call f3 (the session tells
     you which): "offer" makes it the offer at once; "attach" marks it to be attached on the next mount; "today"
     ignores it. One constant, `OWN_CAPTURE_BEHAVIOUR`, both live branches tested.
   - `markFreshScreenshotHandled(path)`: forget the offer if it is this path and remember the path (the last 20) so
     it is never offered twice.
   - `getFreshScreenshotOffer()`, `subscribeFreshScreenshot(listener)`, and a test-only reset.
2. `src/features/media/useFreshScreenshotOffer.ts`:
   `useFreshScreenshotOffer({ allowed, isAsking, hasAttachment, setSelectedAttachment })` returning
   `{ offer, attachOffer }`.
   - On mount, and when `allowed` turns true, run the refresh.
   - `offer` reads as null while `isAsking` or `hasAttachment` is true (hidden, not thrown away).
   - When `isAsking` turns true, mark the waiting offer handled: a question was sent without it.
   - `attachOffer()` sets the attachment in the picker's own shape (`useScreenshotBrowser.ts:222-229`, `source:
     "recent"`), marks it handled, and shows the picker's own notice ("Screenshot attached" / "Recent screenshot
     ready for your next Ask.", `:232-236`).
   - With `OWN_CAPTURE_BEHAVIOUR` "attach": on mount, a marked own capture no older than the window is attached at
     once, only when `allowed` is true and nothing is attached, and marked handled.
3. `useScreenshotBrowser.ts`: after a successful capture (`:185`) call `noteOwnCapture(response.item)`, and change the
   notice's second line (`:188`) to match call f3: "today" keeps it; "offer": "Open bonsAI again: it is offered by
   the question box."; "attach": "It is attached to your next question." (shown only when `mediaLibraryAccess` is
   true; otherwise keep today's line).

**Files owned.** The two new files and their two test files; `src/features/media/useScreenshotBrowser.ts` (the two
edits above only). **Not yours:** anything under `src/features/ask/`, `src/features/preset-carousel/`,
`src/features/main-tab/`, `src/index.tsx`, any Python file.

**Tests.** `freshScreenshot.test.ts`: permission off makes no call and no offer, and permission on with a fresh item
makes one (the pair proves the guard; break the guard once, see the test fail, name the failure in the commit); a
picture 119 s old is offered and one 121 s old is not; a handled path is not offered again and a newer one is; a
failed call, a refusal and an empty list give no offer and no throw; two refreshes inside five seconds make one call;
`noteOwnCapture` in each behaviour. `useFreshScreenshotOffer.test.ts`: the refresh on mount; hidden while asking;
handled when a question is sent; `attachOffer` sets exactly the picker's shape and notices once; the own-capture
attach only with the permission on. Use `src/test-harness/fakeDeckyRpc.ts` (its `list_recent_screenshots` answers an
empty list by default, `:155`). Search `src` for other tests naming `take_steam_screenshot` or the notice's words
before you change them.

**Before you commit.** Your new exports have no user until lane C mounts the hook. Run the unused-exports count; if
it rises, say so in your report. The session lands this lane and lane C as one landing, C cut from your tip.

**The check that proves it.** No row of its own: the P108F-OFFER rows and P108F-OWN-01 run after lane C.

---

## B — The picker's pictures come from Steam's small copies (★ `[platform]`, Sonnet medium; built only if S0-2 says so)

**What a player sees today.** After "Attach recent screenshot" the picker waits before its pictures appear. On the
Deck each of up to 24 pictures is sent whole to draw a thumbnail 94 px tall.

**Where it comes from.** `build_screenshot_preview_data_uri()` (`py_modules/backend/media/screenshot_media.py:582-619`):
Pillow shrinks the picture when it is installed; it is not on the Deck, so the `except` branch (`:608-619`) sends the
whole file. Steam already keeps a small copy of each of its screenshots at `<folder>/thumbnails/<same file name>`
(seen on the Deck 2026-11-19: 3 to 9 KB against 85 to 195 KB).

**What to build.**

1. A small helper in the same file that answers the small copy's path or nothing. It answers only when: the
   picture's path holds Steam's own marker (`760/remote/<app>/screenshots/`, the test
   `extract_app_id_from_screenshot_path` uses, `:573-579`); the small copy is `<the picture's folder>/thumbnails/<the picture's own file name>`; it is a
   plain file, not a link; its real path is inside the real path of that `thumbnails` folder; its size is between 1
   and 200,000 bytes; its ending is one of `SUPPORTED_IMAGE_EXTENSIONS` (`:109`).
2. In `build_screenshot_preview_data_uri()`, before anything else: when the helper answers, read that file and
   return it as a data address with the type its ending names. Otherwise run today's code untouched.
3. Nothing else changes: not the listing, not the call's shape, not the attachment that is sent to the AI (that is
   the full picture, shrunk by `prepare_image_attachment`, `:924`).

**Files owned.** `py_modules/backend/media/screenshot_media.py` (that function and the new helper only),
`tests/test_screenshot_media.py` (new tests only). **Not yours:** `media_desktop_rpc.py`, `main.py`, any screen file.

**Tests** (in `tests/test_screenshot_media.py`, built on temp folders the way `:29-46` and `:81-99` build Steam
paths with `os.sep`): with a small copy present the answer decodes to the small copy's bytes, not the picture's;
with none, the answer is what today's code gives (the pair proves the new branch); a small copy that is a link to a
file outside is ignored; one over the size limit is ignored; a picture outside Steam's folders with a `thumbnails`
folder beside it is ignored. Search `tests/` for `build_screenshot_preview_data_uri` and for anything that patches
it (none found at the tip); `tests/test_seam_contracts.py` does not pin it (checked at the tip), and its signature
does not change.

**The check that proves it.** Row P108F-PICKER-FAST-01 (the Deck, the rig): S0-2's reading again; pass when the
middle time is under 1.0 s or at most half of S0-2's, and the total characters of the tiles' pictures are under a
tenth of S0-2's. The look of the tiles is judged on QA-LOOK-01's picture of the open picker, on both screens.

---

## C — The offer on screen (★★★ `[ui]` `[focus]`, Opus extra-high; after the maintainer's pick, lane A and step 0)

**The drawing is the design.** Board 7, this plan's tab, the option the maintainer picked for f1 and for f3. Open the
built page and build what is drawn, at the sizes it measures. Where the drawing and these words disagree, the
drawing wins and your report says so. **This section is written for option B, the planning chat's recommendation.
If another option was picked, the session rewrites "What to build" from the notes at the end before you start.**

**What a player sees today.** The five presses in "Facts every section leans on".

**Where it comes from.** The row above the question box and its Up and Down order, in the same Facts. The pattern to
copy is the AI's own suggestion chip: `InjectChipRoot` (`MainTabPresetRow.tsx:72-98`), its handle
(`injectChipNav.ts`), its place in the box's Up order (`useMainTabAskBarFocus.ts:178`), the chips' Down
(`MainTabPresetRow.tsx:165-173`), and its tests (`MainTabInjectChipFocus.test.tsx`). Read
`docs/focus-graph.md:409-463` and `DetailsSlot.tsx`'s header before touching the row. Have S0-3's numbers in hand.

**What to build (option B).**

1. A new file `src/features/preset-carousel/FreshScreenshotChip.tsx`: one full-width chip, 26 px tall
   (`PRESET_CHIP_HEIGHT_PX`), the small picture at its left (the offer's `preview_data_uri`), the words "Attach the
   screenshot you just took", `aria-label` the same words. Its own focus container with its own Steam nav handle
   (a twin of `injectChipNav.ts`, in a new small file): Up goes to the AI's own chip when it shows, else the slot
   (`takeChipSlotFocus() || chipRowExitUp()`, as `InjectChipRoot` does); Down goes to the question box; Left uses
   `leftAtEdge("fresh-shot-chip", evt)`; Right holds.
2. It reads the offer through `useFreshScreenshotOffer` (lane A), fed from what `MainTabPresetRow` is given.
   `MainTab` already holds `mediaLibraryEnabled`, `selectedAttachment` and `setSelectedAttachment`
   (`MainTab.tsx:106-107`, `:127`): pass them from `MainTab` to the row. Add nothing to what the main screen passes
   to the tab.
3. Place it **nearest the question box**, under the AI's own chip (`MainTabPresetRow.tsx:248-266`). Up from the
   question box lands on it first: add its take-focus call in `useMainTabAskBarFocus.ts` just after the refusal
   button's (`:176`). The chips' and the AI's own chip's Down go to it when it shows, before the box.
4. **A on the chip:** hand the ring to the question box first, then attach (`pressThenHandRingOn`, as the picker's
   tiles do, `MainTabScreenshotBrowser.tsx:273-277`), because the chip leaves with the press.
5. **The chip never appears or leaves under the ring by itself.** The offer arrives a moment after the panel opens.
   If the ring is already on the row when it arrives, hold it back until the ring leaves the row (the rule
   `useChipsHeldUnderRing` keeps for new chips, `MainTabPresetRow.tsx:196-199`).
6. While a question is being written or a picture is attached, the chip is not drawn (the hook reads null).
7. Call f3 "attach": nothing more here; lane A's hook attaches bonsAI's own capture when the panel opens, and the
   attached row that already exists shows it.
8. Add the chip's route to `docs/focus-graph.md` beside the ask box's strip section, and run
   `python scripts/docs_toc.py`.

**Files owned.** The new chip file and its nav file, their tests; `MainTabPresetRow.tsx`; `useMainTabAskBarFocus.ts`
(the one Up order); `MainTab.tsx` (the three values passed to the row); `docs/focus-graph.md` (one new section).
After lane A has landed on your base you may also touch `useScreenshotBrowser.ts` for a notice's wording only.
**Not yours:** `DetailsSlot.tsx`, `detailsSlotStore.ts`, the chips' own files, `src/index.tsx`, the tab payload hook,
any Python file. `MainTabUnifiedAskBar.tsx` only if the drawing needs the paperclip's dot, and then a few lines.

**Tests.** A new `FreshScreenshotChip.test.tsx` on the Decky stand-in, modelled on
`MainTabInjectChipFocus.test.tsx`: Up from the box lands on the chip; A attaches and the ring is on the question
box; Down from the chips lands on the chip, then the box; the chip is absent with the permission off (and present
with it on: the pair); an offer arriving while the ring is on the row waits; a bounded walk Down and Up through the
dock with the offer showing visits no stop twice, under the stand-in's model of Steam's own scrolling
(`src/test-harness/deckAnswerWalk.ts`). **Search the tests under `src/features/ask`, `src/features/main-tab` and
`src/features/preset-carousel` for any that pin which back-end calls happen when the tab mounts**
(`list_recent_screenshots`, `toHaveBeenCalledTimes`): the row now makes one call on mount whenever the permission
is on, and the ask bar's tests default it to on (`MainTabUnifiedAskBar.tsx:196`). Run `pnpm test:focus`.

**The check that proves it.** Rows P108F-OFFER-01 to 04, P108F-OWN-01, QA-FREE-PLAY-01 and QA-LOOK-01 on Main (the
Deck, the rig, a placed picture), and P108F-HAND-01 (the maintainer's own screenshot). Before landing, the session
asks the second opinion, as for every D-pad landing (lessons § 4, plan 106).

**If another option was picked.**

- **A (the menu):** `MainTabAttachMenuPopover.tsx` gets a first line `attach_fresh` when an offer waits (the list at
  `:48-51` becomes a function of the offer; the first-live-line rule at `:108-113` then lands on it; Up and Down are
  by index, `:189-202`); `useAskBarMenuToggles.ts:77-83` handles it by calling `attachOffer()` and handing the ring
  to the question box; the paperclip draws a small dot while an offer waits, beside the existing "1" badge
  (`MainTabUnifiedAskBar.tsx:639-658`), and its `aria-label` (`:611`) says so. S0-3's room under the menu decides
  whether a three-line menu still fits; if not, it opens upward. No popover test exists today: model one on
  `MainTabAskModeMenuPopover.test.tsx`.
- **C (the chip's place):** a third branch beside the help chip's (`MainTabPresetRow.tsx:207-247`), help chip first.
  Mind the Up order: the slot's Show details line is tried before the row (`useMainTabAskBarFocus.ts:188-189`), and
  the slot is not drawn while the offer owns the row.
- **D (a row under the box):** draw it where the attached row sits (`MainTabUnifiedAskBar.tsx:903-1020`), in a new
  file; Steam's own Down from the strip reaches it (`docs/focus-graph.md:449-452`).
- **The ring starts on the offer:** see `docs/focus-graph.md`, "Where the ring starts when the plugin opens"; the
  session writes this part with the second opinion's read first.

---

## K — The bookkeeper's paperwork (Sonnet medium)

- **At go:** this plan's share of decision D145 (calls f1 to f4 as answered). Both living documents are at their
  size limits on 2026-11-19 (`docs/roadmap.md` 100.2 KB against 100; `docs/testing.md` 164.4 KB against 165): make
  room first, the way plan 105's K0 did, before adding rows.
- **Rows to add to `docs/testing.md`, open, each naming its machine:** P108F-S0-NEWEST, P108F-S0-PICKER,
  P108F-S0-ROOM, P108F-S0-NOTIFY, P108F-S0-SHARE (the Deck; the last two may end "recorded" or "could not run");
  P108F-OFFER-01 to 04, P108F-OWN-01, P108F-PICKER-FAST-01 (the Deck, the rig, a placed picture); P108F-HAND-01
  (the Deck, the maintainer's hands; also added to the "checks only you can do" page). The stand-in on Windows
  cannot run any of them: Steam's screenshot folders are not where the back end looks there.
- **The roadmap entry:** stays in Features, PARTIAL, when lane B lands alone. Moves to Verify, naming the rows, in
  the same commit as lanes A and C. Moves to Done as one line, the full entry to the archive, when the Deck rows and
  P108F-HAND-01 pass.
- **`docs/troubleshooting.md`:** one line under screenshots when the look lands: a screenshot taken in the last two
  minutes is offered by the question box, only with "Read game & screenshot context" on.
- **`docs/mcp-setup.md`:** the rig's Steam + R1 finding (line 102) gains whatever S0-4 learned.

## The reviewers' questions

**The security reviewer** reads lanes A, B and C before they land:

1. Is every path that can become an attachment one the back end itself listed or captured? (Rule 3.)
2. With the permission off or the Kids lock on, is there truly no listing call, no offer and no dot, on both sides?
3. Lane B: can the small-copy path be steered outside its `thumbnails` folder (a link, a crafted name, a huge file)?
4. Is anything new written to a log about a picture (a name, a path) that was not written before?
5. Step 0's probe: is anything left on Steam's shared page after its last expression?
6. For the reviewer to weigh, older than this plan: the back end accepts any picture path the screen names as an
   attachment (`ask_payload.py:49-71`; only existence, type and size are checked later, `screenshot_media.py:924`).
   This plan does not widen it and does not fix it.

**The open-source reviewer** is not needed: no new dependency, no download, no licence.
