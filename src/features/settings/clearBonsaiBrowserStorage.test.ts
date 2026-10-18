import { describe, expect, it, beforeEach } from "vitest";
import { clearBonsaiBrowserStorage } from "./clearBonsaiBrowserStorage";

describe("clearBonsaiBrowserStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("removes all bonsai: keys from localStorage and sessionStorage", () => {
    window.localStorage.setItem("bonsai:pc-ip", "192.168.1.2");
    window.localStorage.setItem("bonsai:disclaimer-accepted", "1");
    window.localStorage.setItem("other:key", "keep");
    window.sessionStorage.setItem("bonsai:auto-desktop-chat-response-ids", "[]");

    clearBonsaiBrowserStorage();

    expect(window.localStorage.getItem("bonsai:pc-ip")).toBeNull();
    expect(window.localStorage.getItem("bonsai:disclaimer-accepted")).toBeNull();
    expect(window.localStorage.getItem("other:key")).toBe("keep");
    expect(window.sessionStorage.getItem("bonsai:auto-desktop-chat-response-ids")).toBeNull();
  });

  it("also removes the keys spelled with an underscore, which the wipe used to miss", () => {
    // Found 2026-09-05 when the maintainer asked for Clear all plugin data to be best-effort.
    // These three knowledge-base "already warned you" flags use bonsai_ rather than bonsai:, so
    // a sweep matching only the colon left them behind: after a wipe the plugin still believed it
    // had warned about a knowledge-base problem and stayed quiet when it should have spoken up.
    // Matching the bare word rather than "bonsai:" also takes anything else starting with
    // "bonsai", which is accepted: this is the plugin's own corner of the browser's storage,
    // and the maintainer asked for the wipe to be best-effort.
    window.sessionStorage.setItem("bonsai_kb_unavailable_warned", "1");
    window.sessionStorage.setItem("bonsai_kb_nomic_hint_warned", "1");
    window.localStorage.setItem("bonsai_kb_failure_toast", "1");
    clearBonsaiBrowserStorage();

    expect(window.sessionStorage.getItem("bonsai_kb_unavailable_warned")).toBeNull();
    expect(window.sessionStorage.getItem("bonsai_kb_nomic_hint_warned")).toBeNull();
    expect(window.localStorage.getItem("bonsai_kb_failure_toast")).toBeNull();
  });

  it("takes the New label the pull picker keeps on the device", () => {
    window.localStorage.setItem("bonsai:pull-model-new-badge-v1", '{"qwen2.5:1.5b":1}');

    clearBonsaiBrowserStorage();

    expect(window.localStorage.getItem("bonsai:pull-model-new-badge-v1")).toBeNull();
  });
});
