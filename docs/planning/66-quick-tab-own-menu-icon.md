# Plan 66 — bonsAI's own icon in the Quick Access Menu, through Quick Tab

**Status:** written 2026-09-23. All four questions in section 7 answered the same day. Nothing built,
nothing tried on the Deck yet. Step 1 is next.
**Replaces:** plan 11, the old study of this item, now in
[archive/11-native-qam-tile-feasibility.md](../archive/11-native-qam-tile-feasibility.md). That study said
the icon could only come from Decky's own team, and they had turned it down. That is no longer true.
**Roadmap entry:** **bonsAI's own icon in the Quick Access Menu** — now ★★★, was ★★★★★★.
**Stars and models:** ★★★ means Opus xhigh plans and lands. Step 1 is a Deck measurement, so no
helper builds anything until it is done. The docs in step 3 can go to a Sonnet helper.

---

## 1. What a player gets

Today, reaching bonsAI takes three stops: open the menu, go down to Decky's plug icon, then pick bonsAI
from Decky's list. With this plan, bonsAI has its own icon on the menu's left edge, next to Steam's own
icons. Two stops: open the menu, pick bonsAI.

The icon comes from a separate free plugin called **Quick Tab**. The player installs it once and pins
bonsAI. bonsAI does not need any code to be pinned. It already shows up in Quick Tab's list today.

The work in this plan is making sure bonsAI **behaves well** once it sits in its own tab, because a few
things work differently there (section 4).

## 2. What Quick Tab is

- **Who and when:** one person, moi952, who also makes Decky Proton Launch, which *is* in the Decky
  store. First public release, version 0.1.0, on 6 September 2026. Sixteen stars on GitHub, no open bug
  reports. It calls itself "experimental".
- **Not in the Decky store.** A player downloads a zip from its GitHub releases page and installs it by
  hand through Decky. That is one more step for a player than a store plugin, and it is worth saying
  plainly in our instructions.
- **What it does:** pins any installed Decky plugin as its own icon in the menu. It can also reorder
  every icon and hide Steam's Notifications, Chat, Help and Music icons.
- **How it does it:** the same way Decky adds its own plug icon. It finds the part of Steam that draws the
  menu and adds entries to its list of tabs. So it breaks when a Steam update breaks Decky, and gets
  fixed on roughly the same schedule.
- **Licence:** BSD, a free licence. We may link to it, recommend it, and even copy its code as long as
  the credit line stays.
- **What happens if a pinned plugin crashes:** Quick Tab catches it, so the menu itself stays up.

## 3. Why the stars drop from six to three

The six stars were never about bonsAI's own work. They meant "waiting on Decky's team, who closed the one
attempt in June with a one-word reply". Quick Tab removes that wait: the icon exists and works today,
with no change to Decky and none to Steam.

What is left is bonsAI's own part. That is a Deck test to find out how bonsAI behaves in its own tab, a
few small fixes, and new help text. That is three stars: real Deck time, and fixes that touch when bonsAI
thinks the menu is open, which several other features lean on.

If step 1 finds nothing wrong except the reply notice (4.1), this drops to two stars.

## 4. What changes for bonsAI inside a pinned tab

Found by reading Quick Tab's and Decky's code on 2026-09-23. **None of this has been seen on the Deck
yet.** Step 1 checks each one.

### 4.1 bonsAI cannot tell the menu is open — sure, from the code

Inside Decky, bonsAI asks Decky "is the menu open right now?" and Decky answers. Quick Tab does not wrap
its tabs in the part that answers that question, so inside a pinned tab the answer is always "no".

**What a player would notice:** the "your reply is ready" notice pops up even while they are looking
straight at the answer. Annoying, not harmful. Nothing else in bonsAI asks that question today.

### 4.2 Tapping the reply notice opens the wrong tab — sure, from the code

The notice opens Decky's plug icon, not bonsAI's own icon. The player lands in Decky's list, or in a
second copy of bonsAI inside Decky (see 4.4).

### 4.3 bonsAI may keep running while the menu is closed — not known

Decky only draws bonsAI while the menu is open. When the menu closes, bonsAI stops, and it starts again
next time. A lot of bonsAI is built around that: saving and restoring the screen, the reply notice, the
background check for a finished answer.

Quick Tab does not do that. Whether bonsAI keeps running in the background depends on whether Steam keeps
hidden tabs alive. Quick Tab's own author was not sure and left code in to find out.

**If it stays running:** good news and bad news. The answer and the typed question stay on screen with
no restore step. But bonsAI's background checks would run the whole time the game runs, which costs
battery and could cost frames. The measured cost of an answer on a running game is already a roadmap
entry, so this matters.

### 4.4 Two copies of bonsAI at once — not known

A player can still open bonsAI the old way, through Decky's list, while it is pinned. That makes two
separate copies on screen, sharing one saved chat and one settings file. They may both check for the same
answer, both show the reply notice, or overwrite each other's saved screen.

### 4.5 The title looks different — likely

The "bonsAI v0.5.0" title at the top is drawn plain in a pinned tab. Decky adds Steam's title style
around it, and Quick Tab expects the plugin to add that itself. So the title may come out smaller or
closer to the left edge. There is also no back arrow in a pinned tab, which is correct.

### 4.6 The layout — probably fine

Quick Tab's frame copies Decky's almost line for line: the same gap at the top and the same title bar
that stays put while scrolling. bonsAI's height and side-edge fixes should carry over. It still needs the
usual walk, on both of the maintainer's screens, because those fixes were measured inside Decky only.

## 5. The steps

### Step 1 — A Deck test to find out (no code)

