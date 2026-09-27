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
 * permission bridge below current with `useDownloadPermissionBridge`.
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
 * Focus: the box is Decky's own ConfirmModal, the plugin's usual confirm-box look. Steam opens a
 * ConfirmModal with the ring on its OK button, so OK is the choice that does NOT download ("Not
 * now") and the download sits on the box's middle button. Decky always adds its own Cancel too;
 * B and Cancel also download nothing. No DOM focus() or keydown is involved.
 *
 * Gotcha: opening a box snapshots the whole session, and Decky's remount after it closes restores
 * settings from that snapshot (see useThinkingNoticeGate.tsx, bug b). Turning the permission on
 * therefore also patches the pending snapshot, and saves straight to the back end, so the download
 * that starts next is not refused by a back end that has not heard yet.
 */
import { useEffect, type ReactNode } from "react";
import { ConfirmModal, showModal } from "@decky/ui";
import { toaster } from "@decky/api";
import { DEFAULT_CAPABILITIES, type BonsaiCapabilities } from "../../data/bonsaiSettingsSchema";
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS } from "../../utils/deckyCall";
import { patchPendingSessionSettingsSnapshot } from "../../utils/bonsaiSessionSurvival";

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

async function turnOnDownloads(b: PermissionBridge): Promise<void> {
  const next: BonsaiCapabilities = { ...b.capabilities, internet_downloads: true };
  b.setCapabilities(next);
  patchPendingSessionSettingsSnapshot({ capabilities: next });
  try {
    // The back end tidies the whole permissions block on save, so it is sent whole.
    await callDeckyWithTimeout<[{ capabilities: BonsaiCapabilities }], unknown>(
      "save_settings",
      [{ capabilities: next }],
      DECKY_RPC_TIMEOUT_MS
    );
  } catch {
    /* the debounced settings save retries; a refused download then says why */
  }
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
    toaster.toast({
      title: "Downloads are off",
      body: "Parental controls keep internet downloads off.",
      duration: 5000,
    });
    return Promise.resolve(false);
  }
  const sites = notices.map((n) => n.site);
  const seen = readSeenSites();
  if (!opts.always && b.enabled && sites.every((s) => seen.has(s))) return Promise.resolve(true);

  const asking = !b.enabled;
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (go: boolean) => {
      if (settled) return;
      settled = true;
      resolve(go);
    };
    b.onBeforeDeckyModal();
    const handle = showModal(
      <ConfirmModal
        strTitle={asking ? "Turn on internet downloads?" : (opts.title ?? "Download from the internet?")}
        strDescription={
          <div className="bonsai-prose" style={{ fontSize: 12, color: "#9fb7d5", lineHeight: 1.45, textAlign: "left" }}>
            {notices.map((n) => (
              <div key={n.site} style={{ marginBottom: 8 }} data-bonsai-download-notice-line="1">
                {downloadNoticeLine(n)}
              </div>
            ))}
            {opts.body ? <div style={{ marginBottom: 8 }}>{opts.body}</div> : null}
            {asking ? (
              <div style={{ color: "#c5d4e3" }}>
                Internet downloads are off in Permissions. Turning them on lets bonsAI download when you press a
                download button; nothing downloads on its own. You can turn them off again there.
              </div>
            ) : opts.always ? null : (
              <div style={{ color: "#c5d4e3" }}>This shows once for each site. After that, the size shows on the button.</div>
            )}
          </div>
        }
        strOKButtonText="Not now"
        strMiddleButtonText={asking ? "Turn on and download" : (opts.actionLabel ?? "Download")}
        strCancelButtonText="Cancel"
        onOK={() => {
          b.onCompleteDeckyModalClose(() => handle.Close());
          finish(false);
        }}
        onMiddleButton={() => {
          markSitesSeen(sites);
          b.onCompleteDeckyModalClose(() => handle.Close());
          if (asking) {
            void turnOnDownloads(b).then(() => finish(true));
          } else {
            finish(true);
          }
        }}
        onCancel={() => {
          b.onCompleteDeckyModalClose(() => handle.Close());
          finish(false);
        }}
      />
    );
  });
}
