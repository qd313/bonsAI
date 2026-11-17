/**
 * Title: The notice before every download, and the question that turns downloads on
 *
 * Purpose: Before bonsAI downloads anything -- Ollama, an AI model, the voice engine, the knowledge
 * library -- the player is told in plain words where it will connect and roughly how big it is:
 * "bonsAI will connect to https://ollama.com to download Ollama (size not known ahead of time)."
 * The notice shows the first time for each site; after that it stays out of the way and the size
 * shows on the button itself. While the Internet downloads permission is off, the first notice
 * doubles as the question "Turn on internet downloads?": yes turns the permission on and starts
 * that download, no starts nothing and leaves it off. While the kids lock is on, nothing is asked
 * and nothing downloads.
 *
 * Used for: every download button (useLocalOllamaSetupFlow, usePullModelSubmitSelected,
 * usePullModelCustomTagPull, KnowledgeBaseSection, VoiceInputSettingsSection), each of which
 * awaits `confirmDownload` right before the call that starts its download. index.tsx keeps the
 * permission bridge below current with `useDownloadPermissionBridge`. The first-time setup's Internet
 * downloads switch (plan 105, lane D3) reads and saves the permission through it too
 * (`internetDownloadsSwitchState`, `setInternetDownloadsFromSwitch`), so it is the real permission.
 *
 * Solves: the maintainer's call (plan 71, 2026-09-26): say where every download goes, and let the
 * player switch the internet off without being sent hunting for a switch the first time.
 *
 * Does not: enforce anything. The back end refuses every download while the permission is off
 * (capabilities.py, error "downloads_off"); this only asks first.
 *
 * A button whose own confirm box used to open first (Install Ollama, Update AI & models, Tier 1,
 * Tier 2, the meaning-search offer) passes `always`: the notice IS that box, shown every time with
 * the button's own title, text and action label, so no box ever opens on a download choice. On
 * the Deck (plan72-F-DL) "Update AI & models" opened its older box with the ring on "Start update"
 * and no site or size.
 *
 * Focus: the box is the shared two-button box (TwoButtonConfirmModal, the Delete chat box's shape):
 * the download on the left and Cancel on the right, where the ring starts, so an A pressed by habit
 * downloads nothing and B is Cancel too. It used to be Steam's own ConfirmModal with "Not now" as
 * OK and the download in the middle, and Steam's added Cancel made it three buttons (plan 93). No
 * DOM focus() or keydown is involved.
 *
 * Fit (plan 103): the box's words scroll inside a fixed height, so a long box (the fresh-install starter
 * set) fits the Deck's own screen. The site lines are pinned to the top of the words and stay on screen while
 * the rest scrolls under them, and the last block carries no bottom margin, which a scrolling box would keep
 * and add to the gap above the buttons (TwoButtonConfirmModal.tsx, Gotchas).
 *
 * Gotcha: opening a box snapshots the whole session, and Decky's remount after it closes restores
 * settings from that snapshot (see useThinkingNoticeGate.tsx, bug b). Turning the permission on
 * therefore also patches the pending snapshot, and saves straight to the back end, so the download
 * that starts next is not refused by a back end that has not heard yet. When that save fails, the
 * yes does not go on as if it had worked (plan 104, B1): the screen goes back to off, nothing
 * downloads, and a message says the setting could not be saved. It used to be swallowed, and the
 * press then failed with "check the Internet downloads permission" right after the person had
 * turned it on.
 */
import { useEffect, type ReactNode } from "react";
import { showModal } from "@decky/ui";
import { toaster } from "@decky/api";
import { CONFIRM_BOX_PINNED_STYLE, TwoButtonConfirmModal } from "../../shared/TwoButtonConfirmModal";
import { DEFAULT_CAPABILITIES, type BonsaiCapabilities } from "../settings/bonsaiSettingsSchema";
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS } from "../../shared/deckyCall";
import { patchPendingSessionSettingsSnapshot } from "../plugin-shell/bonsaiSessionSurvival";
import { textPx } from "../../styles/textPx";

