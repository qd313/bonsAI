# 22 — The XInput near-miss, and the measured button map

Record of a wrong turn taken during **plan 19 spike S1/S2** on 2026-08-25, the
evidence that nearly justified it, and what to do if the symptoms come back.

**One sentence:** three independent signals all said the bridge board had to
impersonate an Xbox 360 controller — a session or two of work — and all three
were the same wrong lookup table wearing different hats.

Sources: [19-controller-macro-test-rig.md](19-controller-macro-test-rig.md)
§ 5 (S1, S2), [21-ai-owned-testing-program.md](21-ai-owned-testing-program.md)
§ 2.4 and § 7, and the bring-up work now in DPS at `bridge/` (branch
`feat/controller-bridge-p0`).

---

## 1. What nearly happened

S1 asks whether the Deck accepts a generic HID pad or needs an XInput identity.
Plan 19's own notes flag the XInput answer as the one that "turns the spike into
a session or two": a hand-written USB report descriptor, Microsoft's VID/PID
(`045E:028E`), and a vendor-specific interface instead of standard HID.

By late evening three findings all pointed there:

| # | Finding | Read as |
|---|---|---|
| 1 | SDL 2.28.4 reports `SDL game controller mapping: NO — raw joystick` | Steam will not recognise the layout |
| 2 | Five of nine named buttons lit nothing in Steam's input tester | The generic mapping is too sparse to use |
| 3 | **No reachable Guide button** | S2 is blocked; QAM cannot be opened |

Finding 3 is decisive on its own. Guide is what opens the QAM, the QAM is where
bonsAI lives, and without it the golden path stops at step 2. XInput fixes all
three at once — swapped bumpers, dead buttons, missing Guide — because the
layout stops being Steam's guess and becomes a standard. That is a *coherent*
argument, and it was wrong.

## 2. What was actually true

The firmware assumed button bits were assigned densely and in the obvious order
(A=0, B=1, X=2, Y=3, LB=4, RB=5, SELECT=6, START=7, GUIDE=8). **Steam's
generic-HID layout for this device is sparse.** Measured by pressing raw bits
0–15 on a 2.0 s grid while recording Steam's *Test Device Inputs* screen, then
differencing video frames against a resting baseline:

    bit  0 = A          bit  6 = LB         bit 12 = GUIDE
    bit  1 = B          bit  7 = RB         bit 13 = L3
    bit  3 = X          bit 10 = SELECT     bit 14 = R3
    bit  4 = Y          bit 11 = START      bits 2, 5, 8, 9, 15 unused

Guide was always reachable — on bit 12, while the firmware was pressing bit 8,
which is one of the unused ones. With the table corrected, a `GUIDE+A` chord
opened the Quick Access Menu on the first attempt, unattended.

**SDL's verdict (finding 1) was a red herring throughout.** Steam's controller
layer is more permissive than SDL's `gamecontrollerdb`; the PC-side result
predicted the Deck badly and the pessimism it caused was unjustified.

## 3. Why the evidence looked convergent

Three signals from one root cause are indistinguishable from three independent
confirmations. Findings 2 and 3 were *the same fact* — a wrong table — counted
twice, and finding 1 measured a different system than the one under test.

The check that would have caught it: **nothing had established the mapping
between our bit numbers and Steam's buttons.** That assumption sat underneath
all three findings and was never tested until it was tested directly.

Worth keeping in mind next time an argument for expensive work feels
over-determined: ask what single assumption, if wrong, would produce *all* of
the evidence at once.

## 4. The human eye was not sufficient — and that mattered

During a 16-press sweep the maintainer reported **5** buttons lighting up. Frame
analysis of the same recording found **11**. Each press was 600 ms, two seconds
apart.

Had the by-eye count stood, GUIDE stays "dead" and the XInput rewrite proceeds.
**The recording did not corroborate the answer, it changed it.** This is the
concrete version of the argument in
[21-ai-owned-testing-program.md](21-ai-owned-testing-program.md) § 2.4 about
working from a lying instrument.

Note the method stayed mechanical, per that plan's § 7: frames were differenced
and bounding boxes compared against known screen geometry. No vision model
judged what a button "looks like."

## 5. If the symptoms come back

**Relapse looks like:** buttons that light nothing, buttons that light the wrong
element, bumpers behaving swapped, or `GUIDE+A` failing to open the QAM.

**Check the table before anything else.** Re-measure rather than reason:

    cd bridge/tools                     # in decky-plugin-studio
    .\flash.ps1 deck_bridge
    python bitsweep.py                  # sweeps raw bits 0-15 on a 2.0 s grid
    python analyze-sweep.py <video>     # or runs.py for per-event bounding boxes

Record the Deck while the sweep runs (Settings → Controller → the board →
Details → **Test Device Inputs**). Two method notes that cost time to learn:

- **Mask the status bar.** The clock and battery tick on their own and land in
  every bounding box.
- **Take the baseline frame from the middle of the recording.** Frames near the
  start are unusable while the screen settles.

Causes worth suspecting before XInput:

1. A **SteamOS or Steam client update** changing the generic-HID layout. Most
   likely cause, and it is a table change, not a redesign.
2. A **different board or a changed USB descriptor** — the map is per-device.
   The measured device is `0x303A:0x1001`, reported by Steam as
   `Espressif Systems ESP32S3_DEV`.
3. Steam having **learned a layout** via *Setup Device Inputs*, which would
   override the default. Note this page is not reachable by controller from
   inside the tester; it needs the touchscreen.

## 6. If XInput really is needed later

Only after § 5 shows the map is right and Guide is still unreachable.

- Present `045E:028E` with the Xbox 360 vendor-specific interface rather than a
  standard HID descriptor. TinyUSB does not ship this; it is hand-written.
- The D-pad becomes **four discrete buttons, not a hat switch**, which also
  removes the hat-encoding ambiguity chased and disproved on 2026-08-25.
- Expect the Deck-side cable to need unplugging during flashing regardless (see
  the hazard in `bridge/README.md`).
- Budget the "session or two" plan 19 § 5 already allows for S1.

## 7. The same error class, seen twice

The near-miss was acting on an unverified model of the world. It recurred within
the hour in a different form, caught by the maintainer:

> "Launching the QAM menu doesn't always land you on the 'help' icon. I think
> you need to verify what icon you are on after you send a QAM press. […] I
> really don't want you to walk thru another menu when you think you're inside
> bonsAI."

The QAM opened on **Help**, and one D-pad press happened to reach **Decky**.
That was luck. Open on Performance instead and the same press lands elsewhere,
and every step after it is a macro walking a menu it only believes it is in —
pressing A somewhere unknown.

This is precisely what plan 19's **L5** requires and what does not exist yet:
every macro step gated by a CDP state read, keyed off `gpfocus` markers rather
than `activeElement` (findings-log **P1-5**). Until it exists, **no macro may
chain more than one blind step**, and rig results stay provisional regardless of
how convincing the screenshots look.
