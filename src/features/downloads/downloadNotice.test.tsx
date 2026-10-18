/**
 * Title: The notice before every download, and the "Turn on internet downloads?" question
 *
 * Purpose: Pin confirmDownload: the kids lock downloads nothing and asks nothing; with downloads
 * off the notice asks to turn them on, Cancel (and B) start nothing, and yes turns the
 * permission on (saved whole, and patched into the pending remount snapshot) before the download
 * starts; with downloads on the notice shows once per site and then gets out of the way. The box is
 * drawn and read off the page: exactly Cancel and the download, Cancel first (where Steam puts the
 * ring), so the first choice is always the one that does not download (plan 93: it used to show a
 * third button).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_CAPABILITIES } from "../settings/bonsaiSettingsSchema";
import { drawConfirmBox, type DrawnConfirmBox } from "../../test-harness/confirmBoxProbe";

const hoisted = vi.hoisted(() => ({
  modal: null as unknown,
  calls: [] as { method: string; args: unknown[] }[],
  toasts: [] as unknown[],
  patches: [] as unknown[],
}));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  return {
    ...stubs,
    showModal: (content: unknown) => {
      hoisted.modal = content;
      return { Close: () => {} };
    },
  };
});
vi.mock("@decky/api", () => ({ toaster: { toast: (t: unknown) => hoisted.toasts.push(t) } }));
vi.mock("../../shared/deckyCall", () => ({
  DECKY_RPC_TIMEOUT_MS: 1000,
  callDeckyWithTimeout: async (method: string, args: unknown[]) => {
    hoisted.calls.push({ method, args });
    return {};
  },
}));
vi.mock("../plugin-shell/bonsaiSessionSurvival", () => ({
  patchPendingSessionSettingsSnapshot: (p: unknown) => hoisted.patches.push(p),
}));

import {
  confirmDownload,
  downloadNoticeLine,
  setDownloadPermissionBridge,
  DOWNLOAD_SITES_SEEN_STORAGE_KEY,
} from "./downloadNotice";

const OLLAMA = { site: "https://ollama.com", what: "Ollama", size: null };
const REGISTRY = { site: "https://registry.ollama.ai", what: "nomic-embed-text", size: "about 270 MB" };

function bridge(enabled: boolean, kidsLockActive = false) {
  const setCapabilities = vi.fn();
  setDownloadPermissionBridge({
    enabled,
    kidsLockActive,
    capabilities: { ...DEFAULT_CAPABILITIES, microphone_access: true },
    setCapabilities,
    onBeforeDeckyModal: vi.fn(),
    onCompleteDeckyModalClose: (close: () => void) => close(),
  });
  return setCapabilities;
}

/** Draw the box the notice handed to Steam. */
const draw = (): DrawnConfirmBox => drawConfirmBox(hoisted.modal);
const settle = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  hoisted.modal = null;
  hoisted.calls = [];
  hoisted.toasts = [];
  hoisted.patches = [];
  window.localStorage.clear();
  setDownloadPermissionBridge(null);
});

describe("downloadNoticeLine", () => {
  it("names the site, what comes from it, and the size or says it is not known", () => {
    expect(downloadNoticeLine(REGISTRY)).toBe(
      "bonsAI will connect to https://registry.ollama.ai to download nomic-embed-text (about 270 MB)."
    );
    expect(downloadNoticeLine(OLLAMA)).toBe(
      "bonsAI will connect to https://ollama.com to download Ollama (size not known ahead of time)."
    );
  });
});