Install Quick Tab, pin bonsAI, and record:

1. **Does bonsAI stay running** when the menu is closed, and when another icon in the menu is open?
   Read it from bonsAI's log. If the log does not note each start today, add one line that does.
2. **The reply notice:** ask, stay on bonsAI's tab, and see whether the notice pops up (expected: yes,
   wrongly). Then ask, close the menu, tap the notice, and see where it lands.
3. **Can the reply notice open bonsAI's own tab?** Try opening the menu straight to the pinned tab by its
   name. Steam's own tabs are opened by number, and Quick Tab names its tabs with words, so this may not
   work.
4. **Two copies:** open bonsAI the old way while it is pinned, ask once, and watch both.
5. **How it looks:** pictures at true size on both screens, the title included. Then the free-play walk
   (every focused control must also be visible), and one full ask with the answer scrolling.
6. **Cost in frames:** with bonsAI pinned and the menu closed, compare the frame rate against bonsAI not
   pinned, same game, same spot.
7. **Take it away:** unpin bonsAI and remove Quick Tab. bonsAI should behave as it always has.

### Step 2 — Fixes, only for what step 1 proves

1. **Know when the menu is open another way** (4.1), one that works both inside Decky and in a pinned
   tab. Keep asking Decky as well, and trust whichever says "open".
2. **The reply notice opens bonsAI's own tab when it is pinned** (4.2), and Decky's as before when it is
   not. If step 1 shows the menu cannot be opened to a pinned tab, keep Decky's tab and say so in the
   help text.
3. **If bonsAI stays running** (4.3): pause its background checks while the menu is closed.
4. **Two copies** (4.4): the maintainer's call, question 3 below.
5. **The title** (4.5): make it look the same in both places. Any fix has to be checked inside Decky too,
   because adding Steam's title style ourselves would double it there.

### Step 3 — Help text

1. **The shortcut section of the troubleshooting guide:** a new first step, "Install Quick Tab and pin
   bonsAI", ahead of the controller shortcut. The shortcut itself gets shorter: open the menu and move to
   bonsAI's icon. No more stepping into Decky or its list, so fewer timing delays to tune.
2. **Fix a wrong sentence there.** It says Decky "acts as a secure container" and so a menu icon is
   impossible. Neither part was ever true: Decky simply does not offer plugins a way to add an icon, and
   Quick Tab adds one anyway.
3. **The readme:** its "What is coming" line lists "a shortcut tile in the menu". Change it to a short
   "Want bonsAI on its own icon? Use Quick Tab" line with the link.
4. **bonsAI's built-in shortcut help reply** gets one line pointing to Quick Tab.
5. Every mention says Quick Tab is **optional**, made by someone else, and not in the Decky store.

### Step 4 — A friendly note to Quick Tab's author (optional)

Quick Tab could fix 4.1 and 4.3 for every plugin at once, by doing what Decky does: tell the plugin when
the menu is open, and only draw it while it is. A short GitHub issue, written and sent by the maintainer.
Its readme welcomes issues. Not needed for anything above; bonsAI's own fixes come first.

## 6. What this plan does not do

- **Build our own pinning into bonsAI.** It is possible, and the licence allows copying Quick Tab's code.
  But two plugins moving the same menu icons around would fight, and bonsAI would then own the breakage
  every time a Steam update lands. Only worth revisiting if Quick Tab is abandoned.
- **Require Quick Tab.** bonsAI must keep working exactly as today without it.
- **Ask Decky's team again.** Nothing is needed from them now. Their open request for this feature can
  simply be left alone.
- **Touch leaving Decky.** The old study also looked at running bonsAI outside Decky. That question lives
  on in the roadmap's "one decision for three items" entry, and the archived study stays readable for it.

## 7. Questions for the maintainer — answered 2026-09-23

The maintainer took every suggestion ("go with your leans").

1. **Recommend Quick Tab in the help text now, before step 1?** **No — wait for step 1**, so we never
   point players at something we have not run. Step 3 happens after step 1.
2. **Tell players in bonsAI itself**, for example a line in the About tab? **No — help text only.** bonsAI
   should not advertise a plugin it does not control. The built-in shortcut help reply (step 3, item 4)
   counts as help text and stays in.
3. **Two copies (4.4):** **leave it**, unless step 1 shows an actual clash. If it does, bring the clash
   back to the maintainer before building anything; the fallback idea is a second copy that shows only
   "bonsAI is open in its own tab".
4. **Send the note to Quick Tab's author (step 4)?** **Yes, after step 1**, with what was measured. The
   maintainer sends it.

## 8. Risks

- **Quick Tab is one person's project, two and a half weeks old.** If it stops being updated, the icon
  disappears after some Steam update and players fall back to the old way. Nothing in bonsAI breaks.
- **Steam updates break it**, just as they break Decky. Same risk, same kind of fix, from a different
  person.
- **Players must install a plugin by hand from a zip.** Some will not bother. The controller shortcut
  stays documented for them.

## Sources

- Quick Tab: [github.com/moi952/decky-quick-tab](https://github.com/moi952/decky-quick-tab), read at
  version 0.1.0. The pinning is in its menu patch file; the notes about hidden tabs staying alive are its
  author's own comments there.
- Decky: [github.com/SteamDeckHomebrew/decky-loader](https://github.com/SteamDeckHomebrew/decky-loader),
  read on 2026-09-23. Its tab code, its menu-open answer and its plugin view show why 4.1 and 4.3 happen.
- Decky's own request for this feature, still open: [issue 887](https://github.com/SteamDeckHomebrew/decky-loader/issues/887).
