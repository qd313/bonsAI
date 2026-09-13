#!/usr/bin/env python3
"""One-off generator for data/kb/compat_patterns.json (Phase 3 seed)."""
from __future__ import annotations

import json
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
OUT = REPO / "data" / "kb" / "compat_patterns.json"

tips: list[dict] = []
pid = 1
license = "bonsAI-maintainer"


def add(topic: str, platforms: list[str], card: str, url: str = "") -> None:
    global pid
    tips.append(
        {
            "pattern_id": pid,
            "topic": topic,
            "platforms": platforms,
            "card": card,
            "source_url": url,
            "source_license": license,
        }
    )
    pid += 1


# Proton (11)
# One tip that used to live here moved to Crash below (KB wave two, Lane D): "disable
# overlays when crashes happen at launch" is advice about a crash, not about Proton itself.
add("proton", ["deck", "linux"], "Verify Proton Experimental or game-forced version in game Properties > Compatibility. Clear shader cache under ~/.steam/steam/steamapps/shadercache/<appid>.")
add("proton", ["deck", "linux"], "Try fullscreen vs borderless windowed; some titles hitch only in one mode on Deck.")
add("proton", ["deck", "linux"], "Check ProtonDB for launch options and community fixes before forcing a Proton version.")
add("proton", ["deck", "linux"], "After SteamOS update, re-test with Proton Experimental; stale compat data can break until shader regen.")
add("proton", ["windows"], "On Windows Steam, Proton is not used; troubleshooting is native DirectX/Vulkan driver issues.")
add("proton", ["deck"], "Deck sleep with Proton games: if resume fails, exit to Gaming Mode home and relaunch.")
add("proton", ["deck", "linux"], "Winetricks/dotnet installs are last resort; prefer official Proton or game-specific fixes.")
add("proton", ["deck"], "Force Proton 8.x or Experimental from game Properties when default fails after title update.")
add("proton", ["deck", "linux"], "If audio crackles under Proton, try gamescope -e or disable RT audio in game settings.")
add("proton", ["deck"], "Proton log: PROTON_LOG=1 %command% captures useful launch traces to ~/steam-*.log.")
add("proton", ["steamvr"], "VR under Proton on Deck is limited; prefer native Linux VR builds or host PC streaming.")

# Deck (10)
add("deck", ["deck"], "Verify AC adapter wattage; weak USB-C hubs can throttle charge and TDP during play.")
add("deck", ["deck"], "After long sessions, check fan noise and surface temp; pause and lower TDP if throttling.")
add("deck", ["deck"], "MicroSD for library: use A2-rated cards; slow SD increases load times.")
add("deck", ["deck"], "Desktop Mode vs Gaming Mode: some fixes only apply in Desktop Mode.")
add("deck", ["deck"], "Reboot clears stuck GPU/audio states after failed game exit or suspend bugs.")
add("deck", ["deck"], "Factory reset is last resort; backup ~/.steam and compatdata paths first.")
add("deck", ["deck"], "Steam Deck verified badge is guidance; check ProtonDB for edge cases.")
add("deck", ["deck"], "USB-C dock display issues: try direct cable, update dock firmware.")
add("deck", ["deck"], "Bluetooth audio latency: prefer wired for rhythm and competitive games.")
add("deck", ["deck"], "Battery health: avoid 100% storage for weeks; occasional full cycle helps reporting.")

# Steam Machine / BPM (8)
add("steam_machine", ["steam_machine", "linux"], "Steam Machine uses SteamOS; same Proton and gamescope paths as Deck.")
add("bpm", ["deck", "linux"], "Big Picture Mode is default on Deck; Desktop Mode for Konsole and file fixes.")
add("bpm", ["deck"], "Return to Gaming Mode from Desktop via desktop icon or steam command in Konsole.")
add("desktop_mode", ["deck"], "Desktop Mode file manager can delete shader cache and compatdata when games corrupt.")
add("gaming_mode", ["deck"], "Gaming Mode QAM is safe for TDP and brightness without leaving the game.")
add("steam_machine", ["linux"], "Steam Machine class hardware: verify AMDGPU and Mesa match SteamOS channel.")
add("bpm", ["deck"], "BPM keyboard: Steam + X opens on-screen keyboard in Gaming Mode.")
add("desktop_mode", ["deck"], "Switching modes mid-game can lose fullscreen focus; exit game first.")

