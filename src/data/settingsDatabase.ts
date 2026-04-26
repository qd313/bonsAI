/**
 * This settings catalog powers in-plugin search/navigation across Steam and QAM settings.
 * Keeping it in a dedicated module reduces noise in the main UI orchestration file.
 */
export const SETTINGS_DATABASE = [
  // System
  "Settings > System > Select preferred language",
  "Settings > System > Software Updates",
  "Settings > System > OS Update Channel",
  "Settings > System > Steam Client Update Channel",
  "Settings > System > 24-hour clock",
  "Settings > System > Timezone",
  "Settings > System > Enable Developer Mode",
  "Settings > System > Show Switch to Desktop option when not logged in",
  "Settings > System > SteamOS Crash Report",
  "Settings > System > Enable Application Crash Report Collection",
  "Settings > System > Enable Kernel Crash Report Collection",
  "Settings > System > Enable GPU Crash Report Collection",
  "Settings > System > Enable System Info Collection",
  "Settings > System > Enable Driver Crash Report Collection",
  "Settings > System > Run storage device maintenance tasks",
  "Settings > System > Enable updated fan control",
  "Settings > System > Format SD Card",
  "Settings > System > Hardware",
  "Settings > System > About",

  // Security
  "Settings > Security > On system wake and power up",
  "Settings > Security > When switching to desktop mode",
  "Settings > Security > Change PIN",
  "Settings > Security > Lock Screen",

  // Internet
  "Settings > Internet > Offline Mode",
  "Settings > Internet > Enable Wi-Fi",
  "Settings > Internet > HTTP Proxy",
  "Settings > Internet > Delete Web Browser Data",

  // Notifications
  "Settings > Notifications > Show Notification Toasts",
  "Settings > Notifications > Play a sound when a notification toast is displayed",
  "Settings > Notifications > Client Notifications",
  "Settings > Notifications > Friend Notifications",
  "Settings > Notifications > Flash window when I receive a chat message",
  "Settings > Notifications > Steam Notifications",
  "Settings > Notifications > Family Notifications",

  // Display
  "Settings > Display > Brightness",
  "Settings > Display > Enable Adaptive Brightness",
  "Settings > Display > Automatically Set Resolution",
  "Settings > Display > Automatically Scale User Interface",
  "Settings > Display > Automatically Scale Image",
  "Settings > Display > Schedule Night Mode",
  "Settings > Display > Night Mode Tint",
  "Settings > Display > Enable HDMI CEC Support",
  "Settings > Display > Wake TV when device resumes from sleep",
  "Settings > Display > Status LED Brightness",
  "Settings > Display > Magnifier Scale",
  "Settings > Display > Maximum Game Resolution",
  "Settings > Display > External display safe mode",
  "Settings > Display > Enable HDR",
  "Settings > Display > SDR content brightness (on HDR)",
  "Settings > Display > Use Native Color Temperature",
  "Settings > Display > Adjust Display Colors",

  // Power
  "Settings > Power > Battery Percentage",
  "Settings > Power > Enable battery charging limit",
  "Settings > Power > On battery power, dim after",
  "Settings > Power > When plugged in, dim after",
  "Settings > Power > On battery power, sleep after",
  "Settings > Power > When plugged in, sleep after",
  "Settings > Power > Enable display-off downloads on battery power",
  "Settings > Power > Finish downloads with display off before sleeping",

  // Audio
  "Settings > Audio > Output Device",
  "Settings > Audio > Input Device",
  "Settings > Audio > Enable UI sounds",
  "Settings > Audio > Microphone Volume",
  "Settings > Audio > Echo Cancellation",

  // Bluetooth
  "Settings > Bluetooth > Bluetooth",
  "Settings > Bluetooth > Show all devices",

  // Controller
  "Settings > Controller > Controller Name",
  "Settings > Controller > Identify Controller",
  "Settings > Controller > Game rumble",
  "Settings > Controller > Use Nintendo Button Layout",
  "Settings > Controller > Universal Face Button Glyphs",
  "Settings > Controller > Test Device Inputs",
  "Settings > Controller > Calibration & Advanced Settings",
  "Settings > Controller > Desktop Layout",
  "Settings > Controller > Guide Button Chord Layout",

  // Keyboard
  "Settings > Keyboard > Current Keyboard Theme",
  "Settings > Keyboard > Haptics",
  "Settings > Keyboard > Initial Location (Desktop)",
  "Settings > Keyboard > Initial Location (Overlay)",
  "Settings > Keyboard > Active Keyboards",
  "Settings > Keyboard > Enable Trigger Click",
  "Settings > Keyboard > Trackpad Sensitivity",

  // Customization
  "Settings > Customization > Use as Wake Movie",
  "Settings > Customization > Shuffle startup movie",
  "Settings > Customization > UI Scale",

  // Accessibility
  "Settings > Accessibility > UI Scale",
  "Settings > Accessibility > High Contrast Mode",
  "Settings > Accessibility > Reduce Motion",
  "Settings > Accessibility > Color Filter",
  "Settings > Accessibility > Mono Audio",
  "Settings > Accessibility > Enable Screen Reader",

  // Friends & Chat
  "Settings > Friends & Chat > Display Nickname",
  "Settings > Friends & Chat > Group friends together by game",
  "Settings > Friends & Chat > Hide offline friends in custom categories",
  "Settings > Friends & Chat > Ignore 'Away' status when sorting friends",
  "Settings > Friends & Chat > Sign in to friends when Steam Deck starts",
  "Settings > Friends & Chat > Enable Animated Avatars & Animated Avatar Frames",
  "Settings > Friends & Chat > Compact friends list & chat view",
  "Settings > Friends & Chat > Compact favorite friends area",
  "Settings > Friends & Chat > Dock chats to the friends list",
  "Settings > Friends & Chat > Open a new window for new chats (rather than a tab)",
  "Settings > Friends & Chat > Don't embed images and other media in-line",
  "Settings > Friends & Chat > Remember my open chats",
  "Settings > Friends & Chat > Disable spellcheck in chat message entry",
  "Settings > Friends & Chat > Disable animated room effects",
  "Settings > Friends & Chat > Chat Filtering",
  "Settings > Friends & Chat > Chat Font Size",

  // Downloads
  "Settings > Downloads > Download region",
  "Settings > Downloads > Limit download speed",
  "Settings > Downloads > Updates to installed games",
  "Settings > Downloads > Schedule auto-updates",
  "Settings > Downloads > Allow downloads during gameplay",
  "Settings > Downloads > Throttle downloads while streaming",
  "Settings > Downloads > Display download rates in bits per second",
  "Settings > Downloads > Game File Transfer over Local Network",
  "Settings > Downloads > Allow transfers from this device to",

  // Cloud
  "Settings > Cloud > Enable Steam Cloud",
  "Settings > Cloud > Screenshot Management",

  // In Game
  "Settings > In Game > Main Menu shortcut key(s)",
  "Settings > In Game > Quick Access Menu shortcut key(s)",
  "Settings > In Game > Include Steam UI elements in screenshots",
  "Settings > In Game > Steam Networking",

  // Family
  "Settings > Family > Manage your Steam Family",

  // Remote Play
  "Settings > Remote Play > Enable Remote Play",
  "Settings > Remote Play > Allow Direct Connection (IP sharing)",
  "Settings > Remote Play > Enable Advanced Client Options",

  // Storage
  "Settings > Storage > Internal Drive",
  "Settings > Storage > MicroSD Card",
  "Settings > Storage > Default Storage Drive",

  // Game Recording
  "Settings > Game Recording > Recording Off / Background / Manual",
  "Settings > Game Recording > Shortcut Keys",
  "Settings > Game Recording > Recording Quality",
  "Settings > Game Recording > Maximum frame rate",
  "Settings > Game Recording > Maximum video height",
  "Settings > Game Recording > Audio Recording",

  // Home
  "Settings > Home > Show personalized store content on my Home",
  "Settings > Home > Only show product updates in What's New",

  // Library
  "Settings > Library > Show number of copies in Steam Family library",
  "Settings > Library > Add to Library",

  // Store
  "Settings > Store > Mature Content",
  "Settings > Store > Exclude from my Store",
  "Settings > Store > Discovery Queue Content",
  "Settings > Store > New On Steam Queue Content",
  "Settings > Store > Platform Preference",
  "Settings > Store > Steam Deck Feedback",
  "Settings > Store > Live Broadcasts",

  // Developer
  "Settings > Developer > Enable System Tracing",
  "Settings > Developer > Enable Graphics Profiling",
  "Settings > Developer > Development host pairing",
  "Settings > Developer > Steam Play",
  "Settings > Developer > Enable Wifi Power Management",
  "Settings > Developer > Force WPA Supplicant Wifi backend",
  "Settings > Developer > Reload wifi driver on sleep",
  "Settings > Developer > Enable Wifi debug data collection",
  "Settings > Developer > External display safe mode",
  "Settings > Developer > Allow external display refresh control",
  "Settings > Developer > Force Composite",
  "Settings > Developer > Disable Color Management",
  "Settings > Developer > Use Legacy X11 Desktop Mode",
  "Settings > Developer > Speaker Test",
  "Settings > Developer > Show Advanced Update Channels",
  "Settings > Developer > Force Format SD Card",
  "Settings > Developer > Steam Console",
  "Settings > Developer > CEF Remote Debugging",
  "Settings > Developer > User Password",
  "Settings > Developer > Allow battery limit full range",
  "Settings > Developer > Steam Input Layout Dev Mode",

  // QAM - Quick Settings
  "QAM > Quick Settings > Brightness",
  "QAM > Quick Settings > Audio Volume",
  "QAM > Quick Settings > Microphone Volume",
  "QAM > Quick Settings > Airplane mode",
  "QAM > Quick Settings > Wi-Fi",
  "QAM > Quick Settings > Bluetooth",
  "QAM > Quick Settings > Add Device",
  "QAM > Quick Settings > Night mode",
  "QAM > Quick Settings > Automatically Scale UI",

  // QAM - Performance
  "QAM > Performance > Performance Overlay Level",
  "QAM > Performance > Frame Limit",
  "QAM > Performance > Disable Frame Limit",
  "QAM > Performance > Enable VRR",
  "QAM > Performance > Enable HDR",
  "QAM > Performance > Allow Tearing",
  "QAM > Performance > Half Rate Shading",
  "QAM > Performance > TDP Limit",
  "QAM > Performance > Manual GPU Clock",
  "QAM > Performance > Scaling Mode",
  "QAM > Performance > Scaling Filter",
  "QAM > Performance > Show Perf Overlay in Steam",
  "QAM > Performance > Reset to Default",

  // QAM - Other
  "QAM > Soundtracks > Browse Soundtracks",
  "QAM > Help > Visit Help Site",
  "QAM > Help > View Manual",
  "QAM > Help > Report a Bug",
  "QAM > Help > Replay Guided Tour",
];
