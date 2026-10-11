/**
 * Title: Update AI & models with Internet downloads off shows the failed line and the permission box
 *
 * Purpose: Pin the maintainer's ask (2026-10-10): with the plugin's Internet downloads permission off,
 * a press on "Update AI & models" shows both "Failed (check the Internet downloads permission?)" under
 * the button and the "Turn on internet downloads?" box, the way the Install buttons ask. The real
 * section is drawn with models installed and the button pressed, then read as a person would see it:
 * the line on the tab, the box that opened, what its yes does (turns the permission on, then the update
 * starts), and where the ring goes when the box closes. With the permission on the update just runs,
 * and where no box can open (parental lock) no "return the ring here" note is left behind.
 *
 * Does not: prove the ring on the device (jsdom has no Steam ring); the Deck row does.
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({ modals: [] as Array<{ props: Record<string, unknown> }> }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  return {
    ...stubs,
    showModal: (content: unknown) => {
      hoisted.modals.push(content as { props: Record<string, unknown> });
      return { Close: () => {} };
    },
  };
});

import { OllamaWhereAiRunsSection } from "./OllamaWhereAiRunsSection";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../test-harness/fakeDeckyRpc";
import { markSettingsLoaded, resetSettingsLoadedSignalForTests } from "../features/plugin-shell/settingsLoadedSignal";
import {
  peekModalReturnFocus,
  resetModalReturnFocusRegistry,
  restoreModalReturnFocus,
} from "../features/plugin-shell/modalReturnFocusRegistry";
import { setDownloadPermissionBridge } from "../features/downloads/downloadNotice";
import { DEFAULT_CAPABILITIES } from "../data/bonsaiSettingsSchema";

const FAILED_LINE = "Failed (check the Internet downloads permission?)";

function draw() {
  return render(
    <OllamaWhereAiRunsSection
      ollamaIp="127.0.0.1"
      onOllamaIpChange={() => {}}
      onPersistOllamaIp={() => {}}
      ollamaLocalOnDeck={true}
      setOllamaLocalOnDeck={() => {}}
      ollamaLocalAutostart={false}
      setOllamaLocalAutostart={() => {}}
      namedOllamaHosts={[]}
      setNamedOllamaHosts={() => {}}
      onBeforeDeckyModal={() => {}}
      onCompleteDeckyModalClose={(close) => close()}
      onOpenOllamaModelsHub={() => {}}
    />
  );
}

function bridge(opts: { enabled: boolean; kidsLockActive?: boolean }) {
  const setCapabilities = vi.fn();
  setDownloadPermissionBridge({
    enabled: opts.enabled,
    kidsLockActive: opts.kidsLockActive ?? false,
    capabilities: { ...DEFAULT_CAPABILITIES, internet_downloads: false },
    setCapabilities,
    onBeforeDeckyModal: () => {},
    onCompleteDeckyModalClose: (close) => close(),
  });
  return setCapabilities;
}

const later = (ms: number) => act(async () => void (await new Promise((r) => setTimeout(r, ms))));
const calls = (method: string) => getRpcCallLog().filter((c) => c.method === method);

async function pressUpdate() {
  await screen.findByText("Installed: 1");
  const btn = (await screen.findByText("Update AI & models")).closest("button") as HTMLButtonElement;
  await act(async () => void fireEvent.click(btn));
  return btn;
}

beforeEach(() => {
  resetFakeDeckyRpc();
  resetSettingsLoadedSignalForTests();
  resetModalReturnFocusRegistry();
  setDownloadPermissionBridge(null);
  hoisted.modals = [];
  setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.40.2", models: ["a:1"] }));
  setRpcHandler("get_local_ollama_setup_status", () => ({ phase: "idle", stage: "", profile: "", done: true, log_tail: [] }));
  setRpcHandler("start_local_ollama_setup", () => ({ accepted: true }));
  markSettingsLoaded();
});

describe("Update AI & models with Internet downloads off", () => {
  it("shows the failed line and opens the 'Turn on internet downloads?' box together", async () => {
    bridge({ enabled: false });
    draw();
    await pressUpdate();
    await later(20);
    expect(screen.getByText(FAILED_LINE)).toBeTruthy();
    expect(hoisted.modals).toHaveLength(1);
    expect(hoisted.modals[0].props.strTitle).toBe("Turn on internet downloads?");
    expect(hoisted.modals[0].props.strOKButtonText).toBe("Not now");
    // nothing started yet: the person has not answered
    expect(calls("start_local_ollama_setup")).toHaveLength(0);
  });

  it("the box's yes turns the permission on and then the update starts", async () => {
    const setCaps = bridge({ enabled: false });
    draw();
    await pressUpdate();
    await later(20);
    await act(async () => void (hoisted.modals[0].props.onMiddleButton as () => void)());
    await later(20);
    expect(setCaps).toHaveBeenCalledWith(expect.objectContaining({ internet_downloads: true }));
    expect(calls("save_settings")).toHaveLength(1);
    expect(calls("start_local_ollama_setup")).toHaveLength(1);
    expect(screen.queryByText(FAILED_LINE)).toBeNull();
  });

  it("the box's no starts nothing, leaves the permission off, and the failed line stays after the tab is rebuilt", async () => {
    const setCaps = bridge({ enabled: false });
    const first = draw();
    await pressUpdate();
    await later(20);
    await act(async () => void (hoisted.modals[0].props.onOK as () => void)());
    await later(20);
    expect(setCaps).not.toHaveBeenCalled();
    expect(calls("start_local_ollama_setup")).toHaveLength(0);
    // closing a Decky box rebuilds the tab: the line has to come back with it
    first.unmount();
    draw();
    expect(await screen.findByText(FAILED_LINE)).toBeTruthy();
  });

  it("after the box closes the ring goes back to the Update button", async () => {
    bridge({ enabled: false });
    draw();
    const btn = await pressUpdate();
    expect(peekModalReturnFocus()).toBe("ollama-local-setup");
    await later(120); // a person takes longer than a blink to answer
    await act(async () => void (hoisted.modals[0].props.onOK as () => void)());
    (document.activeElement as HTMLElement | null)?.blur();
    restoreModalReturnFocus();
    expect(document.activeElement).toBe(btn);
  });
});

describe("Update AI & models when no box should open", () => {
  it("with Internet downloads on it just runs: no box, no failed line", async () => {
    bridge({ enabled: true });
    draw();
    await pressUpdate();
    await later(20);
    expect(hoisted.modals).toHaveLength(0);
    expect(calls("start_local_ollama_setup")).toHaveLength(1);
    expect(screen.queryByText(FAILED_LINE)).toBeNull();
  });

  it("under the parental lock no box opens, no return note is left behind, and the failed line still names the permission", async () => {
    bridge({ enabled: false, kidsLockActive: true });
    setRpcHandler("start_local_ollama_setup", () => ({
      accepted: false,
      ok: false,
      error: "downloads_off",
      reason: "Internet downloads are off. Turn them on in Permissions to download.",
    }));
    draw();
    await pressUpdate();
    await later(120);
    expect(hoisted.modals).toHaveLength(0);
    expect(peekModalReturnFocus()).toBeNull();
    expect(screen.getByText(FAILED_LINE)).toBeTruthy();
  });
});