# Wine (6)
add("wine", ["linux"], "Non-Steam games via Wine/Proton need added as Non-Steam shortcuts with forced Proton.")
add("wine", ["linux"], "Wine prefix corruption: delete compatdata folder only after backing up saves.")
add("wine", ["deck"], "Heroic/Lutris titles are outside Steam compatdata; paths differ from Steam library.")
add("wine", ["linux"], "32-bit Wine deps on Linux: use Proton bottle instead of raw Wine when possible.")
add("wine", ["windows"], "Wine does not run on Windows; use native builds or VMs.")
add("wine", ["linux"], "DXVK/VKD3D versions ship with Proton; avoid random DLL overrides without logs.")

# Windows Steam (6)
add("windows_steam", ["windows"], "Verify game files integrity from Steam client before driver reinstalls.")
add("windows_steam", ["windows"], "Clear download cache: Steam Settings > Downloads > Clear Download Cache.")
add("windows_steam", ["windows"], "Launch options apply per game; -dx11 / -dx12 / -fullscreen flags are common.")
add("windows_steam", ["windows"], "Steam client beta vs stable: switch channel if social UI breaks after update.")
add("windows_steam", ["windows"], "Windows Game Mode and Game Bar can conflict; test with overlays off.")
add("windows_steam", ["windows"], "Antivirus scanning Steam library causes stutter; exclude library path cautiously.")

# SteamVR (8)
add("steamvr", ["steamvr", "windows"], "SteamVR requires HMD drivers; reboot HMD after GPU driver updates.")
add("steamvr", ["steamvr"], "Room setup drift: redo standing calibration and check base station angles.")
add("steamvr", ["deck"], "Deck as SteamVR host is not supported; stream from PC or use standalone HMD.")
add("steamvr", ["steamvr"], "Mirror vs headset-only display: wrong choice can black-screen the desktop.")
add("steamvr", ["steamvr"], "USB bandwidth: VR headsets need direct motherboard USB3 ports.")
add("steamvr", ["steamvr"], "OpenXR vs SteamVR runtime toggle per game in Properties or launcher.")
add("steamvr", ["steamvr"], "Controller binding conflicts: reset to default in SteamVR Input settings.")
add("steamvr", ["steamvr"], "Wireless VR: Wi-Fi 6 and line-of-sight reduce encode stutter.")

# gamescope (8)
add("gamescope", ["deck", "linux"], "Gamescope wraps the game process; resolution and FSR flags apply at launch.")
add("gamescope", ["deck"], "Deck native resolution vs scaled: lower internal res + FSR can stabilize FPS.")
add("gamescope", ["deck"], "gamescope -W/-H set output size; mismatched aspect causes letterboxing.")
add("gamescope", ["linux"], "Nested gamescope in Desktop Mode can fail; prefer Gaming Mode launch.")
add("gamescope", ["deck"], "HDR titles may need experimental SteamOS builds with gamescope.")
add("gamescope", ["deck"], "Frame limiter in gamescope can reduce fan noise when uncapped spikes occur.")
add("gamescope", ["deck"], "If game ignores resolution, set in-game resolution to match gamescope target.")
add("gamescope", ["linux"], "MangoHud + gamescope: wrap game inside gamescope first.")