/** One site a download connects to. `size` is null when the code does not know it ahead of time. */
export type DownloadNotice = {
  /** Full address as the code uses it, e.g. "https://ollama.com". */
  site: string;
  /** What comes from there, e.g. "Ollama". */
  what: string;
  /** e.g. "about 270 MB"; null when not known ahead of time. */
  size: string | null;
};

/** Sites whose notice has been seen on this device (per-viewer convenience; losing it only re-shows). */
export const DOWNLOAD_SITES_SEEN_STORAGE_KEY = "bonsai:download-sites-seen";

const SIZE_NOT_KNOWN = "size not known ahead of time";

type PermissionBridge = {
  /** The permission as it applies now: false while the kids lock is on. */
  enabled: boolean;
  kidsLockActive: boolean;
  /** Stored (not lock-gated) permissions, to save back whole with downloads switched on. */
  capabilities: BonsaiCapabilities;
  setCapabilities: (next: BonsaiCapabilities) => void;
  onBeforeDeckyModal: () => void;
  onCompleteDeckyModalClose: (close: () => void) => void;
};

let bridge: PermissionBridge | null = null;

/** index.tsx keeps this current. Exported for tests. */
export function setDownloadPermissionBridge(next: PermissionBridge | null): void {
  bridge = next;
}

/** Called once in the plugin root with the stored permissions and the shell's box hooks. */
export function useDownloadPermissionBridge(b: PermissionBridge): void {
  const { enabled, kidsLockActive, capabilities, setCapabilities, onBeforeDeckyModal, onCompleteDeckyModalClose } = b;
  useEffect(() => {
    setDownloadPermissionBridge({
      enabled,
      kidsLockActive,
      capabilities,
      setCapabilities,
      onBeforeDeckyModal,
      onCompleteDeckyModalClose,
    });
  }, [enabled, kidsLockActive, capabilities, setCapabilities, onBeforeDeckyModal, onCompleteDeckyModalClose]);
}

/**
 * The failed line the Ollama tab shows when a press was refused because Internet downloads are off.
 * One wording for every place that shows it (the Update press that opens the box, and a refusal the
 * back end sends back), so the person reads the same words each time.
 */
export const DOWNLOADS_OFF_FAILED_LINE = "Failed (check the Internet downloads permission?)";

/**
 * The reason the Ollama tab shows (after "Failed:") when the screen's Internet downloads value could not be sent to the
 * back end, so the back end's file may still say off. Says the setting could not be saved, not that
 * downloads are off.
 */
export const DOWNLOADS_NOT_SAVED_LINE = "The Internet downloads setting could not be saved. Try again in a moment.";

/**
 * For a download the back end refused as "downloads off" while this screen shows them on: the file the back
 * end reads and the screen disagree. Sends the screen's value once. True when the back end took it, so the
 * caller may try the download once more; false when there is nothing to send (the screen does not show them
 * on) or the save failed.
 */
export async function sendDownloadsOnAgain(): Promise<boolean> {
  if (!bridge || !bridge.enabled) return false;
  try {
    await callDeckyWithTimeout<[{ capabilities: BonsaiCapabilities }], unknown>(
      "save_settings",
      [{ capabilities: { ...bridge.capabilities, internet_downloads: true } }],
      DECKY_RPC_TIMEOUT_MS
    );
    return true;
  } catch {
    return false;
  }
}

/** True when the permission is off and the box can ask (not under the kids lock, which no box can lift). */
export function internetDownloadsAreOff(): boolean {
  return bridge != null && !bridge.enabled && !bridge.kidsLockActive;
}

/** True only when the plugin root says downloads are on; false with no root mounted (tests of one screen). */
export function internetDownloadsAreOn(): boolean {
  return bridge != null && bridge.enabled;
}

/** The plain sentence for one site. */
export function downloadNoticeLine(n: DownloadNotice): string {
  return `bonsAI will connect to ${n.site} to download ${n.what} (${n.size ?? SIZE_NOT_KNOWN}).`;
}

function readSeenSites(): Set<string> {
  try {
    const raw = window.localStorage.getItem(DOWNLOAD_SITES_SEEN_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : []);
  } catch {
    return new Set();
  }
}

