# 09 — Steam Frame companion UX — feasibility (2026-08-03, rev. 2026-08-04)

Research only. No code, no roadmap edits, no implementation. Answers the six
questions raised against the Planned item at
[roadmap.md § Planned — Steam Frame companion UX](../roadmap.md#planned) — *"Research-first companion
workflows for Steam Frame; comfort/framerate/wrong-display disclaimers"*,
★★★★★★, with *"Shipping a full VR overlay inside Frame as v1"* already declared
out of scope.

**Rev. 2026-08-04** reworks §2C (voice), adds §3 (the two architectural paths),
§4 (Frame as an inference host), and §5-B3 (`vrwebhelper`), and drops the
Deck-as-streaming-host workflow. Three conclusions from the first pass were
wrong or incomplete; they are marked **[corrected]** where they appear.

---

## Verdict

**Ship: docs and KB tips only. ★★**
**Prepare: yes, and there is real, non-speculative work available today — but it
is OpenVR overlay research on the host PC, not Decky-on-Frame research.**

The first pass framed this as "can bonsAI run on a Frame?", answered no, and
stopped. That was the wrong question. The right one is **"where does the
software that draws into a Frame actually run?"** — and in the configuration
Valve is building for, the answer is *the host PC*, which is x86_64, runs
SteamVR, and has no Decky problem at all. That path is researchable now against
shipping technology (OpenVR `IVROverlay`, `vrwebhelper`, gamescope, BPM), and it
converges with the "decouple from Decky" idea in question 11.

What has *not* changed: nothing should be built for this, and the roadmap's ★★★★★★
still overprices the shippable v1.

---

## 1. Platform reality check

### What Valve has published

| Fact | Source |
|---|---|
| Standalone headset "designed primarily for low-latency streaming of player's Steam Library from a PC, while also supporting standalone experiences for both VR and Non-VR" | [Steamworks: Steam Frame](https://partner.steamgames.com/doc/steamhardware/steamframe) |
| Runs SteamOS; "full compatibility with SteamVR and OpenXR" | same |
| "Supported execution models include Windows and Linux PC titles as well as native ARM64 and Android-based APKs" | same |
| Developer Mode enables **ssh, adb, rdp**; `ssh steamos@frame` | [Frame setup](https://partner.steamgames.com/doc/steamhardware/steamframe/setup), [Frame debugging](https://partner.steamgames.com/doc/steamframe/debugging) |

### What credible secondary sources add

| Fact | Source |
|---|---|
| Snapdragon 8 Gen 3, 16 GB LPDDR5X, dual 2160×2160 LCD, 72/80/90/120 Hz + experimental 144 Hz, eye tracking, no base stations, ~440 g configured | [UploadVR](https://www.uploadvr.com/valve-steam-frame-official-announcement-features-details/), [Steam Hardware Hub](https://steamhardware.io/steam-frame/specs/) |
| **Dual mic array on the underside**; four 16 mm open-ear drivers in the strap | [VR & AR Wiki](https://vrarwiki.com/wiki/Steam_Frame) |
| Dedicated 6 GHz Wi-Fi 6E **dual-radio USB adapter**; **SteamVR on the host PC connects to it** | [UploadVR](https://www.uploadvr.com/valve-steam-frame-official-announcement-features-details/) |
| Foveated streaming driven by eye tracking, applied at the encoder | same |
| Arch-based SteamOS + Proton + **FEX-Emu** + **Lepton** (Waydroid fork); ships **KDE Plasma** | [Wikipedia](https://en.wikipedia.org/wiki/Steam_Frame), [PC Gamer](https://www.pcgamer.com/hardware/vr-hardware/steamos-launching-for-arm-fex-translation-layer/), [KDE Discuss](https://discuss.kde.org/t/kde-plasma-featured-on-new-steam-frame-vr-headset-and-steam-machine-pc/41624) |
| SteamVR dashboard rebuilt: "The Quick Access Menu (familiar to Steam Deck users) is now available on the dashboard, integrating notifications, volume, brightness, and battery status" | [SteamDeckHQ](https://steamdeckhq.com/news/steamvr-overlay-improvements-steam-frame/) |
| **21.6 Wh battery, ~1.5–2 h**; ~12% sustained-load dip after 45 min; HL:Alyx standalone at **40–50 fps low** | [Geeky Gadgets hands-on](https://www.geeky-gadgets.com/valve-steam-frame-battery/) |
| **Not shipped.** No price, no date as of Aug 2026; "summer 2026" window | [VR.org tracker](https://vr.org/steam-frame-release-date) |

### UNKNOWN — and honestly unknowable until units ship

- Whether an **on-device** SteamVR/OpenVR runtime exists on Frame for standalone
  titles, or whether standalone uses a Monado-derived OpenXR runtime with no
  `IVROverlay` surface at all. This is the single most decision-relevant unknown
  for Path B below.
- Whether the Frame's in-VR QAM is the *same* CEF surface Decky targets
  (`steamloopback.host`) or a separate `vrwebhelper` document. See §5-B3.
- Whether the Frame's dual mic array reaches the host PC cleanly during a
  streamed session. The plumbing exists (Steam Streaming Microphone) but has a
  [long history of being flaky](https://steamcommunity.com/groups/homestream/discussions/0/1742264309468303911/);
  Valve's own point-to-point link may or may not fix it.

**Assumption adopted for the rest of this document, per maintainer direction:**
*a Frame owner has a capable PC on their LAN.* The device is streaming-first;
the PC is the premise, not an optional extra. The "Deck as streaming host"
workflow from the first pass is **dropped** — technically permitted, not a
target. **[corrected]**

---

## 2. Companion workflows

### A — HMD in-game, bonsAI on the Deck on the LAN ✅ **works today, zero code**

Frame streams from the gaming PC. Deck sits on the desk running bonsAI pointed
at Ollama on that same PC. Lift headset, ask, read, resume.

This is the shipped LAN Ollama story ([README.md:99-105](../../README.md),
[docs/troubleshooting.md:361-389](../troubleshooting.md)) with a headset in the
room. **The only v1 work is telling people it works.** Its ceiling is also
obvious: you must break immersion to read the answer, and — see §2C — the Deck's
mic cannot hear you reliably from inside a headset across the room.

### B — Phone / tablet web UI ❌ **permanently out**

Needs an HTTP server in the plugin, a bind/auth story, a second UI, and a CORS
model. All are deliberate non-goals: the repo's own guidance is **"NEVER use
`fetch()` in the `.tsx` file to hit the PC"**
([docs/troubleshooting.md:356](../troubleshooting.md)), and `CLAUDE.md` states
there is no HTTP server between the two sides. A second product, not a feature.

### C — Voice ✅ **right instinct; my first-pass conclusion was wrong** **[corrected]**

**What I said:** *"Voice-only is worse on Frame, not better… don't let Frame
justify the wake-word item."*

**In plain terms, here is the actual argument, and where it breaks:**

Talking *to* bonsAI is only half a conversation. The other half is bonsAI
talking *back*. Today bonsAI answers exactly one way: **text on a screen**
([`bonsaiReplyReadyToast.ts`](../../src/utils) fires a *visual* toast). With a
headset on your face, you cannot see that screen. So wake-word alone would let
you ask a question and then leave you sitting there in VR with an answer you
have no way to receive.

**That is an argument against wake-word shipping alone. It is not an argument
against voice, and I drew the wrong conclusion from it.** You are right that
text entry is the worst part of VR and that voice is the natural fix. The
correct statement is:

> **In VR, wake-word and TTS are one feature, not two.** Voice-in without
> voice-out is unusable in a headset. Voice-in *with* voice-out is the only
> interaction model that works at all.

I also missed that **the missing half is already on the roadmap**: **Local reply
TTS**, ★★★★★, at [roadmap.md § Planned — Local reply TTS](../roadmap.md#planned) — "Phase 1 offline
TTS play/stop; Phase 2 character-aligned read-aloud". Its `Dedup` line
explicitly separates it from wake-word. For Deck use that separation is right.
**For VR it is the wrong seam**, and that is worth recording: Frame is the case
that makes TTS a dependency of wake-word rather than a sibling of it.

**So: does Frame justify wake-word? Not on its own — it justifies the pair.**
And the pair is worth more than the sum, because TTS is independently useful on
the Deck today (eyes on the game, answer in your ears) and does not need a
headset to pay for itself.

#### The Frame-specific wrinkle that actually decides this

**Whose microphone is it?** In workflow A the mic is on the Deck, across the
room, while you are wearing a headset — it will not hear you well, and bonsAI
has no way to reach the Frame's dual mic array. **Wake-word in the companion
configuration does not even get the input half.**

In the host-PC configuration (§3, Path A), the Frame's mic routes to the host as
a capture device and bonsAI's audio is on the same machine SteamVR is on. **Both
halves work.** This is a concrete reason the architecture question in §3 is
upstream of the voice question — and a reason not to bolt Frame justification
onto the wake-word item while it is still Deck-shaped.

#### Is there a problem with wake-word I should know about?

Nothing new, and nothing Frame introduces. The known costs are already recorded:

- **CPU contention during gameplay.** Whisper runs `WHISPER_THREADS=4` on the
  Deck APU, and the follow-up doc states the tradeoff plainly: *"More CPU/battery
  while the mic is active; may contend with heavy games"*
  ([docs/archive/voice-input-follow-up.md:24-27](../archive/voice-input-follow-up.md)).
  Always-on listening changes that from session-scoped to continuous.
- **Deck CPU fragility in this path.** The voice engine required a CPU-safe
  compile (`GGML_NATIVE=OFF`) after prebuilt binaries **SIGILL**'d on Deck Zen 2
  ([same doc:11](../archive/voice-input-follow-up.md)). That history is a reason
  to be careful, not a blocker.
- **It is genuinely unbuilt.** `voice_transcription_service.py:6` — *"Does not:
  … run wake-word detection"*; `voice_whisper_daemon.py:3` calls it *"future
  wake-word STT"*.

None of these are Frame problems. **The one thing to be aware of is the output
channel**, and it has a roadmap item already.

| Workflow | Fits today | Needed | Verdict |
|---|---|---|---|
| A — Deck on LAN | ✅ entirely | none | **ship docs for it** |
| B — phone/tablet | ❌ | HTTP server + second UI | permanently out |
| C — voice | ⚠️ | wake-word **+ TTS as one feature**, and the right mic | **right direction; blocked on §3, not on VR** |

---

## 3. The two architectural paths *(new)*

The first pass only evaluated "run bonsAI on the Frame". There are two paths,
and the one it missed is the better one.

### Path A — Host-PC OpenVR overlay ⭐ **the one that meets the Frame where it is**

When a Frame streams a game, **SteamVR runs on the host PC**, which connects to
the headset through the bundled adapter
([UploadVR](https://www.uploadvr.com/valve-steam-frame-official-announcement-features-details/)).
SteamVR overlays are **separate processes on that same machine**: Valve built
third-party overlays such that "the game and overlay app are separate processes
independently communicating with SteamVR via OpenVR", with SteamVR coordinating
layers and input
([Fred Emmott, In-Game Overlays](https://fredemmott.com/blog/2022/05/31/in-game-overlays.html);
[OpenVR API docs](https://github.com/ValveSoftware/openvr/wiki/API-Documentation)).

Consequences, all of them good:

- **x86_64.** No ARM64 build, no FEX, no Decky port. Every blocker in §5-B2 and
  §5-B4 evaporates.
- **Shipping precedent, today.** OVR Toolkit, XSOverlay, Desktop+, and
  OpenVR-AdvancedSettings all do exactly this. Desktop+ specifically ships
  **CEF-based browser overlays** ([DesktopPlus](https://github.com/elvissteinjr/DesktopPlus)),
  which is the shape bonsAI's React bundle would need.
- **Ollama is already local.** The overlay and the model are on the same box —
  `127.0.0.1:11434`, no LAN hop.
- **Both halves of voice work** (§2C): the headset mic is a capture device on
  that machine, and TTS plays back through the stream.
- **Works on Index, Quest-over-Link, and every other SteamVR headset**, not just
  Frame. The addressable surface is "SteamVR users", not "Frame owners".

What it costs: this is **not a Decky plugin**. It is a second delivery target —
its own process, its own lifecycle, its own way to host the UI and reach the
Python backend without Decky RPC. That is exactly the seam question 11 (*Native
QAM shortcut tile / decouple from Decky*) is poking at, and the two should be
researched **together**: whatever lets bonsAI render outside Decky is the same
thing that lets it render into an OpenVR overlay.

**Honest LoE:** a research spike is **★★**. A minimal working overlay that hosts
the existing bundle is **★★★★★** and would be a new product surface, not a
feature. Neither should start before question 11 is answered.

### Path B — On-Frame (bonsAI in the Frame's own QAM) ⚠️ **one blocker, not four** **[revised 2026-08-04]**

The first two revisions treated this as blocked on four independent things. Two
of them have since resolved in its favour:

- **The shell exists and is the right shell.** Hands-on coverage reports the
  Frame's menu is "practically a match for the Steam Deck or Big Picture UI but
  floating in space", with Portal 2 running on a large virtual display "as if on
  a giant Steam Deck", plus an accessible Linux desktop
  ([PC Gamer hands-on](https://www.pcgamer.com/hardware/vr-hardware/hands-on-steam-frame-impressions/),
  [UploadVR hands-on](https://www.uploadvr.com/valve-steam-frame-hands-on-impressions/)).
  If the Frame runs gamepadui, it runs the *same* `steamloopback.host` CEF
  surface Decky injects into. See §5-B3.
- **The microphone problem disappears.** In this configuration the Frame's dual
  mic array and bonsAI are on the same device. The §2C objection was entirely
  about the mic being on the wrong machine; on-Frame, it isn't.
- **STT would port cleanly.** bonsAI already compiles whisper from source
  on-device with `GGML_NATIVE=OFF`
  ([voice-input-follow-up.md:11](../archive/voice-input-follow-up.md)); ARM64 is
  whisper.cpp's best-supported target, not a risk.

What remains: **B2, the ARM64 Decky binary** — and B4 (dead AMD-specific
features) as cosmetic debt. That is a much narrower gap than "weak on every
axis", and B2 is not ours to close. Standalone is still the mode where the
Frame's graphics budget is fully committed (HL:Alyx at 40–50 fps low), but §4
now separates *graphics* budget from *inference* budget, and they are not the
same pool.

**Still not where to spend build effort — but it is now a reasonable thing to
watch rather than a dead end.** The leading indicator is a single event: Decky
publishing an `aarch64` `PluginLoader`.

---

## 4. Can the Frame run local AI? *(rev. 2026-08-04)*

**Revised answer: "worse than the Deck" was right about *Ollama* and wrong about
*the hardware*.** **[corrected]** The Frame has real dedicated AI silicon — a
Hexagon NPU — and llama.cpp now ships an official backend for it. The gap is a
**runtime** gap, not a silicon gap, and it lands squarely on a decision this
repo already made.

### Where the "it'll be better at AI" claim is right

1. **There is a dedicated NPU, not just an APU.** Qualcomm's own 8 Gen 3
   material claims ~15–20 tok/s for a 7B-class model on-device
   ([XDA](https://www.xda-developers.com/qualcomm-snapdragon-8-gen-3/)).
2. **llama.cpp supports it officially.** Per
   [llama.cpp docs/backend/snapdragon](https://github.com/ggml-org/llama.cpp/blob/master/docs/backend/snapdragon/README.md):
   *"llama.cpp supports three backends on Snapdragon-based devices: CPU, Adreno
   GPU (GPUOpenCL), and Hexagon NPU"*, covering Hexagon v73/v75/v79/v81. Its own
   measured figures for Llama-3.2-1B on Hexagon v79: **~51.5 tok/s generation,
   ~136–169 tok/s prompt**. For bonsAI's small-model workloads that is genuinely
   fast.
3. **Streaming frees the SoC — this is a real advantage and I under-weighted it.**
   When the game streams from a PC, the Frame is decoding video and running
   tracking, not rendering. Its CPU/NPU is comparatively idle. That is
   *structurally better than the Deck*, which renders the game **and** runs the
   model on the same silicon.
4. **It is even better than running the model on a busy host.** A PC driving VR
   at 90–144 Hz has no GPU headroom to spare; a 7B model on that GPU steals from
   the game. A model on the headset's otherwise-idle NPU does not. **That is a
   legitimately good argument and it survives scrutiny.**
5. **NPUs are efficiency parts.** The "21.6 Wh on your face" objection is much
   weaker for NPU inference than for CPU inference.

### Where it still does not work today

1. **bonsAI ships against Ollama, and Ollama cannot use any of this.** Ollama on
   Linux ARM64 is **CPU-only** — no CUDA, no ROCm, no Vulkan
   ([DeepWiki: GPU support](https://deepwiki.com/ollama/ollama/6-gpu-and-hardware-support)),
   and there is no Hexagon backend. Every number in the section above belongs to
   **llama.cpp**, a runtime this repo evaluated and parked:
   *"Stay Ollama-only for shippable Deck UX"*
   ([docs/archive/spikes/llama-cpp-provider.md](../archive/spikes/llama-cpp-provider.md)).
   **So the real dependency for on-Frame AI is not the Frame — it is reopening
   the llama.cpp provider.** That is worth knowing regardless of whether the
   Frame ever ships.
2. **The NPU under-delivers versus the marketing.** Practitioners report
   reaching ~0.5 TOPS against a 45-TOPS headline figure, with FastRPC dispatch
   overhead of ~230 calls per token (~17 ms on a 23-layer model)
   ([llama.cpp#18139](https://github.com/ggml-org/llama.cpp/issues/18139)). The
   backend is labelled **experimental** in llama.cpp's own logs. A Snapdragon 8
   **Elite** — newer than the Frame's 8 Gen 3 — has been measured at **5.1 tok/s
   for Llama 3.1 8B** on the NPU. Fast for 1B, slow for 8B.
3. **Bandwidth is still behind for any CPU/GPU path** (below). This binds
   whenever you are *not* on the NPU — which, with Ollama, is always.

### The bandwidth table (unchanged, and still the CPU/GPU ceiling)

| | Steam Deck | Steam Frame |
|---|---|---|
| Memory | 16 GB LPDDR5-5500, quad 32-bit channels | 16 GB LPDDR5X-4800 |
| **Bandwidth** | **~88 GB/s** ([Valve's corrected spec](https://www.pcgamer.com/steam-deck-memory-channels-lpdd5/)) | **~77 GB/s** ([8 Gen 3 spec](https://nanoreview.net/en/soc/qualcomm-snapdragon-8-gen-3)) |
| Ollama GPU accel | amd64 path exists (ROCm / experimental Vulkan) | **none — Linux ARM64 is CPU-only in Ollama** ([DeepWiki: GPU support](https://deepwiki.com/ollama/ollama/6-gpu-and-hardware-support)) |
| Power budget | 40 Wh, on a table | **21.6 Wh, on your face, 1.5–2 h** |
| Sustained load | fans, held in hands | **~12% dip after 45 min** |

~12% less bandwidth than the Deck is roughly a ~12% ceiling on tokens/sec for
any CPU or GPU path, before anything else. Adreno/OpenCL does not rescue it:
the OpenCL backend gives a large *prefill* speedup but has been reported ~17%
**slower** at token generation on 7B due to per-token CPU-GPU sync
([llama.cpp OPENCL.md](https://raw.githubusercontent.com/ggml-org/llama.cpp/master/docs/backend/OPENCL.md)).
The NPU is the only path where the Frame plausibly beats the Deck.

### Net position

| Configuration | Verdict |
|---|---|
| **Big model (7B+) on a LAN PC with a GPU** | **Best by a wide margin.** Unchanged recommendation |
| Big model on the Frame, game streamed | Viable *in principle* on NPU; needs llama.cpp + Hexagon; ~5 tok/s class on a newer chip than Frame's |
| **Small model (1B-class), thinking blurbs, STT, TTS on the Frame** | **Genuinely good on NPU** — ~51 tok/s measured for 1B. The most defensible on-Frame case |
| Anything on the Frame via **Ollama** | CPU-only, bandwidth-bound, worst of both |

**Where the small local stuff could live:** Whisper `tiny.en`, a small TTS voice,
and thinking-blurb-class models are exactly the workloads the NPU is good at, and
exactly the ones that would run on-Frame without touching the graphics budget.
That is the strongest version of the on-Frame argument and it holds up.

**But note where it routes:** every on-Frame AI path goes through **llama.cpp**,
not Ollama. The gating decision is therefore the parked llama.cpp provider spike
— not anything about Valve's hardware. If that spike is ever reopened, do it for
Deck reasons; Frame support would then follow almost for free.

---

## 5. Blockers, re-ranked

**B1 — Frame has not shipped.** *Severity: total for anything empirical.*
No price, no date. Every on-device claim here is unverifiable. This does not
block *preparation* — Path A runs on technology shipping today.

**B2 — Decky Loader is x86_64-only.** *Severity: total for Path B. Not ours.*
Release `v3.2.6` publishes exactly **one** `PluginLoader` asset, PyInstaller-built
in CI on `runs-on: ubuntu-22.04` (x86_64) — `.github/workflows/build.yml` in
`SteamDeckHomebrew/decky-loader`. The installer performs no architecture check;
it downloads that binary and registers it as a systemd service, so on ARM64 it
would fail to exec. The project's stated position is Deck-SteamOS-only with
[no plans to support other operating systems](https://github.com/SteamDeckHomebrew/decky-loader).
*Your read that "ARM is to FEX as Linux is to Proton" is fair as a direction of
travel* — Valve is clearly pushing Arch toward ARM64 — **but FEX translates
userspace game code, not a systemd-managed daemon that injects into the Steam
client. Nobody has demonstrated that, and it is not bonsAI's to demonstrate.**
**Path A does not need this solved at all.**

**B3 — Injection target in VR.** *Revised twice: negative → plausible → **likely**.* **[corrected]**

**2026-08-04:** hands-on coverage reports the Frame's menu is **"practically a
match for the Steam Deck or Big Picture UI but floating in space"**, with Portal
2 on a large virtual display "as if on a giant Steam Deck"
([PC Gamer hands-on](https://www.pcgamer.com/hardware/vr-hardware/hands-on-steam-frame-impressions/);
[UploadVR hands-on](https://www.uploadvr.com/valve-steam-frame-hands-on-impressions/)
independently describes theater-mode flat games and an accessible Linux desktop).
If the Frame's home is gamepadui, then it is *literally the same CEF surface*
Decky already attaches to — `steamloopback.host` — and this blocker largely
evaporates, leaving **B2 as the only hard one for Path B.** Confidence: good on
the reporting, not yet confirmed at the process level. *(I could not retrieve the
full PC Gamer article body directly; the quote is as surfaced in search results
and is corroborated in substance by the UploadVR hands-on.)*

Supporting evidence from the VR side: **SteamVR's dashboard is CEF-based.** It
runs a `vrwebhelper` process — disable-able via
`STEAMVR_WEBHELPER=0`, with a Linux-specific issue tracked at
[SteamVR-for-Linux#465](https://github.com/ValveSoftware/SteamVR-for-Linux/issues/465)
— and Valve "uses the Chromium Embedded Framework (CEF), which is built into the
Steam Client application". So the in-VR QAM is *a web surface*, structurally the
same kind of thing bonsAI already renders into.

That does **not** mean it is the `steamloopback.host` document Decky attaches to
(`decky-loader` → `backend/decky_loader/injector.py`, filtering on
`https://steamloopback.host/routes/` and `/index.html`) — `vrwebhelper` is
historically a separate process from the client UI. But "the VR shell is CEF" is
a materially better starting position than "unknown surface", and it is the
concrete thing an LoE investigation would go measure: **on a PC running SteamVR
today, enumerate the CEF targets `vrwebhelper` exposes and see whether the new
dashboard QAM is served from a `steamloopback` context or its own.** That
experiment needs no Frame.

**B4 — bonsAI's hardware layer is AMD/Deck-specific.** *Severity: high for Path
B, zero for Path A.*
`find_amdgpu_hwmon()` at
[py_modules/backend/services/tdp_service.py:30](../../py_modules/backend/services/tdp_service.py);
amdgpu `power1_cap` grounding at
[ollama_prompts.py:339](../../py_modules/backend/services/ollama_prompts.py);
clamp bounds explicitly "Steam Deck class"
([tdp_service.py:14](../../py_modules/backend/services/tdp_service.py)). Degrades
honestly rather than lying (`:356` — "Do not invent a current wattage"), but on
Snapdragon every TDP feature is dead weight.

**B5 — Screenshots.** *Severity: medium; flips sign between paths.*
[screenshot_media.py:43-54](../../py_modules/backend/services/screenshot_media.py)
globs `<steam-root>/*/760/remote/<app>/screenshots/*` **locally**. In workflow A
the screenshots are on the host PC and the Deck sees an empty browser. **In Path
A this blocker disappears** — the overlay is *on* the machine where the
screenshots land, and the game's own frames are right there. Screenshot-attach in
VR goes from "hard" to "the easiest thing on the list" purely by moving where the
code runs.

**B6 — LAN inference. Already solved.** `OLLAMA_HOST=0.0.0.0`, TCP 11434,
firewall, optional mDNS, manual IP fallback — all documented at
[docs/troubleshooting.md:361-389](../troubleshooting.md).

**B7 — Immersive UI-scale profile.** *Severity: low; motivation void either way.*
`SHOW_IMMERSIVE_UI_SCALE = false` at
[src/data/uiScaleProfile.ts:37](../../src/data/uiScaleProfile.ts), commented
"Steam Frame proxy". The classifier keys only on viewport/screen width
([`detectDisplayContext`, :77-95](../../src/data/uiScaleProfile.ts)) so it has no
Frame signal to read. Under Path A it *would* eventually matter — an overlay
panel at ~1 m virtual distance is exactly a large-close-range display — but the
profile should still be judged on its own merits, not held hostage to VR.
`normalizeUiScaleProfileId` already downgrades it to `handheld` when the flag is
off ([:119-122](../../src/data/uiScaleProfile.ts)), so either decision is cheap.

**B8 — Remote Play diagnostics** ([roadmap.md § Planned](../roadmap.md#planned)) —
separate item. Frame streaming is a Remote Play case; noted, not folded in.
Packet diagnostics out of scope per the brief.

---

## 6. UX / safety disclaimers

### The constraint that governs all of it

**bonsAI has no Frame telemetry and will not have any** in any near-term path.
No headset state, no VR framerate, no reprojection counter, no display target.
Every line must read as *general guidance*, never as observation — the same
discipline the TDP path already applies when sysfs is unreadable
([ollama_prompts.py:356](../../py_modules/backend/services/ollama_prompts.py)).
Second constraint: **no health claims** — comfort settings, not medical advice.

### The existing stubs, reviewed

Four `steam_frame` tips at
[scripts/gen_compat_patterns.py:164-168](../../scripts/gen_compat_patterns.py)
(the generator; `data/kb/compat_patterns.json` is output and must not be
hand-edited).

| Current line | Assessment |
|---|---|
| "companion Deck/phone on LAN for bonsAI while HMD in-game" | **Keep, fix** — "phone" is wrong, no phone surface exists |
| "Frame comfort: reduce locomotion intensity; seated playspace reduces nausea" | **Keep** — generic, no telemetry or health claim |
| "Frame theater mode: wrong display target can mirror desktop instead of HMD" | **Rewrite or drop** — unsourced; nothing found substantiates this specific failure mode |
| "Frame companion UX is research-phase; verify Valve docs before assuming APIs" | **Drop** — a maintainer note that leaked into a user-facing corpus |

### Proposed corpus after v1 (topic `steam_frame`, platform `frame`)

Starting wording, not final copy:

1. Frame + bonsAI: run bonsAI on a Deck on the same LAN; there is no in-headset bonsAI.
2. Point bonsAI at the PC hosting your Frame stream — `http://<PC-IP>:11434`, `OLLAMA_HOST=0.0.0.0`, allow TCP 11434.
3. The PC streaming your game is the best place to run the model — same machine, no extra hop.
4. Frame comfort: reduce locomotion intensity; a seated playspace reduces nausea. *(unchanged)*
5. VR framerate misses feel worse than flat-screen ones — prefer a lower refresh that holds over a higher one that stutters.
6. Screenshots taken while streaming save on the host PC, not on your companion Deck.
7. If a 2D game opens on the wrong display, check the display/output target before changing graphics settings. *(replaces the unsourced theater-mode line; true generally)*

### Where each disclaimer lives

| Copy | Home |
|---|---|
| "bonsAI does not run on Steam Frame; use a Deck on the LAN" | [README.md § Requirements](../../README.md) (~:91-96) |
| LAN host pointing for a Frame session | [README.md § Where Ollama runs](../../README.md) (~:99-105), one added row |
| Comfort / framerate / display-target | KB tips only |
| **Nothing in Ask replies** | Do not special-case Frame in prompt construction — tips reach Ask via normal KB retrieval; a hardcoded paragraph would fire for people who own no headset |

---

## 7. Phased recommendation

| Phase | Scope | Effort | Gate |
|---|---|---|---|
| **0 — this document** | Feasibility memo | ★ | done |
| **1 — v1, recommended** | Rewrite 4 KB stubs → ~7 tips; README Requirements line + Where-Ollama-runs row | **★★** | none |
| **1b — prepare, recommended** | **OpenVR overlay LoE spike** (§3 Path A), run jointly with Q11 "decouple from Decky" | **★★** | needs a SteamVR PC — **no Frame required** |
| **2 — deferred** | Immersive UI-scale QA | ★★★ | decouple from Frame first |
| **3 — long** | bonsAI as a host-PC OpenVR overlay | ★★★★★ | 1b + Q11 |
| **4 — likely never** | On-Frame standalone bonsAI (Path B) | ★★★★★★★ | B1 + B2 + B3, none owned by us |

**Phase 1b is the answer to "how far am I willing to meet the Frame where it
is."** It is cheap, needs no unreleased hardware, and every question it answers
is useful even if the Frame never ships:

1. Enumerate `vrwebhelper`'s CEF targets on a SteamVR PC; determine whether the
   new dashboard QAM is a `steamloopback` context or its own document. (Decides
   B3, and decides whether "inject" or "own overlay process" is the shape.)
2. Stand up a throwaway `IVROverlay` dashboard overlay hosting a static page —
   measure input model (laser pointer vs controller focus), text legibility at
   overlay scale, and whether D-pad focus semantics survive. (This is the real
   risk to bonsAI's UI, which is built around a focus graph.)
3. Confirm the headset mic reaches the host as a normal capture device during a
   streamed session. (Decides §2C.)
4. Note what gamescope/BPM assumptions bonsAI's scoped CSS makes that would not
   hold in an overlay panel.

**Deliverable location:** this file, matching questions 1–8. If 1b runs, its
output belongs in `docs/archive/spikes/` — that directory holds *executed*
spikes with an artifact ([llama-cpp-provider.md](../archive/spikes/llama-cpp-provider.md)
shipped an env-gated POC).

---

## 8. Go / no-go

**Ship: GO on Phase 1 (★★). Prepare: GO on Phase 1b (★★). Build: NO on
everything else.** Confidence high.

Is this a bonsAI product fit? **The companion half is, today, for free. The VR
half is a fit only if bonsAI grows a non-Decky delivery target — and that is a
decision about question 11, not about Valve's headset.** The useful thing this
research produced is that those two questions are the *same* question, and the
Frame is not the reason to answer it — it is just the loudest argument for
answering it.

The prepare-track framing is right and the first pass was too quick to close it
off. But the preparation that pays is **OpenVR overlay LoE on hardware that
exists**, not speculation about Frame internals. If Path A ever gets built, it
serves every SteamVR headset and Frame comes along for free — which is a much
better bet than building for one unreleased device.

### Explicitly out of scope for Frame v1

- Any in-HMD rendering, overlay, or panel **as a v1 deliverable** (Path A stays a
  research spike until Q11 resolves)
- A native Frame app, APK, or ARM64 build of anything
- Porting or vendoring Decky Loader for ARM64
- A phone/tablet/browser companion UI, or any HTTP surface in the plugin
- On-Frame local inference (§4)
- Frame detection, Frame telemetry, or any `isFrame`-style runtime branch
- Frame-specific prompt construction in Ask
- Deck-as-streaming-host as a supported configuration
- Remote Play packet diagnostics (separate item)
- FEX-Emu beyond the two existing `fex` KB tips as context

### Suggested `Decisions needed` entries

Per `CLAUDE.md` locked product calls live in [maintainer-decisions-locked.md](../audit/maintainer-decisions-locked.md) (moved from roadmap 2026-08-04). Planned backlog: [roadmap.md § Planned](../roadmap.md#planned).

1. **Re-rate Steam Frame companion UX ★★★★★★ → ★★, and split off a Phase 1b
   OpenVR LoE spike?** Options: (a) re-rate + add the spike; (b) re-rate only;
   (c) leave as-is until Frame ships.
2. **Should Local reply TTS become a dependency of Wake-word rather than a
   sibling?** Their current `Dedup` lines separate them
   ([roadmap.md § Planned — Local reply TTS](../roadmap.md#planned)). For VR — and arguably for eyes-on-game
   Deck use — voice-in without voice-out is half a feature. Options: (a) make
   TTS Phase 1 a hard dependency of wake-word; (b) keep separate, note the
   pairing; (c) no change.
3. **Immersive UI-scale profile — keep, un-gate, or delete?** Its Frame
   justification is void; its large-close-range-display justification is not.
4. **Does an unsourced KB tip get to stay?** The "theater mode / wrong display
   target" line asserts a failure mode this research could not substantiate.
5. **Reopen the llama.cpp provider spike?** §4 establishes that *every* on-device
   AI path on ARM64 — Adreno and Hexagon NPU alike — runs through llama.cpp, and
   Ollama has neither. The spike was parked for Deck reasons
   ([llama-cpp-provider.md](../archive/spikes/llama-cpp-provider.md)). Options:
   (a) leave parked, accept that on-Frame AI is out of reach; (b) reopen on Deck
   merit and treat ARM64/NPU as a downstream bonus; (c) reopen specifically to
   evaluate the Hexagon backend. **Do not reopen it *because of* the Frame** —
   the Frame is evidence, not a reason.

---

## Open risk — what I could not verify

Everything about how Frame software behaves in someone's hands; it has not
shipped. The two blockers that decide the *shipping* recommendation (B1
availability, B2 Decky architecture) are verifiable today and firm. The ones that
decide the *preparation* recommendation (B3 injection target, mic routing,
overlay input model) are all measurable **on a SteamVR PC that exists right
now** — which is why Phase 1b is worth doing and Path B is not.

**Re-open this document if:** **Decky publishes an `aarch64` `PluginLoader`**
(the single leading indicator for Path B); Valve documents the Frame's on-device
XR runtime; the llama.cpp provider spike is reopened; or question 11 lands a
non-Decky delivery target.

---

## Changelog

- **2026-08-04** — Rev. 3: §5-B3 upgraded to **likely** (hands-on reporting says
  the Frame menu matches the Deck/BPM UI — i.e. probably the same
  `steamloopback.host` surface); §3 Path B narrowed from four blockers to one
  (B2), with the mic and STT objections withdrawn; §4 rewritten — the Hexagon
  NPU is real, llama.cpp supports it officially, and the streaming-frees-the-SoC
  argument is credited. "Worse than the Deck" corrected to "worse via Ollama;
  the gap is a runtime gap, not a silicon gap."
- **2026-08-04** — Rev. 2: added §3 (host-PC OpenVR overlay path), §4 (Frame as
  an inference host), Phase 1b. Corrected §2C (voice conclusion was wrong; TTS
  roadmap item was missed), §5-B3 (`vrwebhelper` is CEF — upgraded from "leaning
  negative" to "plausible"), and dropped Deck-as-streaming-host.
- **2026-08-03** — Created. Research-only; no code or roadmap changes.