# anti-cheat (8)
add("anticheat", ["deck", "linux"], "Kernel anti-cheat needs developer Proton enablement; check ProtonDB status.")
add("anticheat", ["deck"], "Easy Anti-Cheat offline modes may work when online blocked on Linux.")
add("anticheat", ["windows"], "On Windows, repair anti-cheat service via game launcher or reinstall.")
add("anticheat", ["deck", "linux"], "Secure boot rarely affects Deck; focus on Proton anti-cheat flags.")
add("anticheat", ["deck"], "Faceit/Vanguard class AC: often no Linux support; use Windows PC.")
add("anticheat", ["deck", "linux"], "After AC update, verify patch notes for Linux experimental support.")
add("anticheat", ["deck"], "Multiplayer blocked on Deck is often AC policy, not TDP misconfig.")
add("anticheat", ["linux"], "Proton BattlEye runtime: Steam may prompt install once per title.")

# streaming (8)
add("streaming", ["deck"], "Remote Play from PC: host encoding load matters; lower host resolution if client stutters.")
add("streaming", ["deck"], "Remote Play Together uses host PC; Deck as guest needs stable LAN Wi-Fi.")
add("streaming", ["deck"], "Moonlight/Sunshine: tune bitrate to 20-50 Mbps on local LAN.")
add("streaming", ["windows"], "Host-side fixes first: GPU encoder driver, HEVC support, firewall.")
add("streaming", ["deck"], "Deck as client: disable client upscale if bandwidth limited.")
add("streaming", ["deck"], "Audio chop on stream: try wired LAN or 5 GHz Wi-Fi.")
add("streaming", ["steamvr"], "VR streaming doubles encode cost; reduce supersampling on host.")
add("streaming", ["deck"], "Sleep host PC during stream drops session; wake host before reconnect.")

# storage (8)
add("storage", ["deck"], "Move library to SD: Steam Settings > Storage; move per game.")
add("storage", ["deck"], "compatdata on SD moves with game if selected; shaders may need regen.")
add("storage", ["deck"], "Internal storage full: uninstall large shaders and unused games first.")
add("storage", ["linux"], "ext4 on SD: SteamOS formats SD; do not reformat to NTFS for library.")
add("storage", ["deck"], "Repair library folder permissions if games fail to update after SD remount.")
add("storage", ["windows"], "NTFS library on Windows: avoid compressing Steam folder.")
add("storage", ["deck"], "Cloud save sync fails when storage full; free space before blaming network.")
add("storage", ["deck"], "Backup ~/.steam/steam/userdata before storage migrations.")

# updates (6)
add("updates", ["deck"], "SteamOS update stuck: reboot and retry; recovery image if boot loop.")
add("updates", ["deck"], "Game update mid-download: clear cache and verify files if manifest corrupt.")
add("updates", ["windows"], "Windows Update + GPU driver same week: reboot twice before blaming games.")
add("updates", ["deck"], "Steam client update can reset per-game Proton choice; re-check Compatibility.")
add("updates", ["linux"], "Mesa/AMD driver in SteamOS: system updates ship GPU stack.")
add("updates", ["deck"], "Rollback SteamOS only via recovery; not per-game.")

# Steam Input (10)
add("steam_input", ["deck"], "Per-game controller config: gear icon in library > Controller Options.")
add("steam_input", ["deck"], "Gyro aim: enable in controller config > Gyro > Always On for shooters.")
add("steam_input", ["deck"], "Desktop layout vs Gamepad layout: wrong template breaks controls.")
add("steam_input", ["deck"], "Steam Input vs native gamepad: force Steam Input on or off explicitly.")
add("steam_input", ["deck"], "Back paddle L4/R4: map in Controller Settings > Edit Layout.")
add("steam_input", ["windows"], "Steam Input on Windows requires Steam client in background.")
add("steam_input", ["deck"], "Multiplayer layouts: check Steam Input community configs.")
add("steam_input", ["deck"], "Keyboard mouse on Deck: Desktop Mode or Touchscreen in layout editor.")
add("steam_input", ["deck"], "Cyberpunk and FPS: community gyro templates need sensitivity tweak.")
add("steam_input", ["steamvr"], "SteamVR controllers use separate binding UI from flat Steam Input.")