function markSitesSeen(sites: string[]): void {
  try {
    const seen = readSeenSites();
    for (const s of sites) seen.add(s);
    window.localStorage.setItem(DOWNLOAD_SITES_SEEN_STORAGE_KEY, JSON.stringify([...seen]));
  } catch {
    /* storage unavailable: the notice just shows again next time */
  }
}

/** The message when the "yes" could not be saved: says what happened, not that downloads are off. */
const DOWNLOADS_NOT_SAVED_TOAST = {
  title: "Could not save the setting",
  body: "Internet downloads are still off: the setting could not be saved. Try again in a moment.",
  duration: 6000,
};

/** While Steam's parental lock is on: nothing is asked and nothing downloads. */
const KIDS_LOCK_TOAST = { title: "Downloads are off", body: "Parental controls keep internet downloads off.", duration: 5000 };

/** The same for a press that turned them off and could not be saved. */
const DOWNLOADS_OFF_NOT_SAVED_TOAST = {
  title: "Could not save the setting",
  body: "Internet downloads are still on: the setting could not be saved. Try again in a moment.",
  duration: 6000,
};

/**
 * Saves the permission now, on or off. True when the back end took the save; the bridge then reads the new value
 * at once, because under a Steam box the plugin's panel is closed and would not refresh it. False: the screen is
 * back to what it was, and nothing was changed on disk.
 */
async function saveDownloadsPermission(b: PermissionBridge, on: boolean): Promise<boolean> {
  const before = b.capabilities;
  const next: BonsaiCapabilities = { ...before, internet_downloads: on };
  b.setCapabilities(next);
  patchPendingSessionSettingsSnapshot({ capabilities: next });
  // Off reads as off at once, while its save is on its way: nothing (the one-time "send it again" above
  // included) may treat the permission as on after the person turned it off. On waits for the save.
  if (!on && bridge === b) bridge = { ...b, capabilities: next, enabled: false };
  const turningOffBridge = bridge;
  try {
    // The back end tidies the whole permissions block on save, so it is sent whole.
    await callDeckyWithTimeout<[{ capabilities: BonsaiCapabilities }], unknown>(
      "save_settings",
      [{ capabilities: next }],
      DECKY_RPC_TIMEOUT_MS
    );
    if (bridge === b || bridge === turningOffBridge) bridge = { ...b, capabilities: next, enabled: on && !b.kidsLockActive };
    return true;
  } catch {
    if (!on && bridge === turningOffBridge) bridge = b;
    // Not claiming a setting the file does not have: the screen shows what it showed before, so nothing is sent
    // later behind the person's back and the next press asks again.
    b.setCapabilities(before);
    patchPendingSessionSettingsSnapshot({ capabilities: before });
    return false;
  }
}

const turnOnDownloads = (b: PermissionBridge): Promise<boolean> => saveDownloadsPermission(b, true);

/** What the first-time setup's Internet downloads switch shows: the permission, and whether Steam's lock holds it off. */
export function internetDownloadsSwitchState(): { on: boolean; kidsLock: boolean } {
  return { on: bridge?.enabled === true, kidsLock: bridge?.kidsLockActive === true };
}

/**
 * The first-time setup's Internet downloads switch (plan 105, lane D3): the real permission, saved the moment it is
 * switched, both ways, on the same path as the "Turn on internet downloads?" yes (plan 104). Resolves the value the
 * switch must show now: the new one when the save got through; the old one, with a message saying the setting
 * could not be saved, when it did not. Under the parental lock nothing changes and the lock's message shows.
 */
export async function setInternetDownloadsFromSwitch(on: boolean): Promise<boolean> {
  const b = bridge;
  if (!b) return false;
  if (b.kidsLockActive) {
    toaster.toast(KIDS_LOCK_TOAST);
    return false;
  }
  if (await saveDownloadsPermission(b, on)) return on;
  toaster.toast(on ? DOWNLOADS_NOT_SAVED_TOAST : DOWNLOADS_OFF_NOT_SAVED_TOAST);
  return !on;
}