describe("confirmDownload", () => {
  it("under the kids lock asks nothing and downloads nothing", async () => {
    bridge(false, true);
    await expect(confirmDownload([OLLAMA])).resolves.toBe(false);
    expect(hoisted.modal).toBeNull();
    expect(hoisted.toasts).toHaveLength(1);
  });

  it("with downloads off, asks to turn them on with two buttons only, opening on the one that does not download", async () => {
    bridge(false);
    const answer = confirmDownload([OLLAMA, REGISTRY]);
    const box = draw();
    expect(box.title).toBe("Turn on internet downloads?");
    expect(box.labels).toEqual(["Turn on and download", "Cancel"]);
    box.pressCancel();
    await expect(answer).resolves.toBe(false);
    expect(hoisted.calls).toHaveLength(0);
  });

  it("with downloads off, the explanation is short and the site line is still there (plan 93 lane B9)", async () => {
    bridge(false);
    const answer = confirmDownload([OLLAMA]);
    const box = draw();
    const line = downloadNoticeLine(OLLAMA);
    expect(box.text).toContain(line);
    const explanation = box.text.slice(box.text.indexOf(line) + line.length).replace(/Cancel.*$/, "");
    expect(explanation).toContain("Internet downloads are off. Turning them on lets bonsAI download only when you press a download button.");
    expect(explanation).toContain("You can turn them off in Permissions.");
    expect(explanation.split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(40);
    box.pressCancel();
    await answer;
  });

  it("with downloads off, B starts nothing either", async () => {
    const setCaps = bridge(false);
    const answer = confirmDownload([OLLAMA]);
    draw().pressB();
    await expect(answer).resolves.toBe(false);
    expect(setCaps).not.toHaveBeenCalled();
  });

  it("with downloads off, yes turns them on and saves before the download starts", async () => {
    const setCaps = bridge(false);
    const answer = confirmDownload([OLLAMA]);
    draw().pressAction();
    await expect(answer).resolves.toBe(true);
    const turnedOn = { ...DEFAULT_CAPABILITIES, microphone_access: true, internet_downloads: true };
    expect(setCaps).toHaveBeenCalledWith(turnedOn);
    expect(hoisted.patches).toEqual([{ capabilities: turnedOn }]);
    expect(hoisted.calls).toEqual([{ method: "save_settings", args: [{ capabilities: turnedOn }] }]);
    expect(JSON.parse(window.localStorage.getItem(DOWNLOAD_SITES_SEEN_STORAGE_KEY)!)).toEqual(["https://ollama.com"]);
  });

  it("with downloads on, shows once per site, then gets out of the way", async () => {
    bridge(true);
    const first = confirmDownload([REGISTRY]);
    const notice = draw();
    expect(notice.title).toBe("Download from the internet?");
    expect(notice.labels).toEqual(["Download", "Cancel"]);
    expect(notice.text).toContain("Shown once per site. After that, the size shows on the button.");
    notice.pressAction();
    await expect(first).resolves.toBe(true);
    expect(hoisted.calls).toHaveLength(0);

    hoisted.modal = null;
    await expect(confirmDownload([REGISTRY])).resolves.toBe(true);
    expect(hoisted.modal).toBeNull();

    // A second site not seen yet brings the notice back for that download.
    const both = confirmDownload([REGISTRY, OLLAMA]);
    expect(hoisted.modal).not.toBeNull();
    draw().pressCancel();
    await expect(both).resolves.toBe(false);
  });

  it("a declined notice is not remembered as seen", async () => {
    bridge(true);
    const answer = confirmDownload([REGISTRY]);
    draw().pressCancel();
    await answer;
    await settle();
    hoisted.modal = null;
    void confirmDownload([REGISTRY]);
    expect(hoisted.modal).not.toBeNull();
  });
});

describe("confirmDownload as a button's own box (always)", () => {
  const opts = { always: true, title: "Update Ollama and models?", actionLabel: "Start update", body: "Re-runs the installer." };

  it("shows every time even when on and seen, opening on Cancel", async () => {
    bridge(true);
    window.localStorage.setItem(DOWNLOAD_SITES_SEEN_STORAGE_KEY, JSON.stringify(["https://ollama.com"]));
    const answer = confirmDownload([OLLAMA], opts);
    const box = draw();
    expect(box.title).toBe("Update Ollama and models?");
    expect(box.labels).toEqual(["Start update", "Cancel"]);
    box.pressCancel();
    await expect(answer).resolves.toBe(false);
  });

  it("while off it is the permission question, and yes turns downloads on", async () => {
    const setCaps = bridge(false);
    const answer = confirmDownload([OLLAMA], opts);
    const box = draw();
    expect(box.title).toBe("Turn on internet downloads?");
    expect(box.labels).toEqual(["Turn on and download", "Cancel"]);
    box.pressAction();
    await expect(answer).resolves.toBe(true);
    expect(setCaps).toHaveBeenCalled();
  });
});