# controller / gyro (12)
add("controller", ["deck"], "Bluetooth pairing: hold Steam + X, use Bluetooth in Gaming Mode.")
add("controller", ["deck"], "Wired USB controller preferred for lowest latency.")
add("gyro", ["deck"], "Calibrate gyro on flat surface before enabling gyro aim.")
add("controller", ["deck"], "PS5 DualSense on Deck: works via Bluetooth; adaptive triggers not supported.")
add("controller", ["deck"], "Xbox controller firmware updates require Windows PC or mobile app.")
add("controller", ["deck"], "Stick drift: increase deadzone in Steam Input or clean hardware.")
add("gyro", ["deck"], "Gyro jitter when walking: lower sensitivity or disable on foot sections.")
add("controller", ["deck"], "Multiple controllers: player order follows connection order.")
# Added KB wave two, Lane D -- four more everyday controller problems, ordered cheapest fix first.
add("controller", ["deck"], "Check the battery first; a controller that seems broken is often just empty.")
add("controller", ["deck"], "If a controller stops responding mid-game, disconnect and reconnect it before restarting the game.")
add("controller", ["deck"], "If it connects but no buttons do anything, forget the device and pair it again.")
add("controller", ["deck"], "Weak or missing vibration usually means it connected as a generic device, not through Steam Input.")

# Frame / FEX (9)
# The seven steam_frame tips below replace the four thin ones from before the Steam Frame
# study (docs/planning/49-steam-frame-features.md section 6, shipped 2026-09-11). They read
# as general guidance -- bonsAI has no readings from a headset and never claims one.
add("steam_frame", ["frame"], "Steam Frame with bonsAI: run bonsAI on a Steam Deck on the same home network. There is no bonsAI inside the headset.")
add("steam_frame", ["frame"], "Point bonsAI at the PC that streams your Frame games: the PC address followed by :11434. On that PC, Ollama must accept connections from other devices and port 11434 must pass the firewall.")
add("steam_frame", ["frame"], "The PC streaming your game is the best place to run the model. Same machine, no extra hop.")
add("steam_frame", ["frame"], "Frame comfort: reduce locomotion intensity; a seated playspace reduces nausea.")
add("steam_frame", ["frame"], "VR framerate misses feel worse than flat-screen ones. Prefer a lower refresh rate that holds over a higher one that stutters.")
add("steam_frame", ["frame"], "Screenshots taken while streaming save on the host PC, not on the Deck running bonsAI.")
add("steam_frame", ["frame"], "If a flat game opens on the wrong display, check the display or output target before changing graphics settings.")
add("fex", ["linux"], "FEX-Emu on ARM Linux: experimental x86 emulation; not AMD Deck path.")
add("fex", ["linux"], "FEX vs Proton: Proton is primary on Steam Deck AMD.")

# misc (6)
add("network", ["deck"], "Steam offline mode: go online once to validate licenses before offline trip.")
add("network", ["deck"], "DNS issues on hotel Wi-Fi: try manual DNS in Desktop Mode network settings.")
add("emudeck", ["deck"], "EmuDeck paths: ROMs and emulator configs live outside Steam.")
add("emudeck", ["deck"], "PCSX2 via EmuDeck: per-game settings in EmuDeck menu.")
add("linux", ["linux"], "Flatpak Steam vs native: Deck uses system Steam; do not mix library paths.")
add("shader", ["deck"], "Shader pre-cache missing: first launch stutters until cache builds.")

# Crash, performance, audio and display (KB wave two, Lane D). These four subjects had one
# or two tips each and neither crash tip actually helped: game mode has no desktop to crash
# to, and a kernel panic note is not useful advice on its own. Rewritten and expanded so a
# plain troubleshooting question gets more than a shrug, ordered cheapest/most likely first.

