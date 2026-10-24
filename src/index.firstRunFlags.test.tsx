/**
 * Title: A wiped Deck shows the first-run screens again, even though Steam kept the old flags
 *
 * Purpose: A Decky uninstall and reinstall removes the plugin's settings folder but not Steam's own
 * browser storage, so the "already seen" flags (beta notice, where-the-AI-runs popup, help chip, ...)
 * survived and a reinstalled plugin showed no first-run screens. The back end now says when it
 * started with no settings file. These tests mount the whole plugin with the stale flags set and look
 * at what a person sees: the Beta Notice popup and the help chip.
 *
 * Used for: src/features/plugin-shell/useDisclaimerAndLocalRuntimeGates.tsx, src/index.tsx.
 *
 * Solves: nobody could see the beta notice or the help chip a second time without Clear all data.
 *
 * Does not: test the back end's answer itself (tests/test_settings_first_run.py) or the notices'
 * wording (the wording tests).
 */
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "./test-harness/fakeDeckyRpc";

const hoisted = vi.hoisted(() => ({
  titles: [] as string[],
  boxes: [] as Array<{ props: Record<string, unknown> }>,
}));

vi.mock("@decky/ui", async () => {
  const stubs = await import("./test-harness/fakeDeckyUi");
  return {
    ...stubs,
    showModal: (content: { props: { strTitle?: string } }) => {
      hoisted.titles.push(String(content.props.strTitle ?? ""));
      hoisted.boxes.push(content as { props: Record<string, unknown> });
      return { Close: () => {} };
    },
  };
});

const HELP_CHIP = "How to use bonsAI — open quick start";
const STALE_FLAGS: Record<string, string> = {
  "bonsai:disclaimer-accepted": "1",
  "bonsai:first-run-where-ai-runs-seen-v1": "1",
  "bonsai:thinking-notice-accepted-v1": "1",
  "bonsai:plugin-help-dismissed": "1",
  "bonsai:download-sites-seen": '["huggingface.co"]',
};

async function freshContent(): Promise<ReactElement> {
  vi.resetModules();
  return ((await import("./index")).default as { content?: unknown }).content as ReactElement;
}

async function mountAndSettle(content: ReactElement) {
  const view = render(content);
  await waitFor(() => {
    expect(getRpcCallLog().some((c) => c.method === "load_settings")).toBe(true);
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 60));
  });
  return view;
}

const betaNotices = () => hoisted.titles.filter((t) => t.includes("Beta Notice"));

describe("first run after a wipe, with stale flags left in Steam's storage", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
    hoisted.titles.length = 0;
    hoisted.boxes.length = 0;
    window.localStorage.clear();
    for (const [key, value] of Object.entries(STALE_FLAGS)) window.localStorage.setItem(key, value);
  });

  it("shows the Beta Notice and brings the help chip back when the back end reports a first run", async () => {
    setRpcHandler("get_settings_first_run", () => ({ first_run: true }));
    await mountAndSettle(await freshContent());

    expect(betaNotices()).toHaveLength(1);
    expect(screen.queryByLabelText(HELP_CHIP)).not.toBeNull();
    for (const key of Object.keys(STALE_FLAGS)) {
      expect(window.localStorage.getItem(key), key).toBeNull();
    }
  });

  it("respects the flags when the back end says a settings file was there", async () => {
    setRpcHandler("get_settings_first_run", () => ({ first_run: false }));
    await mountAndSettle(await freshContent());

    expect(betaNotices()).toHaveLength(0);
    expect(screen.queryByLabelText(HELP_CHIP)).toBeNull();
    for (const [key, value] of Object.entries(STALE_FLAGS)) {
      expect(window.localStorage.getItem(key), key).toBe(value);
    }
  });

  it("respects the flags when the question cannot be answered", async () => {
    setRpcHandler("get_settings_first_run", () => {
      throw new Error("backend unavailable");
    });
    await mountAndSettle(await freshContent());

    expect(betaNotices()).toHaveLength(0);
    expect(window.localStorage.getItem("bonsai:disclaimer-accepted")).toBe("1");
  });

  it("clears once: a panel rebuilt after the popup closes keeps what the person just clicked", async () => {
    // The real back end says "first run" once per start; Decky rebuilds the panel around every popup.
    let asked = 0;
    setRpcHandler("get_settings_first_run", () => ({ first_run: asked++ === 0 }));
    const content = await freshContent();
    const first = await mountAndSettle(content);
    expect(betaNotices()).toHaveLength(1);

    window.localStorage.setItem("bonsai:disclaimer-accepted", "1");
    first.unmount();
    await mountAndSettle(content);

    expect(betaNotices()).toHaveLength(1);
    expect(window.localStorage.getItem("bonsai:disclaimer-accepted")).toBe("1");
  });

  it("after the Beta Notice is accepted, asks where the AI should run, once, with the help chip on screen", async () => {
    setRpcHandler("get_settings_first_run", () => ({ first_run: true }));
    await mountAndSettle(await freshContent());
    const popups = () => hoisted.boxes.filter((b) => b.props.host);
    const beta = hoisted.boxes.find((b) => String(b.props.strTitle ?? "").includes("Beta Notice"));
    expect(beta).toBeTruthy();
    // Not before the Beta Notice is accepted.
    expect(popups()).toHaveLength(0);

    await act(async () => {
      (beta!.props.onOK as () => void)();
    });
    await waitFor(() => expect(popups()).toHaveLength(1));
    expect(screen.queryByLabelText(HELP_CHIP)).not.toBeNull();
    expect(window.localStorage.getItem("bonsai:first-run-where-ai-runs-seen-v1")).toBe("1");
    // Neither the old notice nor a second popup follows.
    expect(hoisted.titles.some((t) => t.includes("Local runtime"))).toBe(false);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });
    expect(popups()).toHaveLength(1);
  });

  it("a switch changed in the popup reaches the back end before the popup closes", async () => {
    setRpcHandler("get_settings_first_run", () => ({ first_run: true }));
    await mountAndSettle(await freshContent());
    const beta = hoisted.boxes.find((b) => String(b.props.strTitle ?? "").includes("Beta Notice"));
    await act(async () => {
      (beta!.props.onOK as () => void)();
    });
    await waitFor(() => expect(hoisted.boxes.some((b) => b.props.host)).toBe(true));
    const host = hoisted.boxes.find((b) => b.props.host)!.props.host as {
      saveSettingsNow: (patch: Record<string, unknown>) => void;
    };
    await act(async () => {
      host.saveSettingsNow({ ollama_local_on_deck: false });
    });
    const saves = getRpcCallLog().filter((c) => c.method === "save_settings");
    expect(saves.some((c) => (c.args[0] as Record<string, unknown>).ollama_local_on_deck === false)).toBe(true);
  });
});