/** For a button whose own confirm box this notice replaces. */
export type DownloadBoxOptions = {
  /** Show every time, even when downloads are on and every site was seen. */
  always?: boolean;
  /** Title while downloads are on (while off, the box is always "Turn on internet downloads?"). */
  title?: string;
  /** The button's own explanation, shown under the site lines. */
  body?: ReactNode;
  /** The download choice's label while downloads are on (default "Download"). */
  actionLabel?: string;
};

/** No plugin root mounted (a single screen under test): treated as on, and nothing to hook. */
const NO_ROOT_BRIDGE: PermissionBridge = {
  enabled: true,
  kidsLockActive: false,
  capabilities: { ...DEFAULT_CAPABILITIES, internet_downloads: true },
  setCapabilities: () => {},
  onBeforeDeckyModal: () => {},
  onCompleteDeckyModalClose: (close) => close(),
};

/**
 * In: the site(s) a download is about to reach. Out: true when the download may start now.
 * Resolves at once (true) when downloads are on and every site's notice was already seen,
 * unless `always` makes this box the button's own confirm.
 */
export function confirmDownload(notices: DownloadNotice[], opts: DownloadBoxOptions = {}): Promise<boolean> {
  // No plugin root (tests of a single screen): the back end still decides. A button's own box
  // still shows, so it can never turn into a download with no question at all.
  if (!bridge && !opts.always) return Promise.resolve(true);
  const b = bridge ?? NO_ROOT_BRIDGE;
  if (b.kidsLockActive) {
    toaster.toast(KIDS_LOCK_TOAST);
    return Promise.resolve(false);
  }
  const sites = notices.map((n) => n.site);
  const seen = readSeenSites();
  if (!opts.always && b.enabled && sites.every((s) => seen.has(s))) return Promise.resolve(true);

  const asking = !b.enabled;
  // The closing paragraph, when there is one: what the "Turn on" choice means, or that the notice shows once.
  const closing = asking ? (
    <div style={{ color: "#c5d4e3" }}>
      Internet downloads are off. Turning them on lets bonsAI download only when you press a download button. You
      can turn them off in Permissions.
    </div>
  ) : opts.always ? null : (
    <div style={{ color: "#c5d4e3" }}>Shown once per site. After that, the size shows on the button.</div>
  );
  const belowSites = Boolean(opts.body) || closing !== null;
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (go: boolean) => {
      if (settled) return;
      settled = true;
      resolve(go);
    };
    b.onBeforeDeckyModal();
    const handle = showModal(
      <TwoButtonConfirmModal
        title={asking ? "Turn on internet downloads?" : (opts.title ?? "Download from the internet?")}
        body={
          <div className="bonsai-prose" style={{ fontSize: textPx(12), color: "#9fb7d5", lineHeight: 1.45, textAlign: "left" }}>
            {/* Where each download comes from stays on screen while the rest of a long box scrolls under it. */}
            <div style={{ ...CONFIRM_BOX_PINNED_STYLE, paddingBottom: belowSites ? 8 : 0 }}>
              {notices.map((n, i) => (
                <div key={n.site} style={{ marginBottom: i < notices.length - 1 ? 8 : 0 }} data-bonsai-download-notice-line="1">
                  {downloadNoticeLine(n)}
                </div>
              ))}
            </div>
            {opts.body ? <div style={{ marginBottom: closing ? 8 : 0 }}>{opts.body}</div> : null}
            {closing}
          </div>
        }
        actionLabel={asking ? "Turn on and download" : (opts.actionLabel ?? "Download")}
        onCancel={() => {
          b.onCompleteDeckyModalClose(() => handle.Close());
          finish(false);
        }}
        onAction={() => {
          markSitesSeen(sites);
          b.onCompleteDeckyModalClose(() => handle.Close());
          if (asking) {
            void turnOnDownloads(b).then((saved) => {
              if (!saved) toaster.toast(DOWNLOADS_NOT_SAVED_TOAST);
              finish(saved);
            });
          } else {
            finish(true);
          }
        }}
      />
    );
  });
}