# Crash (9, including the overlay tip moved down from Proton above)
add("crash", ["deck"], "On the Deck a crash drops you back to the game library, not to a desktop -- there is no desktop to check.")
add("crash", ["deck", "linux"], "Disable Steam overlay and third-party overlays when crashes happen at launch.")
add("crash", ["deck"], "Try forcing a different Proton version, or Proton Experimental, from the game's Properties > Compatibility tab.")
add("crash", ["deck"], "Clear the shader cache under ~/.steam/steam/steamapps/shadercache/<appid> and let it rebuild.")
add("crash", ["deck"], "Verify the game's files from the Steam library; a broken download is a common crash cause.")
add("crash", ["deck"], "Check free storage space -- a nearly full drive can crash a game at launch or while saving.")
add("crash", ["deck"], "Update both the game and SteamOS before digging further; a version mismatch is a frequent cause.")
add("crash", ["deck"], "A real kernel panic (not just a game crash) is rare on Deck -- note the SteamOS version and last game if it happens.")
add("crash", ["deck"], "If only one game crashes and everything else runs fine, the game is the more likely cause.")

# Performance (10)
add("performance", ["deck"], "TDP cap in QAM affects CPU/GPU together; lowering reduces heat.")
add("performance", ["deck"], "30 FPS cap can stabilize frame pacing vs uncapped stutter.")
add("performance", ["deck"], "If the game stutters, lower the resolution or turn on FSR before changing anything else.")
add("performance", ["deck"], "Cap the frame rate to what the game can hold steady -- a lower steady rate beats an uneven higher one.")
add("performance", ["deck"], "Lower the TDP limit in Quick Settings if the Deck feels hot or the fan is loud.")
add("performance", ["deck"], "Plug in the charger during demanding games; the Deck slows itself down on low battery.")
add("performance", ["deck"], "Turn off motion blur and other post-processing effects; some games run noticeably smoother without them.")
add("performance", ["deck"], "Verify the game's files if performance suddenly got worse right after an update.")
add("performance", ["deck"], "Give the game a minute after launch -- shaders compiling for the first time cause stutter that goes away.")
add("performance", ["deck"], "Close other apps and background downloads before a demanding game to free up memory.")

# Audio (8)
add("audio", ["deck"], "No audio after suspend: toggle volume, switch output in Quick Settings.")
add("audio", ["deck"], "Check the output device in Quick Settings -- the Deck can switch to a disconnected Bluetooth device.")
add("audio", ["deck"], "Re-pair Bluetooth headphones if the audio crackles or cuts in and out.")
add("audio", ["deck"], "Use a wired connection for rhythm or competitive games; Bluetooth audio adds a small delay.")
add("audio", ["deck"], "If there is no sound at all, check the in-game audio settings too, not just the Deck's.")
add("audio", ["deck"], "Restart the game if sound stops mid-session; it is usually the game's audio, not the hardware.")
add("audio", ["deck"], "Try a different USB-C dock or cable if audio through a dock cuts out or hums.")
add("audio", ["deck"], "Update the game if audio broke right after a patch; a fix is usually already out.")

# Display (8)
add("display", ["deck"], "External monitor blank: try HDMI direct, 1080p60, disable overscan.")
add("display", ["deck"], "If the screen looks torn while moving the camera, turn on V-Sync in the game's display settings.")
add("display", ["deck"], "Set an external display to 1080p60 first -- higher settings can show a blank screen until confirmed working.")
add("display", ["deck"], "Use a direct HDMI cable instead of an adapter chain if an external monitor shows nothing.")
add("display", ["deck"], "Lower the in-game resolution if the picture looks blurry on the built-in screen.")
add("display", ["deck"], "Turn off HDR in the game if colors look washed out or too dark on the built-in screen.")
add("display", ["deck"], "If the picture stutters rather than tears, that is a performance problem, not a display one.")
add("display", ["deck"], "Restart the game after changing display settings; some games only apply them on the next launch.")

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(tips, indent=2) + "\n", encoding="utf-8")
print(f"Wrote {len(tips)} tips to {OUT}")
